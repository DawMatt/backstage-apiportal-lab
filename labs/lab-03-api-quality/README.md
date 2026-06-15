# Lab 3 — API Quality

## Overview

This lab adds API quality tooling to the running Backstage instance from Labs 1 and 2. You
will integrate two quality plugins and a shared Spectral ruleset that together give every API
entity page a quality grade and an inline lint results tab.

By the end of this lab you will have:

- A `.spectral.yaml` ruleset committed to the repository, referenced by both quality plugins
  via its GitHub raw URL — one file, consistent results across both tools.
- The `backstage-plugin-api-grade` frontend card and `backstage-plugin-api-grade-backend`
  installed and configured. Every API entity page shows a grade card (letter, percentage,
  quality label) in the Info column. Owners and platform team members also see the full
  Quality Assessment, Recommendations, and Diagnostics breakdown.
- The `@dweber019/backstage-plugin-api-docs-spectral-linter` installed and wrapped in a
  custom permission-gated component. A "Spectral" tab appears on every API entity page.
  Owners and platform team members see the inline lint results; other users see an
  access-restricted message.
- A new user `eve` (platform team member) added to the catalog. Eve can see detailed quality
  information for all three APIs regardless of which team owns them.

**What you will learn:**

- How to wrap a third-party React card in `EntityCardBlueprint` for the new declarative frontend
- How to add a permission-gated content tab using `EntityContentBlueprint`
- How to check runtime user identity in a frontend component using `identityApiRef`
- Why a single shared Spectral ruleset produces consistent results across multiple quality tools
- How Backstage's New Backend System plugin registration works (`backend.add()`)

---

## Prerequisites

- **Lab 2 completed** — Backstage running locally with Museum API, Streetlights API, and
  Train Travel API registered; user/group visibility working; Alice and Charlie sign-in verified
- **Node.js 20 LTS** — same version as Labs 1 and 2
- **Yarn** — same version as Labs 1 and 2
- **Git** — needed to clone the api-grade repository if not yet published to npm

---

## Security Note

> ⚠️ **Lab only** — The identity-switching technique used in this lab (`userEntityRef` in
> `app-config.local.yaml`) is a development-only shortcut. It lets you simulate different
> users without a real identity provider, which makes the lab easier to follow.
>
> In production, use a real identity provider:
> - **OIDC** (Google, Okta, Azure AD) — for external or federated identity
> - **SAML** — for enterprise SSO
> - **LDAP/Active Directory** — for internal corporate identity
>
> The `userEntityRef` values used in this lab (`alice`, `charlie`, `eve`) are fictional
> example values. Never use real credentials in configuration files committed to a repository.

---

## Step 1 — Commit the Shared Spectral Ruleset

**Why a single shared ruleset?** Both the api-grade backend and the Spectral linter frontend
fetch a Spectral ruleset from a URL at runtime. If each plugin used a different file or URL,
a rule change would have to be made in two places — and the grade card and lint tab could
show different results for the same API. A single committed `.spectral.yaml` is the single
source of truth (FR-013): one change propagates to both plugins automatically.

The ruleset file is already committed at `labs/lab-03-api-quality/.spectral.yaml`:

```yaml
extends:
  - spectral:oas
  - spectral:asyncapi
# Fallback if spectral: aliases don't resolve in a browser context:
# extends:
#   - https://unpkg.com/@stoplight/spectral-openapi@1/ruleset.js
#   - https://unpkg.com/@stoplight/spectral-asyncapi@1/ruleset.js
```

`spectral:oas` activates the standard OAS3 recommended rules. `spectral:asyncapi` activates
the standard AsyncAPI recommended rules. Spectral detects the spec format automatically — you
do not need separate ruleset files for OpenAPI and AsyncAPI specs.

**GitHub raw URL** — both plugins reference this file via its raw URL. Replace `<user>` and
`<branch>` with your GitHub username and the current branch name (e.g., `003-api-quality`):

