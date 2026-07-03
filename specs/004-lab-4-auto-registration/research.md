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
as an adaptable convention (FR-010). Default value resolves via `resolvePackagePath('backend')`
(from `@backstage/backend-plugin-api`) rather than `process.cwd()` directly — `resolvePackagePath`
locates the `packages/backend` directory via Node module resolution of its own `package.json`
(`name: "backend"`), which is robust regardless of which working directory the backend process was
actually launched from, unlike a `process.cwd()`-relative assumption. From there, 4 `..` segments
(`packages/backend` → `packages` → `backstage` → `lab-01-base-backstage` → `labs`) reach `labs/`,
then into `lab-04-auto-registration/apis` — confirmed experimentally during implementation
(`packages/backend/src/extensions/autoApiRegistration.ts`'s `defaultRootPath()`).
(This is the single-source shorthand; R7 generalizes `rootPath` into a per-entry field of an
`autoApiRegistration.sources[]` list for organizations with more than one source repository.)

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

Recognized `x-*` metadata is read from a single vendor-namespaced object nested under the
top-level `info` object, for both OpenAPI and AsyncAPI (per the Clarifications session,
2026-07-03 update):
- `info.x-examplecorp.owner` → `spec.owner`
- `info.x-examplecorp.lifecycle` → `spec.lifecycle` (default: `experimental`, if absent)
- `info.x-examplecorp.visibility` → `metadata.annotations['example.com/visibility']` (default: that
  file's source's configured `defaultVisibility`, itself defaulting to `private` if the source
  doesn't set one — see rationale below and R7)

**Visibility is deliberately reused, not reinvented.** Lab 2/3 already established
`example.com/visibility: private | shared` as the annotation the permission policy
(`packages/backend/src/extensions/permissionPolicy.ts`) reads to decide access: `shared` bypasses
ownership entirely (visible to all authenticated users); anything else (including the annotation
being absent) falls through to the ownership-only rule. This lab adds a **third way to set that
same annotation** — sourced from `x-examplecorp.visibility` instead of hand-authored in
`catalog-info.yaml` — it does not add a new visibility concept, a new annotation key, or touch the
permission policy at all. The absent-field default is **per-source**, not a single hardcoded
value: each source in `autoApiRegistration.sources[]` may set its own `defaultVisibility`
(`private` or `shared`) for files that don't declare one — e.g. a pre-production repo where most
APIs are intentionally shared for cross-team testing might reasonably default to `shared`, while
the platform mono-repo keeps the conservative default. The "default default" — what a source gets
if it doesn't configure `defaultVisibility` at all — is `private`, mirroring the permission
policy's own existing fallback behavior when the annotation is missing entirely (Rule 3,
ownership-only), so a freshly-added source with no visibility configuration behaves identically to
a hand-authored entity with no visibility annotation. An `x-examplecorp.visibility` value that is
present but not `private` or `shared` is treated as malformed input (Edge Cases) — surfaced via
the same marker-entity + processor-error path as an invalid owner reference (R4), not silently
coerced to a default (source-level or otherwise), since silently defaulting a security-relevant
setting is exactly the kind of mistake that must stay visible.

`examplecorp` is this lab's fictional company namespace (documented as the one thing every
learner renames first, per FR-010/US3). The field names deliberately omit `backstage` — this
metadata (who owns an API, what lifecycle stage it's in) is meaningful to any consumer of the
spec, not just this tool, so the namespace names the company, not the tool.

Metadata with a natural home elsewhere in the spec is read from there instead, never duplicated
into `x-examplecorp`:
- `info.title` → `metadata.title` / entity name (already established, unchanged)
- `info.description` → `metadata.description` (already established, unchanged)
- top-level `tags[].name` → `metadata.tags` (default: `[]`, if the spec has no `tags` array) —
  **changed from the original `x-backstage-tags` design**: both OpenAPI and AsyncAPI already
  define a native top-level `tags` field for exactly this purpose, so sourcing tags from `x-*` as
  well would create two places that could drift apart. `tags[].name` (ignoring
  `tags[].description`, which has no catalog equivalent) is the source of truth.

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
`x-examplecorp.owner` value resolves to a known entity ref (defaulting kind to `group:default/` if
no kind prefix is given, consistent with how `teams.yaml` entities are referenced elsewhere in the
repo). Unresolvable owners produce the marker-entity + processor-error path above.

**Visibility validation**: `x-examplecorp.visibility`, if present, is checked against the fixed
set of values the existing permission policy understands (`private`, `shared`) — this is a static
enum check, not a catalog lookup, so it's cheap regardless of scale. An unrecognized value follows
the same marker-entity + processor-error path as an invalid owner reference. If absent, the value
comes from that file's source's `defaultVisibility` (falling back to `private` if the source
doesn't configure one) — see R3 for the full rationale and R7 for why this is per-source.

**Name collisions**: if two discovered files slugify to the same candidate entity name, the first
(sorted by file path for determinism) is registered normally; the second is emitted as a marker
entity (suffixed, e.g. `<slug>-collision`) carrying the registration-error annotation so the
conflict is independently visible without ever silently overwriting the first. Collision detection
is done against the persisted slug→path index described in R6, not by re-deriving and sorting the
full candidate list on every check — at 1000+ files, an O(N log N) sort per cycle (or per watch
event, in watch mode) is avoidable work; an index lookup is O(1). **This index and check are
global, across every configured source, not scoped to the source currently being processed** — see
R7 Problem 3 for why two different teams' repos colliding must not go undetected.

**Precedence with hand-authored `catalog-info.yaml`** (FR-011, Edge Case): before including a
candidate in its full mutation, the provider queries the catalog for an existing entity of the
same `kind: API` and `metadata.name` that did **not** originate from this provider (i.e. whose
`metadata.annotations['backstage.io/managed-by-origin-location']` differs from our provider's
entity source). If one exists, the auto-sourced candidate is skipped for that name — the
hand-authored entity wins, matching the documented Assumption. This check, like collision
detection, runs against catalog state as a whole and is unaffected by which source is being
processed — a hand-authored file anywhere wins over an auto-sourced candidate from any source.

## R5: New sample API for the "previously unregistered" discovery demo

**Decision**: Vendor a trimmed copy of the **Scalar Galaxy API** (MIT-licensed,
github.com/scalar/scalar, published build at
`https://cdn.jsdelivr.net/npm/@scalar/galaxy/dist/3.1.yaml`) as
`labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml`, with an `info.x-examplecorp`
object (`owner`, `lifecycle`, `visibility: shared` — chosen so the quickstart's SC-006 visibility
check has a real difference to demonstrate against the precedence-demo API below) added directly
in the vendored copy; its existing native `tags` array is used as-is for `metadata.tags`. The
upstream file is a single self-contained OpenAPI 3.1
document (confirmed: 1469 lines,
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

## R7: Multiple source repositories (platform mono-repo + team/pre-production repos)

The lab itself discovers files from one location. A real organization is unlikely to have every
API definition in the platform team's mono-repo — other teams, and pre-production/experimental
APIs, plausibly live in their own separate repositories, each wanting different discovery
settings (in particular, a different default owner — Problem 2 below). The mechanism must
generalize to N independently-configured sources without becoming N copies of the same code.

**Problem 1 — a single `rootPath` config key can't express "scan these several, separately
configured locations."** The R1–R6 design (and the lab's `autoApiRegistration.*` config) assumes
exactly one root and one set of settings.

**Decision**: restructure config around a list, `autoApiRegistration.sources: [...]`, where each
entry carries its own `id`, `rootPath`, `patterns`, `ignore`, `mode`, `schedule`/`reconciliation`,
`defaultOwner`, and `xNamespace` (data-model.md has the full per-source schema). At backend-module
init time, the module reads this list and instantiates **one `EntityProvider` instance per
source**, each with a distinct `getProviderName()` (`auto-api-registration:<source.id>`) — not one
provider trying to juggle multiple roots internally. This is the same pattern Backstage's own
multi-target providers use (e.g. a GitHub discovery provider configured against several
org/repo targets each becomes its own provider instance): each source gets its own independent
scheduling, its own independent full-then-delta mutation lifecycle (R6), and a config or scanning
problem in one source (e.g. an unreadable path for a team repo that hasn't been checked out yet)
cannot stall or break discovery for any other source. For backward/simple compatibility, a flat
`autoApiRegistration.rootPath`/`.patterns`/etc. (no `sources` list) is treated as shorthand for a
single implicit source named `default` — this is what the lab's own `app-config.yaml` uses, so
the single-repo lab config does not need to change shape.

**Problem 2 — some settings are legitimately per-repo, not global.** Called out explicitly:
`defaultOwner` (a pre-production or team repo plausibly has a different fallback team than the
platform mono-repo's `platform-team`); `defaultVisibility` (a pre-production repo might reasonably
default undeclared APIs to `shared` for cross-team testing, while the platform mono-repo keeps a
conservative `private` default — R3); and, less obviously, `xNamespace` — a team repo that already
has its own established `x-*` vendor-extension convention before onboarding to auto-registration
shouldn't be forced to rename it to match the platform mono-repo's convention just to participate.

**Decision**: `defaultOwner`, `defaultVisibility`, and `xNamespace` are per-source config keys —
see data-model.md's per-source schema. `defaultOwner` and `xNamespace` have no global fallback
(each source must set its own, or inherit an explicit `autoApiRegistration.defaults.*` block if
the learner wants shared values); `defaultVisibility` is the one exception with a genuine global
fallback (`private`, R3) precisely because leaving visibility completely unconfigured must still
be safe by default — a source shouldn't have to opt into a safe default, only opt out of it.
`patterns`, `ignore`, `mode`, and scheduling are also per-source for the same reason (a small
pre-production repo may reasonably use `mode: 'poll'` with a short interval while the platform
mono-repo runs `mode: 'watch'` at scale, per R6).

**Problem 3 — collision detection and `catalog-info.yaml` precedence (R4) must stay global, not
per-source.** Two different teams' repos can trivially produce the same slugified entity name
(e.g. two teams each shipping a `payments-api`). If collision/precedence checks were scoped to a
single source's own scan-state rows, cross-source collisions would go undetected and both
entities would silently coexist as long as neither the collision index nor the "does a
non-auto-sourced entity already exist" precedence check restricts by source. The scan-state cache
table already keyed `entity_name` for O(1) collision lookups (R6) — the fix is simply that this
index (and the query behind the `catalog-info.yaml` precedence check) is queried **across all
sources**, not scoped to the source currently being processed. The `source_id` column added to
the cache table (data-model.md) exists precisely so a collision error message can say *which two
repos* collided — important for SC-003-style debuggability once "which file" becomes "which file,
in which repo."

**Problem 4 — "other repos" may mean a genuinely separate Git remote, not a local sibling
directory.** The lab's own Assumptions section already anticipates a local sibling checkout ("a
local sibling repository the learner creates") for its own zero-network, zero-cost demo — that
covers the lab's own multi-source walkthrough (see quickstart.md). It does **not** cover a real
deployment where a team's repo is a separate remote the discovery backend has never had checked
out locally at all.

**Decision (documented extension point, not built or demonstrated by the lab)**: each source's
`rootPath` config key is designed to remain a plain local filesystem path — the discovery,
parsing, and mapping logic (R1–R6) is entirely decoupled from *how bytes arrive on local disk*.
A production deployment onboarding a genuinely remote repo adds a lightweight sync step ahead of
the existing glob/parse pipeline — e.g. a shallow `git clone`/`git pull` into a local cache
directory on each scheduled cycle (or triggered by the same watch/reconciliation cadence as R6) —
and points that source's `rootPath` at the resulting local worktree. Every other mechanism (glob
patterns, ignore rules, delta mutations, scan-state cache, collision/precedence checks) is reused
unchanged; only the sync step differs per source. This keeps the zero-cost constraint intact for
the lab (no sync step is needed or built when `rootPath` already points at a local sibling
directory) while giving a real multi-repo deployment a documented, non-invasive path to genuinely
separate remotes — noted in quickstart.md as a "beyond the lab" extension point, consistent with
how R6's watch-mode scale-up is documented rather than exercised.

**Alternatives considered**:
- One `EntityProvider` instance internally looping over multiple roots — rejected: conflates
  scheduling, failure isolation, and mutation lifecycle across unrelated sources; a parse error or
  slow filesystem in one team's repo could delay or corrupt discovery for every other source. Per
  Backstage's own `EntityProvider` contract, provider identity is meant to be 1:1 with "one
  coherent versioned view of a set of entities" — multiple sources are multiple such views.
- Making collision detection per-source (accept that two repos could produce the same name) —
  rejected: silently produces whichever entity happens to process last as the "winner" with no
  visible error, directly violating the Edge Cases requirement that name collisions must surface a
  visible conflict rather than being silently resolved.
- Building real Git-remote syncing (clone/pull) as part of this lab — rejected: requires network
  access and (for private repos) credentials, which conflicts with the lab's zero-network,
  zero-cost constraint (Constitution V); documented as an extension point instead (Problem 4).
