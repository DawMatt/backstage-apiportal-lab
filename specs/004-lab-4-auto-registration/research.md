# Phase 0 Research: Lab 4 — Auto Registration

## R1: Discovery mechanism

**Decision**: A custom Backstage **EntityProvider** (not a `CatalogProcessor`), registered as a
backend module via `catalogProcessingExtensionPoint.addEntityProvider(...)`, following the same
`createBackendModule` pattern already used for the permission policy
(`labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/permissionPolicy.ts`).

**Rationale**: An `EntityProvider` owns a versioned mutation of "the set of entities this provider
currently knows about." Anything it does not currently claim is retracted by the catalog. This
gives create (FR-002), update (FR-003), and removal-on-delete (FR-004) for free from one code
path, with no separate cleanup logic needed. A `CatalogProcessor` only transforms entities that
already exist via some `Location`; it cannot originate new entities from an arbitrary filesystem
scan on its own.

**Alternatives considered**:
- GitHub discovery processor (`catalog-backend-module-github`) — rejected: requires a real GitHub
  App/token and a reachable remote repo, violating the zero-cost/no-external-network assumption
  already recorded in the spec (Assumptions: mono-repo is simulated locally).
- `type: file` catalog locations with glob targets pointing at `catalog-info.yaml` — rejected:
  this still requires a hand-authored `catalog-info.yaml` per API, which is precisely what Lab 4
  must eliminate (FR-001).

**Scaling to a real mono-repo (1000+ files, 1GB+, see R6)**: the lab defaults use a `type: 'full'`
mutation on every cycle because it is the simplest thing to explain and the entity count is tiny.
That does **not** scale: a `full` mutation re-transmits and re-diffs every known entity on every
cycle, so its cost grows with total catalog size, not with how much actually changed. The
mechanism as designed (an `EntityProvider` driving mutations) scales fine — what must change is
*which mutation type it sends*. See R6 for the delta-mutation and persisted-cache design that
keeps the same `EntityProvider` architecture viable at scale; the lab's own config simply doesn't
need to turn those knobs on for 2–3 sample files.

## R2: File discovery within the mono-repo

**Decision**: Use `fast-glob` (already present in the workspace `node_modules`, will be added as
an explicit `dependencies` entry in `packages/backend/package.json`) to scan a configured root
path for `**/*-openapi.yaml` and `**/*-asyncapi.yaml`, on a scheduled interval via
`coreServices.scheduler` (default every 30s — fast enough for interactive lab feedback without
hammering the filesystem).

**Root path**: configurable via `autoApiRegistration.rootPath` in `app-config.yaml`; documented
as an adaptable convention (FR-010). Default value resolves from the backend process's working
directory (`packages/backend` under `backstage-cli package start`) up to the repository root —
exact relative segment count will be confirmed experimentally during implementation and recorded
here as a Run update, consistent with how Lab 3's research.md captured verified findings.

**Scaling to a real mono-repo (1000+ files, 1GB+, see R6)**: two changes are load-bearing at scale
and are therefore built into the mechanism now, not deferred as a "someday" rewrite, even though
the lab's default config doesn't need them:
1. **Ignore patterns are mandatory, not optional.** `fast-glob` is called with an `ignore` list
   (`**/node_modules/**`, `**/.git/**`, `**/dist/**`, `**/build/**`, plus a configurable
   `autoApiRegistration.ignore` extension point) from day one. Without this, a glob walk over a
   1GB tree spends nearly all its time inside dependency/build directories that will never contain
   a hand-authored spec file. This is a correctness-adjacent default, not a performance tune-up —
   it is documented and defaulted in the lab even though the lab repo itself has few such
   directories at the discovery root, so learners inherit a safe default rather than discovering
   the need for it the hard way at 1000 files.
2. **Streamed, not buffered, matching.** Use `fastGlob.stream(...)` and process results as they
   arrive rather than `fastGlob(...)`'s array form, so peak memory during a scan is bounded by
   in-flight parse concurrency (see R6), not by total file count.

