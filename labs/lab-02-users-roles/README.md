# Lab 2: Users, Roles, and API Visibility

> **Lab series context**: This is Lab 2 of a progressive series. It builds directly on the
> running Backstage instance created in Lab 1. Complete
> [Lab 1](../lab-01-base-backstage/README.md) before starting this lab.

## Overview

**What this lab teaches:**

- How Backstage models people and teams using `User` and `Group` catalog entities
- How `spec.owner` connects an API in the catalog to its owning team
- How catalog annotations can control API visibility independently of ownership
- How to configure Backstage's built-in guest auth provider to sign in as a specific
  named catalog user
- How to replace Backstage's default allow-all permission policy with a custom **two-tier**
  policy: shared APIs visible to all users, private APIs visible only to the owning team,
  and all other catalog entries (users, groups) unrestricted

**What you will have at the end:**

The same Backstage instance from Lab 1, extended with three teams (Museum Team,
Streetlights Team, and Platform Team), four named users, three APIs, and a custom
permission policy. The Train Travel API (owned by Platform Team) is marked as shared and
visible to everyone. The Museum API is private — visible only to Museum Team. The
Streetlights API is private — visible only to Streetlights Team. When signed in as Alice,
she sees the Train Travel API and the Museum API. When signed in as Charlie, he sees the
Train Travel API and the Streetlights API. Both users can browse all teams and users in
the catalog. This two-tier result is driven by team ownership, a catalog annotation, and
Backstage's permissions framework.

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
├── teams.yaml          ← Three Group entities: museum-team, streetlights-team, platform-team
└── users.yaml          ← Four User entities: alice, bob, charlie, diana
```

> **What is platform-team?** `platform-team` is a Group entity with no individual members.
> It exists as the owner of shared platform APIs — APIs that all authenticated users can see
> regardless of which team they belong to. Visibility of those APIs is controlled by an
> annotation on the API entity itself, not by group membership. You will configure this in
> Step 2.

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
3. Verify all three groups appear: `museum-team`, `streetlights-team`, and `platform-team`
4. Click **museum-team** → verify the members listed are **alice** and **bob**
5. Click **streetlights-team** → verify the members listed are **charlie** and **diana**
6. Click **platform-team** → verify it shows **no members** (this is expected — see the
   note above about why platform-team has no individual members)
7. Navigate to **Catalog** → **Kind: User**
8. Verify all four users appear: **alice**, **bob**, **charlie**, **diana**
9. Click **alice** → verify her group membership shows **museum-team**

✅ **Pass**: All four users and all three groups appear with correct memberships. Platform
Team showing no members is correct and expected.

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

In Lab 1, both APIs had `spec.owner: user:default/guest` — a placeholder. Lab 2 introduces
a proper ownership model and a key concept for the visibility demonstration: APIs can be
either **private** (visible only to the owning team) or **shared** (visible to all
authenticated users). The distinction is made using a catalog annotation.

**Two API visibility tiers**:

| API | Owner | Visibility | How it works |
|-----|-------|-----------|--------------|
| Museum API | `museum-team` | **Private** | Annotated `example.com/visibility: private` — only museum-team members can see it |
| Streetlights API | `streetlights-team` | **Private** | Annotated `example.com/visibility: private` — only streetlights-team members can see it |
| Train Travel API | `platform-team` | **Shared** | Annotated `example.com/visibility: shared` — visible to all users |

**Why annotate every API, not just the shared one?** The permission policy only
reads the `shared` annotation to grant unconditional access — private APIs are restricted
by ownership alone, so the `private` annotation does not affect access control. However,
applying an explicit `example.com/visibility` annotation to every API makes the visibility
designation immediately readable on each API's catalog page. A developer browsing the
catalog can see at a glance whether any API is shared or team-restricted, without having
to infer it from the absence of an annotation.

**Why not use tags to display visibility?** The `example.com/visibility` annotation is the
field the permission policy evaluates. Using the same field for display means that if you
change an API's visibility, both the policy enforcement and the displayed designation update
together automatically — a single change, no secondary field to keep in sync.

**Why separate ownership from visibility?** In a real organisation, a team may be
*responsible* for an API without wanting to restrict who can *discover* it. Platform
APIs (authentication, logging, infrastructure) are typically owned by a platform team but
discoverable by everyone. Using an annotation to control visibility means you can change
who can see an API without changing who owns it or adding users to groups.

**Why fully-qualified group refs?** Backstage entity references use the format
`kind:namespace/name`. Using `group:default/museum-team` (rather than just `museum-team`)
is explicit and predictable across multiple namespaces.

### 2a — Replace the Lab 1 API entries with Lab 2 entries

The Lab 2 catalog directory now contains three API descriptor files:

```
labs/lab-02-users-roles/catalog/apis/
├── museum-api.yaml          ← Private API — owner: museum-team,
│                               annotation example.com/visibility: private
├── streetlights-api.yaml    ← Private API — owner: streetlights-team,
│                               annotation example.com/visibility: private
└── train-travel-api.yaml    ← Shared API  — owner: platform-team,
                                annotation example.com/visibility: shared
