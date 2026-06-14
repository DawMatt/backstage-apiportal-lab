# Implementation Plan: Lab 3 — API Quality

**Branch**: `003-api-quality` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-lab-3-api-quality/spec.md`

## Summary

Lab 3 builds on the running Backstage 1.51.0 instance from Labs 1 and 2. It introduces
API quality tooling via two plugins and a shared Spectral ruleset. A `.spectral.yaml` file
committed to the repository extends the default OAS3 and AsyncAPI Spectral rules and is
referenced by both quality plugins via its GitHub raw URL — one file, one URL, consistent
results across both tools (FR-001, FR-013).

The `backstage-plugin-api-grade` frontend plugin and `backstage-plugin-api-grade-backend`
backend plugin (from `https://github.com/DawMatt/api-grade`) are installed and configured.
The backend computes grades on demand per page load using Spectral and the shared ruleset.
The api-grade card natively splits its display: all authenticated users see the grade
summary (letter, percentage, quality label); members of the API's owning team and members
of `group:default/platform-team` (configured via `apiGrade.visibility.groups`) see the
full detailed breakdown.

The `@dweber019/backstage-plugin-api-docs-spectral-linter` plugin is installed from npm
and adds a "Spectral" tab to each API entity page. Permission gating is handled by a custom
wrapper component that checks ownership via `useEntityOwnership` and platform-team
membership via `identityApiRef.getBackstageIdentity().ownershipEntityRefs`. Owners and
platform team members see the Spectral lint results; non-owners see an access-restricted
message in the same tab.

A new user `eve` (platform team member) is added to the catalog. The existing `platform-team`
group from Lab 2 is updated to list `eve` as a member. All quality features are free,
open-source, and cross-platform. No paid accounts or external services are required.

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage 1.51.0, pinned from Lab 1)

**Primary Dependencies**:
- `backstage-plugin-api-grade` — not yet on npm; install from GitHub source
- `backstage-plugin-api-grade-backend` — not yet on npm; install from GitHub source
- `@dweber019/backstage-plugin-api-docs-spectral-linter@0.5.2` — on npm
- No additional Spectral npm packages required (bundled in api-grade-core and linter plugin)

**Storage**: YAML files (Spectral ruleset, one new User catalog descriptor); updates to
two existing YAML files (teams.yaml in Lab 2 and app-config.yaml in Lab 1 Backstage instance)

**Testing**: Manual browser verification per lab README (no automated test suite — tutorial lab)

**Target Platform**: Local development machine — Windows 10/11 and macOS 12+ (same as Lab 1/2)

**Project Type**: Tutorial lab — Markdown documentation + YAML config/catalog files +
TypeScript frontend modules

**Performance Goals**: Grade visible within a few seconds of opening an API entity page;
no startup delay beyond Lab 2 baseline

**Constraints**: Zero cost; cross-platform; all api-grade packages are MIT-licensed;
spectral linter is MIT-licensed; builds on Lab 2's Backstage instance without disrupting
existing Lab 2 features (visibility annotation card, permission policy)

