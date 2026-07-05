---

description: "Task list for Lab 4 — Auto Registration"
---

# Tasks: Lab 4 — Auto Registration

**Input**: Design documents from `/specs/004-lab-4-auto-registration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this lab produces no external API contracts)

**Tests**: Not requested. Per plan.md's Testing section, verification is manual (browser + backend logs) against quickstart.md's steps — consistent with Labs 1–3. No automated test tasks are generated; quickstart validation is folded into each story's checkpoint and the final Polish phase.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

This is a tutorial-lab project (not a generic web/mobile app). Two path roots are used:

- **Backstage instance** (modified in place, from Lab 1): `labs/lab-01-base-backstage/backstage/`
- **Lab 4 teaching content** (new, committed alongside README): `labs/lab-04-auto-registration/`
- **Speckit artifacts**: `specs/004-lab-4-auto-registration/` (this directory — no code changes here)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies and scaffold the directories every later task writes into.

- [X] T001 Add `fast-glob@3.3.3`, `js-yaml@4.2.0`, and `chokidar` as direct dependencies of `labs/lab-01-base-backstage/backstage/packages/backend/package.json` (`yarn add` from that package directory; research.md R2/R6)
- [X] T002 [P] Create the lab content directories `labs/lab-04-auto-registration/apis/galaxy/` and `labs/lab-04-auto-registration/apis/precedence-demo/`
- [X] T003 [P] Create the backend module scaffold directory `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistrationMigrations/`

**Checkpoint**: Dependencies installed, directories exist — ready for foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared scanning/parsing/persistence/config plumbing that both US1 (discovery/CRUD) and US2 (metadata sourcing) sit on top of. No user story is independently testable until this phase is done — the EntityProvider skeleton it produces is what US1 wires up to catalog mutations and US2 extends with `x-*` extraction.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Define the `autoApiRegistration` config schema (flat single-source shorthand + `sources[]` list form: `id`, `rootPath`, `patterns`, `ignore`, `mode`, `schedule`, `reconciliation`, `parseConcurrency`, `defaultOwner`, `defaultVisibility`, `xNamespace`) as TypeScript types in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts`, per data-model.md's Config section
- [X] T005 Implement config normalization (flat shorthand → single implicit `sources: [{ id: 'default', ... }]` entry; per-source `defaultVisibility` falling back to the global `'private'` "default default") in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R3/R7, depends on T004)
- [X] T006 [P] Implement the scan-state cache DB migration (`source_id`, `file_path` composite key; `mtime_ms`, `content_hash`, `entity_name` indexed, `last_error` columns) via `coreServices.database` in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistrationMigrations/001_scan_state_cache.ts` (data-model.md Scan-state cache section, research.md R6 Problem 2)
- [X] T007 [P] Implement the streamed, ignore-pattern-aware file discovery utility (`fastGlob.stream(...)` over `patterns`/`ignore`, per-source `rootPath`) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R2, depends on T004)
- [X] T008 [P] Implement the YAML parse + shape-check utility (valid input = parses **and** has `openapi` or `asyncapi` **and** `info.title`; anything else is a log-only malformed-file error) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R3, depends on T004)
- [X] T009 Implement the mtime/content-hash change-detection check against the scan-state cache (skip re-parse for unchanged files; sha1 hash only computed when `mtime_ms` differs) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R6 Problem 2, depends on T006, T007)
- [X] T010 Register the (not-yet-emitting) backend module via `createBackendModule` + `catalogProcessingExtensionPoint`, following the `permissionPolicy.ts` pattern, and wire it into `labs/lab-01-base-backstage/backstage/packages/backend/src/index.ts` with `backend.add(import('./extensions/autoApiRegistration'))` (research.md R1, depends on T004)
- [X] T011 Add the `autoApiRegistration` config block (single-source shorthand, matching the lab's default `rootPath`/`patterns`) to `labs/lab-01-base-backstage/backstage/app-config.yaml` (data-model.md Config section, depends on T004)

**Checkpoint**: Config loads, files are discoverable and parseable, scan-state cache persists — foundation ready for US1.

---

## Phase 3: User Story 1 - Automatic discovery and registration of API definitions (Priority: P1) 🎯 MVP

**Goal**: A new OpenAPI/AsyncAPI file dropped anywhere under the mono-repo location appears in the Backstage catalog with no hand-authored `catalog-info.yaml`; edits update the entity in place; removing the file retracts it.

**Independent Test**: Add a new, previously-unregistered OpenAPI spec file, trigger discovery, confirm a corresponding API entity appears — with default owner/lifecycle values (no `x-*` extraction required for this story) — with no manual `catalog-info.yaml` written for it; edit the file and confirm update-in-place; remove the file and confirm the entity is no longer active.

### Implementation for User Story 1

- [X] T012 [US1] Implement candidate entity mapping using only natively-homed fields — `info.title` slugified → `metadata.name`, verbatim `info.title` → `metadata.title`, `info.description` → `metadata.description`, native `tags[].name` → `metadata.tags` (default `[]`), `openapi`/`asyncapi` presence → `spec.type`, `spec.definition.$text` → source file path/URL, `backstage.io/managed-by-location` annotation → source file path — with `spec.owner`/`spec.lifecycle` set to the per-source `defaultOwner` constant and the fixed `experimental` default (no `x-*` reading yet) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (data-model.md Catalog API Entity table, depends on T008)
- [X] T013 [US1] Implement the first-run full mutation: glob scan → parse + shape-check → map candidates (T012) → build scan-state cache rows → emit one `type: 'full'` `EntityProvider` mutation in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R1/R6, depends on T009, T012)
- [X] T014 [US1] Implement subsequent-cycle delta mutations: diff current scan against scan-state cache rows, emit `type: 'delta'` (`added`/`removed`) mutations for changed/new/removed files only, update cache rows in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (FR-002/003/004, research.md R6 Problem 1, depends on T013)
- [X] T015 [US1] Wire the `coreServices.scheduler` poll loop (`schedule.frequencySeconds`, default 30s) to run the discovery cycle (T013 first run, then T014) per configured source in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R2, depends on T014); follow every `scheduler.scheduleTask(...)` call (poll task and watch-mode reconciliation task) with `await scheduler.triggerTask(taskId)` so the first cycle runs immediately on backend startup rather than waiting out the scheduler's own persisted `next_run_start_at` from a prior process (research.md R6 Corollary)
- [X] T016 [US1] Vendor the Scalar Galaxy API to `labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml` (trimmed copy of the MIT-licensed `https://cdn.jsdelivr.net/npm/@scalar/galaxy/dist/3.1.yaml`, no `x-examplecorp` object yet, no pre-existing `catalog-info.yaml`) — used to manually verify create/update/remove for this story (research.md R5)
- [X] T017 [US1] Manually verify against `labs/lab-01-base-backstage/backstage/` (quickstart.md steps 5–7): Galaxy API appears within one poll cycle with no hand-authored catalog file (SC-001); editing `info.description` updates the entity in place, not a duplicate (FR-003); renaming the file out of the discovery pattern retracts the entity as active (FR-004/SC-005)

