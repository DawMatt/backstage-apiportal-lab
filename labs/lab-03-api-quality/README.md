# Lab 3 — API Quality

## Overview

This lab adds API quality tooling to the running Backstage instance from Labs 1 and 2. You
will integrate two quality plugins and a shared Spectral ruleset that together give every API
entity page a quality grade and an inline lint results tab.

By the end of this lab you will have:

- A `.spectral.yaml` ruleset committed to the repository, referenced by both quality plugins
  via its GitHub raw URL — one file, consistent results across both tools.
- The `@dawmatt/backstage-plugin-api-grade` frontend card and
  `@dawmatt/backstage-plugin-api-grade-backend` installed and configured. Every API entity
  page shows a grade card (letter, percentage, quality label) in the Info column. Owners and
  platform team members also see the full Quality Assessment, Recommendations, and
  Diagnostics breakdown.
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

`@dawmatt/backstage-plugin-api-grade` is published to npm — install it directly:

```bash
yarn --cwd packages/app add @dawmatt/backstage-plugin-api-grade
```

No source build is required. `@dawmatt/api-grade-core` (the shared grading engine that
bundles the Spectral packages) is a declared dependency of the plugin and is installed
automatically — you do not need to add it separately.

---

## Step 2b — Install the api-grade Backend Plugin

`@dawmatt/backstage-plugin-api-grade-backend` is also published to npm:

```bash
yarn --cwd packages/backend add @dawmatt/backstage-plugin-api-grade-backend
```

The backend plugin also depends on `@dawmatt/api-grade-core`, which bundles the Spectral
packages (`@stoplight/spectral-core`, `@stoplight/spectral-rulesets`, etc.). You do NOT need
to install additional Spectral packages in your Backstage backend.

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
import { ApiGradeCard } from '@dawmatt/backstage-plugin-api-grade';

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
backend.add(import('@dawmatt/backstage-plugin-api-grade-backend'));
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
yarn --cwd packages/app add @dweber019/backstage-plugin-api-docs-spectral-linter @backstage/core-compat-api
```

No source build is required. The package is compatible with React 18 and react-router-dom 6,
both already present in this Backstage instance.

### Dedupe two Spectral libraries so linting works in the browser (required)

The Spectral linter (`0.5.2`) pins **exact** versions of two `@stoplight` libraries, so yarn
installs a second, *nested* copy of each under the plugin's own `node_modules`. Both nested
copies break the Spectral tab (`Failed to lint API / Provided ruleset is not an object`), for
two independent reasons:

1. **`@stoplight/spectral-ruleset-bundler`** — the plugin pins `1.6.3`, which resolves
   un-bundled modules through the now-defunct **skypack** CDN (`cdn.skypack.dev`) and fails in
   the browser. `1.7.0` switched to `esm.sh` and works (and is already pulled in by
   `@dawmatt/api-grade-core`).
2. **`@stoplight/spectral-core`** — the plugin pins `1.20.0`, but the bundler and
   `@dawmatt/api-grade-core` use `1.23.0`. The linter builds the ruleset with the bundler's
   `spectral-core` (`1.23.0`) and then hands it to `new Spectral()` from its own `spectral-core`
   (`1.20.0`). `Spectral.setRuleset()` does `ruleset instanceof Ruleset ? … : new Ruleset(ruleset)`
   — a `1.23.0` `Ruleset` is not `instanceof` the `1.20.0` `Ruleset` class, so it re-wraps a
   class instance as if it were a plain object and throws "Provided ruleset is not an object."
   Both must be the **same** `spectral-core` copy for the `instanceof` check to pass.

Force a single copy of each by adding `resolutions` to the **Backstage workspace root**
`package.json` (the root of your Backstage app, *not* `packages/app/package.json`):

```jsonc
{
  "resolutions": {
    "@stoplight/spectral-ruleset-bundler": "1.7.0",
    "@stoplight/spectral-core": "1.23.0"
  }
}
```

(`spectral-core` must be `1.23.0`, not `1.20.0` — `@dawmatt/api-grade-core` requires `^1.23.0`.)

Then reinstall so the nested `1.6.3` / `1.20.0` copies collapse into the single hoisted
`1.7.0` / `1.23.0`:

```bash
yarn install
# verify only one version of each remains:
yarn why @stoplight/spectral-ruleset-bundler
yarn why @stoplight/spectral-core
```

> Note: because this changes `node_modules`, you must **fully restart `yarn start`** afterwards
> (stop the process and start it again) — a hot reload will not pick up the swapped
> dependencies.

**Why `@backstage/core-compat-api` too?** `@dweber019/backstage-plugin-api-docs-spectral-linter`
is built on Backstage's old plugin system (`createPlugin` + `createApiFactory`). The plugin
registers an API (`linterApiRef`, backed by a `LinterClient`) the old way. `convertLegacyPlugin`
from `@backstage/core-compat-api` registers that same API factory with the new frontend
system's API registry — see Step 9 for exactly how and why.

**Why not just render `EntityApiDocsSpectralLinterContent` directly?** The package's main
export of that name is a Backstage *routable extension* (built with `createRoutableExtension`),
which internally calls `useRouteRef(mountPoint)` expecting its `routeRef` to be resolvable by
the app's route registry. In this Backstage instance's new frontend system, `useRouteRef`
always checks the new system's `routeResolutionApi` first — and since that API is always
present in a new-system app, it never falls through to the "legacy" code path, no matter what
compatibility wrapper you put around the component. Since our custom tab never registers this
plugin's internal route as a real, navigable page, `routeResolutionApi` can never resolve it,
and the component throws `"Routable extension component ... was not discovered in the app
element tree"` every time it renders — this is a structural mismatch, not something a context
wrapper can paper over.