**Scale/Scope**: 5 users (4 from Lab 2 + 1 new platform team member `eve`), 3 APIs
(unchanged from Lab 2), 1 Spectral ruleset file, 2 new backend plugins
(api-grade-backend), 3 new frontend modules (apiGrade, spectralLinter + wrapper)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates concrete Backstage features: Spectral ruleset integration, api-grade plugin (frontend card + backend grader), Spectral linter plugin (tab with permission-gated content), custom `EntityCardBlueprint` + `EntityContentBlueprint` extensions, `identityApiRef` for runtime permission checks, `apiGrade.visibility.groups` config | ✅ Pass |
| II. Process-Oriented Documentation | README must explain WHY a single shared ruleset is used (single source of truth), WHY grades are computed on demand (plugin design), WHY `identityApiRef` is needed for platform-team checks (filter predicates lack user context), and WHY the Spectral linter tab shows an access-restricted message instead of being hidden (EntityContentBlueprint filter limitation) | ✅ Pass |
| III. Cross-Platform Compatibility | All new changes are YAML and TypeScript; `yarn add` and `yarn start` work identically on Windows and macOS; file paths in config use forward slashes (URL format for GitHub raw); no shell-specific commands beyond those used in Lab 1/2 | ✅ Pass |
| IV. Self-Contained Prerequisites | api-grade plugin not on npm — README must provide both the npm-first approach and the GitHub source build fallback, with step-by-step instructions for both; spectral linter is on npm (no special prereqs); all npm/yarn commands documented | ✅ Pass |
| V. Zero-Cost Operation | All plugins are MIT-licensed; api-grade is DawMatt's own open-source work (same repo author); spectral linter is free OSS; GitHub raw URL access is free; no cloud services required | ✅ Pass |
| VI. Progressive Lab Structure | Lab 3 requires Lab 2 completion; adds to (does not replace) the Lab 2 permission policy, catalog entities, and authentication setup; `eve` user extends the Lab 2 user set; no Lab 2 feature is broken or removed | ✅ Pass |
| VII. Modern & Purposeful API Examples | No new API examples added; Museum (OpenAPI), Streetlights (AsyncAPI), and Train Travel (OpenAPI) from Labs 1/2 are used for quality demonstration — these already satisfy Principle VII | ✅ Pass |
| VIII. Support Experimentation | README notes alternatives: custom Spectral rules can be added to the shared ruleset file; `visibility.groups` can include additional groups; the platform-team check in `SpectralLinterContent` uses the same pattern as the permission policy and can be extended; verification tests outcomes, not exact implementation details | ✅ Pass |
| IX. Pragmatic Security for Learning Environments | No new insecure security shortcuts introduced in Lab 3; the development guest provider from Lab 2 is reused (`userEntityRef: user:default/eve`). No Security Note section is required. If the Spectral ruleset is hosted in a private repo, a GitHub PAT token would be added to `app-config.local.yaml` (gitignored) — the README must include the production alternative (OIDC-scoped token, secrets manager) if this path is documented | ✅ Pass |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/003-lab-3-api-quality/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

No `contracts/` directory — this lab produces no external API contracts.
All interface definitions are Backstage catalog YAML descriptors and app-config.yaml
additions, documented in data-model.md.

### Source Code (repository root)

```text
labs/
├── lab-02-users-roles/
│   └── catalog/
│       └── teams.yaml                          # Modified: add `eve` to platform-team members
│                                               # (Lab 3 introduces the platform team's first member)
└── lab-03-api-quality/
    ├── README.md                               # Lab documentation (overview, prereqs, steps,
    │                                           # verification, troubleshooting)
    ├── .spectral.yaml                          # Shared Spectral ruleset (OAS3 + AsyncAPI defaults)
    │                                           # extends: [spectral:oas, spectral:asyncapi]
    └── catalog/
        └── platform-user.yaml                 # New User entity: eve (platform team member)
```

Changes to the student's Backstage instance (guided by README, not committed to repo):

```text
# In the student's Backstage instance (labs/lab-01-base-backstage/backstage/):
app-config.yaml                                # Modified: add catalog location for platform-user.yaml;
                                               # add apiGrade section; add spectralLinter section
packages/app/
├── package.json                               # Modified: add backstage-plugin-api-grade
│                                             # and @dweber019/backstage-plugin-api-docs-spectral-linter
└── src/
    ├── App.tsx                                # Modified: add apiGradeModule, spectralLinterModule
    └── modules/
        ├── apiGrade/
        │   └── index.ts                       # New: EntityCardBlueprint wrapping ApiGradeCard
        │                                      # type:'info' places card in right-hand info column
        │                                      # filter:'kind:API' limits to API entity pages
        └── spectralLinter/
            ├── index.ts                       # New: EntityContentBlueprint wrapping SpectralLinterContent
            │                                  # defaultPath:'/spectral', defaultTitle:'Spectral'
            │                                  # filter:'kind:API'
            └── SpectralLinterContent.tsx      # New: permission-gated wrapper component
                                               # Shows lint results to owners + platform-team
                                               # Shows access-restricted message to others
packages/backend/
├── package.json                               # Modified: add backstage-plugin-api-grade-backend
└── src/
    └── index.ts                               # Modified: add backend.add(import('backstage-plugin-api-grade-backend'))
```

**Structure Decision**: Tutorial-documentation layout, consistent with Labs 1 and 2. All
student-facing content lives under `labs/lab-03-api-quality/`. The Spectral ruleset file
is committed alongside the lab README in the lab directory. The student's Backstage
instance (from Lab 1) is modified in-place per the README instructions. One file from
Lab 2 (`teams.yaml`) is updated — the README documents this cross-lab dependency explicitly.
Speckit artefacts live under `specs/003-lab-3-api-quality/` per convention.
