# Lab 5 — Mocking and Testing

## Overview

Every API registered in Labs 1–4 renders a "Try it out" panel — but only if a real backend is
sitting behind the API's declared `servers` URL. Museum's production server
(`https://api.example.museum/v1`) is fictitious and will never resolve; Galaxy's sandbox servers
are real, but not every API a learner (or a real engineer) registers will have one. This lab adds
a locally running, dynamically generated mock to every registered OpenAPI API's page, plus a
documented pattern for APIs that already ship a public sandbox (Galaxy), so "Try it out" always has
something real to talk to.

By the end of this lab you will have:

- A single, long-lived mock gateway process (`scripts/mock-gateway.mjs`) that serves mocks for
  *every* discovered OpenAPI file on one fixed port, using Stoplight Prism's programmatic library
  — not one process per API. It builds a cheap `slug → spec file` map at startup and only parses
  and converts a given API's spec the first time that API is actually requested, caching the
  result in a bounded LRU map.
- A new frontend module (`packages/app/src/modules/apiMocking/`) that overrides
  `apiDocsConfigRef` — the same pattern Lab 3 used for `apiGrade`/`spectralLinter` — to merge a
  "Local mock (Lab 5)" server entry into every OpenAPI API's server dropdown, computed purely from
  the entity's own name, with zero per-entity configuration.
- A documented, fictional default credential, pre-filled into Swagger UI's own "Authorize" dialog
  on page load, so an authenticated request succeeds with zero learner setup — fully editable
  through that same dialog if a learner wants to supply their own.

**What you will learn:**

- Why a single, lazily-loading gateway process — not one process per API — is the only design that
  actually satisfies "works the same at 500+ APIs as it does at 3," and what happens to a
  first-draft design that gets this wrong (see "Why one gateway process, not one per API" below)
- Why the API viewer needed a frontend-module override at all — `@backstage/plugin-api-docs` has
  no built-in config toggle for extra servers or credential injection
- Why a client-side "Authorize" pre-fill was chosen over a proxy-level header rewrite for the
  default credential, and why that choice is what makes "override with your own credential" work
  at all
- Why Galaxy needs zero Lab 5 configuration to get a sandbox option, while Museum needs one small
  addition to become mockable

---

## Prerequisites