**Checkpoint**: User Story 1 fully functional and independently testable — discovery, create, update, and removal all work end-to-end with default metadata.

---

## Phase 4: User Story 2 - Sourcing catalog metadata from spec `x-*` fields (Priority: P2)

**Goal**: `spec.owner`, `spec.lifecycle`, and the `example.com/visibility` annotation are sourced from each file's `info.x-examplecorp` object (with documented defaults when absent), invalid values/references surface visible errors on both backend logs and the catalog processing-errors UI, name collisions and hand-authored `catalog-info.yaml` precedence are respected.

**Independent Test**: Author an API definition with `x-examplecorp` owner/lifecycle/visibility fields, run discovery, confirm the resulting entity's `spec.owner`, `spec.lifecycle`, and `example.com/visibility` annotation reflect those values (not defaults); omit fields and confirm documented defaults apply without blocking registration; set an invalid owner/visibility and confirm a visible error on that entity without affecting other entities; confirm a hand-authored `catalog-info.yaml` wins over auto-sourced metadata for the same API.

### Implementation for User Story 2

- [X] T018 [US2] Extend the candidate entity mapping (T012) to read `info.x-<namespace>.owner` → `spec.owner` (default: per-source `defaultOwner`) and `info.x-<namespace>.lifecycle` → `spec.lifecycle` (default: `experimental`) using each source's configured `xNamespace`, in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (FR-005/FR-006/FR-007, data-model.md Mapping Rule 1, depends on T012)
- [X] T019 [US2] Extend the candidate entity mapping to read `info.x-<namespace>.visibility` → `metadata.annotations['example.com/visibility']` (default: per-source `defaultVisibility`, falling back to `'private'`) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (FR-006a, data-model.md Mapping Rule 2, depends on T018)
- [X] T020 [US2] Implement owner validation against known `User`/`Group` catalog entities (fetched via `CatalogService`, defaulting kind to `group:default/` when unprefixed); unresolvable owners produce a marker/error entity instead of a normally-registered one, in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R4, depends on T019)
- [X] T021 [US2] Implement visibility value validation (static enum check against `{private, shared}`); an unrecognized present value produces a marker/error entity rather than a silent default, in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R3/R4, depends on T019)
- [X] T022 [US2] Implement cross-source name-collision detection using the scan-state cache's `entity_name` index (queried across all sources, not scoped to the current one; deterministic first-by-path winner, second emitted as a `<slug>-collision` marker entity) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (research.md R4/R7 Problem 3, depends on T020, T021)
- [X] T023 [US2] Implement the `catalog-info.yaml` precedence check (query the catalog for an existing non-auto-sourced entity of the same `kind: API`/`metadata.name`; skip the auto-sourced candidate if found) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (FR-011, research.md R4, depends on T022)
- [X] T024 [US2] Implement the `apiportal-lab.io/registration-error` marker annotation on error entities plus the companion `CatalogProcessor` (`preProcessEntity` hook throwing `InputError` when the annotation is present) and backend-logger error lines for every skipped/errored file, registered alongside the `EntityProvider` in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (FR-008, research.md R4, depends on T023)
- [X] T025 [US2] Add `info.x-examplecorp` (`owner`, `lifecycle`, `visibility: shared`) to the vendored `labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml` (depends on T016)
- [X] T026 [P] [US2] Create the minimal precedence-demo spec `labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-openapi.yaml` (~2 paths, distinct `info.title`) (research.md R5, depends on T002)
- [X] T027 [P] [US2] Create the hand-authored `labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-catalog-info.yaml` (owner a non-platform team, `example.com/visibility: private`) that must win over the auto-sourced candidate for the same file (FR-011, depends on T026)
- [X] T028 [US2] Manually verify against `labs/lab-01-base-backstage/backstage/` (quickstart.md steps 5, 8): Galaxy entity's `spec.owner`/`spec.lifecycle`/tags match `x-examplecorp`/native-`tags` values (SC-002); Galaxy (`shared`) vs. precedence-demo (`private`, hand-authored) show the documented visibility contrast when signed in as a non-owning, non-platform user (SC-006); precedence-demo entity reflects the hand-authored file, not auto-sourced values (FR-011); a broken-YAML file logs an identifying error; a nonexistent owner reference and an unrecognized visibility value each surface a catalog processing error on that entity (FR-008, SC-003) (depends on T024, T025, T027)

