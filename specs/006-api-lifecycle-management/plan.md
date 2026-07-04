# Implementation Plan: Lab 6 — API Lifecycle Management

**Branch**: `006-api-lifecycle-management` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-api-lifecycle-management/spec.md`

## Summary

Lab 6 builds on the running Backstage 1.51.0 instance from Labs 1–5. It demonstrates multiple
major versions of the same logical API coexisting in the catalog, a default browsing experience
that surfaces the latest version while keeping older ones reachable, independent per-version
lifecycle states, and a two-step deprecate-then-retire progression — using **only native
Backstage catalog relations/fields plus one new read-only frontend card**, with no new backend
module. Two `API` entities, `museum-api-v1` (Lab 1's unmodified Museum API, re-registered under a
versioned name) and `museum-api-v2` (a new spec with deliberate breaking changes), are grouped
under one new `System` entity (`system:default/museum-api`) via the native `spec.system` relation
(research.md R1) — superseding Lab 2's single `museum-api` catalog entry (research.md R6, an
explicitly-permitted "breaking change to the environment" per the constitution's Development
Workflow section). A new `apiportal.io/version` annotation drives a *computed* (not manually
flagged) "latest version" determination (research.md R2). Lifecycle state reuses Backstage's
existing free-form `spec.lifecycle` field — already rendered natively — extended with a
documented five-value convention (`development`/`testing`/`production`/`deprecated`/`retired`,
research.md R3). A new frontend module, `apiVersions` (`packages/app/src/modules/apiVersions/`),
follows the exact `EntityCardBlueprint` pattern already used by Lab 2's `apiVisibility` and Lab
3's `apiGrade`: it lists every sibling version of the API being viewed, flags the latest, and
collapses `retired` versions behind a "Show retired versions" toggle, closed by default
(research.md R4). Backstage's built-in full-text search/catalog table is deliberately left
unmodified — the Versions card is the taught "default" discovery surface, a documented design
boundary rather than a scaling gap (research.md R5). All lifecycle transitions, including
retirement, are one-line `spec.lifecycle` edits picked up via existing catalog polling — no new
mutation endpoint or UI action (research.md R7). No entity is ever deleted (FR-009).

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage 1.51.0, pinned from Lab 1)

**Primary Dependencies**: None new. Reuses `@backstage/plugin-catalog-react/alpha`'s
`EntityCardBlueprint` (already a dependency, used by Lab 2's `apiVisibility` and Lab 3's
`apiGrade`) and the existing `catalogApiRef` (`useApi(catalogApiRef).getEntities()`) already used
elsewhere in the Backstage frontend. No new root or `packages/app` dependency is added.

**Storage**: No database or generated config. All new state is committed catalog YAML (one
`System` entity, two `API` entities, one new OpenAPI spec file) plus a `catalog.locations` update
in `app-config.yaml` (data-model.md). No runtime-generated files, consistent with Labs 1–4 (Lab
5's mock-gateway is the only lab with a generated-artifact concern, and this lab has none).

**Testing**: Manual browser verification per lab README (no automated test suite — consistent
with Labs 1–5's tutorial-lab testing approach; see quickstart.md for the exact verification
walkthrough).

**Target Platform**: Local development machine — Windows 10/11 and macOS 12+ (same as Labs 1–5).

**Project Type**: Tutorial lab — Markdown documentation + catalog YAML + one new OpenAPI spec
file + one new small TypeScript frontend module (an `EntityCardBlueprint` info card).

**Performance Goals**: The Versions card's `catalogApi.getEntities()` call is filtered
server-side to the viewed entity's own `spec.system`, so it returns only that API's sibling
versions (typically single digits) regardless of total catalog size — O(1) relative to catalog
scale, not O(total APIs) (research.md R8).

**Constraints**: Zero cost; cross-platform; no external network access beyond what Labs 1–5
already require; supersedes Lab 2's single `museum-api` catalog entry (research.md R6) but edits
no other previously-committed spec/catalog file, and does not require Labs 1–5 to be redone
(FR-011).

**Scale/Scope**: Lab demo: 1 new `System` entity, 2 new `API` entities (v1 re-registered
unmodified, v2 new with deliberate breaking changes), 1 new OpenAPI spec file, 1 new frontend
module (~1-2 files), 1 `app-config.yaml` `catalog.locations` edit (3 entries replacing 1), 0 new
dependencies, 0 new backend modules. Designed-for scale (config-only, per research.md R8): each
additional logical API at a 500+-API deployment is one more `System` + N more `API` YAML files,
with no code or architecture change and no growth in the Versions card's per-view query cost.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates concrete, named Backstage features: the `System` entity/`spec.system` relation for grouping, the native free-form `spec.lifecycle` field for per-version state, and the `EntityCardBlueprint` pattern for a computed cross-version summary view | ✅ Pass |
| II. Process-Oriented Documentation | README must explain WHY `System` (not a bespoke annotation) was chosen for grouping (research.md R1), WHY "latest" is computed rather than manually flagged (research.md R2), WHY Backstage's native search/catalog table is deliberately left unmodified rather than built into a custom collator (research.md R5 — a concrete worked example of a documented design boundary, worth calling out explicitly to learners), and WHY Lab 2's single `museum-api` entity is being superseded by two versioned entities (research.md R6). The new `ApiVersionsCard.tsx` and the new v2 OpenAPI spec are each likely to exceed the ~40–50 line inline threshold and MUST be committed under `labs/lab-06-api-lifecycle-management/code/` and `.../apis/museum-v2/` respectively, linked from the README, not inlined | ✅ Pass (with file-size rule flagged for tasks) |
| III. Cross-Platform Compatibility | Purely catalog YAML edits, one static OpenAPI file, and a pure-TypeScript React card — no native/platform-specific dependencies; `yarn start` continues to work identically on Windows and macOS; no new scripts or platform-specific commands are introduced | ✅ Pass |
| IV. Self-Contained Prerequisites | No new prerequisites beyond Labs 1–5's existing Node/Yarn/Backstage setup — no new dependency to install | ✅ Pass |
| V. Zero-Cost Operation | No new dependency, tool, or service of any kind, paid or otherwise | ✅ Pass |
| VI. Progressive Lab Structure | Requires Labs 1–5 completion; reuses Lab 1's Museum OpenAPI spec unmodified for v1; the one deliberate exception (superseding Lab 2's single `museum-api` catalog entry, research.md R6) is an explicitly-permitted "breaking change to the environment," documented in README and this plan rather than left implicit | ✅ Pass |
| VII. Modern & Purposeful API Examples | v1 reuses the already-compliant Museum API unmodified; v2 is a deliberately-breaking variant of the same well-designed API (not a new placeholder example), authored specifically to make the version difference concrete | ✅ Pass |
| VIII. Support Experimentation & Scale | README documents adaptable conventions: the `apiportal.io/version` annotation format, the five lifecycle-value convention, and that "System per logical API" is the pattern to replicate for a learner's own APIs. Verification tests outcomes (which version is flagged latest, which lifecycle chip shows, whether a retired version is collapsed), not implementation internals. **Scale**: the System+relation+filtered-query mechanism is config-only to extend (research.md R8) — no code/architecture change between the lab's 2-version demo and a 500+-API deployment. The one explicitly-flagged design boundary (native search/catalog table left unmodified, research.md R5) is documented as a deliberate, generalizing choice rather than an implicit gap | ✅ Pass |
| IX. Pragmatic Security for Learning Environments | N/A — no new credentials, secrets, or auth configuration are introduced by this lab (research.md R9); no Security Note section required | ✅ Pass (N/A, no new credential surface) |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/006-api-lifecycle-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

No `contracts/` directory — this lab produces no external API contracts of its own. The new
catalog entity shapes (`System`, versioned `API`, annotation) are documented in data-model.md
instead.

### Source Code (repository root)

```text
labs/
└── lab-06-api-lifecycle-management/
    ├── README.md                          # Lab documentation (overview, prereqs, steps,
    │                                      # verification, troubleshooting, adaptable
    │                                      # conventions per Constitution Principle VIII;
    │                                      # no Security Note needed, research.md R9)
    ├── catalog/
    │   ├── system.yaml                    # New: System entity (system:default/museum-api)
    │   ├── apis/
    │   │   ├── museum-api-v1.yaml         # New: v1 descriptor — supersedes Lab 2's single
    │   │   │                              # museum-api.yaml; references Lab 1's openapi.yaml
    │   │   │                              # unmodified (research.md R6)
    │   │   └── museum-api-v2.yaml         # New: v2 descriptor, references the new v2 spec
    │   │                                  # below
    │   └── apis/museum-v2/
    │       └── openapi.yaml               # New: Museum API v2 with deliberate breaking
    │                                      # changes vs. v1, documented as a changelog
    │                                      # callout in the README (research.md R6)
    └── code/
        └── packages/
            └── app/
                └── src/
                    └── modules/
                        └── apiVersions/
                            ├── ApiVersionsCard.tsx  # New: lists sibling versions, flags
                            │                        # latest, collapses retired ones
                            │                        # (research.md R2, R4)
                            └── index.ts             # New: EntityCardBlueprint wrapper,
                                                      # same pattern as apiVisibility/apiGrade
