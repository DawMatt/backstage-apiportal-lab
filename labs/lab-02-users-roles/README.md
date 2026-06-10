# Lab 2: Users, Roles, and API Visibility

> **Lab series context**: This is Lab 2 of a progressive series. It builds directly on the
> running Backstage instance created in Lab 1. Complete
> [Lab 1](../lab-01-base-backstage/README.md) before starting this lab.

## Overview

**What this lab teaches:**

- How Backstage models people and teams using `User` and `Group` catalog entities
- How `spec.owner` connects an API in the catalog to its owning team
- How to configure Backstage's built-in guest auth provider to sign in as a specific
  named catalog user
- How to replace Backstage's default allow-all permission policy with a custom policy
  that restricts each user's view of the catalog to APIs owned by their team

**What you will have at the end:**

The same Backstage instance from Lab 1, extended with two teams (Museum Team and
Streetlights Team), four named users, and a custom permission policy. When signed in as
Alice (Museum Team), only the Museum API is visible. When signed in as Charlie
(Streetlights Team), only the Streetlights API is visible — a demonstrable, side-by-side
difference driven by team ownership and Backstage's permissions framework.

---

## Prerequisites

- **Lab 1 completed**: You have a running Backstage instance at
  `labs/lab-01-base-backstage/backstage/` with the Museum API and Streetlights API
  registered in the catalog.
