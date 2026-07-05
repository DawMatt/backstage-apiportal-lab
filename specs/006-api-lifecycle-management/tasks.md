---

description: "Task list for Lab 6 — API Lifecycle Management"
---

# Tasks: Lab 6 — API Lifecycle Management

**Input**: Design documents from `/specs/006-api-lifecycle-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this lab produces no external API contracts)

**Tests**: Not requested. Per plan.md's Testing section, verification is manual (browser, per quickstart.md's steps) — consistent with Labs 1–5. No automated test tasks are generated; quickstart validation is folded into each story's checkpoint and the final Polish phase.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2/P2) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

## Path Conventions

This is a tutorial-lab project (not a generic web/mobile app). Three path roots are used:

- **Backstage instance** (modified in place, from Lab 1): `labs/lab-01-base-backstage/backstage/`
- **Lab 6 teaching content** (new, committed alongside README): `labs/lab-06-api-lifecycle-management/`
- **Speckit artifacts**: `specs/006-api-lifecycle-management/` (this directory — no code changes here)

**Note**: This lab supersedes Lab 2's single `museum-api` catalog entry with two versioned entities
(`museum-api-v1`, `museum-api-v2`) grouped under one new `System` entity — an explicitly-permitted
"breaking change to the environment" (research.md R6, plan.md Principle VI gate).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the directories every later task writes into. No new dependencies are needed (research.md — zero new frontend/root packages).

- [X] T001 Create the lab content directories `labs/lab-06-api-lifecycle-management/catalog/apis/museum-v2/` and `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/`

**Checkpoint**: Directories exist — ready for foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the catalog data (System + both versioned API entities, including the new v2 spec) and the module-registration point every user story extends. No user story is independently testable until this phase is done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create the `System` entity `system:default/museum-api` in `labs/lab-06-api-lifecycle-management/catalog/system.yaml` (owner: `group:default/museum-team`, per data-model.md)
- [X] T003 [P] Create `museum-api-v1.yaml` in `labs/lab-06-api-lifecycle-management/catalog/apis/`: `metadata.name: museum-api-v1`, `annotations['apiportal.io/version']: "1.0"`, `example.com/visibility: private` (unchanged from Lab 2), `spec.lifecycle: production`, `spec.system: museum-api`, `spec.definition.$text` pointing at Lab 1's existing, unmodified `labs/lab-01-base-backstage/apis/museum/openapi.yaml` raw URL (research.md R6, data-model.md)
- [X] T004 [P] Author `museum-v2/openapi.yaml` in `labs/lab-06-api-lifecycle-management/catalog/apis/museum-v2/`: a deliberately-breaking variant of the Museum API — rename the `eventId` path parameter to `id` across the `/special-events/{eventId}` family of operations, and remove or rename the `/tickets/{ticketId}/qr` endpoint — with `info.version: 2.0.0` (research.md R6)
- [X] T005 Create `museum-api-v2.yaml` in `labs/lab-06-api-lifecycle-management/catalog/apis/`: `metadata.name: museum-api-v2`, `annotations['apiportal.io/version']: "2.0"`, `example.com/visibility: private`, `spec.lifecycle: development`, `spec.system: museum-api`, `spec.definition.$text` pointing at T004's new spec file's raw URL (depends on T004)
- [X] T006 Update `labs/lab-01-base-backstage/backstage/app-config.yaml`'s `catalog.locations`: remove Lab 2's single `museum-api.yaml` location entry, add three new `type: url` entries for `system.yaml`, `museum-api-v1.yaml`, and `museum-api-v2.yaml` (research.md R6, depends on T002, T003, T005)
- [X] T007 Scaffold the `apiVersions` frontend module as an `EntityCardBlueprint` (`filter: 'kind:API'`, `type: 'info'`) rendering a placeholder `ApiVersionsCard` that shows only the current entity's own name and `apiportal.io/version` annotation — no sibling lookup yet — in `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/{index.ts,ApiVersionsCard.tsx}` (research.md R4, same `EntityCardBlueprint` pattern as Lab 2's `apiVisibility`/Lab 3's `apiGrade`)
- [X] T008 Copy the scaffolded module to `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiVersions/` and register `apiVersionsModule` in `labs/lab-01-base-backstage/backstage/packages/app/src/App.tsx`'s `features` array (depends on T007)

**Checkpoint**: Both API versions and their System are registered and related; the card scaffold renders without error — ready for US1.

---

## Phase 3: User Story 1 - Register and browse multiple major versions of the same API (Priority: P1) 🎯 MVP

**Goal**: A learner sees `museum-api-v1` and `museum-api-v2` coexisting in the catalog, visibly presented as versions of the same logical API, with a clear way to navigate between them.

**Independent Test**: Register both versions, confirm both appear in the catalog at the same time, and confirm each version's page shows a working link to the other.

### Implementation for User Story 1

- [X] T009 [US1] Implement sibling-lookup logic in `ApiVersionsCard.tsx`: read the current entity's `spec.system`, call `catalogApi.getEntities()` (via `useApi(catalogApiRef)`) filtered to `kind: API` entities sharing that `spec.system`, and render each sibling's name/version as a row linking to its own page via `EntityRefLink` — in `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (data-model.md, research.md R1/R4, depends on T007)
- [X] T010 [US1] Copy the updated card into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (depends on T009, T008)
- [X] T011 [US1] Manually verify (quickstart.md steps 4–5): the catalog shows `museum-api-v1`, `museum-api-v2`, and the `museum-api` System as separate entities existing at the same time; the System page lists both as "Has part" APIs; the Versions card on either version's page lists both, and following a link reaches the other (SC-001, depends on T006, T010)