**Alternatives considered**:
- `chokidar` file-watcher for real-time push updates — rejected *as the lab default* (adds a
  persistent watch process and cross-platform edge cases — network drives, WSL, inotify limits on
  very large trees — for marginal benefit over a 30s poll against 2–3 files). Reconsidered and
  **adopted as the scale-up path** in R6: at 1000+ files, repeated full-tree poll walks are the
  wrong steady-state mechanism, and a watcher layered over the same ignore-pattern set is what
  makes the "how often do we rescan" question stop scaling with repo size.

## R3: Parsing OpenAPI / AsyncAPI files and extracting `x-*` metadata

**Decision**: Use `js-yaml` (already present, will be added as an explicit dependency) to parse
each matched file into a plain object. A file is treated as valid input if it parses as
YAML/JSON **and** contains either an `openapi` or `asyncapi` top-level version field **and** an
`info.title` string. Anything else (parse failure, missing both version fields, missing title) is
treated as malformed per the Edge Cases section.

Recognized `x-*` fields are read from the top-level `info` object for both OpenAPI and AsyncAPI
(per the Clarifications session):
- `info.x-backstage-owner` → `spec.owner`
- `info.x-backstage-lifecycle` → `spec.lifecycle` (default: `experimental`, if absent)
- `info.x-backstage-tags` → `metadata.tags` (default: `[]`, if absent)

**Rationale**: Full JSON-Schema validation against the OpenAPI/AsyncAPI meta-schemas (e.g. via
`@apidevtools/swagger-parser`, also present in `node_modules`) is available but deliberately not
used for the primary discovery path — it would reject specs with minor structural issues that are
otherwise perfectly usable for catalog registration, and doing full schema validation is out of
scope for what this lab teaches (catalog metadata sourcing, not spec authoring correctness). The
lightweight shape check above is sufficient to distinguish "not an API spec at all" from "a real
spec with metadata problems," which is the distinction FR-008's error handling cares about.

**Alternatives considered**:
- `@apidevtools/swagger-parser` full validation — rejected as primary path (see rationale above);
  noted as a documented extension point for learners in quickstart.md.

## R4: Owner validation and "visible, actionable error" surfacing

**Decision**: Errors are surfaced through **two independent, existing Backstage mechanisms** —
no bespoke error-reporting system is built:

1. **Backend logs**: every discovery cycle logs one line per skipped/errored file (parse failure,
   invalid owner reference, name collision) via the standard backend `logger`, already made
   visible through the installed `@backstage/plugin-catalog-backend-module-logs`.
2. **Backstage's native processing-error UI**: for errors that occur *after* a candidate entity
   has enough shape to be identified (invalid owner ref, name collision), the provider still emits
   a minimal entity for that file, tagged with an annotation
   (`apiportal-lab.io/registration-error: <message>`). A small companion `CatalogProcessor`
   (`preProcessEntity` hook, added to the same backend module) inspects that annotation and throws
   a `InputError` when present — Backstage's core catalog processing engine natively records
   processor errors per-entity and surfaces them in the entity's own "Inspect entity" /
   unprocessed-entities view, which is exactly the built-in "catalog processing errors UI" the
   Clarifications session specified. One message, written once, drives both surfaces.

   Files that fail the **shape check in R3** (not parseable as an API spec at all — no
   `openapi`/`asyncapi` field, no `info.title`) cannot produce even a minimal entity (no name to
   register under) and are therefore logged only; this is called out explicitly in quickstart.md
   as the one category of error that is log-only rather than log+UI, and is why FR-008 lists
   "fails to parse" separately from the owner/collision cases.

**Owner validation**: before emitting the full mutation, the provider fetches all existing
`User`/`Group` entities via the in-process `CatalogService` and checks each candidate's
`x-backstage-owner` value resolves to a known entity ref (defaulting kind to `group:default/` if
no kind prefix is given, consistent with how `teams.yaml` entities are referenced elsewhere in the
repo). Unresolvable owners produce the marker-entity + processor-error path above.

