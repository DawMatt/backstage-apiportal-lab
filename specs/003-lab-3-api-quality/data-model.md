# Data Model: Lab 3 — API Quality

**Branch**: `003-api-quality` | **Date**: 2026-06-15

## Catalog Entities

All entities use the Backstage catalog descriptor format (`apiVersion: backstage.io/v1alpha1`).
Namespace is `default` throughout. Names follow kebab-case convention.

---

### Modified Entity: `group:default/platform-team`

The platform-team Group was defined in Lab 2 with no members (it served only as an
`spec.owner` for the shared Train Travel API). Lab 3 adds `eve` as a member to enable
the platform-team quality visibility demonstration.

**File modified**: `labs/lab-02-users-roles/catalog/teams.yaml`

| Field | Lab 2 value | Lab 3 change |
|-------|-------------|--------------|
| `metadata.name` | `platform-team` | Unchanged |
| `spec.type` | `team` | Unchanged |
| `spec.profile.displayName` | `Platform Team` | Unchanged |
| `spec.children` | `[]` | Unchanged |
| `spec.members` | `[]` | Changed to `[eve]` |

**Updated YAML fragment**:
```yaml
# labs/lab-02-users-roles/catalog/teams.yaml — platform-team entry
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: platform-team
  namespace: default
  description: The team responsible for maintaining the Backstage developer portal.
spec:
  type: team
  profile:
    displayName: Platform Team
  children: []
  members:
    - eve        # new in Lab 3
```

Owns: `api:default/train-travel-api` (unchanged from Lab 2)

---

### New Entity: `user:default/eve`

A platform team member introduced in Lab 3 to demonstrate that platform team members have
access to detailed API quality information across all APIs, regardless of API ownership.

**File**: `labs/lab-03-api-quality/catalog/platform-user.yaml`

| Field | Value |
|-------|-------|
| `metadata.name` | `eve` |
| `metadata.namespace` | `default` |
| `spec.profile.displayName` | `Eve Rodriguez` |
| `spec.profile.email` | `eve@example.com` (fictional example value) |
| `spec.memberOf` | `[platform-team]` |

**YAML**:
```yaml
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: eve
  namespace: default
spec:
  profile:
    displayName: Eve Rodriguez
    email: eve@example.com      # fictional example value — see Security Note in README
  memberOf:
    - platform-team
```

**Key property**: Eve's `memberOf: [platform-team]` causes Backstage to populate her
`ownershipEntityRefs` with `[user:default/eve, group:default/platform-team]` after
catalog ingestion. The `SpectralLinterContent` wrapper checks for `group:default/platform-team`
in these refs to grant access to Spectral lint results. The api-grade plugin's
`apiGrade.visibility.groups` config checks the same refs to grant access to the detailed
quality breakdown. Both mechanisms use the same Backstage identity data — no special
configuration is duplicated.

---

### Unchanged Entities from Labs 1 and 2

The following entities are unchanged in Lab 3 (they carry their Lab 2 state):

- `group:default/museum-team` (members: alice, bob — unchanged)
- `group:default/streetlights-team` (members: charlie, diana — unchanged)
- `user:default/alice`, `user:default/bob` (museum-team members — unchanged)
- `user:default/charlie`, `user:default/diana` (streetlights-team members — unchanged)
- `api:default/museum-api` (private, openapi, owned by museum-team — unchanged)
- `api:default/streetlights-api` (private, asyncapi, owned by streetlights-team — unchanged)
- `api:default/train-travel-api` (shared, openapi, owned by platform-team — unchanged)

---

## Entity Relationships

```text
museum-team (Group)
  ├── hasMember → alice (User)
  ├── hasMember → bob (User)
  └── ownerOf → museum-api (API) [private; OAS3 quality grade + lint results visible to alice/bob/eve]

streetlights-team (Group)
  ├── hasMember → charlie (User)
  ├── hasMember → diana (User)
  └── ownerOf → streetlights-api (API) [private; AsyncAPI quality grade + lint results visible to charlie/diana/eve]

platform-team (Group)
  ├── hasMember → eve (User)          ← NEW IN LAB 3
  └── ownerOf → train-travel-api (API) [shared; OAS3 quality grade + lint results visible to eve + platform-team config]

alice, bob (Users) → memberOf → museum-team
charlie, diana (Users) → memberOf → streetlights-team
eve (User) → memberOf → platform-team               ← NEW IN LAB 3
```

**Quality visibility summary**:

| User | Sees grade summary | Sees grade detail + Spectral lint |
|------|--------------------|-----------------------------------|
| Alice (museum-team) | All 3 APIs | museum-api only |
| Bob (museum-team) | All 3 APIs | museum-api only |
| Charlie (streetlights-team) | All 3 APIs | streetlights-api only |
| Diana (streetlights-team) | All 3 APIs | streetlights-api only |
| Eve (platform-team) | All 3 APIs | All 3 APIs |

"Sees grade summary" = grade letter + percentage + quality label visible on the API entity page
(api-grade card info column, visible to all authenticated users).

"Sees grade detail + Spectral lint" = Quality Assessment, Recommendations, Diagnostics
(api-grade detailed view) + Spectral lint results tab — visible to owners and platform team.

