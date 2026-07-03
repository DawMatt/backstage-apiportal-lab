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

1. **Install dependencies**: add `@stoplight/prism-cli`, `concurrently`, and `wait-on` as root
   devDependencies of the Lab 1 Backstage workspace.
2. **Add the mock orchestrator script**
   (`scripts/start-mocks.mjs`): discovers OpenAPI files via Lab 4's existing
   `autoApiRegistration.rootPath`/`patterns` config, assigns each a deterministic port from
   `4010`, writes `app-config.mocks.yaml` with one proxy endpoint per file, then spawns one
   `prism mock <file> -p <port>` child process per file (research.md R2–R5, data-model.md).
3. **Update the root `start` script** to run the orchestrator and Backstage concurrently, with
   `wait-on` sequencing so Backstage only boots once `app-config.mocks.yaml` exists
   (research.md R4).
4. **Add `mocking.defaultCredential`** to `app-config.yaml` (data-model.md) — a documented,
   obviously fictional bearer token — and add `app-config.mocks.yaml` to `.gitignore` (it's a
   generated artifact, not committed).
5. **Add the `apiMocking` frontend module**
   (`packages/app/src/modules/apiMocking/index.tsx`): overrides `apiDocsConfigRef` for the
   `openapi` widget type to (a) merge a `Local mock (Lab 5)` server entry — computed from
   `entity.metadata.name`, no per-entity config needed — into the rendered `servers` list, and
   (b) pre-authorize Swagger UI's "Authorize" dialog with `mocking.defaultCredential` on mount
   (research.md R1, R6). Registered in `packages/app/src/apis.ts` (or equivalent frontend module
   registration point).
6. **Start Backstage** (`yarn start`) and confirm:
   - The mock orchestrator log shows a Prism instance started for the Museum API (and the other
     discovered OpenAPI files) on its assigned port.
   - Opening the Museum API's page in Backstage shows a `Local mock (Lab 5)` entry in the server
     dropdown alongside its native (non-resolvable) production URL.
7. **User Story 1 — mock**: select the `Local mock (Lab 5)` server for the Museum API, execute a
   sample "Try it out" request, and confirm a realistic example response comes back (US1, SC-001).
   Stop the mock orchestrator process, retry the same request, and confirm a clear connection
   error is shown (not a silent failure).
8. **User Story 2 — sandbox**: open the Galaxy API's page, confirm its native `servers` dropdown
   already offers `galaxy.scalar.com` / `void.scalar.com` with no additional Lab 5 configuration,
   select one, execute a request, and confirm the response comes from the real sandbox (US2,
   SC-002).
9. **User Story 3 — credentials**: on an authenticated request (mock or sandbox), confirm the
   "Authorize" dialog is already pre-filled with the `mocking.defaultCredential` value and the
   request succeeds with zero setup (SC-003). Replace it with a different value in the same
   dialog, confirm the replacement is what's actually sent (SC-004), and confirm
   `app-config.mocks.yaml`/no other file ever contains a personal credential.
10. **Verify a second, unconfigured API gets a mock automatically**: temporarily add a third
    `*-openapi.yaml` file matching Lab 4's discovery pattern, restart `yarn start`, and confirm a
    `Local mock (Lab 5)` entry appears for it too with zero Lab-5-specific configuration — proving
    the mechanism is generic, not hardcoded to Museum (this session's clarification). Remove the
    temporary file afterward.

## Out of scope for this quickstart

- AsyncAPI mocking (Streetlights) — explicitly out of scope per this session's clarification;
  README states this as a known limitation.
- Exercising a genuinely unreachable/CORS-blocked sandbox end-to-end (the lab's own Galaxy example
  is reachable and CORS-permissive); the resulting error-handling behavior (FR-008) is documented,
  not walked through against a real failure.

## Scaling beyond the lab (documented, not walked through)

The README includes a note on why default-port assignment (`4010 + index`, sorted by path) is
stable enough for a handful of lab APIs but would need an explicit, persisted port map for a large
mono-repo where files are added/removed frequently (to avoid every learner's mock ports shifting
on every restart) — mirroring the same "lab-scale convenience vs. real-scale mechanism" framing
Lab 4 used for its scan-state cache.
