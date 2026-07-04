# Research: Lab 6 — API Lifecycle Management

## R1: Mechanism for grouping multiple versions of "the same" API

**Decision**: Use Backstage's native `System` entity kind (already allowed by `catalog.rules` in
`app-config.yaml`, unused until now) as the logical-API grouping mechanism. Create one `System`
per logical API (e.g. `system:default/museum-api`), and set `spec.system` on every version's `API`
entity to point at it.

**Rationale**: `spec.system` is a first-class, already-indexed Backstage relation — no new backend
code, plugin, or catalog processor is needed to establish "these entities are versions of the same
API." The System's own page also gets a "Has part" APIs list for free. This is the most
scale-friendly option: adding a new logical API at real scale (500+ APIs) is one more `System` YAML
file, not a code or architecture change (Constitution Principle VIII).

**Alternatives considered**:
- A bespoke annotation (e.g. `apiportal.io/api-family: museum-api`) queried directly, skipping
  `System` entirely. Rejected: reinvents a relation Backstage already models natively, and forfeits
  the free System page/breadcrumb UI, for no benefit — the annotation approach still requires a
  custom card to render anything.
- A `dependsOn`/`partOf` relation directly between the two `API` entities (no `System`). Rejected:
  `System` is the semantically correct native entity for "one logical thing with multiple version
  entities," and scales better as more versions are added (each new API version just adds one
  `spec.system` line, rather than needing an ever-growing web of pairwise relations).

## R2: Identifying and displaying the "latest" version

**Decision**: Add an annotation, `apiportal.io/version: "<major>.<minor>"` (e.g. `"1.0"`, `"2.0"`),
to every version's `API` entity. "Latest" is *computed*, not manually flagged: the new frontend
card (R4) fetches all `API` entities sharing the current entity's `spec.system`, parses each one's
`apiportal.io/version` annotation, and highlights whichever non-retired version has the highest
value.

**Rationale**: A manually-maintained `apiportal.io/latest: "true"` flag could drift (two entities
both marked latest, or none) — computing it from a single, unambiguous version number is simpler to
keep correct and is the more honest lesson (derive facts from data, don't hand-maintain a flag that
duplicates it).

**Alternatives considered**: A manual `is-latest` boolean annotation — rejected for the drift risk
above. Semantic-version libraries for full semver comparison — rejected as overkill; major.minor
string comparison via numeric parsing is sufficient for this lab's two-version demo and documented
as adaptable for real semver strings.

## R3: Representing lifecycle state (development/test/production/deprecated/retired)

**Decision**: Reuse Backstage's native `spec.lifecycle` field on `API` entities — it is a free-form
string already rendered as a chip on the entity's built-in "About" card, with zero new code. Adopt
a documented convention of five values across this lab: `development`, `testing`, `production`,
`deprecated`, `retired` (the last two are additionally read by the new Versions card to decide
default visibility — see R5).

**Rationale**: `spec.lifecycle` is not a closed enum in Backstage — any string is accepted and
displayed — so no schema change or new field is needed. This keeps the entire lifecycle mechanism a
one-line YAML edit per version, consistent with a GitOps mental model, and requires no new backend
code.

**Alternatives considered**: A custom annotation (e.g. `apiportal.io/lifecycle-state`) instead of
the native field — rejected because it would duplicate a field Backstage already renders natively,
and per Lab 2's established precedent (Principle-driven requirement that displayed metadata must be
the same data used elsewhere, not a copy), reusing the real `spec.lifecycle` field is the correct
choice, not a parallel copy.

## R4: Surfacing versions, latest, and retirement state on the API page

**Decision**: Add one new frontend module, `apiVersions` (`packages/app/src/modules/apiVersions/`),
following the exact `EntityCardBlueprint` pattern already used by Lab 2's `apiVisibility` and Lab
3's `apiGrade` (`filter: 'kind:API'`, `type: 'info'`). Its `ApiVersionsCard.tsx`:
- Reads the current entity's `spec.system`.
- Calls `catalogApi.getEntities()` (via `useApi(catalogApiRef)`, already used elsewhere in the
  Backstage frontend) filtered to `kind: API` entities with that same `spec.system`.
- Sorts by the `apiportal.io/version` annotation (R2), flags the highest non-retired one "Latest".
- Renders each sibling's version, lifecycle chip (reusing `spec.lifecycle`, R3), and a link
  (`EntityRefLink`) to its own page.
- Versions whose `spec.lifecycle` is `retired` are collapsed by default behind a "Show retired
  versions (N)" toggle (local component state, no persistence needed) — satisfying "excluded from
  default view, reachable via one additional action" (FR-008) without hiding them from the catalog
  itself.

**Rationale**: This exactly mirrors two already-shipped, review-approved patterns in this
repository (`apiVisibility`, `apiGrade`) — same blueprint, same "info card reading `useEntity`/
`catalogApi`" shape — so it needs no new integration pattern, only new lab-specific logic.

**Alternatives considered**: A dedicated custom entity page tab instead of an info card. Rejected:
an info card is less code, matches the two nearest precedents in this repo, and the acceptance
scenarios only require "a clear way to navigate between versions," not a dedicated tab.

## R5: Whether Backstage's own search/browse must be modified to hide retired versions