**Checkpoint**: User Stories 1 AND 2 both work independently — metadata sourcing, defaults, validation errors, collisions, and precedence are all verified.

---

## Phase 5: User Story 3 - Learner can extend the mono-repo convention to their own structure (Priority: P3)

**Goal**: Lab documentation clearly separates adaptable conventions (file location pattern, `x-*` field names, multi-source config) from fixed discovery mechanics, so a learner can repoint the lab at their own layout.

**Independent Test**: Follow the lab README's configuration section to identify which settings are adaptable vs. fixed, and confirm the documented `sources[]` multi-repo example is internally consistent with data-model.md's schema.

### Implementation for User Story 3

- [X] T029 [US3] Write `labs/lab-04-auto-registration/README.md` Overview/Prerequisites/Steps sections (Constitution Principle II process-oriented documentation) covering: install deps, add the backend module, configure `autoApiRegistration`, add sample files, start Backstage, verify discovery/update/removal/errors — following quickstart.md steps 1–8 (depends on T015, T024)
- [X] T030 [US3] Add the README's "Adaptable conventions vs. fixed mechanics" section (FR-010) explicitly identifying `rootPath`, `patterns`, and `xNamespace` as learner-adaptable, and the `EntityProvider`/full-then-delta mutation mechanism as fixed, in `labs/lab-04-auto-registration/README.md` (depends on T029)
- [X] T031 [P] [US3] Add the README's "Scaling to a real mono-repo" note (`mode: 'watch'`, `reconciliation.frequencySeconds`, mandatory `ignore` patterns, persisted scan-state cache vs. writing back into the mono-repo) per research.md R6, in `labs/lab-04-auto-registration/README.md` (depends on T029)
- [X] T032 [P] [US3] Add the README's "Scaling to multiple source repositories" note, including the explicit `sources: [{ id: default, ... }, { id: team-checkout-api, ... }]` example from data-model.md, and why `defaultOwner`/`xNamespace` have no global fallback while `defaultVisibility` does, per research.md R7, in `labs/lab-04-auto-registration/README.md` (depends on T029)
- [X] T033 [US3] Add the README's precedence-rule statement (FR-011: hand-authored `catalog-info.yaml` wins over auto-sourced metadata) and the Security Note required by Constitution Principle IX only if Lab 4 introduces new credential/auth configuration — confirm per plan.md's Constitution Check (none expected) and omit if not applicable, in `labs/lab-04-auto-registration/README.md` (depends on T029)
- [X] T034 [US3] Add the README's Verification and Troubleshooting sections (Lab Structure Standards) covering the manual checks already performed in T017/T028 plus common failure modes (stale scan-state cache after manual DB edits, glob pattern typos, wrong `xNamespace`), in `labs/lab-04-auto-registration/README.md` (depends on T030)

