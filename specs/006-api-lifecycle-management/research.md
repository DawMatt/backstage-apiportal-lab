# Research: Lab 6 — API Lifecycle Management

## R1: Mechanism for grouping multiple versions of "the same" API

**Decision**: Use Backstage's native `System` entity kind (already allowed by `catalog.rules` in
`app-config.yaml`, unused until now) as the logical-API grouping mechanism. Set `spec.system` on
every version's `API` entity to point at one `System` per logical API (e.g.
`system:default/museum-api`).

**Rationale**: `spec.system` is a first-class, already-indexed Backstage relation — no new backend
code, plugin, or catalog processor is needed to establish "these entities are versions of the same
API." The System's own page also gets a "Has part" APIs list for free. This is the most
scale-friendly option: adding a new logical API at real scale (500+ APIs) is one more spec file
declaring its `apiBasename` (R1a), not a code or architecture change (Constitution Principle VIII).

**Alternatives considered**:
- A bespoke annotation (e.g. `apiportal.io/api-family: museum-api`) queried directly, skipping
  `System` entirely. Rejected: reinvents a relation Backstage already models natively, and forfeits
  the free System page/breadcrumb UI, for no benefit — the annotation approach still requires a
  custom card to render anything.
- A `dependsOn`/`partOf` relation directly between the two `API` entities (no `System`). Rejected:
  `System` is the semantically correct native entity for "one logical thing with multiple version
  entities," and scales better as more versions are added (each new API version just adds one
  `spec.system` line, rather than needing an ever-growing web of pairwise relations).

## R1a: Creating the System without a hand-authored catalog file

**Decision**: Extend Lab 4's `autoApiRegistration.ts` `EntityProvider` (additive, backward-
compatible change — existing Lab 4 specs with no `apiBasename` are unaffected) to read a new
`x-<namespace>.apiBasename` field from each spec's `info` block, the same way it already reads
`owner`/`lifecycle`/`visibility`. The slugified value becomes `spec.system` on the generated `API`
entity, and the provider synthesizes exactly one `System` entity per distinct slug it observes
across a source's files — deduplicated every cycle from the scan-state cache, not re-derived from
scratch each time.

**Rationale**: Lab 4 exists specifically so API metadata is declared once, at the source, instead
of hand-maintained in a parallel catalog file. Requiring a hand-authored `system.yaml` per logical
API would reintroduce exactly the duplicate-file problem Lab 4 eliminates for `API` entities, just
one level up. Since `apiBasename` is metadata the API producer already knows (same team that
declares `owner`), extending the existing extraction mechanism is more consistent than inventing a
second, System-specific configuration surface.

**Alternatives considered**: A hand-authored `system.yaml` per logical API (this lab's original
design) — rejected once auto-registration was extended to cover both `API` versions, since it
would leave exactly one catalog YAML file as the sole exception to an otherwise fully
auto-registered lab. A dedicated "system discovery" backend module, separate from
`autoApiRegistration.ts` — rejected as unnecessary duplication; the file-glob/x-* extraction
mechanism is identical, only the target entity kind differs.

## R2: Identifying and displaying the "latest" version

**Decision**: Read each version's `info.version` (a field every OpenAPI/AsyncAPI spec already has)
directly, rather than adding any new annotation. "Latest" is *computed*, not manually flagged: the
new frontend card (R4) fetches all `API` entities sharing the current entity's `spec.system`,
parses each sibling's `info.version` out of its (already placeholder-resolved) `spec.definition`
string, and highlights whichever non-retired version has the highest value.

**Rationale**: An earlier design added a parallel `apiportal.io/version` annotation duplicating
`info.version` — the same fact, typed twice, with nothing keeping the two in sync if one is bumped
and not the other. Reading `info.version` directly has exactly one source of truth and costs
nothing extra: `spec.definition` is already fetched for every sibling by the Versions card's
existing `catalogApi.getEntities()` call, and Backstage's own placeholder processor has already
resolved any `$text` reference into a plain string by the time the catalog serves it. A
manually-maintained `apiportal.io/latest: "true"` flag was also considered and rejected
separately, for the same drift risk: two entities could both claim "latest," or none could.

**Alternatives considered**: The original `apiportal.io/version` annotation approach — rejected for
duplicating spec data with no sync guarantee (see above). A manual `is-latest` boolean annotation —
rejected for the drift risk described above. Semantic-version libraries for full semver comparison
— rejected as overkill; major.minor.patch numeric comparison is sufficient for this lab's
two-version demo.

## R3: Representing lifecycle state (development/test/production/deprecated/retired)

**Decision**: Reuse Backstage's native `spec.lifecycle` field on `API` entities — it is a free-form
string already rendered as a chip on the entity's built-in "About" card, with zero new code. The
*value* comes from each spec's own `info.x-<namespace>.lifecycle` field, extracted by Lab 4's
existing `autoApiRegistration.ts` mechanism (the same one already used for `owner`/`visibility`)
and copied onto `spec.lifecycle` when the entity is built. Adopt a documented convention of five
values across this lab: `development`, `testing`, `production`, `deprecated`, `retired` (the last
two are additionally read by the new Versions card to decide default visibility — see R5).

**Rationale**: `spec.lifecycle` is not a closed enum in Backstage — any string is accepted and
displayed — so no schema change or new field is needed. An earlier design hand-authored
`spec.lifecycle` directly in a catalog-info.yaml, silently overriding whatever `x-<namespace>.
lifecycle` the spec itself declared — two sources of truth for the same fact, with the
hand-authored one always winning invisibly. Reading it from the spec's own extension field instead
keeps lifecycle a one-line **spec** edit (not a catalog-file edit) picked up through Lab 4's
existing poll/watch cycle — no git push required, since `autoApiRegistration.ts` reads local files
directly.

