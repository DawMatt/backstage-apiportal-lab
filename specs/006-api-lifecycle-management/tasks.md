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

This is a tutorial-lab project (not a generic web/mobile app). Four path roots are used:

- **Backstage instance** (modified in place, from Lab 1; gitignored, not committed): `labs/lab-01-base-backstage/backstage/`
- **Lab 4 shared backend module** (additively extended, not owned by this lab): `labs/lab-04-auto-registration/code/packages/backend/`
- **Lab 6 teaching content** (new, committed alongside README): `labs/lab-06-api-lifecycle-management/`
- **Speckit artifacts**: `specs/006-api-lifecycle-management/` (this directory — no code changes here)

**Note**: This lab supersedes Lab 2's single `museum-api` catalog entry with two versioned, **auto-registered**
entities (`museum-api-v1`, `museum-api-v2`) — an explicitly-permitted "breaking change to the environment"
(research.md R6, plan.md Principle VI gate). Unlike the original design, **zero catalog YAML** is
authored anywhere in this lab: both API entities and the `System` that groups them are produced by
an additive extension to Lab 4's existing `autoApiRegistration.ts` provider (research.md R1a).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the directories every later task writes into. No new dependencies are needed
(`js-yaml` is already a `packages/app` dependency as of Lab 5's `apiMocking` module).

- [X] T001 Create the lab content directories `labs/lab-06-api-lifecycle-management/apis/museum-v1/`,
      `labs/lab-06-api-lifecycle-management/apis/museum-v2/`, and
      `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/`

**Checkpoint**: Directories exist — foundational work can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Give Lab 4's `autoApiRegistration.ts` the one capability it doesn't already have
(`apiBasename` → `spec.system` + synthesized `System` entities), and add both Museum API spec
files it will discover. Every user story depends on this phase — none of them can be demonstrated
without both API versions existing and being groupable.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create migration `002_add_system_slug.ts` in
      `labs/lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistrationMigrations/`:
      a nullable `system_slug` column on the scan-state cache table (research.md R1a)
- [X] T003 Wire the new migration into `ScanStateCache.create()`'s `migrationSource` map (keyed
      alongside `001_scan_state_cache`) in
      `labs/lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistration.ts`
      (depends on T002)
- [X] T004 Add `system_slug: string | null` to the `CacheRow` interface and `systemSlug?: string`
      to `MappingResult` in `autoApiRegistration.ts` (depends on T003)
- [X] T005 In `mapCandidate()` (`autoApiRegistration.ts`), extract `x-<namespace>.apiBasename` via
      the existing `xField()` helper, slugify it with the existing `slugify()` helper, and pass it
      through to `buildEntity()` as `spec.system` on successful (non-error) mappings only
      (depends on T004)
- [X] T006 Add `buildSystemEntity()` to `autoApiRegistration.ts` and, in `runCycle()`, recompute the
      full set of currently-implied `System` slugs each cycle from the scan-state cache (not just
      files that changed this cycle) and include one synthesized `System` `DeferredEntity` per
      distinct slug in both the first-run `full` mutation and any triggered `delta` mutation
      (research.md R1a, depends on T005)
- [X] T006a Fix `buildSystemEntity()` in `autoApiRegistration.ts` to set
      `backstage.io/managed-by-location` / `backstage.io/managed-by-origin-location` annotations
      (a synthetic `synthetic:<providerName>` value) on every synthesized `System` entity — without
      them, catalog processing treats the entity as a location-less orphan and deletes it a cycle
      or two after each restart (found during Step 4 verification; research.md R1a "Gotcha";
      resolves checklists/issues.md Run 1, depends on T006)
- [X] T007 [P] Fix `normalizeConfig()`'s `rootPath` resolution in `autoApiRegistration.ts` so a
      user-supplied relative `rootPath` resolves against `packages/backend`'s own directory (the
      same anchor `defaultRootPath()` already uses), not the process's `cwd` — required for a
      second, independently-rooted source to behave predictably regardless of where `yarn start`
      is invoked from
- [X] T008 [P] Create `labs/lab-06-api-lifecycle-management/apis/museum-v1/museum-v1-openapi.yaml`:
      a content-identical local copy of Lab 1's `museum/openapi.yaml` (Lab 1's own committed file
      is never edited), titled `"Museum API v1"` (distinguishable from v2's title, since
      `autoApiRegistration.ts` names entities from a slug of `info.title`), with an
      `info.x-examplecorp` block (`owner: group:default/museum-team`, `visibility: private`,
      `lifecycle: production`, `apiBasename: museum-api`) (research.md R6, data-model.md)