**Checkpoint**: All three user stories independently functional; README fully documents adaptable vs. fixed conventions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final repo-wide consistency checks that span multiple stories.

- [X] T035 [P] Confirm Labs 1–3's existing registered APIs (museum, streetlights, train-travel) remain untouched and still registered after the new backend module is added, per Constitution Principle VI
- [X] T036 Run the full quickstart.md validation sequence (steps 1–8) end-to-end against a clean `yarn start` of `labs/lab-01-base-backstage/backstage/` to confirm the lab works from a cold start, not just incrementally during development
- [X] T037 [P] Re-verify the Constitution Check table in plan.md against the final implementation (all 9 principles) and correct plan.md if any gate's justification no longer matches what was built

---

## Phase 7: Bug Fixes (from checklists/issues.md — Run 1, 2026/07/03)

**Purpose**: Fix the reported "No APIs were available in the catalog after starting backstage" issue. Root cause analysis of the pasted log:

- The `group:default/platform-team` owner-resolution failure (T020's validator, `InputError` on `galaxy-openapi.yaml`) is a *symptom*: `teams.yaml` — which defines `platform-team` — never loads, because its catalog location URL is 404ing.
- That 404, and the four other "Unable to read url" warnings (`teams.yaml`, `users.yaml`, `museum-api.yaml`, `streetlights-api.yaml`, `train-travel-api.yaml`... actually `platform-user.yaml` too), all point at `raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/...` — a stale feature-branch name left over from when Lab 3's instructions were followed. That content has since been merged to `main` (verified: present at `main:labs/lab-02-users-roles/catalog/teams.yaml` and `main:labs/lab-03-api-quality/catalog/platform-user.yaml`), so the branch-pinned URLs should point at `main` instead.
- With `teams.yaml` unreachable, `platform-team` never registers as a `Group`, so the Lab 4 owner validator (correctly) rejects `galaxy-openapi.yaml`'s `owner: group:default/platform-team` and emits a marker/error entity instead of a real one — leaving the catalog with no visible APIs.
- The one remaining branch-pinned location (`precedence-demo-catalog-info.yaml`, pointing at `004-lab-4-auto-registration`) is *not* a bug — it is new-on-this-branch content that genuinely requires the branch to be pushed to GitHub first, exactly as documented in `labs/lab-04-auto-registration/README.md` (the "This only works once you've pushed your branch" note). No code or config change fixes that one; it's a sequencing step the learner has to perform.

- [X] T038 Fix the five stale `003-api-quality`-branch catalog location URLs in `labs/lab-01-base-backstage/backstage/app-config.yaml` (lines ~130, 136, 142, 148, 154, 160, plus the two `spectralLinter` ruleset URLs at ~206–207) to point at `main` instead, since that content is already merged to `main`
- [X] T039 [P] Add a troubleshooting entry to `labs/lab-04-auto-registration/README.md`'s Troubleshooting section explaining the observed failure chain (stale/unpushed branch in an org-data or API catalog location → that entity never registers → any auto-sourced API whose `x-examplecorp.owner` references a group defined only in that unreachable location fails owner validation → looks like "no APIs in the catalog" even though the real cause is upstream of Lab 4's own code) so learners can self-diagnose instead of assuming the `EntityProvider` is broken
- [X] T040 Restart `labs/lab-01-base-backstage/backstage/` from a clean `yarn start` after T038 and confirm via backend logs and the catalog UI: `platform-team` resolves (no more `InputError` on `galaxy-openapi.yaml`), museum/streetlights/train-travel APIs and the `platform-team`/`platform-user` org entities all load without "Unable to read url" warnings, and the Galaxy API entity appears with `spec.owner: group:default/platform-team` (SC-001/SC-002); note that `precedence-demo-api` will still be absent unless the current branch has been pushed to GitHub, per T039's documented caveat
- [X] T041 Update `specs/004-lab-4-auto-registration/checklists/issues.md`: mark the Run 1 item resolved with a one-line pointer to T038–T040 once T040's re-verification passes

