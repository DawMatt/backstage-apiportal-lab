# Implementation Plan: Lab 7 — Other Documentation (Tech Radar)

**Branch**: `007-lab-7-tech-radar` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-lab-7-tech-radar/spec.md`

## Summary

Lab 7 builds on the running Backstage 1.51.0 instance from Labs 1–6. It adds the community
Thoughtworks-style **Tech Radar** plugin (`@backstage-community/plugin-tech-radar`) as a new,
navigation-visible page, and demonstrates registering, moving, and retiring blips — this lab's
"other documentation" artifact, distinct from the API-specific documentation (OpenAPI/AsyncAPI,
quality, mocking) covered in Labs 1, 3, and 5. The plugin is installed **frontend-only** — no
`@backstage-community/plugin-tech-radar-backend` — because that backend package only loads data
from a remote URL via Backstage's `UrlReader`, which would make the radar depend on network access
and a pushed/public fork at run time (research.md R1). Instead, a small new frontend module,
`techRadar` (`packages/app/src/modules/techRadar/`), provides a custom `TechRadarApi`
implementation whose `load()` statically imports a committed **JSON data file**
(`radarData.json`) and validates/coerces it via the plugin's own `TechRadarLoaderResponseParser`,
instead of calling the plugin's network-calling default (research.md R2, R5). This is a
deliberate step beyond every prior lab's "data committed as typed `.ts` source" pattern: per
explicit user direction, radar content must be manageable as a data file in git, without editing
any application source code — only `radarData.json` changes for day-to-day radar maintenance; the
module's TypeScript code (the API wiring, the plugin registration) is fixed. The radar
uses the plugin's unmodified default rings (Adopt/Trial/Assess/Hold) and the classic Thoughtworks
quadrants (Techniques/Tools/Platforms/Languages & Frameworks), both confirmed with the user during
`/speckit-clarify`, populated with sample blips drawn from this lab series' own vocabulary (Spectral
linting, Prism mocking, OpenAPI/AsyncAPI) so the radar reinforces Labs 1–6 rather than introducing
unrelated content (research.md R3). Registering, moving, and retiring a blip are all one-file edits
to `radarData.json` (add an entry, append a `timeline` element, or delete an entry —
data-model.md), requiring no backend, no code change, and no catalog YAML of any kind.

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage 1.51.0, pinned from Lab 1)

**Primary Dependencies**: `@backstage-community/plugin-tech-radar` (new, frontend-only —
research.md R1), registered via its `/alpha` export in `App.tsx`'s `features` array, the same
pattern as the existing `catalogPlugin` entry. No other new dependency. Does **not** add
`@backstage-community/plugin-tech-radar-backend` or `@backstage-community/plugin-tech-radar-common`
as direct dependencies (the `-common` package's types/`TechRadarLoaderResponseParser` are a
transitive peer of the frontend package, used only inside `techRadarApi.ts` to validate/type
`radarData.json` at runtime).

**Storage**: None. All radar data (quadrants, rings, entries) lives in one committed **JSON data
file** (`radarData.json`, data-model.md) — deliberately not TypeScript source, so radar content
can be maintained as a git-tracked data file rather than an application-code edit, per explicit
user requirement. No database, no generated files, no runtime-fetched data — consistent with
Labs 1–4's "no runtime-generated files" precedent (Lab 5's mock-gateway remains the only lab with
a generated-artifact concern).

**Testing**: Manual browser verification per lab README and quickstart.md (research.md R6) — no
automated test suite, consistent with Labs 1–6's tutorial-lab testing approach.

**Target Platform**: Local development machine — Windows 10/11 and macOS 12+ (same as Labs 1–6).

**Project Type**: Tutorial lab — Markdown documentation + one new small TypeScript frontend
module (a `PageBlueprint`-based plugin registration plus one `ApiBlueprint` override and one data
file). No backend changes.

**Performance Goals**: N/A — a static, in-memory dataset with a handful of entries; no query or
scale dimension applies (contrast with Lab 6's catalog-query performance concern).

**Constraints**: Zero cost; cross-platform; no external network access at run time (research.md
R1 — this is the specific reason the optional backend package is deliberately not used); does not
edit any previously-committed file from Labs 1–6 (purely additive: one new dependency, one new
module directory, one `App.tsx` feature-array entry, one `app-config.yaml` extension-override
entry); does not require Labs 1–6 to be redone.

**Scale/Scope**: Lab demo: 1 new frontend dependency; 1 new frontend module (3 files:
`techRadarApi.ts`, `index.ts`, `radarData.json`); 1 `App.tsx` change (new feature-array entry); 1
`app-config.yaml` change (disable the plugin's default API extension); 0 new backend modules; 0
new catalog entities. Designed-for scale: adding more blips, quadrants, or rings to a real-world
radar is purely a `radarData.json` content change — no code or architecture change as the dataset
grows (Principle VIII's scale requirement is met trivially here since the entire mechanism is
already just "add more array entries" with no per-entry infrastructure cost).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates a concrete, named Backstage feature: the community Tech Radar plugin, its `TechRadarApi` extension point, and the `PageBlueprint`/`ApiBlueprint` new-frontend-system registration pattern | ✅ Pass |
| II. Process-Oriented Documentation | README must explain WHY the backend package is deliberately not installed (research.md R1 — network/offline concern), WHY radar content is a JSON data file rather than a `.ts` module unlike every prior lab's data-as-source pattern (research.md R2 — explicit user requirement: content in git as data, not source-code edits), WHY rings/quadrants use the plugin's and Thoughtworks' unmodified defaults rather than a bespoke set (research.md R3, per user clarification), and HOW the moved-indicator/timeline mechanism and the JSON→Zod-parse validation flow work (data-model.md, including the documented silent-failure case for a misspelled quadrant/ring id). The new `techRadar` module (plugin override + `radarData.json`) is expected to exceed the ~40–50 line inline threshold and MUST be committed under `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/`, linked from the README, not inlined | ✅ Pass (with file-size rule flagged for tasks) |
| III. Cross-Platform Compatibility | A `yarn add` dependency and pure-TypeScript frontend module/data file — no native or platform-specific dependencies; `yarn start` continues to work identically on Windows and macOS | ✅ Pass |
| IV. Self-Contained Prerequisites | One new prerequisite: `@backstage-community/plugin-tech-radar`, freely available on npm; README documents the exact install command. No other new tool/account | ✅ Pass |
| V. Zero-Cost Operation | No paid dependency; explicitly avoiding the optional backend package also avoids any implicit dependency on a hosted/public Git remote at run time (research.md R1) | ✅ Pass |
| VI. Progressive Lab Structure | Requires Labs 1–6 completion; purely additive — no edit to any file committed by a prior lab | ✅ Pass |
| VII. Modern & Purposeful API Examples | N/A — this lab introduces no new OpenAPI/AsyncAPI sample; its sample *radar* content reuses this series' own established API/tooling vocabulary rather than generic placeholders (research.md R3) | ✅ Pass (N/A, no new API sample) |
| VIII. Support Experimentation & Scale | README documents the adaptable conventions: how to add/move/retire a blip, and that quadrants/rings/entries are freely extensible content, not fixed code. Verification (quickstart.md) tests outcomes (blip appears/moves/disappears, page is reachable), not implementation internals. **Scale**: growing the radar's content has no architecture ceiling — it is array entries in one file, already the state at any real-world size | ✅ Pass |
| IX. Pragmatic Security for Learning Environments | N/A — no new credentials, secrets, or auth configuration are introduced by this lab | ✅ Pass (N/A, no new credential surface) |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/007-lab-7-tech-radar/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

No `contracts/` directory — this lab produces no external API contracts of its own (the radar
dataset shape is documented in data-model.md instead, mirroring Lab 6's precedent).

### Source Code (repository root)

```text
labs/
└── lab-07-tech-radar/
    ├── README.md                    # Lab documentation (overview, prereqs, steps, verification,
    │                                # troubleshooting, adaptable conventions per Principle VIII;
    │                                # no Security Note needed)
    └── code/
        └── packages/
            └── app/
                └── src/
                    └── modules/
                        └── techRadar/
                            ├── radarData.json  # New: committed sample dataset (quadrants, rings,
                            │                   # entries) as plain JSON data — data-model.md's
                            │                   # TechRadarLoaderResponse shape. The ONLY file a
                            │                   # learner edits to register/move/retire a blip
                            │                   # (research.md R2) — no source-code change needed
                            ├── techRadarApi.ts  # New: custom TechRadarApi implementation whose
                            │                   # load() imports radarData.json and validates/
                            │                   # coerces it via TechRadarLoaderResponseParser
                            │                   # (research.md R2, R5) — fixed code, not edited
                            │                   # for routine radar content changes
                            └── index.ts         # New: createFrontendModule wrapper — imports the
                                                  # plugin's default techRadarPage extension plus
                                                  # this lab's techRadarApi override, following the
                                                  # same registration shape as Lab 3's
                                                  # spectralLinterModule