```

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

**Add** these three Lab 2 entries in their place:

```yaml
    # --- Lab 2: Museum REST API (private — museum-team only) ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-02-users-roles/catalog/apis/museum-api.yaml
      rules:
        - allow: [API]

    # --- Lab 2: Streetlights Event API (private — streetlights-team only) ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml
      rules:
        - allow: [API]

    # --- Lab 2: Train Travel API (shared — visible to all authenticated users) ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-02-users-roles/catalog/apis/train-travel-api.yaml
      rules:
        - allow: [API]
```

> **Using a fork or feature branch?** Replace `DawMatt/backstage-apiportal-lab/main` with
> your own repo and branch, as you did in Step 1.

### 2b — Add the API Visibility Card

#### Why this step is needed

Backstage 1.51.0 uses a new declarative frontend system (`createApp` with
`@backstage/plugin-catalog/alpha`). In this system, the entity detail page layout is driven
entirely by the catalog plugin's default extension configuration. Custom annotations from
non-`backstage.io/` domains — including `example.com/visibility` — are **not rendered**
in any default card on the entity page.

Without this step, the visibility designation is stored in the catalog but invisible in the
UI. FR-011 requires that the designation be derived from the same field the permission policy
evaluates (no secondary copy), and SC-007 requires it to be visible without extra navigation.
A custom entity card satisfies both: it reads the annotation directly from the entity object —
the same metadata field `hasAnnotation` checks in the backend — and renders it immediately on
the API page.

#### What you are building

This step also demonstrates Backstage's declarative frontend extension system:
- `EntityCardBlueprint` adds a new card to entity pages filtered by kind
- `createFrontendModule` bundles the card into a self-contained frontend module
- The module is registered in `App.tsx` alongside the built-in `catalogPlugin`

No new packages are required — all imports are already installed in the Backstage instance
from Lab 1.

#### Create the module directory

| Platform | Command |
|----------|---------|
| macOS / Linux | `mkdir -p packages/app/src/modules/apiVisibility` |
| Windows (PowerShell) | `New-Item -ItemType Directory -Path packages\app\src\modules\apiVisibility` |

Run this command from inside your Backstage root directory
(`labs/lab-01-base-backstage/backstage/`).

#### Create `ApiVisibilityCard.tsx`

Create `packages/app/src/modules/apiVisibility/ApiVisibilityCard.tsx` with the following
content:

```typescript
import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { InfoCard } from '@backstage/core-components';
import { Typography, Box, Chip } from '@material-ui/core';

const VISIBILITY_ANNOTATION = 'example.com/visibility';

