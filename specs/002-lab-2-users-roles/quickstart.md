# Quickstart Verification: Lab 2 — Users, Roles, and API Visibility

**Branch**: `002-lab-2-users-roles` | **Date**: 2026-06-08

## Prerequisites

- Lab 1 completed — Backstage running locally with Museum API and Streetlights API registered
- Lab 2 catalog files committed and pushed to the repository branch the Backstage `app-config.yaml` is reading from

## Verification Steps

### Step 1 — Users and Groups in the Catalog

1. Start Backstage: `yarn start` in `labs/lab-01-base-backstage/backstage/`
2. Open `http://localhost:3000`
3. Navigate to **Catalog** → filter by **Kind: Group**
4. Verify `museum-team` and `streetlights-team` appear
5. Click `museum-team` → verify `alice` and `bob` are listed as members
6. Click `streetlights-team` → verify `charlie` and `diana` are listed as members
7. Navigate to **Catalog** → filter by **Kind: User**
8. Verify all four users appear
9. Click `alice` → verify group membership shows `museum-team`

✅ **Pass**: All four users and two groups visible with correct memberships
❌ **Fail**: Check that catalog locations for `teams.yaml` and `users.yaml` are in `app-config.yaml`
  and that the YAML files are accessible at the configured URLs

### Step 2 — API Ownership

1. Navigate to **Catalog** → filter by **Kind: API**
2. Click the Museum API entry
3. Verify the **Owner** field shows `museum-team`
4. Click the Streetlights API entry
5. Verify the **Owner** field shows `streetlights-team`
6. Navigate to the `museum-team` Group page → verify the Museum API appears under **Owned APIs**
7. Navigate to the `streetlights-team` Group page → verify the Streetlights API appears under **Owned APIs**

✅ **Pass**: Each API shows its owning team; each team's page lists its owned API
❌ **Fail**: Check that the updated API catalog-info.yaml files (with `spec.owner`) are registered
  in `app-config.yaml` and that the Lab 1 versions are removed to avoid duplicates

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
2. Verify **only** the Museum API is visible (Streetlights API should not appear)
3. Attempt to navigate directly to the Streetlights API URL — Backstage should show an error
   or "Not Found" rather than the API detail page

✅ **Pass**: Alice sees only the Museum API
❌ **Fail**: Check that the custom permission policy is registered in `packages/backend/src/index.ts`
  and that the allow-all policy module import has been removed

### Step 5 — Switch to Streetlights Team User and Verify Different Visibility

1. Edit `app-config.local.yaml`: change `userEntityRef` to `user:default/charlie`
2. Restart Backstage: `Ctrl+C` then `yarn start`
3. Wait for catalog to load, then click **Sign In** → **Enter as Guest**
4. Verify profile shows **Charlie Davis**
5. Navigate to **Catalog** → filter by **Kind: API**
6. Verify **only** the Streetlights API is visible (Museum API should not appear)

✅ **Pass**: Charlie sees only the Streetlights API — visibility differs from Alice
❌ **Fail**: Check that `charlie` exists in the catalog with `memberOf: [streetlights-team]`

## Summary Checklist

- [ ] Museum Team and Streetlights Team appear in the catalog with correct members
- [ ] All four users (alice, bob, charlie, diana) appear in the catalog
- [ ] Museum API shows `museum-team` as owner
- [ ] Streetlights API shows `streetlights-team` as owner
- [ ] Signed in as Alice → only Museum API visible
- [ ] Signed in as Charlie → only Streetlights API visible
- [ ] Switching between users produces demonstrably different API catalog views