**Name collisions**: if two discovered files slugify to the same candidate entity name, the first
(sorted by file path for determinism) is registered normally; the second is emitted as a marker
entity (suffixed, e.g. `<slug>-collision`) carrying the registration-error annotation so the
conflict is independently visible without ever silently overwriting the first. Collision detection
is done against the persisted slug→path index described in R6, not by re-deriving and sorting the
full candidate list on every check — at 1000+ files, an O(N log N) sort per cycle (or per watch
event, in watch mode) is avoidable work; an index lookup is O(1).

**Precedence with hand-authored `catalog-info.yaml`** (FR-011, Edge Case): before including a
candidate in its full mutation, the provider queries the catalog for an existing entity of the
same `kind: API` and `metadata.name` that did **not** originate from this provider (i.e. whose
`metadata.annotations['backstage.io/managed-by-origin-location']` differs from our provider's
entity source). If one exists, the auto-sourced candidate is skipped for that name — the
hand-authored entity wins, matching the documented Assumption.

## R5: New sample API for the "previously unregistered" discovery demo

**Decision**: Vendor a trimmed copy of the **Scalar Galaxy API** (MIT-licensed,
github.com/scalar/scalar, published build at
`https://cdn.jsdelivr.net/npm/@scalar/galaxy/dist/3.1.yaml`) as
`labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml`, with `x-backstage-owner`,
`x-backstage-lifecycle`, and `x-backstage-tags` fields added under `info` directly in the vendored
copy. The upstream file is a single self-contained OpenAPI 3.1 document (confirmed: 1469 lines,
all `$ref` usages are internal `#/components/...` references, no network-reachable `$ref`s),
covering a "planets/spaceships/users" domain distinct from the Museum, Train Travel, and
Streetlights examples already used in Labs 1–3, satisfying Constitution Principle VII.

A second, small hand-crafted OpenAPI file (`precedence-demo-openapi.yaml`, ~2 paths) is added
alongside a hand-authored `precedence-demo-catalog-info.yaml` in
`labs/lab-04-auto-registration/apis/precedence-demo/`, specifically to exercise the FR-011
precedence rule end-to-end without touching any Lab 1–3 registered API.

**Alternatives considered**:
- Reusing an existing Lab 1–3 API for the discovery demo — rejected: it is already registered via
  a hand-authored `catalog-info.yaml`, so it cannot authentically demonstrate "a previously
  unregistered API gets discovered" (User Story 1's core scenario).
- Redocly's other example repos (TicTacToe, etc.) as backup — not needed; Scalar Galaxy confirmed
  suitable on inspection.

## R6: Scalability & restart behavior at real-world mono-repo scale

The lab itself discovers 2–3 files in a small repo, and its default config values (30s full poll,
no persistence) are chosen for that scale — they are explicitly **not** what a 1000+ file, 1GB+
mono-repo should run with. This section records the mechanism-level decisions that keep the same
architecture (EntityProvider + fast-glob) viable at that scale, so scaling up is a config change
plus turning on code paths that already exist, not a rewrite.

**Problem 1 — full mutations don't scale with catalog size.** A `type: 'full'` `EntityProvider`
mutation re-sends and re-diffs every currently-known entity on every cycle. At 1000+ APIs, most of
which are unchanged between cycles, this wastes network/serialization cost and catalog-processing
time proportional to total catalog size rather than to actual change volume.

**Decision**: after the provider's first `full` mutation (needed once, to establish the baseline
with the catalog), all subsequent cycles emit `type: 'delta'` mutations (`added`/`removed` only),
computed by diffing the current scan against the persisted scan-state cache (Problem 2). This is
the standard Backstage `EntityProvider` pattern for large, incrementally-changing entity sets (the
same pattern the built-in GitHub discovery provider uses at organization scale) — no custom
protocol is invented.

**Problem 2 — a cold backend restart re-derives everything from zero.** Backstage's catalog
database already persists previously-ingested *entities* across restarts (a provider's entities
are not deleted until that provider explicitly retracts them), so the catalog itself doesn't go
empty on restart. What is **not** persisted anywhere by default is the provider's own *scan
state* — which files it has seen, their content hashes, and what they mapped to — so without
additional persistence, every restart forces a full re-glob and full re-parse of the entire
mono-repo (1000+ files) before the provider can even confirm nothing changed.