Note: "Grade summary visible to all" assumes the api-grade plugin natively supports the
split display (confirmed from plugin docs). If a split-view regression occurs, the fallback
is to hide the entire card from non-owners (see Spec FR-006, Clarification Q2).

---

## Configuration Artifacts

These are not catalog entities but configuration files that form part of the lab deliverable.

---

### `labs/lab-03-api-quality/.spectral.yaml` (new — committed to repo)

The shared Spectral ruleset file. Both quality plugins reference this file via its GitHub
raw URL.

| Field | Value |
|-------|-------|
| File path | `labs/lab-03-api-quality/.spectral.yaml` |
| GitHub raw URL | `https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-03-api-quality/.spectral.yaml` |
| `extends` | `[spectral:oas, spectral:asyncapi]` |

**Content**:
```yaml
extends:
  - spectral:oas
  - spectral:asyncapi
```

Spectral's format detection automatically applies OAS3 rules to OpenAPI specifications
and AsyncAPI rules to AsyncAPI specifications. No additional configuration is needed to
separate the two rule sets.

---

### `app-config.yaml` additions (student modifies in Backstage instance)

#### Catalog location — `platform-user.yaml`

```yaml
catalog:
  locations:
    # --- Lab 3: Platform team member ---
    - type: url
      target: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-03-api-quality/catalog/platform-user.yaml
      rules:
        - allow: [User]
```

#### `apiGrade` section

```yaml
apiGrade:
  ruleset:
    url: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-03-api-quality/.spectral.yaml
    # token: ${API_GRADE_RULESET_TOKEN}   # only if repo is private
  visibility:
    allowAll: false
    groups:
      - group:default/platform-team
```

**Effect**: All authenticated users see the grade summary on every API entity page. Members
of the API's owning team AND members of `platform-team` see the detailed view (Quality
Assessment, Recommendations, Diagnostics). The `allowAll: false` is the default but is
stated explicitly to make the intent clear to learners.

#### `spectralLinter` section

```yaml
spectralLinter:
  openApiRulesetUrl: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-03-api-quality/.spectral.yaml
  asyncApiRulesetUrl: https://raw.githubusercontent.com/<user>/<repo>/<branch>/labs/lab-03-api-quality/.spectral.yaml
```

**Effect**: Both OpenAPI and AsyncAPI specs are linted using the same shared ruleset file.
Spectral applies the relevant rules based on format detection at lint time.

---

### TypeScript Frontend Modules (new files in student's Backstage instance)

#### `packages/app/src/modules/apiGrade/index.ts`

| Element | Description |
|---------|-------------|
| `apiGradeCard` | `EntityCardBlueprint.make()` — `filter: 'kind:API'`, `type: 'info'`, loads `ApiGradeCard` |
| `apiGradeModule` | `createFrontendModule({ pluginId: 'catalog', extensions: [apiGradeCard] })` |

Places the api-grade card in the right-hand info column of API entity pages, below the
About card and the API Visibility card from Lab 2. The `type: 'info'` param is required
(same lesson as Lab 2 R-007 — without it, the card appears at the bottom of the main
content area).

#### `packages/app/src/modules/spectralLinter/SpectralLinterContent.tsx`

| Element | Description |
|---------|-------------|
| `SpectralLinterContent` | React component; checks `isOwnedEntity` (via `useEntityOwnership`) AND `isPlatformTeamMember` (via `identityApiRef`) |
| Owner or platform member | Renders `<EntityApiDocsSpectralLinterContent />` |
| Neither | Renders an `<InfoCard>` with an access-restricted message |

#### `packages/app/src/modules/spectralLinter/index.ts`

| Element | Description |
|---------|-------------|
| `spectralLinterContent` | `EntityContentBlueprint.make()` — `filter: 'kind:API'`, adds "Spectral" tab |
| `spectralLinterModule` | `createFrontendModule({ pluginId: 'catalog', extensions: [spectralLinterContent] })` |

#### `packages/app/src/App.tsx` (modified)

| Change | Description |
|--------|-------------|
| Add import | `import { apiGradeModule } from './modules/apiGrade'` |
| Add import | `import { spectralLinterModule } from './modules/spectralLinter'` |
| Add to features | Both modules added to `createApp({ features: [...] })` array |

---

### `packages/backend/src/index.ts` (modified)

| Change | Description |
|--------|-------------|
| Add | `backend.add(import('backstage-plugin-api-grade-backend'))` |

Self-registers under the `api-grade` plugin ID; exposes `GET /api/api-grade/grade`.
Wires to Catalog client and identity services via the New Backend System's DI. No manual
router setup required.

---

### `app-config.local.yaml` (developer sets locally, not committed)

Controls which user the guest auth provider resolves to. Lab 3 adds `eve` as an additional
user identity the developer can switch to, to demonstrate platform-team visibility.

| Field | Type | Lab 3 values |
|-------|------|--------------|
| `auth.providers.guest.userEntityRef` | string | `user:default/alice` (museum-team), `user:default/charlie` (streetlights-team), `user:default/eve` (platform-team) |