```
https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
```

You can verify the URL is reachable by pasting it into a browser — it should return the YAML
content of the ruleset.

---

## Step 2a — Install the api-grade Frontend Plugin

The `backstage-plugin-api-grade` package may or may not be published to npm by the time you
follow this lab. Check first:

```bash
# macOS / Linux
npm view backstage-plugin-api-grade version 2>/dev/null || echo "not on npm"
```

```powershell
# Windows (PowerShell)
npm view backstage-plugin-api-grade version 2>$null; if ($LASTEXITCODE -ne 0) { Write-Host "not on npm" }
```

**If published to npm**, install directly:

```bash
yarn --cwd packages/app add backstage-plugin-api-grade
```

**If not yet on npm**, build from GitHub source.

> **Directory note**: The clone command below uses `../api-grade`, which places the
> `api-grade` directory *beside* `backstage-apiportal-lab` (as a sibling). Run the clone
> from the **repository root** (`backstage-apiportal-lab/`), not from inside the Backstage
> instance directory.

**macOS / Linux**:

```bash
# From backstage-apiportal-lab/ (repository root):
git clone https://github.com/DawMatt/api-grade ../api-grade
cd ../api-grade
npm install   # api-grade uses npm as its package manager — use npm, not yarn
npm run build
cd -   # returns to backstage-apiportal-lab/

# Move into the Backstage instance:
cd labs/lab-01-base-backstage/backstage

# api-grade-core is a dependency of backstage-plugin-api-grade that is not published to npm.
# Install it from the local build first so yarn can resolve it:
yarn --cwd packages/app add "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core"

# Now install the frontend plugin:
yarn --cwd packages/app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"
```

**Windows (PowerShell)**:

```powershell
# From backstage-apiportal-lab\ (repository root):
git clone https://github.com/DawMatt/api-grade ..\api-grade
Set-Location ..\api-grade    # cd - is not available in PowerShell; use Set-Location
npm install                  # api-grade uses npm as its package manager
npm run build

# Return to the Backstage instance (adjust the path to your repo location):
Set-Location ..\backstage-apiportal-lab\labs\lab-01-base-backstage\backstage

# api-grade-core is a dependency of backstage-plugin-api-grade that is not published to npm.
# Install it from the local build first so yarn can resolve it:
yarn --cwd packages\app add "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core"

# Now install the frontend plugin:
yarn --cwd packages\app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"
```

**Why 6 levels?** `yarn --cwd packages/app` resolves `file:` paths relative to the
`packages/app` directory, not the shell working directory. Counting up from `packages/app`:
`packages` → `backstage` → `lab-01-base-backstage` → `labs` → `backstage-apiportal-lab` →
parent directory → `api-grade`. That is six `../` steps. Using only four steps reaches `labs/`
inside the repo (not the sibling directory), which produces a `no such file or directory` error.

> **Windows path note**: The `file:` protocol path always uses forward slashes (`/`), even
> on Windows. Do not replace the slashes with backslashes in the `file:` argument — yarn
> requires forward slashes here regardless of platform.

**Verify the path before installing** (optional but recommended): Confirm the cloned
repository is reachable at the expected path before running `yarn add`:

```bash
# macOS / Linux — from the Backstage instance directory (labs/lab-01-base-backstage/backstage/):
ls ../../../../../../api-grade/packages/
```

```powershell
# Windows (PowerShell) — from the Backstage instance directory:
Get-ChildItem ..\..\..\..\..\..\api-grade\packages\
```

You should see `api-grade-core`, `backstage-plugin-api-grade`, and
`backstage-plugin-api-grade-backend` listed. If you see an error, the clone did not land
in the expected sibling location — re-run the clone from the repository root
(`backstage-apiportal-lab/`).

**Which package manager to use at each stage:**

