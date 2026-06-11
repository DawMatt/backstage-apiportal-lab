# Research: Lab 2 — Users, Roles, and API Visibility

**Branch**: `002-lab-2-users-roles` | **Date**: 2026-06-08

## R-001: User and Group Catalog Entity Format

**Decision**: Use Backstage's built-in `User` and `Group` catalog entity kinds, defined as
separate YAML documents in committed catalog descriptor files.

**Rationale**: These are stable, first-class Backstage catalog entity kinds. The Group entity's
`members` list and the User entity's `memberOf` list are the standard mechanism for establishing
team membership. Backstage's catalog resolves these into `memberOf` and `hasMember` relations
that the permissions framework reads via `ownershipEntityRefs`.

**Alternatives considered**:
- Using Backstage's existing `examples/org.yaml` template: that file uses a `guest` user and
  `guests` group, which conflicts with the named users needed for the visibility demo. Lab 2
  adds new catalog files rather than modifying the examples.

**Canonical format confirmed**:
```yaml
# User entity
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: alice
  namespace: default
spec:
  profile:
    displayName: Alice Chen
    email: alice@example.com      # fictional example value
  memberOf:
    - museum-team

# Group entity
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: museum-team
  namespace: default
spec:
  type: team
  profile:
    displayName: Museum Team
  children: []
  members:
    - alice
    - bob
```

The `members` field on the Group and the `memberOf` field on the User are both required for
Backstage to build bidirectional relations. Omitting either causes the relation to be
one-directional and may cause the ownership resolver to miss group membership.

---

## R-002: API Ownership Assignment

**Decision**: Add `spec.owner` to each API's `catalog-info.yaml`, pointing to the owning
group as `group:default/<group-name>`.

**Rationale**: `spec.owner` is the standard Backstage ownership field. The permissions
framework's `isEntityOwner` condition checks this field (and its resolved relations) against
the requesting user's `ownershipEntityRefs`. Using the group ref (not the user ref) means any
member of the team can see the API, not just one named user.

**Format**:
```yaml
spec:
  owner: group:default/museum-team    # fully-qualified group ref
  type: openapi
  lifecycle: production
  definition:
    $text: https://...
```

**Alternatives considered**:
- Using a bare name without namespace (`museum-team`): works in most cases but fully-qualified
  refs are more predictable when multiple namespaces are in use. Use fully-qualified refs.

---

## R-003: Guest Auth Provider — Configuring User Identity

**Decision**: Configure `userEntityRef` in `app-config.local.yaml` to map the guest sign-in
to a specific catalog user. The developer changes this value and restarts the dev server to
switch between users for the visibility demonstration.

**Rationale**: The `@backstage/plugin-auth-backend-module-guest-provider` (already installed)
supports a `userEntityRef` config option. When set to a valid catalog user entity ref, the
backend calls `signInWithCatalogUser`, which automatically resolves all `memberOf` group
relations from the catalog. This populates `ownershipEntityRefs` with both the user ref and
all their group refs — exactly what `isEntityOwner` needs to filter visibility correctly.

**Config** (`app-config.local.yaml`, not committed to the repository):
```yaml
# Lab only — see Security Note in README.
# Change this value and restart `yarn start` to sign in as a different user.
auth:
  providers:
    guest:
      userEntityRef: user:default/alice   # switch to user:default/charlie to see Team B
```

`app-config.local.yaml` is already gitignored by Backstage's default `.gitignore`. The lab
README provides two example values (one per team) and instructs the developer to switch between
them for the demo.

**Critical prerequisite**: The named user (e.g., `alice`) must exist as a `User` entity in the
Backstage catalog AND that User entity must have `memberOf` pointing to the correct Group.
Backstage must also have indexed the User entity before the sign-in is attempted (i.e., catalog
must have loaded the users.yaml file).

**Security Note** (per Constitution Principle IX): The `userEntityRef` config is a local
development convenience that bypasses real authentication. In production, Backstage should be
configured with an enterprise identity provider (OIDC, SAML, or LDAP) so that user identity
is verified externally. See the README Security Note section for details.

**Alternatives considered**:
- GitHub OAuth: requires creating a GitHub OAuth App and signing in with a real GitHub account.
  Adds an external prerequisite (GitHub account) and requires GitHub to be reachable. Excluded
  per Constitution Principle V (zero-cost) and Principle IV (no undocumented prerequisites).
