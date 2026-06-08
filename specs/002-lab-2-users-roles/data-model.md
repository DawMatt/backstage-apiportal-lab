# Data Model: Lab 2 — Users, Roles, and API Visibility

**Branch**: `002-lab-2-users-roles` | **Date**: 2026-06-08

## Catalog Entities

All entities use the Backstage catalog descriptor format (`apiVersion: backstage.io/v1alpha1`).
Namespace is `default` throughout. Names follow kebab-case convention.

---

### Group Entities

Two groups represent the two teams in the lab. Each group owns one API from Lab 1.

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

### API Entities (updated from Lab 1)

The Lab 1 API descriptors are updated to add `spec.owner`. All other fields remain unchanged
from Lab 1. These are the replacement catalog-info.yaml files — the Lab 1 versions should be
deregistered from `app-config.yaml` when the Lab 2 versions are registered.

#### `api:default/museum-api`

| Field | Value |
|-------|-------|
| `metadata.name` | `museum-api` (unchanged from Lab 1) |
| `spec.owner` | `group:default/museum-team` **(new in Lab 2)** |
| `spec.type` | `openapi` |
| `spec.lifecycle` | `production` |
| `spec.definition.$text` | GitHub raw URL to museum openapi.yaml (from Lab 1) |

#### `api:default/streetlights-api`

| Field | Value |
|-------|-------|
| `metadata.name` | `streetlights-api` (unchanged from Lab 1) |
| `spec.owner` | `group:default/streetlights-team` **(new in Lab 2)** |
| `spec.type` | `asyncapi` |
| `spec.lifecycle` | `production` |
| `spec.definition.$text` | GitHub raw URL to streetlights asyncapi.yaml (from Lab 1) |

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
| `CatalogOwnershipPolicy` | Implements `PermissionPolicy`; restricts catalog reads to entity owners |
| Module export | `createBackendModule` for `pluginId: 'permission'`, `moduleId: 'permission-policy'` |

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
  └── ownerOf → museum-api (API)

streetlights-team (Group)
  ├── hasMember → charlie (User)
  ├── hasMember → diana (User)
  └── ownerOf → streetlights-api (API)

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