| Stage | Command | Why |
|-------|---------|-----|
| Build the api-grade repo | `npm install` / `npm run build` | api-grade uses npm internally; `yarn install` fails on this repo |
| Install into Backstage (packages/app, packages/backend) | `yarn --cwd ...` | Yarn 4.x silently ignores the `@material-ui/core@4` / `@types/react@18` peer dependency mismatch; npm raises an ERESOLVE error for the same conflict |

**If npm raises an ERESOLVE peer dependency error**: If you prefer npm or cannot use yarn
for the Backstage install step, add `--legacy-peer-deps`. This flag tells npm to ignore peer
dependency version mismatches — it applies only to this one install command, not to your
global npm config:

```bash
# macOS / Linux (from the Backstage instance directory):
cd packages/app
npm install "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core" --legacy-peer-deps
npm install "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade" --legacy-peer-deps
cd ../..
```

```powershell
# Windows (PowerShell):
Set-Location packages\app
npm install "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core" --legacy-peer-deps
npm install "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade" --legacy-peer-deps
Set-Location ..\..
```

The flag is safe here: the conflict is a type declaration version mismatch only — Backstage
runs React 18 and Material UI v4 together in production without issues. Note that when using
`npm install` from inside `packages/app`, the `file:` path is still six levels up (same as
`yarn --cwd packages/app`) because both resolve relative to the `packages/app` directory.

---

## Step 2b — Install the api-grade Backend Plugin

The backend package lives in the same GitHub repository as the frontend. If npm shows the
frontend as published, the backend will be too.

**If published to npm**:

```bash
yarn --cwd packages/backend add backstage-plugin-api-grade-backend
```

**If building from GitHub source** (using the cloned and built repo from Step 2a):

```bash
# macOS / Linux — same 6-level path as the frontend install:
yarn --cwd packages/backend add "backstage-plugin-api-grade-backend@file:../../../../../../api-grade/packages/backstage-plugin-api-grade-backend"
```

```powershell
# Windows (PowerShell) — use forward slashes in the file: path even on Windows:
yarn --cwd packages\backend add "backstage-plugin-api-grade-backend@file:../../../../../../api-grade/packages/backstage-plugin-api-grade-backend"
```

**If npm raises an ERESOLVE error** (same peer dependency conflict as Step 2a — apply
`--legacy-peer-deps` as a command-line flag, not a global config change):

```bash
# macOS / Linux:
cd packages/backend
npm install "backstage-plugin-api-grade-backend@file:../../../../../../api-grade/packages/backstage-plugin-api-grade-backend" --legacy-peer-deps
cd ../..
```

```powershell
# Windows (PowerShell):
Set-Location packages\backend
npm install "backstage-plugin-api-grade-backend@file:../../../../../../api-grade/packages/backstage-plugin-api-grade-backend" --legacy-peer-deps
Set-Location ..\..
```

The backend plugin depends on `api-grade-core`, which bundles the Spectral packages
(`@stoplight/spectral-core`, `@stoplight/spectral-rulesets`, etc.). You do NOT need to
install additional Spectral packages in your Backstage backend, and you do NOT need to
pre-install `api-grade-core` separately for the backend (unlike Step 2a, the backend plugin
package resolves it differently).

---

## Step 3 — Create the apiGrade Frontend Module

**Why `EntityCardBlueprint`?** The Backstage instance from Lab 1 uses the new declarative
frontend (`createApp` from `@backstage/frontend-defaults`). It does not have an
`EntityPage.tsx` file — the old plugin integration pattern shown in the api-grade
documentation does not apply here. Instead, you wrap the `ApiGradeCard` component in an
`EntityCardBlueprint` extension, exactly as Lab 2 wrapped `ApiVisibilityCard`.

**Why `type: 'info'`?** The `type` parameter controls which column the card appears in. The
value `'info'` places the card in the right-hand Info column (the same column as the About
card). Without it, the card defaults to the main content area at the bottom of the page —
far less visible.

Create the file `packages/app/src/modules/apiGrade/index.ts`:

```typescript
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { ApiGradeCard } from 'backstage-plugin-api-grade';

const apiGradeCard = EntityCardBlueprint.make({
  name: 'api-grade',
  params: {
    filter: 'kind:API',
    type: 'info',
    loader: async () => React.createElement(ApiGradeCard),
  },
});

export const apiGradeModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [apiGradeCard],
});
```

`filter: 'kind:API'` ensures the card only appears on API entity pages — not on Component,
System, or other entity pages.

---

## Step 4 — Register the apiGrade Module in App.tsx

Open `packages/app/src/App.tsx` and add the import and the module to the `features` array:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { apiVisibilityModule } from './modules/apiVisibility';
import { apiGradeModule } from './modules/apiGrade';   // ← add this import

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    apiVisibilityModule,
    apiGradeModule,   // ← add this entry
  ],
});
```

The exact imports in your `App.tsx` will depend on what was added in Labs 1 and 2 — add the
new import and array entry without removing the existing ones.

---

## Step 5 — Register the api-grade Backend Plugin

**Why `backend.add()`?** The Backstage New Backend System uses dependency injection. A plugin
registers itself and declares its dependencies; the backend wires them up automatically. No
manual router registration is required.

**Why grades are computed on demand:** The api-grade plugin does not cache grades. Every time
a user opens an API entity page, the frontend card calls
`GET /api/api-grade/grade?entityRef=...`, the backend fetches the entity from the Catalog,
runs the Spectral ruleset against `spec.definition`, and returns the result fresh. For a
local development environment with a small number of APIs, this is fast enough that no
warm-up step is needed — the grade appears within a few seconds of the page loading.

Open `packages/backend/src/index.ts` and add one line after the existing `backend.add()`
calls:

```typescript
backend.add(import('backstage-plugin-api-grade-backend'));
```

---

## Step 6 — Configure apiGrade in app-config.yaml

Add the following section to `app-config.yaml` in your Backstage instance
(`labs/lab-01-base-backstage/backstage/app-config.yaml`):

```yaml
apiGrade:
  ruleset:
    url: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
    # token: ${API_GRADE_RULESET_TOKEN}   # only needed if your repository is private
  visibility:
    allowAll: false       # all authenticated users see the grade summary; only owners and
                          # the configured groups see the detailed breakdown
    groups:
      - group:default/platform-team
```

Replace `<user>` and `<branch>` with your GitHub username and branch name.

**What each setting does:**

- `ruleset.url` — the Spectral ruleset the backend uses when grading APIs. Points to the
  shared `.spectral.yaml` committed in Step 1.
- `visibility.allowAll: false` — the default, but stated explicitly so the intent is clear.
  With this set to `false`, all authenticated users see the grade summary (letter, percentage,
  quality label), but only the API's owning team and the groups listed below see the detailed
  breakdown.
- `visibility.groups: [group:default/platform-team]` — grants the platform team detailed
  visibility across ALL APIs, regardless of ownership. This is what allows Eve (a platform
  team member) to see detailed quality information for APIs she does not own.

---

## Step 7 — Install the Spectral Linter Plugin

Unlike the api-grade plugins, `@dweber019/backstage-plugin-api-docs-spectral-linter` IS
published to npm and can be installed directly:

```bash
yarn --cwd packages/app add @dweber019/backstage-plugin-api-docs-spectral-linter
```

No source build is required. The package is compatible with React 18 and react-router-dom 6,
both already present in this Backstage instance.

---

## Step 8 — Create the SpectralLinterContent Wrapper Component

**Why a wrapper component?** The `@dweber019/backstage-plugin-api-docs-spectral-linter`
plugin does not natively support permission-based content gating. The Spectral lint results
should be visible only to the API's owning team and platform team members — but the plugin
renders results for any user who reaches the tab.

**Why not hide the tab entirely using the `EntityContentBlueprint` `filter` attribute?** The
`filter` attribute in `EntityContentBlueprint` evaluates entity-based predicates (e.g., `kind:API`),
but it does not have access to the requesting user's identity. It cannot know whether the
current user is an owner or a platform team member. The tab itself must appear for all users;
only the content inside it is conditionally shown.

This approach — showing an access-restricted message rather than a blank tab — is more
educational: it makes the permission boundary visible and explains why the content is
restricted.

Create the file `packages/app/src/modules/spectralLinter/SpectralLinterContent.tsx`:

```typescript
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

