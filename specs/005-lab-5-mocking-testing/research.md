# Phase 0 Research: Lab 5 - Mocking and Testing

## R1: How to override the API viewer's target servers and inject a default credential

**Decision**: Add a small custom frontend module (`packages/app/src/modules/apiMocking/`) that overrides
the `apiDocsConfigRef` API — the same `ApiBlueprint`/frontend-module pattern Lab 3 already established
for `apiGrade` and `spectralLinter` (`packages/app/src/modules/apiGrade/index.ts`,
`packages/app/src/modules/spectralLinter/index.ts`). The module supplies a custom
`defaultDefinitionWidgets()` entry for the `openapi` type that wraps
`@backstage/plugin-api-docs`'s `OpenApiDefinitionWidget`, passing through two extra
`swagger-ui-react` props it does not otherwise expose to callers: a merged `spec.servers` array
(mock + any lab-configured sandbox target, in addition to whatever the spec natively declares) and
an `onComplete` hook that pre-authorizes Swagger UI's "Authorize" state with a default credential.

**Rationale**: Confirmed by reading the installed `@backstage/plugin-api-docs@^0.14.1` source
(`OpenApiDefinition.esm.js`) that "Try it out" is enabled by default (`SwaggerUI` is rendered
directly, no `supportedSubmitMethods` restriction) and that `swaggerUiProps` are spread onto
`SwaggerUI` unmodified — but the entry point (`ApiDefinitionCard.esm.js`) only ever calls
`definitionWidget.component(entity.spec.definition)`, and the default widget factory hardcodes
`component: (definition) => <OpenApiDefinitionWidget definition />` with no extra props threaded
through and no app-config-level toggle for `servers` or auth. There is no third-party Backstage
community plugin that already does this. Overriding `apiDocsConfigRef` is the smallest change that
reaches the render path; it is also directly analogous to Lab 3's precedent, so it introduces no new
architectural pattern to the series.

**Alternatives considered**:
- Forking/patching `@backstage/plugin-api-docs` in place — rejected: unmaintainable across
  Backstage upgrades, contradicts Constitution Principle II's teaching-through-real-mechanisms intent.
- Replacing `plugin-api-docs` entirely with a bespoke viewer — rejected: massive scope increase,
  would also need to reimplement AsyncAPI rendering used by Streetlights, unrelated to this lab's goal.

## R2: Mock serving mechanism — single in-process gateway, not one process per API

**Decision (revised)**: A single, long-lived Node process (`scripts/mock-gateway.mjs`) serves mocks
for *every* discovered OpenAPI file on one fixed port, using Stoplight Prism's programmatic library
API directly — not the `prism` CLI, and not one child process per API. On each incoming request to
`/<entityNameSlug>/*`:
1. Look up `entityNameSlug` in an in-memory `slug → specFilePath` map built once at gateway startup
   from Lab 4's existing `autoApiRegistration` discovery config (research.md R3) — cheap (a glob),
   not a parse, so this is fine to do eagerly even at 500+ files.
2. If this slug's spec has not been loaded yet, convert it to Prism's operation format via
   `@stoplight/prism-http`'s own `getHttpOperationsFromSpec(filePath)` helper. Cache the
   resulting `IHttpOperation[]` in a bounded, LRU-evicted `Map`.
3. Call `.request()` on a single, gateway-lifetime `Prism.createInstance({ mock: { dynamic: false } })`
   instance (`@stoplight/prism-http@5.15.11`) with the translated request and the (now-cached)
   operations array, translate the returned mock response back to a real HTTP response.

Confirmed via direct inspection of `@stoplight/prism-http`'s README and `npm pack`/`npm view` on
both packages (not guessed): `createInstance(...).request(requestDescriptor, operations)` returns a
mocked response without binding any HTTP server/port of its own — it's a plain function call. No
`@stoplight/prism-cli` or `@stoplight/prism-http-server` dependency is needed; `@stoplight/prism-core`
is pulled in automatically as a dependency of `prism-http`.