The fix used in Step 8 is to import the plugin's *unwrapped* inner content component (which
has no `routeRef` dependency at all) instead of its routable-extension-wrapped export.

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

**Why import from a subpath instead of the package root?** The package's top-level
`EntityApiDocsSpectralLinterContent` export is a *routable extension* — it internally calls
`useRouteRef()` against a `routeRef` that only the old plugin system's route discovery can
resolve (see Step 7 for why this always fails in this Backstage instance, regardless of any
compatibility wrapper). The plugin also ships, uncredited in its public API, the same content
component *without* the routable-extension wrapper, at
`dist/components/EntityApiDocsSpectralLinterContent/index.esm.js`. That inner component only
calls `useEntity()` and `useApi(linterApiRef)` — no `routeRef`, no route discovery, no failure
mode. Importing it directly sidesteps the incompatibility entirely instead of working around
it.

Because this subpath has no TypeScript declaration file, add a small ambient module
declaration. Create `packages/app/src/modules/spectralLinter/spectral-linter-content.d.ts`:

```typescript
declare module '@dweber019/backstage-plugin-api-docs-spectral-linter/dist/components/EntityApiDocsSpectralLinterContent/index.esm.js' {
  import { ComponentType } from 'react';
  export const EntityApiDocsSpectralLinterContent: ComponentType<{}>;
}
```

Create the file `packages/app/src/modules/spectralLinter/SpectralLinterContent.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { useEntity, useEntityOwnership } from '@backstage/plugin-catalog-react';
import { EntityApiDocsSpectralLinterContent } from '@dweber019/backstage-plugin-api-docs-spectral-linter/dist/components/EntityApiDocsSpectralLinterContent/index.esm.js';
import { InfoCard } from '@backstage/core-components';
import { Typography } from '@material-ui/core';

export function SpectralLinterContent() {
  const { entity } = useEntity();
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

  // `isOwnedEntity` from useEntityOwnership() is a per-entity predicate
  // FUNCTION, not a boolean — it must be called with the current entity.
  if (!isOwnedEntity(entity) && !isPlatformTeamMember) {
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

**Why is `isOwnedEntity` called as a function?** `useEntityOwnership()` (from
`@backstage/plugin-catalog-react`) returns `{ loading, isOwnedEntity }` where `isOwnedEntity`
is a per-entity predicate — `(entity: Entity) => boolean` — not a boolean value itself. A
function reference is always truthy in JavaScript, so treating it as a boolean (e.g.
`!isOwnedEntity`) always evaluates to `false` and silently disables the access-restricted
branch for every user, regardless of ownership. Always call `isOwnedEntity(entity)` with the
entity from `useEntity()`.

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
import { convertLegacyPlugin } from '@backstage/core-compat-api';
import { apiDocsSpectralLinterPlugin } from '@dweber019/backstage-plugin-api-docs-spectral-linter';
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

// Registers the plugin's linterApiRef (backed by its LinterClient) with the new frontend
// system's API registry. `extensions: []` means we deliberately do NOT bring in the
// plugin's own page/route extensions — we only need its API, since Step 8's unwrapped
// component looks up `linterApiRef` via the ambient `useApi` context, not via a prop.
export const spectralLinterApiPlugin = convertLegacyPlugin(apiDocsSpectralLinterPlugin, {
  extensions: [],
});
```