- [X] T009 [P] Create `labs/lab-06-api-lifecycle-management/apis/museum-v2/museum-v2-openapi.yaml`:
      a deliberately-breaking variant of the Museum API — rename the `eventId` path parameter to
      `id` across the `/special-events/{eventId}` family of operations, and rename
      `/tickets/{ticketId}/qr` to `/tickets/{ticketId}/qr-code` — titled `"Museum API v2"`,
      `info.version: 2.0.0`, with an `info.x-examplecorp` block (`lifecycle: development`,
      `apiBasename: museum-api`, same owner/visibility as v1) (research.md R6)
- [X] T010 Update `labs/lab-01-base-backstage/backstage/app-config.yaml`: convert
      `autoApiRegistration` from Lab 4's single-source shorthand to the explicit `sources:` array
      form, add a second source (`id: lab6-museum-api`, `rootPath` pointing at this lab's `apis/`
      directory, `defaultOwner: group:default/museum-team`, `xNamespace: examplecorp` — shared with
      the `default` source, since the namespace identifies the organization, not the tool reading
      it); remove Lab 2's single `museum-api.yaml` `catalog.locations` entry with no replacement
      entries added (depends on T007, T008, T009)
- [X] T011 [P] Scaffold the `apiVersions` frontend module as an `EntityCardBlueprint`
      (`filter: 'kind:API'`, `type: 'info'`) rendering a placeholder `ApiVersionsCard` in
      `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/{index.ts,ApiVersionsCard.tsx}`
      (research.md R4, same `EntityCardBlueprint` pattern as Lab 2's `apiVisibility`/Lab 3's
      `apiGrade`)

**Checkpoint**: Restarting Backstage now auto-registers `museum-api-v1` and `museum-api-v2` with no
catalog-info.yaml, and synthesizes a `museum-api` `System` entity with no `system.yaml` — the
foundation every user story below builds on.

---

## Phase 3: User Story 1 - Register and browse multiple major versions of the same API (Priority: P1) 🎯 MVP

**Goal**: Both Museum API versions exist in the catalog at the same time, visibly related to one
another via the `System` grouping, with a way to navigate between them.

**Independent Test**: Confirm `museum-api-v1` and `museum-api-v2` both appear as separate catalog
entities at the same time, grouped under the same `museum-api` System, with neither hiding the
other.

### Implementation for User Story 1

- [X] T012 [US1] Implement `useApiSiblings()` in
      `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/versionUtils.ts`:
      read the current entity's `spec.system` and call `catalogApi.getEntities()` filtered to
      `kind: API` entities sharing it
- [X] T013 [US1] Implement sibling rendering in `ApiVersionsCard.tsx`: list every sibling's name
      with an `EntityRefLink` to its own page (current entity rendered as plain text, not a link)
      (depends on T012)
- [X] T014 [US1] Verify (quickstart.md step 5): restart Backstage, confirm `museum-api-v1` and
      `museum-api-v2` both appear with no hand-authored catalog file for either, and that the
      `museum-api` System's page lists both as "Has part" APIs

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Discover the latest version by default, while older versions remain reachable (Priority: P1)

**Goal**: The Versions card computes and flags the latest version from each spec's own
`info.version` — no manually-maintained flag, no duplicated annotation.

**Independent Test**: Confirm v2 (`info.version: 2.0.0`) is flagged "Latest" against v1
(`info.version: 1.0.0`), and that v1 remains fully reachable via the same card.

### Implementation for User Story 2

- [X] T015 [US2] Implement `getVersionString()`/`getVersion()`/`compareVersions()`/`findLatest()`
      in `versionUtils.ts`: parse `info.version` out of `spec.definition` (already a
      placeholder-resolved plain string) via `js-yaml`, never a catalog annotation (research.md R2)
- [X] T015a Fix `versionUtils.ts`'s `js-yaml` import: `import yaml from 'js-yaml'` (a default
      import) fails to resolve at runtime against `js-yaml@^5` (ESM-only, no default export —
      `import * as yaml from 'js-yaml'` is the pattern the `apiMocking` module (Lab 5) already
      uses correctly), producing an `ESModulesLinkingWarning` and breaking the frontend compile
      (found during Step 4 verification, Run 2; resolves checklists/issues.md; depends on T015)
- [X] T016 [US2] Render each sibling's `v{version}` label and a "Latest" `Chip` in
      `ApiVersionsCard.tsx`'s `VersionRow`, computed via `findLatest()` (depends on T015)