- Static `ownershipEntityRefs` config (without catalog user lookup): works without catalog User
  entities, but then the catalog never shows a User profile page and the experience is less
  educational. The catalog-based approach is preferred.

**⚠️ Needs implementation verification**: The exact behavior when the `userEntityRef` user does
not yet exist in the catalog (race condition on startup) should be confirmed during implementation.
The recommended mitigation is to wait for the catalog to fully load (visible in the Backstage
UI) before clicking "Sign In".

---

## R-004: Custom Permission Policy — Two-Tier API Visibility

**Decision**: Replace `@backstage/plugin-permission-backend-module-allow-all-policy` with a
custom `CatalogOwnershipPolicy` module that implements a two-tier visibility model:
- Non-API catalog entities (User, Group, System, Domain, etc.) are always visible to all
  authenticated users — no restriction.
- API entities annotated with `example.com/visibility: shared` are visible to all
  authenticated users.
- All other API entities (private APIs) are visible only to members of the owning team,
  using the `isEntityOwner` conditional condition.

**Rationale**: The spec requires that users and groups remain fully visible to all
authenticated users (for team discoverability), while APIs are split between shared (e.g.
platform APIs) and private (team-owned APIs). Using Backstage's `PermissionCriteria` with
`anyOf` and `not` operators on conditional decisions enables this distinction without
loading entity data into the policy itself — the catalog backend evaluates the conditions
server-side after the policy returns.

**Implementation pattern** (confirmed for Backstage 1.51.0):

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
            // Non-API entities (User, Group, etc.) — always visible to all users
            { not: catalogConditions.isEntityKind({ kinds: ['API'] }) },
            // Shared APIs — visible to all users regardless of team membership
            catalogConditions.hasAnnotation({
              annotation: 'example.com/visibility',
              value: 'shared',
            }),
            // Private APIs — visible only to members of the owning team
            catalogConditions.isEntityOwner({
              claims: user?.info.ownershipEntityRefs ?? [],
            }),
          ],
        },
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

**Import sources** (confirmed for Backstage 1.51.0):

| Symbol | Package | Stability |
|--------|---------|-----------|
| `createBackendModule` | `@backstage/backend-plugin-api` | Stable |
| `PolicyDecision`, `AuthorizeResult`, `isResourcePermission` | `@backstage/plugin-permission-common` | Stable |
| `PermissionPolicy`, `PolicyQuery`, `PolicyQueryUser` | `@backstage/plugin-permission-node` | Stable |
| `policyExtensionPoint` | `@backstage/plugin-permission-node/alpha` | Alpha |
| `catalogConditions`, `createCatalogConditionalDecision` | `@backstage/plugin-catalog-backend/alpha` | Alpha |

**Alternatives considered**:
- Writing a separate permission backend plugin package: unnecessary complexity for a tutorial.
- Using `isEntityOwner` for all catalog entities (original approach): makes User and Group
  entities team-scoped, which prevents users from discovering other teams. Excluded because
  the spec explicitly requires User/Group entities to remain unrestricted.
- Using a `platform-team` group with all users as members: gives all users ownership of
  shared APIs but conflates org-hierarchy membership with visibility semantics. The annotation
  approach is cleaner and more instructive — it teaches that ownership ≠ visibility.
- Using `hasTag` instead of `hasAnnotation`: tags are simpler to write in YAML, but
  `hasAnnotation` with an explicit annotation key and value is more self-documenting and
  mirrors real-world Backstage annotation patterns. The annotation approach is preferred.

**Behaviour note for README**: With this policy, API visibility is explicitly two-tier.
The README should explain that the `anyOf` logic means an API is visible if ANY of the
three conditions is true — not owner AND shared. This is a key teaching point about how
`PermissionCriteria` composition works.

---

## R-005: Catalog Location Registration

**Decision**: Register Lab 2 catalog files as `type: url` entries in `app-config.yaml`,
following the same pattern used in Lab 1. The `rules` section for each location must include
`[User, Group]` for the teams/users files and `[API]` for the updated API descriptors.