**Decision**: persist scan state — `filePath`, `mtimeMs`, `contentHash` (sha1 of file bytes),
`entityName`, `lastError` — as rows in a small table owned by this backend module, using
`coreServices.database` (the same pluggable database service Backstage's own catalog uses;
SQLite in the lab, Postgres in a real deployment — zero new infrastructure, consistent with
Principle V). On startup, the provider loads this cache and can validate it against the
filesystem far more cheaply than re-parsing everything: a `stat()` per known path compares
`mtimeMs` (and falls back to a content-hash check only when `mtimeMs` differs, since hashing
1000+ files is itself non-trivial I/O at 1GB scale) before deciding a file needs re-parsing.
Unchanged files contribute zero parse work to a restart. This directly answers "should scanner
results be persisted so restarts restore the catalog faster" — yes, but as internal scan-state
cache rows in the backend's own database, **not** as generated `catalog-info.yaml`-style files
written back into the mono-repo. Writing discovery output back into the source tree would (a)
reintroduce the hand-maintained-duplicate-file problem Lab 4 exists to eliminate, and (b) require
the discovery tool to have write access to a repo it should only need to read — a materially
larger and riskier permission footprint at real-world scale.

**Problem 3 — polling a 1GB tree every 30s doesn't scale as the primary discovery loop.** Even
with ignore patterns (R2) and streaming (R2), a full `fast-glob` walk of a very large tree still
costs real I/O, and running that walk every 30s regardless of whether anything changed is wasted
work at scale — the lab's 30s interval exists for interactive demo feedback on 2–3 files, not
because 30s is an appropriate steady-state cadence for 1000+ files.

**Decision**: at scale, discovery should run in **watch mode**: a `chokidar` watcher (rejected for
the lab default in R2, adopted here) observes `add`/`change`/`unlink` events under the same
ignore-pattern set, and each event triggers a targeted single-file re-parse + delta mutation
(update the scan-state cache row, emit one delta) rather than a full-tree rescan. The periodic
`fast-glob` sweep is retained but demoted to an infrequent **reconciliation safety net**
(independently configurable interval, e.g. minutes not seconds) that catches anything a watcher
event could plausibly miss (coalesced events under a large batch change such as a big `git pull`,
or watch reliability limits on some network/CI filesystems) — it is a correctness backstop, not
the primary discovery signal. Parsing is concurrency-limited (bounded worker count, default small)
so a large batch of simultaneous file-change events — e.g. after checking out a branch that
touches hundreds of spec files — doesn't spike memory or block the Node event loop.

**Config surface** (see data-model.md): `autoApiRegistration.mode: 'poll' | 'watch'` (lab default:
`poll`, no watcher, matching the simple demo story in quickstart.md); `ignore` (glob exclusions,
always applied regardless of mode); `reconciliation.frequencySeconds` (decoupled from watch-event
responsiveness); `parseConcurrency`. Switching a real deployment to scale is: set `mode: 'watch'`,
raise `reconciliation.frequencySeconds` from 30 to something like 900–1800, and rely on the
already-built delta-mutation + persisted-cache path — no architectural change.

**Alternatives considered**:
- Always persisting a `full` mutation every cycle regardless of scale — rejected: the cost model
  is wrong for 1000+ entities (see Problem 1); would work fine at lab scale but silently becomes a
  performance cliff at real-world scale, which is exactly the trap this section exists to avoid.
- Writing discovered metadata back into the mono-repo as generated catalog files, to "cache" scan
  results — rejected (see Problem 2 rationale): wrong persistence layer, reintroduces duplication,
  expands write-access footprint unnecessarily.
- Only a filesystem watcher, no periodic reconciliation sweep — rejected: watchers can miss events
  (coalescing, restart races, some CI/network filesystem limitations); a slow safety-net sweep is
  cheap insurance at any scale and is what makes watch mode trustworthy enough to recommend.
