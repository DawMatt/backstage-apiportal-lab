# Quickstart Verification: Lab 3 — API Quality

**Branch**: `003-api-quality` | **Date**: 2026-06-15

## Prerequisites

- Lab 2 completed — Backstage running locally with Museum API, Streetlights API, and Train
  Travel API registered; user/group visibility working; Alice and Charlie sign-in verified
- Lab 3 changes committed and pushed to the branch that `app-config.yaml` catalog URLs
  reference (platform-user.yaml must be reachable at its registered URL)
- api-grade plugins installed (from npm or GitHub source — see README)
- `@dweber019/backstage-plugin-api-docs-spectral-linter` installed
- `app-config.yaml` updated with `apiGrade` and `spectralLinter` sections
- `packages/backend/src/index.ts` updated with `backend.add(import('@dawmatt/backstage-plugin-api-grade-backend'))`
- `App.tsx` updated with `apiGradeModule` and `spectralLinterModule`

## Verification Steps

### Step 1 — Platform Team Member in the Catalog

1. Start Backstage: `yarn start` in `labs/lab-01-base-backstage/backstage/`
2. Open `http://localhost:3000`
3. Navigate to **Catalog** → filter by **Kind: User**
4. Verify `eve` appears alongside the four users from Lab 2
5. Click `eve` → verify group membership shows `platform-team`
6. Navigate to **Catalog** → filter by **Kind: Group**
7. Click `platform-team` → verify `eve` is listed as a member

✅ **Pass**: Eve appears in the catalog and is listed as a member of platform-team
❌ **Fail**: Check that `platform-user.yaml` is accessible at its registered URL; verify the
  catalog location entry is in `app-config.yaml` with `allow: [User]`; check that
  `labs/lab-02-users-roles/catalog/teams.yaml` has `eve` in platform-team's `members` list

---

### Step 2 — API Grade Card Visible for All Users (No Sign-In Required)

1. Navigate to **Catalog** → filter by **Kind: API**
2. Click the **Museum API** entry
3. Verify the **API Grade** card appears in the right-hand Info column, below the About
   card and the API Visibility card
4. Verify the card shows a grade letter (A–F), a numeric percentage, and a quality label
5. Navigate to the **Streetlights API** and **Train Travel API** — verify the grade card
   appears for all three APIs
6. Note that the grade is based on the shared Spectral ruleset; grades will vary by API

✅ **Pass**: Grade card visible in the Info column for all API entity pages
❌ **Fail (card missing)**: Check that `apiGradeModule` is in the `features` array in
  `App.tsx`; verify the module file exists and is imported correctly; check browser console
  for errors
❌ **Fail (grade shows error/blank)**: Check that `@dawmatt/backstage-plugin-api-grade-backend` is
  registered in `packages/backend/src/index.ts`; check backend logs for Spectral errors;
  verify `apiGrade.ruleset.url` is reachable (try fetching it in a browser)

---

### Step 3 — API Grade Detail Visible to API Owner

1. Set `app-config.local.yaml` to sign in as Alice (museum-team):
   ```yaml
   auth:
     providers:
       guest:
         userEntityRef: user:default/alice
   ```
2. Restart Backstage, wait for catalog, click **Sign In** → **Enter as Guest**
3. Verify profile shows **Alice Chen**
4. Navigate to the **Museum API** entity page
5. Verify the **API Grade** card shows:
   - Grade letter, percentage, quality label (summary — always visible)
   - Quality Assessment commentary
   - Numbered Recommendations
   - Full Diagnostics list with individual rule results
6. Navigate to the **Spectral** tab on the Museum API page
7. Verify the Spectral lint results panel is visible and shows OAS3 rule violations (or
   a clean pass) for the Museum API specification

✅ **Pass**: Alice sees both the grade detail and Spectral lint results for the Museum API
❌ **Fail (detail missing from grade card)**: Verify `apiGrade.visibility.groups` is NOT set
  to `allowAll: true`; check that `group:default/platform-team` is in `visibility.groups`
  (Alice is in museum-team, so she gets detail via ownership, not platform-team config);
  verify that the backend is correctly resolving Alice's `ownershipEntityRefs`
❌ **Fail (Spectral tab missing)**: Check that `spectralLinterModule` is in `App.tsx`; verify
  `EntityContentBlueprint` import is from `@backstage/plugin-catalog-react/alpha`
❌ **Fail (Spectral tab shows access-restricted message to Alice)**: Verify `useEntityOwnership`
  is returning `isOwnedEntity: true` for Alice on the Museum API; check browser console
  for identity API errors

---

### Step 4 — API Grade Detail and Spectral Lint Restricted for Non-Owner

1. Edit `app-config.local.yaml`: change `userEntityRef` to `user:default/charlie`
2. Restart Backstage, wait for catalog, click **Sign In** → **Enter as Guest**
3. Verify profile shows **Charlie Davis**
4. Navigate to the **Museum API** entity page (Charlie is in streetlights-team, not museum-team)
5. Verify the **API Grade** card shows the grade summary (letter, percentage, label) ONLY —
   no Quality Assessment, Recommendations, or Diagnostics
6. Navigate to the **Spectral** tab on the Museum API page
7. Verify the Spectral tab shows an access-restricted message (NOT the lint results)

✅ **Pass**: Charlie sees the grade summary but not the detailed quality information for
  the Museum API