```

Changes to the student's Backstage instance (guided by README, not committed as generated
output, but the module source itself IS committed since it is lab teaching content):

```text
# In the student's Backstage instance (labs/lab-01-base-backstage/backstage/):
packages/app/
├── package.json                     # Modified: adds @backstage-community/plugin-tech-radar
├── src/App.tsx                      # Modified: registers techRadarModule and the plugin's
│                                    # default page extension in the features array
└── src/modules/techRadar/           # New: copied from labs/lab-07-tech-radar/code/packages/
    ├── radarData.json               # app/src/modules/techRadar/ — the file learners edit for
    │                                # day-to-day radar content changes
    ├── techRadarApi.ts
    └── index.ts
app-config.yaml                       # Modified: disables the plugin's default (backend-calling)
                                       # API extension so this lab's static techRadarApi is used
                                       # instead (research.md R5)
```

**Structure Decision**: Tutorial-documentation layout, consistent with Labs 1–6. All
student-facing content lives under `labs/lab-07-tech-radar/`; the new frontend module (plugin
override + committed sample data) is committed under this lab's own `code/` directory (expected to
exceed the ~40–50 line inline threshold per Constitution Principle II) and linked from the README
rather than embedded inline. The student's Backstage instance (from Lab 1) is modified in place per
the README instructions, same pattern as Labs 2–6. No prior lab's committed file is edited. Speckit
artefacts live under `specs/007-lab-7-tech-radar/` per convention.

## Complexity Tracking

No violations recorded — table omitted per template instructions.
