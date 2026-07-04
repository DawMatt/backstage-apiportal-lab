# Quickstart: Lab 6 — API Lifecycle Management

This is the verification walkthrough the lab README will guide a learner through; it is the basis
for `tasks.md`'s acceptance-testing tasks, not new documentation prose in its own right.

## Prerequisites

- Labs 1–5 completed (running Backstage instance from Lab 1, teams/users/visibility from Lab 2,
  quality tooling from Lab 3, auto-registration from Lab 4, mocking/testing from Lab 5).
- No new tools, accounts, or paid services required (Constitution Principle V).

## Steps

1. Add the new `System` entity (`museum-api`) and two versioned `API` entities (`museum-api-v1`,
   `museum-api-v2`) under `labs/lab-06-api-lifecycle-management/catalog/`, and the new `museum-v2`
   OpenAPI spec file under `labs/lab-06-api-lifecycle-management/apis/museum-v2/openapi.yaml`.
2. Update `app-config.yaml`'s `catalog.locations`: remove Lab 2's single `museum-api.yaml` entry,
   add the three new entries (System, v1, v2).
3. Add the `apiVersions` frontend module (`packages/app/src/modules/apiVersions/`) and register it
   in `packages/app/src/App.tsx`'s `features` array, following the same pattern as
   `apiVisibilityModule`/`apiGradeModule`.
4. Restart Backstage (`yarn start`). Confirm the catalog now shows `museum-api-v1` and
   `museum-api-v2` as separate entities, and a new `museum-api` System entity.
5. Open either version's page. Confirm the new "API Versions" card lists both versions, flags v2 as
   Latest, and shows each one's own lifecycle chip (v1: production, v2: development).
6. Edit `museum-api-v2`'s catalog file: change `spec.lifecycle` from `development` to `testing`,
   then to `production`. After each change, refresh the page and confirm the Versions card and the
   entity's own About card reflect the new value, and that v1's entry is unaffected.
7. Edit `museum-api-v1`'s catalog file: change `spec.lifecycle` to `deprecated`. Confirm the
   Deprecated label appears on v1's own page and in the Versions card on both v1 and v2's pages.
8. Edit `museum-api-v1`'s catalog file again: change `spec.lifecycle` to `retired`. Confirm v1 now
   only appears in the Versions card behind the "Show retired versions" toggle (collapsed by
   default), while remaining fully viewable via a direct link to its own page, clearly labeled
   Retired.
9. Confirm no catalog entity was deleted at any point in steps 6–8 — `museum-api-v1` is still
   present and inspectable in the catalog at the end.

## Success Criteria Mapping

| Quickstart Step | Spec Success Criterion |
|---|---|
| 4 | SC-001 |
| 5 | SC-002, SC-003 |
| 6 | SC-004 |
| 7–8 | SC-005 |
| 9 | SC-006 |
