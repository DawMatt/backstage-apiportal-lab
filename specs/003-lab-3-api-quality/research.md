# Research: Lab 3 — API Quality

**Branch**: `003-api-quality` | **Date**: 2026-06-15

## R-001: Spectral Ruleset Format and File Location

**Decision**: Create `labs/lab-03-api-quality/.spectral.yaml` using the built-in Spectral
ruleset aliases `spectral:oas` and `spectral:asyncapi`. Reference this file in both quality
plugins via its GitHub raw URL.

**Rationale**: Both `@dawmatt/api-grade-core` (used by the api-grade backend) and
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

**Decision**: Install `@dawmatt/backstage-plugin-api-grade` and
`@dawmatt/backstage-plugin-api-grade-backend` directly from npm.

**Finding** (updated 2026-07-01): Both packages are now published to the npm registry at
version 0.5.0, under the `@dawmatt` scope. `@dawmatt/api-grade-core` (the shared grading
engine) is also published to npm and is a declared dependency of both plugins, so it is
installed automatically — no local build, GitHub clone, or `file:` protocol install is
required.

```bash
yarn --cwd packages/app add @dawmatt/backstage-plugin-api-grade
yarn --cwd packages/backend add @dawmatt/backstage-plugin-api-grade-backend
```

**Backend compatibility**: `@dawmatt/backstage-plugin-api-grade-backend` requires
`@backstage/backend-plugin-api ^0.6.0` and `@backstage/catalog-client ^1.0.0` — both
already installed in Backstage 1.51.0. It registers using `backend.add(import(...))` which
is consistent with the New Backend System already used in this project.

**Alternatives considered**:
- GitHub source build (clone + local build + `file:` protocol install): this was the
  documented fallback while the packages were unpublished (pre-2026-07-01). No longer
  needed now that both packages and `@dawmatt/api-grade-core` are on npm.
- gitpkg.now.sh: adds a third-party service dependency that learners cannot control.
  Excluded per Constitution Principle V (zero-cost) and Principle IV (no undocumented
  external dependencies).

---

## R-003: api-grade Frontend — New Declarative Frontend Compatibility

**Decision**: Wrap the `ApiGradeCard` component from `@dawmatt/backstage-plugin-api-grade` in an
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
import { ApiGradeCard } from '@dawmatt/backstage-plugin-api-grade';

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
| `ApiGradeCard` | `@dawmatt/backstage-plugin-api-grade` | — | New in Lab 3 |

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
backend.add(import('@dawmatt/backstage-plugin-api-grade-backend'));
```

The backend plugin self-registers under the `api-grade` plugin ID, wires to the Catalog
client and identity services via the New Backend System's dependency injection. No manual
router registration is needed.

**api-grade-core**: The backend plugin depends on `@dawmatt/api-grade-core` which bundles
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
yarn --cwd packages/app add @dweber019/backstage-plugin-api-docs-spectral-linter @backstage/core-compat-api
```
`@backstage/core-compat-api` is required for its `convertLegacyPlugin` helper, which registers
the plugin's old-system API factory (`linterApiRef`) with the new frontend system — see
R-007's Run 8 update for why this is needed and why `compatWrapper` (the Run 6/7 attempt) was
not the right tool for this job.

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

**Update (2026-07-01, Run 6/7/8 issue — superseded, see below)**: Runs 6 and 7 attempted two
fixes — wrapping the component in `compatWrapper(...)` (Run 6), then additionally forcing a
single `@backstage/core-plugin-api` instance via a `resolutions` pin (Run 7) — but Run 8
testing showed the identical error still occurred at the same rate, with no improvement.
Both fixes were based on an incorrect diagnosis and are **retracted**; see the Run 8 update
below for the verified root cause and actual fix.

**Update (2026-07-01, Run 8 issue — verified via source inspection)**: Traced the exact
runtime behavior by downloading and reading the compiled source of both
`@backstage/core-plugin-api@1.12.7` (`dist/routing/useRouteRef.esm.js`) and
`@dweber019/backstage-plugin-api-docs-spectral-linter@0.5.2` (`dist/plugin.esm.js`,
`dist/routes.esm.js`, `dist/components/EntityApiDocsSpectralLinterContent/*`).