**Correction found during implementation**: the original plan called for the gateway to call
`@stoplight/http-spec`'s `transformOas3Operations(document)` directly on a plain `js-yaml`-parsed
document. Tested live against Museum's real spec, this fails at mock-generation time with
`Invalid reference token: components` the moment a response has no static example and Prism falls
back to schema-driven generation — `transformOas3Operations` alone does not resolve the document's
own internal `$ref`s (e.g. `#/components/schemas/Foo`), which essentially all non-trivial OpenAPI
documents contain. Reading `@stoplight/prism-http`'s own source
(`dist/utils/operations.js`) showed it wraps that exact same `transformOas3Operations` call with a
`$RefParser().dereference()` + `bundleTarget()` step first, and exports the combined result as
`getHttpOperationsFromSpec` — which also accepts a file path directly, so the gateway no longer
reads/parses each spec file itself. `@stoplight/http-spec` remains an implicit dependency (pulled in
by `prism-http`) but is no longer imported directly by the gateway script.
The gateway also needed a small hand-rolled logger (not a `pino` dependency): Prism's core
`factory()` and mocker call several pino-style methods on whatever logger `createInstance` is given
— `child({ name })` on every request, plus assorted level methods including a non-standard
`success` — discovered by hitting `TypeError: logger.success is not a function` at runtime. A
`Proxy`-based logger answering any method name (silencing `debug`/`trace` to keep output readable)
satisfies this without adding a new dependency.

**Rationale**: The original per-file `prism mock <file> -p <port>` CLI-child-process design (superseded
below) does not satisfy Constitution Principle VIII's amended scale requirement. At 500+ APIs it means
500+ permanently-running Node/Prism processes and 500+ held ports, regardless of whether any given
mock is ever actually requested — this is not "config that changes at scale," it's a mechanism with a
real, low ceiling (OS process limits, port exhaustion, tens of GB of idle memory). A single gateway
process with **lazy** loading means cost is paid only for APIs a learner (or, at real scale, an
engineer) actually exercises, and the **only** thing that needs to change between a 3-API lab demo and
a 500-API deployment is a cache-size number (R7) — exactly what Principle VIII asks for.

**Alternatives considered**:
- One `prism mock` CLI process per file (original decision, this session) — rejected on re-review:
  linear process/port growth with no bound, fails the scale gate even though it "just works" via
  more config entries; flagged as the mistake this revision corrects.
- A bounded *pool* of live CLI child processes (spawn on demand, kill least-recently-used) — rejected
  as unnecessarily complex compared to the in-process library call once R1/R2's programmatic API was
  confirmed available; process spawn/teardown overhead is strictly worse than an in-memory cache hit.
- Hand-rolled static-JSON fixture server — still rejected for the same reason as before: loses
  "dynamic" generation from the spec's own examples/schemas.

**Open item flagged, not blocking**: first-request parse latency for the `transformOas3Operations`
call is reasoned to be low (tens of ms for a self-contained, few-dozen-path spec — a synchronous,
in-memory tree walk, no I/O beyond the initial file read) but has not been independently measured.
Tasks.md includes a step to log actual first-load latency during implementation rather than asserting
this figure as verified fact.

## R3: Which files to mock — discovery convention

**Decision**: Reuse Lab 4's existing `autoApiRegistration.rootPath`/`patterns` config
(`*-openapi.yaml`) as the single source of truth for which OpenAPI files exist, rather than
introducing a second glob configuration surface for mocking. The gateway (R2) builds its
`slug → specFilePath` map from this config once at startup.

**Rationale**: Avoids config drift between "what's registered in the catalog" and "what's mockable";
directly satisfies this session's clarification that mocking must be generic/available by default to
any registered OpenAPI API, not hardcoded to one example.

**Alternatives considered**: A separate `mocking.include` glob — rejected as duplicate, driftable
configuration for the same underlying file set.

