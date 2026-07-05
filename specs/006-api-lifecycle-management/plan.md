# Implementation Plan: Lab 6 — API Lifecycle Management

**Branch**: `006-api-lifecycle-management` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-api-lifecycle-management/spec.md`

## Summary

Lab 6 builds on the running Backstage 1.51.0 instance from Labs 1–5. It demonstrates multiple
major versions of the same logical API coexisting in the catalog, a default browsing experience
that surfaces the latest version while keeping older ones reachable, independent per-version
lifecycle states, and a two-step deprecate-then-retire progression — using **native Backstage
catalog relations/fields, one read-only frontend card, and an additive extension to Lab 4's
existing `autoApiRegistration.ts` backend module**, with zero hand-authored catalog YAML. Two
`API` entities, `museum-api-v1` (a local, content-identical copy of Lab 1's unmodified Museum API
spec) and `museum-api-v2` (a new spec with deliberate breaking changes), are both auto-registered
by a second `autoApiRegistration` source pointing at this lab's own `apis/` directory, and grouped
under one `System` entity (`system:default/museum-api`) via the native `spec.system` relation
(research.md R1) — superseding Lab 2's single `museum-api` catalog entry (research.md R6, an
explicitly-permitted "breaking change to the environment" per the constitution's Development
Workflow section). The `System` itself is synthesized by the extended provider from a new
`info.x-examplecorp.apiBasename` field each spec declares (research.md R1a) — no `system.yaml` is
authored. "Latest version" is read directly from each spec's own `info.version` and computed, not
manually flagged (research.md R2) — no `apiportal.io/version` annotation is added. Lifecycle state
reuses Backstage's existing free-form `spec.lifecycle` field, populated from each spec's own
`info.x-examplecorp.lifecycle` extension field via the same extraction mechanism Lab 4 already built
for owner/visibility (research.md R3), with a documented five-value convention
(`development`/`testing`/`production`/`deprecated`/`retired`). A new frontend module, `apiVersions`
(`packages/app/src/modules/apiVersions/`), follows the exact `EntityCardBlueprint` pattern already
used by Lab 2's `apiVisibility` and Lab 3's `apiGrade`: it lists every sibling version of the API
being viewed, flags the latest, and collapses `retired` versions behind a "Show retired versions"
toggle, closed by default (research.md R4). Backstage's built-in full-text search/catalog table is
deliberately left unmodified — the Versions card is the taught "default" discovery surface, a
documented design boundary rather than a scaling gap (research.md R5). All lifecycle transitions,
including retirement, are one-line edits to a spec file's own `x-examplecorp.lifecycle` field, picked
up via Lab 4's existing poll/watch cycle — no commit/push, no new mutation endpoint, no new UI
action (research.md R7). No entity is ever deleted (FR-009).

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage 1.51.0, pinned from Lab 1)

**Primary Dependencies**: None new. Reuses `@backstage/plugin-catalog-react/alpha`'s
`EntityCardBlueprint` (already a dependency, used by Lab 2's `apiVisibility` and Lab 3's
`apiGrade`), the existing `catalogApiRef` (`useApi(catalogApiRef).getEntities()`) already used
elsewhere in the Backstage frontend, and `js-yaml` (already a `packages/app` dependency as of Lab
5's `apiMocking` module) to parse `info.version` out of `spec.definition` client-side. No new root
or `packages/app` dependency is added. On the backend, this lab makes one additive, backward-
compatible extension to Lab 4's existing `autoApiRegistration.ts` module (new `apiBasename`
extraction, `spec.system` assignment, and `System` entity synthesis) rather than adding a new
module — existing Lab 4 sources/specs with no `apiBasename` are unaffected.

**Storage**: No new database beyond Lab 4's own scan-state cache, extended by one nullable column
(`system_slug`, migration `002_add_system_slug`) so the extended provider can recompute which
`System` entities a source currently implies without re-parsing every file each cycle. All new
*catalog* state comes entirely from two local OpenAPI spec files (data-model.md) plus a second
`autoApiRegistration` source and a `catalog.locations` removal in `app-config.yaml` — zero
hand-authored catalog YAML. No runtime-generated files, consistent with Labs 1–4 (Lab 5's
mock-gateway is the only lab with a generated-artifact concern, and this lab has none).

**Testing**: Manual browser verification per lab README (no automated test suite — consistent
with Labs 1–5's tutorial-lab testing approach; see quickstart.md for the exact verification
walkthrough).

**Target Platform**: Local development machine — Windows 10/11 and macOS 12+ (same as Labs 1–5).

**Project Type**: Tutorial lab — Markdown documentation + two OpenAPI spec files (no catalog YAML)
+ one new small TypeScript frontend module (an `EntityCardBlueprint` info card) + one additive
extension to Lab 4's existing backend module.

**Performance Goals**: The Versions card's `catalogApi.getEntities()` call is filtered
server-side to the viewed entity's own `spec.system`, so it returns only that API's sibling
versions (typically single digits) regardless of total catalog size — O(1) relative to catalog
scale, not O(total APIs) (research.md R8).

**Constraints**: Zero cost; cross-platform; no external network access beyond what Labs 1–5
already require; supersedes Lab 2's single `museum-api` catalog entry (research.md R6); does not
edit any previously-committed **spec** file (v1's spec is a new local copy, not an edit to Lab 1's
file — research.md R6) and does not require Labs 1–5 to be redone (FR-011). The one deliberate
exception to "no edits to previously-committed files" is `autoApiRegistration.ts` itself
(research.md R1a) — an additive, backward-compatible change, not a rewrite, made because
`apiBasename`→`System` support has no other implementation surface consistent with Lab 4's own
"metadata declared once, at the source" principle.

**Scale/Scope**: Lab demo: 2 new `API` entities (v1 a local, content-identical copy of Lab 1's
spec, v2 new with deliberate breaking changes), both auto-registered; 1 `System` entity,
auto-synthesized from `apiBasename` (no `system.yaml`); 1 new frontend module (~3 files); 1
`app-config.yaml` change (a second `autoApiRegistration` source added, 1 `catalog.locations` entry
removed, 0 added); 1 additive extension to Lab 4's existing backend module (`apiBasename`
extraction + `System` synthesis + 1 new nullable cache column); 0 new dependencies; 0 new backend
modules. Designed-for scale (config-only, per research.md R8): each additional logical API at a
500+-API deployment is one more spec file declaring an `apiBasename`, with no code or architecture
change and no growth in the Versions card's per-view query cost.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates concrete, named Backstage features: the `System` entity/`spec.system` relation for grouping, Lab 4's `x-<namespace>` extraction mechanism extended to a new field (`apiBasename`) and a new target (`spec.lifecycle`), and the `EntityCardBlueprint` pattern for a computed cross-version summary view | ✅ Pass |
| II. Process-Oriented Documentation | README must explain WHY `System` (not a bespoke annotation) was chosen for grouping (research.md R1), WHY it is auto-synthesized rather than hand-authored (research.md R1a), WHY "latest" is read from `info.version` rather than a duplicated annotation (research.md R2), WHY lifecycle reuses the spec's own `x-examplecorp.lifecycle` field rather than a catalog override (research.md R3), WHY Backstage's native search/catalog table is deliberately left unmodified rather than built into a custom collator (research.md R5), and WHY Lab 2's single `museum-api` entity is being superseded (research.md R6). The new `ApiVersionsCard.tsx`, the two OpenAPI spec files, and the `autoApiRegistration.ts` extension are each likely to exceed the ~40–50 line inline threshold and MUST be committed under `labs/lab-06-api-lifecycle-management/{code,apis}/` and `labs/lab-04-auto-registration/code/` respectively, linked from the README, not inlined | ✅ Pass (with file-size rule flagged for tasks) |
| III. Cross-Platform Compatibility | Two static OpenAPI files, an additive TypeScript change to an existing backend module, and a pure-TypeScript React card — no native/platform-specific dependencies; `yarn start` continues to work identically on Windows and macOS; no new scripts or platform-specific commands are introduced | ✅ Pass |
| IV. Self-Contained Prerequisites | No new prerequisites beyond Labs 1–5's existing Node/Yarn/Backstage setup — no new dependency to install (`js-yaml` is already present as of Lab 5) | ✅ Pass |
| V. Zero-Cost Operation | No new dependency, tool, or service of any kind, paid or otherwise | ✅ Pass |
| VI. Progressive Lab Structure | Requires Labs 1–5 completion; v1's spec is a content-identical local copy of Lab 1's Museum OpenAPI spec (Lab 1's own committed file is never edited); the one deliberate exception (superseding Lab 2's single `museum-api` catalog entry, research.md R6) is an explicitly-permitted "breaking change to the environment," documented in README and this plan rather than left implicit | ✅ Pass |
| VII. Modern & Purposeful API Examples | v1 reuses the already-compliant Museum API's content unmodified (aside from the required `x-examplecorp` extension block and a disambiguating title); v2 is a deliberately-breaking variant of the same well-designed API (not a new placeholder example), authored specifically to make the version difference concrete | ✅ Pass |
| VIII. Support Experimentation & Scale | README documents adaptable conventions: the `x-examplecorp` namespace and its fields, the five lifecycle-value convention, and that "one `apiBasename` per logical API" is the pattern to replicate for a learner's own APIs. Verification tests outcomes (which version is flagged latest, which lifecycle chip shows, whether a retired version is collapsed), not implementation internals. **Scale**: the System+relation+filtered-query mechanism is config-only to extend (research.md R8) — no code/architecture change between the lab's 2-version demo and a 500+-API deployment, and adding a new logical API family needs no new backend code, only a spec file. The one explicitly-flagged design boundary (native search/catalog table left unmodified, research.md R5) is documented as a deliberate, generalizing choice rather than an implicit gap | ✅ Pass |
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
catalog entity shapes (auto-registered `API`, auto-synthesized `System`) are documented in
data-model.md instead.

### Source Code (repository root)

```text
labs/
├── lab-04-auto-registration/
│   └── code/packages/backend/src/extensions/
│       ├── autoApiRegistration.ts               # Modified: additive apiBasename→System support
│       │                                        # (research.md R1a) — existing behavior for
│       │                                        # specs with no apiBasename is unchanged
│       └── autoApiRegistrationMigrations/
│           └── 002_add_system_slug.ts           # New: nullable system_slug cache column
└── lab-06-api-lifecycle-management/
    ├── README.md                          # Lab documentation (overview, prereqs, steps,
    │                                      # verification, troubleshooting, adaptable
    │                                      # conventions per Constitution Principle VIII;
    │                                      # no Security Note needed, research.md R9)
    ├── apis/
    │   ├── museum-v1/
    │   │   └── museum-v1-openapi.yaml     # New: content-identical local copy of Lab 1's spec
    │   │                                  # + x-examplecorp block (research.md R6) — no
    │   │                                  # catalog-info.yaml
    │   └── museum-v2/
    │       └── museum-v2-openapi.yaml     # New: Museum API v2 with deliberate breaking
    │                                      # changes vs. v1 + x-examplecorp block, documented
    │                                      # as a changelog callout (research.md R6)
    └── code/
        └── packages/
            └── app/
                └── src/
                    └── modules/
                        └── apiVersions/
                            ├── ApiVersionsCard.tsx     # New: lists sibling versions, flags
                            │                           # latest from info.version, collapses
                            │                           # retired ones (research.md R2, R4)
                            ├── ApiLifecycleBanner.tsx  # New: main-column warning for
                            │                           # deprecated/retired versions
                            ├── versionUtils.ts         # New: shared version/lifecycle
                            │                           # parsing, incl. info.version via
                            │                           # js-yaml (research.md R2)
                            └── index.ts                # New: EntityCardBlueprint wrapper,
                                                         # same pattern as apiVisibility/apiGrade
