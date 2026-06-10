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

## R-006: Shared API Annotation Convention

**Decision**: Mark shared (platform) APIs with the annotation
`example.com/visibility: shared` in their `catalog-info.yaml` `metadata.annotations` block.
The permission policy reads this annotation via `catalogConditions.hasAnnotation` to grant
unconditional visibility.

**Rationale**: Backstage's `catalogConditions.hasAnnotation` accepts both a key and an
optional value for exact matching. Using a custom annotation in the `example.com/` domain
(a fictional but conventional domain name for lab purposes) teaches learners that Backstage
annotations are just key-value metadata — any string key is valid. Keeping the annotation
in the catalog descriptor (not in a separate config file) means visibility is co-located
with the entity definition, making it easy to audit which APIs are shared.

**Format** (applied to shared API `catalog-info.yaml`):
```yaml
metadata:
  name: train-travel-api
  annotations:
    example.com/visibility: shared   # Makes this API visible to all authenticated users
```

**Alternatives considered**:
- Using `backstage.io/` namespace for the annotation: reserved for official Backstage
  annotations. Custom annotations should use a separate domain (e.g., `example.com/`).
- Using metadata tags (`tags: [shared]`): simpler YAML, but Backstage tags are freeform
  strings without namespacing. `hasAnnotation` with a namespaced key is more explicit and
  mirrors real-world Backstage annotation patterns (e.g., `jira.com/project-key`).
- Using a shared-membership group: adding all users to a `platform-team` group would give
  everyone `isEntityOwner` access to the shared API. This conflates org membership with
  visibility rules, and would need to be updated whenever a new user is added. The annotation
  approach is declarative and does not require touching user/group entities.

**Train Travel API source**: The shared API uses the Train Travel API from
`https://github.com/bump-sh-examples/train-travel-api` — an approved example per
Constitution Principle VII. The `spec.definition` in the catalog-info.yaml should point
to the raw GitHub URL of the OpenAPI spec file in that repository. Verify the URL is
accessible before committing.
