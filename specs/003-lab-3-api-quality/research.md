# Research: Lab 3 — API Quality

**Branch**: `003-api-quality` | **Date**: 2026-06-15

## R-001: Spectral Ruleset Format and File Location

**Decision**: Create `labs/lab-03-api-quality/.spectral.yaml` using the built-in Spectral
ruleset aliases `spectral:oas` and `spectral:asyncapi`. Reference this file in both quality
plugins via its GitHub raw URL.

**Rationale**: Both `api-grade-core` (used by the api-grade backend) and
`@stoplight/spectral-rulesets` (used by the Spectral linter plugin) resolve `spectral:oas`
and `spectral:asyncapi` as built-in aliases for the standard OAS3 and AsyncAPI recommended
rules. No additional npm packages need to be installed for the ruleset — the required
Spectral packages are already bundled by each plugin. Using a committed YAML file keeps the
ruleset version-controlled and the GitHub raw URL makes it accessible to both the backend
plugin (Node.js) and the frontend linter plugin (browser-side fetch).

**Canonical format** (identical to the api-grade project's own `.spectral.yaml`):
```yaml
extends:
  - spectral:oas
  - spectral:asyncapi
```

**File path**: `labs/lab-03-api-quality/.spectral.yaml`

**GitHub raw URL** (used in `app-config.yaml`; substitute actual username and branch):
```
https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
```

**Why same URL for both plugins**: Both `apiGrade.ruleset.url` and
`spectralLinter.openApiRulesetUrl` / `spectralLinter.asyncApiRulesetUrl` accept this same
URL. When the Spectral linter plugin fetches it for a given API spec, it applies OAS3 rules
to OpenAPI specs and AsyncAPI rules to AsyncAPI specs — Spectral's format detection handles
the split. One file, one URL, two consumers. This satisfies FR-001 and FR-013.

**Verify during implementation**: Confirm that `spectral:oas` and `spectral:asyncapi`
aliases resolve correctly when the ruleset is fetched and evaluated by the browser-based
Spectral linter plugin. If resolution fails in the browser context, the fallback is to use
fully-qualified CDN URLs in the ruleset extends:
```yaml
# Fallback if spectral: aliases don't resolve in browser context
extends:
  - https://unpkg.com/@stoplight/spectral-openapi@1/ruleset.js
  - https://unpkg.com/@stoplight/spectral-asyncapi@1/ruleset.js
```
Note: if the fallback is required, both plugins still point to the same single ruleset file
— only the extends syntax changes.

**Alternatives considered**:
- Placing the ruleset at the repo root: does not satisfy FR-011's principle that Lab 3
  artifacts reside under `labs/lab-03-api-quality/`. The ruleset belongs to Lab 3 and
  would clutter the root for future labs.
- Using per-entity `backstage.io/spectral-ruleset-url` annotations: requires updating
  every API catalog descriptor and creates N copies of the same URL to maintain. A single
  app-config entry is cleaner and reinforces the "single shared ruleset" teaching point.

---

## R-002: api-grade Plugin Installation

**Decision**: Install `backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend`
from the GitHub source (`https://github.com/DawMatt/api-grade`) via local build + file:
protocol until the packages are published to npm. Verify npm availability before following
source build steps — if published, a simple `yarn add` is sufficient.

**Finding**: As of 2026-06-15, neither `backstage-plugin-api-grade` nor
`backstage-plugin-api-grade-backend` is published to the npm registry. Both are at
version 0.1.0 in the GitHub repo. The packages may be published by the time this lab is
followed.

**npm-first approach** (try this first):
```bash
# Check if published:
npm view backstage-plugin-api-grade version 2>/dev/null || echo "not on npm"

# If on npm:
yarn --cwd packages/app add backstage-plugin-api-grade
yarn --cwd packages/backend add backstage-plugin-api-grade-backend
```

**GitHub source fallback** (if not on npm):

The clone MUST be performed from the **repository root** (`backstage-apiportal-lab/`) so
that the api-grade directory lands beside the repo (i.e., as a sibling of `backstage-apiportal-lab/`).

**macOS / Linux (bash/zsh)**:
```bash
# From backstage-apiportal-lab/ (repo root):
git clone https://github.com/DawMatt/api-grade ../api-grade
cd ../api-grade
npm install   # api-grade uses npm internally; yarn install fails on this repo
npm run build

# Return to backstage instance:
cd -
cd labs/lab-01-base-backstage/backstage

# api-grade-core is not on npm; pre-install it from the local build before backstage-plugin-api-grade:
yarn --cwd packages/app add "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core"

# Install from local build — 6 levels up from packages/app to reach the sibling directory:
yarn --cwd packages/app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"
yarn --cwd packages/backend add "backstage-plugin-api-grade-backend@file:../../../../../../api-grade/packages/backstage-plugin-api-grade-backend"
```

**Windows (PowerShell)** — `cd -` is not available; use `Set-Location -` or navigate explicitly:
```powershell
# From backstage-apiportal-lab\ (repo root):
git clone https://github.com/DawMatt/api-grade ..\api-grade
Set-Location ..\api-grade
npm install        # yarn install equivalent
npm run build      # yarn build equivalent

# Return to backstage instance (PowerShell: use Push-Location / Pop-Location or an explicit path):
Set-Location ..\backstage-apiportal-lab\labs\lab-01-base-backstage\backstage

# Install from local build:
yarn --cwd packages\app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"
yarn --cwd packages\backend add "backstage-plugin-api-grade-backend@file:../../../../../../api-grade/packages/backstage-plugin-api-grade-backend"
```

**Path rationale** (why 6 levels, not 4):
`yarn --cwd packages/app` resolves `file:` paths relative to `packages/app`, not the shell
working directory. From `packages/app`, reaching the sibling `api-grade` directory requires
traversing: `packages/app` → `packages` → `backstage` → `lab-01-base-backstage` → `labs` →
`backstage-apiportal-lab` → parent directory → `api-grade` = **6 levels** (`../../../../../../`).
Using only 4 levels (`../../../../`) reaches `labs/` inside the repo — the error encountered
in Run 1 testing (`ENOENT: lstat 'labs/api-grade/...'`).

**If yarn install fails on Windows (peer dependency conflict)**:
The `@material-ui/core@4` package declares a peer dependency on `@types/react@"^16.8.6 || ^17.0.0"`,
which conflicts with the `@types/react@18.x` installed by Backstage 1.51.0. Yarn 4.x tolerates
this conflict silently; npm does not. If `npm install` is used instead and fails with `ERESOLVE`:
```powershell
# Add --legacy-peer-deps to bypass the peer dep conflict:
yarn --cwd packages\app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade" --legacy-peer-deps
```
Or if using npm directly from within packages/app:
```powershell
cd packages\app
npm install "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade" --legacy-peer-deps
cd ..\..
```
Note: `--legacy-peer-deps` instructs npm to ignore peer dependency version mismatches. It is
safe to use here because the conflict is a type declaration version mismatch, not a runtime
incompatibility — Backstage 1.51.0 uses React 18 and Material UI v4 together without issues.

**Backend compatibility**: `backstage-plugin-api-grade-backend` requires
`@backstage/backend-plugin-api ^0.6.0` and `@backstage/catalog-client ^1.0.0` — both
already installed in Backstage 1.51.0. It registers using `backend.add(import(...))` which
is consistent with the New Backend System already used in this project.

**Alternatives considered**:
- gitpkg.now.sh: adds a third-party service dependency that learners cannot control.
  Excluded per Constitution Principle V (zero-cost) and Principle IV (no undocumented
  external dependencies).
- Fork and publish: requires a GitHub or npm account with publish rights. Excluded.

---

## R-003: api-grade Frontend — New Declarative Frontend Compatibility

**Decision**: Wrap the `ApiGradeCard` component from `backstage-plugin-api-grade` in an
`EntityCardBlueprint.make()` extension, following the same pattern used in Lab 2 for the
`ApiVisibilityCard`. Add the resulting module to `App.tsx`'s `features` array.

**Rationale**: The Backstage instance from Lab 1 uses the new declarative frontend
(`createApp` from `@backstage/frontend-defaults`, no `EntityPage.tsx`). The api-grade
plugin documentation shows the old EntityPage.tsx integration pattern, which does not apply
to this instance. The Lab 2 solution confirmed that the `EntityCardBlueprint.make()` +
`createFrontendModule` pattern integrates third-party React card components into the new
frontend correctly.

**Implementation pattern**:
```typescript
// packages/app/src/modules/apiGrade/index.ts
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { ApiGradeCard } from 'backstage-plugin-api-grade';

const apiGradeCard = EntityCardBlueprint.make({
  name: 'api-grade',
  params: {
    filter: 'kind:API',
    type: 'info',   // places card in right-hand info column, below About + ApiVisibility
    loader: async () => React.createElement(ApiGradeCard),
  },
});

export const apiGradeModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [apiGradeCard],
});
```

```typescript
// packages/app/src/App.tsx — add apiGradeModule
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { apiVisibilityModule } from './modules/apiVisibility';
import { apiGradeModule } from './modules/apiGrade';

export default createApp({
  features: [catalogPlugin, navModule, apiVisibilityModule, apiGradeModule],
});
```

**ApiGradeCard native split display**: The card natively shows a summary (grade letter,
numeric percentage, quality label) to ALL authenticated users. The detailed view (Quality
Assessment, Recommendations, Diagnostics) is shown only to the API owner and to any groups
listed in `apiGrade.visibility.groups`. No custom permission logic is required in the
frontend code — the split is handled entirely by the card component and the backend response
filtering. This satisfies FR-006 natively (if the plugin supports split) and FR-007.

**Import sources**:

| Symbol | Package | Stability | Already installed |
|--------|---------|-----------|-------------------|
| `EntityCardBlueprint` | `@backstage/plugin-catalog-react/alpha` | Alpha | Yes (Lab 2) |
| `createFrontendModule` | `@backstage/frontend-plugin-api` | Stable | Yes (Lab 2) |
| `ApiGradeCard` | `backstage-plugin-api-grade` | — | New in Lab 3 |

---

## R-004: api-grade Backend Registration and On-Demand Grading

**Decision**: Register the backend plugin with a single `backend.add()` call. Grades are
computed on demand on every page load — no caching occurs.

**Important finding** (corrects Spec Clarification Q1): The api-grade plugin documentation
states: "No state is persisted — grades are computed on demand on every page load." There is
no backend cache. Every time a user visits an API entity page, the frontend card calls
`GET /api/api-grade/grade?entityRef=...`, the backend fetches the entity from the Catalog,
runs `GradeEngine.gradeContent()` via Spectral, and returns the result. For a local
development environment with a small number of API specs, this is acceptably fast. The
spec clarification Q1 ("cached by the backend") was incorrect — the actual plugin does
not cache.

**Practical impact**: FR-014's requirement to "trigger the initial grade computation" is
unnecessary (there is no cold-start state to trigger). Replace the intention of FR-014 with:
verify that a grade appears on first page load for both an OpenAPI and AsyncAPI spec. If the
grade is slow to appear, the lab README should advise waiting a few seconds and refreshing.

**Backend registration**:
```typescript
// packages/backend/src/index.ts — add one line
backend.add(import('backstage-plugin-api-grade-backend'));
```

The backend plugin self-registers under the `api-grade` plugin ID, wires to the Catalog
client and identity services via the New Backend System's dependency injection. No manual
router registration is needed.

**api-grade-core**: The backend plugin depends on `api-grade-core` which bundles
`@stoplight/spectral-core`, `@stoplight/spectral-rulesets`, `@stoplight/spectral-parsers`,
and `@stoplight/spectral-ruleset-bundler`. No additional Spectral packages need to be
installed in the Backstage backend.

**Spec.definition requirement**: The backend reads `spec.definition` from `ApiEntity`
catalog entries. Backstage's `$text` substitution (already in use from Lab 1) resolves the
spec URL and stores the inlined spec content in `spec.definition` during catalog ingestion.
This satisfies the plugin's requirement without any change to the catalog YAML format.

---

## R-005: api-grade Configuration — Visibility and Custom Ruleset

**Decision**: Configure `apiGrade` in `app-config.yaml` with the shared Spectral ruleset
URL and the platform team group reference.

**Configuration**:
```yaml
# app-config.yaml — add apiGrade section
apiGrade:
  ruleset:
    url: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
    # token: ${API_GRADE_RULESET_TOKEN}   # only needed if the repository is private
  visibility:
    allowAll: false       # only owners and platform-team see detailed view
    groups:
      - group:default/platform-team
```

**What this achieves**:
- All authenticated users see the grade letter, percentage, and quality label on every API
  entity page (summary view — no login or ownership required for this).
- API owners (members of the owning team) see the full Quality Assessment, Recommendations,
  and Diagnostics (detailed view).
- Members of `group:default/platform-team` also see the detailed view for ALL APIs,
  regardless of which team owns the API. This satisfies the platform-team requirement
  without any custom TypeScript code.
- The custom Spectral ruleset (OAS3 + AsyncAPI defaults) is used instead of the plugin's
  built-in ruleset, ensuring consistency with the Spectral linter plugin.

**No token needed for public repos**: The `token` field is only required if the repository
is private. This lab uses a public GitHub repository, so the token can be omitted. If a
learner has forked the repo as private, they would need to provide a GitHub PAT.

**Security note (Principle IX)**: If a token is provided, it should be stored in
`app-config.local.yaml` (gitignored) or an environment variable, never in committed config.

---

## R-006: Spectral Linter Plugin Installation and Configuration

**Decision**: Install `@dweber019/backstage-plugin-api-docs-spectral-linter@0.5.2` from npm
and configure it with the shared Spectral ruleset URL for both OpenAPI and AsyncAPI specs.

**Rationale**: Unlike the api-grade plugins, this package IS published to npm (v0.5.2) and
is immediately installable without any source build. It is peer-compatible with React 18
and react-router-dom 6, both already present in this Backstage instance.

**Installation**:
```bash
yarn --cwd packages/app add @dweber019/backstage-plugin-api-docs-spectral-linter
```

**App-config configuration**:
```yaml
# app-config.yaml — add spectralLinter section
spectralLinter:
  openApiRulesetUrl: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
  asyncApiRulesetUrl: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
```

Both keys point to the same shared ruleset file. Spectral detects the spec format (OpenAPI
vs AsyncAPI) during linting and applies the appropriate rules from the ruleset.

---

## R-007: Spectral Linter Frontend — New Declarative Frontend + Permission Gating

**Decision**: Wrap `EntityApiDocsSpectralLinterContent` in an `EntityContentBlueprint`
extension. Add permission gating inside the component using `useEntityOwnership` for
ownership checks and `identityApiRef` for platform team membership checks. Non-owners who
are not in the platform team see a brief "access restricted" message.

**Rationale**: The Spectral linter plugin does not natively support permission-based
visibility gating (unlike the api-grade plugin which handles this via backend response
filtering). The plugin also predates the new Backstage declarative frontend and does not
export a blueprint extension. We must wrap it manually.

The `EntityContentBlueprint` `filter` attribute supports entity-based predicates but does
not have access to the requesting user's identity, so the tab itself cannot be hidden via
the filter. Instead, the tab appears for all users on API entity pages, but the CONTENT
is gated: owners and platform team members see the Spectral lint results; others see a
brief note explaining that quality details are restricted. This is more educational than
a blank tab and teaches the conditional-rendering pattern.

**Implementation pattern**:

```typescript
// packages/app/src/modules/spectralLinter/SpectralLinterContent.tsx
import React, { useEffect, useState } from 'react';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { useEntityOwnership } from '@backstage/plugin-catalog-react';
import { EntityApiDocsSpectralLinterContent } from '@dweber019/backstage-plugin-api-docs-spectral-linter';
import { InfoCard } from '@backstage/core-components';
import { Typography } from '@material-ui/core';

export function SpectralLinterContent() {
  const identityApi = useApi(identityApiRef);
  const { isOwnedEntity, loading: ownershipLoading } = useEntityOwnership();
  const [isPlatformTeamMember, setIsPlatformTeamMember] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(true);

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setIsPlatformTeamMember(
        identity.ownershipEntityRefs.includes('group:default/platform-team'),
      );
      setIdentityLoading(false);
    });
  }, [identityApi]);

  if (ownershipLoading || identityLoading) return null;

  if (!isOwnedEntity && !isPlatformTeamMember) {
    return (
      <InfoCard title="Spectral Linter">
        <Typography variant="body2" color="textSecondary">
          Detailed quality information is restricted to members of the API's owning team
          and the platform team. Sign in as a member of the owning team or the platform
          team to view linting results.
        </Typography>
      </InfoCard>
    );
  }

  return <EntityApiDocsSpectralLinterContent />;
}
```

```typescript
// packages/app/src/modules/spectralLinter/index.ts
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { SpectralLinterContent } from './SpectralLinterContent';

const spectralLinterContent = EntityContentBlueprint.make({
  name: 'spectral-linter',
  params: {
    defaultPath: '/spectral',
    defaultTitle: 'Spectral',
    filter: 'kind:API',
    loader: async () => React.createElement(SpectralLinterContent),
  },
});

export const spectralLinterModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [spectralLinterContent],
});
```

**Import sources**:

| Symbol | Package | Stability | Already installed |
|--------|---------|-----------|-------------------|
| `identityApiRef`, `useApi` | `@backstage/core-plugin-api` | Stable | Yes |
| `useEntityOwnership` | `@backstage/plugin-catalog-react` | Stable | Yes |
| `EntityContentBlueprint` | `@backstage/plugin-catalog-react/alpha` | Alpha | Yes (Lab 2) |
| `createFrontendModule` | `@backstage/frontend-plugin-api` | Stable | Yes (Lab 2) |
| `InfoCard` | `@backstage/core-components` | Stable | Yes |
| `Typography` | `@material-ui/core` | Stable | Yes |
| `EntityApiDocsSpectralLinterContent` | `@dweber019/backstage-plugin-api-docs-spectral-linter` | — | New in Lab 3 |

**Platform team check via ownershipEntityRefs**: `identityApi.getBackstageIdentity()` returns
the user's `ownershipEntityRefs` which includes the user's own ref AND all their group refs.
For a user `eve` who is a member of `group:default/platform-team`, the refs include
`group:default/platform-team`. The `.includes()` check is a direct string match against the
fully-qualified group entity ref. This is the same mechanism that the Lab 2 permission policy
uses (it calls `user?.info.ownershipEntityRefs`) — consistent approach throughout the lab.

**Verify during implementation**: Confirm that `EntityContentBlueprint` is available from
`@backstage/plugin-catalog-react/alpha` in Backstage 1.51.0 and that `defaultPath` and
`defaultTitle` are the correct param names for the installed version.

---

## R-008: Platform Team — Adding Members for Lab 3

**Decision**: Add a new user `eve` (the "Backstage Platform Engineer") to
`group:default/platform-team`. Update `labs/lab-02-users-roles/catalog/teams.yaml` to add
`eve` to the platform-team's `members` list. Add `eve`'s User entity descriptor in
`labs/lab-03-api-quality/catalog/platform-user.yaml`.

**Rationale**: The platform-team group exists from Lab 2 but has no members — it was used
only to provide a `spec.owner` for the shared API. In Lab 3, a platform team MEMBER is
needed to demonstrate that platform team access to quality details works. Adding `eve` is
the minimal change that enables the verification scenario.

**Why update Lab 2's teams.yaml**: Backstage identifies Group entities by kind+namespace+name.
There can only be one authoritative source for `group:default/platform-team`'s member list.
Since the group entity is defined in Lab 2, updating its `members` list in Lab 2's
`teams.yaml` is the correct change — adding a second Group definition in Lab 3 would cause
a duplicate entity error in the catalog.

**Eve's User entity** (new file: `labs/lab-03-api-quality/catalog/platform-user.yaml`):
```yaml
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: eve
  namespace: default
spec:
  profile:
    displayName: Eve Rodriguez
    email: eve@example.com       # fictional example value
  memberOf:
    - platform-team
```

**Updated teams.yaml** (modify `labs/lab-02-users-roles/catalog/teams.yaml`):
```yaml
# group:default/platform-team — add eve to members
spec:
  members:
    - eve                        # new in Lab 3 — platform team member
```

**app-config.local.yaml switch** (to sign in as eve):
```yaml
auth:
  providers:
    guest:
      userEntityRef: user:default/eve
```

**Catalog location**: The platform-user.yaml file must be registered in `app-config.yaml`
as a new catalog location entry (type: url, target: GitHub raw URL).

**Alternatives considered**:
- Making an existing user (e.g., alice) a member of platform-team: confuses the visibility
  demo because alice is already an API owner for museum-api. The two roles (API owner vs.
  platform team member) become entangled, making it harder to verify each permission
  independently.
- Creating a dedicated "platform-admin" team: unnecessary complexity. The spec calls for
  extending `platform-team` with members, not creating a new group.

---

## R-009: Catalog Location for Lab 3

**Decision**: Add catalog location entries to `app-config.yaml` for `platform-user.yaml`.
The Spectral ruleset file is NOT registered as a catalog entity — it is a config file, not
a Backstage entity.

**Config to add** (student's Backstage instance `app-config.yaml`):
```yaml
catalog:
  locations:
    # --- Lab 3: Platform team member ---
    - type: url
      target: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/catalog/platform-user.yaml
      rules:
        - allow: [User]
```

The `teams.yaml` entry from Lab 2 already registers the platform-team Group entity. Since
we're only updating the `members` list in the existing `teams.yaml` file (not adding a
new file), no new catalog location is needed for the team.