**Key finding**: The existing `app-config.yaml` already includes an `examples/org.yaml`
location that allows `[User, Group]`. Lab 2 adds new catalog locations alongside this.
The `examples/org.yaml` `guest` user and `guests` group will also be visible in the catalog
alongside the Lab 2 users and groups — the lab README should note this and explain it does
not affect the visibility demonstration.

**Config snippet to add to `app-config.yaml`**:
```yaml
catalog:
  locations:
    # --- Lab 2: Teams and users ---
    - type: url
      target: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-02-users-roles/catalog/teams.yaml
      rules:
        - allow: [Group]
    - type: url
      target: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-02-users-roles/catalog/users.yaml
      rules:
        - allow: [User]
    # --- Lab 2: Private API descriptors with ownership ---
    - type: url
      target: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-02-users-roles/catalog/apis/museum-api.yaml
      rules:
        - allow: [API]
    - type: url
      target: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml
      rules:
        - allow: [API]
    # --- Lab 2: Shared API (visible to all users) ---
    - type: url
      target: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-02-users-roles/catalog/apis/train-travel-api.yaml
      rules:
        - allow: [API]
```

**Note on duplicate API entries**: The Lab 1 catalog-info.yaml entries for the Museum and
Streetlights APIs should be removed from `app-config.yaml` when the Lab 2 updated versions
are added, to avoid duplicate API entities in the catalog.

---

## R-006: API Visibility Annotation Convention

**Decision**: All API catalog descriptors carry an explicit `example.com/visibility`
annotation — `shared` for the platform API and `private` for team-owned APIs. The annotation
is the single source of truth for both the permission policy and the displayed designation.
No separate tag mirrors this value.

**Rationale**: FR-011 requires that the displayed visibility designation is derived directly
from the same metadata field the permission policy evaluates, and explicitly prohibits
maintaining a separate copy (such as a tag that mirrors the annotation). The
`example.com/visibility` annotation serves both purposes: the permission policy reads it via
`catalogConditions.hasAnnotation({ value: 'shared' })`, and it is displayed in Backstage's
**Annotations** section on every API's entity page. A change to the annotation is immediately
reflected in the displayed designation — no secondary field requires synchronisation.

**Format** (applied to all API `catalog-info.yaml` files):
```yaml
# Shared platform API — visible to all authenticated users
metadata:
  name: train-travel-api
  annotations:
    example.com/visibility: shared   # read by the permission policy AND displayed in UI

# Private team API — visible only to owning team members
metadata:
  name: museum-api
  annotations:
    example.com/visibility: private  # displayed in UI; policy uses isEntityOwner for access
```

**Alternatives considered**:
- Using `backstage.io/` namespace for the annotation: reserved for official Backstage
  annotations. Custom annotations should use a separate domain (e.g., `example.com/`).
- Using tags in addition to the annotation: FR-011 explicitly prohibits a tag or label that
  mirrors the policy-driving field because copies can diverge. Tags are excluded. The
  annotation alone, shown in the Backstage Annotations section, satisfies FR-011.
- Using only tags (no annotation): tags are freeform and `hasAnnotation` with a namespaced
  key is required for the permission policy to function. Tags alone cannot serve as the
  policy-driving field.
- Using a shared-membership group: adding all users to a `platform-team` group would give
  everyone `isEntityOwner` access to the shared API. This conflates org membership with
  visibility rules, and would need to be updated whenever a new user is added. The annotation
  approach is declarative and does not require touching user/group entities.
- Omitting the annotation on private APIs: the permission policy works without it, but
  then users cannot tell from the API page whether an API is shared or private. FR-011
  requires the designation to be visible on the page — the annotation on private APIs is
  necessary for this.

**Train Travel API source**: The shared API uses the Train Travel API from
`https://github.com/bump-sh-examples/train-travel-api` — an approved example per
Constitution Principle VII. The `spec.definition` in the catalog-info.yaml should point
to the raw GitHub URL of the OpenAPI spec file in that repository. Verify the URL is
accessible before committing.

---

## R-007: Making the Visibility Annotation Visible in the Backstage UI