`defaultPath: '/spectral'` and `defaultTitle: 'Spectral'` define the tab's URL path and
display label. `filter: 'kind:API'` ensures the tab appears only on API entity pages.

**Why `convertLegacyPlugin` here, separately from the component import in Step 8?** Step 8's
component calls `useApi(linterApiRef)` to fetch lint results. `useApi` only works if something
has registered a factory for `linterApiRef` in the app's API registry — normally the old
plugin system does this automatically when a `BackstagePlugin` is added to an old-style
`createApp`. This Backstage instance uses the new frontend system instead, which has its own
separate API registry. `convertLegacyPlugin` reads `apiDocsSpectralLinterPlugin`'s declared
`apis` (its `linterApiRef` factory) and registers each one as an `ApiBlueprint` extension in
the new system — this is exactly what's needed, without needing to reimplement `LinterClient`
wiring ourselves.

---

## Step 10 — Register the spectralLinter Module in App.tsx

Open `packages/app/src/App.tsx` again and add the spectralLinter import and modules (alongside
the apiGradeModule you added in Step 4). Note that **both** `spectralLinterModule` (the tab)
and `spectralLinterApiPlugin` (the API registration from Step 9) must be added — the tab
won't be able to fetch lint results without the API plugin also being present:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { apiVisibilityModule } from './modules/apiVisibility';
import { apiGradeModule } from './modules/apiGrade';
import { spectralLinterModule, spectralLinterApiPlugin } from './modules/spectralLinter';   // ← add this import

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    apiVisibilityModule,
    apiGradeModule,
    spectralLinterModule,      // ← add this entry
    spectralLinterApiPlugin,   // ← add this entry
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

## Step 12a — Grant the Platform Team Catalog Read Access

**Why this step is needed**: Registering Eve as a `platform-team` member (Step 12) and
configuring `apiGrade.visibility.groups` (Step 6) are not enough on their own. Lab 2's
permission policy (`packages/backend/src/extensions/permissionPolicy.ts`) restricts
`example.com/visibility: private` APIs — Museum API and Streetlights API — to their owning
team only; it has no platform-team rule. Because that policy governs the underlying
`catalog-entity` **read** permission, a platform-team member who isn't in the owning team
can't load the entity at all — it won't appear in the APIs catalog list, search, or even a
direct link. `apiGrade`'s own summary/detail visibility split never runs, because Backstage
never gets far enough to render the page.

Open `packages/backend/src/extensions/permissionPolicy.ts` and add a platform-team check
ahead of the existing ownership-based conditional decision:

```typescript
// packages/backend/src/extensions/permissionPolicy.ts
class CatalogOwnershipPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    if (isResourcePermission(request.permission, 'catalog-entity')) {
      // Lab 3: platform-team members can read every catalog entity, including private
      // APIs owned by other teams. This must be an unconditional allow rather than an
      // extra `anyOf` clause below — platform-team access doesn't depend on anything
      // about the entity being read, only on the requesting user's own group membership.
      if (user?.info.ownershipEntityRefs?.includes('group:default/platform-team')) {
        return { result: AuthorizeResult.ALLOW };
      }

      return createCatalogConditionalDecision(
        request.permission,
        {
          anyOf: [
            { not: catalogConditions.isEntityKind({ kinds: ['API'] }) },
            catalogConditions.hasAnnotation({
              annotation: 'example.com/visibility',
              value: 'shared',
            }),
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
```