**How the platform team check works:** `identityApi.getBackstageIdentity()` returns the
current user's `ownershipEntityRefs` — a list that includes the user's own entity ref AND
all their group refs. For a user who is a member of `group:default/platform-team`, the list
includes `'group:default/platform-team'`. The `.includes()` check is a direct string match
against the fully-qualified group entity ref. This is the same mechanism used by the Lab 2
permission policy.

---

## Step 9 — Create the spectralLinter Frontend Module

Create the file `packages/app/src/modules/spectralLinter/index.ts`:

```typescript
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

`defaultPath: '/spectral'` and `defaultTitle: 'Spectral'` define the tab's URL path and
display label. `filter: 'kind:API'` ensures the tab appears only on API entity pages.

---

## Step 10 — Register the spectralLinter Module in App.tsx

Open `packages/app/src/App.tsx` again and add the spectralLinter import and module (alongside
the apiGradeModule you added in Step 4):

```typescript
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { apiVisibilityModule } from './modules/apiVisibility';
import { apiGradeModule } from './modules/apiGrade';
import { spectralLinterModule } from './modules/spectralLinter';   // ← add this import

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    apiVisibilityModule,
    apiGradeModule,
    spectralLinterModule,   // ← add this entry
  ],
});
```

---

## Step 11 — Configure spectralLinter in app-config.yaml

Add the following section to `app-config.yaml` (in addition to the `apiGrade` section from
Step 6):

```yaml
spectralLinter:
  openApiRulesetUrl: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
  asyncApiRulesetUrl: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/.spectral.yaml
```

Both keys point to the same shared ruleset file committed in Step 1.

**Why the same URL for both?** The ruleset extends both `spectral:oas` and `spectral:asyncapi`.
When the Spectral linter plugin fetches the ruleset and lints an API spec, it detects the
spec format automatically and applies only the relevant rules — OAS3 rules for OpenAPI specs,
AsyncAPI rules for AsyncAPI specs. You do not need separate ruleset files for each format.
One URL, two consumers, format-appropriate linting.

---

## Step 12 — Register the Platform Team Member in the Catalog

Eve's User entity is already committed at `labs/lab-03-api-quality/catalog/platform-user.yaml`.
You need to register it in `app-config.yaml` so Backstage ingests it during catalog refresh.

**Why update `teams.yaml` in Lab 2 rather than creating a new Group file?** Backstage
identifies Group entities by kind+namespace+name. There can only be one authoritative source
for `group:default/platform-team`'s member list. Since the group entity is defined in Lab 2's
`teams.yaml`, adding Eve to that file's `members` list is the correct approach. Creating a
second `platform-team` Group descriptor in Lab 3 would produce a duplicate entity error in
the catalog.

The Lab 2 file at `labs/lab-02-users-roles/catalog/teams.yaml` has already been updated to
add `eve` to `platform-team`'s members list. Backstage will pick this up on the next catalog
refresh.

Add the following catalog location to `app-config.yaml`:

```yaml
catalog:
  locations:
    # --- Lab 3: Platform team member ---
    - type: url
      target: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-03-api-quality/catalog/platform-user.yaml
      rules:
        - allow: [User]