**Checkpoint**: Catalog populates on a clean start; the only remaining "gap" (precedence-demo-api before the branch is pushed) is expected and documented, not a bug.

---

## Phase 8: Bug Fixes (from checklists/issues.md — Run 2, 2026/07/06)

**Purpose**: Fix a regression introduced by the T015 cold-start fix (research.md R6 Corollary): "The cold start fix has broken all API catalog item loading." Root cause analysis:

- T015 added `await scheduler.triggerTask(taskId)` immediately after every `scheduler.scheduleTask(...)` call, to force the first discovery cycle to run at boot instead of waiting out a persisted `next_run_start_at` from a prior process.
- `triggerTask` (`@backstage/backend-defaults` `TaskWorker.trigger`) does `UPDATE ... WHERE id = taskId AND current_run_ticket IS NULL`, and throws a `ConflictError` if zero rows update — i.e. if the task is already running.
- On a brand-new task (fresh database, never scheduled before), `persistTask()` sets `next_run_start_at` to "now" already (no `initialDelay` is configured), so the scheduler's own background worker loop can win the race and start executing the task before the module's explicit `triggerTask` call reaches the database — the two calls are not sequenced against each other.
- That unguarded `throw` happens inside the `auto-api-registration` backend module's `init()`, which runs as part of the `catalog` plugin's init chain in the new backend system (`catalogProcessingExtensionPoint`). An uncaught rejection there fails that plugin's initialization outright, which is why *all* API catalog items stopped loading (not just the auto-registered ones) — not a defect in discovery/mapping logic itself.

- [X] T042 Guard both `scheduler.triggerTask(taskId)` calls (poll-mode task and watch-mode reconciliation task) in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (and the mirrored reference copy in `labs/lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistration.ts`) with a try/catch that swallows `ConflictError` from `@backstage/errors` (it means the task already started on its own — the desired outcome) while letting any other error propagate, so a lost race can no longer crash catalog plugin init (research.md R6 Corollary, depends on T015)
- [X] T043 [P] Add a troubleshooting entry to `labs/lab-04-auto-registration/README.md`'s Troubleshooting section covering this failure mode (all catalog entities missing, not just auto-registered ones, immediately after adding/changing the cold-start `triggerTask` call) and how to recognize it in backend logs (a `ConflictError`/"is currently running" error thrown during backend module init, not an `AutoApiRegistrationErrorProcessor` warning) (depends on T042)
- [X] T044 Restart `labs/lab-01-base-backstage/backstage/` from a clean `yarn start` (fresh database) after T042 and confirm via backend logs and the catalog UI: no `ConflictError` is thrown during startup, all previously-registered entities (museum/streetlights/train-travel/scalar-galaxy/precedence-demo-api plus org entities) load normally, and the auto-registered APIs are visible immediately rather than ~30s after the app-config locations (depends on T042)
- [X] T045 Update `specs/004-lab-4-auto-registration/checklists/issues.md`: add a Run 2 entry documenting this regression, resolved with a one-line pointer to T042–T044

