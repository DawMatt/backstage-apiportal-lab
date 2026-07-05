# Quickstart: Lab 6 — API Lifecycle Management

This is the verification walkthrough the lab README will guide a learner through; it is the basis
for `tasks.md`'s acceptance-testing tasks, not new documentation prose in its own right.

## Prerequisites

- Labs 1–5 completed (running Backstage instance from Lab 1, teams/users/visibility from Lab 2,
  quality tooling from Lab 3, auto-registration from Lab 4, mocking/testing from Lab 5).
- No new tools, accounts, or paid services required (Constitution Principle V).

## Steps

1. Add the two OpenAPI spec files under `labs/lab-06-api-lifecycle-management/apis/museum-v1/` and
   `.../museum-v2/`, each with an `info.x-examplecorp` block declaring `owner`, `visibility`,
   `lifecycle`, and `apiBasename: museum-api`. No catalog-info.yaml, and no `system.yaml`.
2. Extend `autoApiRegistration.ts` (`labs/lab-04-auto-registration/code/.../autoApiRegistration.ts`)
   to read `x-<namespace>.apiBasename`, set `spec.system` on generated `API` entities, and
   synthesize one `System` entity per distinct `apiBasename`.
3. Update `app-config.yaml`: convert `autoApiRegistration` to the `sources:` array form and add a
   second source (`lab6-museum-api`) pointing at this lab's `apis/` directory; remove Lab 2's
   single `museum-api.yaml` `catalog.locations` entry (no replacement entries needed).
4. Add the `apiVersions` frontend module (`packages/app/src/modules/apiVersions/`) and register it
   in `packages/app/src/App.tsx`'s `features` array, following the same pattern as
   `apiVisibilityModule`/`apiGradeModule`.
5. Restart Backstage (`yarn start`). Within one poll cycle, confirm the catalog now shows
   `museum-api-v1` and `museum-api-v2` as separate entities (no hand-authored catalog file for
   either), and a `museum-api` System entity synthesized from their shared `apiBasename`.
6. Open either version's page. Confirm the new "API Versions" card lists both versions, flags v2 as
   Latest (computed from each spec's own `info.version`), and shows each one's own lifecycle chip
   (v1: production, v2: development, both read from `info.x-examplecorp.lifecycle`).
7. Edit `museum-v2-openapi.yaml`'s `info.x-examplecorp.lifecycle`: change it from `development` to
   `testing`, then to `production`. After each change, wait for the next poll cycle, refresh the
   page, and confirm the Versions card and the entity's own About card reflect the new value, and
   that v1's entry is unaffected — no commit/push required, since the file is read from local disk.
8. Edit `museum-v1-openapi.yaml`'s `info.x-examplecorp.lifecycle` to `deprecated`. Confirm the
   Deprecated label appears on v1's own page and in the Versions card on both v1 and v2's pages.
9. Edit `museum-v1-openapi.yaml`'s `info.x-examplecorp.lifecycle` again: change it to `retired`.
   Confirm v1 now only appears in the Versions card behind the "Show retired versions" toggle
   (collapsed by default), while remaining fully viewable via a direct link to its own page,
   clearly labeled Retired.
10. Confirm no catalog entity was deleted at any point in steps 7–9 — `museum-api-v1` is still
    present and inspectable in the catalog at the end.

## Success Criteria Mapping

| Quickstart Step | Spec Success Criterion |
|---|---|
| 5 | SC-001 |
| 6 | SC-002, SC-003 |
| 7 | SC-004 |
| 8–9 | SC-005 |
| 10 | SC-006 |