```

Replace `<user>` and `<branch>` with your GitHub username and branch name.

> **Important**: The `platform-user.yaml` file must be reachable at its registered URL before
> you start Backstage. Push the branch to GitHub first, then update `app-config.yaml` with
> the correct URL, then start Backstage.

---

## Step 13 — Switch Identities Using app-config.local.yaml

> ⚠️ **Lab only** — See the Security Note at the top of this README.

The `app-config.local.yaml` file (gitignored) controls which user the guest auth provider
resolves to. Edit it to switch between users for testing:

**Sign in as Alice** (museum-team member — sees Museum API quality details):

```yaml
auth:
  providers:
    guest:
      userEntityRef: user:default/alice
```

**Sign in as Charlie** (streetlights-team member — sees Streetlights API quality details
but not Museum API details):

```yaml
auth:
  providers:
    guest:
      userEntityRef: user:default/charlie
```

**Sign in as Eve** (platform-team member — sees detailed quality information for all three
APIs regardless of ownership):

```yaml
auth:
  providers:
    guest:
      userEntityRef: user:default/eve
```

After editing `app-config.local.yaml`, restart Backstage (`yarn start` in
`labs/lab-01-base-backstage/backstage/`), wait for the catalog to refresh, then click
**Sign In** → **Enter as Guest** to sign in as the configured user.

| User | Team | Grade summary (all APIs) | Grade detail + Spectral lint |
|------|------|--------------------------|------------------------------|
| Alice | museum-team | All 3 APIs | museum-api only |
| Bob | museum-team | All 3 APIs | museum-api only |
| Charlie | streetlights-team | All 3 APIs | streetlights-api only |
| Diana | streetlights-team | All 3 APIs | streetlights-api only |
| Eve | platform-team | All 3 APIs | All 3 APIs |

---

## Verification

Run through these steps after completing the lab to confirm everything is working correctly.

### Step 1 — Platform Team Member in the Catalog

1. Start Backstage: `yarn start` in `labs/lab-01-base-backstage/backstage/`
2. Open `http://localhost:3000`
3. Navigate to **Catalog** → filter by **Kind: User**
4. Verify `eve` appears alongside the four users from Lab 2
5. Click `eve` → verify group membership shows `platform-team`
6. Navigate to **Catalog** → filter by **Kind: Group**
7. Click `platform-team` → verify `eve` is listed as a member

**Pass**: Eve appears in the catalog and is listed as a member of platform-team  
**Fail**: Check that `platform-user.yaml` is accessible at its registered URL; verify the
catalog location entry is in `app-config.yaml` with `allow: [User]`; check that
`labs/lab-02-users-roles/catalog/teams.yaml` has `eve` in platform-team's `members` list

---

### Step 2 — API Grade Card Visible for All Users

1. Navigate to **Catalog** → filter by **Kind: API**
2. Click the **Museum API** entry
3. Verify the **API Grade** card appears in the right-hand Info column, below the About
   card and the API Visibility card
4. Verify the card shows a grade letter (A–F), a numeric percentage, and a quality label
5. Repeat for the **Streetlights API** and **Train Travel API**

**Pass**: Grade card visible in the Info column for all API entity pages  
**Fail (card missing)**: Check that `apiGradeModule` is in the `features` array in `App.tsx`;
verify the module file exists and is imported correctly; check browser console for errors  
**Fail (grade shows error/blank)**: Check that `backstage-plugin-api-grade-backend` is
registered in `packages/backend/src/index.ts`; check backend logs for Spectral errors;
verify `apiGrade.ruleset.url` is reachable in a browser

---

### Step 3 — API Grade Detail Visible to API Owner

1. Set `app-config.local.yaml` to sign in as Alice (`user:default/alice`)
2. Restart Backstage → click **Sign In** → **Enter as Guest**
3. Navigate to the **Museum API** entity page
4. Verify the **API Grade** card shows Quality Assessment, Recommendations, and Diagnostics
5. Navigate to the **Spectral** tab → verify OAS3 lint results are visible

**Pass**: Alice sees both the grade detail and Spectral lint results for the Museum API  
**Fail (Spectral tab shows access-restricted to Alice)**: Verify `useEntityOwnership` is
returning `isOwnedEntity: true` for Alice; check browser console for identity API errors

