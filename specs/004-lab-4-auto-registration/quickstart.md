# Quickstart: Lab 4 — Auto Registration

This is the design-time quickstart used to validate the plan; the learner-facing README (built in
`/speckit-tasks` + `/speckit-implement`) will follow the same flow with full explanatory prose per
Constitution Principle II.

## Prerequisites

- Labs 1–3 completed (running Backstage 1.51.0 instance, Lab 2 teams/users, Lab 3 quality tooling).
- No new external accounts or services.

## Steps

1. **Install dependencies**: add `fast-glob` and `js-yaml` as direct dependencies of
   `packages/backend`.
2. **Add the auto-registration backend module**
   (`packages/backend/src/extensions/autoApiRegistration.ts`): implements the `EntityProvider` +
   companion `CatalogProcessor` described in research.md R1–R4. Registered in
   `packages/backend/src/index.ts` via `backend.add(import('./extensions/autoApiRegistration'))`.
3. **Configure discovery** in `app-config.yaml` under a new `autoApiRegistration` block (see
   data-model.md for keys/defaults).
4. **Add the two new sample files**:
   - `labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml` (vendored Scalar Galaxy API
     with `x-backstage-*` fields added) — no pre-existing `catalog-info.yaml`.
   - `labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-openapi.yaml` +
     `precedence-demo-catalog-info.yaml` — demonstrates FR-011 precedence.
5. **Start Backstage** (`yarn start` from the Lab 1 backstage workspace) and confirm:
   - The Galaxy API appears in the catalog within one discovery cycle (~30s), with no manually
     written catalog file (US1, SC-001).
   - Its `spec.owner`, `spec.lifecycle`, and tags match the `x-backstage-*` values in the spec
     file (US2, SC-002).
   - The precedence-demo API's catalog entity reflects the hand-authored
     `precedence-demo-catalog-info.yaml`, not the auto-sourced values (FR-011).
6. **Verify update-in-place**: edit `galaxy-openapi.yaml`'s `info.description`, wait one cycle,
   confirm the existing entity updates rather than duplicating (FR-003).
7. **Verify removal**: temporarily rename `galaxy-openapi.yaml` out of the discovery pattern, wait
   one cycle, confirm the entity is no longer listed as active (FR-004, SC-005); rename it back.
8. **Verify error handling**: temporarily break the YAML syntax in one file, confirm a log line
   identifies the file; temporarily set `x-backstage-owner` to a nonexistent team, confirm a
   catalog processing error is visible on that entity (FR-008, SC-003).

## Out of scope for this quickstart

- Full JSON-Schema validation of spec files (documented as a learner extension point, not built).
- Real-time file-watching (documented as a deliberate simplification — 30s poll cycle).