```

Changes to the student's Backstage instance (guided by README, not committed as generated
output, but the module source itself IS committed since it is lab teaching content):

```text
# In the student's Backstage instance (labs/lab-01-base-backstage/backstage/):
app-config.yaml                                # Modified: catalog.locations — remove Lab 2's
                                                # single museum-api.yaml entry, add 3 new
                                                # entries (system, museum-api-v1, museum-api-v2)
packages/app/
└── src/
    ├── App.tsx                                # Modified: register apiVersionsModule in the
    │                                          # features array (same pattern as Lab 2/3)
    └── modules/
        └── apiVersions/                       # New: copied from labs/lab-06-.../code/packages/
            ├── ApiVersionsCard.tsx             # app/src/modules/apiVersions/
            └── index.ts
```

**Structure Decision**: Tutorial-documentation layout, consistent with Labs 1–5. All
student-facing content lives under `labs/lab-06-api-lifecycle-management/`; the new frontend
module is committed under its `code/` subdirectory (exceeds the ~40–50 line inline threshold per
Constitution Principle II) and linked from the README rather than embedded inline. The student's
Backstage instance (from Lab 1) is modified in place per the README instructions, same pattern as
Labs 2–5. Lab 1's original Museum OpenAPI file is reused unmodified for v1; the new v2 spec and
all new catalog descriptors live under this lab's own directory, not Lab 1's or Lab 2's. Speckit
artefacts live under `specs/006-api-lifecycle-management/` per convention.

## Complexity Tracking

No violations recorded — table omitted per template instructions.