**Checkpoint**: User Story 1 fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Discover the latest version by default, while older versions remain reachable (Priority: P1)

**Goal**: The Versions card flags the latest version prominently while keeping older versions one click away.

**Independent Test**: View the card on either version's page and confirm v2 is flagged Latest; follow the card's link from v2 to v1 and confirm v1 is fully accessible; confirm searching for v1 by name still resolves it directly.

### Implementation for User Story 2

- [X] T012 [US2] Add "Latest" computation to `ApiVersionsCard.tsx`: parse each sibling's `apiportal.io/version` annotation as a `[major, minor]` pair, compare numerically among siblings whose `spec.lifecycle !== 'retired'` (falling back to comparing all siblings if every one is retired, per spec.md's edge case), and render a "Latest" badge on the highest — in `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (research.md R2, depends on T009)
- [X] T013 [US2] Copy the updated card into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (depends on T012, T010)
- [X] T014 [US2] Manually verify (quickstart.md step 5): v2 is flagged Latest in the card on both v1 and v2's pages; v1 is reachable from v2's card within one click; navigating directly to `museum-api-v1` by name still resolves and opens its page (SC-002, depends on T013)

**Checkpoint**: User Stories 1 AND 2 both work independently — versions coexist, are related, and the latest is prominent.

---

## Phase 5: User Story 3 - Track lifecycle state independently per version (Priority: P2)

**Goal**: Each version displays and can independently progress through its own lifecycle state, both on its own page and in the Versions card.

**Independent Test**: Confirm v1 shows `production` and v2 shows `development` independently; advance v2 through `testing` then `production` and confirm only v2's displayed state changes.

### Implementation for User Story 3

- [X] T015 [US3] Add a lifecycle chip to each sibling row in `ApiVersionsCard.tsx`, reusing each entity's existing `spec.lifecycle` value (no new field) — in `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (research.md R3, depends on T012)
- [X] T016 [US3] Copy the updated card into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (depends on T015, T013)
- [X] T017 [US3] Manually verify (quickstart.md step 5): v1's own About card and its row in the Versions card both show `production`; v2's both show `development`; the two differ (SC-003, depends on T016)
- [X] T018 [US3] Edit `museum-api-v2.yaml`'s `spec.lifecycle` from `development` to `testing`, then to `production` (two sequential edits); after each, refresh and confirm the displayed chip (own page and Versions card) updates to match, and that v1's entry is unaffected (SC-004, quickstart.md step 6, depends on T017)