Only the `if (user?.info.ownershipEntityRefs?.includes(...))` block is new — the rest of the
file (imports, the `anyOf` rules, and the `createBackendModule` registration) is unchanged
from Lab 2.

**Why an unconditional allow instead of a fourth `anyOf` clause?** The three existing rules
are entity-scoped — they inspect the entity being read (its kind, its annotation, its
`ownedBy` relation). Platform-team access doesn't fit that shape: it should apply regardless
of who owns the entity. Checking the user's own `ownershipEntityRefs` up front and returning
an unconditional `ALLOW` is simpler and correct; folding it into `isEntityOwner`'s `claims`
would incorrectly also require the entity to be *owned by* platform-team, which is only true
for Train Travel API.

Restart the backend (`yarn start`) after editing — permission policy changes require a
backend restart to take effect; they are not picked up by a browser refresh alone.

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
**Fail (grade shows error/blank)**: Check that `@dawmatt/backstage-plugin-api-grade-backend` is
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
2. Restart Backstage → navigate to the **Museum API** entity page (owned by museum-team) —
   Eve can find it via the sidebar **APIs** catalog list or search, the same as any other API
3. Verify the **API Grade** card shows the full detailed view
4. Navigate to the **Spectral** tab → verify lint results are visible (not access-restricted)
5. Repeat for the **Streetlights API** and **Train Travel API**