**Checkpoint**: Cold start shows every entity (auto-registered and hand-authored) immediately, with no catalog plugin init failure — the T015 fix's original goal is preserved without the regression.

---

## Phase 9: Tighten Up Cold-Start Timing (research.md R6 Follow-up 2)

**Purpose**: T042 stopped the `triggerTask` race from crashing catalog init, but didn't close a remaining timing gap: if the triggered run executes *before* the catalog engine calls this provider's `connect(...)`, `runCycle()`'s existing `!this.connection` guard skips it (logged as "skipped a cycle — provider not yet connected"), and without a further fix, the only remaining path to run again is the next naturally scheduled cycle. At the lab's 30s default that's a minor annoyance; at a scaled deployment's much longer cadence (R6 — e.g. hourly), that's a genuinely noticeable wait for entities that could have been ready in under a second.

- [X] T046 Change `AutoApiRegistrationEntityProvider.connect()` in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (and the mirrored reference copy in `labs/lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistration.ts`) to kick off `runCycle()` itself when `!this.hasRunOnce`, so the first cycle is driven by the provider's own authoritative "I am now connected" signal rather than relying on winning a timing race with the scheduler's `triggerTask` call (research.md R6 Follow-up 2, depends on T042)
- [X] T047 Add an `inFlightCycle` dedup guard to `runCycle()` (rename the existing body to a private `doRunCycle()`, make `runCycle()` a thin wrapper that returns the shared in-flight promise) in the same two files, since T046 means the scheduler-triggered path and the connect()-triggered path can now legitimately race to call `runCycle()` around the same moment and must not both run a full scan concurrently (depends on T046)
- [X] T048 Restart `labs/lab-01-base-backstage/backstage/` from a clean `yarn start` (fresh database) after T046/T047 and confirm via backend logs: the "skipped a cycle — provider not yet connected" line (if it still occurs) is followed by a successful cycle within about a second (via `connect()`), not 30+ seconds later; no duplicate full-mutation logs; no `ConflictError` (depends on T047)

**Checkpoint**: The first discovery cycle runs as soon as the provider is structurally able to, independent of the scheduler's own cadence — closing the gap that would otherwise scale badly on a real deployment's much longer `scheduleFrequencySeconds`/`reconciliation.frequencySeconds`.

---

## Phase 10: Bug Fixes (from checklists/issues.md — Run 3, 2026/07/06)

**Purpose**: Fix "waited 2 scheduled poll cycles and the auto-registered APIs still hadn't loaded," a direct consequence of T046 (research.md R6 Follow-up 3). Root cause analysis:

- T046 made the first discovery cycle run as early as possible via `connect()`, which makes it *more* likely to race ahead of org-data loading (`teams.yaml`, fetched from a remote URL) than the old "wait for the next scheduled tick" behavior did.
- When that race is lost, an auto-registered file's owner doesn't resolve yet, and it's correctly registered as an error entity (R4) — a transient condition caused by catalog state, not a defect in the file itself.
- The existing `changedPaths` change-detection logic (T009, research.md R6 Problem 2) only re-examines a file when its `mtimeMs`/content hash changes — an unchanged file that previously errored was therefore silently excluded from all future cycles, so the transient error became permanently stuck even after the org data it depended on had loaded.