- **This repository cloned and on a pushed branch**: Backstage loads catalog files via
  GitHub raw URLs. The files in this lab (`teams.yaml`, `users.yaml`, and the updated API
  descriptors) must be committed and pushed to GitHub before Backstage can read them.
  See [Lab 1's troubleshooting section](../lab-01-base-backstage/README.md#troubleshooting)
  for guidance on verifying GitHub raw URLs.
- **No new tools or packages required**: Lab 2 adds no new npm packages. All Backstage
  features used here — catalog entities, guest auth, and the permissions framework — ship
  with the Backstage version installed in Lab 1.

---

## Security Note

> ⚠️ **Lab only — not suitable for production**
>
> In Step 3, you will create a file called `app-config.local.yaml` that configures
> Backstage's **guest auth provider** to sign you in as a specific named user from the
> catalog. This is a local development convenience: there is no real authentication. Anyone
> who can reach your Backstage UI can click "Enter as Guest" and be signed in as that user.
>
> `app-config.local.yaml` is already included in Backstage's default `.gitignore`. **Do not
> commit this file.** The values shown in this lab (`user:default/alice`) are fictional
> example identities used only for demonstration.
>
> **In production**, Backstage should be configured with an enterprise identity provider so
> that user identity is verified externally:
> - **OIDC** (e.g., Google, Okta, Azure AD) — for web-based SSO
> - **SAML** (e.g., Active Directory Federation Services) — for enterprise SSO
> - **LDAP** (e.g., Active Directory) — for directory-based identity
>
> See the [Backstage auth documentation](https://backstage.io/docs/auth/) for setup guides.

---

## Step 1: Define Users and Teams in the Catalog

### Why this step matters

Backstage's catalog can store more than just APIs and services. It also models the *people*
and *teams* who own them. Defining `User` and `Group` entities:

- Creates browsable team pages showing who belongs to which team
- Enables the ownership relationship (`spec.owner`) that connects APIs to teams
- Populates the `ownershipEntityRefs` that the permissions framework reads when deciding
  what a signed-in user can see

**Why both `members` and `memberOf` are required**: Backstage derives catalog relations
(like `hasMember` and `memberOf`) from the data in entity descriptors. To build
*bidirectional* relations, Backstage needs the claim stated from both sides: the `Group`
entity must list its `members`, and each `User` entity must declare its `memberOf` group.
If either side is missing, the relation is one-directional and the permissions resolver
may not correctly identify a user's team membership.

### 1a — Register the team and user catalog files

This repository already contains the catalog descriptor files for Lab 2:

```
labs/lab-02-users-roles/catalog/
├── teams.yaml          ← Two Group entities: museum-team, streetlights-team
└── users.yaml          ← Four User entities: alice, bob, charlie, diana
```

Open `labs/lab-01-base-backstage/backstage/app-config.yaml` in a text editor and add the
following entries to the end of the existing `catalog.locations` list (keeping the same
indentation as the other entries):

```yaml
    # --- Lab 2: Teams ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-02-users-roles/catalog/teams.yaml
      rules:
        - allow: [Group]

    # --- Lab 2: Users ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-02-users-roles/catalog/users.yaml
      rules:
        - allow: [User]
```

> **Using a fork or feature branch?** Replace `DawMatt/backstage-apiportal-lab/main` with
> `YourName/YourRepo/your-branch-name` in both URLs. Open the target URL in a browser
> first — it must return raw YAML content, not a 404, before Backstage can read it.

> **Why separate rules for `[Group]` and `[User]`?** Backstage's global `catalog.rules`
> list (at the top of `app-config.yaml`) does not include `User` or `Group` by default.
> Location-level rules override the global rules for that location, allowing you to
> explicitly opt in to entity kinds that are not globally allowed.

### 1b — Restart Backstage

Save `app-config.yaml`, then restart Backstage:

```
yarn start
```

| Platform | Command |
|----------|---------|
| macOS / Linux | `yarn start` |
| Windows (PowerShell) | `yarn start` |

Wait for the catalog to finish loading before proceeding — you will see the Catalog page
populate with entries when it is ready.

### ✅ Verification — Step 1

1. Open `http://localhost:3000`
2. Navigate to **Catalog** → in the **Kind** filter, select **Group**
3. Verify `museum-team` and `streetlights-team` both appear
4. Click **museum-team** → verify the members listed are **alice** and **bob**
5. Click **streetlights-team** → verify the members listed are **charlie** and **diana**
6. Navigate to **Catalog** → **Kind: User**
7. Verify all four users appear: **alice**, **bob**, **charlie**, **diana**
8. Click **alice** → verify her group membership shows **museum-team**

✅ **Pass**: All four users and both teams appear with correct memberships.

❌ **Fail**: Check that both `teams.yaml` and `users.yaml` URL entries are in your
`app-config.yaml` with the correct branch URL. Open each target URL in a browser to
confirm it returns raw YAML (not a 404). See
[Troubleshooting — Users or teams not appearing](#users-or-teams-not-appearing-in-the-catalog)
for more.

> **Note**: You will also see a `guest` user and `guests` group in the catalog — these come
> from Backstage's default `examples/org.yaml` file. They do not affect the visibility
> demonstration and can be ignored.

---

## Step 2: Associate APIs with Owning Teams

### Why this step matters

In Lab 1, both APIs had `spec.owner: user:default/guest` — a placeholder. Ownership in
Backstage is what connects an API to a team. The permissions framework checks ownership
when deciding whether a signed-in user can see an entity. Without ownership set, the
permission policy written in Step 4 cannot distinguish who should see what.

**Why fully-qualified group refs?** Backstage entity references use the format
`kind:namespace/name`. Using `group:default/museum-team` (rather than just `museum-team`)
is explicit and predictable across multiple namespaces.

### 2a — Replace the Lab 1 API entries with Lab 2 entries

The Lab 2 API descriptor files (`museum-api.yaml` and `streetlights-api.yaml`) are
copies of the Lab 1 descriptors with two changes:
- `spec.owner` set to the owning team's fully-qualified group ref
- `spec.lifecycle` updated from `experimental` to `production`

Open `app-config.yaml` and make the following changes to the `catalog.locations` list:

**Remove** these two Lab 1 entries (the Museum and Streetlights API entries you added in
Lab 1):

```yaml
    # --- Lab 1: Museum REST API (OpenAPI 3.1) ---
    - type: url
      target: https://raw.githubusercontent.com/.../labs/lab-01-base-backstage/apis/museum/catalog-info.yaml
      rules:
        - allow: [API]

    # --- Lab 1: Streetlights Event API (AsyncAPI 2.6) ---
    - type: url
      target: https://raw.githubusercontent.com/.../labs/lab-01-base-backstage/apis/streetlights/catalog-info.yaml
      rules:
        - allow: [API]
```

> **Why remove them?** If both the Lab 1 and Lab 2 entries are registered at the same
> time, Backstage will import two API entities with the name `museum-api` (and two with
> `streetlights-api`). Backstage treats duplicate names in the same namespace as the same
> entity and will use whichever version it loaded last. Remove the Lab 1 entries to avoid
> this ambiguity.

**Add** these Lab 2 entries in their place:

```yaml
    # --- Lab 2: Museum REST API (with ownership) ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-02-users-roles/catalog/apis/museum-api.yaml
      rules:
        - allow: [API]

    # --- Lab 2: Streetlights Event API (with ownership) ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml
      rules:
        - allow: [API]
```

> **Using a fork or feature branch?** Replace `DawMatt/backstage-apiportal-lab/main` with
> your own repo and branch, as you did in Step 1.

### 2b — Restart Backstage

```
yarn start
```

### ✅ Verification — Step 2

1. Navigate to **Catalog** → **Kind: API**
2. Click **Museum API** → verify the **Owner** field shows **museum-team**
3. Click **Streetlights API** → verify the **Owner** field shows **streetlights-team**
4. Navigate to the **museum-team** Group page → verify **Museum API** appears under
   **Owned APIs** (or the Relations / Ownership section)
5. Navigate to the **streetlights-team** Group page → verify **Streetlights API** appears
   there

✅ **Pass**: Each API shows its owning team; each team's page lists its owned API.

❌ **Fail — duplicate APIs**: If you see two Museum API entries (or two Streetlights API
entries), the Lab 1 entries were not removed from `app-config.yaml`. Remove them and
restart. See
[Troubleshooting — Duplicate API entries](#duplicate-api-entries-in-the-catalog).

❌ **Fail — Owner field not shown**: Check that the updated `museum-api.yaml` and
`streetlights-api.yaml` URLs are in your `app-config.yaml` (not the original Lab 1 paths).
Open each target URL in a browser to verify it returns the Lab 2 YAML with
`spec.owner: group:default/...`.

---

## Step 3: Configure Sign-In

### Why this step matters

To demonstrate that different users see different APIs, Backstage needs to know *who* is
signed in. The guest auth provider (already installed in Lab 1) can be configured with a
`userEntityRef` to resolve the guest identity to a specific catalog user. When a user signs
in, Backstage calls `signInWithCatalogUser`, which reads the user's `memberOf` group
memberships from the catalog and populates `ownershipEntityRefs` — the list of entity refs
the permissions framework will use to evaluate ownership.

### 3a — Create `app-config.local.yaml`

In the Backstage root directory (`labs/lab-01-base-backstage/backstage/`), create a new
file called `app-config.local.yaml` with the following content:

```yaml
# Lab only — see Security Note above.
# Change userEntityRef and restart yarn start to sign in as a different user.
auth:
  providers:
    guest:
      userEntityRef: user:default/alice
```

> **Where is the Backstage root directory?**
>
> | Platform | Path example |
> |----------|--------------|
> | macOS | `~/Code/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/` |
> | Windows | `C:\Users\YourName\backstage-apiportal-lab\labs\lab-01-base-backstage\backstage\` |
>
> The `app-config.local.yaml` file sits next to the existing `app-config.yaml` file.

> **This file is gitignored**: Backstage's default `.gitignore` already includes
> `app-config.local.yaml`. You do not need to add it — it will not be committed to your
> repository.

> **Important — wait for the catalog to load before signing in**: The named user
> (`alice`) must already exist as a `User` entity in the catalog before you sign in.
> If you sign in before the catalog has indexed the `users.yaml` file, Backstage may not
> be able to resolve Alice's group membership and her `ownershipEntityRefs` will be empty.
> Wait until you can see catalog entries in the UI (from Step 1) before clicking Sign In.

### 3b — Restart Backstage and sign in

```
yarn start
```

Wait for the catalog to finish loading (you will see entities on the Catalog page), then:

1. Click **Sign In** (or the user icon in the top-right corner)
2. Click **Enter as Guest**

### ✅ Verification — Step 3

After signing in, look at the user profile area in the top-right of the Backstage UI.

✅ **Pass**: The profile shows **Alice Chen** (or the display name of the configured user).

❌ **Fail — "Sign in failed" or generic guest identity shown**: Verify that:
- `app-config.local.yaml` is in the correct directory (next to `app-config.yaml`)
- The `userEntityRef` value (`user:default/alice`) exactly matches the `metadata.name`
  (`alice`) and `metadata.namespace` (`default`) of the User entity in `users.yaml`
- The catalog has loaded the `users.yaml` file (Step 1 verification passes) before you
  attempt to sign in
- See [Troubleshooting — Sign-in shows wrong user](#sign-in-shows-the-wrong-user-or-fails)
  for more.

---

## Step 4: Enable Ownership-Based Visibility

### Why this step matters

By default, Backstage uses an **allow-all** permission policy: every signed-in user can
see every catalog entity, regardless of ownership. To demonstrate that Alice sees only
the Museum API and Charlie sees only the Streetlights API, you need to replace the
allow-all policy with a custom policy that uses `isEntityOwner` to filter catalog
visibility based on the signed-in user's team membership.

The custom policy works as follows:
- For any **catalog entity** permission (a `catalog-entity` resource permission),
  return a **conditional decision**: allow access only if the entity's `spec.owner`
  matches one of the requesting user's `ownershipEntityRefs` (their user ref and all
  their team refs)
- For **all other** permissions (scaffolding, TechDocs, search, etc.), return **ALLOW**
  unconditionally — so the rest of Backstage continues to function normally

> **Note**: With this policy, ALL catalog entities (not just APIs) become team-scoped.
> Users will not see each other's User or Group profile pages unless they are in the
> same team. This is an intentional simplification for the lab. In a production policy,
> you would typically allow public read access to User and Group entities while
> restricting access to sensitive entities (APIs, services) by ownership.

### 4a — Create the permission policy file

Create the directory `packages/backend/src/extensions/` inside your Backstage root
(`labs/lab-01-base-backstage/backstage/`), then create a new file called
`permissionPolicy.ts` inside it with the following content:

```typescript
// packages/backend/src/extensions/permissionPolicy.ts
import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  PolicyDecision,
  AuthorizeResult,
  isResourcePermission,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import {
  catalogConditions,
  createCatalogConditionalDecision,
} from '@backstage/plugin-catalog-backend/alpha';

class CatalogOwnershipPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    if (isResourcePermission(request.permission, 'catalog-entity')) {
      return createCatalogConditionalDecision(
        request.permission,
        catalogConditions.isEntityOwner({
          claims: user?.info.ownershipEntityRefs ?? [],
        }),
      );
    }
    return { result: AuthorizeResult.ALLOW };
  }
}

export default createBackendModule({
  pluginId: 'permission',
  moduleId: 'permission-policy',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new CatalogOwnershipPolicy());
      },
    });
  },
});
```

**Import sources** (all packages are already installed in Lab 1 — no `npm install` needed):

| Symbol | Package | Stability |
|--------|---------|-----------|
| `createBackendModule` | `@backstage/backend-plugin-api` | Stable |
| `PolicyDecision`, `AuthorizeResult`, `isResourcePermission` | `@backstage/plugin-permission-common` | Stable |
| `PermissionPolicy`, `PolicyQuery`, `PolicyQueryUser` | `@backstage/plugin-permission-node` | Stable |
| `policyExtensionPoint` | `@backstage/plugin-permission-node/alpha` | Alpha |
| `catalogConditions`, `createCatalogConditionalDecision` | `@backstage/plugin-catalog-backend/alpha` | Alpha |

> **Note on Alpha imports**: `policyExtensionPoint` and the catalog conditions helpers are
> imported from `/alpha` sub-paths. These are stable enough for Backstage 1.51.0 but may
> change in future major versions. This is the officially recommended pattern for custom
> permission policies as of this Backstage version.

### 4b — Update `index.ts`

Open `packages/backend/src/index.ts` in your Backstage root. Find the permission plugin
section (near line 44):

```typescript
// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);
```

Replace the `allow-all-policy` import with your custom policy:

```typescript
// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('./extensions/permissionPolicy'));
```

> **What you are doing**: The `allow-all-policy` module unconditionally returns `ALLOW`
> for every permission check. Removing it and importing your custom module registers the
> `CatalogOwnershipPolicy` via the `policyExtensionPoint`. The backend will now call your
> `handle()` method for every permission check.

### 4c — Restart Backstage

```
yarn start
```

### ✅ Verification — Steps 4 and 5

**Sign in as Alice (Museum Team):**

1. Ensure `app-config.local.yaml` has `userEntityRef: user:default/alice`
2. Restart Backstage (`Ctrl+C`, then `yarn start`), wait for catalog to load
3. Click **Sign In** → **Enter as Guest**
4. Verify the profile shows **Alice Chen**
5. Navigate to **Catalog** → **Kind: API**
6. Verify **only** the **Museum API** is visible — the Streetlights API should not appear
7. Try navigating directly to the Streetlights API URL (copy it from a previous session
   if you have it) — Backstage should show "Not Found" or an error, not the API detail page

✅ **Pass (Alice)**: Only the Museum API is visible.

❌ **Fail — both APIs still visible**: Verify that:
- The `allow-all-policy` import was removed from `index.ts` (not just commented out)
- The `permissionPolicy.ts` file is at exactly
  `packages/backend/src/extensions/permissionPolicy.ts`
- Backstage was restarted after both file changes
- See [Troubleshooting — Permission policy not applying](#permission-policy-not-applying)

**Switch to Charlie (Streetlights Team):**

1. Edit `app-config.local.yaml`: change `userEntityRef` to `user:default/charlie`
2. Restart Backstage (`Ctrl+C`, then `yarn start`), wait for catalog to load
3. Click **Sign In** → **Enter as Guest**
4. Verify the profile shows **Charlie Davis**
5. Navigate to **Catalog** → **Kind: API**
6. Verify **only** the **Streetlights API** is visible — the Museum API should not appear

✅ **Pass (Charlie)**: Only the Streetlights API is visible.
✅ **Lab complete**: Alice and Charlie see demonstrably different API catalogs — different
   visibility produced solely by team ownership and the permissions framework.

❌ **Fail**: Check that `charlie` exists in the catalog with `memberOf: streetlights-team`
(Step 1 verification) and that the Streetlights API has `spec.owner: group:default/streetlights-team`
(Step 2 verification).

### Edge Cases

**What if a user is a member of multiple teams?**
With this policy, a user who is a member of both `museum-team` and `streetlights-team`
would see the APIs owned by *both* teams. Backstage adds all group refs to the user's
`ownershipEntityRefs`, and `isEntityOwner` checks if any of them match. In this lab, each
user belongs to exactly one team to keep the demonstration unambiguous. If you want to
experiment with multi-team membership, add a user to both teams' `members` lists and the
user's `memberOf` list, restart, and sign in as that user.

**What if a catalog entity has no `spec.owner`?**
An entity with no `spec.owner` has no ownership refs. The `isEntityOwner` condition will
return `false` for every user — meaning no signed-in user can see it. If you register an
API without setting `spec.owner` and find it invisible to everyone after enabling the
custom policy, that is why. Assign an owner or add a special case to your policy to
handle un-owned entities.

**What if a User or Group entity referenced by `spec.owner` or `spec.memberOf` does not
exist in the catalog?**
Backstage will import the API entity successfully but log a warning about a missing
relation target. The API's Owner field in the UI will show an unresolved reference. To
fix: verify the entity name and namespace in your YAML files match exactly (names are
case-sensitive), and check that the catalog location for the missing entity is registered
in `app-config.yaml`.

**What if the developer tries to sign in before authentication is configured?**
If you click "Enter as Guest" without `app-config.local.yaml` present, Backstage will
sign you in as an anonymous guest (no user identity). The permissions policy will receive
an empty `ownershipEntityRefs` list and deny access to all catalog entities — you will
see an empty catalog. Create `app-config.local.yaml` with a valid `userEntityRef` and
restart before trying to demonstrate visibility differences.

---

## Summary Checklist

Use this checklist to confirm you have completed every step of the lab:

- [ ] Museum Team (`museum-team`) appears in the catalog with alice and bob as members
- [ ] Streetlights Team (`streetlights-team`) appears in the catalog with charlie and diana as members
- [ ] All four users (alice, bob, charlie, diana) appear in the catalog
- [ ] Museum API shows `museum-team` as its owner
- [ ] Streetlights API shows `streetlights-team` as its owner
- [ ] Signed in as Alice → only the Museum API is visible in the catalog
- [ ] Signed in as Charlie → only the Streetlights API is visible in the catalog

All boxes checked? You have completed Lab 2.

---

## Troubleshooting

### Users or teams not appearing in the catalog

1. **Check the catalog URLs**: Open the `target` URL for `teams.yaml` and `users.yaml`
   in a browser. They must return raw YAML content. A 404 means the files are not on that
   branch or the URL is wrong.

2. **Check the YAML rules**: Each location entry must have a `rules` section that explicitly
   allows the entity kind:
   ```yaml
   rules:
     - allow: [Group]   # for teams.yaml
   ```
   ```yaml
   rules:
     - allow: [User]    # for users.yaml
   ```
   Without these rules, Backstage will silently reject the entities.

3. **Check for YAML indentation errors**: Backstage's startup log will mention
   `app-config.yaml` if there is a syntax error. Use a YAML linter
   ([yamllint.com](https://www.yamllint.com/)) to verify your edits.

4. **Check for one-directional relations**: If a Group entity appears but lists no members,
   or a User entity appears but shows no group membership, verify that both sides of the
   relation are declared:
   - Group entity has `spec.members: [alice, bob]`
   - User entity has `spec.memberOf: [museum-team]`
   Both must be present for Backstage to build bidirectional relations.

---

### Duplicate API entries in the catalog

If you see two entries for `museum-api` (or `streetlights-api`) in the catalog, both the
Lab 1 and Lab 2 catalog location entries are registered in `app-config.yaml`.

Remove the Lab 1 entries from `app-config.yaml` (the entries pointing to
`labs/lab-01-base-backstage/apis/museum/catalog-info.yaml` and
`labs/lab-01-base-backstage/apis/streetlights/catalog-info.yaml`) and restart Backstage.

---

### Sign-in shows the wrong user or fails

1. **`app-config.local.yaml` location**: The file must be in the Backstage root directory
   (next to `app-config.yaml`), not in the repo root or the `labs/` directory.

   | Platform | Correct path |
   |----------|-------------|
   | macOS | `.../backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/app-config.local.yaml` |
   | Windows | `...\backstage-apiportal-lab\labs\lab-01-base-backstage\backstage\app-config.local.yaml` |

2. **User entity must exist before sign-in**: The `userEntityRef` value must match a User
   entity that is already indexed in the catalog. If you sign in before the catalog has
   loaded `users.yaml`, Backstage cannot resolve Alice's group memberships and
   `ownershipEntityRefs` will be empty. Wait for the catalog to show entries on the Catalog
   page before clicking Sign In.

3. **`userEntityRef` format**: The value must be a fully-qualified entity ref:
   `user:default/alice` — not `alice` or `default/alice`.

4. **Restart required**: Changes to `app-config.local.yaml` require a full restart
   (`Ctrl+C`, then `yarn start`). Hot-reloading does not pick up local config changes.

---

### Permission policy not applying

If both APIs remain visible to all users after enabling the custom policy:

1. **Verify the `allow-all-policy` import was removed**: Open
   `packages/backend/src/index.ts` and confirm the line
   `import('@backstage/plugin-permission-backend-module-allow-all-policy')` is gone
   (deleted, not just commented out). If it is still present, the allow-all policy takes
   precedence.

2. **Verify the policy file path**: The file must be at exactly
   `packages/backend/src/extensions/permissionPolicy.ts` (inside an `extensions/`
   subdirectory of `src/`). The import in `index.ts` is `import('./extensions/permissionPolicy')`,
   which resolves relative to `packages/backend/src/`.

3. **Verify TypeScript compiles**: If there is a TypeScript error in
   `permissionPolicy.ts`, the backend may silently fall back to no policy or exit
   during startup. Check the terminal output for TypeScript errors after `yarn start`.

4. **Permissions must be enabled in `app-config.yaml`**: Verify the following is present
   (it should already be there from the scaffolded app):
   ```yaml
   permission:
     enabled: true
   ```
   If `enabled` is `false`, the permission framework is disabled and all entities are
   visible regardless of the policy.

5. **Restart required**: Any change to TypeScript source files or `app-config.yaml`
   requires a full restart.