- **Labs 1–4 completed** — Backstage running locally with Museum, Streetlights, Train Travel,
  Galaxy, and the precedence-demo API all registered (Lab 4's auto-registration in place)
- **Node.js 20+ (or 22/24) and Yarn** — same toolchain as Labs 1–4
- No new external accounts, services, or OS-level prerequisites

---

## Security Note

This lab introduces the series' first credential: `mocking.defaultCredential`, committed in
`app-config.yaml` as an obviously fictional bearer token (`lab-mock-token-do-not-use`). It exists
purely so a learner can exercise an authenticated request with zero setup — it is pre-filled into
Swagger UI's own "Authorize" dialog (fully visible and editable there), never sent as a hidden,
unconditional header a learner couldn't see or override.

**Do not follow this pattern in production.** A committed, shared, fictional credential is a
teaching shortcut for a local sandbox with no real data behind it. In a real deployment:

- Credentials belong in a secrets manager or vault-injected config, never a committed file.
- Credentials should be scoped per user or per team, not shared across everyone who clones the repo.
- A real credential should never be able to reach a real backend from a public or shared
  environment — this lab's mock gateway has no real data or side effects to protect in the first
  place, which is precisely why a shortcut is acceptable here and nowhere else.

---

## Step 1 — Install Dependencies

From the Lab 1 Backstage workspace root:

```
cd labs/lab-01-base-backstage/backstage
yarn add -D @stoplight/prism-http@5.15.11 @stoplight/http-spec@7.1.0 js-yaml concurrently
```

`@stoplight/prism-http` is Stoplight Prism's *programmatic* mock-response library — not the
`prism` CLI. It exposes `createInstance(...).request(...)` as a plain function call that returns a
mocked HTTP response without binding any port of its own, which is what makes a single process
able to serve every API. `@stoplight/http-spec` is pulled in by `prism-http` and used internally to
convert an OpenAPI document into the operation shape Prism consumes. `js-yaml` reads
`app-config.yaml` and each spec file's `info.title`. `concurrently` runs the gateway alongside
`backstage-cli repo start`.

The frontend module also needs its own copy of `js-yaml`, since it parses
`entity.spec.definition` (always delivered as a raw string) client-side:

```
yarn workspace app add js-yaml
```

## Step 2 — Add the Mock Gateway Script

Copy [`code/scripts/mock-gateway.mjs`](code/scripts/mock-gateway.mjs) to
`scripts/mock-gateway.mjs` in the Backstage workspace. At a high level, it:

1. Reads `app-config.yaml` directly (no Backstage config service — this is a standalone Node
   script) for `mocking.gateway.port`/`maxCachedSpecs` and Lab 4's own
   `autoApiRegistration.rootPath`/`patterns`.
2. At startup, builds an in-memory `entityNameSlug → specFilePath` map from every file matching
   Lab 4's discovery config, **plus** one additional source covering Lab 1's `apis/` directory
   (see "Why Museum needs one extra source" below) — a cheap directory walk plus a lightweight
   `info.title` read, not the expensive spec-to-operations conversion, so this is safe to do
   eagerly even at hundreds of files.
3. On each request to `/<slug>/*`, looks up the slug, and on a cache miss, converts that one
   spec via `@stoplight/prism-http`'s `getHttpOperationsFromSpec(filePath)` — which dereferences
   the spec's own internal `$ref`s before converting, a step required for anything beyond the
   most trivial spec (see "A correction worth knowing about" below) — caching the result in an
   LRU map bounded by `mocking.gateway.maxCachedSpecs`.
4. Calls a single, gateway-lifetime `Prism.createInstance({ mock: { dynamic: false } })` instance's
   `.request()` with the translated request and cached operations, and translates the mocked
   response back into a real HTTP response.

### A correction worth knowing about

The natural first attempt is to `js-yaml`-parse a spec file and hand it directly to
`@stoplight/http-spec`'s `transformOas3Operations(document)`. That works right up until a response
has no static example and Prism falls back to schema-driven generation — at which point it fails
with `Invalid reference token: components`, because `transformOas3Operations` alone does not
resolve the document's own internal `$ref`s (e.g. `#/components/schemas/Foo`), which almost every
non-trivial OpenAPI document has. `getHttpOperationsFromSpec` (exported directly by
`@stoplight/prism-http`) wraps that same call with the dereference step it actually needs — this
was found by testing against Museum's real spec, not by reading documentation more carefully in
advance, which is exactly the kind of thing you only learn by running the code.

## Step 3 — Add Static Configuration

Add to `app-config.yaml`:

```yaml
proxy:
  endpoints:
    '/mock':
      target: 'http://localhost:4010'
      changeOrigin: true
      credentials: 'dangerously-allow-unauthenticated'

mocking:
  gateway:
    port: 4010
    maxCachedSpecs: 100
  defaultCredential:
    scheme: bearer
    value: lab-mock-token-do-not-use
```

The proxy target and `mocking.gateway.port` are the same number, committed twice — Backstage's
`app-config.yaml` has no config-to-config interpolation (only `${ENV_VAR}` substitution), so
keeping them in sync is a one-line manual step, not a recurring one.

`credentials: 'dangerously-allow-unauthenticated'` is required, not optional: Swagger UI's "Try it
out" issues a plain browser `fetch()`, which never carries a Backstage user/service token. The
proxy plugin's default policy (`require`) demands one on every request, so without this line every
mock request — a learner's included, not just a raw `curl` — gets a `401 Missing credentials`
before it ever reaches the gateway. This is safe specifically because the mock gateway has no real
data or side effects behind it (same justification as the Security Note's shared default
credential below) — do not reach for this setting for a proxy target that fronts anything real.

## Step 4 — Wire the Start Script

In the root `package.json`:

```json
"start": "concurrently -n front,back,mocks \"yarn workspace app start\" \"yarn workspace backend start\" \"node scripts/mock-gateway.mjs\""
```

No `wait-on` sequencing is needed — the gateway's port and proxy target are static, committed
values valid the moment Backstage starts, whether or not the gateway has finished booting yet; the
gateway only needs to be listening by the time a learner clicks "Try it out". `concurrently`'s
`-k`/`--kill-others` flag is deliberately **not** used: if the gateway process dies or is stopped,
Backstage keeps running and reports a clear connection error on the next mock request (Step 7),
which is exactly the behavior you want to be able to demonstrate and exactly what `-k` would
prevent by tearing down the whole session the moment the gateway exits.

## Step 5 — Add the `apiMocking` Frontend Module

Copy [`code/packages/app/src/modules/apiMocking/index.tsx`](code/packages/app/src/modules/apiMocking/index.tsx)
to `packages/app/src/modules/apiMocking/index.tsx`, then register it in `packages/app/src/App.tsx`
alongside Lab 3's modules:

```ts
import { apiMockingModule } from './modules/apiMocking';

export default createApp({
  features: [
    // ...existing features
    apiMockingModule,
  ],
});
```

The module overrides the `config` extension of the `api-docs` plugin (the same `pluginId` +
extension name the plugin itself registers for `apiDocsConfigRef`) to supply a custom
`getApiDefinitionWidget`. For any `openapi`-type entity, it:

- Parses `entity.spec.definition` (a raw YAML/JSON string — that's the only form the widget's
  `component(definition)` signature ever receives) into an object, appends a
  `{ url: '/api/proxy/mock/<entity.metadata.name>', description: 'Local mock (Lab 5)' }` entry to
  its `servers` array, and passes the merged object through as an extra `spec` prop.
- Reads every `http`/`bearer`-type security scheme the spec declares and pre-authorizes each one
  via `onComplete(system) => system.authActions.authorize(...)`, using
  `mocking.defaultCredential`.

Two mechanisms make this possible without any change to `@backstage/plugin-api-docs` itself,
confirmed by reading its source rather than assumed:

- `getApiDefinitionWidget(apiEntity)` — unlike the widget's own `component(definition)` — receives
  the **full** entity, which is what lets this module compute a per-entity mock URL with no
  per-entity configuration.
- `OpenApiDefinitionWidget` forwards every prop it receives down to `swagger-ui-react`'s own
  `<SwaggerUI>`, *after* its own internal `spec={definitionString}` — so an extra `spec` prop
  passed through the widget wins over the string-derived one.

This new config key also needs to be declared visible to the frontend bundle. Add
`packages/app/config.d.ts`:

```ts
export interface Config {
  mocking?: {
    defaultCredential?: {
      /** @visibility frontend */
      scheme: string;
      /** @visibility frontend */
      value: string;
    };
  };
}
```

and add `"configSchema": "config.d.ts"` to `packages/app/package.json`. Without both, Backstage's
config-visibility filter silently strips `mocking.defaultCredential` before it reaches the
browser — `configApi.getOptional(...)` will just return `undefined`, with no error anywhere. This
was found by checking the `<script type="backstage.io/config">` payload the backend actually
serves, not by reasoning about it in advance.

## Step 6 — Start Backstage and Verify Discovery

```
yarn start
```

Confirm in the gateway's log output (`[mocks]` prefix):

```
[mock-gateway] discovery map built: N API(s) discoverable (scalar-galaxy, precedence-demo-api, museum-api, ...)
[mock-gateway] listening on http://localhost:4010
```

No spec has been parsed yet at this point — only the cheap discovery walk has run.

## Step 7 — User Story 1: Mock, Including Lazy-Load Behavior

Open the Museum API's page, select **Local mock (Lab 5)** from the server dropdown (alongside its
native, non-resolvable `https://api.example.museum/v1` entry), expand `GET /museum-hours`, click
**Try it out**, then **Execute**. A realistic example response comes back. Check the gateway log:
the *first* request logs a load line with measured parse latency —