**Pass**: Eve sees detailed quality information for all three APIs, and all three appear for
her in the APIs catalog list and search  
**Fail (Museum/Streetlights don't appear in the APIs catalog list or search for Eve, or her
entity-page requests 404)**: This is a catalog *read* permission problem, not an `apiGrade`
display problem — Eve can't reach the entity at all. Confirm Step 12a's platform-team rule was
added to `permissionPolicy.ts` and that it checks `user.info.ownershipEntityRefs` (populated
from Eve's `memberOf: [platform-team]`) before falling through to the ownership-only
conditional decision; restart the backend after editing  
**Fail (Eve reaches the entity page but sees summary only for Museum/Streetlights)**: Verify
`apiGrade.visibility.groups` contains `group:default/platform-team`; confirm Eve's catalog
entry has `memberOf: [platform-team]`

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

### Platform team member can't find or open a non-owned private API at all

**Symptom**: Signed in as a platform-team member (e.g. Eve), an API owned by another team
(e.g. Streetlights API) doesn't appear in the sidebar **APIs** catalog list or search
results, and/or navigating directly to its entity page 404s — even though
`apiGrade.visibility.groups` includes `group:default/platform-team`.

**Cause**: This is a catalog **read permission** problem, not an `apiGrade` display problem.
`museum-api` and `streetlights-api` are annotated `example.com/visibility: private` (Lab 2),
and the permission policy in `permissionPolicy.ts` only grants read access to an API's owner
or to APIs annotated `shared` — platform-team membership alone doesn't satisfy either
condition. Because Backstage can't even load a private entity a user isn't allowed to read,
it never appears in the catalog list, search, or a direct-link entity page — and `apiGrade`'s
own summary/detail visibility split never gets a chance to run.

**Fix**: Add the platform-team check to `permissionPolicy.ts` from Step 12a: before falling
through to the existing `anyOf` conditional decision, unconditionally allow `catalog-entity`
reads when `user.info.ownershipEntityRefs` includes `group:default/platform-team`. Restart
the backend after editing — permission policy changes require a backend restart to take
effect.

---

### api-grade plugin fails to install from npm

**Symptom**: `yarn add @dawmatt/backstage-plugin-api-grade` fails or installs an incorrect
version.

**Cause**: A published version may not be compatible with your Backstage release, or a
stale yarn cache/lockfile is interfering with resolution.

**Fix**: Confirm the published version and compatibility first:
```bash
npm view @dawmatt/backstage-plugin-api-grade version
npm view @dawmatt/backstage-plugin-api-grade-backend version
```
If the install still fails, clear the yarn cache (`yarn cache clean`) and retry, or check
the package's npm page for a Backstage compatibility note.

---

### Spectral tab shows a "Routable extension component ... was not discovered" error

**Symptom**: Clicking the Spectral tab shows an error page instead of lint results or the
access-restricted message:
```
Routable extension component with mount point routeRef{type=absolute,id=api-docs-spectral-linter}
was not discovered in the app element tree. Routable extension components may not be rendered
by other components and must be directly available as an element within the App provider
component.
```

**Cause**: The package's top-level `EntityApiDocsSpectralLinterContent` export is a *routable
extension* (built with the old plugin system's `createRoutableExtension`). Internally it calls
`useRouteRef(mountPoint)`. In a new frontend system app (`createApp`), `useRouteRef` always
checks the new system's `routeResolutionApi` first, and since that API is always present in a
new-system app, it never falls back to any legacy/compatibility code path — no wrapper
component can change this. Because our custom Spectral tab never registers this plugin's
internal route as an actual page, `routeResolutionApi` can never resolve it, so the error
fires on every render. **A compatibility wrapper (e.g. `compatWrapper`) does not fix this** —
it addresses a different problem (bridging API/context access, not route discovery) and has
no effect here, which is why this error can persist across multiple attempted fixes that only
change wrapping.

**Fix**: Don't render the wrapped, routable-extension export at all. Import the plugin's
*unwrapped* inner component instead — it has no `routeRef` dependency:
1. `SpectralLinterContent.tsx` imports `EntityApiDocsSpectralLinterContent` from the subpath
   `@dweber019/backstage-plugin-api-docs-spectral-linter/dist/components/EntityApiDocsSpectralLinterContent/index.esm.js`,
   not from the package root (see Step 8).
2. A local ambient module declaration (`spectral-linter-content.d.ts`, Step 8) types this
   subpath import since the package ships no `.d.ts` for it.
3. `packages/app/src/modules/spectralLinter/index.ts` calls
   `convertLegacyPlugin(apiDocsSpectralLinterPlugin, { extensions: [] })` and exports the
   result as `spectralLinterApiPlugin` (Step 9) — this registers the `linterApiRef` API the
   unwrapped component depends on, via the new frontend system's API registry.
4. `spectralLinterApiPlugin` is added to `App.tsx`'s `features` array alongside
   `spectralLinterModule` (Step 10). If you only add `spectralLinterModule`, the tab renders
   but lint results fail because `linterApiRef` was never registered (a different error —
   "No implementation available for apiRef" — not the routable-extension error above).

**If you previously tried wrapping the component in `compatWrapper`, or added a `resolutions`
entry for `@backstage/core-plugin-api`**: neither of those addresses the actual cause and can
be reverted — remove the `compatWrapper` import/call and any `@backstage/core-plugin-api`
`resolutions` entry; they have no effect on this error either way. (This is unrelated to the
`@stoplight/spectral-ruleset-bundler` resolution in Step 7, which *is* required — see the next
entry.)

---

### Spectral tab shows "Failed to lint API / Provided ruleset is not an object"

**Symptom**: The Spectral tab renders (no routable-extension error), but instead of lint
results it shows:
```
Failed to lint API
Provided ruleset is not an object
```

**Cause**: This has **two independent root causes**, both *nested duplicate dependencies* the
plugin (`0.5.2`) pulls in by pinning exact `@stoplight` versions:

1. `@stoplight/spectral-ruleset-bundler` pinned to `1.6.3`, which resolves modules via the
   defunct **skypack** CDN and fails in the browser (works in Node — it never needs the CDN —
   which is why this only reproduces in-browser). `1.7.0` uses `esm.sh` and works.
2. `@stoplight/spectral-core` pinned to `1.20.0`, while the bundler/`api-grade-core` use
   `1.23.0`. The linter builds the ruleset with the bundler's `1.23.0` `Ruleset` class, then
   calls `setRuleset()` on a `Spectral` from the nested `1.20.0`; `setRuleset` does
   `ruleset instanceof Ruleset ? … : new Ruleset(ruleset)`, and a cross-version `Ruleset` fails
   the `instanceof`, so it re-wraps a class instance as a plain object → this exact error.

`yarn why @stoplight/spectral-ruleset-bundler` and `yarn why @stoplight/spectral-core` will each
show two versions until deduped.

**Fix**: Force a single copy of each with `resolutions` in the Backstage workspace root
`package.json` and reinstall (this is Step 7):
```jsonc
"resolutions": {
  "@stoplight/spectral-ruleset-bundler": "1.7.0",
  "@stoplight/spectral-core": "1.23.0"
}
```
```bash
yarn install
yarn why @stoplight/spectral-ruleset-bundler   # should show only 1.7.0
yarn why @stoplight/spectral-core              # should show only 1.23.0
```
Then **fully restart `yarn start`** (stop and start the process — a hot reload will not pick up
the swapped dependencies). The Spectral tab should now show lint results, or "No linting errors
found..." for a clean API.

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

**Possible causes for Alice**: `isOwnedEntity(entity)` is not returning `true` for the current
entity. Verify the Museum API has `spec.owner: group:default/museum-team` in its catalog
descriptor, and that Alice's User entity has `memberOf: [museum-team]`.

**Possible causes for Eve**: `getBackstageIdentity()` is not returning
`group:default/platform-team` in `ownershipEntityRefs`. This happens if the catalog has not
yet refreshed after adding Eve and updating `teams.yaml`, or if the catalog location for
`platform-user.yaml` is missing or has a wrong URL. Restart Backstage and wait for the
catalog to complete its refresh cycle.

---

### Spectral tab shows lint results (or a crash) to every user, not just owners/platform team

**Symptom**: Non-owners (e.g. Charlie or Alice viewing an API neither of them owns and where
neither is a platform-team member) see full Spectral lint content instead of the
access-restricted message — or, on some APIs, everyone (owners, platform team, and non-owners
alike) sees the same crash, such as `Cannot read properties of undefined (reading
'documentationUrl')` on the Train Travel API's Spectral tab.

**Cause**: `isOwnedEntity` returned by `useEntityOwnership()` is a per-entity predicate
**function** — `(entity) => boolean` — not a boolean. If the gating condition uses it directly
(`if (!isOwnedEntity && !isPlatformTeamMember)`), the function reference is always truthy, so
`!isOwnedEntity` is always `false` and the access-restricted branch never runs: every signed-in
user unconditionally renders the real lint content, regardless of ownership. On most sample
APIs this fails silently (non-owners just see content they shouldn't); on APIs whose diagnostics
happen to trip a separate bug in `@dweber019/backstage-plugin-api-docs-spectral-linter`'s
`LinterClient` (a rule `code` missing from `spectral.ruleset.rules`, which throws when building
`documentationUrl`), the permission failure becomes visible to everyone as an identical crash.

**Fix**: Call the predicate with the current entity: `useEntity()` to get `{ entity }`, then
`if (!isOwnedEntity(entity) && !isPlatformTeamMember)`. Confirm the fix by signing in as a
non-owner, non-platform-team user (e.g. Charlie) on an API owned by another team (e.g. the
Museum API or the platform-team-owned Train Travel API) and verifying the access-restricted
message appears instead of lint content or a crash.

---

### Missing catalog location for platform-user.yaml

**Symptom**: Eve does not appear in the Backstage catalog (User Kind filter shows only the
four Lab 2 users).

**Fix**: Verify the catalog location entry for `platform-user.yaml` is in `app-config.yaml`
with `allow: [User]` and that the URL is reachable. Also confirm that
`labs/lab-02-users-roles/catalog/teams.yaml` lists `eve` in `platform-team`'s `members`
array — both the User entity and the group membership are required for Backstage to resolve
Eve's team relations.
