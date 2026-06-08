# Implementation Plan: Lab 1 — Base Backstage Implementation

**Branch**: `001-lab-1-base-backstage` | **Date**: 2026-06-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-lab-1-base-backstage/spec.md`

## Summary

Lab 1 guides a developer through installing a local Backstage instance using
`npx @backstage/create-app`, then registering sample OpenAPI and AsyncAPI API specifications
using the catalog-as-code pattern (`catalog-info.yaml` descriptors configured in
`app-config.yaml`). The lab concludes by demonstrating that both APIs are visible in the
Backstage catalog and discoverable via search. All tooling is free and cross-platform
(Windows + macOS).

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage's primary runtime; 18 LTS also
supported as fallback)

**Primary Dependencies**: `@backstage/create-app` (scaffolding CLI), Backstage monorepo
packages (frontend + backend, installed by the scaffolder), Yarn Classic v1.x (Backstage's
required package manager)

**Storage**: Local filesystem — YAML files for `catalog-info.yaml` descriptors and OpenAPI/
AsyncAPI spec files; SQLite for Backstage's local catalog database (created automatically)

**Testing**: Manual verification via browser and Backstage UI; no automated test suite
(lab content, not software)

**Target Platform**: Local development machine — Windows 10/11 and macOS 12 (Monterey) or
later

**Project Type**: Tutorial lab — Markdown documentation + YAML configuration files +
sample API specification files

**Performance Goals**: Full lab completable within 60 minutes on a clean machine; Backstage
dev server starts within 3 minutes after `yarn start`

**Constraints**: Zero cost; cross-platform (Windows + macOS); internet required only for
initial package download; Backstage version pinned at lab authoring time for reproducibility

**Scale/Scope**: Single developer, single local Backstage instance, 2 API specifications
(1 OpenAPI, 1 AsyncAPI)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates a concrete Backstage capability (catalog registration + search) | ✅ Pass |
| II. Process-Oriented Documentation | Lab explains WHY each config step exists, not just WHAT to type | ✅ Pass |
| III. Cross-Platform Compatibility | `npx @backstage/create-app` supports Windows and macOS; instructions include platform variants for shell differences | ✅ Pass |
| IV. Self-Contained Prerequisites | FR-002 mandates all prerequisites listed with version requirements and free sourcing instructions | ✅ Pass |
| V. Zero-Cost Operation | Node.js, Yarn, Backstage — all free and open-source; FR-009 enforces no paid dependencies | ✅ Pass |
| VI. Progressive Lab Structure | Lab 1 is the foundation; no prior labs required; all subsequent labs build on this Backstage instance | ✅ Pass |
| VII. Modern & Purposeful API Examples | Sample APIs are the Museum API (OpenAPI) and Streetlights (AsyncAPI) — both purposeful, well-designed, self-contained, and free; Petstore explicitly excluded | ✅ Pass |
| VIII. Support Experimentation | README verification checkpoints test outcomes ("If you see this screen…") not prescribed steps; fork/branch substitution is explicitly documented in Steps 5–6; alternative host guidance included | ✅ Pass |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/001-lab-1-base-backstage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── catalog-info-openapi.yaml
│   ├── catalog-info-asyncapi.yaml
│   └── app-config-catalog-snippet.yaml
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
labs/
└── lab-01-base-backstage/
    ├── README.md                        # Lab documentation (overview, prereqs, steps,
    │                                    # verification, troubleshooting)
    ├── apis/
    │   ├── museum/
    │   │   ├── openapi.yaml             # Sample OpenAPI 3.1 specification (Museum API)
    │   │   └── catalog-info.yaml        # Backstage API entity descriptor
    │   └── streetlights/
    │       ├── asyncapi.yaml            # Sample AsyncAPI 2.6 specification (Streetlights)
    │       └── catalog-info.yaml        # Backstage API entity descriptor
    └── backstage/                       # Backstage app — created by student during lab
        │                                # (gitignored; not committed to repo)
        ├── app-config.yaml              # Student modifies this to add catalog locations
        └── ...                          # Other generated Backstage files
```

**Structure Decision**: Tutorial-documentation layout. The `labs/` tree contains all
student-facing content. The Backstage app under `labs/lab-01-base-backstage/backstage/`
is created by the student via `npx @backstage/create-app` during the lab — it is gitignored
so the repo stays lean. Pre-committed assets are limited to the sample API files, catalog
descriptors, and the lab README. The speckit feature artefacts live under `specs/` per the
standard Speckit convention.