export function ApiVisibilityCard() {
  const { entity } = useEntity();
  const visibility = entity.metadata.annotations?.[VISIBILITY_ANNOTATION];

  if (!visibility) {
    return (
      <InfoCard title="API Visibility">
        <Typography variant="body2" color="textSecondary">
          No visibility designation set. Under the permission policy, this API is visible
          only to members of the owning team (treated as private by default).
        </Typography>
      </InfoCard>
    );
  }

  const isShared = visibility === 'shared';

  return (
    <InfoCard title="API Visibility">
      <Box display="flex" alignItems="center" gap={1}>
        <Chip
          label={isShared ? 'Shared' : 'Private'}
          color={isShared ? 'primary' : 'default'}
          size="small"
        />
        <Typography variant="body2">
          {isShared
            ? 'Visible to all authenticated users regardless of team membership.'
            : 'Visible only to members of the owning team.'}
        </Typography>
      </Box>
    </InfoCard>
  );
}
```

#### Create `index.ts`

Create `packages/app/src/modules/apiVisibility/index.ts` with the following content:

```typescript
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { ApiVisibilityCard } from './ApiVisibilityCard';

const apiVisibilityCard = EntityCardBlueprint.make({
  name: 'api-visibility',
  params: {
    filter: 'kind:API',
    type: 'info',
    loader: async () => React.createElement(ApiVisibilityCard),
  },
});

export const apiVisibilityModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [apiVisibilityCard],
});
```

> **Note on Alpha imports**: `EntityCardBlueprint` is imported from
> `@backstage/plugin-catalog-react/alpha`. This is the officially supported extension
> point for adding custom entity cards in Backstage 1.51.0's new declarative frontend.
> The `/alpha` sub-path indicates the API may change in future major Backstage versions,
> but it is stable enough for this lab and follows the same pattern Backstage itself uses
> internally.

#### Update `App.tsx`

Open `packages/app/src/App.tsx` and update it as follows:

**Before:**
```typescript
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';

export default createApp({
  features: [catalogPlugin, navModule],
});
```

**After:**
```typescript
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { apiVisibilityModule } from './modules/apiVisibility';