`useRouteRef(routeRef)` first calls `useApi(routeResolutionApiRef)` (the **new** frontend
system's route-resolution API, from `@backstage/frontend-plugin-api`). In a new-system app
(`createApp` from `@backstage/frontend-defaults`), this API is *always* present — `useApi`
never throws, so `routeResolutionApi` is never `undefined`. The code takes the "new system"
branch unconditionally: `newRouteFunc = routeResolutionApi.resolve(routeRef, ...)`. Since our
custom Spectral tab never registers this plugin's internal `root` routeRef as an actual
mounted new-system route, `resolve()` returns `undefined` (not a thrown error), so
`newRouteFunc !== null` is true (`undefined !== null`), the code enters the "no path" branch,
and throws `"No path for ${routeRef}"` — which `RoutableExtensionWrapper` (in
`core-plugin-api`'s `extensions.esm.js`) catches and re-throws as the friendly "was not
discovered in the app element tree" message.

**Critically, the "legacy versioned context" fallback branch that `compatWrapper` populates
is only reached if `routeResolutionApi` itself is `undefined`** — which never happens in a
new-system app. This proves `compatWrapper` cannot fix this error under any circumstances,
regardless of whether `@backstage/core-plugin-api` is deduplicated (Run 7's hypothesis was a
red herring — the "4 vs 2 occurrences" difference between Run 6 and Run 7 was simply a
per-tab/per-render count, not evidence of partial improvement).

**Actual fix**: Don't render the routable-extension-wrapped `EntityApiDocsSpectralLinterContent`
export at all. Inspecting the package's `dist/` output shows it also ships (unexported from
its main `index.esm.js`, but present in the published files with no `package.json` `exports`
restriction blocking subpath access) a *plain, unwrapped* version of the same component at
`dist/components/EntityApiDocsSpectralLinterContent/index.esm.js`. That inner component only
calls `useEntity()` (from `@backstage/plugin-catalog-react`) and `useApi(linterApiRef)` — no
`useRouteRef`, no route dependency, no failure mode. Importing this subpath directly sidesteps
the incompatibility structurally instead of trying to bridge it.

This unwrapped component still needs `linterApiRef` (backed by the plugin's `LinterClient`)
registered in the app's API registry. The plugin declares this the old way
(`createPlugin({ apis: [createApiFactory({ api: linterApiRef, ... })] })`), so it's not
automatically available in a new-system app. `convertLegacyPlugin` from
`@backstage/core-compat-api` (confirmed via its source at
`dist/convertLegacyPlugin.esm.js`) reads `legacyPlugin.getApis()` and converts each factory
into an `ApiBlueprint` extension — this is precisely the mechanism needed, and requires no
manual reimplementation of `LinterClient`. Call
`convertLegacyPlugin(apiDocsSpectralLinterPlugin, { extensions: [] })` (empty `extensions`
because we don't want any of the plugin's own page/route extensions — only its API) and add
the result to the app's `features` array alongside the custom `EntityContentBlueprint` module.

`@backstage/core-compat-api` remains a required dependency — just for `convertLegacyPlugin`,
not `compatWrapper`.

**Update (2026-07-02, Run 14 — ruleset bundler nested-duplicate fix)**: After the routable-
extension issue was resolved, the Spectral tab rendered but failed to lint with
`Provided ruleset is not an object`. Root-caused via in-browser diagnostics (temporary logging
in `SpectralLinterContent.tsx`): the plugin (`0.5.2`) pins `@stoplight/spectral-ruleset-bundler`
to an exact `1.6.3`, installed as a **nested duplicate** under the plugin's `node_modules`.
`1.6.3` resolves un-bundled modules through the defunct **skypack** CDN (`cdn.skypack.dev`),
which fails in the browser (Node never needs the CDN, so it only reproduces in-browser — the
bundler loads 111 rules fine in Node); `1.7.0` switched the CDN to `esm.sh` and works in the
browser. Proven in the browser: running the exact current setup through `1.7.0` returns 111
rules with no error. Fix: a `resolutions` override
`"@stoplight/spectral-ruleset-bundler": "1.7.0"` in the Backstage workspace root `package.json`,
then `yarn install` to collapse the nested `1.6.3` into the single hoisted `1.7.0`.

**Update (2026-07-02, Run 15 — the bundler dedupe was necessary but not sufficient)**: after the
bundler dedupe the error persisted. In-browser diagnostics proved `bundleAndLoadRuleset@1.7.0`
succeeds with the plugin's exact inputs (indented YAML + spectral-runtime fetch → 111 rules), so
bundling was not the blocker. The blocking cause was a SECOND nested-duplicate:
`@stoplight/spectral-core` (hoisted `1.23.0` used by the bundler; nested `1.20.0` pinned by the
linter plugin). `LinterClient` builds the ruleset with the bundler's `1.23.0` `Ruleset` and then
`spectral.setRuleset(ruleSet)` on a `Spectral` from the nested `1.20.0`; `setRuleset` is
`ruleset instanceof Ruleset ? ruleset : new Ruleset(ruleset)` (`dist/spectral.js:66`), and a
`1.23.0` `Ruleset` isn't `instanceof` the `1.20.0` `Ruleset`, so it re-wraps a class instance →
`assertValidRuleset` → "Provided ruleset is not an object". Fix: a second `resolutions` override
`"@stoplight/spectral-core": "1.23.0"` (must be `1.23.0` — `@dawmatt/api-grade-core` requires
`^1.23.0`), collapsing to a single `spectral-core`. Validated by replicating the plugin's full
flow (`bundleAndLoadRuleset` → `new Spectral()` → `setRuleset` → `run`) against the deduped tree:
`setRuleset` accepts the ruleset and `run` returns diagnostics. Both resolutions are required
together. NOTE vs Run 7: these are genuine nested-duplicate fixes with verified mechanisms —
Run 7's `@backstage/core-plugin-api` duplicate theory for the (unrelated) routeRef error was a
red herring; here the duplicates are real and proven.

The `EntityContentBlueprint` `filter` attribute supports entity-based predicates but does
not have access to the requesting user's identity, so the tab itself cannot be hidden via
the filter. Instead, the tab appears for all users on API entity pages, but the CONTENT
is gated: owners and platform team members see the Spectral lint results; others see a
brief note explaining that quality details are restricted. This is more educational than
a blank tab and teaches the conditional-rendering pattern.

**Implementation pattern**:

```typescript
// packages/app/src/modules/spectralLinter/spectral-linter-content.d.ts
// Ambient module declaration — the package ships no .d.ts for this subpath.
declare module '@dweber019/backstage-plugin-api-docs-spectral-linter/dist/components/EntityApiDocsSpectralLinterContent/index.esm.js' {
  import { ComponentType } from 'react';
  export const EntityApiDocsSpectralLinterContent: ComponentType<{}>;
}
```

```typescript
// packages/app/src/modules/spectralLinter/SpectralLinterContent.tsx
import React, { useEffect, useState } from 'react';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { useEntityOwnership } from '@backstage/plugin-catalog-react';
import { EntityApiDocsSpectralLinterContent } from '@dweber019/backstage-plugin-api-docs-spectral-linter/dist/components/EntityApiDocsSpectralLinterContent/index.esm.js';
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

// Registers linterApiRef (backed by LinterClient) with the new system's API registry.
// extensions: [] deliberately excludes the plugin's own page/route extensions.
export const spectralLinterApiPlugin = convertLegacyPlugin(apiDocsSpectralLinterPlugin, {
  extensions: [],
});
```

Both `spectralLinterModule` and `spectralLinterApiPlugin` must be added to `App.tsx`'s
`features` array — the tab renders without the API plugin, but lint results fail with a
missing-API-implementation error since `linterApiRef` would never be registered.

**Import sources**:

| Symbol | Package | Stability | Already installed |
|--------|---------|-----------|-------------------|
| `identityApiRef`, `useApi` | `@backstage/core-plugin-api` | Stable | Yes |
| `useEntityOwnership` | `@backstage/plugin-catalog-react` | Stable | Yes |
| `EntityContentBlueprint` | `@backstage/plugin-catalog-react/alpha` | Alpha | Yes (Lab 2) |
| `createFrontendModule` | `@backstage/frontend-plugin-api` | Stable | Yes (Lab 2) |
| `InfoCard` | `@backstage/core-components` | Stable | Yes |
| `Typography` | `@material-ui/core` | Stable | Yes |
| `convertLegacyPlugin` | `@backstage/core-compat-api` | Stable | New in Lab 3 (Run 8 fix; supersedes Run 6's `compatWrapper`, which is no longer used) |
| `apiDocsSpectralLinterPlugin` | `@dweber019/backstage-plugin-api-docs-spectral-linter` | — | New in Lab 3 |
| `EntityApiDocsSpectralLinterContent` (unwrapped) | `@dweber019/backstage-plugin-api-docs-spectral-linter/dist/components/EntityApiDocsSpectralLinterContent/index.esm.js` | Internal/unofficial subpath | New in Lab 3 (Run 8 fix) |

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
