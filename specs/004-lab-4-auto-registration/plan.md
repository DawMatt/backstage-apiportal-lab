# Implementation Plan: Lab 4 — Auto Registration

**Branch**: `004-lab-4-auto-registration` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-lab-4-auto-registration/spec.md`

## Summary

Lab 4 builds on the running Backstage 1.51.0 instance from Labs 1–3. It replaces the
per-API hand-authored `catalog-info.yaml` pattern used in Labs 1–3 with a custom backend
`EntityProvider` that scans the mono-repo for files matching `*-openapi.yaml` /
`*-asyncapi.yaml`, parses them, and emits/updates/retracts catalog `API` entities on a 30s
poll schedule for the lab's small sample set — no catalog-info.yaml required per API
(FR-001–FR-004). The same mechanism is designed to hold up at real-world mono-repo scale
(1000+ spec files, 1GB+ repos): a persisted scan-state cache (`coreServices.database`) lets a
restart skip re-parsing unchanged files, delta (not full) mutations are emitted after the
first cycle, and an optional `chokidar` watch mode replaces repeated full-tree polling as the
steady-state discovery signal — see research.md R6 for the full scaling rationale; only the
config *values* differ between the lab demo and a production-scale deployment, not the
architecture. Catalog owner/lifecycle metadata is sourced from a single vendor-namespaced
`info.x-examplecorp` object (`owner`, `lifecycle`) — tool-agnostic field names, grouped under one
namespace learners rename to their own company (FR-005–FR-006), with documented defaults when
absent (FR-007). Metadata that already has a natural home in the spec — name (`info.title`),
description (`info.description`), tags (native top-level `tags`) — is sourced from there instead
of being duplicated into `x-examplecorp`. Errors (malformed files, unresolvable owners, name collisions)
are surfaced via backend logs and, where an entity can be identified, via Backstage's native
catalog processing-error UI through a companion `CatalogProcessor` that throws on a marker
annotation (FR-008). A hand-authored `catalog-info.yaml`, where one exists alongside a
discovered file, takes precedence over auto-sourced metadata (FR-011).

Two new sample files support the lab: a vendored copy of the MIT-licensed Scalar Galaxy API
(`galaxy-openapi.yaml`) with no pre-existing catalog registration, demonstrating genuine
"previously unregistered API" discovery (US1); and a small `precedence-demo-openapi.yaml` +
hand-authored `precedence-demo-catalog-info.yaml` pair demonstrating the precedence rule.
Lab documentation calls out which parts (glob patterns, root path, `x-*` field names) are
adaptable conventions per Constitution Principle VIII (FR-010, US3).

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage 1.51.0, pinned from Lab 1)

**Primary Dependencies**:
- `fast-glob@3.3.3` — new direct dependency of `packages/backend`; already present transitively
  in the workspace, promoted to an explicit dependency for the filesystem scan (research.md R2).
- `js-yaml@4.2.0` — new direct dependency of `packages/backend`; already present transitively,
  promoted to explicit for parsing candidate spec files (research.md R3).
- `chokidar` — new direct dependency of `packages/backend`; already present transitively; used
  only when `autoApiRegistration.mode: 'watch'` (not the lab default), to give the discovery
  mechanism a steady-state path that scales past the lab's poll-based default (research.md R6).
- `@backstage/plugin-catalog-node` (already installed, `2.2.1`) — supplies `EntityProvider`,
  `CatalogProcessor`, and `catalogProcessingExtensionPoint` used to register the new backend
  module, following the same `createBackendModule` pattern as
  `packages/backend/src/extensions/permissionPolicy.ts`.
- No new frontend dependencies — this lab is backend-only; no new UI surfaces are added (errors
  ride on Backstage's existing built-in processing-error UI).

**Storage**: YAML files (two new vendored API spec files, one new hand-authored
`catalog-info.yaml` for the precedence demo, one `app-config.yaml` addition) plus one new
backend-owned database table (`autoApiRegistration` scan-state cache, via `coreServices.database`
— same pluggable SQLite/Postgres service the catalog already uses) that persists per-file
mtime/hash/entity-name/error state across restarts so a real-world-scale mono-repo doesn't
require a full re-parse on every backend start (research.md R6, data-model.md). Not a schema
change to any existing Backstage table.

**Testing**: Manual browser + log verification per lab README (no automated test suite —
consistent with Labs 1–3's tutorial-lab testing approach).

**Target Platform**: Local development machine — Windows 10/11 and macOS 12+ (same as Labs 1–3).

**Project Type**: Tutorial lab — Markdown documentation + YAML config/catalog files + one new
TypeScript backend module (EntityProvider + CatalogProcessor).

**Performance Goals**: New/changed API definitions appear in the catalog within one discovery
cycle (≤30s at lab scale, SC-001). Mechanism-level goal (not exercised by the lab itself, but
designed for per research.md R6): a real mono-repo of 1000+ spec files across 1GB+ should incur
parse cost proportional to *changed* files, not total repo size, on both restart (persisted
scan-state cache) and steady-state discovery (watch mode + delta mutations).

**Constraints**: Zero cost; cross-platform; no external network access beyond the one-time vendor
of the Scalar Galaxy API file at authoring time (the vendored copy itself requires no runtime
network access, per Constitution Principle VII); builds on Labs 1–3 without disrupting existing
registered APIs (museum, streetlights, train-travel) or the Lab 3 quality tooling.

**Scale/Scope**: Lab demo: 2 new sample API files (Galaxy, precedence-demo), 1 new hand-authored
`catalog-info.yaml`, 1 new backend module (~3 files: EntityProvider+processor, DB migration for
the scan-state cache, and registration), 1 `app-config.yaml` config block, 3 existing registered
APIs left untouched. Designed-for scale (config change only, no code change, per research.md R6):
1000+ spec files, 1GB+ mono-repo size.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates concrete Backstage features: custom `EntityProvider` for filesystem-based catalog discovery, `x-*` vendor-extension metadata sourcing, native catalog processing-error surfacing via a custom `CatalogProcessor`, full-mutation-based create/update/retract lifecycle | ✅ Pass |
| II. Process-Oriented Documentation | README must explain WHY an `EntityProvider` (not a processor or GitHub discovery) was chosen (research.md R1), WHY errors ride on Backstage's native processing-error UI instead of a bespoke system (R4), and WHY hand-authored `catalog-info.yaml` takes precedence over auto-sourced metadata (FR-011) | ✅ Pass |
| III. Cross-Platform Compatibility | All new code is TypeScript/YAML; `fast-glob` and `js-yaml` are pure-JS, no native/platform-specific dependencies; `yarn add` and `yarn start` work identically on Windows and macOS; root-path resolution documented with platform-neutral relative paths | ✅ Pass |
| IV. Self-Contained Prerequisites | No new prerequisites beyond Labs 1–3's existing Node/Yarn setup — `fast-glob`/`js-yaml` are installed via the existing `yarn add` workflow; README documents the install step | ✅ Pass |
| V. Zero-Cost Operation | `fast-glob` and `js-yaml` are MIT-licensed OSS; Scalar Galaxy API is MIT-licensed; no cloud services, GitHub Apps, or webhooks required — mono-repo discovery runs entirely against the local filesystem | ✅ Pass |
| VI. Progressive Lab Structure | Lab 4 requires Labs 1–3 completion; the new `EntityProvider` runs alongside (does not replace) the existing manual `type: url` catalog locations from Labs 2–3, so museum/streetlights/train-travel remain registered exactly as before; no prior lab file is modified | ✅ Pass |
| VII. Modern & Purposeful API Examples | Scalar Galaxy API (MIT, self-contained, no external `$ref`s, realistic multi-resource domain) is new and distinct from Museum/Train Travel/Streetlights; the small precedence-demo API is a minimal-but-well-formed example used specifically to exercise precedence, not a primary teaching artifact | ✅ Pass |
| VIII. Support Experimentation | README documents `autoApiRegistration.rootPath`, `.patterns`, and the `xNamespace` (`x-examplecorp` → the learner's own company) as adaptable conventions (FR-010); User Story 3 is dedicated to this; verification tests outcomes (entity appears/updates/is retracted), not exact file layout | ✅ Pass |
| IX. Pragmatic Security for Learning Environments | No new authentication or credential configuration is introduced in Lab 4; the existing guest-provider auth from Lab 2 is unchanged. No Security Note section is required (no insecure practice introduced) | ✅ Pass |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/004-lab-4-auto-registration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

No `contracts/` directory — this lab produces no external API contracts. The `autoApiRegistration`
config shape and the entity mapping rules are documented in data-model.md instead.

### Source Code (repository root)

```text
labs/
└── lab-04-auto-registration/
    ├── README.md                                  # Lab documentation (overview, prereqs, steps,
    │                                              # verification, troubleshooting, adaptable
    │                                              # conventions per US3/FR-010)
    └── apis/
        ├── galaxy/
        │   └── galaxy-openapi.yaml                # New: vendored Scalar Galaxy API (MIT),
        │                                          # info.x-examplecorp.owner/lifecycle added;
        │                                          # no catalog-info.yaml — pure auto-discovery
        └── precedence-demo/
            ├── precedence-demo-openapi.yaml        # New: minimal spec for the precedence demo
            └── precedence-demo-catalog-info.yaml   # New: hand-authored entity that must win
                                                    # over the auto-sourced one (FR-011)