**Decision**: Do not modify Backstage's built-in full-text search plugin or the default catalog
table. A raw catalog-wide text search may still technically return a retired version's entity
(clearly labeled `Retired` on its own page when opened). The Versions card (R4) — reachable from
any version's page or its System page — is the "default" discovery surface this lab teaches and
verifies against, and it is where latest-prominence and retired-collapsing (FR-003, FR-008) are
actually implemented.

**Rationale**: Building a custom search collator/indexer or catalog-table filter to suppress
retired entities catalog-wide is a much larger change (new backend search extension) for a
questionable end: a "findable via deliberate raw search, but never promoted by the guided browsing
UI" split is a defensible design even at real scale — auditors/compliance search benefits from
finding *everything* registered, while day-to-day discovery benefits from the curated view. This is
recorded here as a deliberate design boundary, not an unaddressed simplification, per Constitution
Principle VIII's requirement to flag anything that doesn't generalize — this one does generalize
(the same card mechanism is exactly as effective at 500+ APIs as at 2).

**Alternatives considered**: A custom search collator that excludes `retired` entities. Rejected as
disproportionate new backend surface area for a teaching lab, and it would actually work against a
legitimate real-world need (being able to find a retired API's historical record via search).

## R6: Where v1/v2 catalog data and the new v2 spec live; superseding Lab 2's single entity

**Decision**: Lab 6 supersedes Lab 2's single `museum-api` catalog entity with two versioned
entities, `museum-api-v1` and `museum-api-v2`, plus one new `System`, all newly authored under
`labs/lab-06-api-lifecycle-management/catalog/`. `app-config.yaml`'s `catalog.locations` list has
Lab 2's single `museum-api.yaml` location entry replaced with three new entries (System, v1, v2).
`museum-api-v1` points its `spec.definition.$text` at the exact same, unmodified Lab 1 OpenAPI file
(`labs/lab-01-base-backstage/apis/museum/openapi.yaml`) — no existing committed spec file is edited.
`museum-api-v2` is a new spec file, `labs/lab-06-api-lifecycle-management/apis/museum-v2/openapi.yaml`,
containing deliberate, documented breaking changes against v1 (e.g. renaming the `eventId` path
parameter to `id`, and removing/renaming the QR-code ticket endpoint), with `info.version: 2.0.0`.

**Rationale**: The lab brief explicitly asks for "multiple major versions of the same API," which
requires the old single, unversioned entity name to be retired in favor of two clearly-versioned
ones — a real breaking/superseding change to the environment, which the constitution's Development
Workflow section explicitly permits ("Breaking changes to a lab's environment MUST be reflected in
all subsequent labs"). Reusing v1's OpenAPI file unchanged keeps the "difference between versions"
concrete and entirely attributable to the new v2 file, rather than muddying what changed.

**Alternatives considered**: Leaving the original `museum-api` entity name in place as "v1" (no
rename). Rejected: it would leave one version unversioned in name while its sibling is `-v2`,
undermining the "these are parallel, equally-versioned entities" lesson and complicating the
Versions card's version-parsing logic for no benefit.

## R7: Deprecation → retirement is a metadata edit, not a new action/button

**Decision**: All lifecycle transitions (`development` → `testing` → `production`, and
`deprecated` → `retired`) are demonstrated as one-line edits to a version's committed
`spec.lifecycle` value, picked up through the catalog's existing location-polling mechanism — the
same GitOps-style flow already used for every other catalog metadata change in this repository.
No new "deprecate"/"retire" UI action or backend mutation endpoint is introduced.

**Rationale**: Consistent with this repository's existing pattern (every catalog metadata change
so far — ownership, visibility, lifecycle — is a YAML edit, not an in-app mutation), and keeps the
lab's new surface area limited to one read-only frontend card (R4) plus catalog config, with no new
backend module at all.

**Alternatives considered**: A button/action in the Versions card that calls a new backend endpoint
to mutate lifecycle state directly. Rejected: real production lifecycle changes to committed API
descriptors are typically PR-reviewed changes to source, not one-click in-app actions; introducing
a bespoke mutation endpoint would also require new backend permissions work out of proportion to
the lesson.

## R8: Scale check (Constitution Principle VIII)

**Decision**: The chosen mechanism (`System` entity + `spec.system` relation + `apiportal.io/version`
annotation + one read-only frontend card whose catalog query is filtered to the current entity's own
`spec.system`) has no scaling ceiling: adding another logical API's version family at real scale
(500+ APIs) is exactly one more `System` YAML file plus N more `API` YAML files — a config-only
change, no code or architecture change. The Versions card's `catalogApi.getEntities()` call is
filtered server-side to one `spec.system` value, so its cost is proportional to the number of
sibling versions of the one API being viewed (typically single digits), not to total catalog size.

**Rationale**: Matches the pattern this constitution principle already codifies from Lab 4's
`autoApiRegistration` design — the demo only exercises two versions of one API, but the underlying
mechanism (relation + filtered query) is identical in shape and cost regardless of how many other
Systems/APIs exist elsewhere in the catalog.

## R9: Security (Constitution Principle IX)

**Decision**: No new credentials, secrets, or auth configuration are introduced by this lab. The
per-version owner/visibility model established in Lab 2 (`example.com/visibility` annotation +
`isEntityOwner` permission policy) is inherited unchanged and applies independently to each version
entity. No new "Security Note" section is required in the README (that obligation applies only to
labs introducing credential/auth configuration, first triggered by Lab 5).

**Rationale**: This lab is purely catalog-relation and metadata work; it introduces no new attack
surface.
