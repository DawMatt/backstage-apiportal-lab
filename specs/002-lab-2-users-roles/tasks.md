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
  `metadata.annotations['example.com/visibility']: private` AND `metadata.tags: [private]`.
  Tags are the primary UI mechanism (prominently shown in About card); annotation retained
  for display completeness. YAML comments explain the dual purpose.
- [X] T008 [P] [US2] Update `labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml`:
  same as T007 — added `example.com/visibility: private` annotation and `private` tag.
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
  `labs/lab-02-users-roles/README.md`: visibility tiers table updated (all APIs now show
  annotation + tag); added explanation of why ALL APIs carry an explicit visibility
  annotation AND tag; directory listing updated to show both annotation and tag for each
  API file; step 2a content retains full coverage of removing Lab 1 entries, adding Lab 2
  entries, and the annotation-based approach.
- [X] T011 [US2] Updated README "✅ Verification — Step 2" to check Tags (not Annotations
  section) for visibility designation — tags are prominently shown in Backstage's About
  card and catalog list. Added guidance on where tags appear and a ❌ Fail path for tags
  not visible. Resolves the open issue filed in Run 2.

**Checkpoint**: US2 deliverables complete — APIs display ownership and shared/private distinction.

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
  is present and correctly spelled; (2) non-API entity type visibility — explain that
  User, Group, and all other non-API kinds are always visible because the `not(isEntityKind)`
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
  items 5, 6, 7 now reference **tags** (`private`/`shared`) rather than annotations,
  matching both the updated quickstart.md and the resolution of the Run 2 open issue.
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

## Parallel Example: US4 README Updates

```
# These two README sections have no dependency on each other:
T016: README Step 4a — permissionPolicy.ts code block (two-tier TypeScript)
T019: README Step 4 — Edge Cases (shared API, non-API entity visibility)
```

---

## Implementation Strategy

### Minimum Change Set (US4 only — if US1/US2 artifacts are re-verified)

If catalog files and auth are already working correctly from the prior implementation:

1. Complete T003 (add platform-team to teams.yaml)
2. Complete T007 and T008 (add `example.com/visibility: private` to museum and streetlights APIs)
3. Complete T009 (create train-travel-api.yaml)
4. Complete T010 and T011 (update Step 2 README for 3 APIs + shared/private annotation on all)
5. Complete T015 and T016 (rewrite Step 4 policy explanation and TypeScript)
6. Complete T017, T018, T019 (update and extend verifications and edge cases)
7. **VALIDATE**: quickstart.md Steps 4–6 pass for both Alice and Charlie
8. Complete Polish phase (T020, T022, T023, T024)

### Full Sequential Strategy

Work in phase order: Phase 1 → 2 (already done) → US1 → US2 → US3 (already done) → US4 → Polish.
Each story produces independently testable lab content before moving to the next.

### Incremental Validation Gates

1. After T003 + T005 + T006: quickstart.md Step 1 passes (3 groups, 4 users)
2. After T007 + T008 + T009 + T010 + T011: quickstart.md Step 2 passes (3 APIs, correct
   ownership + visibility annotation visible on each API page)
3. After T016 + T017: quickstart.md Step 4 passes (Alice: 2 APIs visible, 1 absent)
4. After T017 + T018: quickstart.md Step 5 passes (Charlie: 2 APIs visible, 1 absent)
5. After T018: quickstart.md Step 6 passes (all users and groups visible to both)

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
- platform-team has no members by design — the README MUST explain this is intentional
  so learners don't think it is a configuration error