**Checkpoint**: All three user stories independently functional — versions coexist, latest is prominent, and lifecycle is tracked per version.

---

## Phase 6: User Story 4 - Deprecate and then retire an API version (Priority: P2)

**Goal**: An older version can be marked deprecated (visibly flagged everywhere) and later retired (collapsed from the default Versions view, but never deleted).

**Independent Test**: Mark v1 deprecated and confirm the label appears everywhere it's shown; mark v1 retired and confirm it collapses behind a "Show retired versions" toggle while remaining reachable via direct link.

### Implementation for User Story 4

- [X] T019 [US4] Add retired-version collapsing to `ApiVersionsCard.tsx`: siblings with `spec.lifecycle === 'retired'` are grouped behind a closed-by-default "Show retired versions (N)" toggle (local component state), each still rendering its Deprecated/Retired lifecycle chip and working link when expanded — in `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (research.md R4/R5, depends on T015)
- [X] T020 [US4] Copy the updated card into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` (depends on T019, T016)
- [X] T021 [US4] Edit `museum-api-v1.yaml`'s `spec.lifecycle` to `deprecated`; confirm the Deprecated label appears on v1's own page and in the Versions card on both v1 and v2's pages (quickstart.md step 7, depends on T020)
- [X] T022 [US4] Edit `museum-api-v1.yaml`'s `spec.lifecycle` to `retired`; confirm v1 now only appears in the Versions card behind the "Show retired versions" toggle (collapsed by default) on both pages, while a direct link to `museum-api-v1` still opens it, clearly labeled Retired; confirm the entity itself is still present in the catalog — never deleted (SC-005, SC-006, quickstart.md steps 8–9, depends on T021)

**Checkpoint**: All four user stories independently functional — this is the full lab.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Learner-facing documentation and final repo-wide consistency checks that span multiple stories.

- [X] T023 Write `labs/lab-06-api-lifecycle-management/README.md` Overview/Prerequisites/Steps sections (Constitution Principle II) covering: add the System/v1/v2 catalog entries and v2 spec, update `app-config.yaml` locations, scaffold/register the `apiVersions` module, start Backstage, and walk through latest-prominence, lifecycle-progression, and deprecate-then-retire verification — following quickstart.md steps 1–9, and linking to the committed `labs/lab-06-api-lifecycle-management/catalog/apis/museum-v2/openapi.yaml` and `code/packages/app/src/modules/apiVersions/ApiVersionsCard.tsx` rather than inlining them (both exceed the ~40–50 line threshold) (depends on T011, T014, T018, T022)
- [X] T024 Add the README's "Why a System entity, not a custom annotation" and "Why latest is computed, not hand-flagged" sections (research.md R1, R2)
- [X] T025 [P] Add the README's "Why Backstage's native search/catalog table is left unmodified" section (research.md R5) — framed as a documented design boundary, not a gap, per Constitution Principle VIII
- [X] T026 [P] Add the README's "Adaptable conventions vs. fixed mechanics" section (FR-013): the `apiportal.io/version` format, the five-value lifecycle convention, and the "one System per logical API" pattern are adaptable; the `System`/`spec.system` relation and the `EntityCardBlueprint` mechanism itself are fixed
- [X] T027 Add the README's Verification and Troubleshooting sections (Lab Structure Standards) covering the manual checks already performed in T011/T014/T017/T018/T021/T022, plus common failure modes (forgetting to remove Lab 2's old `museum-api.yaml` catalog location, a `spec.system` typo silently producing an empty Versions card)
- [X] T028 Update root `README.md` (Lab Series table entry, Getting Started tree, Repository Structure tree) to reference `labs/lab-06-api-lifecycle-management/` and `specs/006-api-lifecycle-management/`, per the Constitution's Lab Structure Standards — required for this lab to be considered complete
- [X] T029 [P] Re-verify the Constitution Check table in plan.md against the final implementation (all 9 principles, with particular attention to Principle VI's "breaking change to the environment" justification and Principle VIII's scale claims) and correct plan.md if any gate's justification no longer matches what was built
- [X] T030 Run the full quickstart.md validation sequence (steps 1–9) end-to-end against a clean `yarn start` of `labs/lab-01-base-backstage/backstage/` to confirm the lab works from a cold start, not just incrementally during development

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion — no dependency on US2/US3/US4
- **User Story 2 (Phase 4)**: Depends on Foundational completion; extends the same file US1 built (T009), so in practice follows US1 sequentially even though it introduces no new *architectural* dependency
- **User Story 3 (Phase 5)**: Depends on Foundational completion; extends the file US1/US2 built (T012) — follows US2 sequentially for the same reason
- **User Story 4 (Phase 6)**: Depends on Foundational completion; extends the file US1/US2/US3 built (T015) — follows US3 sequentially
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P1)**: Can start after Foundational, but shares `ApiVersionsCard.tsx` with US1 (same file, sequential edits) — implement after US1 for a working MVP checkpoint first
- **User Story 3 (P2)**: Can start after Foundational, but shares the same file with US1/US2 — implement after US2
- **User Story 4 (P2)**: Can start after Foundational, but shares the same file with US1/US2/US3 — implement after US3

