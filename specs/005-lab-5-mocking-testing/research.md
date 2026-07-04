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
2. If this slug's spec has not been loaded yet, read + `js-yaml`-parse the file and convert it to
   Prism's operation format via `@stoplight/http-spec`'s `transformOas3Operations(document)`
   (`@stoplight/http-spec@7.1.0`, subpath `@stoplight/http-spec/oas3`) — synchronous, in-memory,
   requires no external `$ref` bundling step for this lab's self-contained specs (Constitution
   Principle VII). Cache the resulting `IHttpOperation[]` in a bounded, LRU-evicted `Map`.
3. Call `.request()` on a single, gateway-lifetime `Prism.createInstance({ mock: { dynamic: false } })`
   instance (`@stoplight/prism-http@5.15.11`) with the translated request and the (now-cached)
   operations array, translate the returned mock response back to a real HTTP response.

Confirmed via direct inspection of `@stoplight/prism-http`'s README and `npm pack`/`npm view` on
both packages (not guessed): `createInstance(...).request(requestDescriptor, operations)` returns a
mocked response without binding any HTTP server/port of its own — it's a plain function call. No
`@stoplight/prism-cli` or `@stoplight/prism-http-server` dependency is needed; `@stoplight/prism-core`
is pulled in automatically as a dependency of `prism-http`.

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

## R4: Running the gateway alongside `yarn start`

**Decision (revised)**: Add `concurrently` as a root devDependency and run
`scripts/mock-gateway.mjs` alongside `backstage-cli repo start`:

```json
"start": "concurrently -k -n app,mocks \"backstage-cli repo start\" \"node scripts/mock-gateway.mjs\""
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
of moving to a single static gateway rather than N generated proxy entries.

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
      target: 'http://localhost:${mocking.gateway.port}'
      changeOrigin: true
```

(interpolated from the same `mocking.gateway.port` config key the gateway itself reads — single
source of truth, no drift). The frontend module computes each entity's mock URL as
`/api/proxy/mock/<entityNameSlug>` — one static prefix plus the same slug used throughout. The Galaxy
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