```
[mock-gateway] loading "museum-api" from "..." — 9 operation(s) converted in 15ms (first request, now cached)
```

— and a second request to the same API does not repeat that line (cache hit). Stop just the
gateway process (find it with `lsof -ti :4010` and `kill` that PID, or `Ctrl-C` it if run in its
own terminal) and retry: the proxy call now fails with a clear `504 Gateway Timeout` and an
explicit "Error occurred while trying to proxy" message — not a silent failure — while the rest of
Backstage keeps running. Restart the gateway (`node scripts/mock-gateway.mjs`) to continue.

## Step 8 — User Story 2: Sandbox

Open the Galaxy API's page. Its server dropdown already offers `galaxy.scalar.com` and
`void.scalar.com` — native to `galaxy-openapi.yaml`'s own `servers` list — with zero Lab 5
configuration, alongside the same **Local mock (Lab 5)** entry every OpenAPI API gets. Select a
native server, execute a request, and confirm the response comes from the real sandbox, not the
local mock.

## Step 9 — User Story 3: Credentials

On Galaxy's page (Museum's spec declares no security scheme, so it isn't a useful demo for this
step), open the lock icon / **Authorize** dialog for `GET /me`. Galaxy's spec declares six
alternative ways to authenticate this one operation (`basicAuth`, three separate `oAuth2` flow
blocks, `bearerAuth`, `apiKeyHeader`, `apiKeyQuery`, and a combined `apiKeyHeader`+`apiKeyQuery`
row), and Swagger UI additionally fetches Galaxy's OpenID Connect discovery document and renders
two more blocks from that — eleven sections in total. **Only the `bearerAuth` section matters for
this lab**: it's the one this module pre-authorizes with `mocking.defaultCredential`'s value on
page load. Look for it near the top of the dialog; the rest are additional options Galaxy's spec
happens to declare, not something this lab wires up — ignore them. A pre-authorized scheme renders
differently from an empty one: instead of an editable text box, `bearerAuth`'s section shows a
"logged in"/padlock state with no input field, which is easy to miss if you're scanning for a
filled-in string among ten other empty text boxes.