**Context**: Backstage 1.51.0 in this lab uses the new declarative frontend (`createApp` from
`@backstage/frontend-defaults` with `@backstage/plugin-catalog/alpha`). In this setup, the
entity detail page is driven entirely by the catalog plugin's default extension configuration.
Custom annotations from non-`backstage.io/` domains (such as `example.com/visibility`) are
NOT rendered in any card on the default API entity page. Lab Run 3 confirmed: learners cannot
see the visibility annotation in the Backstage UI, so FR-011 ("visible metadata field") and
SC-007 ("visible without additional navigation or clicks") are both unmet.

**Decision**: Create a custom frontend module using `EntityCardBlueprint` from
`@backstage/plugin-catalog-react/alpha` to add an "API Visibility" card to the API entity
detail page. The card reads `entity.metadata.annotations['example.com/visibility']` directly
from the entity object provided by `useEntity()` — the same metadata field the permission
policy evaluates via `catalogConditions.hasAnnotation`. No secondary copy is maintained.

**Rationale**:
- Satisfies FR-011: the displayed designation is derived directly from the annotation that
  drives the permission policy — one field, two consumers (policy backend and UI card).
- Satisfies SC-007: the card appears prominently on the API entity page with no extra
  navigation. It is visible immediately when the developer opens any API's catalog page.
- No new npm packages: all required packages (`@backstage/plugin-catalog-react/alpha`,
  `@backstage/frontend-plugin-api`, `@backstage/core-components`) are already installed in
  the Backstage instance created in Lab 1.
- Follows the same pattern as the existing `navModule`: a `createFrontendModule` wrapping
  an `EntityCardBlueprint.make()` extension.
- Adds educational value: learners see a concrete example of Backstage's new declarative
  frontend extension system, not just the catalog and permissions framework.

**Implementation pattern** (confirmed for Backstage 1.51.0 new frontend):

```typescript
// packages/app/src/modules/apiVisibility/ApiVisibilityCard.tsx
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

```typescript
// packages/app/src/modules/apiVisibility/index.ts
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { ApiVisibilityCard } from './ApiVisibilityCard';

const apiVisibilityCard = EntityCardBlueprint.make({
  name: 'api-visibility',
  params: {
    filter: 'kind:API',
    type: 'info',   // REQUIRED: places card in right-hand info column (same as About card)
    loader: async () => React.createElement(ApiVisibilityCard),
  },
});

export const apiVisibilityModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [apiVisibilityCard],
});
```

```typescript
// packages/app/src/App.tsx — add apiVisibilityModule to features
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

**Alpha note**: `EntityCardBlueprint` is imported from the `/alpha` sub-path. This is the
officially supported extension mechanism for the new Backstage declarative frontend as of
1.51.0. The pattern is identical to how Backstage itself defines entity cards internally.

**Alternatives considered**:
- Using a tag alongside the annotation (Run 2 approach): tags are visible but FR-011
  explicitly prohibits a tag that mirrors the annotation. Rejected on spec compliance grounds.
- Modifying the app-config.yaml to configure entity page layout: Backstage 1.51.0 does not
  yet support annotation display via YAML configuration. Code is required.
- Adding `@backstage/plugin-catalog` frontend components directly: the catalog plugin's
  built-in About card does not surface custom-domain annotations in the default layout.
  A custom card is the correct extension point.
- Linking to the raw entity YAML: adds navigation, violates SC-007.

**Filter behaviour**: `filter: 'kind:API'` uses Backstage's entity filter expression syntax.
The card will only be mounted and rendered on pages for entities of kind `API`. For all other
entity kinds (User, Group, Component, etc.), the card is not loaded — no performance impact.

**Card placement — `type: 'info'` is required (SC-007)**: Backstage's `DefaultEntityContentLayout`
splits entity cards into two columns based on their `type` param:
- `type: 'info'` → right-hand sticky info column (About, Links, Labels cards)
- `type: 'content'` or no `type` → main content area (left column, rendered below all tab content)

Without `type: 'info'`, the API Visibility card defaults to `type: 'content'` and renders at the
very bottom of the page below all main content — failing SC-007 even though it technically
requires no additional navigation. Setting `type: 'info'` places the card alongside the About
card in the right-hand column, where it is immediately visible when a developer opens any API's
catalog page. Confirmed by inspecting
`@backstage/plugin-catalog/dist/alpha/DefaultEntityContentLayout.esm.js` in Backstage 1.51.0.
