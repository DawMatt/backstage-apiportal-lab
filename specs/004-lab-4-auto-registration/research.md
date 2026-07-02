# Phase 0 Research: Lab 4 — Auto Registration

## R1: Discovery mechanism

**Decision**: A custom Backstage **EntityProvider** (not a `CatalogProcessor`), registered as a
backend module via `catalogProcessingExtensionPoint.addEntityProvider(...)`, following the same
`createBackendModule` pattern already used for the permission policy
(`labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/permissionPolicy.ts`).

**Rationale**: An `EntityProvider` owns a full, versioned mutation of "the set of entities this
provider currently knows about." On each scheduled run it can emit a `type: 'full'` mutation
containing exactly the API entities currently discoverable — anything omitted from that mutation
is automatically retracted by the catalog. This gives create (FR-002), update (FR-003), and
removal-on-delete (FR-004) for free from one code path, with no separate cleanup logic needed.
A `CatalogProcessor` only transforms entities that already exist via some `Location`; it cannot
originate new entities from an arbitrary filesystem scan on its own.

**Alternatives considered**:
- GitHub discovery processor (`catalog-backend-module-github`) — rejected: requires a real GitHub
  App/token and a reachable remote repo, violating the zero-cost/no-external-network assumption
  already recorded in the spec (Assumptions: mono-repo is simulated locally).
- `type: file` catalog locations with glob targets pointing at `catalog-info.yaml` — rejected:
  this still requires a hand-authored `catalog-info.yaml` per API, which is precisely what Lab 4
  must eliminate (FR-001).

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

**Alternatives considered**:
- `chokidar` file-watcher for real-time push updates — rejected: adds a persistent watch process
  and cross-platform edge cases (network drives, WSL) for marginal benefit over a 30s poll in a
  local tutorial; the spec's Assumptions already state discovery is a "periodic/on-demand" cycle,
  not real-time push.

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
conflict is independently visible without ever silently overwriting the first.

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
