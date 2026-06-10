# Data Model: Lab 2 — Users, Roles, and API Visibility

**Branch**: `002-lab-2-users-roles` | **Date**: 2026-06-08 (Updated: 2026-06-11)

## Catalog Entities

All entities use the Backstage catalog descriptor format (`apiVersion: backstage.io/v1alpha1`).
Namespace is `default` throughout. Names follow kebab-case convention.

---

### Group Entities

Three groups: two team groups (with members, owning private APIs) and one platform group
(no members, owning the shared API).

#### `group:default/museum-team`

| Field | Value |
|-------|-------|
| `metadata.name` | `museum-team` |
| `metadata.namespace` | `default` |
| `spec.type` | `team` |
| `spec.profile.displayName` | `Museum Team` |
| `spec.children` | `[]` (no sub-teams) |
| `spec.members` | `[alice, bob]` |

Owns: `api:default/museum-api`

#### `group:default/streetlights-team`

| Field | Value |
|-------|-------|
| `metadata.name` | `streetlights-team` |
| `metadata.namespace` | `default` |
| `spec.type` | `team` |
| `spec.profile.displayName` | `Streetlights Team` |
| `spec.children` | `[]` (no sub-teams) |
| `spec.members` | `[charlie, diana]` |

Owns: `api:default/streetlights-api`

#### `group:default/platform-team`

| Field | Value |
|-------|-------|
| `metadata.name` | `platform-team` |
| `metadata.namespace` | `default` |
| `spec.type` | `team` |
| `spec.profile.displayName` | `Platform Team` |
| `spec.children` | `[]` (no sub-teams) |
| `spec.members` | `[]` (no members — organisational unit only) |

Owns: `api:default/train-travel-api` (shared API — visible to all users via annotation)

**Note**: This group has no human members. Its purpose is to provide a valid `spec.owner`
value for the shared API. Visibility of the shared API is controlled by the
`example.com/visibility: shared` annotation on the API entity, not by group membership.

---

### User Entities

Four users — two per team. All user details are fictional example values.

#### `user:default/alice`

| Field | Value |
|-------|-------|
| `metadata.name` | `alice` |
| `spec.profile.displayName` | `Alice Chen` |
| `spec.profile.email` | `alice@example.com` |
| `spec.memberOf` | `[museum-team]` |

#### `user:default/bob`

| Field | Value |
|-------|-------|
| `metadata.name` | `bob` |
| `spec.profile.displayName` | `Bob Smith` |
| `spec.profile.email` | `bob@example.com` |
| `spec.memberOf` | `[museum-team]` |

#### `user:default/charlie`

| Field | Value |
|-------|-------|
| `metadata.name` | `charlie` |
| `spec.profile.displayName` | `Charlie Davis` |
| `spec.profile.email` | `charlie@example.com` |
| `spec.memberOf` | `[streetlights-team]` |

#### `user:default/diana`

| Field | Value |
|-------|-------|
| `metadata.name` | `diana` |
| `spec.profile.displayName` | `Diana Lee` |
| `spec.profile.email` | `diana@example.com` |
| `spec.memberOf` | `[streetlights-team]` |

---

### API Entities

Lab 2 introduces three API entities: two private (visible only to the owning team) and one
shared (visible to all authenticated users). The Lab 1 API descriptors for museum-api and
streetlights-api are updated to add `spec.owner`; the train-travel-api is new. Lab 1 versions
of museum-api and streetlights-api should be deregistered from `app-config.yaml` when Lab 2
versions are registered.

#### `api:default/museum-api` — *Private*

| Field | Value |
|-------|-------|
| `metadata.name` | `museum-api` (unchanged from Lab 1) |
| `metadata.tags` | `[rest, openapi, sample, private]` — `private` tag makes visibility visible in UI |
| `metadata.annotations['example.com/visibility']` | `private` **(retained for display; does not affect permission policy)** |
| `spec.owner` | `group:default/museum-team` **(new in Lab 2)** |
| `spec.type` | `openapi` |
| `spec.lifecycle` | `production` |
| `spec.definition.$text` | GitHub raw URL to museum openapi.yaml (from Lab 1) |

Visible to: `museum-team` members only (Alice, Bob).

**Note**: Tags are prominently displayed in Backstage's About card and in the catalog list.
The `private` tag makes the visibility designation immediately visible to team members who
can access the API page. The annotation is kept for documentation completeness; the
permission policy restricts access via `isEntityOwner` (not via the annotation value).

#### `api:default/streetlights-api` — *Private*