- [X] T017 [US2] Verify (quickstart.md step 6): confirm `museum-api-v2` is flagged Latest, computed
      from `info.version` (`1.0.0` vs. `2.0.0`), and that v1 is still one click away

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Track lifecycle state independently per version (Priority: P2)

**Goal**: Each version's lifecycle state comes from its own spec's `x-examplecorp.lifecycle` field
(the same extraction mechanism Lab 4 already built for owner/visibility) and is editable without
touching any catalog YAML or the sibling version's spec.

**Independent Test**: Set v1's spec to `lifecycle: production` and v2's to `lifecycle: development`,
confirm both pages display their own independent state, then advance v2 through
`testing` → `production` and confirm v1 is unaffected.

### Implementation for User Story 3

- [X] T018 [US3] Implement `getLifecycle()`/`isRetired()` in `versionUtils.ts`, reading
      `entity.spec.lifecycle` (populated by `autoApiRegistration.ts` from each spec's
      `x-examplecorp.lifecycle` — no code change needed here, Lab 4 already extracts it)
- [X] T019 [US3] Render each sibling's lifecycle `Chip` in `ApiVersionsCard.tsx`'s `VersionRow`
      (depends on T018)
- [X] T020 [US3] Verify (quickstart.md step 6): confirm v1 (`production`) and v2 (`development`)
      show independent lifecycle chips on their own "About" cards and in the Versions card
- [X] T021 [US3] Verify (quickstart.md step 7): edit `museum-v2-openapi.yaml`'s
      `info.x-examplecorp.lifecycle` from `development` → `testing` → `production` (two sequential
      edits); after each, wait for the next `autoApiRegistration` poll cycle and confirm the
      displayed chip (own page and Versions card) updates with no commit/push required, and that
      v1's entry is unaffected

**Checkpoint**: User Stories 1–3 all work independently.

---

## Phase 6: User Story 4 - Deprecate and then retire an API version (Priority: P2)

**Goal**: A version can be marked `deprecated` and later `retired` as two distinct steps, with a
loud main-content warning on deprecated/retired pages, retired versions collapsed by default (but
never deleted) in the Versions card.

**Independent Test**: Mark v1 `deprecated`, confirm the label appears everywhere v1 appears; mark
it `retired`, confirm it collapses behind "Show retired versions" while remaining directly
reachable and never deleted.

### Implementation for User Story 4

- [X] T022 [US4] Create `ApiLifecycleBanner.tsx` in
      `labs/lab-06-api-lifecycle-management/code/packages/app/src/modules/apiVersions/`: a
      `content`-type `EntityCardBlueprint` card that renders nothing unless `spec.lifecycle` is
      `deprecated`/`retired`, in which case it shows a `WarningPanel` naming the latest version to
      use instead; register it alongside `apiVersionsCard` in `index.ts`
- [X] T023 [US4] Add "Show retired versions (N)" collapse/toggle logic to `ApiVersionsCard.tsx`:
      filter siblings whose `isRetired()` is true out of the default list, revealed via local
      component state (no persistence needed)
- [X] T024 [US4] Document the `app-config.yaml` `app.extensions` entry
      (`entity-card:catalog/api-lifecycle-banner`) needed to pin the banner above the
      auto-discovered `api-docs` Definition card, in the README's Step 3
- [X] T025 [US4] Verify (quickstart.md step 8): edit `museum-v1-openapi.yaml`'s
      `info.x-examplecorp.lifecycle` to `deprecated`; confirm the Deprecated label and banner
      appear on v1's own page and in the Versions card on both v1 and v2's pages
- [X] T026 [US4] Verify (quickstart.md step 9–10): edit `museum-v1-openapi.yaml`'s
      `info.x-examplecorp.lifecycle` to `retired`; confirm v1 collapses behind "Show retired
      versions (1)" on both pages, remains fully viewable via a direct link (clearly labeled
      Retired), and that the entity itself is never deleted from the catalog (SC-005, SC-006)

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and repository-wide consistency, not gated behind any single story.

- [X] T027 [P] Write `labs/lab-06-api-lifecycle-management/README.md` (Overview/Prerequisites/Steps
      1–9, Constitution Principle II) covering: adding the two OpenAPI spec files, registering the
      second `autoApiRegistration` source, scaffolding/registering the `apiVersions` module,
      starting Backstage, and walking through latest-prominence, lifecycle-progression, and
      deprecate-then-retire verification — linking to the committed spec files and
      `code/packages/app/src/modules/apiVersions/` rather than inlining them (each exceeds the
      ~40–50 line threshold)