**Alternatives considered**: A custom annotation (e.g. `apiportal.io/lifecycle-state`) instead of
the native field — rejected because it would duplicate a field Backstage already renders natively.
A hand-authored `spec.lifecycle` override in a catalog-info.yaml (this lab's original design) —
rejected once lifecycle was recognized as already-extracted metadata Lab 4's mechanism handles;
overriding it in a separate file just reintroduces a second, silently-winning source of truth for
the same fact, contrary to Lab 2's established precedent that displayed metadata must be the same
data used elsewhere, not a copy.

## R4: Surfacing versions, latest, and retirement state on the API page

**Decision**: Add one new frontend module, `apiVersions` (`packages/app/src/modules/apiVersions/`),
following the exact `EntityCardBlueprint` pattern already used by Lab 2's `apiVisibility` and Lab
3's `apiGrade` (`filter: 'kind:API'`, `type: 'info'`). Its `ApiVersionsCard.tsx`:
- Reads the current entity's `spec.system`.
- Calls `catalogApi.getEntities()` (via `useApi(catalogApiRef)`, already used elsewhere in the
  Backstage frontend) filtered to `kind: API` entities with that same `spec.system`.
- Sorts by `info.version`, parsed out of each sibling's `spec.definition` (R2), flags the highest
  non-retired one "Latest".
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

## R6: Where v1/v2 spec data lives; superseding Lab 2's single entity

**Decision**: Lab 6 supersedes Lab 2's single `museum-api` catalog entity with two versioned,
**auto-registered** entities, `museum-api-v1` and `museum-api-v2` (entity names are slugified from
each spec's `info.title`, "Museum API v1"/"Museum API v2" — distinguishable titles are required
since Lab 4's provider names entities from the title, not the filename). Both live under
`labs/lab-06-api-lifecycle-management/apis/`, discovered by a second `autoApiRegistration` source
(R1a) rather than any catalog-info.yaml. `app-config.yaml`'s `catalog.locations` list has Lab 2's
single `museum-api.yaml` location entry removed, with no replacement entries added (auto-
registration needs no `catalog.locations` entry at all). `apis/museum-v1/museum-v1-openapi.yaml`
is a **content-identical local copy** of Lab 1's OpenAPI file — a local copy, not a `$text`
reference, because Lab 4's file-glob provider only reads local files, and Lab 1's already-
committed spec file is never edited. `apis/museum-v2/museum-v2-openapi.yaml` is a new spec file
containing deliberate, documented breaking changes against v1 (e.g. renaming the `eventId` path
parameter to `id`, and renaming the QR-code ticket endpoint), with `info.version: 2.0.0`.

**Rationale**: The lab brief explicitly asks for "multiple major versions of the same API," which
requires the old single, unversioned entity name to be retired in favor of two clearly-versioned
ones — a real breaking/superseding change to the environment, which the constitution's Development
Workflow section explicitly permits ("Breaking changes to a lab's environment MUST be reflected in
all subsequent labs"). Keeping v1's OpenAPI content unchanged (aside from the required `x-examplecorp`
block and title) keeps the "difference between versions" concrete and entirely attributable to the
new v2 file, rather than muddying what changed.

**Alternatives considered**: Leaving the original `museum-api` entity name in place as "v1" (no
rename). Rejected: it would leave one version unversioned in name while its sibling is `-v2`,
undermining the "these are parallel, equally-versioned entities" lesson. Keeping `museum-api-v1`
as a hand-authored catalog-info.yaml pointing at Lab 1's spec via `$text` (this lab's original
design) — rejected once both versions were brought under Lab 4's auto-registration mechanism, since
it would leave exactly one hand-authored catalog file in an otherwise fully auto-registered lab.

## R7: Deprecation → retirement is a metadata edit, not a new action/button

**Decision**: All lifecycle transitions (`development` → `testing` → `production`, and
`deprecated` → `retired`) are demonstrated as one-line edits to a version's spec file's own
`info.x-examplecorp.lifecycle` value (R3), picked up through Lab 4's existing file-glob poll/watch
mechanism rather than a catalog location refresh — since the spec files live on local disk, no
commit/push is required, unlike Labs 2–5's `type: url` catalog entries. No new "deprecate"/"retire"
UI action or backend mutation endpoint is introduced.

**Rationale**: Consistent with this repository's existing pattern (every catalog metadata change
so far — ownership, visibility, lifecycle — is a declarative-file edit, not an in-app mutation),
and keeps the lab's new surface area limited to one read-only frontend card (R4) plus the
`autoApiRegistration.ts` extension (R1a), with no new backend module of its own.

**Alternatives considered**: A button/action in the Versions card that calls a new backend endpoint
to mutate lifecycle state directly. Rejected: real production lifecycle changes to committed API
descriptors are typically PR-reviewed changes to source, not one-click in-app actions; introducing
a bespoke mutation endpoint would also require new backend permissions work out of proportion to
the lesson.

## R8: Scale check (Constitution Principle VIII)

**Decision**: The chosen mechanism (`System` entity + `spec.system` relation, both auto-derived
from each spec's own `x-examplecorp.apiBasename` + `info.version`, plus one read-only frontend card
whose catalog query is filtered to the current entity's own `spec.system`) has no scaling ceiling:
adding another logical API's version family at real scale (500+ APIs) is exactly N more spec files
declaring the same `apiBasename` — a config-only change (new spec files, not new catalog YAML or
code), no code or architecture change. The Versions card's `catalogApi.getEntities()` call is
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