export default createApp({
  features: [catalogPlugin, navModule, apiVisibilityModule],
});
```

**Import sources** (all packages already installed — no `npm install` needed):

| Symbol | Package | Stability |
|--------|---------|-----------|
| `useEntity` | `@backstage/plugin-catalog-react` | Stable |
| `EntityCardBlueprint` | `@backstage/plugin-catalog-react/alpha` | Alpha |
| `createFrontendModule` | `@backstage/frontend-plugin-api` | Stable |
| `InfoCard` | `@backstage/core-components` | Stable |
| `Typography`, `Box`, `Chip` | `@material-ui/core` | Stable |

### 2c — Restart Backstage

```
yarn start
```

### ✅ Verification — Step 2

1. Navigate to **Catalog** → **Kind: API**
2. Verify **three APIs** appear: Museum API, Streetlights API, and Train Travel API
3. Click **Museum API** → verify:
   - The **Owner** field shows **museum-team**
   - The **API Visibility** card shows **Private**
4. Click **Streetlights API** → verify:
   - The **Owner** field shows **streetlights-team**
   - The **API Visibility** card shows **Private**
5. Click **Train Travel API** → verify:
   - The **Owner** field shows **platform-team**
   - The **API Visibility** card shows **Shared**
6. Navigate to the **museum-team** Group page → verify **Museum API** appears under
   **Owned APIs**
7. Navigate to the **streetlights-team** Group page → verify **Streetlights API** appears
8. Navigate to the **platform-team** Group page → verify **Train Travel API** appears

> **Where is the API Visibility card?** The card appears on the right-hand side of the
> API entity detail page, typically below the About card. It shows a coloured chip
> labelled **Shared** or **Private** and a short description. If the card is not visible,
> verify that `apiVisibilityModule` was added to the `features` array in
> `packages/app/src/App.tsx` and that Backstage was fully restarted after the change.

✅ **Pass**: All three APIs show their owning team and an **API Visibility** card showing
**Shared** or **Private**; each team's page lists its owned API(s).

❌ **Fail — API Visibility card not visible**: Verify that `apiVisibilityModule` is
imported and included in the `features` array in `packages/app/src/App.tsx` (Step 2b),
and that Backstage was restarted after the change.

❌ **Fail — duplicate APIs**: If you see two Museum API entries (or two Streetlights API
entries), the Lab 1 entries were not removed from `app-config.yaml`. Remove them and
restart. See
[Troubleshooting — Duplicate API entries](#duplicate-api-entries-in-the-catalog).

❌ **Fail — Train Travel API missing**: Check that the `train-travel-api.yaml` URL entry
is in your `app-config.yaml`. Open the target URL in a browser to confirm it returns YAML
content (not a 404).

❌ **Fail — Owner field not shown**: Check that the updated API `yaml` URLs are in your
`app-config.yaml` (not the original Lab 1 paths). Open each target URL in a browser to
verify it returns the Lab 2 YAML with `spec.owner: group:default/...`.

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

1. Click **Sign In** (shown on the Backstage home page if not already signed in)
2. Click **Enter as Guest**

### ✅ Verification — Step 3

After signing in, confirm your identity:
1. Click the **Settings** icon in the **bottom-left** of the Backstage sidebar
2. Your profile page will show the signed-in user's display name and email
3. Click **alice** (the user name shown on the profile page) → Backstage navigates to
   Alice's catalog entity page
4. Verify that **museum-team** is listed under her group memberships

✅ **Pass**: The profile shows **Alice Chen**, and her catalog page shows **museum-team**
as her group. This confirms that authentication resolved Alice's team membership correctly —
the permissions framework will use this membership to filter API visibility in Step 4.

❌ **Fail — "Sign in failed" or generic guest identity shown**: Verify that:
- `app-config.local.yaml` is in the correct directory (next to `app-config.yaml`)
- The `userEntityRef` value (`user:default/alice`) exactly matches the `metadata.name`
  (`alice`) and `metadata.namespace` (`default`) of the User entity in `users.yaml`
- The catalog has loaded the `users.yaml` file (Step 1 verification passes) before you
  attempt to sign in
- See [Troubleshooting — Sign-in shows wrong user](#sign-in-shows-the-wrong-user-or-fails)
  for more.

---

## Step 4: Enable Two-Tier API Visibility

### Why this step matters

By default, Backstage uses an **allow-all** permission policy: every signed-in user can
see every catalog entity. To demonstrate the two-tier visibility model you configured in
Step 2, you need to replace the allow-all policy with a custom policy that enforces these
rules:

| Rule | Entity type | Condition | Result |
|------|-------------|-----------|--------|
| 1 | Any non-API entity (User, Group, etc.) | Always | ✅ Allow |
| 2 | Any API with `example.com/visibility: shared` | Always | ✅ Allow |
| 3 | Any API owned by the signed-in user's team | User is a team member | ✅ Allow |
| 4 | Any other API | — | ❌ Deny |

The policy uses `anyOf` logic: an entity is visible if **any** of rules 1–3 is true.
This means User and Group catalog entries are always visible to all users (rule 1), shared
APIs are visible to everyone (rule 2), and private APIs are filtered by team membership
(rule 3).

> **Why keep User and Group entries visible to everyone?** If you restrict visibility of
> User and Group entities, users can't browse teams or see who owns what. The whole point
> of an API portal is discoverability — keeping the org chart open while controlling API
> visibility is a common and deliberate production pattern.

For all non-catalog permissions (scaffolding, TechDocs, search, etc.), the policy returns
**ALLOW** unconditionally — so the rest of Backstage continues to function normally.

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
        {
          anyOf: [
            // Rule 1: Non-API entities (User, Group, etc.) are always visible to all users.
            // This keeps the org chart and team pages open for everyone.
            { not: catalogConditions.isEntityKind({ kinds: ['API'] }) },

            // Rule 2: APIs annotated as shared are visible to all authenticated users,
            // regardless of which team they belong to.
            catalogConditions.hasAnnotation({
              annotation: 'example.com/visibility',
              value: 'shared',
            }),

            // Rule 3: Private APIs are visible only to members of the owning team.
            // The user's ownershipEntityRefs contains their user ref plus all their
            // group refs, resolved from the catalog User entity's memberOf list.
            catalogConditions.isEntityOwner({
              claims: user?.info.ownershipEntityRefs ?? [],
            }),
          ],
        },
      );
    }
    // All non-catalog permissions (scaffolding, TechDocs, search) are unconditionally allowed.
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

### ✅ Verification — Steps 4, 5, and 6

**Sign in as Alice (Museum Team):**

1. Ensure `app-config.local.yaml` has `userEntityRef: user:default/alice`
2. Restart Backstage (`Ctrl+C`, then `yarn start`), wait for catalog to load
3. Click **Sign In** → **Enter as Guest**
4. Click the **Settings** icon in the bottom-left sidebar → verify the profile shows **Alice Chen**
5. Navigate to **Catalog** → **Kind: API**
6. Verify the **Train Travel API** is visible (rule 2: shared annotation)
7. Verify the **Museum API** is visible (rule 3: Alice is in museum-team)
8. Verify the **Streetlights API** is **NOT** visible (rule 3 fails: Alice is not in streetlights-team)
9. Try navigating directly to the Streetlights API URL (copy it from a previous session
   if you have it) — Backstage should show "Not Found" or an error, not the API detail page

✅ **Pass (Alice)**: Train Travel API and Museum API are visible. Streetlights API is absent.

❌ **Fail — all APIs still visible**: Verify that:
- The `allow-all-policy` import was removed from `index.ts` (not just commented out)
- The `permissionPolicy.ts` file is at exactly
  `packages/backend/src/extensions/permissionPolicy.ts`
- Backstage was restarted after both file changes
- See [Troubleshooting — Permission policy not applying](#permission-policy-not-applying)

❌ **Fail — Train Travel API not visible to Alice**: The `example.com/visibility: shared`
annotation may be missing or misspelled in `train-travel-api.yaml`. See
[Troubleshooting — Train Travel API not visible to all users](#train-travel-api-not-visible-to-all-users).

**Switch to Charlie (Streetlights Team):**

1. Edit `app-config.local.yaml`: change `userEntityRef` to `user:default/charlie`
2. Restart Backstage (`Ctrl+C`, then `yarn start`), wait for catalog to load
3. Click **Sign In** → **Enter as Guest**
4. Click the **Settings** icon → verify the profile shows **Charlie Davis**
5. Navigate to **Catalog** → **Kind: API**
6. Verify the **Train Travel API** is visible (shared — same as Alice saw)
7. Verify the **Streetlights API** is visible (Charlie is in streetlights-team)
8. Verify the **Museum API** is **NOT** visible (Charlie is not in museum-team)

✅ **Pass (Charlie)**: Train Travel API and Streetlights API are visible. Museum API is absent.
✅ **The key result**: Alice and Charlie both see the Train Travel API (shared), but each
   sees only their own team's private API — a two-tier visibility difference produced by
   ownership, annotations, and the permissions framework.

❌ **Fail**: Check that `charlie` exists in the catalog with `memberOf: [streetlights-team]`
(Step 1 verification) and that the Streetlights API has `spec.owner: group:default/streetlights-team`
(Step 2 verification).

**Verify User and Group visibility (either user):**

While signed in as Alice or Charlie, confirm that non-API catalog entries are unrestricted:

1. Navigate to **Catalog** → **Kind: Group**
2. Verify all three groups are visible: `museum-team`, `streetlights-team`, `platform-team`
3. Navigate to **Catalog** → **Kind: User**
4. Verify all four users are visible: `alice`, `bob`, `charlie`, `diana`

✅ **Pass**: All users and groups are visible regardless of the signed-in user's team.
   This confirms rule 1 of the policy is working correctly.

❌ **Fail — users or groups not visible**: The `not(isEntityKind(['API']))` arm of the
policy is not executing correctly. Verify the TypeScript matches the code above exactly,
particularly the `anyOf` structure and the `{ not: ... }` wrapper around `isEntityKind`.

### Edge Cases

**What if a user is a member of multiple teams?**
A user who is a member of both `museum-team` and `streetlights-team` would see the private
APIs owned by *both* teams, plus any shared APIs. Backstage adds all group refs to the
user's `ownershipEntityRefs`, and `isEntityOwner` checks if any of them match. In this
lab, each user belongs to exactly one team to keep the demonstration unambiguous. If you
want to experiment with multi-team membership, add a user to both teams' `members` lists
and the user's `memberOf` list, restart, and sign in as that user.

**What if a private API has no `spec.owner`?**
An API entity with no `spec.owner` and no `example.com/visibility: shared` annotation has
no ownership refs and is not marked shared. The policy will deny it for every user —
meaning no signed-in user can see it. If you register an API without setting `spec.owner`
and find it invisible to everyone after enabling the custom policy, that is why. Either
assign an owner or add the shared annotation.

**What if the shared annotation is accidentally omitted from an API intended to be shared?**
Without the `example.com/visibility: shared` annotation, the Train Travel API would only
be visible to members of `platform-team` — which has no members, so it would be invisible
to everyone. If the shared API disappears from both Alice's and Charlie's catalog views
after enabling the policy, verify that `train-travel-api.yaml` has:
```yaml
metadata:
  annotations:
    example.com/visibility: shared
