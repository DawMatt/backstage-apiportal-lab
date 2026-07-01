---
description: "Task list for Lab 3 — API Quality"
---

# Tasks: Lab 3 — API Quality

**Input**: Design documents from `specs/003-lab-3-api-quality/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not applicable — this is a tutorial lab with manual browser verification (no automated test suite).

**Organization**: Tasks are grouped by user story to enable independent implementation and review of each lab section.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Includes exact file paths in all descriptions

## Path Conventions

- Lab artifacts: `labs/lab-03-api-quality/` (README, .spectral.yaml, catalog/)
- Cross-lab update: `labs/lab-02-users-roles/catalog/teams.yaml`
- Student Backstage instance (guided by README, not committed): `labs/lab-01-base-backstage/backstage/`

---

## Phase 1: Setup (Lab Scaffolding)

**Purpose**: Create the lab directory structure so subsequent phases have concrete files to write to.

- [X] T001 Create labs/lab-03-api-quality/ directory with README.md placeholder and catalog/ subdirectory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the README skeleton with overview, prerequisites, and section headings. All story phases add content to this file — the skeleton must exist first.

**⚠️ CRITICAL**: Story-phase README content cannot be written until this skeleton exists.

- [X] T002 Draft README overview section (what Lab 3 demonstrates), prerequisites section (Lab 2 completed; Node.js 20 LTS; yarn; Git), and section-heading skeleton in labs/lab-03-api-quality/README.md

**Checkpoint**: README skeleton exists — story-phase content can now be added independently.

---

## Phase 3: User Story 1 — Shared Spectral Ruleset (Priority: P1) 🎯 MVP

**Goal**: A single `.spectral.yaml` ruleset file is committed to the repository and referenced by both quality plugins. Defines both OAS3 and AsyncAPI default rules so all three sample APIs receive appropriate quality assessments from one file.

**Independent Test**: Confirm `.spectral.yaml` exists at `labs/lab-03-api-quality/.spectral.yaml` and contains `extends: [spectral:oas, spectral:asyncapi]`. Optionally run Spectral locally against a Lab 1 sample API spec and confirm the default rules apply.

### Implementation for User Story 1

- [X] T003 [US1] Create labs/lab-03-api-quality/.spectral.yaml with `extends: [spectral:oas, spectral:asyncapi]` (canonical content from R-001; include CDN fallback as a comment)
- [X] T004 [US1] Write README Step 1: explain why a single shared ruleset is used (FR-013 — single source of truth for consistent results), show the ruleset content, document the file path, and provide the GitHub raw URL template that both plugins will reference in labs/lab-03-api-quality/README.md

**Checkpoint**: Spectral ruleset committed and documented — both plugin phases can now reference the ruleset URL.

---

## Phase 4: User Story 2 — API Grade Plugin (Priority: P2)

**Goal**: `backstage-plugin-api-grade` (frontend) and `backstage-plugin-api-grade-backend` are installed and configured. Every API entity page shows a grade card in the Info column below About; all authenticated users see the grade summary; only owners and platform team members see the detailed breakdown.

**Independent Test**: Sign in as Alice (museum-team), navigate to the Museum API entity page, and confirm a grade card appears in the Info column showing a letter, percentage, and quality label. Sign in as the default (no-identity) guest and confirm the summary grade is still visible.

### Implementation for User Story 2

- [X] T005 [P] [US2] Write README Step 2a: frontend package installation instructions — npm-first check (`npm view backstage-plugin-api-grade`) with `yarn --cwd packages/app add` command, plus full GitHub source-build fallback with: (a) clone from repo root so api-grade lands beside the repo, (b) macOS uses `npm install` / `npm run build` to build the api-grade repo (api-grade uses npm internally — yarn install fails on this repo), (c) Windows `Set-Location -` return-navigation alternative to `cd -`, (d) pre-install `api-grade-core@file:../../../../../../api-grade/packages/api-grade-core` before `backstage-plugin-api-grade` (api-grade-core is not on npm; yarn must see the local package before resolving the main plugin), (e) corrected file: path of `../../../../../../api-grade/packages/backstage-plugin-api-grade` (6 levels from packages/app), (f) `--legacy-peer-deps` fallback for ERESOLVE peer dependency conflict per R-002 in labs/lab-03-api-quality/README.md
- [X] T006 [P] [US2] Write README Step 2b: backend package installation instructions — same npm-first / source-build pattern for `backstage-plugin-api-grade-backend` with identical corrected file: path (`../../../../../../api-grade/packages/backstage-plugin-api-grade-backend`), same Windows/PowerShell alternatives, and same `--legacy-peer-deps` note per R-002 in labs/lab-03-api-quality/README.md
- [X] T007 [US2] Write README Step 3: full code listing for packages/app/src/modules/apiGrade/index.ts (EntityCardBlueprint.make with filter:'kind:API', type:'info', ApiGradeCard loader) per R-003; explain why type:'info' is required in labs/lab-03-api-quality/README.md
- [X] T008 [US2] Write README Step 4: App.tsx update — add import for apiGradeModule and add it to the features array in createApp(); include complete updated features array for clarity in labs/lab-03-api-quality/README.md
- [X] T009 [US2] Write README Step 5: packages/backend/src/index.ts update — add single `backend.add(import('backstage-plugin-api-grade-backend'))` line; explain on-demand grading (grade computed fresh on every page load per FR-014; no persistent cache) in labs/lab-03-api-quality/README.md
- [X] T010 [US2] Write README Step 6: app-config.yaml apiGrade section — full YAML block with ruleset.url (GitHub raw URL template), visibility.allowAll:false, visibility.groups:[group:default/platform-team]; explain what each setting achieves (summary vs. detail split) per R-005 in labs/lab-03-api-quality/README.md

**Checkpoint**: api-grade plugin fully documented — student can install, configure, and verify the grade card independently of the Spectral linter.

---

## Phase 5: User Story 3 — Spectral Linter Plugin (Priority: P3)

**Goal**: `@dweber019/backstage-plugin-api-docs-spectral-linter` is installed and wrapped in a permission-gated component. A "Spectral" tab appears on every API entity page; API owners and platform team members see the inline lint results; all other users see an access-restricted message (the tab is visible to all but its content is gated — EntityContentBlueprint filter lacks user context, so the tab cannot be hidden; an access-restricted InfoCard is shown to non-owners instead).

**Independent Test**: Sign in as Alice (museum-team), navigate to the Museum API entity page, click the Spectral tab, and confirm inline lint results (or a clean-pass message) are visible. Sign in as Charlie (streetlights-team), navigate to the Museum API, click the Spectral tab, and confirm an access-restricted message appears instead of lint results.

### Implementation for User Story 3

- [X] T011 [US3] Write README Step 7: @dweber019/backstage-plugin-api-docs-spectral-linter@0.5.2 installation — `yarn --cwd packages/app add` command; note this package IS on npm (no source build needed) per R-006 in labs/lab-03-api-quality/README.md
- [X] T012 [US3] Write README Step 8: full code listing for packages/app/src/modules/spectralLinter/SpectralLinterContent.tsx — permission-gated wrapper using useEntityOwnership + identityApiRef.getBackstageIdentity().ownershipEntityRefs; include the access-restricted InfoCard fallback; explain WHY EntityContentBlueprint filter cannot hide the tab (lacks user context) and why an access-restricted message is shown to non-owners rather than hiding the tab entirely per R-007 in labs/lab-03-api-quality/README.md
- [X] T013 [US3] Write README Step 9: full code listing for packages/app/src/modules/spectralLinter/index.ts — EntityContentBlueprint.make with defaultPath:'/spectral', defaultTitle:'Spectral', filter:'kind:API', SpectralLinterContent loader per R-007 in labs/lab-03-api-quality/README.md
- [X] T014 [US3] Write README Step 10: App.tsx update — add import for spectralLinterModule and add it to the features array; show updated features array with both apiGradeModule and spectralLinterModule in labs/lab-03-api-quality/README.md
- [X] T015 [US3] Write README Step 11: app-config.yaml spectralLinter section — full YAML block with openApiRulesetUrl and asyncApiRulesetUrl both pointing to the same .spectral.yaml GitHub raw URL; explain that Spectral's format detection applies OAS3 vs AsyncAPI rules automatically per R-006 in labs/lab-03-api-quality/README.md

**Checkpoint**: Spectral linter plugin fully documented — student can install, configure, and verify the linter tab independently.

---

## Phase 6: User Story 4 — Platform Team Configuration (Priority: P4)

**Goal**: A new user `eve` (platform team member) is added to the catalog. The existing `platform-team` group in Lab 2's teams.yaml is updated to list eve as its first member. Eve can sign in and see detailed quality information for all three APIs regardless of ownership.

**Independent Test**: Sign in as Eve (platform-team), navigate to the Museum API entity page (owned by museum-team, not platform-team), and confirm both the api-grade detailed breakdown and the Spectral lint results tab are visible to her.

### Implementation for User Story 4

- [X] T016 [P] [US4] Create labs/lab-03-api-quality/catalog/platform-user.yaml — User entity for eve (displayName: Eve Rodriguez, email: eve@example.com, memberOf: [platform-team]) per data-model.md
- [X] T017 [US4] Update labs/lab-02-users-roles/catalog/teams.yaml — add `- eve` to the members list under the platform-team Group entry per R-008; add a comment noting this is a Lab 3 addition
- [X] T018 [US4] Write README Step 12: app-config.yaml catalog location entry for platform-user.yaml — type:url, target: GitHub raw URL template, rules allow:[User]; explain why teams.yaml is updated (not a new Group file) to avoid duplicate entity error per R-009 in labs/lab-03-api-quality/README.md
- [X] T019 [US4] Write README Step 13: app-config.local.yaml identity-switching instructions — show the three userEntityRef values (alice, charlie, eve) and explain each user's role and expected quality visibility per data-model.md visibility table in labs/lab-03-api-quality/README.md

**Checkpoint**: Platform team fully configured and documented — all four user stories are complete and independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete README with verification, troubleshooting, platform variants, constitution-required sections, and coverage of gaps identified during analysis.

- [X] T020 Write README verification section using all 7 steps from quickstart.md — Step 1 (eve in catalog), Step 2 (grade card for all), Step 3 (Alice sees detail), Step 4 (Charlie sees summary only / Spectral tab shows access-restricted message), Step 5 (Eve sees all detail), Step 6 (ruleset consistency check: note Diagnostics from api-grade card and Spectral lint results should reference the same rule violations for the same API), Step 7 (AsyncAPI quality check); add a Step 8 bonus verification for SC-006: edit .spectral.yaml to add/remove a rule comment, reload the API entity page, and confirm both plugins reflect the updated ruleset without changing either plugin's configuration in labs/lab-03-api-quality/README.md
- [X] T021 Write README troubleshooting section covering: (a) Spectral ruleset path misconfiguration (wrong raw URL — fetch URL in browser to verify), (b) api-grade plugin installation issues (npm vs source build, api-grade-core not on npm), (c) permission config mistakes (allowAll:true leaking detail, platform-team ref typo causing restricted access), (d) missing catalog location for platform-user.yaml, (e) API entity with no attached specification file (both plugins display an error or empty state — document expected message), (f) user belonging to both an owning team and platform-team (detail is visible — both ownership and platform-team checks pass) per FR-009 in labs/lab-03-api-quality/README.md
- [X] T022 [P] Add Windows/macOS platform-specific variants to all yarn/npm commands in the README where they differ (e.g. path separators, shell syntax for cd vs Set-Location, PowerShell alternatives); confirm no Unix-only assumptions per FR-012 in labs/lab-03-api-quality/README.md
- [X] T023 [P] Add Security Note section before the guest auth step (app-config.local.yaml switching) — label guest provider as lab-only, list production alternatives (OIDC, SAML, LDAP), note that userEntityRef values are fictional per Constitution Principle IX in labs/lab-03-api-quality/README.md
- [X] T024 Review completed README for all constitution gates AND FR-010 compliance: (a) WHY explanations present (FR-013 single ruleset rationale, on-demand grading explanation, EntityContentBlueprint filter limitation / access-restricted message explanation); (b) verification tests outcomes not implementation details (SC-003–SC-006); (c) platform variants complete; (d) Security Note before first insecure step; (e) dependency table listing all tools/plugins with their license (MIT) and source URL to confirm FR-010 zero-cost requirement is visible to the learner in labs/lab-03-api-quality/README.md

---

## Phase 8: Issue Remediation (checklists/issues.md)

**Purpose**: Fix issues discovered during manual lab testing (checklists/issues.md) that were not caught by the original task set. Both issues below stem from real testing runs against the student's Backstage instance.

- [X] T025 [US2] Verify Run 4 (backend.add crash, `Cannot use 'in' operator to search for '$$type' in undefined`) is resolved by the Step 2b npm-install change: confirm `@dawmatt/backstage-plugin-api-grade-backend@0.5.0`'s published `dist/index.d.ts` exports a proper `default` (the crash was caused by a broken `default` export in the old local source build, now eliminated since Step 2a/2b no longer build from source); document the root cause and resolution in specs/003-lab-3-api-quality/checklists/issues.md
- [X] T026 [US3] Add `@backstage/core-compat-api` to the Step 7 install command in labs/lab-03-api-quality/README.md and explain WHY it's needed (bridges the Spectral linter's old-system routable extension into the new frontend system) per updated R-006/R-007 in research.md
- [X] T027 [US3] Update the SpectralLinterContent.tsx code listing (README Step 8) to import `compatWrapper` from `@backstage/core-compat-api` and wrap the final return value: `return compatWrapper(<EntityApiDocsSpectralLinterContent />);`; add a WHY explanation of the old-system/new-system routable-extension mismatch that caused Run 6's error in labs/lab-03-api-quality/README.md
- [X] T028 [US3] Add a new Troubleshooting entry for the Run 6 error ("Routable extension component ... was not discovered in the app element tree") documenting cause and fix (install `@backstage/core-compat-api`; wrap component in `compatWrapper`) in labs/lab-03-api-quality/README.md
- [X] T029 [P] Update research.md R-006 and R-007 with the `compatWrapper` decision, updated code sample, and updated Import sources table; update plan.md's Primary Dependencies list to include `@backstage/core-compat-api` in specs/003-lab-3-api-quality/research.md and specs/003-lab-3-api-quality/plan.md
- [X] T030 [P] Mark Run 4 and Run 6 resolved in specs/003-lab-3-api-quality/checklists/issues.md with resolution notes matching the README and research.md changes

**Checkpoint**: Both outstanding issues.md items (Run 4 confirmed resolved by npm publish, Run 6 fixed via compatWrapper) are documented and reflected in the README and design docs.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (README.md file must exist)
- **US1 (Phase 3)**: Depends on Phase 2 (README skeleton) — BLOCKS US2 and US3 (both need ruleset URL)
- **US2 (Phase 4)**: Depends on US1 (ruleset URL needed for app-config); T005 and T006 can run in parallel
- **US3 (Phase 5)**: Depends on US1 (ruleset URL needed for app-config); can proceed in parallel with US2 (different files)
- **US4 (Phase 6)**: Depends on Phase 2 (README skeleton); T016 and T017 can run in parallel; T018/T019 depend on T016 and T017 completing
- **Polish (Phase 7)**: Depends on all story phases complete; T022 and T023 can run in parallel
- **Issue Remediation (Phase 8)**: Depends on Phase 4 (US2 npm install) and Phase 5 (US3 Spectral linter component) being written; addresses issues discovered during manual testing after the original phases were completed

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependencies on other stories
- **US2 (P2)**: Depends on US1 for the ruleset URL (needed in app-config.yaml)
- **US3 (P3)**: Depends on US1 for the ruleset URL; can proceed in parallel with US2 (separate files: SpectralLinterContent.tsx vs apiGrade/index.ts)
- **US4 (P4)**: Depends on Phase 2 only — catalog YAML and teams.yaml update are independent of plugin installation; README steps for US4 come last

### Within Each Phase

- Parallel README steps (T005/T006 in Phase 4; T022/T023 in Phase 7) touch different sections — safe to write simultaneously
- Catalog file creation (T016) and teams.yaml update (T017) touch different files — safe to run in parallel

### Parallel Opportunities

```bash
# US2 frontend and backend installation steps (Phase 4):
T005: Write README Step 2a: frontend package installation
T006: Write README Step 2b: backend package installation

