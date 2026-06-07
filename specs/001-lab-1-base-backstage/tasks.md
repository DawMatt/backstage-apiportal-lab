---
description: "Task list for Lab 1 — Base Backstage Implementation"
---

# Tasks: Lab 1 — Base Backstage Implementation

**Input**: Design documents from `specs/001-lab-1-base-backstage/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: No automated tests — this is a tutorial lab. Verification is manual via the
Backstage UI per the quickstart.md checklist.

**Organization**: Tasks are grouped by user story. Each story produces independently
testable lab content.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task serves (US1–US4)
- All file paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Create the repository structure that all lab content will live under.

- [x] T001 Create directory structure: `labs/lab-01-base-backstage/`, `labs/lab-01-base-backstage/apis/museum/`, `labs/lab-01-base-backstage/apis/streetlights/`
- [x] T002 [P] Add `labs/*/backstage/` to the root `.gitignore` file (create `.gitignore` if not present) to exclude student-created Backstage apps from version control
- [x] T003 Create skeleton `labs/lab-01-base-backstage/README.md` with the five required headings per the Lab Structure Standards in the constitution: `## Overview`, `## Prerequisites`, `## Step-by-step Instructions`, `## Verification`, `## Troubleshooting` (depends on T001 — directory must exist first)

---

## Phase 2: Foundational (Sample API Assets)

**Purpose**: Create the pre-committed API specification files and catalog descriptors that
all user story instructions will reference. MUST be complete before lab instructions can
be written accurately.

**⚠️ CRITICAL**: All README instruction tasks (Phase 3+) depend on these files existing
with correct content.

- [x] T004 [P] Source the Museum API OpenAPI 3.1 specification from `https://github.com/Redocly/museum-openapi-example` and save it as `labs/lab-01-base-backstage/apis/museum/openapi.yaml`. Verify: valid YAML, no external `$ref`s, `info.title` present. (Constitution Principle VII — no Petstore)
- [x] T005 [P] Create `labs/lab-01-base-backstage/apis/museum/catalog-info.yaml` using the reference contract at `specs/001-lab-1-base-backstage/contracts/catalog-info-openapi.yaml`. Set `metadata.name: museum-api`, `spec.type: openapi`, `spec.definition.$text: ./openapi.yaml`.
- [x] T006 [P] Source the Streetlights AsyncAPI 2.6 specification (from the AsyncAPI GitHub examples: `https://github.com/asyncapi/spec/blob/master/examples/streetlights-kafka.yml` or equivalent) and save it as `labs/lab-01-base-backstage/apis/streetlights/asyncapi.yaml`. Verify: valid YAML, no external `$ref`s, `info.title` present, `asyncapi: 2.6.0`.
- [x] T007 [P] Create `labs/lab-01-base-backstage/apis/streetlights/catalog-info.yaml` using the reference contract at `specs/001-lab-1-base-backstage/contracts/catalog-info-asyncapi.yaml`. Set `metadata.name: streetlights-api`, `spec.type: asyncapi`, `spec.definition.$text: ./asyncapi.yaml`.

**Checkpoint**: API assets ready — both spec files and both catalog descriptors exist with correct content.

---

## Phase 3: User Story 1 — Install and Run Backstage Locally (Priority: P1) 🎯 MVP

**Goal**: Write the lab content that teaches a developer to install and run Backstage locally
using `npx @backstage/create-app`.

**Independent Test**: A developer can follow the Overview, Prerequisites, and the US1
portion of Instructions, then open a browser and see the Backstage home screen at
`http://localhost:3000` — without needing to complete US2/US3/US4.

### Implementation for User Story 1

- [x] T008 [US1] Write the `## Overview` section of `labs/lab-01-base-backstage/README.md`. Include: what Backstage is (one sentence), what the lab teaches (catalog-as-code, API registration, search), and what the student will have at the end (a running Backstage instance showing two sample APIs).
- [x] T009 [US1] Write the `## Prerequisites` section of `labs/lab-01-base-backstage/README.md`. List all three prerequisites with version verification commands and free download links for both Windows and macOS: (1) Node.js 20 LTS (`node --version`, nodejs.org), (2) Yarn Classic v1 (`yarn --version`, `npm install -g yarn`), (3) Git (`git --version`, git-scm.com). Explain WHY each prerequisite is needed.
- [x] T010 [US1] **Prerequisite**: run `npm view @backstage/create-app version` (requires internet) to identify the current stable version, then record it in `research.md` under Decision 3 as the pinned version for all lab instructions. Write the "Create the Backstage app" step in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Show `npx @backstage/create-app@<version>` using the pinned version just recorded. Use `backstage` as the app name when prompted. Explain what the scaffolder creates and why the directory is created inside `labs/lab-01-base-backstage/`.
- [x] T011 [US1] Write the "Start Backstage" step in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Show `cd backstage && yarn start`. Document that frontend runs on port 3000 and backend on port 7007. Explain what `yarn start` starts (concurrent frontend + backend). Include Windows `cd backstage; yarn start` variant if behaviour differs.
- [x] T012 [US1] Write the US1 verification checkpoint in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md` (inline, immediately after T011's step). Instruct the student to open `http://localhost:3000` and describe what the Backstage home screen looks like. State clearly: "If you see this screen, Backstage is running correctly. Proceed to the next step."

**Checkpoint**: US1 complete — student can install and verify Backstage independently.

---

## Phase 4: User Story 2 — Register Sample OpenAPI Specification (Priority: P2)

**Goal**: Write the lab content that teaches the developer to register the Museum API into
the Backstage catalog using the catalog-as-code pattern.

**Independent Test**: After completing Phase 3 + this phase, the student can navigate to the
APIs section and see the Museum API listed — without needing to complete US3/US4.

### Implementation for User Story 2

- [x] T013 [US2] Write the "Register the Museum API" step in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Explain what a `catalog-info.yaml` descriptor is and WHY it exists (catalog-as-code). Show the content of `labs/lab-01-base-backstage/apis/museum/catalog-info.yaml` (already created in T005). Show the `app-config.yaml` edit using the snippet from `specs/001-lab-1-base-backstage/contracts/app-config-catalog-snippet.yaml` (the museum entry only). Explain the `../../apis/museum/` relative path so students understand how Backstage resolves it.
- [x] T014 [US2] Write the US2 verification checkpoint in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Instruct the student to restart `yarn start` (Ctrl+C, then `yarn start` again), navigate to the APIs section, find "Museum API", click it, and confirm the spec renders (paths and schemas visible). State clearly: "If you can see the Museum API spec rendered in Backstage, registration was successful."

**Checkpoint**: US2 complete — Museum API visible and spec renders independently.

---

## Phase 5: User Story 3 — Register Sample AsyncAPI Specification (Priority: P3)

**Goal**: Write the lab content that teaches the developer to register the Streetlights
AsyncAPI specification, demonstrating Backstage's multi-format catalog support.

**Independent Test**: After completing US2 + this phase, both APIs appear in the catalog
and the Streetlights entry renders its AsyncAPI specification (channels visible).

### Implementation for User Story 3

- [x] T015 [US3] Write the "Register the Streetlights API" step in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Show adding the second entry from `specs/001-lab-1-base-backstage/contracts/app-config-catalog-snippet.yaml` to `app-config.yaml`. Explain the `spec.type: asyncapi` distinction and WHY Backstage supports multiple API paradigms (key learning point per Constitution Principle I).
- [x] T016 [US3] Write the US3 verification checkpoint in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Instruct the student to restart `yarn start`, navigate to the APIs section, and confirm both "Museum API" and "Streetlights API" are listed. Click the Streetlights entry and confirm the AsyncAPI spec renders (channels and message schemas visible).

**Checkpoint**: US3 complete — both APIs visible and renderable independently.

---

## Phase 6: User Story 4 — Search for APIs (Priority: P4)

**Goal**: Write the lab content that demonstrates APIs are discoverable via Backstage's
built-in search — not just browsable in the catalog.

**Independent Test**: The student uses the search bar to find both APIs by name and keyword,
confirming search results appear without prior navigation to the API section.

### Implementation for User Story 4

- [x] T017 [US4] Write the "Search for APIs" step in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Explain that Backstage's search indexes the catalog automatically. Show how to open search (magnifying glass icon or `/` shortcut). Explain WHY search discoverability matters (the point of a developer portal is discovery, not just storage).
- [x] T018 [US4] Write the US4 verification checkpoint in the `## Step-by-step Instructions` section of `labs/lab-01-base-backstage/README.md`. Provide three specific search queries to try: "museum" (returns Museum API), "streetlights" (returns Streetlights API), "sample" (returns both). Describe the expected search result format. State this as the final lab verification.

**Checkpoint**: US4 complete — both APIs discoverable by name and keyword.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete the README, validate cross-platform correctness, and verify all
artefacts meet quality gates before the lab is considered done.

- [x] T019 Write the `## Troubleshooting` section of `labs/lab-01-base-backstage/README.md`. Cover: (1) Port 3000 or 7007 already in use — show `lsof -i :3000` (macOS) and `netstat -ano | findstr :3000` (Windows) plus how to change Backstage ports; (2) Node.js or Yarn not found — link back to Prerequisites; (3) YAML indentation errors in `app-config.yaml` — recommend a YAML linter; (4) APIs not appearing after restart — check for typos in the target path.
- [x] T020 Cross-platform review of `labs/lab-01-base-backstage/README.md`: read through every shell command and confirm each has a Windows variant where the syntax differs (e.g., `Ctrl+C` to stop, forward slashes in paths). Confirm no macOS-only assumptions (e.g., `brew`, `open`) appear without Windows equivalents.
- [x] T021 [P] Validate `labs/lab-01-base-backstage/apis/museum/openapi.yaml`: confirm valid YAML, `openapi:` key is `3.0.x` or `3.1.x`, `info.title` and `info.version` present, no `$ref` values pointing to external URLs or absolute paths.
- [x] T022 [P] Validate `labs/lab-01-base-backstage/apis/streetlights/asyncapi.yaml`: confirm valid YAML, `asyncapi:` key is `2.6.0`, `info.title` present, at least one channel defined, no external `$ref`s.
- [ ] T023 Run the quickstart.md validation checklist at `specs/001-lab-1-base-backstage/quickstart.md` end-to-end on macOS. Record the actual completion time in the Notes section. If any step fails, fix the relevant README section before marking this task complete.
- [ ] T024 Run the quickstart.md validation checklist at `specs/001-lab-1-base-backstage/quickstart.md` end-to-end on Windows (using Git Bash or PowerShell). Record the actual completion time in the Notes section alongside the macOS result. If any Windows-specific step fails, fix the relevant README section before marking this task complete. (Completes SC-001 and SC-004 coverage alongside T023.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (directories must exist)
- **US1 (Phase 3)**: Depends on Foundational completion — README tasks reference the API assets
- **US2 (Phase 4)**: Depends on US1 completion — instructions are sequential in the README
- **US3 (Phase 5)**: Depends on US2 completion
- **US4 (Phase 6)**: Depends on US3 completion
- **Polish (Phase 7)**: Depends on all story phases completing

### Within Phases

- Phase 1: T001 first (creates directories), then T002 in parallel with T001; T003 after T001 only
- Phase 2: T004, T005, T006, T007 all in parallel (different files)
- Phases 3–6: README tasks are sequential within each phase (single file)
- Phase 7: T019, T020 sequential (README); T021, T022 parallel (different files); T023 macOS validation; T024 Windows validation (can run in parallel with T023 if two platforms available)

### Parallel Opportunities

```bash
# Phase 2 — all four API asset tasks can run simultaneously:
Task T004: labs/lab-01-base-backstage/apis/museum/openapi.yaml
Task T005: labs/lab-01-base-backstage/apis/museum/catalog-info.yaml
Task T006: labs/lab-01-base-backstage/apis/streetlights/asyncapi.yaml
Task T007: labs/lab-01-base-backstage/apis/streetlights/catalog-info.yaml

# Phase 7 — validation tasks:
Task T021: validate museum/openapi.yaml
Task T022: validate streetlights/asyncapi.yaml
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — README accuracy depends on this)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Follow T008–T012 instructions on a clean machine — can you install and see Backstage?
5. Proceed to US2 only after US1 validates

### Incremental Delivery

1. Setup + Foundational → assets ready
2. US1 → verify Backstage installs → README up to "Start Backstage"
3. US2 → verify Museum API registers → README up to first API
4. US3 → verify Streetlights API registers → README up to both APIs
5. US4 → verify search → README complete
6. Polish → cross-platform check + validation (T023 macOS, T024 Windows) → lab ready to publish

---

## Notes

- [P] tasks = different files, no blocking dependencies — safe to run concurrently
- [Story] label maps each task to its user story for traceability to spec.md
- No automated tests — this project type (tutorial lab) is verified manually via quickstart.md
- Constitution Principle VII applies to T004 and T006: source only modern, purposeful API examples
- Constitution Principle III applies to T009, T010, T011, T019: every shell command needs Windows + macOS variants
- Constitution Principle II applies to all README writing tasks: explain the WHY, not just the WHAT