```
The annotation key is case-sensitive and must match exactly. See
[Troubleshooting — Train Travel API not visible to all users](#train-travel-api-not-visible-to-all-users).

**What about visibility of User, Group, and other non-API catalog entries?**
The policy's first rule (`not(isEntityKind(['API']))`) passes for any entity that is not an
API — including User, Group, Component, System, Domain, and Location entities. These are
always visible to all authenticated users, regardless of team membership or annotations.
This is intentional: restricting User/Group visibility would prevent users from browsing
teams and understanding the org structure. To verify: navigate to Catalog → Kind: Group
while signed in as any user and confirm all three groups appear.

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
an empty `ownershipEntityRefs` list, so rule 3 will deny all private APIs. Rule 2 will
still pass for shared APIs (the annotation check does not require user identity), so the
Train Travel API should still be visible even for an anonymous guest. Create
`app-config.local.yaml` with a valid `userEntityRef` and restart to see team-specific
visibility.

---

## Summary Checklist

Use this checklist to confirm you have completed every step of the lab:

- [ ] Museum Team (`museum-team`) appears in the catalog with alice and bob as members
- [ ] Streetlights Team (`streetlights-team`) appears in the catalog with charlie and diana as members
- [ ] Platform Team (`platform-team`) appears in the catalog with no members (expected)
- [ ] All four users (alice, bob, charlie, diana) appear in the catalog
- [ ] Museum API shows `museum-team` as owner and an **API Visibility** card showing **Private**
- [ ] Streetlights API shows `streetlights-team` as owner and an **API Visibility** card showing **Private**
- [ ] Train Travel API shows `platform-team` as owner and an **API Visibility** card showing **Shared**
- [ ] Signed in as Alice → Train Travel API and Museum API are visible; Streetlights API is absent
- [ ] Signed in as Charlie → Train Travel API and Streetlights API are visible; Museum API is absent
- [ ] Signed in as either user → all three groups and all four users are visible in the catalog

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

### Train Travel API not visible to all users

If the Train Travel API is not visible to Alice, Charlie, or any authenticated user after
enabling the custom permission policy:

1. **Check the annotation key and value**: Open
   `labs/lab-02-users-roles/catalog/apis/train-travel-api.yaml` and verify:
   ```yaml
   metadata:
     annotations:
       example.com/visibility: shared
   ```
   The key is `example.com/visibility` (dot between `example` and `com`, forward-slash
   separator) and the value is `shared` (lowercase). Both are case-sensitive.

2. **Check the catalog location is registered**: Verify `app-config.yaml` includes a
   location entry for `train-travel-api.yaml` with `rules: - allow: [API]`.

3. **Check the policy annotation check**: In `permissionPolicy.ts`, verify the
   `hasAnnotation` condition matches exactly:
   ```typescript
   catalogConditions.hasAnnotation({
     annotation: 'example.com/visibility',
     value: 'shared',
   })
   ```

4. **Restart required**: Any change to catalog YAML files or TypeScript source requires
   a full restart (`Ctrl+C`, then `yarn start`).

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