| Field | Value |
|-------|-------|
| `metadata.name` | `streetlights-api` (unchanged from Lab 1) |
| `metadata.tags` | `[event-driven, asyncapi, sample, private]` — `private` tag makes visibility visible in UI |
| `metadata.annotations['example.com/visibility']` | `private` **(retained for display; does not affect permission policy)** |
| `spec.owner` | `group:default/streetlights-team` **(new in Lab 2)** |
| `spec.type` | `asyncapi` |
| `spec.lifecycle` | `production` |
| `spec.definition.$text` | GitHub raw URL to streetlights asyncapi.yaml (from Lab 1) |

Visible to: `streetlights-team` members only (Charlie, Diana).

**Note**: Same approach as museum-api — the `private` tag surfaces the visibility
designation in Backstage's UI; the annotation is for display completeness.

#### `api:default/train-travel-api` — *Shared*

| Field | Value |
|-------|-------|
| `metadata.name` | `train-travel-api` **(new in Lab 2)** |
| `metadata.tags` | `[rest, openapi, sample, shared]` — `shared` tag makes visibility visible in UI |
| `metadata.annotations['example.com/visibility']` | `shared` **(read by permission policy to grant unconditional access)** |
| `spec.owner` | `group:default/platform-team` |
| `spec.type` | `openapi` |
| `spec.lifecycle` | `production` |
| `spec.definition.$text` | GitHub raw URL to Train Travel API OpenAPI spec (from bump-sh-examples) |

Visible to: all authenticated users (Alice, Bob, Charlie, Diana).
Source: https://github.com/bump-sh-examples/train-travel-api

---

## Configuration Artifacts

These are not catalog entities but are configuration files that form part of the lab deliverable.

### `app-config.local.yaml` (developer creates, not committed)

Controls which user the guest auth provider resolves to. The developer switches this value
between sessions to demonstrate different API visibility.

| Field | Type | Example values |
|-------|------|----------------|
| `auth.providers.guest.userEntityRef` | string (entity ref) | `user:default/alice` or `user:default/charlie` |

### `packages/backend/src/extensions/permissionPolicy.ts`

Custom permission policy module. One TypeScript file, no external dependencies beyond
packages already present in Backstage 1.51.0.

| Element | Description |
|---------|-------------|
| `CatalogOwnershipPolicy` | Implements `PermissionPolicy`; applies two-tier visibility to catalog reads |
| Module export | `createBackendModule` for `pluginId: 'permission'`, `moduleId: 'permission-policy'` |

**Two-tier logic** (applied when `isResourcePermission(request.permission, 'catalog-entity')`):

| Condition | Result |
|-----------|--------|
| Entity kind is NOT `API` | ALLOW (Users, Groups, etc. are unrestricted) |
| API has annotation `example.com/visibility: shared` | ALLOW (shared platform APIs) |
| API is owned by the signed-in user's team | ALLOW (private APIs for team members) |
| None of the above | DENY |

### `packages/backend/src/index.ts` (modified)

| Change | Description |
|--------|-------------|
| Remove | `import('@backstage/plugin-permission-backend-module-allow-all-policy')` |
| Add | `import('./extensions/permissionPolicy')` |

---

## Entity Relationships

```text
museum-team (Group)
  ├── hasMember → alice (User)
  ├── hasMember → bob (User)
  └── ownerOf → museum-api (API) [private — visible to museum-team only]

streetlights-team (Group)
  ├── hasMember → charlie (User)
  ├── hasMember → diana (User)
  └── ownerOf → streetlights-api (API) [private — visible to streetlights-team only]

platform-team (Group, no members)
  └── ownerOf → train-travel-api (API) [shared — visible to all users via annotation]

alice (User)
  └── memberOf → museum-team (Group)

bob (User)
  └── memberOf → museum-team (Group)

charlie (User)
  └── memberOf → streetlights-team (Group)

diana (User)
  └── memberOf → streetlights-team (Group)
```

The `ownerOf` relation is derived by Backstage from `spec.owner` on the API entity.
The `hasMember`/`memberOf` relations are derived from the `members` list on the Group entity
and the `memberOf` list on the User entity (both must be present for bidirectional resolution).
Shared vs. private access control is determined by the `example.com/visibility: shared`
annotation on the API entity — it is independent of the `ownerOf` relation. All three API
entities carry an explicit `example.com/visibility` annotation (`shared` or `private`) so
that any user viewing an API's catalog page can immediately see its visibility designation.

**Effective visibility summary**:

| User | Sees | Does not see |
|------|------|--------------|
| Alice (museum-team) | train-travel-api, museum-api | streetlights-api |
| Bob (museum-team) | train-travel-api, museum-api | streetlights-api |
| Charlie (streetlights-team) | train-travel-api, streetlights-api | museum-api |
| Diana (streetlights-team) | train-travel-api, streetlights-api | museum-api |

All users and groups are visible to all authenticated users regardless of team membership.