### Within Each User Story

- Card logic change before the copy-into-Backstage-instance task
- Catalog YAML edit(s) (where applicable) before manual verification
- Manual verification task last in each phase (checkpoint gate)

### Parallel Opportunities

- T002, T003, T004 (Foundational: System entity, v1 descriptor, v2 spec file) can run in parallel — different files, no dependency between them
- T024/T025/T026 (Polish README sections) in parallel with each other
- T029 (Polish) in parallel with T025/T026

---

## Parallel Example: Foundational Catalog Data

```bash
Task: "Create the System entity in labs/lab-06-api-lifecycle-management/catalog/system.yaml"
Task: "Create museum-api-v1.yaml in labs/lab-06-api-lifecycle-management/catalog/apis/"
Task: "Author museum-v2/openapi.yaml with deliberate breaking changes"
```

## Parallel Example: Polish README Sections

```bash
Task: "Add 'Why native search is left unmodified' section"
Task: "Add 'Adaptable conventions vs. fixed mechanics' section"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: T011 confirms both versions coexist, are visibly related, and are mutually navigable
5. Demo: two major versions of the Museum API, registered and linked, with no version overwriting the other

### Incremental Delivery

1. Setup + Foundational → catalog data (System, v1, v2) and card scaffold ready
2. Add User Story 1 → validate independently (T011) → MVP demo
3. Add User Story 2 → validate independently (T014) → latest-prominence confirmed
4. Add User Story 3 → validate independently (T017/T018) → per-version lifecycle confirmed
5. Add User Story 4 → validate independently (T021/T022) → deprecate-then-retire confirmed
6. Polish → README (including the design-boundary worked example), root README update, cold-start validation, constitution re-check

### Notes

- US1 through US4 all extend one shared file (`ApiVersionsCard.tsx`) because each story adds a
  layer to the same component — a deliberate incremental design (mirroring Lab 5's US1/US3 sharing
  `apiMocking/index.tsx`), not an accidental cross-story coupling. Each story still has an
  independently verifiable acceptance test even though the code lands in the same file.
- No test tasks are included (Tests: Not requested — see header). Verification is manual, per
  quickstart.md, folded into each story's final task(s).
- Lab 2's single `museum-api` catalog entry is superseded (not edited in place) by
  `museum-api-v1`/`museum-api-v2` — an explicitly-permitted "breaking change to the environment"
  (research.md R6, plan.md Principle VI gate) — so no task edits Lab 2's own committed catalog file;
  T006 only changes `app-config.yaml`'s location list.
