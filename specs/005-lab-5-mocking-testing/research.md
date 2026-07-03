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

## R2: Mock server tooling

**Decision**: `@stoplight/prism-cli` (currently `5.15.11`, Apache-2.0), added as a root
`devDependency` and invoked as a child process (`prism mock <spec-file> -p <port>`) per discovered
OpenAPI file. Prism generates responses dynamically from a spec's own examples/schemas — matching
GOAL.md's "dynamically create... a mock implementation" requirement — and works against the
Museum API's self-contained spec (no external `$ref`s, per Constitution Principle VII) with no
further setup.

**Rationale**: Free, actively maintained, npm-installable (no JVM/Docker prerequisite), and purpose
-built for OpenAPI mocking.

**Alternatives considered**:
- WireMock — rejected: requires a JVM prerequisite not otherwise needed by any prior lab, adding
  friction (Constitution Principle IV).
- Hand-rolled static-JSON fixture server — rejected: loses "dynamic" generation from the spec's own
  examples/schemas; would drift from the spec instead of reflecting it.

## R3: Which files to mock — discovery convention

**Decision**: Reuse Lab 4's existing `autoApiRegistration.rootPath`/`patterns` config
(`*-openapi.yaml`) as the single source of truth for which OpenAPI files exist, rather than
introducing a second glob configuration surface for mocking.

**Rationale**: Avoids config drift between "what's registered in the catalog" and "what's mockable";
directly satisfies this session's clarification that mocking must be generic/available by default to
any registered OpenAPI API, not hardcoded to one example.

**Alternatives considered**: A separate `mocking.include` glob — rejected as duplicate, driftable
configuration for the same underlying file set.

## R4: Running mock server(s) alongside `yarn start`

**Decision**: Add `concurrently` and `wait-on` as new root devDependencies and a new
`scripts/start-mocks.mjs` orchestrator script. The script synchronously discovers OpenAPI files,
assigns each a deterministic port (sequential from `4010`, sorted by file path), and writes a
generated `app-config.mocks.yaml` containing one proxy endpoint per file — all before spawning the
long-lived Prism child processes. The root `start` script becomes:

```json
"start": "concurrently -k -n app,mocks \"wait-on ./app-config.mocks.yaml && backstage-cli repo start --config app-config.yaml --config app-config.mocks.yaml\" \"node scripts/start-mocks.mjs\""
```

`wait-on` guarantees the generated config file exists before `backstage-cli repo start` reads it,
avoiding a startup race between the two concurrent processes.

**Rationale**: `backstage-cli repo start` already owns frontend/backend orchestration internally;
adding a third independent process via `concurrently` (not currently a dependency anywhere in the
workspace) is the smallest change that achieves "mock starts automatically with `yarn start`," per
this session's clarification, without forking Backstage's own CLI.

**Alternatives considered**: Implementing mocking as a Backstage backend plugin/module (the pattern
Lab 4 used for catalog discovery) — rejected: heavier (new backend module + migration), and a poor
fit for supervising long-lived external child processes, which a plain Node script does more simply.

## R5: Proxy routing and CORS

**Decision**: Every discovered OpenAPI file gets a generated proxy endpoint
(`/api/proxy/mock/<entity-name-slug>`, using the same slugification as Lab 4's entity-name
derivation) targeting its local Prism instance, satisfying FR-004 (avoid browser CORS restrictions
via Backstage's existing proxy mechanism). The Galaxy API's pre-existing native `servers` entries
(`galaxy.scalar.com`, `void.scalar.com`) are called directly by the browser, without an additional
proxy hop — Scalar's public example services are designed for direct external/browser calls.

**Rationale**: Matches FR-003's "native list MAY continue to satisfy target selection without
additional configuration" and avoids proxying traffic that doesn't need it.

**Alternatives considered**: Proxying all sandbox traffic uniformly — rejected as unnecessary
complexity when the native `servers` mechanism already works for Galaxy.

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

## Deviation from the specify-session Clarifications wording

The spec's Clarifications/Assumptions describe the default credential as "injected via Backstage's
proxy configuration." Per R6, the credential *value* is still declared in `app-config.yaml` (i.e.
still "Backstage configuration," not a personal secret or a proxy-secret store), but the mechanism
that applies it to a request is a client-side Swagger UI pre-fill rather than a proxy header
rewrite — the literal "injected via proxy" implementation was found, during this research, to be
incompatible with the override requirement (FR-007). The functional outcome (default present,
sourced from documented lab config, learner can override) is unchanged.