---

### Step 4 — Grade Detail and Spectral Lint Restricted for Non-Owner

1. Set `app-config.local.yaml` to sign in as Charlie (`user:default/charlie`)
2. Restart Backstage → navigate to the **Museum API** entity page
3. Verify the **API Grade** card shows the grade summary ONLY — no Quality Assessment,
   Recommendations, or Diagnostics
4. Navigate to the **Spectral** tab → verify an access-restricted message appears

**Pass**: Charlie sees the grade summary but not the detailed quality information  
**Fail (Charlie sees full detail)**: Check `visibility.allowAll: false` in `app-config.yaml`;
verify Charlie is not a member of platform-team

---

### Step 5 — Platform Team Sees Detail on All APIs

1. Set `app-config.local.yaml` to sign in as Eve (`user:default/eve`)
2. Restart Backstage → navigate to the **Museum API** entity page (owned by museum-team)
3. Verify the **API Grade** card shows the full detailed view
4. Navigate to the **Spectral** tab → verify lint results are visible (not access-restricted)
5. Repeat for the **Streetlights API** and **Train Travel API**

**Pass**: Eve sees detailed quality information for all three APIs  
**Fail (Eve sees summary only for Museum/Streetlights)**: Verify `apiGrade.visibility.groups`
contains `group:default/platform-team`; confirm Eve's catalog entry has `memberOf: [platform-team]`

---

### Step 6 — Spectral Ruleset Consistency (Optional)

1. Sign in as Alice, navigate to the **Museum API** entity page
2. Note the Diagnostics count in the api-grade card
3. Click the **Spectral** tab → verify the rule violations match those in the Diagnostics

**Pass**: Both tools report the same rule violations for the Museum API  
**Fail**: Verify `apiGrade.ruleset.url` and `spectralLinter.openApiRulesetUrl` point to the
same URL in `app-config.yaml`

---

### Step 7 — AsyncAPI Quality Check

1. Sign in as Eve, navigate to the **Streetlights API** entity page
2. Verify the **API Grade** card shows a grade for the AsyncAPI specification
3. Navigate to the **Spectral** tab → verify AsyncAPI lint results are visible
4. Confirm OAS3 rules do NOT appear in the results (only AsyncAPI rules apply)

**Pass**: AsyncAPI spec receives a quality grade and async-specific lint results  
**Fail (no grade for Streetlights API)**: Check that `spec.type: asyncapi` is set in the
Streetlights API catalog descriptor

---

## Troubleshooting

### Spectral ruleset URL not found

**Symptom**: The api-grade card or Spectral linter tab shows an error mentioning a failed
URL fetch.

**Cause**: The `app-config.yaml` URL for the ruleset points to a branch or path that does
not exist on GitHub, or the branch has not been pushed yet.

**Fix**: Paste the URL from `apiGrade.ruleset.url` or `spectralLinter.openApiRulesetUrl`
into a browser. It should return the raw YAML content of `.spectral.yaml`. If you get a 404,
check that the branch is pushed and that the file path is correct (it is a hidden file
starting with `.`).

---

### api-grade plugin fails to install from npm

**Symptom**: `yarn add backstage-plugin-api-grade` fails or installs an incorrect version.

**Cause**: The package may not yet be published to npm, or a published version may not be
compatible with Backstage 1.51.0.

**Fix**: Follow the GitHub source build fallback in Steps 2a and 2b.

---

### Source build install fails — `no such file or directory` or `Package not found`

**Symptom A**: `yarn add "backstage-plugin-api-grade@file:..."` fails with `ENOENT: no such
file or directory` or `lstat '...'` pointing to an unexpected location (e.g.,
`labs/api-grade/...` instead of a sibling directory).

