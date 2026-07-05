// packages/backend/src/extensions/autoApiRegistration.ts
//
// Lab 4: Auto Registration.
//
// A custom EntityProvider that scans a mono-repo for `*-openapi.yaml` / `*-asyncapi.yaml` files
// and turns them into catalog `API` entities with no hand-authored `catalog-info.yaml` required.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import chokidar from 'chokidar';
import yaml from 'js-yaml';
import {
  coreServices,
  createBackendModule,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import {
  catalogProcessingExtensionPoint,
  catalogServiceRef,
} from '@backstage/plugin-catalog-node';
import type {
  CatalogProcessor,
  CatalogProcessorEmit,
  CatalogService,
  DeferredEntity,
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import type {
  AuthService,
  DatabaseService,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import type { Entity } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import type { Knex } from 'knex';
import * as scanStateCacheMigration from './autoApiRegistrationMigrations/001_scan_state_cache';
import * as systemSlugMigration from './autoApiRegistrationMigrations/002_add_system_slug';

// ---------------------------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------------------------

export const VISIBILITY_ANNOTATION = 'example.com/visibility';
export const REGISTRATION_ERROR_ANNOTATION = 'apiportal-lab.io/registration-error';
// Internal-only marker: identifies which provider instance produced an entity, so the
// catalog-info.yaml precedence check can tell "already ours, safe to update" apart from
// "hand-authored, must win" without guessing based on the shape of ANNOTATION_LOCATION values.
const MANAGED_BY_ANNOTATION = 'apiportal-lab.io/managed-by';

const KNOWN_VISIBILITIES = new Set(['private', 'shared']);
const DEFAULT_PATTERNS = ['**/*-openapi.yaml', '**/*-asyncapi.yaml'];
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
];

export interface SourceConfig {
  id: string;
  rootPath: string;
  patterns: string[];
  ignore: string[];
  mode: 'poll' | 'watch';
  scheduleFrequencySeconds: number;
  reconciliationFrequencySeconds: number;
  parseConcurrency: number;
  defaultOwner: string;
  defaultVisibility: 'private' | 'shared';
  xNamespace: string;
}

function defaultRootPath(): string {
  // packages/backend -> packages -> backstage -> lab-01-base-backstage -> labs
  return path.resolve(
    resolvePackagePath('backend'),
    '../../../../lab-04-auto-registration/apis',
  );
}

export function normalizeConfig(rootConfig: RootConfigService): SourceConfig[] {
  const raw = rootConfig.getOptionalConfig('autoApiRegistration');
  if (!raw) {
    return [];
  }

  const entries = raw.has('sources')
    ? raw.getConfigArray('sources')
    : [raw];

  return entries.map(entry => {
    const id = raw.has('sources') ? entry.getString('id') : 'default';
    const defaultOwner = entry.getOptionalString('defaultOwner');
    const xNamespace = entry.getOptionalString('xNamespace');
    if (!defaultOwner) {
      throw new Error(
        `autoApiRegistration source "${id}" is missing required "defaultOwner"`,
      );
    }
    if (!xNamespace) {
      throw new Error(
        `autoApiRegistration source "${id}" is missing required "xNamespace"`,
      );
    }
    const defaultVisibility = entry.getOptionalString('defaultVisibility') ?? 'private';
    if (!KNOWN_VISIBILITIES.has(defaultVisibility)) {
      throw new Error(
        `autoApiRegistration source "${id}" has an invalid "defaultVisibility": ${defaultVisibility}`,
      );
    }

    const rawRootPath = entry.getOptionalString('rootPath');
    return {
      id,
      // A relative rootPath is resolved against this backend package's own directory, not the
      // process's cwd (which varies by how `yarn start` was invoked) — same anchor
      // defaultRootPath() itself uses, so every source's `rootPath` behaves consistently
      // regardless of where the dev server happens to be launched from.
      rootPath: rawRootPath
        ? path.resolve(resolvePackagePath('backend'), rawRootPath)
        : defaultRootPath(),
      patterns: entry.getOptionalStringArray('patterns') ?? DEFAULT_PATTERNS,
      ignore: entry.getOptionalStringArray('ignore') ?? DEFAULT_IGNORE,
      mode: (entry.getOptionalString('mode') as 'poll' | 'watch') ?? 'poll',
      scheduleFrequencySeconds:
        entry.getOptionalNumber('schedule.frequencySeconds') ?? 30,
      reconciliationFrequencySeconds:
        entry.getOptionalNumber('reconciliation.frequencySeconds') ?? 900,
      parseConcurrency: entry.getOptionalNumber('parseConcurrency') ?? 4,
      defaultOwner,
      defaultVisibility: defaultVisibility as 'private' | 'shared',
      xNamespace,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Discovery + parsing
// ---------------------------------------------------------------------------------------------

async function* discoverFiles(source: SourceConfig): AsyncGenerator<string> {
  const stream = fg.stream(source.patterns, {
    cwd: source.rootPath,
    ignore: source.ignore,
    absolute: true,
    onlyFiles: true,
  });
  for await (const entry of stream) {
    yield entry.toString();
  }
}

interface ParsedSpec {
  kind: 'openapi' | 'asyncapi';
  title: string;
  description?: string;
  tags: string[];
  raw: Record<string, unknown>;
}

/** Valid input: parses as YAML *and* has an `openapi`/`asyncapi` field *and* `info.title`. */
function parseSpecFile(contents: string): ParsedSpec | undefined {
  let doc: unknown;
  try {
    doc = yaml.load(contents);
  } catch {
    return undefined;
  }
  if (!doc || typeof doc !== 'object') {
    return undefined;
  }
  const obj = doc as Record<string, unknown>;
  const kind = obj.openapi ? 'openapi' : obj.asyncapi ? 'asyncapi' : undefined;
  if (!kind) {
    return undefined;
  }
  const info = obj.info as Record<string, unknown> | undefined;
  const title = info?.title;
  if (typeof title !== 'string' || title.length === 0) {
    return undefined;
  }
  // Backstage's metadata.tags format requires kebab-case slugs — native OpenAPI/AsyncAPI tag
  // names (e.g. "Celestial Bodies") are free text, so they're slugified here rather than passed
  // through verbatim.
  const tags = Array.isArray(obj.tags)
    ? (obj.tags as Array<Record<string, unknown>>)
        .map(t => t?.name)
        .filter((t): t is string => typeof t === 'string')
        .map(slugify)
        .filter(t => t.length > 0)
    : [];

  return {
    kind,
    title,
    description: typeof info?.description === 'string' ? (info.description as string) : undefined,
    tags,
    raw: obj,
  };
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

// ---------------------------------------------------------------------------------------------
// Candidate mapping
// ---------------------------------------------------------------------------------------------

interface MappingResult {
  entity: Entity;
  entityName: string;
  // Lab 6: set only on a successful (non-error) mapping that declares an apiBasename — error/
  // marker entities never contribute a System, since they aren't real registrations.
  systemSlug?: string;
  error?: string;
}

function xField(raw: Record<string, unknown>, namespace: string, field: string): string | undefined {
  const info = raw.info as Record<string, unknown> | undefined;
  const ns = info?.[`x-${namespace}`] as Record<string, unknown> | undefined;
  const value = ns?.[field];
  return typeof value === 'string' ? value : undefined;
}

function resolveOwnerRef(rawOwner: string | undefined, defaultOwner: string): string {
  const value = rawOwner ?? defaultOwner;
  return stringifyEntityRef(
    parseEntityRef(value, { defaultKind: 'group', defaultNamespace: 'default' }),
  );
}

function buildEntity(opts: {
  providerName: string;
  filePath: string;
  contents: string;
  parsed: ParsedSpec;
  entityName: string;
  owner: string;
  lifecycle: string;
  visibility: string;
  system?: string;
  registrationError?: string;
}): Entity {
  const annotations: Record<string, string> = {
    // Identifies the source file for debugging and the catalog-info.yaml precedence check — not
    // used as a live, re-readable `$text` target: Backstage's default UrlReader stack has no
    // `file:`-scheme reader, so spec.definition is populated inline below instead (the provider
    // already holds the bytes; no fetch is needed).
    [ANNOTATION_LOCATION]: `file:${opts.filePath}`,
    [ANNOTATION_ORIGIN_LOCATION]: `file:${opts.filePath}`,
    [VISIBILITY_ANNOTATION]: opts.visibility,
    [MANAGED_BY_ANNOTATION]: opts.providerName,
  };
  if (opts.registrationError) {
    annotations[REGISTRATION_ERROR_ANNOTATION] = opts.registrationError;
  }

  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: opts.entityName,
      title: opts.parsed.title,
      description: opts.parsed.description,
      tags: opts.parsed.tags,
      annotations,
    },
    spec: {
      type: opts.parsed.kind,
      lifecycle: opts.lifecycle,
      owner: opts.owner,
      ...(opts.system ? { system: opts.system } : {}),
      definition: opts.contents,
    },
  };
}

// Lab 6: builds the System entity representing an apiBasename — one instance per distinct slug,
// synthesized purely from spec files, never hand-authored (see runCycle()'s per-cycle
// resynchronization).
function buildSystemEntity(providerName: string, slug: string, owner: string): Entity {
  // Needs the same location annotations the API entities get: without one, the catalog's
  // orphan-cleanup task treats a location-less entity as unowned and deletes it on its own
  // schedule, regardless of the EntityProvider re-asserting it every cycle.
  const location = `synthetic:${providerName}`;
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: slug,
      annotations: {
        [ANNOTATION_LOCATION]: location,
        [ANNOTATION_ORIGIN_LOCATION]: location,
        [MANAGED_BY_ANNOTATION]: providerName,
      },
    },
    spec: {
      owner,
    },
  };
}

/**
 * Maps a parsed spec file to a candidate catalog entity, applying x-* extraction, owner/visibility
 * validation, and collision detection. Does not perform the catalog-info.yaml precedence check
 * (that requires a catalog query and is done by the caller, once, per file).
 */
function mapCandidate(opts: {
  providerName: string;
  source: SourceConfig;
  filePath: string;
  contents: string;
  parsed: ParsedSpec;
  knownOwnerRefs: Set<string>;
  collidesWith: string | undefined; // file_path of an existing different-name-slug claimant, if any
}): MappingResult {
  const { providerName, source, filePath, contents, parsed, knownOwnerRefs, collidesWith } = opts;
  const baseSlug = slugify(parsed.title);

  const rawOwner = xField(parsed.raw, source.xNamespace, 'owner');
  const owner = resolveOwnerRef(rawOwner, source.defaultOwner);
  const lifecycle = xField(parsed.raw, source.xNamespace, 'lifecycle') ?? 'experimental';
  const rawVisibility = xField(parsed.raw, source.xNamespace, 'visibility');
  const visibility = rawVisibility ?? source.defaultVisibility;
  // Lab 6: x-<namespace>.apiBasename groups every major version of the same logical API under one
  // System, slugified the same way entity names are so it's a valid catalog entity name.
  const rawApiBasename = xField(parsed.raw, source.xNamespace, 'apiBasename');
  const systemSlug = rawApiBasename ? slugify(rawApiBasename) : undefined;

  // Rule: an unrecognized-but-present visibility value is a marker/error entity, never silently
  // defaulted.
  if (rawVisibility !== undefined && !KNOWN_VISIBILITIES.has(rawVisibility)) {
    return {
      entityName: baseSlug,
      entity: buildEntity({
        providerName,
        filePath,
        contents,
        parsed,
        entityName: baseSlug,
        owner: source.defaultOwner,
        lifecycle,
        visibility: source.defaultVisibility,
        registrationError: `Unrecognized x-${source.xNamespace}.visibility value: "${rawVisibility}" (expected "private" or "shared")`,
      }),
      error: 'invalid-visibility',
    };
  }

  // Rule: an owner that doesn't resolve to a known User/Group entity is a marker/error entity
  // instead of blocking the whole cycle.
  if (!knownOwnerRefs.has(owner)) {
    return {
      entityName: baseSlug,
      entity: buildEntity({
        providerName,
        filePath,
        contents,
        parsed,
        entityName: baseSlug,
        owner: source.defaultOwner,
        lifecycle,
        visibility,
        registrationError: `Owner "${owner}" does not resolve to a known User or Group entity`,
      }),
      error: 'invalid-owner',
    };
  }

  // Rule: a name collision with another file (in this source or another) is a suffixed
  // marker/error entity — first-by-path wins, this one loses.
  if (collidesWith) {
    const collisionName = `${baseSlug}-collision`;
    return {
      entityName: collisionName,
      entity: buildEntity({
        providerName,
        filePath,
        contents,
        parsed,
        entityName: collisionName,
        owner,
        lifecycle,
        visibility,
        registrationError: `Entity name "${baseSlug}" collides with an existing entity from ${collidesWith}`,
      }),
      error: 'name-collision',
    };
  }

  return {
    entityName: baseSlug,
    systemSlug,
    entity: buildEntity({
      providerName,
      filePath,
      contents,
      parsed,
      entityName: baseSlug,
      owner,
      lifecycle,
      visibility,
      system: systemSlug,
    }),
  };
}

// ---------------------------------------------------------------------------------------------
// Scan-state cache
// ---------------------------------------------------------------------------------------------

interface CacheRow {
  source_id: string;
  file_path: string;
  mtime_ms: number;
  content_hash: string;
  entity_name: string;
  last_error: string | null;
  // Lab 6: the slugified info.x-<namespace>.apiBasename this file last resolved to, or null if
  // the file doesn't declare one. Drives System entity synthesis in runCycle().
  system_slug: string | null;
}

class ScanStateCache {
  constructor(private readonly knex: Knex) {}

  static async create(database: DatabaseService): Promise<ScanStateCache> {
    const knex = await database.getClient();
    // A dedicated migration-bookkeeping table: `coreServices.database` for a module registered
    // against the 'catalog' plugin shares that plugin's own database, so using knex's default
    // `knex_migrations` table here would validate our one-migration `migrationSource` against the
    // real catalog plugin's own (much longer) applied-migrations history and fail with
    // "migration directory is corrupt".
    interface MigrationModule {
      up(knex: Knex): Promise<void>;
      down(knex: Knex): Promise<void>;
    }
    const migrations: Record<string, MigrationModule> = {
      '001_scan_state_cache': scanStateCacheMigration,
      '002_add_system_slug': systemSlugMigration,
    };
    await knex.migrate.latest({
      tableName: 'auto_api_registration_migrations',
      migrationSource: {
        async getMigrations() {
          return Object.keys(migrations);
        },
        getMigrationName(migration: string) {
          return migration;
        },
        async getMigration(migration: string) {
          return migrations[migration];
        },
      },
    });
    return new ScanStateCache(knex);
  }

  async rowsForSource(sourceId: string): Promise<CacheRow[]> {
    return this.knex(scanStateCacheMigration.TABLE_NAME).where({ source_id: sourceId });
  }

  /** Global lookup (no source_id filter) — collision/precedence checks span every source. */
  async rowsByEntityName(entityName: string): Promise<CacheRow[]> {
    return this.knex(scanStateCacheMigration.TABLE_NAME).where({ entity_name: entityName });
  }

  async upsert(row: CacheRow): Promise<void> {
    await this.knex(scanStateCacheMigration.TABLE_NAME)
      .insert(row)
      .onConflict(['source_id', 'file_path'])
      .merge();
  }

  async remove(sourceId: string, filePath: string): Promise<void> {
    await this.knex(scanStateCacheMigration.TABLE_NAME)
      .where({ source_id: sourceId, file_path: filePath })
      .delete();
  }
}

function sha1(contents: string): string {
  return crypto.createHash('sha1').update(contents).digest('hex');
}

// ---------------------------------------------------------------------------------------------
// EntityProvider (one instance per source)
// ---------------------------------------------------------------------------------------------

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

class AutoApiRegistrationEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private hasRunOnce = false;

  constructor(
    private readonly source: SourceConfig,
    private readonly cache: ScanStateCache,
    private readonly catalogApi: CatalogService,
    private readonly auth: AuthService,
    private readonly logger: LoggerService,
  ) {}

  getProviderName(): string {
    return `auto-api-registration:${this.source.id}`;
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
  }

  async runCycle(): Promise<void> {
    if (!this.connection) {
      this.logger.warn(
        `auto-api-registration:${this.source.id}: skipped a cycle — provider not yet connected`,
      );
      return;
    }

    const existingRows = await this.cache.rowsForSource(this.source.id);
    const existingByPath = new Map(existingRows.map(row => [row.file_path, row]));

    const currentPaths = new Set<string>();
    for await (const filePath of discoverFiles(this.source)) {
      currentPaths.add(filePath);
    }

    const knownOwnerRefs = await this.fetchKnownOwnerRefs();

    const changedPaths = [...currentPaths].filter(filePath => {
      const cached = existingByPath.get(filePath);
      if (!cached) return true;
      const stat = fs.statSync(filePath);
      return stat.mtimeMs !== cached.mtime_ms;
    });

    const added: DeferredEntity[] = [];
    const removedRefs: string[] = [];
    const upserts: CacheRow[] = [];
    const deletes: string[] = [];

    await mapLimit(changedPaths, this.source.parseConcurrency, async filePath => {
      const cached = existingByPath.get(filePath);
      const stat = fs.statSync(filePath);
      const contents = fs.readFileSync(filePath, 'utf8');
      const hash = sha1(contents);

      if (cached && cached.content_hash === hash) {
        // mtime touched, content unchanged — refresh mtime only, no mutation needed.
        upserts.push({ ...cached, mtime_ms: stat.mtimeMs });
        return;
      }

      const parsed = parseSpecFile(contents);
      if (!parsed) {
        this.logger.error(
          `auto-api-registration:${this.source.id}: ${filePath} is not a valid OpenAPI/AsyncAPI file (malformed YAML, or missing openapi/asyncapi + info.title) — skipped`,
        );
        if (cached) {
          removedRefs.push(stringifyEntityRef({ kind: 'API', namespace: 'default', name: cached.entity_name }));
          deletes.push(filePath);
        }
        return;
      }

      const slug = slugify(parsed.title);

      // Precedence check: a hand-authored catalog-info.yaml for this name wins.
      const precedenceWinner = await this.findNonAutoSourcedEntity(slug);
      if (precedenceWinner) {
        this.logger.info(
          `auto-api-registration:${this.source.id}: ${filePath} maps to "${slug}", which already has a hand-authored catalog-info.yaml — skipping auto-sourced registration`,
        );
        if (cached) {
          removedRefs.push(stringifyEntityRef({ kind: 'API', namespace: 'default', name: cached.entity_name }));
          deletes.push(filePath);
        }
        return;
      }

      // Global collision check: excludes this file's own prior row.
      const collisionRows = (await this.cache.rowsByEntityName(slug)).filter(
        row => !(row.source_id === this.source.id && row.file_path === filePath),
      );
      const collidesWith = collisionRows.length > 0 ? collisionRows[0].file_path : undefined;

      const mapped = mapCandidate({
        providerName: this.getProviderName(),
        source: this.source,
        filePath,
        contents,
        parsed,
        knownOwnerRefs,
        collidesWith,
      });

      if (mapped.error) {
        this.logger.error(
          `auto-api-registration:${this.source.id}: ${filePath} registered as an error entity "${mapped.entityName}" — ${mapped.entity.metadata.annotations?.[REGISTRATION_ERROR_ANNOTATION]}`,
        );
      }

      added.push({ entity: mapped.entity });
      upserts.push({
        source_id: this.source.id,
        file_path: filePath,
        mtime_ms: stat.mtimeMs,
        content_hash: hash,
        entity_name: mapped.entityName,
        last_error: mapped.error ?? null,
        system_slug: mapped.systemSlug ?? null,
      });
    });

    for (const [filePath, row] of existingByPath) {
      if (!currentPaths.has(filePath)) {
        removedRefs.push(stringifyEntityRef({ kind: 'API', namespace: 'default', name: row.entity_name }));
        deletes.push(filePath);
      }
    }

    // Lab 6: recompute the full set of System entities this source currently implies, from every
    // file's last-known system_slug (not just the ones that changed this cycle) — cheap (in-memory
    // over the cache rows already loaded) and re-declaring an unchanged System is a harmless
    // upsert, so this stays correct even across a backend restart's first cycle.
    const deletedPaths = new Set(deletes);
    const finalRows: CacheRow[] = [...upserts];
    for (const [filePath, row] of existingByPath) {
      if (currentPaths.has(filePath) && !changedPaths.includes(filePath) && !deletedPaths.has(filePath)) {
        finalRows.push(row);
      }
    }
    const systemSlugs = new Set(
      finalRows.map(row => row.system_slug).filter((slug): slug is string => !!slug),
    );
    const systemEntities: DeferredEntity[] = [...systemSlugs].map(slug => ({
      entity: buildSystemEntity(
        this.getProviderName(),
        slug,
        resolveOwnerRef(undefined, this.source.defaultOwner),
      ),
    }));

    if (!this.hasRunOnce) {
      // First run: establish the baseline with one `full` mutation.
      await this.connection.applyMutation({ type: 'full', entities: [...added, ...systemEntities] });
      this.hasRunOnce = true;
    } else if (added.length > 0 || removedRefs.length > 0) {
      await this.connection.applyMutation({
        type: 'delta',
        added: [...added, ...systemEntities],
        removed: removedRefs.map(entityRef => ({ entityRef })),
      });
    }

    for (const row of upserts) {
      await this.cache.upsert(row);
    }
    for (const filePath of deletes) {
      await this.cache.remove(this.source.id, filePath);
    }
  }

  private async fetchKnownOwnerRefs(): Promise<Set<string>> {
    const credentials = await this.auth.getOwnServiceCredentials();
    const response = await this.catalogApi.getEntities(
      { filter: { kind: ['User', 'Group'] }, fields: ['kind', 'metadata.name', 'metadata.namespace'] },
      { credentials },
    );
    return new Set(response.items.map(entity => stringifyEntityRef(entity)));
  }

  private async findNonAutoSourcedEntity(entityName: string): Promise<Entity | undefined> {
    const credentials = await this.auth.getOwnServiceCredentials();
    const response = await this.catalogApi.getEntities(
      { filter: { kind: 'API', 'metadata.name': entityName } },
      { credentials },
    );
    return response.items.find(entity => !entity.metadata.annotations?.[MANAGED_BY_ANNOTATION]);
  }
}

// ---------------------------------------------------------------------------------------------
// CatalogProcessor: surfaces registration errors via Backstage's native processing-error UI
// ---------------------------------------------------------------------------------------------

class AutoApiRegistrationErrorProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'auto-api-registration-error-processor';
  }

  async preProcessEntity(
    entity: Entity,
    _location: unknown,
    _emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    const message = entity.metadata.annotations?.[REGISTRATION_ERROR_ANNOTATION];
    if (message) {
      throw new InputError(message);
    }
    return entity;
  }
}

