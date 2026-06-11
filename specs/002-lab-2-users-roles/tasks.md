---

description: "Task list for Lab 2 — Users, Roles, and API Visibility (two-tier model)"
---

# Tasks: Lab 2 — Users, Roles, and API Visibility

**Input**: Design documents from `/specs/002-lab-2-users-roles/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No automated tests — this is a tutorial lab. Verification is manual browser-based
testing per quickstart.md. Test tasks are not included.

**Organization**: Tasks are grouped by user story to enable independent authoring and
verification of each story's lab deliverables.

**Status key**:
- `[X]` = completed and still valid under the updated two-tier spec
- `[ ]` = new or requires updating for the two-tier API visibility model

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can be authored in parallel (different files, no dependency on each other)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in each description

## Path Conventions

Committed lab artifacts live under `labs/lab-02-users-roles/`. Changes to the student's
Backstage instance are documented as README instructions — they are not committed to this repo.

---

## Phase 1: Setup (Lab Directory Structure)

**Purpose**: Create the directory layout and skeleton files for the lab.

- [X] T001 Create lab directory structure: `labs/lab-02-users-roles/catalog/apis/` (already
  exists; no action required — train-travel-api.yaml will be added by T009)

---

## Phase 2: Foundational (README Skeleton)

**Purpose**: Create the `labs/lab-02-users-roles/README.md` skeleton with all required
section headings in the correct order. This unblocks all user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — all phases write
into sections of this README.

- [X] T002 README skeleton at `labs/lab-02-users-roles/README.md` already exists with all
  required sections. No structural changes to section headings are required for the two-tier
  update; all changes are content-only within existing sections.

**Checkpoint**: README skeleton exists — user story phases can now proceed.

---

## Phase 3: User Story 1 — Define Users and Teams in the Catalog (Priority: P1) 🎯 MVP

**Goal**: Provide the catalog YAML files and README instructions a developer needs to add
named users and teams to their Backstage catalog, so that all four users and all three groups
(museum-team, streetlights-team, platform-team) appear and are browsable.

**Independent Test**: Start Backstage, navigate to Catalog → Kind: Group → verify all three
groups appear with correct members. Navigate to Catalog → Kind: User → verify all four users.
(Quickstart.md Step 1.)

### Implementation for User Story 1

- [X] T003 [US1] Update `labs/lab-02-users-roles/catalog/teams.yaml` to add a third Group
  entity: `platform-team` per data-model.md. The platform-team has `spec.type: team`,
  `spec.profile.displayName: "Platform Team"`, `spec.children: []`, and `spec.members: []`
  (no members — it is a pure organisational unit). Include an explanatory comment explaining
  that platform-team has no individual members because it exists only as the ownership entity
  for shared platform APIs; visibility of those APIs is controlled by annotation, not by
  group membership. Keep the existing museum-team and streetlights-team entries unchanged.
- [X] T004 [P] [US1] `labs/lab-02-users-roles/catalog/users.yaml` already contains the four
  User entities with correct `memberOf` and display names. No changes required.
- [X] T005 [US1] Update README "Step 1: Define Users and Teams" section in
  `labs/lab-02-users-roles/README.md` (depends on T003): Update the section to mention
  `platform-team` and explain its role as a no-member organisational unit that owns shared
  platform APIs. Update the directory tree comment in the app-config.yaml snippet to note
  that `teams.yaml` now contains three groups. Update Step 1 Verification to check for
  `platform-team` in the catalog (step: click platform-team → verify no members listed →
  note this is expected).
- [X] T006 [US1] Update README "✅ Verification — Step 1" sub-section in
  `labs/lab-02-users-roles/README.md` to match quickstart.md Step 1: add step to verify
  `platform-team` appears in the catalog; add step to click `platform-team` and confirm it
  shows no members with an explanatory note that this is intentional. Update the ✅ Pass
  line to say "All four users and three groups visible with correct memberships."

**Checkpoint**: US1 deliverables complete — developer can add users/groups and verify them.

---

## Phase 4: User Story 2 — Associate APIs with Owning Teams (Priority: P2)

**Goal**: Provide updated API catalog descriptors with `spec.owner` set and an explicit
`example.com/visibility` annotation on every API (`shared` for the platform API, `private`
for both team APIs), plus README instructions to register all three APIs. Each API must show
its owning team and its visibility designation on its catalog page. Teams must list their APIs.

**Independent Test**: Navigate to each API's catalog page → verify Owner field AND
`example.com/visibility` annotation (private for museum/streetlights, shared for train-travel).
Navigate to each team's page → verify owned APIs are listed. (Quickstart.md Step 2.)

### Implementation for User Story 2

- [X] T007 [P] [US2] Update `labs/lab-02-users-roles/catalog/apis/museum-api.yaml`: added
  `metadata.annotations['example.com/visibility']: private`. The annotation is the single
  source of truth for both policy and display (FR-011). No visibility tag is used.
- [X] T008 [P] [US2] Update `labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml`:
  same as T007 — added `example.com/visibility: private` annotation only.
- [X] T009 [P] [US2] Create `labs/lab-02-users-roles/catalog/apis/train-travel-api.yaml` as
  the new shared platform API catalog descriptor per data-model.md (R-006). Set:
  - `metadata.name: train-travel-api`
  - `metadata.annotations['example.com/visibility']: shared`
  - `spec.owner: group:default/platform-team`
  - `spec.type: openapi`
  - `spec.lifecycle: production`
  - `spec.definition.$text`: GitHub raw URL pointing to the Train Travel API OpenAPI spec at
    https://github.com/bump-sh-examples/train-travel-api (verify the exact raw URL resolves
    to valid YAML before committing — use the `$text` / `type: url` pattern established in
    Lab 1, NOT `$text` inline embedding). Add a comment at the top explaining this is the
    shared platform API visible to all authenticated users via the `example.com/visibility: shared`
    annotation.
- [X] T010 [US2] Updated README "Step 2: Associate APIs with Owning Teams" in
  `labs/lab-02-users-roles/README.md`: visibility tiers table and directory listing updated
  to show annotation only (no tags); added explanation of why the annotation is the single
  source of truth for both policy and display; step 2a content retains full coverage of
  removing Lab 1 entries, adding Lab 2 entries, and the annotation-based approach.
- [X] T011 [US2] Updated README "✅ Verification — Step 2" to check Annotations section for
  visibility designation (not Tags). Updated guidance and ❌ Fail path accordingly.
- [X] T025 [US2] FR-011/SC-007 tag removal (spec refined 2026-06-11): removed `private` and
  `shared` tags from all three API catalog descriptors (`museum-api.yaml`,
  `streetlights-api.yaml`, `train-travel-api.yaml`). Updated plan.md, research.md R-006,
  data-model.md, quickstart.md, and README.md to remove all tag references and direct
  learners to the Annotations section for the visibility designation. The
  `example.com/visibility` annotation is now the single source of truth for both the
  permission policy and the displayed designation.

**Checkpoint**: US2 deliverables complete — APIs display ownership and shared/private distinction.

---

## Phase 4b: User Story 2 — API Visibility Frontend Module (FR-011 / SC-007 fix)

**Goal**: Add a custom "API Visibility" card to every API entity page so that the
`example.com/visibility` annotation is prominently displayed without requiring learners to
find the Backstage Annotations section (which is not rendered in the default Backstage
1.51.0 declarative frontend). The card reads the annotation directly from the entity object
via `useEntity()` — the same field the permission policy evaluates. No secondary copy.

**Context**: Run 3 confirmed that the annotation is not shown in the default Backstage UI
with the new declarative frontend (`createApp` + `catalogPlugin/alpha`). The fix uses
`EntityCardBlueprint` from `@backstage/plugin-catalog-react/alpha` to add a dedicated
visibility card. All required packages are already installed — no `npm install` needed.
See research.md R-007 and plan.md updated project structure for full details.

**Independent Test**: Navigate to any API's catalog page → verify an "API Visibility" card
appears showing either "Shared" or "Private" with a description. (Quickstart.md Step 2,
updated verification.)

### Implementation for Phase 4b

- [X] T026 [P] [US2] Create `packages/app/src/modules/apiVisibility/ApiVisibilityCard.tsx`
  in the student's Backstage instance. This is a React component that:
  - Imports `useEntity` from `@backstage/plugin-catalog-react`
  - Imports `InfoCard` from `@backstage/core-components`
  - Imports `Typography`, `Box`, `Chip` from `@material-ui/core`
  - Defines `VISIBILITY_ANNOTATION = 'example.com/visibility'`
  - Reads `entity.metadata.annotations?.[VISIBILITY_ANNOTATION]` via `useEntity()`
  - If absent: renders an InfoCard explaining the API is treated as private by default
  - If `shared`: renders InfoCard with a primary-coloured "Shared" Chip and explanation
  - If `private`: renders InfoCard with a default-coloured "Private" Chip and explanation
  - Full source in research.md R-007
- [X] T027 [P] [US2] Create `packages/app/src/modules/apiVisibility/index.ts`
  in the student's Backstage instance:
  - Imports `createFrontendModule` from `@backstage/frontend-plugin-api`
  - Imports `EntityCardBlueprint` from `@backstage/plugin-catalog-react/alpha`
  - Creates `apiVisibilityCard = EntityCardBlueprint.make({ name: 'api-visibility', params: { filter: 'kind:API', loader: async () => React.createElement(ApiVisibilityCard) } })`
  - Exports `apiVisibilityModule = createFrontendModule({ pluginId: 'catalog', extensions: [apiVisibilityCard] })`
  - Full source in research.md R-007
- [X] T028 [US2] Modify `packages/app/src/App.tsx` in the student's Backstage instance
  (depends on T026, T027 being created first):
  - Add import: `import { apiVisibilityModule } from './modules/apiVisibility'`
  - Add `apiVisibilityModule` to the `features` array in `createApp({ features: [...] })`
  - The updated App.tsx: `createApp({ features: [catalogPlugin, navModule, apiVisibilityModule] })`
- [X] T029 [US2] Add README "Step 2b — Add the API Visibility Card" sub-section in
  `labs/lab-02-users-roles/README.md` (after Step 2a, before Step 2b restart):
  - Explain WHY: the Backstage 1.51.0 new declarative frontend does not render custom
    annotations in the default entity page layout; a custom card is required to make
    the visibility designation visible (FR-011/SC-007)
  - Explain WHAT: the card reads the annotation directly from the entity object — same
    field as the permission policy, no secondary copy
  - Explain ADDITIONAL LEARNING: this also demonstrates Backstage's declarative frontend
    extension system (`EntityCardBlueprint`, `createFrontendModule`)
  - Provide the directory creation instruction and both source files verbatim
    (content from research.md R-007)
  - Provide the App.tsx modification instruction
  - Include an "Alpha imports" note explaining that `EntityCardBlueprint` is from
    the `/alpha` sub-path — stable enough for this Backstage version, may change in
    future major versions
  - Platform note: directory creation (`mkdir`) differs on Windows vs macOS — provide
    both: `mkdir -p packages/app/src/modules/apiVisibility` (macOS/Linux) and
    `New-Item -ItemType Directory -Path packages\app\src\modules\apiVisibility` (Windows PowerShell)
- [X] T030 [US2] Update README "✅ Verification — Step 2" in
  `labs/lab-02-users-roles/README.md`: change items 3–5 from checking the Annotations
  section to checking the API Visibility card:
  - Museum API: verify "API Visibility" card shows "Private"
  - Streetlights API: verify "API Visibility" card shows "Private"
  - Train Travel API: verify "API Visibility" card shows "Shared"
  - Update the ✅ Pass line to mention the card
  - Replace the "Where are the Annotations?" hint with "Where is the API Visibility card?"
    — explain it appears on the right side of the entity page as a card titled "API Visibility"
  - Add ❌ Fail path: if the card is not visible, verify that `apiVisibilityModule` was
    added to `App.tsx` and that Backstage was restarted
- [X] T031 [US2] Update README "Summary Checklist" in
  `labs/lab-02-users-roles/README.md`: change items 5–7 from annotation-in-Annotations
  references to API Visibility card references:
  - "Museum API shows museum-team as owner and API Visibility card showing **Private**"
  - "Streetlights API shows streetlights-team as owner and API Visibility card showing **Private**"
  - "Train Travel API shows platform-team as owner and API Visibility card showing **Shared**"
- [X] T032 [US2] Update `specs/002-lab-2-users-roles/checklists/issues.md`: mark the
  Run 3 open issue `- [ ]` as `- [x]` and add a resolution note: "Fixed (2026-06-11):
  EntityCardBlueprint module added — a custom 'API Visibility' card now appears on every
  API entity page, reading the example.com/visibility annotation directly from the entity
  object. Card visible without extra navigation (SC-007). No secondary copy (FR-011)."

**Checkpoint**: Phase 4b complete — API Visibility card visible on every API entity page;
Run 3 issue resolved; FR-011 and SC-007 fully satisfied.

---

## Phase 4c: User Story 2 — API Visibility Card Positioning Fix (Run 4)

**Goal**: Move the "API Visibility" card from the main content area (bottom of the page) to
the right-hand info column, immediately below the About card. Run 4 confirmed that the card
appears at the very bottom of the page because it was registered without a `type` parameter —
`DefaultEntityContentLayout` places cards with no type in the main content (left) column, while
cards with `type: 'info'` go in the right-hand sticky info column alongside About, Links, and
Labels cards.

**Root cause**: `EntityCardBlueprint.make()` in `index.ts` omits `type`. Without it, the card
defaults to `type: 'content'` and renders in the main content area, not the info panel.

**Fix**: Add `type: 'info'` to the `params` object in `EntityCardBlueprint.make()`. This
mirrors how the About card is configured (`type: 'info'` in `catalogAboutEntityCard`).

**Independent Test**: Navigate to any API's catalog page → verify the "API Visibility" card
appears in the right-hand info column, immediately below the About card (in the sticky sidebar).

### Implementation for Phase 4c

- [X] T033 [US2] Update `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiVisibility/index.ts`:
  add `type: 'info'` to the `params` object inside `EntityCardBlueprint.make()`. The updated
  `params` block must be:
  ```typescript
  params: {
    filter: 'kind:API',
    type: 'info',
    loader: async () => React.createElement(ApiVisibilityCard),
  },
  ```
  This places the card in the right-hand info column (same as About, Links, Labels cards)
  rather than the main content column.
- [X] T034 [US2] Update the `index.ts` code block inside the "Create `index.ts`" section of
  README Step 2b (`labs/lab-02-users-roles/README.md`): add `type: 'info'` to the
  `params` object shown in the code sample so it matches the actual file after T033.
- [X] T035 [US2] Update `specs/002-lab-2-users-roles/checklists/issues.md`: mark the Run 4
  open issue `- [ ]` as `- [x]` and add resolution note: "Fixed (2026-06-11): Added
  `type: 'info'` to `EntityCardBlueprint.make()` params — card now renders in the right-hand
  info column immediately below the About card, matching the README's 'right-hand side, below
  the About card' description."

**Checkpoint**: Phase 4c complete — API Visibility card appears in the right-hand info column;
card location matches the README description; Run 4 issue closed.

---

## Phase 5: User Story 3 — Sign In as a Specific User (Priority: P3)

**Goal**: Provide README instructions for configuring Backstage's guest auth provider with
a `userEntityRef`, including a Security Note section (Constitution Principle IX), so a
developer can sign in as a named catalog user and see their identity reflected in Backstage.

**Independent Test**: Configure `app-config.local.yaml` with `userEntityRef: user:default/alice`,
restart Backstage, sign in, verify profile shows "Alice Chen". (Quickstart.md Step 3.)

### Implementation for User Story 3

- [X] T012 [US3] README "Security Note" section in `labs/lab-02-users-roles/README.md` is
  complete and correct (Constitution Principle IX compliant). No changes required.
- [X] T013 [US3] README "Step 3: Configure Sign-In" section is complete and correct (R-003
  implementation, race-condition caveat documented, platform notes included). No changes
  required.
- [X] T014 [US3] README "✅ Verification — Step 3" sub-section is complete and correct.
  No changes required.

**Checkpoint**: US3 deliverables complete — developer can sign in as a named catalog user.

---

## Phase 6: User Story 4 — Demonstrate Two-Tier API Visibility (Priority: P4)

**Goal**: Provide the updated `permissionPolicy.ts` source code and README instructions for
replacing the allow-all policy with the two-tier `CatalogOwnershipPolicy`, so that:
- The Train Travel API (shared) is visible to all authenticated users
- Museum API (private) is visible only to museum-team members
- Streetlights API (private) is visible only to streetlights-team members
- User and Group catalog entries remain visible to all authenticated users

**Independent Test**: Sign in as Alice → verify train-travel-api and museum-api visible,
streetlights-api absent. Sign in as Charlie → verify train-travel-api and streetlights-api
visible, museum-api absent. Either user → all groups and users visible. (Quickstart.md
Steps 4–6.)

### Implementation for User Story 4

- [X] T015 [US4] Rewrite README "Step 4: Enable Ownership-Based Visibility" introductory
  section ("Why this step matters") in `labs/lab-02-users-roles/README.md`: update to
  explain the two-tier model instead of the single-tier model. Remove the existing "Note"
  block that says "ALL catalog entities become team-scoped" (this is no longer true).
  Replace with an explanation that the new policy uses `anyOf` logic with three conditions:
  (1) non-API entities are always allowed (so users and groups remain visible to all);
  (2) APIs annotated with `example.com/visibility: shared` are visible to all authenticated
  users; (3) all other APIs are visible only to members of the owning team via `isEntityOwner`.
  Explain that `anyOf` means an entity passes if ANY condition is true — not all of them.
- [X] T016 [P] [US4] Update README Step 4a "permissionPolicy.ts" code block in
  `labs/lab-02-users-roles/README.md`: Replace the existing TypeScript with the two-tier
  implementation from R-004. The new policy uses `createCatalogConditionalDecision` with
  `anyOf: [{ not: isEntityKind(['API']) }, hasAnnotation({annotation: 'example.com/visibility', value: 'shared'}), isEntityOwner({claims: ...})]`.
  Update the import sources table (no new packages — all symbols are already present in
  R-004 import table). Add inline code comments explaining each arm of the `anyOf` logic.
- [X] T017 [US4] Update README "✅ Verification — Steps 4 and 5" sub-section in
  `labs/lab-02-users-roles/README.md` to match quickstart.md Steps 4 and 5:
  Alice (museum-team): verify Train Travel API AND Museum API are visible; verify
  Streetlights API is absent. Charlie (streetlights-team): verify Train Travel API AND
  Streetlights API are visible; verify Museum API is absent. Update ✅ Pass lines to
  reflect the shared API always being present. Update ❌ Fail guidance to include checking
  for missing `example.com/visibility: shared` annotation if train-travel-api is not visible.
- [X] T018 [US4] Add README "✅ Verification — Step 6 (User and Group visibility)" sub-section
  in `labs/lab-02-users-roles/README.md` matching quickstart.md Step 6: while signed in as
  Charlie (or any user), navigate to Catalog → Kind: Group → verify all three groups appear;
  navigate to Catalog → Kind: User → verify all four users appear. Explain that this confirms
  the `not(isEntityKind(['API']))` arm of the permission policy is working correctly.
  Include ✅ Pass and ❌ Fail guidance pointing to the policy's first `anyOf` arm.
- [X] T019 [US4] Update README "Edge Cases" sub-section in
  `labs/lab-02-users-roles/README.md`: Keep the existing four edge cases (multi-team
  membership, broken entity references, sign-in before auth configured, unowned APIs). Update
  the "unowned API" edge case to clarify that under the two-tier policy, an unowned API
  with no `example.com/visibility: shared` annotation will be invisible to all users
  (isEntityOwner returns false for everyone). Add two new edge cases from spec.md:
  (1) shared API accidentally configured as private — explain how to verify the annotation
  is present and correctly spelled (addresses US4-AS5 partial coverage: documents that an
  anonymous/unauthenticated guest sees shared APIs but not private ones — rule 2 passes
  for shared APIs regardless of user identity); (2) non-API entity type visibility — explain
  that User, Group, and all other non-API kinds are always visible because the `not(isEntityKind)`
  arm passes for them, regardless of ownership.

**Checkpoint**: US4 deliverables complete — the lab's primary learning outcome (two-tier
visibility) is achievable and demonstrable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final review, cross-platform verification, and completion of shared README sections.

- [X] T020 Update README "Overview" section in `labs/lab-02-users-roles/README.md`: update the
  "What this lab teaches" bullet list to include: annotations as a visibility mechanism
  (`example.com/visibility: shared`), and the two-tier permission policy (`anyOf` logic with
  shared vs. private APIs). Update the "What you will have at the end" paragraph to describe
  three teams (including platform-team), three APIs (museum private, streetlights private,
  train-travel shared), and the two-tier visibility outcome (both users see train-travel-api
  plus their team's private API).
- [X] T021 [P] README "Prerequisites" section is complete and correct. No changes required.
- [X] T022 Updated README "Summary Checklist" in `labs/lab-02-users-roles/README.md`:
  items 5, 6, 7 now reference the `example.com/visibility` annotation in the Annotations
  section (updated as part of T025 — FR-011 tag removal).
- [X] T023 Add README "Troubleshooting" entry for shared API misconfiguration in
  `labs/lab-02-users-roles/README.md`: add a new sub-section
  "### Train Travel API not visible to all users" covering: (1) verify the
  `example.com/visibility: shared` annotation is present and correctly spelled in
  `train-travel-api.yaml`; (2) verify the annotation key uses `example.com/visibility`
  exactly (case-sensitive, dot in domain); (3) verify the catalog location for
  `train-travel-api.yaml` is registered in `app-config.yaml`; (4) verify Backstage was
  restarted after adding the annotation.
- [X] T024 Review full README against Constitution in `labs/lab-02-users-roles/README.md`:
  confirm Principle I (new features explicitly named: annotations, two-tier policy),
  Principle II (Step 4 explains WHY the `anyOf` policy structure matters — not just what
  it does), Principle VIII (outcome-based verification — tests confirm API visibility
  outcomes, not exact TypeScript implementation), Principle IX (Security Note still
  correctly describes the guest provider simplification and production alternatives).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 — T003 can start immediately; T005 and T006 depend on T003
- **US2 (Phase 4)**: Depends on Phase 2 — T007/T008/T009 can start immediately (different
  files, no dependencies on each other); T010 and T011 depend on T007, T008, and T009
- **US2 Frontend (Phase 4b)**: Depends on Phase 4 (APIs must be registered first so the
  card can be verified). T026 and T027 can run in parallel (different files). T028 depends
  on T026 and T027 (App.tsx imports both). T029 depends on T026/T027/T028 (README must show
  the final working code). T030 and T031 depend on T029. T032 depends on T030 (close issue
  after verification step is correct).
- **US3 (Phase 5)**: All tasks already complete; no work needed
- **US4 (Phase 6)**: Depends on US2 (APIs need owners and annotations) and US3 (auth must be
  configured). T015 can start immediately; T016 depends on T015 (needs the "why" written
  first to ensure code comments align); T017 and T018 depend on T016; T019 is independent
- **Polish (Phase 7)**: T020 depends on all US phases; T022 depends on quickstart.md (already
  updated); T023 and T024 depend on all US phases

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2
- **US2 (P2)**: Unblocked after Phase 2 — can run in parallel with US1
- **US3 (P3)**: Complete — no work required
- **US4 (P4)**: Depends on US2 (3 APIs with correct owners/annotations) and US3 (auth working)

### Within Each User Story

- YAML catalog files before README step instructions (T003 before T005/T006; T009 before T010/T011)
- Step 4 "why" explanation (T015) before policy TypeScript (T016) — code comments must align
  with the conceptual explanation
- Verification sections (T017, T018) written after the corresponding step instructions (T016)

### Parallel Opportunities

- T003 (teams.yaml), T007 (museum-api.yaml), T008 (streetlights-api.yaml), T009 (train-travel-api.yaml) — all different files, no dependencies on each other
- US1 tasks (Phase 3) and US2 tasks (Phase 4) — can proceed in parallel after Phase 2
- T016 (policy TypeScript) and T019 (edge cases) — different README sections, independent
- T021 (Prerequisites) is already complete — no work needed

---

## Parallel Example: US2 Catalog Files

```
# All four catalog file tasks have no dependency on each other — author in parallel:
T003: labs/lab-02-users-roles/catalog/teams.yaml                         (add platform-team)
T007: labs/lab-02-users-roles/catalog/apis/museum-api.yaml               (add private annotation)
T008: labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml         (add private annotation)
T009: labs/lab-02-users-roles/catalog/apis/train-travel-api.yaml         (new shared API)
```

## Parallel Example: Phase 4b Frontend Module

```
# T026 and T027 have no dependency on each other — different files:
T026: packages/app/src/modules/apiVisibility/ApiVisibilityCard.tsx  (React component)
T027: packages/app/src/modules/apiVisibility/index.ts                (module export)
# T028 depends on both T026 and T027 (imports both):
T028: packages/app/src/App.tsx                                        (add module to features)
```

## Parallel Example: US4 README Updates

```
# These two README sections have no dependency on each other:
T016: README Step 4a — permissionPolicy.ts code block (two-tier TypeScript)
T019: README Step 4 — Edge Cases (shared API, non-API entity visibility)
```

---

## Implementation Strategy

### Sequential Strategy

Work in phase order: Phase 1 → 2 → US1 → US2 → **US2 Frontend (Phase 4b)** → US3 → US4 → Polish.
T001–T025 are complete. Outstanding work is Phase 4b (T026–T032).

### Incremental Validation Gates

1. After T003 + T005 + T006: quickstart.md Step 1 passes (3 groups, 4 users)
2. After T007–T011 + **T026–T031**: quickstart.md Step 2 passes (3 APIs with correct
   ownership + "API Visibility" card visible on each API page)
3. After T016 + T017: quickstart.md Step 4 passes (Alice: 2 APIs visible, 1 absent)
4. After T017 + T018: quickstart.md Step 5 passes (Charlie: 2 APIs visible, 1 absent)
5. After T018: quickstart.md Step 6 passes (all users and groups visible to both)
6. After T032: Run 3 issue closed in issues.md

---

## Notes

- [P] tasks = different files, no dependency — these can be authored in parallel
- [Story] label maps each task to its user story for traceability
- No automated tests — verification is manual per quickstart.md
- YAML catalog files are committed; Backstage config changes are README instructions only
- All credential and email values in catalog YAML files must be obviously fictional
  (e.g., `alice@example.com`) per Constitution Principle IX
- Constitution Principle IX requires the Security Note section to appear in the README
  BEFORE the first insecure configuration step (Step 3) — do not reorder
- Cross-platform review (T024) is a required gate per Constitution; marking complete on
  macOS only is insufficient
- The `example.com/visibility` annotation key is fictional (example.com domain) — document
  this in the README so learners understand it is not a built-in Backstage annotation
- Phase 4b (T026–T032): `EntityCardBlueprint` is from `@backstage/plugin-catalog-react/alpha`
  — all packages already installed, no `npm install` needed; the card must NOT be tested
  without a running Backstage instance (no unit tests for tutorial content)
- Phase 4b: The card must be registered under `pluginId: 'catalog'` (not `'app'`) because
  `EntityCardBlueprint` is a catalog plugin extension point
- platform-team has no members by design — the README MUST explain this is intentional
  so learners don't think it is a configuration error