# US3 and US4 catalog work can proceed in parallel once US1 is complete:
# (US3 README content + US4 YAML files touch different files)
T011–T015: US3 Spectral linter README content
T016–T017: US4 catalog YAML files

# Polish parallel tasks:
T022: Add platform-specific variants
T023: Add Security Note section
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: US1 — Spectral ruleset (T003–T004)
4. **STOP and VALIDATE**: `.spectral.yaml` file exists; README Step 1 explains the single shared ruleset rationale
5. The ruleset MVP is independently verifiable per the US1 independent test

### Incremental Delivery

1. Setup + Foundational → README skeleton + lab directory exist
2. US1 → Ruleset file + Step 1 README → test that ruleset is accessible at documented path
3. US2 → api-grade plugin instructions → test grade card per quickstart Steps 2–3
4. US3 → Spectral linter instructions → test linter tab per quickstart Steps 3–4
5. US4 → Platform team catalog files + instructions → test eve access per quickstart Step 5
6. Polish → Full README with verification, troubleshooting, and platform variants

---

## Notes

- [P] tasks = different files, no dependencies — safe to run simultaneously
- [Story] label maps each README section and file to its user story for traceability
- Tests are NOT included — this is a tutorial lab with manual browser verification only
- The student's TypeScript module files (apiGrade/index.ts, SpectralLinterContent.tsx, etc.) appear as code listings in the README, not as committed source files
- Code listings in the README MUST include complete, copy-pasteable content — no partial snippets
- Commit after each phase completes; push before writing app-config.yaml catalog URLs (platform-user.yaml must be reachable at its registered URL for the student to test)
