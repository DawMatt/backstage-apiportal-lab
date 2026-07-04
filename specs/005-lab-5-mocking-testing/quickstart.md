# Quickstart: Lab 5 — Mocking and Testing

This is the design-time quickstart used to validate the plan; the learner-facing README (built in
`/speckit-tasks` + `/speckit-implement`) will follow the same flow with full explanatory prose per
Constitution Principle II.

## Prerequisites

- Labs 1–4 completed (running Backstage 1.51.0 instance, Lab 2 teams/visibility, Lab 3 quality
  tooling, Lab 4 auto-registration with Museum, Streetlights, Galaxy, and precedence-demo APIs
  registered).
- No new external accounts or services. No new OS-level prerequisites beyond the existing
  Node/Yarn toolchain.

## Steps

1. **Install dependencies**: add `@stoplight/prism-http`, `@stoplight/http-spec`, `js-yaml`, and
   `concurrently` as root devDependencies of the Lab 1 Backstage workspace.
2. **Add the mock gateway script**
   (`scripts/mock-gateway.mjs`): a single long-lived Node HTTP server, listening on
   `mocking.gateway.port` (default `4010`), that (a) at startup builds a cheap
   `entityNameSlug → spec file path` map from Lab 4's existing `autoApiRegistration`
   `rootPath`/`patterns` config, and (b) on each request to `/<slug>/*`, lazily loads + parses +
   converts that API's spec (`js-yaml` + `@stoplight/http-spec`'s `transformOas3Operations`) on
   first use only, caches the result in a `mocking.gateway.maxCachedSpecs`-bounded LRU map, and
   serves a mocked response via `@stoplight/prism-http`'s `createInstance(...).request(...)`
   (research.md R2, R3, R7; data-model.md).
3. **Add static config** to `app-config.yaml`: `mocking.gateway` (`port`, `maxCachedSpecs`),
   `mocking.defaultCredential`, and one static `proxy.endpoints['/mock']` entry pointing at the
   gateway's port (data-model.md) — no generated/uncommitted config file is produced by this lab.
4. **Update the root `start` script** to run the gateway and Backstage concurrently via
   `concurrently` (research.md R4) — no sequencing dependency needed, since the gateway's proxy
   target is a static config value valid from the moment Backstage starts.
5. **Add the `apiMocking` frontend module**
   (`packages/app/src/modules/apiMocking/index.tsx`): overrides `apiDocsConfigRef` for the
   `openapi` widget type to (a) merge a `Local mock (Lab 5)` server entry — URL
   `/api/proxy/mock/<entityNameSlug>`, computed from `entity.metadata.name`, no per-entity config
   needed — into the rendered `servers` list, and (b) pre-authorize Swagger UI's "Authorize"
   dialog with `mocking.defaultCredential` on mount (research.md R1, R6). Registered in
   `packages/app/src/apis.ts` (or equivalent frontend module registration point).
6. **Start Backstage** (`yarn start`) and confirm:
   - The gateway logs that it has built its discovery map (e.g. "N APIs discoverable") without
     parsing any of them yet.
   - Opening the Museum API's page in Backstage shows a `Local mock (Lab 5)` entry in the server
     dropdown alongside its native (non-resolvable) production URL.
7. **User Story 1 — mock, including lazy-load behavior**: select the `Local mock (Lab 5)` server
   for the Museum API, execute a sample "Try it out" request, and confirm a realistic example
   response comes back (US1, SC-001). Check the gateway log: the *first* request for Museum should
   log a "loading spec" line (and its measured parse latency — confirming research.md R2's
   reasoned-but-unverified latency claim in practice); subsequent requests to the same API should
   not re-log a load, confirming the cache is working. Stop the gateway process, retry the same
   request, and confirm a clear connection error is shown (not a silent failure).
8. **User Story 2 — sandbox**: open the Galaxy API's page, confirm its native `servers` dropdown
   already offers `galaxy.scalar.com` / `void.scalar.com` with no additional Lab 5 configuration,
   select one, execute a request, and confirm the response comes from the real sandbox (US2,
   SC-002).
9. **User Story 3 — credentials**: Galaxy's `GET /me` declares six alternative security schemes
   (`basicAuth`, three `oAuth2` flows, `bearerAuth`, `apiKeyHeader`, `apiKeyQuery`, and a combined
   `apiKeyHeader`+`apiKeyQuery`), plus two more Swagger UI derives from Galaxy's OpenID Connect
   discovery document — eleven sections total in the Authorize dialog, of which only `bearerAuth`
   is pre-authorized with `mocking.defaultCredential`. Executing `GET /me` with no credential
   entered succeeds against **both** the local mock (SC-003) and the real `galaxy.scalar.com`
   sandbox — confirm via the browser's network tab that `Authorization: Bearer
   lab-mock-token-do-not-use` was actually sent on the sandbox request even though nothing was
   typed. Then call `POST /auth/token` against the sandbox, paste the returned `token` into the
   `bearerAuth` field (replacing the pre-filled default), and confirm `GET /me` still succeeds with
   the request's `Authorization` header now showing the pasted token instead (SC-004). Confirm no
   committed file ever contains a personal credential.
10. **Verify a second, unconfigured API gets a mock automatically**: temporarily add a third
    `*-openapi.yaml` file matching Lab 4's discovery pattern, restart `yarn start` (the gateway's
    discovery map is boot-time-only, so a restart is expected/documented — research.md R7), and
    confirm a `Local mock (Lab 5)` entry appears for it too with zero Lab-5-specific
    configuration, and that its spec is only parsed on its own first request (not eagerly at
    gateway startup) — proving the mechanism is both generic (this session's clarification) and
    lazy (research.md R2/R7). Remove the temporary file afterward.

## Out of scope for this quickstart

- AsyncAPI mocking (Streetlights) — explicitly out of scope per this session's clarification;
  README states this as a known limitation.
- Exercising a genuinely unreachable/CORS-blocked sandbox end-to-end (the lab's own Galaxy example
  is reachable and CORS-permissive); the resulting error-handling behavior (FR-008) is documented,
  not walked through against a real failure.
- Exercising actual LRU eviction under load (the lab's 3–4 sample APIs never approach the default
  `maxCachedSpecs: 100` bound); the eviction *mechanism* is unit-testable in principle but not
  demonstrated live in this lab.

## Scaling beyond the lab (documented, not walked through)

The README includes a note on why this lab's mocking mechanism was deliberately redesigned, during
planning, away from an initial "one process per API" approach once checked against Constitution
Principle VIII's scale requirement — using this as a concrete, worked example for learners of what
"design for scale, defer the exercise of it" means in practice:
- Why process/port count is fixed at 1 regardless of catalog size (a single gateway, not one per
  API), and why that specific property — not just "it's configurable" — is what makes the design
  actually satisfy the principle (research.md R2, R7).
- Why `mocking.gateway.maxCachedSpecs` is the one value that needs to grow for a real, heavily-used
  500+ API deployment, and why raising it is cheap (bounded memory per cached spec) compared to the
  superseded design's fixed per-API process/port cost.
- Why the gateway's discovery map is boot-time-only (a documented, Lab-4-style poll/watch
  tradeoff) rather than live-refreshed, and what a `watch`-based refresh mode would look like if a
  learner's fork needs it (mirroring Lab 4's own `mode: 'poll'` vs. `mode: 'watch'` framing).