```

Changes to the student's Backstage instance (guided by README, not committed as generated
output, but the module source itself IS committed since it is lab teaching content):

```text
# In the student's Backstage instance (labs/lab-01-base-backstage/backstage/):
app-config.yaml                                # Modified: autoApiRegistration converted to the
                                                # `sources:` array form with a new lab6-museum-api
                                                # source; Lab 2's single museum-api.yaml
                                                # catalog.locations entry removed, no replacement
                                                # entries added (auto-registration needs none)
packages/app/
└── src/
    ├── App.tsx                                # Modified: register apiVersionsModule in the
    │                                          # features array (same pattern as Lab 2/3)
    └── modules/
        └── apiVersions/                       # New: copied from labs/lab-06-.../code/packages/
            ├── ApiVersionsCard.tsx             # app/src/modules/apiVersions/
            ├── ApiLifecycleBanner.tsx
            ├── versionUtils.ts
            └── index.ts
```

**Structure Decision**: Tutorial-documentation layout, consistent with Labs 1–5. All
student-facing content lives under `labs/lab-06-api-lifecycle-management/`; the new frontend
module and both OpenAPI spec files are committed under this lab's own directory (each exceeds the
~40–50 line inline threshold per Constitution Principle II) and linked from the README rather than
embedded inline. The one exception is the additive `autoApiRegistration.ts` extension, committed
under Lab 4's own `code/` directory since it modifies that lab's shared module, not a Lab 6-owned
file. The student's Backstage instance (from Lab 1) is modified in place per the README
instructions, same pattern as Labs 2–5. Lab 1's original Museum OpenAPI file is never edited — v1
is a new, content-identical local copy living under this lab's own directory, not Lab 1's or Lab
2's. Speckit artefacts live under `specs/006-api-lifecycle-management/` per convention.

## Complexity Tracking

No violations recorded — table omitted per template instructions.
