---

description: "Task list for Lab 2 — Users, Roles, and API Visibility"
---

# Tasks: Lab 2 — Users, Roles, and API Visibility

**Input**: Design documents from `/specs/002-lab-2-users-roles/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No automated tests — this is a tutorial lab. Verification is manual browser-based
testing per quickstart.md. Test tasks are not included.

**Organization**: Tasks are grouped by user story to enable independent authoring and
verification of each story's lab deliverables.

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

- [X] T001 Create lab directory structure: `labs/lab-02-users-roles/catalog/apis/` (mkdir -p equivalent; create .gitkeep if needed to track empty dirs)

---

## Phase 2: Foundational (README Skeleton)

**Purpose**: Create the `labs/lab-02-users-roles/README.md` skeleton with all required
section headings in the correct order. This unblocks all user story phases, which each fill
in one or more sections.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — all phases write
into sections of this README.

- [X] T002 Create `labs/lab-02-users-roles/README.md` skeleton containing the following
  empty sections in order: Overview, Prerequisites, Security Note (placeholder — filled in
  US3), Step 1: Define Users and Teams (with a "Verification" sub-section placeholder),
  Step 2: Associate APIs with Owning Teams (with a "Verification" sub-section placeholder),
  Step 3: Configure Sign-In (with a "Verification" sub-section placeholder),
  Step 4: Enable Ownership-Based Visibility (with a "Verification" sub-section placeholder),
  Summary Checklist (placeholder — populated by T021 from quickstart.md), Troubleshooting.
  Include the feature title, lab number, and a "builds on Lab 1" callout at the top.
  Note: verification is inline within each step section, not a separate top-level section.

**Checkpoint**: README skeleton exists — user story phases can now proceed in parallel.

---

## Phase 3: User Story 1 — Define Users and Teams in the Catalog (Priority: P1) 🎯 MVP

**Goal**: Provide the catalog YAML files and README instructions a developer needs to add
named users and teams to their Backstage catalog, so that all four users and both groups
appear and are browsable.

**Independent Test**: Start Backstage, navigate to Catalog → Kind: Group → verify
`museum-team` and `streetlights-team` appear with correct members. Navigate to Catalog →
Kind: User → verify all four users appear. (Quickstart.md Step 1.)

### Implementation for User Story 1

- [X] T003 [P] [US1] Create `labs/lab-02-users-roles/catalog/teams.yaml` with two Group
  entities: `museum-team` (members: alice, bob) and `streetlights-team` (members: charlie,
  diana) per data-model.md. Both groups must include `spec.children: []` and
  `spec.profile.displayName`. Use `apiVersion: backstage.io/v1alpha1`.
- [X] T004 [P] [US1] Create `labs/lab-02-users-roles/catalog/users.yaml` with four User
  entities: alice (memberOf: museum-team), bob (memberOf: museum-team), charlie
  (memberOf: streetlights-team), diana (memberOf: streetlights-team) per data-model.md.
  Include `spec.profile.displayName` and `spec.profile.email` (fictional values) for each.
- [X] T005 [US1] Write README "Step 1: Define Users and Teams" section (depends on T003,
  T004): Explain what User and Group entities are and why both `members` on the Group and
  `memberOf` on the User are required (R-001). Provide the `app-config.yaml` catalog
  location snippets for `teams.yaml` and `users.yaml` with correct `rules` (R-005). Include
  platform notes for any path differences. Explain why the `examples/org.yaml` guest user
  will still appear and that it does not affect the demo.
- [X] T006 [US1] Write README "Verification — Step 1" sub-section: numbered steps matching
  quickstart.md Step 1 (catalog → Group filter, check museum-team members, catalog → User
  filter, check alice group membership). Include ✅ Pass and ❌ Fail + fix instructions.

**Checkpoint**: US1 deliverables complete — developer can add users/groups and verify them.

---

## Phase 4: User Story 2 — Associate APIs with Owning Teams (Priority: P2)

**Goal**: Provide updated API catalog descriptors with `spec.owner` set, and README
instructions to register them, so each API shows its owning team and teams list their APIs.

**Independent Test**: Navigate to each API's catalog page → verify Owner field shows the
correct team. Navigate to each team's page → verify owned APIs are listed.
(Quickstart.md Step 2.)

### Implementation for User Story 2

- [X] T007 [P] [US2] Create `labs/lab-02-users-roles/catalog/apis/museum-api.yaml` as the
  updated Museum API descriptor (copy of Lab 1 version) with `spec.owner:
  group:default/museum-team` added per data-model.md and R-002. Use fully-qualified group
  ref. Keep `spec.definition` as a GitHub raw URL (type:url pattern per R-005 note on
  $text limitation).
- [X] T008 [P] [US2] Create `labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml`
  as the updated Streetlights API descriptor with `spec.owner:
  group:default/streetlights-team` added per data-model.md and R-002. Use fully-qualified
  group ref.
- [X] T009 [US2] Write README "Step 2: Associate APIs with Owning Teams" section (depends
  on T007, T008): Explain why `spec.owner` uses a fully-qualified group ref (R-002).
  Provide `app-config.yaml` catalog location snippets for both updated API descriptors
  (R-005). Include a note explaining that the Lab 1 API entries must be removed from
  `app-config.yaml` to avoid duplicate entities, and how to identify duplicates.
- [X] T010 [US2] Write README "Verification — Step 2" sub-section: numbered steps matching
  quickstart.md Step 2 (API catalog → Owner field, team page → Owned APIs). Include ✅
  Pass and ❌ Fail + fix instructions. The Fail path MUST explicitly address duplicate
  entities: if both Lab 1 and Lab 2 API entries are registered simultaneously, Backstage
  will show two entries for the same API name; the fix is to remove the Lab 1 entries
  from `app-config.yaml` and restart.

**Checkpoint**: US2 deliverables complete — APIs display ownership and teams list their APIs.

---

## Phase 5: User Story 3 — Sign In as a Specific User (Priority: P3)

**Goal**: Provide README instructions for configuring Backstage's guest auth provider with
a `userEntityRef`, including a Security Note section (Constitution Principle IX), so a
developer can sign in as a named catalog user and see their identity reflected in Backstage.

**Independent Test**: Configure `app-config.local.yaml` with `userEntityRef:
user:default/alice`, restart Backstage, sign in, verify profile shows "Alice Chen".
(Quickstart.md Step 3.)

### Implementation for User Story 3

- [X] T011 [US3] Write README "Security Note" section (Constitution Principle IX — must
  appear before Step 3): Mark with a `> ⚠️ Lab only` callout. Explain that
  `userEntityRef` in `app-config.local.yaml` is a local development convenience that
  bypasses real authentication. State that `app-config.local.yaml` is gitignored. Provide
  the production alternative: configure an enterprise identity provider (OIDC, SAML, or
  LDAP). Note that any credentials or values in this file are fictional example values only.
- [X] T012 [US3] Write README "Step 3: Configure Sign-In" section (depends on T011):
  Provide the `app-config.local.yaml` snippet with `auth.providers.guest.userEntityRef:
  user:default/alice` (R-003). Explain that this file is gitignored by default. Explain
  the race-condition caveat from R-003 (wait for catalog to fully load before clicking
  Sign In). Include platform notes for locating the Backstage root directory on Windows
  and macOS. Explain how to switch between users (edit the value, restart `yarn start`).
- [X] T013 [US3] Write README "Verification — Step 3" sub-section: numbered steps matching
  quickstart.md Step 3 (configure alice, restart, sign in, verify profile shows
  "Alice Chen"). Include ✅ Pass and ❌ Fail + fix instructions (catalog must have loaded
  alice entity before sign-in; check app-config.local.yaml is in Backstage root).

**Checkpoint**: US3 deliverables complete — developer can sign in as a named catalog user.

---

## Phase 6: User Story 4 — Demonstrate API Visibility Differences by User (Priority: P4)

**Goal**: Provide the `permissionPolicy.ts` source code and README instructions for
replacing the allow-all policy with the custom `CatalogOwnershipPolicy`, so that signed-in
users see only the APIs owned by their team, producing a demonstrably different catalog view
between Team A and Team B users.

**Independent Test**: Sign in as Alice → verify only Museum API visible; sign in as Charlie
→ verify only Streetlights API visible. (Quickstart.md Steps 4–5.)

### Implementation for User Story 4

- [X] T014 [P] [US4] Write README "Step 4: Enable Ownership-Based Visibility" section:
  Provide the full TypeScript source for `packages/backend/src/extensions/permissionPolicy.ts`
  as a code block (from R-004, confirmed for Backstage 1.51.0). Include a table of import
  sources (package names and stability) from R-004. Explain the behavioural note: ALL
  catalog entities become team-scoped (not just APIs), and this is acknowledged as a
  simplification. Provide the diff/snippet for `packages/backend/src/index.ts` showing
  removal of the allow-all import and addition of the custom policy import. Explain why
  non-catalog permissions continue to return ALLOW.
- [X] T015 [US4] Write README "Verification — Steps 4 and 5" sub-section (depends on
  T014): numbered steps matching quickstart.md Steps 4–5 (sign in as Alice → only Museum
  API; sign in as Charlie → only Streetlights API; attempt to navigate directly to the
  other team's API URL). Include ✅ Pass and ❌ Fail + fix instructions for each.
- [X] T016 [US4] Write README "Edge Cases" sub-section documenting (from spec.md edge
  cases): multi-team membership behaviour with this policy, how to identify and fix broken
  entity references, what happens when auth is not yet configured, and what the catalog
  shows for unowned APIs under the ownership policy.

**Checkpoint**: US4 deliverables complete — the lab's primary learning outcome is achievable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final review, cross-platform verification, and completion of shared README sections.

- [X] T017 [P] Write README "Troubleshooting" section covering the three required failure
  modes from FR-007: (1) auth configuration errors — `userEntityRef` user not in catalog,
  sign-in shows wrong name; (2) missing catalog entity references — broken `spec.owner`
  refs, missing `memberOf`/`members` causing one-directional relations; (3) permission
  configuration mistakes — allow-all still active, policy import path errors.
- [X] T018 [P] Write README "Overview" section (can be written any time after T002):
  What the lab demonstrates (named Backstage features: catalog User/Group entities,
  `spec.owner`, guest auth `userEntityRef`, permissions framework), what the developer
  will have at the end, and the "builds on Lab 1" framing. Max one screen of prose.
- [X] T019 [P] Write README "Prerequisites" section: Lab 1 completion (link), `yarn start`
  working, repository pushed to a public GitHub branch (so catalog URLs are resolvable),
  and a code editor. No new tools required.
- [X] T020 Review full README against Constitution: confirm Principle II (why each step
  exists is explained), Principle III (platform variants for Windows/macOS), Principle VIII
  (outcome-based verification, alternative paths acknowledged in auth section), Principle IX
  (Security Note present, fictional values labelled, production alternative provided).
- [X] T021 Populate README "Summary Checklist" section from quickstart.md's seven-item
  summary checklist, confirming each item is covered by the lab steps. This is the final
  at-a-glance verification the student can use after completing all four steps.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 — T003 and T004 can start immediately; T005 and
  T006 depend on T003 and T004
- **US2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1 after T002
- **US3 (Phase 5)**: Depends on Phase 2 and on US1 completing (catalog users must exist
  for auth instructions to reference them)
- **US4 (Phase 6)**: Depends on US2 (APIs need owners) and US3 (auth must be configured)
- **Polish (Phase 7)**: T017 and T019 depend on all user story phases; T018 and T019 can
  run in parallel with any phase; T020 and T021 require all phases complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2 — no dependency on other stories
- **US2 (P2)**: Unblocked after Phase 2 — no dependency on US1 (parallel with US1)
- **US3 (P3)**: Depends on US1 (users must exist in catalog for auth instructions)
- **US4 (P4)**: Depends on US2 (ownership) and US3 (auth)

### Within Each User Story

- YAML catalog files before README step instructions (T003/T004 before T005)
- Security Note (T011) before Step 3 instructions (T012) — Constitution requirement
- Verification sub-sections written alongside or after their corresponding step

### Parallel Opportunities

- T003 (teams.yaml) and T004 (users.yaml) can be authored in parallel
- T007 (museum-api.yaml) and T008 (streetlights-api.yaml) can be authored in parallel
- US1 (Phase 3) and US2 (Phase 4) can proceed in parallel after Phase 2
- T017 (Troubleshooting), T018 (Overview), T019 (Prerequisites) can run in parallel
  with each other and with any earlier phase

---

## Parallel Example: US1 Catalog Files

```
# These two files have no dependency on each other — author in parallel:
T003: labs/lab-02-users-roles/catalog/teams.yaml   (Group entities)
T004: labs/lab-02-users-roles/catalog/users.yaml   (User entities)
```

## Parallel Example: US2 API Descriptors

```
# These two files have no dependency on each other — author in parallel:
T007: labs/lab-02-users-roles/catalog/apis/museum-api.yaml
T008: labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: US1 — users and groups (T003–T006)
4. **STOP and VALIDATE**: Quickstart.md Step 1 passes
5. Complete Phase 4: US2 — API ownership (T007–T010)
6. **STOP and VALIDATE**: Quickstart.md Step 2 passes
7. Deploy/share for early review if desired

### Incremental Delivery

1. Setup + Foundational → skeleton ready
2. Add US1 → users and groups in catalog → validate → share
3. Add US2 → API ownership visible → validate → share
4. Add US3 → sign-in configured → validate → share
5. Add US4 → visibility differences demonstrated → full lab complete → validate

### Single Developer Strategy

Work sequentially in priority order: US1 → US2 → US3 → US4 → Polish.
Each story produces independently testable lab content before moving to the next.

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
- Cross-platform review (T020) is a required gate per Constitution; marking complete on
  macOS only is insufficient