// ---------------------------------------------------------------------------------------------
// Backend module registration (following packages/backend/src/extensions/permissionPolicy.ts)
// ---------------------------------------------------------------------------------------------

export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'auto-api-registration',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        database: coreServices.database,
        scheduler: coreServices.scheduler,
        logger: coreServices.logger,
        rootConfig: coreServices.rootConfig,
        catalogApi: catalogServiceRef,
        auth: coreServices.auth,
      },
      async init({ catalog, database, scheduler, logger, rootConfig, catalogApi, auth }) {
        const sources = normalizeConfig(rootConfig);
        if (sources.length === 0) {
          logger.info('auto-api-registration: no autoApiRegistration config found — module inactive');
          return;
        }

        const cache = await ScanStateCache.create(database);

        const providers = sources.map(
          source =>
            new AutoApiRegistrationEntityProvider(source, cache, catalogApi, auth, logger),
        );

        catalog.addEntityProvider(providers);
        catalog.addProcessor(new AutoApiRegistrationErrorProcessor());

        for (const [index, source] of sources.entries()) {
          const provider = providers[index];

          if (source.mode === 'poll') {
            await scheduler.scheduleTask({
              id: `auto-api-registration:${source.id}:poll`,
              frequency: { seconds: source.scheduleFrequencySeconds },
              timeout: { seconds: Math.max(source.scheduleFrequencySeconds * 2, 30) },
              fn: async () => {
                try {
                  await provider.runCycle();
                } catch (error) {
                  logger.error(`auto-api-registration:${source.id}: cycle failed`, error as Error);
                }
              },
            });
          } else {
            // Steady-state discovery signal at real-world scale: a watcher triggers a rescan of
            // just this source on add/change/unlink, coalesced by chokidar's own event batching.
            // `schedule.frequencySeconds` is ignored in watch mode in favor of the much longer
            // `reconciliation.frequencySeconds` safety-net sweep below.
            await scheduler.scheduleTask({
              id: `auto-api-registration:${source.id}:reconciliation`,
              frequency: { seconds: source.reconciliationFrequencySeconds },
              timeout: { seconds: Math.max(source.reconciliationFrequencySeconds / 2, 60) },
              fn: async () => {
                try {
                  await provider.runCycle();
                } catch (error) {
                  logger.error(`auto-api-registration:${source.id}: reconciliation sweep failed`, error as Error);
                }
              },
            });

            const watcher = chokidar.watch(source.patterns, {
              cwd: source.rootPath,
              ignored: source.ignore,
              ignoreInitial: true,
            });
            let debounce: NodeJS.Timeout | undefined;
            const triggerRescan = () => {
              clearTimeout(debounce);
              debounce = setTimeout(() => {
                provider
                  .runCycle()
                  .catch(error => logger.error(`auto-api-registration:${source.id}: watch-triggered cycle failed`, error as Error));
              }, 500);
            };
            watcher.on('add', triggerRescan);
            watcher.on('change', triggerRescan);
            watcher.on('unlink', triggerRescan);
          }
        }
      },
    });
  },
});