- [X] T049 Change the `changedPaths` filter in `labs/lab-01-base-backstage/backstage/packages/backend/src/extensions/autoApiRegistration.ts` (and the mirrored reference copy in `labs/lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistration.ts`) to always include a cached row with `last_error` set, regardless of `mtimeMs`, and skip the "content hash unchanged, no re-validation needed" short-circuit inside the mapping loop for such rows, so a previously-errored file is fully re-validated every cycle until it resolves or the file itself changes (research.md R6 Follow-up 3, depends on T046)
- [X] T050 Restart `labs/lab-01-base-backstage/backstage/` from a clean `yarn start` (fresh database) and confirm via backend logs and the catalog API: cycle 1 may still show the transient "Owner ... does not resolve" error (expected, since org-data loading isn't synchronized with this module), but by the next scheduled cycle both `scalar-galaxy` and `precedence-demo-api` are present with `spec.owner: group:default/platform-team` and no registration-error annotation (depends on T049)
- [X] T051 Update `specs/004-lab-4-auto-registration/checklists/issues.md`: add a Run 3 entry documenting this regression, resolved with a one-line pointer to T049–T050

**Checkpoint**: A registration error caused by transient catalog state (not the file's own content) self-heals on the next cycle instead of requiring the file to be touched or the cache to be wiped — true both at cold start and any time org data changes later.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion — no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational completion; extends the same file US1 built (T012), so in practice follows US1 sequentially even though it introduces no new *architectural* dependency
- **User Story 3 (Phase 5)**: Depends on US1 (T015) and US2 (T024) being implemented, since the README documents both the discovery mechanism and the metadata-sourcing/error behavior
- **Polish (Phase 6)**: Depends on all user stories being complete
- **Bug Fixes (Phase 7)**: Independent of Phases 3–6's code (config/docs-only fix) but logically follows Polish since it was found during Polish-phase (T036) cold-start validation

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational, but shares `autoApiRegistration.ts` with US1 (same file, sequential edits) — implement after US1 for a working MVP checkpoint first
- **User Story 3 (P3)**: Documentation-only; depends on US1 and US2 being functionally complete so the README describes real, working behavior

### Within Each User Story

- Mapping/extraction logic before mutation-emission logic before scheduling
- Sample files before manual verification steps
- Verification task last in each phase (checkpoint gate)

### Parallel Opportunities

- T002, T003 (Setup) in parallel
- T006, T007, T008 (Foundational: cache migration, discovery utility, parse utility) in parallel — distinct concerns, though ultimately land in the same file, so treat [P] as "logically independent," and serialize the actual edits if working solo
- T026, T027 (US2 sample files) in parallel with each other
- T031, T032 (US3 README sections) in parallel with each other
- T035, T037 (Polish) in parallel

---

## Parallel Example: Foundational Phase

```bash
# Logically independent foundational concerns (same target file — serialize edits if solo):
Task: "Implement scan-state cache DB migration in autoApiRegistrationMigrations/001_scan_state_cache.ts"
Task: "Implement streamed file discovery utility in autoApiRegistration.ts"
Task: "Implement YAML parse + shape-check utility in autoApiRegistration.ts"
```

## Parallel Example: User Story 2 Sample Files

```bash
Task: "Create precedence-demo-openapi.yaml"
Task: "Create precedence-demo-catalog-info.yaml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: T017 confirms discovery/create/update/remove work end-to-end with default metadata
5. Demo: a new spec file appears in the catalog with zero hand-authored `catalog-info.yaml`

### Incremental Delivery

1. Setup + Foundational → scanning/parsing/persistence plumbing ready
2. Add User Story 1 → validate independently (T017) → MVP demo
3. Add User Story 2 → validate independently (T028) → owner/lifecycle/visibility sourcing, error surfacing, precedence all work
4. Add User Story 3 → README documents adaptability → lab is learner-ready
5. Polish → cold-start validation, constitution re-check

### Notes

- US1 and US2 share one implementation file (`autoApiRegistration.ts`) because the architecture (research.md R1) is a single `EntityProvider` — this is a deliberate single-module design, not an accidental cross-story coupling. Each story still has an independently verifiable acceptance test (T017 vs. T028) even though the code lands in the same file.
- No test tasks are included (Tests: Not requested — see header). Verification is manual, per quickstart.md, folded into each story's final task.
- `watch` mode (research.md R6) and the multi-source sync-step extension point (research.md R7 Problem 4) are documented (T031/T032) but not built or exercised end-to-end — consistent with quickstart.md's explicit "Out of scope for this quickstart" section.