Close the dialog (or leave it open — either way, `bearerAuth` is already authorized) and execute
`GET /me` **against either the local mock or the real `galaxy.scalar.com` sandbox** with no
credential entered yourself — both succeed on the first try (SC-003), because the pre-fill applies
before you ever open the dialog. Inspect the request's `Authorization` header in your browser's
network tab to confirm `lab-mock-token-do-not-use` was actually sent even though you never typed
it. Unlike the local mock (which never validates the token's contents, only that one was sent),
`galaxy.scalar.com` is Scalar's own real, live mock-server deployment and does check that a
plausible bearer token is present — the pre-filled default satisfies that check on the real
service too, not only on the local mock.

To try your own credential instead: execute `POST /auth/token` against `galaxy.scalar.com` (any
request body it accepts is fine — see its own docs on this page), copy the `token` value from the
response, reopen the Authorize dialog, and paste that value into the `bearerAuth` field, replacing
the pre-filled default. Execute `GET /me` again and confirm it still succeeds — the
`Authorization` header now shows your pasted token, not the default (SC-004). Confirm no personal
credential ever appears in `app-config.yaml` or any other committed file.

## Step 10 — Verify the "Generic by Default" Mechanism

Temporarily add a third `*-openapi.yaml` file anywhere under Lab 4's discovery `rootPath`, then
restart `yarn start` (discovery is boot-time-only — see "Adaptable Conventions" below). Confirm it
automatically gets a **Local mock (Lab 5)** entry with zero Lab-5-specific configuration, and that
its spec is parsed only on its own first request, not eagerly at gateway startup. Remove the
temporary file afterward.

---

## Why Museum Needs One Extra Discovery Source

Museum's spec predates Lab 4 entirely — it's committed as a plain `openapi.yaml` (not
`museum-openapi.yaml`) under `labs/lab-01-base-backstage/apis/museum/`, and it's catalogued by a
hand-authored `catalog-info.yaml`, not by Lab 4's `EntityProvider`. That means it sits outside Lab
4's default `rootPath`, and its filename can never match the `*-openapi.yaml` glob regardless of
`rootPath` (the pattern requires a non-empty prefix before `-openapi.yaml`). Since Museum's
fictitious, non-resolvable native server is exactly what makes it this lab's best mocking example,
the gateway scans Lab 4's discovery source **plus** one additional, explicitly-named source
(`mocking.gateway.additionalSources`, defaulting to Lab 1's `apis/` directory with pattern
`**/openapi.yaml`) — configurable, but Lab 4's own glob is left completely untouched.

## Why One Gateway Process, Not One Per API

The first draft of this lab's design spawned one `prism mock <file> -p <port>` CLI process per
discovered API. That "just works" for a 3–4 API lab demo — and fails outright at real scale: 500+
registered APIs means 500+ permanently-running processes and 500+ held ports, *regardless of
whether any given mock is ever actually requested*. That's not "configuration that changes at
scale" — it's a mechanism with a real, low ceiling (OS process limits, port exhaustion, memory).

Reviewed against this constitution's scale principle mid-plan, before any of that design was built,
the fix was a single, long-lived gateway process using Prism's *programmatic* library instead of
its CLI, with **lazy** loading: a spec is only read, parsed, and converted the first time an API is
actually requested, and the result is cached in a bounded LRU map (`mocking.gateway.maxCachedSpecs`,
default `100`). The properties this buys, mapped directly against what "actually scales" means:

- **Process/port count is O(1)**, not O(APIs) — exactly one process and one port, whether the
  catalog has 4 APIs or 5,000.
- **Memory cost is O(actively-used APIs)**, not O(catalog size) — an API nobody ever tries is
  never parsed or held in memory at all.
- **The only thing that changes between this lab's demo and a 500+ API deployment is
  `mocking.gateway.maxCachedSpecs`** — a config value, not a code or architecture change.

The one simplification that does *not* itself generalize, and is flagged rather than left
implicit: the gateway's discovery map is built once at startup, not live-refreshed — a newly added
API needs a gateway restart to become mockable (Step 10). This mirrors Lab 4's own `poll` vs.
`watch` framing; a real, frequently-changing mono-repo would want the same kind of watch-based
refresh Lab 4 already has for catalog discovery, applied here to the gateway's own slug map — a
config/mode change, not a redesign.

## Adaptable Conventions vs. Fixed Mechanics

**Adaptable** (change freely for your own fork):
- The gateway's port (`mocking.gateway.port`) and cache size (`mocking.gateway.maxCachedSpecs`)
- Reliance on Lab 4's discovery glob, plus `mocking.gateway.additionalSources` for any spec files
  that live outside it
- The default credential's value and scheme (`mocking.defaultCredential`)

**Fixed** (the mechanism itself, not a per-lab detail):
- Overriding `apiDocsConfigRef` via a frontend module is the mechanism for injecting extra servers
  and credentials — there's no built-in toggle to configure instead
- The single-gateway, lazy-load-plus-LRU-cache architecture — this is what makes the mechanism
  scale; running multiple gateway processes or reintroducing a per-API process model would
  reintroduce the exact problem this lab's design was corrected away from

## Why AsyncAPI (Streetlights) Has No Mock Option

This lab's mocking mechanism is OpenAPI-only. Stoplight Prism mocks OpenAPI/Postman documents; it
has no AsyncAPI support, and building a separate event-driven mock mechanism (which would need to
simulate a message broker, not an HTTP request/response cycle) is a different-shaped problem
outside this lab's scope. Streetlights continues to work exactly as it did after Lab 2 — it simply
never gets a "Local mock (Lab 5)" option, and won't from this mechanism regardless of future
extension, since OpenAPI's request/response model doesn't map onto AsyncAPI's channels/messages.

---

## Verification Checklist

- [ ] `yarn start` logs the gateway's discovery map (`N API(s) discoverable`) with no spec parsed yet
- [ ] Museum's page shows **Local mock (Lab 5)** alongside its native, non-resolvable server
- [ ] Executing a request against the mock returns a realistic example response (Step 7)
- [ ] The gateway log shows a load+latency line on the *first* request only, not on repeats
- [ ] Stopping the gateway process alone (not all of `yarn start`) produces a clear `504`, not a
      silent failure, while Backstage itself keeps running
- [ ] Galaxy's page offers its native sandbox servers with zero Lab 5 configuration (Step 8)
- [ ] `GET /me` against the mock succeeds with no credential entered (Step 9)
- [ ] `GET /me` against the real `galaxy.scalar.com` sandbox also succeeds with no credential
      entered, and the request's `Authorization` header shows `lab-mock-token-do-not-use` was sent
      even though it was never typed (Step 9)
- [ ] Pasting a real token from `POST /auth/token` into `bearerAuth` makes `GET /me` against the
      sandbox still succeed, and the request's `Authorization` header now shows that pasted token,
      not the default (Step 9)
- [ ] No personal credential appears in any committed file
- [ ] A newly added `*-openapi.yaml` file gets a mock option after a restart, with zero
      Lab-5-specific configuration (Step 10)

## Troubleshooting

**Gateway fails to start with `EADDRINUSE`**: another process already holds port `4010`. Find it
with `lsof -ti :4010` and stop it, or change `mocking.gateway.port` (and the matching
`proxy.endpoints['/mock'].target`) to a free port.

**A specific API's mock request fails with a schema/reference error**: check the gateway log for
the exact error. Prism needs a spec's internal `$ref`s to be resolvable within the file itself —
this lab's gateway uses `getHttpOperationsFromSpec`, which handles ordinary same-file `$ref`s, but
a spec split across multiple files with cross-file `$ref`s would need a bundling step this lab
doesn't include.

**A learner's own fork has many more actively-tested APIs and starts seeing frequent cache
evictions/reload log lines**: raise `mocking.gateway.maxCachedSpecs` — this is the one config value
meant to grow with real usage; no code change is needed.

**Frontend config value silently reads as blank/default**: if you introduce a new custom config
key read via `configApiRef`, remember it needs `@visibility frontend` in a `config.d.ts` *and*
`"configSchema": "config.d.ts"` declared in that package's `package.json` — otherwise Backstage's
config-visibility filter strips it before it reaches the browser, with no error.
