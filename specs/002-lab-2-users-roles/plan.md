# Implementation Plan: Lab 2 — Users, Roles, and API Visibility

**Branch**: `002-lab-2-users-roles` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-lab-2-users-roles/spec.md`

## Summary

Lab 2 builds directly on the running Backstage 1.51.0 instance from Lab 1. It introduces
User and Group catalog entities, assigns API ownership to those groups, and configures
identity-aware sign-in using the guest auth provider already present in the Backstage
install. The lab then replaces the default allow-all permission policy with a custom policy
that restricts catalog visibility to entities owned by the signed-in user's team. The result
is a demonstrable difference in what two users from different teams can see in the API catalog.
All changes are local, zero-cost, and cross-platform.

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage 1.51.0, pinned from Lab 1)

**Primary Dependencies**: Backstage 1.51.0 packages already installed in Lab 1. Lab 2 adds
no new npm packages. The allow-all permission module is removed and replaced by a custom
TypeScript module within the existing backend package.

**Storage**: YAML files (catalog descriptors); TypeScript source file (permission policy);
SQLite in-memory DB for catalog (auto, from Lab 1 config).

**Testing**: Manual browser verification per lab README. No automated test suite (tutorial
lab, not software).

**Target Platform**: Local development machine — Windows 10/11 and macOS 12 (Monterey) or
later; same as Lab 1.

**Project Type**: Tutorial lab — Markdown documentation + YAML catalog files + TypeScript
configuration file (permission policy).

**Performance Goals**: Full lab completable within 60 minutes by a developer who has
completed Lab 1. No additional Backstage startup time beyond Lab 1 baseline.

**Constraints**: Zero cost; cross-platform; internet required only for catalog URL entries
on Backstage startup; builds on Lab 1's Backstage instance; all auth simplifications
labelled per Constitution Principle IX.

**Scale/Scope**: 2 teams (groups), 4 users (2 per team), 2 APIs (from Lab 1), 1 permission
policy.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates concrete Backstage features: catalog User/Group entities, `spec.owner` assignment, guest auth identity configuration, and the permissions framework with a custom policy | ✅ Pass |
| II. Process-Oriented Documentation | README must explain WHY each step exists — why `spec.owner` matters, why the allow-all policy must be replaced, why the guest provider needs a `userEntityRef` | ✅ Pass |
| III. Cross-Platform Compatibility | All changes are YAML and TypeScript; no platform-specific shell commands beyond Lab 1 baseline; `yarn start` start procedure unchanged | ✅ Pass |
| IV. Self-Contained Prerequisites | No new tools required; Lab 1 completion is the only prerequisite; all npm packages already installed | ✅ Pass |
| V. Zero-Cost Operation | Guest provider is bundled with Backstage (free); permission backend already installed; no new packages, accounts, or services needed | ✅ Pass |
| VI. Progressive Lab Structure | Lab 2 requires Lab 1 completion; modifies the same Backstage instance; does not assume any state not established in Lab 1 | ✅ Pass |
| VII. Modern & Purposeful API Examples | No new API examples introduced; Lab 1's Museum API and Streetlights API are reused and updated with ownership | ✅ Pass |
| VIII. Support Experimentation | README notes alternative auth providers (GitHub OAuth) and alternative permission granularities; verification tests outcomes, not exact config values | ✅ Pass |
| IX. Pragmatic Security for Learning Environments | Guest provider with `userEntityRef` is a simplified local auth mechanism. README must include a "Security Note" section explaining that production deployments should use an enterprise identity provider (OIDC, SAML, LDAP). Credentials committed to the repo are fictional example values only. | ✅ Pass |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/002-lab-2-users-roles/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

No `contracts/` directory — this lab produces no external API contracts.
All interface definitions are Backstage catalog YAML descriptors, documented in data-model.md.

### Source Code (repository root)

```text
labs/
└── lab-02-users-roles/
    ├── README.md                        # Lab documentation (overview, prereqs, steps,
    │                                    # verification, security note, troubleshooting)
    └── catalog/
        ├── teams.yaml                   # Group entities: museum-team, streetlights-team
        ├── users.yaml                   # User entities: alice, bob, charlie, diana
        └── apis/
            ├── museum-api.yaml          # Updated catalog-info.yaml with spec.owner
            └── streetlights-api.yaml   # Updated catalog-info.yaml with spec.owner
```

Changes to the student's Backstage instance (guided by README, not committed to repo):

```text
# In the student's Backstage instance (labs/lab-01-base-backstage/backstage/):
app-config.local.yaml                   # New: guest provider userEntityRef setting
app-config.yaml                         # Modified: add catalog locations for Lab 2 files
packages/backend/src/
├── index.ts                            # Modified: remove allow-all, add custom policy
└── extensions/
    └── permissionPolicy.ts             # New: CatalogOwnershipPolicy implementation
```

**Structure Decision**: Tutorial-documentation layout, consistent with Lab 1. All student-
facing content lives under `labs/lab-02-users-roles/`. The student's Backstage instance
(from Lab 1) is modified in-place per the README instructions. Pre-committed assets are
limited to catalog descriptor files and the lab README. Speckit artefacts live under
`specs/002-lab-2-users-roles/` per convention.