**Correction found during implementation**: Museum (Lab 1/2's own sample API, and this lab's
primary walkthrough target — its native `servers` entry is fictitious/non-resolvable, which is
exactly why it makes a good mocking demo) is **not** covered by the above. Its spec file is
committed as a plain `labs/lab-01-base-backstage/apis/museum/openapi.yaml` — catalogued by hand
via a committed `catalog-info.yaml`, not by Lab 4's `EntityProvider` — so it sits outside Lab 4's
default `rootPath` *and* its filename can never match the `*-openapi.yaml` glob (no non-empty
prefix before `-openapi.yaml`) regardless of `rootPath`. This was only discovered by actually
building the discovery map and checking Museum's page against it, not by re-reading the plan.
Resolution (confirmed with the user rather than assumed): the gateway scans Lab 4's discovery
source **plus** one additional, explicitly-named source pointed at Lab 1's `apis/` directory with
its own pattern (`**/openapi.yaml`), configurable via `mocking.gateway.additionalSources` (default
covers exactly this case). This is a deliberate, documented divergence from "reuse Lab 4's config
as the *only* source of truth" — Lab 4's own glob is left completely untouched; one more source is
added alongside it rather than broadening it, so Lab 4's own scale/discovery story (R3 above,
research.md's Lab 4 R6) is unaffected.

## R4: Running the gateway alongside `yarn start`

**Decision (revised)**: Add `concurrently` as a root devDependency and run
`scripts/mock-gateway.mjs` alongside `backstage-cli repo start`:

```json
"start": "concurrently -n app,mocks \"backstage-cli repo start\" \"node scripts/mock-gateway.mjs\""
```

`wait-on` is **no longer needed** and has been dropped from the design. The original design used it
to sequence Backstage's startup against a *generated* proxy config file that had to exist first
(`app-config.mocks.yaml`); the revised design (R2, R5) needs no generated config at all — the gateway's
single port and single proxy endpoint are static, committed values in `app-config.yaml` that are valid
whether or not the gateway process has finished booting yet. The gateway only needs to be listening by
the time a learner actually clicks "Try it out," which is well after both processes have started.

