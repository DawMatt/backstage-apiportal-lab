#!/usr/bin/env node
// Lab 5: Mocking and Testing
//
// A single, long-lived HTTP server that mocks every discovered OpenAPI-typed API, using
// Stoplight Prism's *programmatic* library (@stoplight/prism-http, which itself uses
// @stoplight/http-spec's transformOas3Operations internally) — not the `prism` CLI. One process
// serves every API rather than one process/port per API, so process/port count stays O(1) as
// the catalog grows (see specs/005-lab-5-mocking-testing/research.md R2/R7). Each API's spec is
// read, dereferenced, and converted to Prism's operation format only on that API's first
// request, then cached in a bounded LRU map — memory cost scales with *actively used* APIs, not
// catalog size.
//
// Note on `getHttpOperationsFromSpec` vs. calling `transformOas3Operations` directly: this
// lab's specs use ordinary same-file `$ref`s (e.g. `#/components/schemas/Foo`), which is the
// common case for any non-trivial OpenAPI document. `transformOas3Operations` alone leaves those
// refs unresolved, which fails at mock-generation time ("Invalid reference token") the moment a
// response has no static example and Prism falls back to schema-driven generation.
// `getHttpOperationsFromSpec` (exported directly by `@stoplight/prism-http`) wraps the same
// `transformOas3Operations` call with the `$RefParser().dereference()` + `bundleTarget()` steps
// that resolution actually requires — confirmed by reading its source
// (node_modules/@stoplight/prism-http/dist/utils/operations.js) after hitting this failure
// against Museum's real spec. It also accepts a file path directly, so this gateway no longer
// needs to read/parse each spec file itself.

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import prismHttp from '@stoplight/prism-http';

const { createInstance, getHttpOperationsFromSpec } = prismHttp;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// This script is committed both here (teaching content) and copied to
// labs/lab-01-base-backstage/backstage/scripts/mock-gateway.mjs, where it actually runs — so
// "the backstage instance directory" is always one level up from wherever this file lives.
const BACKSTAGE_DIR = path.resolve(__dirname, '..');
const APP_CONFIG_PATH = path.join(BACKSTAGE_DIR, 'app-config.yaml');

// ---------------------------------------------------------------------------------------------
// Minimal logger
// ---------------------------------------------------------------------------------------------
// Prism's core `factory()` and mocker call several pino-style methods on the logger it's given
// — `child({ name })` on every request, plus assorted level methods (`warn`, `info`, and even a
// non-standard `success`) deep inside its negotiation logic (@stoplight/prism-core/dist/factory.js,
// @stoplight/prism-http/dist/mocker/index.js). Rather than enumerate every method Prism might
// call (and add a `pino` dependency this lab doesn't otherwise need), a Proxy answers any level
// method with a console logger and handles `child(...)` specially to keep prefixes readable.
// Prism's own internal per-request negotiation logging (debug/trace) is noisy relative to what
// this lab's quickstart verification actually looks for (one load line per first request, no
// line on cache hits) — silenced here so the gateway's own log lines stay easy to read.
const SILENCED_LEVELS = new Set(['debug', 'trace']);

function createLogger(name) {
  const prefix = `[mock-gateway${name ? `:${name}` : ''}]`;
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'child') {
          return bindings =>
            createLogger(bindings?.name ? (name ? `${name}:${bindings.name}` : bindings.name) : name);
        }
        if (typeof prop !== 'string') return undefined;
        if (SILENCED_LEVELS.has(prop)) return () => {};
        return (...args) => console.log(prefix, prop.toUpperCase(), ...args);
      },
    },
  );
}
const logger = createLogger();

// ---------------------------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------------------------

function loadAppConfig() {
  const contents = fs.readFileSync(APP_CONFIG_PATH, 'utf8');
  return yaml.load(contents) ?? {};
}

const appConfig = loadAppConfig();
const gatewayConfig = appConfig.mocking?.gateway ?? {};
const PORT = gatewayConfig.port ?? 4010;
const MAX_CACHED_SPECS = gatewayConfig.maxCachedSpecs ?? 100;

const DEFAULT_IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

