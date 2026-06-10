# Quickstart Verification: Lab 2 — Users, Roles, and API Visibility

**Branch**: `002-lab-2-users-roles` | **Date**: 2026-06-08 (Updated: 2026-06-11)

## Prerequisites

- Lab 1 completed — Backstage running locally with Museum API and Streetlights API registered
- Lab 2 catalog files committed and pushed to the repository branch the Backstage `app-config.yaml` is reading from

## Verification Steps

### Step 1 — Users and Groups in the Catalog

1. Start Backstage: `yarn start` in `labs/lab-01-base-backstage/backstage/`
2. Open `http://localhost:3000`
3. Navigate to **Catalog** → filter by **Kind: Group**
4. Verify `museum-team`, `streetlights-team`, and `platform-team` appear
5. Click `museum-team` → verify `alice` and `bob` are listed as members
6. Click `streetlights-team` → verify `charlie` and `diana` are listed as members
7. Click `platform-team` → verify no members are listed (this is expected — platform-team
   is an organisational unit with no individual members)
8. Navigate to **Catalog** → filter by **Kind: User**
9. Verify all four users appear
10. Click `alice` → verify group membership shows `museum-team`

✅ **Pass**: All four users and three groups visible with correct memberships
❌ **Fail**: Check that catalog locations for `teams.yaml` and `users.yaml` are in `app-config.yaml`
  and that the YAML files are accessible at the configured URLs

### Step 2 — API Ownership and Visibility Metadata

1. Navigate to **Catalog** → filter by **Kind: API**
2. Verify three APIs are visible: Museum API, Streetlights API, Train Travel API
3. Click the **Museum API** entry → verify:
   - The **Owner** field shows `museum-team`
   - The **Tags** section shows `private`
4. Click the **Streetlights API** entry → verify:
   - The **Owner** field shows `streetlights-team`
   - The **Tags** section shows `private`
5. Click the **Train Travel API** entry → verify:
   - The **Owner** field shows `platform-team`
   - The **Tags** section shows `shared`
6. Navigate to the `museum-team` Group page → verify the Museum API appears under **Owned APIs**
7. Navigate to the `streetlights-team` Group page → verify the Streetlights API appears under **Owned APIs**
8. Navigate to the `platform-team` Group page → verify the Train Travel API appears under **Owned APIs**

✅ **Pass**: Each API shows its owning team and its visibility tag (`private` or `shared`)
  on its catalog page; each team's page lists its owned API
❌ **Fail**: Check that the updated API catalog-info.yaml files (with `spec.owner`,
  `example.com/visibility` annotations, and visibility tags) are registered in
  `app-config.yaml` and that the Lab 1 versions are removed to avoid duplicates

### Step 3 — Sign In as Museum Team User

1. Ensure `app-config.local.yaml` contains:
   ```yaml
   auth:
     providers:
       guest:
         userEntityRef: user:default/alice
   ```
2. Restart Backstage: `Ctrl+C` then `yarn start`
3. Wait for catalog to load (UI shows catalog entries before clicking Sign In)
4. Click **Sign In** → click **Enter as Guest**
5. Verify the top-right user icon / profile shows **Alice Chen**

✅ **Pass**: Signed in as Alice (Museum Team member)
❌ **Fail**: Check that `alice` exists in the catalog (Step 1 must pass first); ensure
  `app-config.local.yaml` is in the Backstage root directory

### Step 4 — Verify Museum Team Visibility (Alice)

1. Signed in as Alice, navigate to **Catalog** → filter by **Kind: API**
2. Verify the **Train Travel API** is visible (shared — should appear for all users)
3. Verify the **Museum API** is visible (private — Alice is in museum-team)
4. Verify the **Streetlights API** is NOT visible (private — Alice is not in streetlights-team)
5. Attempt to navigate directly to the Streetlights API URL — Backstage should show an error
   or "Not Found" rather than the API detail page

✅ **Pass**: Alice sees Train Travel API and Museum API; Streetlights API is absent
❌ **Fail**: Check that the custom permission policy is registered in `packages/backend/src/index.ts`
  and that the allow-all policy module import has been removed.
  If Alice cannot see the Train Travel API, verify that `train-travel-api.yaml` has the
  `example.com/visibility: shared` annotation and is registered in `app-config.yaml`.

### Step 5 — Switch to Streetlights Team User and Verify Different Visibility

1. Edit `app-config.local.yaml`: change `userEntityRef` to `user:default/charlie`
2. Restart Backstage: `Ctrl+C` then `yarn start`
3. Wait for catalog to load, then click **Sign In** → **Enter as Guest**
4. Verify profile shows **Charlie Davis**
5. Navigate to **Catalog** → filter by **Kind: API**
6. Verify the **Train Travel API** is visible (shared — visible to all users)
7. Verify the **Streetlights API** is visible (private — Charlie is in streetlights-team)
8. Verify the **Museum API** is NOT visible (private — Charlie is not in museum-team)

✅ **Pass**: Charlie sees Train Travel API and Streetlights API; Museum API is absent
  (Different API set from Alice confirms two-tier visibility is working)
❌ **Fail**: Check that `charlie` exists in the catalog with `memberOf: [streetlights-team]`

### Step 6 — Verify Users and Groups Remain Visible to All Users

1. While signed in as Charlie, navigate to **Catalog** → filter by **Kind: Group**
2. Verify `museum-team`, `streetlights-team`, and `platform-team` all appear
3. Navigate to **Catalog** → filter by **Kind: User**
4. Verify all four users (alice, bob, charlie, diana) appear

✅ **Pass**: Non-API catalog entries are visible to all authenticated users
❌ **Fail**: Check the permission policy — the `not(isEntityKind(['API']))` arm must be
  present to allow User/Group entries through

## Summary Checklist

- [ ] Museum Team, Streetlights Team, and Platform Team appear in the catalog with correct members
- [ ] All four users (alice, bob, charlie, diana) appear in the catalog
- [ ] Museum API shows `museum-team` as owner and **private** in its tags
- [ ] Streetlights API shows `streetlights-team` as owner and **private** in its tags
- [ ] Train Travel API shows `platform-team` as owner and **shared** in its tags
- [ ] Signed in as Alice → Train Travel API and Museum API visible; Streetlights API absent
- [ ] Signed in as Charlie → Train Travel API and Streetlights API visible; Museum API absent
- [ ] Signed in as either user → all groups and users are visible in the catalog
- [ ] Switching between users produces demonstrably different API catalog views