**Cause**: The `file:` path is wrong. The `api-grade` repository must be cloned as a *sibling*
of `backstage-apiportal-lab` (i.e., `../api-grade` from the repo root), and the install
command must be run from the Backstage instance directory
(`labs/lab-01-base-backstage/backstage`). Cloning from inside the Backstage directory, or
using the wrong number of `../` steps, produces this error.

**Fix**: Verify the clone location first:
```bash
ls ../../../../../../api-grade/packages/   # macOS/Linux from Backstage instance dir
```
If this fails, re-clone from `backstage-apiportal-lab/` with `git clone https://github.com/DawMatt/api-grade ../api-grade`.

**Symptom B**: `yarn add "backstage-plugin-api-grade@file:..."` fails with
`api-grade-core@npm:* Package not found` (yarn tries to resolve `api-grade-core` from the
npm registry and fails because it is not published).

**Cause**: `api-grade-core` is a workspace dependency of `backstage-plugin-api-grade` that
is not published to npm. Yarn must see a local file: reference for it before it can resolve
the main plugin package.

**Fix**: Install `api-grade-core` from the local build first, then install the plugin:
```bash
yarn --cwd packages/app add "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core"
yarn --cwd packages/app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"
```

---

### npm raises ERESOLVE peer dependency error during source build install

**Symptom**: `npm install "backstage-plugin-api-grade@file:..."` fails with an ERESOLVE
error referencing `@material-ui/core@4.12.4` and `@types/react`.

**Cause**: `@material-ui/core@4` declares a peer dependency on `@types/react@"^16 || ^17"`,
but Backstage 1.51.0 installs `@types/react@18`. npm raises this as an error; yarn 4.x
silently ignores the mismatch (which is safe — it is a type declaration version conflict, not
a runtime incompatibility).

**Fix (preferred)**: Use `yarn --cwd packages/app add "file:..."` instead of npm — yarn
tolerates this conflict without any flags.

**Fix (if npm required)**: Add `--legacy-peer-deps` as a one-time command-line flag:
```bash
npm install "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade" --legacy-peer-deps
```
This flag applies only to this single install command and does not change your global npm
configuration.

---

### Grade card appears but shows only the summary — expected detail is missing

**Symptom**: Signed in as Alice, but the Museum API grade card shows only the letter and
percentage — no Quality Assessment, Recommendations, or Diagnostics.

**Possible causes**:
- `visibility.allowAll: true` is set (overrides ownership checks and shows summary to everyone)
- The `visibility.groups` list contains a typo (e.g., `group:default/platform_team` instead
  of `group:default/platform-team`)
- The backend is not correctly resolving Alice's `ownershipEntityRefs` — check backend logs

---

### Spectral tab shows access-restricted message to Alice or Eve

**Symptom**: Alice (Museum API owner) or Eve (platform team) see the access-restricted
message instead of lint results.

**Possible causes for Alice**: `useEntityOwnership` is not returning `isOwnedEntity: true`.
Verify the Museum API has `spec.owner: group:default/museum-team` in its catalog descriptor,
and that Alice's User entity has `memberOf: [museum-team]`.

**Possible causes for Eve**: `getBackstageIdentity()` is not returning
`group:default/platform-team` in `ownershipEntityRefs`. This happens if the catalog has not
yet refreshed after adding Eve and updating `teams.yaml`, or if the catalog location for
`platform-user.yaml` is missing or has a wrong URL. Restart Backstage and wait for the
catalog to complete its refresh cycle.

---

### Missing catalog location for platform-user.yaml

**Symptom**: Eve does not appear in the Backstage catalog (User Kind filter shows only the
four Lab 2 users).

**Fix**: Verify the catalog location entry for `platform-user.yaml` is in `app-config.yaml`
with `allow: [User]` and that the URL is reachable. Also confirm that
`labs/lab-02-users-roles/catalog/teams.yaml` lists `eve` in `platform-team`'s `members`
array — both the User entity and the group membership are required for Backstage to resolve
Eve's team relations.