// Lab 4's own discovery convention (`autoApiRegistration.rootPath`/`patterns`, or Lab 6's
// multi-source `autoApiRegistration.sources[]` extension of it) is the single source of truth
// for which files are auto-registered in the catalog — reused here rather than duplicated, so
// "what's registered" and "what's mockable" can't drift apart (research.md R3). `rootPath`
// mirrors the same default Lab 4's backend module resolves to when left unset.
const autoApiRegistrationConfig = appConfig.autoApiRegistration ?? {};
const DEFAULT_LAB4_ROOT = path.resolve(BACKSTAGE_DIR, '../../lab-04-auto-registration/apis');
const DEFAULT_LAB4_PATTERNS = ['**/*-openapi.yaml'];
// autoApiRegistration.ts's normalizeConfig() resolves each source's relative `rootPath` against
// `resolvePackagePath('backend')` (packages/backend of the running Backstage instance), not
// against BACKSTAGE_DIR itself — mirrored here so a rootPath like
// "../../../../lab-06-api-lifecycle-management/apis" resolves to the exact same directory in
// both places.
const BACKEND_PACKAGE_DIR = path.join(BACKSTAGE_DIR, 'packages', 'backend');

function toLab4Source(entry) {
  return {
    rootPath: entry.rootPath
      ? path.resolve(BACKEND_PACKAGE_DIR, entry.rootPath)
      : DEFAULT_LAB4_ROOT,
    // AsyncAPI mocking is explicitly out of scope for this lab (FR-005) even though Lab 4 also
    // auto-registers `*-asyncapi.yaml` files, so that half of Lab 4's pattern list is dropped here.
    patterns: (entry.patterns ?? DEFAULT_LAB4_PATTERNS).filter(
      pattern => !pattern.includes('asyncapi'),
    ),
  };
}

// Lab 6 extended Lab 4's config from a single flat source to a `sources: []` array (one entry
// per independently-configured source repo, e.g. the default Lab 4 apis/ plus Lab 6's own
// museum-v1/v2 apis/) — both shapes are supported here so this stays in sync regardless of which
// one a given lab's app-config.yaml uses.
const lab4Sources = Array.isArray(autoApiRegistrationConfig.sources)
  ? autoApiRegistrationConfig.sources.map(toLab4Source)
  : [toLab4Source(autoApiRegistrationConfig)];

// Lab 1's Museum API predates Lab 4's `*-openapi.yaml` convention: it's committed as a plain
// `openapi.yaml` and is catalogued by hand (a committed catalog-info.yaml), not by Lab 4's
// EntityProvider — so it is invisible to the lookup above and would never get a mock option.
// Rather than rename a file Labs 1-2 already committed and documented, one additional,
// explicitly-named source keeps Museum mockable without broadening Lab 4's own glob (which
// stays exactly as Lab 4 defined it, untouched by this lab).
const DEFAULT_ADDITIONAL_SOURCES = [
  { rootPath: '../../lab-01-base-backstage/apis', patterns: ['**/openapi.yaml'] },
];

const additionalSources = (gatewayConfig.additionalSources ?? DEFAULT_ADDITIONAL_SOURCES).map(
  source => ({
    rootPath: path.resolve(BACKSTAGE_DIR, source.rootPath),
    patterns: source.patterns,
  }),
);

const discoverySources = [...lab4Sources, ...additionalSources];

// ---------------------------------------------------------------------------------------------
// Discovery — a cheap directory walk + filename match, not a spec parse (safe to do eagerly
// even at 500+ files; research.md R2/R7). A lightweight `info.title` read (below) is still
// needed to compute each API's slug, but that's a plain YAML load, not the expensive
// OAS-to-Prism-operations conversion, which stays deferred to first request (loadOperations).
// ---------------------------------------------------------------------------------------------

function walkFiles(rootDir) {
  const results = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        results.push(path.join(dir, entry.name));
      }
    }
  }
  walk(rootDir);
  return results;
}