- [X] T028 [P] Add the README's "Why" sections explaining each design decision that isn't
      self-evident from the code: System entity vs. bespoke annotation (research.md R1),
      auto-synthesizing the System instead of hand-authoring it (R1a), reading `info.version`
      instead of a duplicated annotation (R2), reusing the spec's own `x-examplecorp.lifecycle`
      field instead of a catalog override (R3), leaving native search unmodified (R5), and
      superseding (not editing) Lab 2's entry (R6) — including why `x-examplecorp` (not a
      per-lab/per-tool namespace like `x-apiportal`) is the correct, reused vendor namespace
- [X] T029 [P] Add the README's "Adaptable Conventions vs. Fixed Mechanics" section (FR-013): the
      `x-examplecorp` field set (`owner`/`visibility`/`lifecycle`/`apiBasename`) and the five-value
      lifecycle convention are adaptable; the `System`/`spec.system` relation, its auto-synthesis
      from `apiBasename`, the `EntityCardBlueprint` mechanism, and reading `info.version` directly
      are fixed
- [X] T030 [P] Add the README's Troubleshooting section: wrong/mismatched `apiBasename` values
      producing an empty sibling list, a misconfigured second-source `rootPath`, a missing
      `museum-team` owner group, and the (now removed) need for any commit/push step for lifecycle
      edits
- [X] T031 [P] Update `labs/lab-04-auto-registration/README.md`'s "Adaptable Conventions" `rootPath`
      bullet to document the `packages/backend`-relative resolution fix (T007), pointing at Lab 6's
      second source as a worked example
- [X] T032a Fix `labs/lab-06-api-lifecycle-management/README.md`'s Step 2: it previously described
      `app-config.yaml`'s multi-source config as "already in place" and never instructed copying
      the updated `autoApiRegistration.ts` (+ new `002_add_system_slug.ts` migration) into the
      backend — the missing instruction a learner would need before Step 4 can pass at all;
      add the corresponding Troubleshooting entry for the location-annotation orphan symptom
      (resolves checklists/issues.md Run 1, pairs with T006a)
- [X] T032 Confirm `labs/lab-06-api-lifecycle-management/README.md` is linked from the root
      `README.md`'s Lab Series table, Getting Started tree, and Repository Structure tree, per the
      Constitution's Lab Structure Standards (already satisfied — no edit required)
- [X] T033 Run quickstart.md's full 10-step validation end-to-end against a real Backstage instance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (both API
  versions and the System they're grouped under must exist before any story can be demonstrated)
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and independent of each other, but US2's "Latest" flag only makes
    sense once US1's sibling list renders — implement in order for a sane demo, even though
    neither's *code* depends on the other's
  - US3 and US4 are both P2; US4 (deprecate/retire) builds narratively on US3 (lifecycle display)
    but does not share any implementation task
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each User Story

- `versionUtils.ts` helpers before `ApiVersionsCard.tsx`/`ApiLifecycleBanner.tsx` rendering that
  calls them
- Implementation before its quickstart verification task

### Parallel Opportunities

- T002 and T007–T009 can run in parallel (different files, no shared dependency)
- T027–T031 (all README/doc tasks) can run in parallel once Phases 3–6 are complete
- Foundational tasks T002–T006 are a strict sequence (each edits the same
  `autoApiRegistration.ts` file); T007–T009 can proceed in parallel alongside them

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories; this is where the
   auto-registration extension lives)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm both versions register and group correctly with zero catalog YAML
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → both API versions auto-registered, System synthesized
2. Add User Story 1 → sibling list renders → validate → demo (MVP!)
3. Add User Story 2 → Latest flag from `info.version` → validate → demo
4. Add User Story 3 → per-version lifecycle chips, editable via spec file → validate → demo
5. Add User Story 4 → deprecate/retire banner + collapse → validate → demo
6. Polish → README, cross-lab consistency, full quickstart run

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This lab's Foundational phase is unusually load-bearing compared to a typical feature: because
  the whole point is "zero hand-authored catalog YAML," the backend extraction/synthesis mechanism
  (T002–T009) has to exist before *any* story-level UI work has real data to render against
- Verify each story's quickstart step before moving to the next priority
- Avoid: reintroducing a hand-authored `catalog-info.yaml`/`system.yaml` for anything this lab
  registers — that would defeat the lab's core lesson
