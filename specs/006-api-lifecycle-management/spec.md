# Feature Specification: Lab 6 - API Lifecycle Management

**Feature Branch**: `006-api-lifecycle-management`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Create a new feature and specification using feature 6 from GOAL.md" — Lab 6 (API lifecycle management): Add multiple major versions of the same API into Backstage at the same time, to represent multiple versions running in production in parallel. Demonstrate how the multiple API versions would all be searchable and accessible, but the most recent version would be prominent and the only one offered to a new user looking for this type of API. Show how we would represent APIs progressing through the main lifecycle: development, test, production, including how these lifecycle states can vary across each API version. Show how we manage API retirement, including marking APIs for deprecation and then retiring them.

## Clarifications

### Session 2026-07-04

- Q: Which example API should demonstrate multiple major versions running in parallel? → A: Reuse the already-registered Museum API (Lab 1) and add a second, deliberately-breaking v2 spec authored for this lab — fully local, $0, and gives full control over what changes between versions so the lifecycle demo is clear.
- Q: How should a retired API version be handled once it reaches end-of-life? → A: It stays registered and viewable (e.g. via a direct link or an explicit "show all versions" view) but is excluded from default search/browse results, clearly labeled Retired — preserving a historical/audit trail rather than deleting it, consistent with how non-latest versions are already deprioritized rather than hidden.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and browse multiple major versions of the same API (Priority: P1)

As a learner, I want to register two major versions of the same API (v1 and v2 of the Museum API) into the catalog at the same time, so I can see how Backstage represents multiple parallel-running versions of a single logical API rather than treating a new version as replacing the old one.

**Why this priority**: This is the foundational capability the whole lab depends on — without both versions coexisting in the catalog, there is nothing to demonstrate prominence, lifecycle-per-version, or retirement against.

**Independent Test**: Register both `museum-api-v1` and `museum-api-v2` (the latter authored for this lab with deliberate breaking changes) as separate catalog entities that are visibly related to each other (e.g. grouped under the same logical API), and confirm both appear in the catalog at the same time without one overwriting or hiding the other.

**Acceptance Scenarios**:

1. **Given** the Museum API is already registered from Lab 1, **When** a learner adds a second major version (v2) with intentionally breaking changes (e.g. renamed/removed fields), **Then** both v1 and v2 appear as distinct, independently viewable catalog entries that are visibly presented as versions of the same logical API (not two unrelated APIs).
2. **Given** both versions are registered, **When** a learner searches the catalog for the Museum API, **Then** the search surfaces both versions as related results rather than only one, or two entirely disconnected entities.
3. **Given** a learner opens either version's page, **When** they look for how to view the other version, **Then** a clear, direct way to navigate between the API's versions is present on the page.

---

### User Story 2 - Discover the latest version by default, while older versions remain reachable (Priority: P1)

As a new learner who doesn't yet know the Museum API has multiple versions, I want my default search/browse experience to surface the latest version prominently, so I don't accidentally start integrating against an old version — while still being able to explicitly find and use an older version if I need to.

**Why this priority**: This directly demonstrates the lab's core teaching point (multiple versions coexist, but discovery defaults to latest) and is equally foundational to User Story 1; a catalog that only supports "coexistence" without a sensible default is only half the lesson.

**Independent Test**: As a learner with no prior context, search or browse for "Museum API" and confirm the latest version (v2) is what's presented/opened by default, then confirm a v1-specific search or an explicit "other versions" control on v2's page still surfaces v1.

**Acceptance Scenarios**:

1. **Given** both v1 and v2 are registered, **When** a learner performs a general catalog search for the Museum API without specifying a version, **Then** the latest version (v2) is the prominent/default result.
2. **Given** a learner is viewing the latest version's page, **When** they look for older versions, **Then** an explicit "other versions" list or control is visible on the page, and following it reaches v1.
3. **Given** a learner explicitly searches for or navigates to v1 (e.g. by name), **When** the search resolves, **Then** v1 remains fully accessible and viewable, not hidden or blocked just because it is not the latest.

---

### User Story 3 - Track lifecycle state independently per version (Priority: P2)

As a learner, I want each version of the Museum API to carry its own lifecycle state (development, testing/experimental, or production), so I can see that v1 might be in production while v2 is still in development or test, and understand that lifecycle is a property of a version, not of the API as a whole.

**Why this priority**: Builds directly on User Stories 1-2 by adding the "progressing through development/test/production" teaching point from the lab brief; it depends on both versions already existing and being independently viewable.

**Independent Test**: Set v1's lifecycle to "production" and v2's lifecycle to "development" (or "experimental"), then view both versions' pages and confirm each displays its own, independent lifecycle state and that this is visible without opening the underlying entity YAML.

**Acceptance Scenarios**:

1. **Given** v1 is marked production and v2 is marked development, **When** a learner views each version's page, **Then** each page clearly displays that version's own lifecycle state, and the two differ from each other.
2. **Given** a learner advances v2's lifecycle from development to testing and later to production, **When** they refresh v2's page after each change, **Then** the displayed lifecycle state updates to match, without requiring changes to v1's entry.
3. **Given** the displayed lifecycle badge, **When** a learner checks its source, **Then** it reflects the same underlying catalog metadata used by any policy or tooling that reads lifecycle (not a separate, potentially out-of-sync display copy), consistent with how Lab 2 already requires metadata displays to be authoritative.

---

### User Story 4 - Deprecate and then retire an API version (Priority: P2)

As a learner, I want to mark an older API version as deprecated and later as retired, so I can see the full end-of-life progression an API version goes through, and understand how retired versions remain discoverable for historical/audit purposes without cluttering default discovery.

**Why this priority**: Completes the lifecycle story established by User Story 3 by adding its terminal states; it is scoped separately because deprecation/retirement are distinct states from the earlier development/test/production progression and are more directly tied to the "old version being phased out" narrative.

**Independent Test**: Mark v1 as deprecated and confirm it is visibly flagged as such wherever it appears (search results, its own page, and any "other versions" list on v2's page); then mark v1 as retired and confirm it disappears from default search/browse results while remaining reachable via a direct link or an explicit "all versions" view, clearly labeled Retired.

**Acceptance Scenarios**:

1. **Given** v1 is marked deprecated, **When** a learner sees it in search results, in the "other versions" list on v2's page, or on its own page, **Then** it is clearly labeled as deprecated in all of those locations.
2. **Given** v1 is later marked retired, **When** a learner performs a default catalog search or browse for the Museum API, **Then** v1 no longer appears among the default results.
3. **Given** v1 is retired, **When** a learner follows a direct link to it, or opens an explicit "show all versions" / full-catalog view, **Then** v1 is still viewable and clearly labeled Retired, preserving a historical record rather than being deleted.
4. **Given** the deprecation-then-retirement progression, **When** a learner reads the lab documentation, **Then** it explains this as a two-step process (deprecated first, retired later) rather than an API disappearing without warning.

---

### Edge Cases

- What happens when a learner searches using the exact name of a retired version? It MUST still resolve and open that version's page (clearly labeled Retired), consistent with "kept in catalog, excluded from default results" rather than being unreachable.
- What happens if every version of an API is deprecated or retired at the same time (no current production version)? The lab documentation MUST describe this as a valid, if unusual, end state and show what a learner sees when browsing to that API in that case (e.g. the most recently deprecated/retired version shown, clearly labeled, rather than an empty or broken page).
- What happens when a learner tries to determine "which version is production" versus "which version is latest" and they differ (e.g. v2 still in development while v1 remains the only production version)? The UI MUST make it possible to tell these two concepts apart rather than conflating "latest" with "production-ready."
- How does the relationship between v1 and v2 remain visible even though they are different catalog entities (Backstage catalog entities require unique names)? The mechanism used to group/relate them MUST be visible on both versions' pages, not only inferable from a shared name prefix in configuration files.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support registering two or more major versions of the same logical API as separate, independently viewable catalog entities that exist in the catalog at the same time (neither replacing nor hiding the other).
- **FR-002**: The system MUST visibly present multiple versions of the same logical API as related to one another — on each version's own page and in relevant search/browse results — using a mechanism that does not depend on a learner recognizing a shared name prefix.
- **FR-003**: The system MUST make the most recent (latest) version prominent in default search/browse results for the API, while keeping older, non-retired versions fully reachable through an explicit action (e.g. an "other versions" list or a version-specific search).
- **FR-004**: The system MUST allow each version of an API to carry its own lifecycle state (at minimum: development, testing, production) independently of every other version of the same API, and display that state on the version's page using the same underlying metadata used by any policy/tooling that reads lifecycle (per the precedent set in Lab 2 for authoritative metadata display).
- **FR-005**: The system MUST allow a version's lifecycle state to be changed (e.g. development → testing → production) via catalog metadata, with the displayed state updating accordingly, without requiring changes to any other version's entry.
- **FR-006**: The system MUST support marking an API version as deprecated, with that status clearly and visibly flagged everywhere the version appears (its own page, general search results, and any "other versions" list).
- **FR-007**: The system MUST support marking a deprecated API version as retired as a distinct, later step — not the same action as deprecation — reflecting a two-stage end-of-life progression.
- **FR-008**: The system MUST exclude retired API versions from default catalog search/browse results, while keeping them reachable via a direct link or an explicit "show all versions"/full-catalog view, clearly labeled Retired.
- **FR-009**: The system MUST NOT delete or unregister a retired API version's catalog entity; retired versions remain a permanent, inspectable historical record within the catalog.
- **FR-010**: Lab documentation MUST demonstrate the versioning/lifecycle mechanism using two versions of the Museum API: v1 (already registered in Lab 1) unchanged, and a newly authored v2 containing deliberate breaking changes (e.g. renamed or removed fields/operations), so the difference between versions is concrete and easy to follow.
- **FR-011**: The lab MUST build upon the environment established by Labs 1-5 (base Backstage setup, users/roles/teams and visibility, API quality tooling, auto-registered API entities, mocking/testing) without requiring those labs to be redone.
- **FR-012**: This lab MUST NOT introduce a new visibility/permission mechanism; the ownership- and team-based visibility rules already established in Lab 2 continue to apply per version (e.g. each version keeps whatever owning-team/shared visibility the underlying API already had).
- **FR-013**: Lab documentation MUST identify which parts of the versioning/lifecycle/retirement mechanism (the specific grouping technique, lifecycle value names, retirement UI treatment) are conventions learners are expected to adapt to their own APIs and version-naming schemes, per Constitution Principle VIII.
- **FR-014**: The lab MUST run entirely on local, freely available Backstage catalog features and configuration, with $0 cost and no paid service dependency (Constitution Principle V).

### Key Entities

- **API Version Entity**: A single catalog entity representing one major version of a logical API (e.g. `museum-api-v1`, `museum-api-v2`). Carries its own OpenAPI spec, lifecycle state, and owner/visibility metadata, and is related to sibling versions of the same logical API.
- **Logical API Grouping**: The relationship that ties multiple API Version Entities together as versions of "the same API," surfaced on each version's page and in relevant search results, distinct from the catalog's per-entity uniqueness requirement.
- **Lifecycle State**: A per-version attribute (development, testing, production, deprecated, retired) recorded in catalog metadata and read by both the displayed UI badge and any policy/tooling that inspects it, so the two never diverge.
- **Retirement Record**: The persisted, non-deleted state of a retired API version — still present in the catalog, excluded from default discovery, reachable via direct link or an explicit all-versions view, and clearly labeled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can find both the Museum API's v1 and v2 registered in the catalog at the same time, and confirm from each version's page that it is presented as related to the other.
- **SC-002**: A learner performing a general, version-unaware search for the Museum API is shown the latest version (v2) as the prominent/default result, and can reach v1 within one additional click/action.
- **SC-003**: A learner can look at v1 and v2 side by side and correctly state each version's independent lifecycle state (e.g. "v1 is production, v2 is development") using only what's displayed in Backstage.
- **SC-004**: A learner can change a version's lifecycle state and see the displayed badge reflect the change without needing to inspect raw catalog YAML.
- **SC-005**: A learner can mark a version deprecated and observe the deprecated label everywhere that version appears, then mark it retired and observe it disappear from default search/browse results while remaining reachable via a direct link, within a single guided walkthrough.
- **SC-006**: Zero catalog entities are deleted as part of demonstrating retirement — the retired version's entity is still present and inspectable at the end of the lab.

## Assumptions

- "Multiple major versions running in parallel" is interpreted as multiple, separately-registered catalog entities for the same logical API (one per major version), each with its own OpenAPI spec — not multiple deployments of one identical spec.
- The Museum API is reused as the lab's worked example: v1 is the entity already registered in Lab 1, and v2 is a new spec authored for this lab containing deliberate breaking changes, so learners can see a concrete, understandable difference between versions. Learners adapting this lab to their own APIs are expected to substitute their own real version history.
- Backstage's catalog requires each entity to have a unique name, so per-version entities (e.g. `museum-api-v1`, `museum-api-v2`) are the mechanism for representing "multiple versions," related to each other via catalog-native relations/metadata (the specific technique — e.g. a shared `system`, a `partOf`/`dependsOn` relation, or a version annotation read by a custom grouping view — is a design decision made in the implementation plan, not this specification).
- "Lifecycle" states map onto Backstage's existing native `spec.lifecycle` field on API entities where possible (which already supports values like `experimental`, `production`, `deprecated`), extended with a documented convention for any state that field doesn't natively cover (e.g. a distinct "test" state or a "retired" state beyond `deprecated`); the exact mapping is an implementation-plan decision.
- "Retired" is treated as a further, distinct state beyond `deprecated` (not a synonym for it): a retired version's entity is never deleted, remains inspectable via direct link or an explicit all-versions/full-catalog view, and is excluded only from default search/browse prominence — consistent with how non-latest (but not deprecated/retired) versions are already deprioritized rather than hidden.
- This lab does not introduce a new visibility/permission model; the owning-team/shared visibility rules from Lab 2 continue to apply to each version entity independently, and API-quality tooling from Lab 3 continues to apply per version without change.
- No production traffic or real backend is required for v2's deliberately-breaking spec; as with other example APIs in this repository, its `servers` entry may be fictitious, since the lab's focus is catalog/lifecycle representation, not running a second live backend.