/** Supports exactly the two pattern shapes used in this lab: '**\/<name>' and '**\/*-<name>'. */
function matchesPattern(fileName, pattern) {
  const suffix = pattern.replace(/^\*\*\//, '');
  return suffix.startsWith('*') ? fileName.endsWith(suffix.slice(1)) : fileName === suffix;
}

function discoverSpecFiles(source) {
  if (!fs.existsSync(source.rootPath)) return [];
  return walkFiles(source.rootPath).filter(filePath =>
    source.patterns.some(pattern => matchesPattern(path.basename(filePath), pattern)),
  );
}

/** Same algorithm as Lab 4's `slugify()` (packages/backend/src/extensions/autoApiRegistration.ts) —
 * must match exactly, since it's what turns a spec's `info.title` into the catalog entity's
 * `metadata.name`, which the frontend module uses verbatim as this gateway's URL slug. */
function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

function buildDiscoveryMap() {
  const map = new Map();
  for (const source of discoverySources) {
    for (const filePath of discoverSpecFiles(source)) {
      let title;
      try {
        const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
        title = doc?.info?.title;
      } catch (error) {
        logger.warn(`could not read "${filePath}" during discovery: ${error.message}`);
        continue;
      }
      if (typeof title !== 'string' || title.length === 0) continue;

      const slug = slugify(title);
      if (map.has(slug) && map.get(slug) !== filePath) {
        logger.warn(
          `entity name slug "${slug}" is claimed by both "${map.get(slug)}" and "${filePath}" — keeping the first`,
        );
        continue;
      }
      map.set(slug, filePath);
    }
  }
  return map;
}

const discoveryMap = buildDiscoveryMap();
logger.info(
  `discovery map built: ${discoveryMap.size} API(s) discoverable (${[...discoveryMap.keys()].join(', ') || 'none'})`,
);

// ---------------------------------------------------------------------------------------------
// Loaded Spec Cache — lazy, LRU-bounded (data-model.md)
// ---------------------------------------------------------------------------------------------

class LruCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    // Re-insert to mark as most-recently-used (Map iteration order = insertion order).
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    this.map.delete(key);
    if (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
      logger.info(`evicted "${oldestKey}" from the spec cache (maxCachedSpecs=${this.maxSize})`);
    }
    this.map.set(key, value);
  }
}

const specCache = new LruCache(MAX_CACHED_SPECS);

async function loadOperations(slug, filePath) {
  const cached = specCache.get(slug);
  if (cached) return cached;

  const start = performance.now();
  const operations = await getHttpOperationsFromSpec(filePath);
  const elapsedMs = Math.round(performance.now() - start);

  logger.info(
    `loading "${slug}" from "${filePath}" — ${operations.length} operation(s) converted in ${elapsedMs}ms (first request, now cached)`,
  );
  specCache.set(slug, operations);
  return operations;
}

// ---------------------------------------------------------------------------------------------
// Prism instance — one, for the gateway's whole lifetime (research.md R2)
// ---------------------------------------------------------------------------------------------

const prism = createInstance(
  {
    mock: { dynamic: false },
    checkSecurity: false,
    validateRequest: false,
    validateResponse: false,
    errors: false,
    upstreamProxy: undefined,
    isProxy: false,
  },
  { logger: createLogger('prism') },
);

// ---------------------------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------------------------

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const segments = url.pathname.split('/').filter(Boolean);
  const [slug, ...rest] = segments;

  if (!slug) {
    sendJson(res, 400, { error: 'Missing API slug', message: 'Expected /<entityNameSlug>/<path>' });
    return;
  }

  const filePath = discoveryMap.get(slug);
  if (!filePath) {
    sendJson(res, 404, {
      error: 'Unknown mock target',
      message: `No discovered OpenAPI spec matches "${slug}".`,
      knownSlugs: [...discoveryMap.keys()],
    });
    return;
  }

  let operations;
  try {
    operations = await loadOperations(slug, filePath);
  } catch (error) {
    logger.error(`failed to load/convert spec for "${slug}": ${error.stack || error.message}`);
    sendJson(res, 500, { error: 'Failed to load mock spec', message: error.message });
    return;
  }

  const body = await readJsonBody(req);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers['content-length'];

  const request = {
    method: (req.method || 'GET').toLowerCase(),
    url: {
      path: `/${rest.join('/')}` || '/',
      query: Object.fromEntries(url.searchParams),
    },
    headers,
    body,
  };

  const result = await prism.request(request, operations)();

  if (result._tag === 'Left') {
    logger.error(`mock request for "${slug}" failed: ${result.left.message}`);
    sendJson(res, 502, { error: 'Mock generation failed', message: result.left.message });
    return;
  }

  const { output } = result.right;
  res.writeHead(output.statusCode, output.headers || {});
  if (output.body === undefined) {
    res.end();
  } else {
    res.end(typeof output.body === 'string' ? output.body : JSON.stringify(output.body));
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    logger.error(`unhandled error: ${error.stack || error.message}`);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal mock gateway error', message: error.message });
    }
  });
});

server.listen(PORT, () => {
  logger.info(`listening on http://localhost:${PORT}`);
});