**Rationale**: `backstage-cli repo start` already owns frontend/backend orchestration internally;
`concurrently` is the smallest addition that achieves "mock starts automatically with `yarn start`."
Removing `wait-on` and the generated-config race it existed to solve is a direct, welcome consequence
of moving to a single static gateway rather than N generated proxy entries. `concurrently`'s
`-k`/`--kill-others` flag is deliberately **not** used: quickstart.md's own verification steps
(and Constitution Principle VIII's "errors surface clearly" expectation, FR-008) call for stopping
*only* the gateway and confirming Backstage stays up and reports a clear connection error on the
next mock request — `-k` would tear down the whole `yarn start` session the moment the gateway
exits, which was only discovered by actually running that verification step, not reasoned about in
advance.

**Alternatives considered**: Implementing mocking as a Backstage backend plugin/module (the pattern
Lab 4 used for catalog discovery) — rejected: heavier (new backend module + registration), and this
lab's plan already avoids introducing a second backend module; a plain Node process is simpler to
explain and — usefully — works standalone outside Backstage too (a learner could curl the gateway
directly), which a backend-embedded route would not.

## R5: Proxy routing and CORS

**Decision (revised)**: A single, static proxy endpoint, committed directly in `app-config.yaml`:

```yaml
proxy:
  endpoints:
    /mock:
      target: 'http://localhost:4010'
      changeOrigin: true
      credentials: 'dangerously-allow-unauthenticated'
```

**Correction found during implementation**: Backstage's `app-config.yaml` has no config-to-config
interpolation syntax (`${...}` there only substitutes environment variables) — the original wording
above describing this as "interpolated from `mocking.gateway.port`" was aspirational, not something
that was ever actually implementable. Both values are committed as the same literal port number
(`4010`), with an inline comment noting they must be kept in sync manually — a single-line, one-time
cost, not a recurring maintenance burden. The frontend module computes each entity's mock URL as an
absolute URL resolved from `discoveryApiRef.getBaseUrl('proxy')`, not the originally-planned literal
`/api/proxy/mock/<entityNameSlug>` string — see the field-report correction below (R8) for why a
relative URL doesn't work. The Galaxy
API's pre-existing native `servers` entries (`galaxy.scalar.com`, `void.scalar.com`) continue to be
called directly by the browser, without a proxy hop — Scalar's public example services are designed
for direct external/browser calls.

**Rationale**: With one gateway instead of N mock processes, there is exactly one proxy target to
declare — no generated config, no per-API entries, no runtime file-write step at all. This is a
straightforward simplification that falls out of R2's redesign.

**Alternatives considered**: Per-API generated proxy entries (original decision, superseded) —
rejected along with the per-process design it existed to support.

## R6: Default non-production credential delivery

**Decision**: The default credential value is declared in `app-config.yaml` under a new
`mocking.defaultCredential` key (a documented, obviously fictional value, e.g.
`lab-mock-token-do-not-use`, per Constitution Principle IX). The frontend module (R1) reads it via
`configApiRef` and applies it by pre-authorizing Swagger UI's internal auth state on mount
(`onComplete(system) => system.authActions.authorize(...)`) — a genuine pre-fill of the same
"Authorize" dialog a learner would otherwise fill in themselves, not a server-side header rewrite.

**Rationale**: A static Backstage proxy `headers:` entry unconditionally sets/overwrites the
outgoing request's Authorization header on every proxied call — it cannot conditionally yield to a
learner's own credential, which would silently break FR-007 ("supply your own credential,
overriding the default"). A client-side pre-fill is naturally editable through the exact same UI
control the learner would use anyway, so "default that's easy to override" falls out of the
mechanism for free.

**Alternatives considered**: Unconditional proxy-level header injection — rejected, breaks override.
Requiring learners to always enter a credential manually — rejected, fails FR-006 ("succeeds by
default without any learner setup").

**Corrections found during implementation** (both confirmed live, in a browser, not assumed):
- A new custom config key read via `configApiRef` is invisible to the frontend by default —
  Backstage's config-schema/visibility system only exposes keys declared `@visibility frontend`
  in a `config.d.ts` file, and only for packages that declare `"configSchema": "config.d.ts"` in
  their own `package.json`. Without that declaration, `mocking.defaultCredential.*` silently came
  back as `undefined` client-side (confirmed by inspecting the `<script type="backstage.io/config">`
  payload the backend serves — the two keys appeared under `filteredKeys`, i.e. stripped). Fixed by
  adding both `packages/app/config.d.ts` (declaring `mocking.defaultCredential.{scheme,value}` as
  `@visibility frontend`) and `"configSchema": "config.d.ts"` to `packages/app/package.json`.
- `getApiDefinitionWidget(apiEntity)`'s returned widget's `component: (definition: string) => ...`
  only ever receives the raw definition *string* (confirmed by `ApiDefinitionWidget`'s type
  signature) — the full `apiEntity` is available in the *outer* `getApiDefinitionWidget` closure,
  not inside `component`, which is what this lab's widget factory relies on to compute the mock URL
  and merged servers list per entity. Separately, `OpenApiDefinitionWidget` (and the
  `OpenApiDefinition` it lazily renders) spread all received props onto `swagger-ui-react`'s own
  `<SwaggerUI>` *after* its own internal `spec={definitionState}`, so passing an extra `spec` prop
  through the widget (a full parsed-and-merged document object, not the original string) overrides
  the internally-rendered one — confirmed by reading `OpenApiDefinition.esm.js`'s source, and this
  is exactly the mechanism this lab's widget uses to inject the "Local mock (Lab 5)" server entry
  without needing any support from `@backstage/plugin-api-docs` itself.

## R7: Constitution Principle VIII — why this mechanism actually scales

**Decision**: Adopt an explicit, documented cache bound, `mocking.gateway.maxCachedSpecs` (default
100 in the lab's `app-config.yaml`), governing the LRU cache in R2. Document this as the *one* knob
that changes between the lab's demo scale (3–4 APIs) and a real deployment (500+ APIs) — no code or
architecture change.

**Rationale — mapped directly against the amended Principle VIII**:
- **Process/port count is O(1)**, not O(APIs): exactly one Node process and one port, regardless of
  whether the catalog has 4 APIs or 5,000. This is the property the original per-file-process design
  (R2, superseded) lacked, and is the actual scale fix, not a documentation-only reframing.
- **Memory cost is O(actively-used APIs), not O(catalog size)**: an unused API's spec is never parsed
  or held in memory at all (lazy load). Even a fully "warm" cache of `maxCachedSpecs: 100` mid-size
  OpenAPI specs (a few hundred KB of parsed operations each, generously) is on the order of tens of
  MB — versus tens of GB for 500 permanently-running Prism processes under the original design.
- **The only lab-only simplification that does not itself generalize**: discovery of the
  `slug → specFilePath` map happens once at gateway startup (R3), not on a live-reload/watch basis —
  a newly added API requires a gateway restart to become mockable. This mirrors Lab 4's own
  `mode: 'poll'` vs. `mode: 'watch'` framing (Lab 4's research.md R6) and is flagged the same way here
  per Principle VIII's requirement to call out simplifications explicitly: the README documents that a
  real, frequently-changing 500+ API mono-repo would want the same kind of watch-based refresh Lab 4
  already introduces for catalog discovery, applied here to the gateway's slug map — a config/mode
  change, not a redesign.

This principle-mapping section exists specifically because the original (superseded) R2/R4/R5
decisions were written and approved before Constitution Principle VIII's scale requirement was
amended in, and did not actually satisfy it on review — this file's revision is that correction.

## R8: Field-report correction — mock requests failed end-to-end (issues.md Run 1)

**What was found**: A learner-run walkthrough of quickstart.md Step 7 reported
`GET /api/proxy/mock/museum-api/museum-hours` returning a 404, with no corresponding log activity
in the gateway — meaning the request never reached it at all. Reproducing this against a clean
`yarn start` surfaced two independent, previously-undocumented bugs — not one:

1. **The frontend module's mock URL was a hardcoded relative path** (`` `/api/proxy/mock/${entity.metadata.name}` ``,
   R1/R5 as originally written). In `yarn start`, the frontend (`http://localhost:3000`) and
   backend (`http://localhost:7007`) are different origins. A relative URL resolves against
   whichever origin issues the request — the *frontend's* own dev server, which has no such route
   and answers with its own 404/SPA-fallback before the backend's proxy plugin is ever involved.
   Confirmed directly: curling the same path against `:3000` returns the dev server's `index.html`
   (or a bare 404, matching the original report); the identical path against `:7007` reaches the
   real proxy plugin. This is latent even in a packaged/production deployment where app and
   backend are typically served from one origin — which is exactly why a static read of the code
   didn't catch it; only running it did.
2. **The `/mock` proxy endpoint rejected even a correctly-routed request.** Hitting `:7007`
   directly returned `401 { "error": { "name": "AuthenticationError", "message": "Missing
   credentials" } }`. `@backstage/plugin-proxy-backend`'s default `credentials` policy (`require`)
   demands a Backstage user/service token on every proxied request unless an endpoint opts out.
   Swagger UI's "Try it out" issues a plain `fetch()`/`XMLHttpRequest` — it is not a Backstage
   frontend calling through `fetchApiRef`, so it never carries that token. This would have 401'd a
   real learner's browser request just as it did curl, independent of bug 1.

**Decision**: Fix both, and treat them as load-bearing, not incidental:

- The frontend module resolves the mock URL from `discoveryApiRef.getBaseUrl('proxy')` (called via
  `useApi(discoveryApiRef)` in `MockableOpenApiWidget`, resolved into state in a `useEffect`, and
  used inside the existing `useMemo` once available) instead of a hardcoded relative string. This
  is the same discovery mechanism every other Backstage frontend plugin uses to find the backend,
  and it resolves correctly whether frontend/backend are same-origin (packaged) or split
  (`yarn start`).
- `proxy.endpoints['/mock']` sets `credentials: 'dangerously-allow-unauthenticated'` (documented
  directly in `@backstage/plugin-proxy-backend`'s own config schema for exactly this case). This is
  acceptable specifically because the mock gateway has no real data or side effects behind it — the
  same justification the Security Note already uses for the shared default credential — and would
  not be an appropriate default for a proxy target fronting anything real.

**Alternatives considered**: Having the frontend module call the mock gateway directly (bypassing
the Backstage proxy entirely) — rejected; it would reintroduce the CORS problem R5 exists to avoid,
and lose the "one static, auditable proxy target" property FR-004 relies on. Leaving the proxy at
its default `credentials: 'require'` and instead having the frontend module attach a Backstage
token to Swagger UI's request — rejected; `swagger-ui-react` has no supported hook for injecting
per-request auth headers into requests it issues internally (`onComplete`/`authActions.authorize`
only manages the spec's own declared security schemes, not the transport layer to the proxy
itself), and even if it did, it would conflate "credentials to reach the mock" with "credentials
mocking.defaultCredential is documented as demonstrating" (R6) — the two are unrelated by design.

**Rationale for surfacing this as its own research entry rather than silently editing R1/R5**:
Constitution Principle VIII/IX-style review already found one correction worth being explicit about
mid-plan (the per-process design in R2); this is the same pattern one layer later — found by
running the implementation, not by reading it more carefully in advance, and worth keeping visible
for the same reason.

## R9: Field-report correction — the credential pre-fill silently never applied to the real sandbox (issues.md Run 2)

**What was found**: A learner-run walkthrough of quickstart.md/README Step 9 reported two problems: (1) the
instruction to "open the lock icon / Authorize dialog" gave no guidance once inside it — Galaxy's `GET /me`
presents 11 distinct authorization sub-sections/buttons and none appeared to contain pre-filled data, so the
learner could not tell what to do; (2) `GET /me` worked against the local mock with no credential entered, as
documented, but returned `401` against the real `galaxy.scalar.com` sandbox — contradicting Step 9's claim that
the pre-filled default "succeeds automatically... against either the mock or a native sandbox server."

Investigating both against the running implementation (via a scripted Playwright session driving the real
Galaxy page, not just re-reading the code) found **one real code defect** behind both symptoms, not a
documentation-only issue as first suspected:

1. **Section count is real and expected**: Galaxy's `GET /me`
   (`labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml`) declares `security: [basicAuth,
   oAuth2(read:account), bearerAuth, apiKeyHeader, apiKeyQuery, apiKeyHeader+apiKeyQuery]` — six alternatives.
   Swagger UI renders one block per scheme, one per `oAuth2` *flow* (three), plus two more it derives by fetching
   Galaxy's own OpenID Connect discovery document at `/.well-known/openid-configuration` — 11 sections in total,
   confirmed by counting `.auth-container` elements in a live-rendered page. Only `bearerAuth` was ever meant to
   be pre-filled (R1/R6); this part is inherent to Galaxy's spec and not a bug, but Step 9 never told the learner
   which section to look at.
2. **The pre-fill itself was silently broken — the real bug**: instrumenting `MockableOpenApiWidget` and
   capturing the network tab live showed `buildAuthorization()` correctly computed `{ bearerAuth: {...} }`, but
   the `onComplete` callback that calls `system.authActions.authorize(...)` **never fired at all**, and the
   outgoing `GET /me` request to `galaxy.scalar.com` carried no `Authorization` header whatsoever — not "a
   fictional token that got rejected," but no token at all. Root cause: the component's early-return fallback
   (`if (!mergedSpec) return <OpenApiDefinitionWidget definition={definition} />`) fires on the *first* render,
   before `proxyBaseUrl` has resolved via its `useEffect` — with no `spec`/`onComplete` props at all. `swagger-ui-
   react`'s internal system is constructed once, using whatever `onComplete` it was given at that first mount;
   a later re-render that adds `onComplete` (once `proxyBaseUrl`/`mergedSpec` become available) does not requery
   or reconstruct that system, so the callback that was supposed to call `authorize()` is permanently dropped for
   that page view. This is exactly why the **mock** appeared to work "with the pre-fill" — Prism's
   `mock: { dynamic: false }` instance never actually validates (or even requires) the bearer token's contents,
   so an *unauthenticated* request against the mock still returns Museum/Galaxy's example response regardless;
   the mock's apparent success masked the fact that authorization was never actually being sent anywhere.

**Decision**: Fix the real defect in code, then correct the docs to match the now-true behavior:

- `MockableOpenApiWidget` (`labs/lab-05-mocking-testing/code/packages/app/src/modules/apiMocking/index.tsx`,
  copied into `labs/lab-01-base-backstage/backstage/packages/app/src/modules/apiMocking/index.tsx`) now renders
  `null` while `proxyBaseUrl` is still resolving, instead of mounting the plain `OpenApiDefinitionWidget` with no
  `onComplete`. `OpenApiDefinitionWidget`/`SwaggerUI` is now only ever mounted once, already carrying its final
  `spec` and `onComplete`, since `proxyBaseUrl` resolution is a single near-instant local `discoveryApi` call and
  the render gap is not learner-perceptible. Re-verified live via the same Playwright session: `bearerAuth`'s
  authorized state is now set before the widget ever paints, the outgoing `GET /me` request to
  `galaxy.scalar.com` now carries `Authorization: Bearer lab-mock-token-do-not-use`, and the real sandbox returns
  `200` — Step 9's original claim ("succeeds automatically against either the mock or a native sandbox") is now
  actually true, as originally intended, rather than needing to be walked back.
- Step 9 (README and quickstart.md) is still updated to name the 11 sections and point at `bearerAuth`
  specifically, and to note that an already-authorized scheme renders as a padlock/"logged in" state with no
  visible text box (not a filled-in string), which is what made the one working section easy to miss among ten
  empty ones — this part of the original report stands as a genuine, worthwhile documentation clarification even
  though the underlying request now succeeds.
- The `POST /auth/token` → paste-into-`bearerAuth` walkthrough is retained as the FR-007/SC-004 "supply your own
  credential" demonstration — now correctly framed as an optional override of an already-working default, not as
  a workaround for a failure.

**Alternatives considered**: Leaving the early-return fallback in place and instead re-invoking `authorize()`
imperatively after `mergedSpec` becomes available (e.g., via a `ref` to the mounted system) — rejected: would
require capturing and holding a reference to `swagger-ui-react`'s internal system object across renders purely
to work around a self-inflicted mount-order issue, when simply not mounting the widget prematurely removes the
problem entirely and is a one-line change. Documenting the sandbox's `401` as expected behavior without fixing
anything (this research entry's own first draft, written before live Playwright instrumentation) — rejected on
further verification: the sandbox does not, in fact, reject the fictional default when the header is actually
sent, so that framing was itself a misdiagnosis worth correcting rather than committing to the docs.

**Rationale for surfacing this as its own research entry rather than folding it into R6/R8**: same pattern as
R8's own rationale — found by running the implementation and having a learner exercise it, not by reading the
docs more carefully in advance; worth keeping visible as its own dated field-report entry for the same reason.
