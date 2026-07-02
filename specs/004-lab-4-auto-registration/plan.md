# Implementation Plan: Lab 4 — Auto Registration

**Branch**: `004-lab-4-auto-registration` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-lab-4-auto-registration/spec.md`

## Summary

Lab 4 builds on the running Backstage 1.51.0 instance from Labs 1–3. It replaces the
per-API hand-authored `catalog-info.yaml` pattern used in Labs 1–3 with a custom backend
`EntityProvider` that scans the mono-repo for files matching `*-openapi.yaml` /
`*-asyncapi.yaml`, parses them, and emits/updates/retracts catalog `API` entities on a 30s
schedule — no catalog-info.yaml required per API (FR-001–FR-004). Catalog metadata (owner,
lifecycle, tags) is sourced from `x-backstage-owner`, `x-backstage-lifecycle`, and
`x-backstage-tags` fields under each spec's `info` object (FR-005–FR-006), with documented
defaults when absent (FR-007). Errors (malformed files, unresolvable owners, name collisions)
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
- `@backstage/plugin-catalog-node` (already installed, `2.2.1`) — supplies `EntityProvider`,
  `CatalogProcessor`, and `catalogProcessingExtensionPoint` used to register the new backend
  module, following the same `createBackendModule` pattern as
  `packages/backend/src/extensions/permissionPolicy.ts`.
- No new frontend dependencies — this lab is backend-only; no new UI surfaces are added (errors
  ride on Backstage's existing built-in processing-error UI).

**Storage**: YAML files only — two new vendored API spec files, one new hand-authored
`catalog-info.yaml` (precedence demo), and one `app-config.yaml` addition (new
`autoApiRegistration` block). No database schema changes.

**Testing**: Manual browser + log verification per lab README (no automated test suite —
consistent with Labs 1–3's tutorial-lab testing approach).

**Target Platform**: Local development machine — Windows 10/11 and macOS 12+ (same as Labs 1–3).

**Project Type**: Tutorial lab — Markdown documentation + YAML config/catalog files + one new
TypeScript backend module (EntityProvider + CatalogProcessor).

**Performance Goals**: New/changed API definitions appear in the catalog within one discovery
cycle (≤30s, SC-001); scan cost is bounded by mono-repo size, acceptable at lab scale (a handful
of spec files).

**Constraints**: Zero cost; cross-platform; no external network access beyond the one-time vendor
of the Scalar Galaxy API file at authoring time (the vendored copy itself requires no runtime
network access, per Constitution Principle VII); builds on Labs 1–3 without disrupting existing
registered APIs (museum, streetlights, train-travel) or the Lab 3 quality tooling.

**Scale/Scope**: 2 new sample API files (Galaxy, precedence-demo), 1 new hand-authored
`catalog-info.yaml`, 1 new backend module (~2 files: EntityProvider+processor and its
registration), 1 `app-config.yaml` config block, 3 existing registered APIs left untouched.

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
| VIII. Support Experimentation | README documents `autoApiRegistration.rootPath`, `.patterns`, and the `x-backstage-*` field names as adaptable conventions (FR-010); User Story 3 is dedicated to this; verification tests outcomes (entity appears/updates/is retracted), not exact file layout | ✅ Pass |
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
        │                                          # x-backstage-owner/lifecycle/tags added;
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
├── package.json                               # Modified: add fast-glob, js-yaml
└── src/
    ├── index.ts                               # Modified: backend.add(import('./extensions/autoApiRegistration'))
    └── extensions/
        └── autoApiRegistration.ts             # New: EntityProvider + CatalogProcessor backend
                                                # module (discovery, parsing, mapping, owner
                                                # validation, precedence check, error marking)
```

**Structure Decision**: Tutorial-documentation layout, consistent with Labs 1–3. All
student-facing content lives under `labs/lab-04-auto-registration/`. The two new sample API
files (and the one hand-authored precedence-demo catalog file) are committed alongside the lab
README. The student's Backstage instance (from Lab 1) is modified in-place per the README
instructions, same as Lab 3's pattern. Speckit artefacts live under
`specs/004-lab-4-auto-registration/` per convention.

## Complexity Tracking

No violations recorded — table omitted per template instructions.
