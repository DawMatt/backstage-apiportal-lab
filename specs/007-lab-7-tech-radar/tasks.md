---

description: "Task list for Lab 7 — Other Documentation (Tech Radar)"
---

# Tasks: Lab 7 — Other Documentation (Tech Radar)

**Input**: Design documents from `/specs/007-lab-7-tech-radar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this lab produces no external API contracts)

**Tests**: Not requested. Per plan.md's Testing section, verification is manual (browser, per quickstart.md's steps) — consistent with Labs 1–6. No automated test tasks are generated.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable independent implementation and testing of each story.

**Documentation placement note**: Unlike Labs 1–6 (where all README prose was written in one Polish pass), this lab's own spec explicitly makes documentation part of each story's independent test — US2's test is "following the lab's **documented** steps", and US3's entire deliverable *is* documentation (FR-008, SC-005). README sections for register/move/retire (US2) and ring/quadrant semantics (US3) are therefore written within their owning story's phase, not deferred to Polish. Only cross-cutting doc work (design-rationale "Why" sections, Adaptable Conventions, root README wiring) stays in the final Polish phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

This is a tutorial-lab project (not a generic web/mobile app). Two path roots are used:

- **Backstage instance** (modified in place, from Lab 1; gitignored, not committed): `labs/lab-01-base-backstage/backstage/`
- **Lab 7 teaching content** (new, committed alongside README): `labs/lab-07-tech-radar/`
- **Speckit artifacts**: `specs/007-lab-7-tech-radar/` (this directory — no code changes here)

**Note**: This lab is purely additive — it does not edit any file committed by Labs 1–6, and adds
no backend module or catalog entity of any kind (research.md R1, R5; plan.md Constraints).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the directory every later task writes into, and confirm the one new
dependency installs cleanly.

- [X] T001 Create the lab content directory
      `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/`
- [X] T002 In the student's Backstage instance
      (`labs/lab-01-base-backstage/backstage/packages/app/`), run
      `yarn add @backstage-community/plugin-tech-radar` (pinned `^1.20.0` at time of writing) —
      frontend only; do **not** add `@backstage-community/plugin-tech-radar-backend`
      (research.md R1)

**Checkpoint**: Dependency installs; lab content directory exists — foundational work can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the plugin into the new frontend system with this lab's own static data source
instead of its network-calling default, and populate that data source with a full sample radar.
No user story can be demonstrated until the radar renders with real content.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Create `radarData.json` in
      `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/radarData.json`: the full
      `TechRadarLoaderResponse` shape (data-model.md) — 4 quadrants (`techniques`/Techniques,
      `tools`/Tools, `platforms`/Platforms, `languages-frameworks`/Languages & Frameworks) and 4
      rings (`adopt`/Adopt, `trial`/Trial, `assess`/Assess, `hold`/Hold, each with a one-sentence
      `description` for FR-008/US3), populated with sample entries drawn from this lab series'
      own vocabulary (research.md R3): e.g. "Design-first OpenAPI" (Techniques/Adopt), "Spectral
      linting in CI" (Techniques/Trial, references Lab 3), "Backstage Software Catalog"
      (Tools/Adopt), "Prism mock servers" (Tools/Trial, references Lab 5), "Self-hosted Backstage"
      (Platforms/Adopt), "AsyncAPI 3.0" (Languages & Frameworks/Assess), "SOAP/WSDL for new APIs"
      (Languages & Frameworks/Hold, with a two-element `timeline` and `moved: -1` on the latest
      snapshot to demonstrate the movement indicator per FR-005). Every quadrant and every ring
      MUST have at least one entry (FR-009/SC-002)
- [X] T004 [P] Create `techRadarApi.ts` in
      `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/techRadarApi.ts`: a
      `TechRadarApi` implementation (`StaticTechRadarApi`) whose `load()` statically imports
      `radarData.json` and returns `TechRadarLoaderResponseParser.parse(radarData)` (from
      `@backstage-community/plugin-tech-radar-common`) — no network call, no backend package
      (research.md R1, R2, R5)
- [X] T005 Create `index.ts` in
      `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/index.ts`: a
      `createFrontendModule` (`pluginId: 'tech-radar'`) whose sole extension is
      `techRadarApi.override({ params: ... })` (imported from
      `@backstage-community/plugin-tech-radar/alpha`), wiring `techRadarApiRef` to T004's
      `StaticTechRadarApi` — **no `app-config.yaml` change needed**: `.override()` replaces the
      default extension's factory in place (research.md R5, corrected at implementation time —
      the plugin's alpha extensions are natively `OverridableExtensionDefinition`s, simpler than
      the disable-via-config approach originally planned). Also re-exports the plugin's
      unmodified `techRadarPlugin` default (page/routing) for `App.tsx` to install alongside it
      (depends on T004)
- [X] T006 Copy `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/` into the
      student's `labs/lab-01-base-backstage/backstage/packages/app/src/modules/techRadar/`;
      register both `techRadarPlugin` and `techRadarModule` in that instance's `App.tsx`
      `features` array (depends on T005)
- [X] T007 Verify plumbing: `node_modules/.bin/tsc --noEmit -p .` in the student's Backstage
      instance reports zero errors under `modules/techRadar/` (confirmed — the 8 pre-existing
      errors found belong to Labs 2/3/5/6 modules, unrelated to this lab) (depends on T006)

**Checkpoint**: The Tech Radar page renders the full sample dataset from `radarData.json` — every
user story below builds on this.

---

## Phase 3: User Story 1 - Publish an organization Tech Radar (Priority: P1) 🎯 MVP

**Goal**: Confirm the radar page itself satisfies the lab's core deliverable — reachable,
rendered, and browsable — using only what Foundational already built (this plugin provides its
own page rendering, so no new code is needed for this story).

**Independent Test**: Start Backstage after completing the lab and navigate to the Tech Radar page
from the sidebar; the radar renders with quadrants and rings populated with sample entries,
without needing any other lab feature to be present.

### Implementation for User Story 1

- [X] T008 [US1] Verify (quickstart.md US1 steps 1–3): the Tech Radar sidebar entry is reachable,
      the page renders all 4 quadrants and all 4 rings with labels — confirmed via headless
      browser screenshot (Backstage guest sign-in → `/tech-radar`)
- [X] T009 [US1] Verify (quickstart.md US1 step 4): clicking an individual blip ("Spectral
      linting in CI") shows its title, description, and full ring-history table — confirmed via
      screenshot
- [X] T010 [US1] Verify (quickstart.md US1 step 5): every quadrant and every ring has at least one
      visible blip (SC-002) — confirmed in the rendered screenshot (all 4 quadrant columns show
      populated Adopt/Trial/Assess/Hold entries with none showing "(empty)" everywhere); the
      $0-cost/offline setup itself (T001–T007) took well under 20 minutes (SC-001)

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Register a new blip (Priority: P2)

**Goal**: A learner can register, move, and retire a blip by editing only `radarData.json`,
following documented steps — and understands the two edge-case failure modes.

**Independent Test**: Following the lab's documented steps, add a new entry to `radarData.json`
and reload Backstage; the new blip appears on the radar in the correct quadrant and ring without
any other change to the plugin configuration.

### Implementation for User Story 2

- [X] T011 [P] [US2] Write `labs/lab-07-tech-radar/README.md`'s "Register a new blip" step:
      instructions to add a new object to `radarData.json`'s `entries[]` (data-model.md's
      `RadarEntry` shape) and reload — FR-007
- [X] T012 [P] [US2] Write the README's "Move a blip to a different ring" step: append a new
      `timeline` element with a later `date`, a different `ringId`, and `moved: 1`/`-1` as
      appropriate (data-model.md's Lifecycle mapping table) — FR-005, FR-007
- [X] T013 [P] [US2] Write the README's "Retire a blip" step: delete its entry from `entries[]`
      entirely — no archive, per spec Assumptions — FR-007
- [X] T014 [US2] Write the README's Troubleshooting entries for both edge cases (data-model.md
      Validation rules, corrected by live testing): (a) malformed JSON / a missing required field
      throws a visible Zod validation error panel directly on the page, naming the exact field
      (e.g. `path: ["entries",0,"title"]`), and (b) a `quadrant`/`ringId` that doesn't match a
      declared `id` crashes the **entire radar page** with a full-page error overlay reading
      `Unknown quadrant/ring undefined for entry <id>!` — not a silent per-blip failure (depends
      on T011–T013 existing as the surrounding step context)
- [X] T015 [US2] Verify (quickstart.md US2 "Register"): added a temporary sample entry to the
      live instance's `radarData.json`, confirmed it rendered in the correct quadrant/ring, then
      removed it (SC-003)
- [X] T016 [US2] Verify (quickstart.md US2 "Move"): confirmed via the shipped "Spectral linting
      in CI" entry's two-snapshot timeline — its detail view shows the Assess→Trial transition
      with the ↑ moved-up indicator and both dated history rows (SC-004)
- [X] T017 [US2] Verify (quickstart.md US2 "Retire"): removed the temporary entry added in T015,
      confirmed it no longer appeared anywhere on the radar after reload (SC-006)
- [X] T018 [US2] Verify (quickstart.md US2 edge cases): confirmed live — a missing `title` field
      produces a visible in-page Zod error panel; a bogus `quadrant` or `ringId` crashes the whole
      radar page with a full-page error overlay (`Unknown quadrant/ring undefined for entry <id>!`)
      — both temporary changes reverted afterward, `radarData.json` confirmed byte-identical to
      the committed lab copy

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Understand adoption ring semantics (Priority: P3)

**Goal**: A learner unfamiliar with the Tech Radar model can read the README and correctly explain
what each ring means and how the movement indicator works, without looking at the running page.

**Independent Test**: A learner unfamiliar with Tech Radar can read the lab's documentation
section and correctly explain, without looking at the diagram, what each ring means and how a
"moved" indicator is represented.

### Implementation for User Story 3

- [X] T019 [US3] Write the README's ring/quadrant definitions section: a one-sentence,
      plain-language definition for each of Adopt/Trial/Assess/Hold (matching each ring's
      `description` field in `radarData.json`, T003) and each of the four quadrants — FR-008
- [X] T020 [US3] Write the README's explanation of the movement indicator: `moved: 1` = toward
      Adopt (more mature), `moved: -1` = toward Hold (less mature), `0`/omitted = unchanged
      (data-model.md's `RadarEntryTimeline`) — FR-005, FR-008
- [X] T021 [US3] Verify (quickstart.md US3): the README's "Understanding the Rings and Quadrants"
      section states each ring's meaning and the movement-indicator convention in
      plain language, without requiring the reader to view the running page (SC-005)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and repository-wide consistency not tied to a single story.

- [X] T022 [P] Write `labs/lab-07-tech-radar/README.md`'s Overview/Prerequisites/Install steps
      (Constitution Principle II, FR-006, FR-010): the plugin's exact package name/version
      (`@backstage-community/plugin-tech-radar` `^1.20.0`), the frontend-only install command
      (T002), and why no backend package or account is required
- [X] T023 [P] Add the README's "Why" sections explaining decisions that aren't self-evident from
      the code: why the backend package (`plugin-tech-radar-backend`) is deliberately not
      installed (research.md R1 — offline/network concern), why radar content is a JSON data file
      rather than a `.ts` module unlike every prior lab's pattern (research.md R2 — explicit
      requirement that content be git-managed data, not source-code edits), why the default
      (backend-calling) API extension is overridden via the plugin's own `.override()` mechanism
      rather than left installed (research.md R5), and why the classic Thoughtworks
      quadrants/rings were kept unmodified (research.md R3)
- [X] T024 [P] Add the README's "Adaptable Conventions vs. Fixed Mechanics" section (Constitution
      Principle VIII): `radarData.json`'s content (quadrants, rings, entries, sample vocabulary)
      is freely adaptable; the `techRadarApi.ts`/`index.ts` plumbing and the
      `TechRadarLoaderResponseParser`-based validation are the fixed mechanism to replicate
- [X] T025 Update the root `README.md`: add Lab 7's row to the Lab Series table (no longer
      "coming soon"), and add entries to both the Getting Started tree and the Repository
      Structure tree for `labs/lab-07-tech-radar/` and `specs/007-lab-7-tech-radar/`, per the
      Constitution's Lab Structure Standards
- [X] T026 Ran quickstart.md's full verification checklist end-to-end against the real, already-
      running Backstage instance (built on top of the existing Lab 1–6 environment already present
      in this workspace): sidebar entry, full quadrant/ring coverage, blip detail view with
      history/movement indicator, register, move, retire, and both edge cases (Zod error panel,
      full-page quadrant/ring crash) all confirmed live via headless-browser screenshots —
      SC-001 through SC-006 all hold. `radarData.json` confirmed reverted to its clean,
      committed 7-entry baseline afterward

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (the plugin
  must be wired to a populated, validated data source before any story can be demonstrated)
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - US1 (P1) has no implementation tasks beyond verification — the plugin's own page rendering
    already satisfies it once Foundational is done
  - US2 (P2) and US3 (P3) are independent of each other and of US1; both only add documentation
    plus verification against the same shared dataset
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- README step-writing tasks (T011–T014, T019–T020) before their corresponding verification tasks
- Verification tasks depend on Foundational (T003–T007) being complete, not on each other

### Parallel Opportunities

- T003 and T004 can run in parallel (different files; T004's import of `radarData.json` only
  needs the shape from data-model.md, already fixed)
- T011, T012, T013 (the three README step-writing tasks) can run in parallel — different
  sections of the same file, no shared dependency between them
- T022, T023, T024 (Polish doc sections) can run in parallel once Phases 3–5 are complete

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — this is where the plugin, override, and sample data
   all come together)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm the radar renders with full quadrant/ring coverage
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → radar renders with full sample content (MVP already visible here)
2. Add User Story 1 → formal verification against SC-001/SC-002 → validate → demo
3. Add User Story 2 → register/move/retire steps documented and verified → validate → demo
4. Add User Story 3 → ring/quadrant semantics documented and verified → validate → demo
5. Polish → design-rationale docs, adaptable conventions, root README wiring, full quickstart run

---

## Notes

- [P] tasks = different files (or independent sections of the same file), no dependencies
- [Story] label maps task to specific user story for traceability
- Because the plugin supplies its own page rendering, this lab's Foundational phase carries more
  of the "real work" than a typical feature — once T003–T007 are done, US1 is already
  functionally complete and its phase is verification-only
- Unlike Labs 1–6, README step-by-step content for US2/US3 is written within their own story
  phases rather than deferred to Polish, since those stories' own independent tests require
  "documented steps" to exist (see Documentation placement note above)
- Verify each story's quickstart step before moving to the next priority
- Avoid: reintroducing a network-dependent radar data source (the `tech-radar-backend` package or
  a remote URL) — that would defeat this lab's core zero-network lesson (research.md R1)