❌ **Fail (Charlie sees full detail)**: Check the `visibility.allowAll` config is `false`;
  verify Charlie is NOT a member of platform-team; check that `group:default/platform-team`
  in `visibility.groups` refers to the correct group entity ref
❌ **Fail (Spectral tab shows lint results to Charlie)**: The `SpectralLinterContent` ownership
  check is not working — verify `useEntityOwnership` hook is imported from
  `@backstage/plugin-catalog-react` and that the Museum API has `spec.owner: group:default/museum-team`

---

### Step 5 — Platform Team Sees Detail on All APIs

1. Edit `app-config.local.yaml`: change `userEntityRef` to `user:default/eve`
2. Restart Backstage, wait for catalog, click **Sign In** → **Enter as Guest**
3. Verify profile shows **Eve Rodriguez**
4. Navigate to the **Museum API** entity page (owned by museum-team, NOT platform-team)
5. Verify the **API Grade** card shows the full detailed view (Quality Assessment,
   Recommendations, Diagnostics) — eve gets detail via `visibility.groups: [platform-team]`
6. Navigate to the **Spectral** tab → verify lint results are visible (not access-restricted)
7. Repeat for the **Streetlights API** (owned by streetlights-team):
   - Verify grade detail is visible
   - Verify Spectral lint results are visible
8. Repeat for the **Train Travel API** (owned by platform-team — eve's own team):
   - Both grade detail and Spectral lint results visible
9. Navigate to **Catalog** → verify all three APIs are visible to Eve (the Lab 2 permission
   policy is unchanged; shared and platform-team-owned APIs remain visible to all users)

✅ **Pass**: Eve sees detailed quality information for all three APIs, regardless of ownership
❌ **Fail (Eve sees summary only for Museum/Streetlights APIs)**: Verify `apiGrade.visibility.groups`
  contains `group:default/platform-team` in `app-config.yaml`; confirm `eve`'s catalog
  User entity has `memberOf: [platform-team]` and that both entries are consistent
❌ **Fail (Spectral shows access-restricted for Eve on Museum/Streetlights)**: Verify
  `SpectralLinterContent` checks `identity.ownershipEntityRefs.includes('group:default/platform-team')`;
  check that Eve's `getBackstageIdentity()` returns ownershipEntityRefs that include
  `group:default/platform-team` (catalog must have resolved Eve's group membership)

---

### Step 6 — Spectral Ruleset Consistency Check (Optional Verification)

This step confirms the shared Spectral ruleset produces consistent results in both plugins.

1. While signed in as Alice, navigate to the **Museum API** entity page
2. Note the Diagnostics count and top failing rules shown in the api-grade card
3. Click the **Spectral** tab → verify the rule violations listed match those in the
   api-grade Diagnostics (same rules, same counts)
4. If they differ, check that both `apiGrade.ruleset.url` and `spectralLinter.openApiRulesetUrl`
   point to the same `.spectral.yaml` file URL

✅ **Pass**: Diagnostics from the api-grade card and the Spectral linter tab reference the
  same rule violations for the Museum API
❌ **Fail (different results)**: One of the two config URL values may point to a different
  ruleset or a stale-cached version; verify both URLs are identical in `app-config.yaml`

---

### Step 7 — AsyncAPI Quality Check

1. While signed in as Charlie, navigate to the **Streetlights API** entity page
2. Verify the **API Grade** card shows a grade for the AsyncAPI specification
3. Navigate to the **Spectral** tab → note the access-restricted message (Charlie is not
   in streetlights-team or platform-team)
4. Edit `app-config.local.yaml` to sign in as Eve, restart, and navigate to Streetlights API
5. Navigate to the **Spectral** tab → verify AsyncAPI lint results are visible (OAS3 rules
   do NOT appear; only AsyncAPI rules apply to the Streetlights API)

✅ **Pass**: AsyncAPI spec receives a quality grade and async-specific lint results, not OAS3 results
❌ **Fail (no grade for Streetlights API)**: Check that `spec.type: asyncapi` is set in
  `streetlights-api.yaml` and that the api-grade backend supports asyncapi format (confirmed
  in research R-004)

---

## Summary Checklist

- [ ] `eve` (Eve Rodriguez) appears in the catalog as a member of `platform-team`
- [ ] `platform-team` group page lists `eve` as a member
- [ ] API Grade card appears in the Info column below About on all three API entity pages
- [ ] All authenticated users see the grade summary (letter, percentage, quality label) without signing in
- [ ] Signed in as Alice → Museum API grade card shows full detail (Quality Assessment + Diagnostics)
- [ ] Signed in as Alice → Museum API Spectral tab shows OAS3 lint results
- [ ] Signed in as Charlie → Museum API grade card shows summary only (no detail)
- [ ] Signed in as Charlie → Museum API Spectral tab shows access-restricted message
- [ ] Signed in as Eve → Museum API grade card shows full detail (via platform-team config)
- [ ] Signed in as Eve → Museum API Spectral tab shows lint results (via platform-team check)
- [ ] Signed in as Eve → Streetlights API quality features also fully visible
- [ ] Spectral lint results for Museum API and api-grade Diagnostics reference the same rule violations
- [ ] Streetlights API (AsyncAPI) receives a quality grade and shows AsyncAPI-specific lint results