```

Changes to the student's Backstage instance (guided by README, not committed as generated output,
but the module source itself IS committed since it is lab teaching content):

```text
# In the student's Backstage instance (labs/lab-01-base-backstage/backstage/):
app-config.yaml                                # Modified: add autoApiRegistration config block
packages/backend/
├── package.json                               # Modified: add fast-glob, js-yaml, chokidar
└── src/
    ├── index.ts                               # Modified: backend.add(import('./extensions/autoApiRegistration'))
    └── extensions/
        ├── autoApiRegistration.ts             # New: EntityProvider + CatalogProcessor backend
        │                                      # module (discovery, parsing, mapping, owner
        │                                      # validation, precedence check, error marking,
        │                                      # poll/watch mode, delta mutations)
        └── autoApiRegistrationMigrations/      # New: coreServices.database migration creating
            └── 001_scan_state_cache.ts         # the scan-state cache table (research.md R6)
```

**Structure Decision**: Tutorial-documentation layout, consistent with Labs 1–3. All
student-facing content lives under `labs/lab-04-auto-registration/`. The two new sample API
files (and the one hand-authored precedence-demo catalog file) are committed alongside the lab
README. The student's Backstage instance (from Lab 1) is modified in-place per the README
instructions, same as Lab 3's pattern. Speckit artefacts live under
`specs/004-lab-4-auto-registration/` per convention.

## Complexity Tracking

No violations recorded — table omitted per template instructions.
