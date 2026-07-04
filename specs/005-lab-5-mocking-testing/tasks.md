---

description: "Task list for Lab 5 — Mocking and Testing"
---

# Tasks: Lab 5 — Mocking and Testing

**Input**: Design documents from `/specs/005-lab-5-mocking-testing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this lab produces no external API contracts)

**Tests**: Not requested. Per plan.md's Testing section, verification is manual (browser + gateway logs) against quickstart.md's steps — consistent with Labs 1–4. No automated test tasks are generated; quickstart validation is folded into each story's checkpoint and the final Polish phase.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P2) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

This is a tutorial-lab project (not a generic web/mobile app). Three path roots are used:

- **Backstage instance** (modified in place, from Lab 1): `labs/lab-01-base-backstage/backstage/`
- **Lab 5 teaching content** (new, committed alongside README): `labs/lab-05-mocking-testing/`
- **Speckit artifacts**: `specs/005-lab-5-mocking-testing/` (this directory — no code changes here)

**Note**: This task list reflects a mid-plan architecture revision (research.md R2/R7). The original
design spawned one `prism` CLI process per discovered API; on review against Constitution Principle
VIII's amended scale requirement, that was found not to scale (500+ APIs → 500+ permanently-running
processes/ports). The design below instead uses a single, long-lived, lazily-loading mock gateway
process built on Prism's programmatic library.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies and scaffold the directories every later task writes into.

- [X] T001 Add `@stoplight/prism-http@5.15.11`, `@stoplight/http-spec@7.1.0`, `js-yaml`, and `concurrently` as root devDependencies of `labs/lab-01-base-backstage/backstage/package.json` (`yarn add -D` from the workspace root; research.md R2/R4)
- [X] T002 [P] Create the lab content directories `labs/lab-05-mocking-testing/code/scripts/` and `labs/lab-05-mocking-testing/code/packages/app/src/modules/apiMocking/`

**Checkpoint**: Dependencies installed, directories exist — ready for foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the module-registration point, the static gateway/proxy config, and the gateway script's discovery skeleton that both US1 (mock target injection) and US3 (credential pre-fill) extend. No user story is independently testable until this phase is done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Scaffold the `apiMocking` frontend module as a passthrough override of `apiDocsConfigRef` for the `openapi` widget type — renders the default `OpenApiDefinitionWidget` unchanged, no behavior added yet — in `labs/lab-05-mocking-testing/code/packages/app/src/modules/apiMocking/index.tsx` (research.md R1)
- [X] T004 Copy the scaffolded module to `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiMocking/index.tsx` and register it in `labs/lab-01-base-backstage/backstage/packages/app/src/apis.ts` (depends on T003)
- [X] T005 Add the static `mocking.gateway` config block (`port: 4010`, `maxCachedSpecs: 100`) and the single static `proxy.endpoints['/mock']` entry (`target: 'http://localhost:4010'`, matching `mocking.gateway.port`) to `labs/lab-01-base-backstage/backstage/app-config.yaml` (data-model.md, research.md R5)
- [X] T006 Scaffold `scripts/mock-gateway.mjs`: read `mocking.gateway.port` from `app-config.yaml`, bind an HTTP server on it, and build the discovery map (`entityNameSlug → specFilePath`) once at startup from Lab 4's `autoApiRegistration.rootPath`/`patterns` config — no parsing of any spec file yet (research.md R2/R3) — in `labs/lab-05-mocking-testing/code/scripts/mock-gateway.mjs`
- [X] T007 Wire the root `start` script (`concurrently` running the gateway alongside `backstage-cli repo start`; no `wait-on` needed since there is no generated config file to sequence against) in `labs/lab-01-base-backstage/backstage/package.json` (research.md R4, depends on T001)

**Checkpoint**: Module registration point exists and renders unchanged; gateway binds its port and builds the discovery map; static config and start-script wiring are in place — ready for US1.

---

## Phase 3: User Story 1 - Dynamically mock an API and try it from Backstage (Priority: P1) 🎯 MVP

**Goal**: A learner can start the local dev environment, see a "Local mock (Lab 5)" server option on any OpenAPI API's page, and execute a working "Try it out" request against it with no real backend involved — served lazily by a single gateway process regardless of how many APIs are registered.

**Independent Test**: Start `yarn start`, open the Museum API's page (its native `servers` entry is fictitious/non-resolvable), select the mock target, execute a sample request, and confirm a realistic example response comes back; confirm the gateway only parsed Museum's spec (not every discovered API) by checking its log; stop the gateway and confirm a clear connection error instead of a silent failure.

### Implementation for User Story 1

- [X] T008 [US1] Implement the request handler for `/<entityNameSlug>/*`: on a cache miss, read + `js-yaml`-parse the matched spec file and convert it via `@stoplight/http-spec`'s `transformOas3Operations(document)`; store the result in an LRU map bounded by `mocking.gateway.maxCachedSpecs` (evict least-recently-used on overflow); log the load and, for troubleshooting per research.md's flagged open item, the measured parse latency — in `labs/lab-05-mocking-testing/code/scripts/mock-gateway.mjs` (data-model.md Loaded Spec Cache, research.md R2/R7, depends on T006)
- [X] T009 [US1] Implement request/response translation and mock generation: build one gateway-lifetime `Prism.createInstance({ mock: { dynamic: false } })`, translate each incoming HTTP request into Prism's request descriptor, call `.request(descriptor, operations)` using the (now-cached) operations from T008, and translate the mock response back into a real HTTP response; return a clear 404 for an unknown slug — in `labs/lab-05-mocking-testing/code/scripts/mock-gateway.mjs` (research.md R2, depends on T008)
- [X] T010 [US1] Copy the completed `mock-gateway.mjs` into `labs/lab-01-base-backstage/backstage/scripts/mock-gateway.mjs` (depends on T009)
- [X] T011 [US1] Extend the `apiMocking` module to merge a `Local mock (Lab 5)` server entry into the rendered `servers` list for `openapi`-type entities — the entry's URL is `/api/proxy/mock/<entityNameSlug>`, computed purely from `entity.metadata.name` (via the same slug algorithm as the gateway's discovery map), so no per-entity configuration is required for a new API to get one — in `labs/lab-05-mocking-testing/code/packages/app/src/modules/apiMocking/index.tsx` (data-model.md, FR-001, depends on T003)
- [X] T012 [US1] Copy the updated module into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiMocking/index.tsx` (depends on T011, T004)
- [X] T013 [US1] Manually verify against a clean `yarn start` of `labs/lab-01-base-backstage/backstage/` (quickstart.md steps 6–7): the gateway log shows the discovery map built (N APIs discoverable) but nothing parsed yet; Museum's page shows `Local mock (Lab 5)` alongside its native URL; selecting it and executing a request returns a realistic example response (SC-001) and logs a first-load line with measured parse latency; a second request does not re-log a load (cache hit); stopping the gateway and retrying produces a clear connection error, not a silent failure (FR-008) (depends on T010, T012)

**Checkpoint**: User Story 1 fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Interact with an existing test implementation (Priority: P2)

**Goal**: A learner can select a real, already-running public sandbox server for an API (Galaxy) as the active request target, distinct from the local mock, with zero Lab 5 configuration required.

**Independent Test**: Open the Galaxy API's page, select one of its native sandbox servers instead of the mock, execute a request, and confirm the response comes from the real sandbox.

### Implementation for User Story 2

- [X] T014 [US2] Manually verify against `labs/lab-01-base-backstage/backstage/` (quickstart.md step 8): the Galaxy API's page already offers `galaxy.scalar.com` and `void.scalar.com` in its server dropdown with zero Lab 5 configuration, because they are already native to `labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml`'s `servers` list (FR-003, research.md R5); select one, execute a request, and confirm the response comes from the live sandbox, not the local mock (SC-002)
- [X] T015 [P] [US2] Verify the sandbox-unreachable edge case: temporarily point a test request at an invalid path/host for the sandbox target and confirm a clear, visible error is shown (not a silent failure or a broken-looking lab), per the edge case documented in spec.md

**Checkpoint**: User Stories 1 AND 2 both work independently — mock and sandbox targets are both selectable and functional.

---

## Phase 5: User Story 3 - Supply and manage non-production credentials (Priority: P2)

**Goal**: A learner can execute an authenticated request against a mock/test API with zero credential setup (a documented default is pre-filled), and can replace it with their own credential when they have one, without ever committing a personal credential to the repository.

**Independent Test**: Execute an authenticated request with no credential entered and confirm the documented default succeeds automatically; replace the pre-filled value in the Authorize dialog and confirm the replacement is what's actually sent.

### Implementation for User Story 3

- [X] T016 [US3] Add the `mocking.defaultCredential` config block (`scheme: bearer`, an obviously fictional value, e.g. `lab-mock-token-do-not-use`) to `labs/lab-01-base-backstage/backstage/app-config.yaml` (data-model.md, Constitution Principle IX)
- [X] T017 [US3] Extend the `apiMocking` module to read `mocking.defaultCredential` via `configApiRef` and pre-authorize Swagger UI's "Authorize" state on mount (`onComplete(system) => system.authActions.authorize(...)`), leaving the value fully editable/overridable through the same dialog — in `labs/lab-05-mocking-testing/code/packages/app/src/modules/apiMocking/index.tsx` (research.md R6, FR-006/FR-007, depends on T011)
- [X] T018 [US3] Copy the updated module into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiMocking/index.tsx` (depends on T017, T012)
- [X] T019 [US3] Manually verify against `labs/lab-01-base-backstage/backstage/` (quickstart.md step 9): an authenticated request against the mock/sandbox succeeds with zero learner setup, using the pre-filled default (SC-003); replacing the pre-filled value in the Authorize dialog and re-running confirms the replacement — not the default — is what's sent (SC-004); confirm no personal credential ever appears in `app-config.yaml` or any other committed file (depends on T016, T018)

**Checkpoint**: All three user stories independently functional — mock, sandbox, and credentials all verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Learner-facing documentation and final repo-wide consistency checks that span multiple stories.

- [X] T020 Write `labs/lab-05-mocking-testing/README.md` Overview/Prerequisites/Steps sections (Constitution Principle II) covering: install deps, scaffold/register the `apiMocking` module, add static `mocking`/`proxy` config, wire the `start` script, start Backstage, verify mock/sandbox/credential behavior — following quickstart.md steps 1–9, and linking to the committed `labs/lab-05-mocking-testing/code/scripts/mock-gateway.mjs` and `code/packages/app/src/modules/apiMocking/index.tsx` rather than inlining them (both exceed the ~40–50 line threshold) (depends on T013, T014, T019)
- [X] T021 Add the README's `## Security Note` section (Constitution Principle IX / Lab Structure Standards), placed before the `mocking.defaultCredential` configuration step, explaining the shortcut (a shared fictional credential committed to `app-config.yaml`) and the production alternative (secrets manager / vault-injected config, per-user credentials, never committing real credentials) (depends on T016)
- [X] T022 Add the README's "Why one gateway process, not one per API" section (Constitution Principle VIII, research.md R2/R7): a worked example, for learners, of designing a lab mechanism to scale — explain the superseded per-API-process design, why it failed the scale check at 500+ APIs, and why lazy load + a single bounded LRU cache fixes it without changing the lab's own demo behavior
- [X] T023 [P] Add the README's "Adaptable conventions vs. fixed mechanics" section (FR-010): gateway port, `maxCachedSpecs`, reliance on Lab 4's discovery glob, and the default credential value are adaptable; the `apiDocsConfigRef` override mechanism and the single-gateway architecture itself are fixed
- [X] T024 [P] Add the README's note on why AsyncAPI (Streetlights) has no mock option and will not get one from this mechanism (FR-005, out-of-scope edge case)
- [X] T025 Add the README's Verification and Troubleshooting sections (Lab Structure Standards) covering the manual checks already performed in T013/T014/T015/T019 plus common failure modes (gateway port already in use, a spec file that fails to parse on first request, `maxCachedSpecs` too low for a learner's own larger fork causing unexpected cache churn)
- [X] T026 Update root `README.md` (Lab Series table entry, Getting Started tree, Repository Structure tree) to reference `labs/lab-05-mocking-testing/` and `specs/005-lab-5-mocking-testing/`, per the Constitution's Lab Structure Standards — required for this lab to be considered complete
- [X] T027 [P] Verify the "generic by default" mechanism (quickstart.md step 10): temporarily add a third `*-openapi.yaml` file matching Lab 4's discovery pattern, restart `yarn start` (discovery is boot-time-only, so a restart is expected — research.md R7), confirm it automatically gets a `Local mock (Lab 5)` entry with zero Lab-5-specific configuration, confirm its spec is parsed only on its own first request (not eagerly), then remove the temporary file
- [X] T028 [P] Re-verify the Constitution Check table in plan.md against the final implementation (all 9 principles, with particular attention to Principle VIII's scale claims) and correct plan.md if any gate's justification no longer matches what was built
- [X] T029 Run the full quickstart.md validation sequence (steps 1–10) end-to-end against a clean `yarn start` of `labs/lab-01-base-backstage/backstage/` to confirm the lab works from a cold start, not just incrementally during development

---

## Phase 7: Bug Fix — Mock Requests 404/Fail End-to-End (issues.md Run 1 — 2026/07/04)

**Purpose**: Fix the root cause behind `specs/005-lab-5-mocking-testing/checklists/issues.md`'s Step 7 report (`GET /api/proxy/mock/museum-api/museum-hours` returned a 404 HTML page with zero gateway log activity). Reproduced live against a clean `yarn start` of `labs/lab-01-base-backstage/backstage/`: this is **two** distinct, previously-undocumented bugs, not one — the frontend module's URL never reaches the gateway at all in local dev, and even a direct backend request is rejected before it gets there.

**Root cause 1 — hardcoded relative proxy URL breaks across dev's two origins**: `apiMocking/index.tsx`'s `MockableOpenApiWidget` builds the mock server URL as the literal string `` `/api/proxy/mock/${entity.metadata.name}` `` (T011). In `yarn start`, the frontend (`http://localhost:3000`) and backend (`http://localhost:7007`) are different origins; a relative URL resolves against the *frontend's* origin, which has no route for it — Rspack's dev server serves its SPA fallback (or a bare 404, matching the exact behavior in issues.md) instead of ever reaching the backend's proxy plugin. Confirmed by curling `http://localhost:3000/api/proxy/mock/museum-api/museum-hours` (200, but it's `index.html`, not mock JSON) vs. the same path directly against `:7007` (reaches the real proxy plugin). This bug is latent in production too, where app and backend are typically same-origin behind a single server — which is why it wasn't caught by a static read of the code, only by running it.

**Root cause 2 — the `/mock` proxy endpoint requires Backstage credentials by default**: even hitting `:7007` directly returns `401 { "error": { "name": "AuthenticationError", "message": "Missing credentials" } }`. `@backstage/plugin-proxy-backend`'s default `credentials` policy (`require`) demands a Backstage user/service token on every proxied request unless an endpoint explicitly opts out. Swagger UI's "Try it out" issues a plain `fetch()`/`XMLHttpRequest` with no Backstage token attached (it isn't a Backstage frontend calling through `fetchApiRef`), so every mock request — from a real learner in the browser, not just curl — would 401 even after Root cause 1 is fixed. `config.d.ts`'s own `credentials` union documents exactly this case: `'dangerously-allow-unauthenticated'`, "No Backstage credentials are required to access this proxy target."

- [X] T030 Add `credentials: 'dangerously-allow-unauthenticated'` to the `/mock` proxy endpoint in `labs/lab-01-base-backstage/backstage/app-config.yaml` (same block T005 added), and update the matching YAML snippet under "Step 3 — Add Static Configuration" in `labs/lab-05-mocking-testing/README.md`; add one sentence there explaining why (the mock gateway has no real data/side effects behind it — same justification already used for the Security Note's shared default credential — and Swagger UI's plain `fetch()` never carries a Backstage token, so the default `require` policy would 401 every request regardless of Root cause 1)
- [X] T031 [P] In `labs/lab-05-mocking-testing/code/packages/app/src/modules/apiMocking/index.tsx`, replace the hardcoded `` `/api/proxy/mock/${entity.metadata.name}` `` with a URL built from `discoveryApiRef`'s `getBaseUrl('proxy')` (import `discoveryApiRef`, `useApi` from `@backstage/core-plugin-api`): call `useApi(discoveryApiRef)` in `MockableOpenApiWidget`, resolve the proxy base URL in a `useEffect` into state (`useState<string>()`), and build `mockUrl` as `` `${proxyBaseUrl}/mock/${entity.metadata.name}` `` inside the existing `useMemo`, gated on `proxyBaseUrl` being resolved (render the unmodified `OpenApiDefinitionWidget` — same fallback path already used for an unparseable spec — until it is)
- [X] T032 Copy the updated module from T031 into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiMocking/index.tsx` (depends on T031, same copy relationship as T012/T018)
- [X] T033 Manually re-verify against a clean `yarn start` of `labs/lab-01-base-backstage/backstage/`: repeat issues.md's exact repro (`curl 'http://localhost:3000/api/proxy/mock/museum-api/museum-hours?startDate=2024-02-01&page=1&limit=7'`) and confirm a real mock JSON response plus a matching `[mock-gateway] loading "museum-api" ...` log line; then repeat Step 7 through the browser UI (select **Local mock (Lab 5)**, Execute) to confirm the fix holds for Swagger UI's own request path, not just curl (depends on T030, T032)
- [X] T034 [P] Add a research.md correction entry (following the existing "A correction worth knowing about" convention in the README, and R6's own style) documenting both root causes under research.md, so a future reader sees why `discoveryApiRef` and `dangerously-allow-unauthenticated` are load-bearing, not incidental choices (depends on T033)
- [X] T035 Mark the Step 7 item in `specs/005-lab-5-mocking-testing/checklists/issues.md` resolved with a one-line pointer to T030–T032 (depends on T033)

**Checkpoint**: `specs/005-lab-5-mocking-testing/checklists/issues.md`'s open item is closed, with both the symptom (curl repro) and the underlying mechanism (dev-mode cross-origin + proxy auth policy) fixed and documented.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion — no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational completion only (uses Galaxy's pre-existing native `servers`, no shared code with US1)
- **User Story 3 (Phase 5)**: Depends on Foundational completion; extends the same file US1 built (T011), so in practice follows US1 sequentially even though it introduces no new *architectural* dependency
- **Polish (Phase 6)**: Depends on all three user stories being complete
- **Bug Fix (Phase 7)**: Depends on Phase 6 having been completed at least once (it corrects behavior T013/T029 already exercised); independent of any single user story's phase gate — it touches US1's mock-URL path but is tracked separately since it originates from a post-implementation field report (issues.md), not from spec.md

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational — fully independent of US1/US3 (no shared code)
- **User Story 3 (P2)**: Can start after Foundational, but shares `apiMocking/index.tsx` with US1 (same file, sequential edits) — implement after US1 for a working MVP checkpoint first

### Within Each User Story

- Gateway/module extension before the copy-into-Backstage-instance task
- Manual verification task last in each phase (checkpoint gate)

### Parallel Opportunities

- T015 (US2 edge case) in parallel with T014 (US2 primary verification) once both are ready to run
- T023, T024 (Polish README sections) in parallel with each other
- T027, T028 (Polish) in parallel
- T030 (config fix) in parallel with T031 (module fix) — different files, no shared dependency until T032/T033

---

## Parallel Example: User Story 2 Verification

```bash
Task: "Verify Galaxy sandbox target selection and response"
Task: "Verify sandbox-unreachable edge case"
```

## Parallel Example: Polish README Sections

```bash
Task: "Add Adaptable conventions vs. fixed mechanics section"
Task: "Add AsyncAPI-out-of-scope note"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: T013 confirms gateway discovery, lazy load + caching, target selection, and error handling all work end-to-end
5. Demo: the Museum API's page offers a working local mock with no real backend involved, served by a single gateway process that never touches specs nobody is testing

### Incremental Delivery

1. Setup + Foundational → module-registration point, static config, and gateway discovery skeleton ready
2. Add User Story 1 → validate independently (T013) → MVP demo
3. Add User Story 2 → validate independently (T014/T015) → sandbox target selection confirmed, zero new code
4. Add User Story 3 → validate independently (T019) → default credential + override confirmed
5. Polish → README (including the scale-design worked example), Security Note, root README update, cold-start validation, constitution re-check

### Notes

- US1 and US3 share one implementation file (`apiMocking/index.tsx`) because both extend the same
  `apiDocsConfigRef` override introduced in Foundational — a deliberate single-module design, not
  an accidental cross-story coupling. Each story still has an independently verifiable acceptance
  test (T013 vs. T019) even though the code lands in the same file.
- US2 requires no code changes at all — Galaxy's native `servers` list already satisfies it
  (research.md R5) — so its phase is verification-only, confirming the "no additional
  configuration" claim in FR-003 rather than building anything new.
- No test tasks are included (Tests: Not requested — see header). Verification is manual, per
  quickstart.md, folded into each story's final task(s).
- This task list supersedes an earlier draft built around one `prism` CLI process per API; that
  design was reworked (research.md R2/R7) after review against Constitution Principle VIII's scale
  requirement, before any implementation tasks were executed — see the note under Path Conventions.
