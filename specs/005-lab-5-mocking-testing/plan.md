# Implementation Plan: Lab 5 — Mocking and Testing

**Branch**: `005-lab-5-mocking-testing` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-lab-5-mocking-testing/spec.md`

## Summary

Lab 5 builds on the running Backstage 1.51.0 instance from Labs 1–4. It adds two capabilities to
every registered OpenAPI API's page: a locally running, dynamically generated mock implementation
and a documented public sandbox target for APIs that already have one natively (the Galaxy API's
`galaxy.scalar.com`/`void.scalar.com` servers — FR-003). Mocking is served by a **single, in-process
gateway** (`scripts/mock-gateway.mjs`) rather than one process per API: it reuses Lab 4's discovery
config to build a cheap `slug → spec file` map at startup (FR-001, FR-005, research.md R3), then
lazily parses and caches (LRU-bounded) each API's operations — via Stoplight Prism's programmatic
library (`@stoplight/prism-http` + `@stoplight/http-spec`, not the `prism` CLI) — only on that API's
first request (research.md R2). This design was revised mid-plan after review against Constitution
Principle VIII's amended scale requirement: an earlier one-process-per-API design would have meant
500+ permanently-running processes/ports for a 500-API deployment regardless of use, which fails the
"mechanism doesn't need to change at scale, only sizing" bar; the single lazy-loading gateway's only
scale knob is a cache-size config value (`mocking.gateway.maxCachedSpecs`, research.md R7). Both mock
and sandbox targets are selectable from the API's existing "Try it out" viewer without editing any
committed spec file's `servers` array — instead, a new frontend module
(`packages/app/src/modules/apiMocking/`) overrides the `apiDocsConfigRef` API, the same
wrapper-module pattern Lab 3 used for `apiGrade`/`spectralLinter`, since Backstage's default OpenAPI
viewer has no built-in config-level toggle for extra servers or credential injection (research.md
R1). The gateway starts automatically alongside `yarn start` via `concurrently` (FR-001, research.md
R4). Requests to the mock are routed through a single, static Backstage proxy endpoint (committed
directly in `app-config.yaml`, no generated config file) to avoid CORS; Galaxy's sandbox is called
directly since its native `servers` entries already work (FR-004, research.md R5). A documented,
fictional default credential lives in `app-config.yaml` and is applied by pre-authorizing Swagger
UI's own "Authorize" dialog on mount — not a proxy header rewrite, since a static header can't yield
to a learner's own credential — giving "default that works out of the box, freely overridable" for
free from the same UI a learner would use anyway (FR-006, FR-007, research.md R6). Errors (mock not
running, sandbox unreachable, bad credential) surface through the viewer's own request/response
handling, not a bespoke error system (FR-008). A `## Security Note` section (Constitution Principle
IX / Lab Structure Standards) documents the shortcut and the production alternative before the
learner encounters the default credential.

## Technical Context

**Language/Version**: TypeScript / Node.js 20 LTS (Backstage 1.51.0, pinned from Lab 1)

**Primary Dependencies**:
- `@stoplight/prism-http@5.15.11` (Apache-2.0) — new root devDependency; programmatic mock-response
  library (`createInstance(...).request(...)`), used directly by the gateway instead of the `prism`
  CLI, so a single process can serve every API without binding one port per API (research.md R2).
- `@stoplight/http-spec@7.1.0` (Apache-2.0) — new root devDependency; `transformOas3Operations()`
  (subpath `@stoplight/http-spec/oas3`) converts a parsed OpenAPI document into the operations shape
  `prism-http` consumes (research.md R2).
- `js-yaml` (new root devDependency) — parses each spec file's YAML before conversion (same package
  Lab 4 already uses in `packages/backend`, added here as a separate root devDependency since this
  script runs outside that package).
- `concurrently` (new root devDependency) — runs the mock gateway alongside `backstage-cli repo
  start` (research.md R4); not previously present anywhere in the workspace. `wait-on` is
  deliberately **not** added — the revised design has no generated config file to wait for
  (research.md R4/R5).
- `@backstage/plugin-api-docs` (already installed, `^0.14.1`) — supplies `apiDocsConfigRef` and
  the default `OpenApiDefinitionWidget`/`swagger-ui-react` rendering this lab wraps, not replaces
  (research.md R1).
- No new backend Backstage module — unlike Lab 4, this lab needs no `EntityProvider`/catalog
  changes; it only reads Lab 4's existing discovery config.

**Storage**: No generated/uncommitted config file (the superseded per-API-process design generated
`app-config.mocks.yaml`; the revised single-gateway design needs only static, committed config — data
-model.md). Two new committed config blocks in `app-config.yaml`: `mocking.gateway`
(`port`, `maxCachedSpecs`) and `mocking.defaultCredential`, plus one static `proxy.endpoints['/mock']`
entry. All in-memory state (discovery map, LRU spec cache) is rebuilt on every gateway restart — no
database changes.

**Testing**: Manual browser + orchestrator-log verification per lab README (no automated test
suite — consistent with Labs 1–4's tutorial-lab testing approach).

**Target Platform**: Local development machine — Windows 10/11 and macOS 12+ (same as Labs 1–4).

**Project Type**: Tutorial lab — Markdown documentation + a small Node orchestrator script + one
new TypeScript frontend module (`apiDocsConfigRef` override) + config additions.

**Performance Goals**: A learner can select the mock target and receive a response within the same
interaction as any other "Try it out" request (SC-001); the gateway itself boots near-instantly
(only a cheap file-glob at startup, no per-API parsing — parsing is deferred to first request per
API, research.md R2). At real mono-repo scale (500+ APIs), process/port count remains exactly 1
regardless of catalog size (research.md R7) — the only scale-sensitive knob is
`mocking.gateway.maxCachedSpecs`, documented as needing to be raised (config only) for a
deployment where many distinct APIs are actively exercised concurrently (quickstart.md).

**Constraints**: Zero cost; cross-platform; no external network access beyond the optional Galaxy
sandbox calls (User Story 2), which remain optional relative to the fully local mock path (FR-011);
builds on Labs 1–4 without editing any previously committed spec file's native `servers` array
(this session's clarification) or disrupting existing registered APIs.

**Scale/Scope**: Lab demo: 1 new gateway script, 1 new frontend module (~2-3 files), 3
new/modified config blocks (`mocking.gateway`, `mocking.defaultCredential`, one static `proxy`
entry, plus the root `start` script), 4 new root devDependencies, 0 new sample API files (reuses
Museum + Galaxy from Labs 1 & 4), 0 changes to any existing committed API spec file. Designed-for
scale (config change only, no code/architecture change, per research.md R7): 500+ APIs, O(1)
processes/ports, memory bounded by `maxCachedSpecs` rather than catalog size.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Feature-Focused Learning | Lab demonstrates concrete Backstage features: `apiDocsConfigRef` customization for target-server injection and credential pre-fill, dynamic OpenAPI mocking via Prism's programmatic library, and Backstage proxy config for CORS-safe frontend calls | ✅ Pass |
| II. Process-Oriented Documentation | README must explain WHY `apiDocsConfigRef` override was necessary (no built-in toggle, research.md R1), WHY a single lazy-loading gateway replaced an initial one-process-per-API design after Principle VIII review (research.md R2/R7 — a concrete worked example of the principle, worth calling out explicitly to learners), WHY a static proxy header was rejected in favor of an Authorize-dialog pre-fill (research.md R6), and WHY Galaxy needs no additional proxy config while Museum's mock does (research.md R5). The gateway script and frontend module are each likely >50 lines and MUST be committed under `labs/lab-05-mocking-testing/code/` and linked from the README, not inlined | ✅ Pass (with file-size rule flagged for tasks) |
| III. Cross-Platform Compatibility | Gateway script, `concurrently`, `@stoplight/prism-http`/`@stoplight/http-spec`/`js-yaml` are pure JS, no native/platform-specific dependencies; `yarn start` continues to work identically on Windows and macOS; README documents any PowerShell vs. bash quoting differences for the modified `start` script string | ✅ Pass |
| IV. Self-Contained Prerequisites | No new prerequisites beyond Labs 1–4's existing Node/Yarn setup — all four new dependencies install via the existing `yarn add` workflow; README documents the install step | ✅ Pass |
| V. Zero-Cost Operation | `@stoplight/prism-http`/`@stoplight/http-spec` are Apache-2.0 (free/open-source, satisfies Principle V's "freely available under open-source or freeware terms" though not MIT specifically); `js-yaml`/`concurrently` are MIT; Galaxy's public sandbox is free; no paid service, and the fully local mock path (User Story 1) has zero dependency on external network availability (FR-011) | ✅ Pass |
| VI. Progressive Lab Structure | Requires Labs 1–4 completion; reuses Lab 4's discovery config and Lab 1/4's Museum/Galaxy specs unmodified; no prior lab's committed spec file is edited | ✅ Pass |
| VII. Modern & Purposeful API Examples | No new sample API is introduced — Museum and Galaxy, both already compliant per their own labs' plans, are reused as-is | ✅ Pass (N/A, no new example) |
| VIII. Support Experimentation & Scale | README documents adaptable conventions: gateway port, cache size, reliance on Lab 4's discovery glob, the default credential value; verification tests outcomes (a response comes back, the credential used is the one displayed), not implementation internals. **Scale** (this row was corrected mid-plan — see research.md R2/R7): the mechanism is a single gateway process handling every discovered API via lazy load + a bounded LRU cache, so process/port count is O(1) regardless of catalog size and memory is bounded by `mocking.gateway.maxCachedSpecs`, not by total API count — the *only* thing that changes between the lab's 3–4-API demo and a 500+-API deployment is that config value. The one flagged lab-only simplification (discovery is boot-time-only, not live-watched) is explicitly documented, mirroring Lab 4's poll/watch framing, per the principle's requirement to call out non-generalizing simplifications rather than leave them implicit | ✅ Pass |
| IX. Pragmatic Security for Learning Environments | `mocking.defaultCredential` is a fictional, clearly-labelled example value stored in committed `app-config.yaml`; a `## Security Note` section (before the learner encounters the credential config step) explains the shortcut and the production alternative (secrets manager / vault-injected config, per-user credentials, never committing real credentials) | ✅ Pass (new obligation: Security Note section required, first for this lab series to introduce a credential) |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/005-lab-5-mocking-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

No `contracts/` directory — this lab produces no external API contracts of its own. The static
`mocking`/`proxy` config shapes are documented in data-model.md instead.

### Source Code (repository root)

```text
labs/
└── lab-05-mocking-testing/
    ├── README.md                        # Lab documentation (overview, prereqs, steps,
    │                                    # verification, troubleshooting, Security Note,
    │                                    # adaptable conventions per US-adaptation goal)
    └── code/
        ├── scripts/
        │   └── mock-gateway.mjs         # New: single in-process mock gateway (discovery map,
        │                                # lazy load + LRU-bounded spec cache, Prism
        │                                # programmatic request handling) — committed here,
        │                                # linked from README per Constitution Principle II
        │                                # (research.md R2, R7)
        └── packages/
            └── app/
                └── src/
                    └── modules/
                        └── apiMocking/
                            └── index.tsx  # New: apiDocsConfigRef override — merges mock/
                                           # sandbox servers, pre-authorizes Swagger UI with
                                           # the default credential (research.md R1, R6)
```

Changes to the student's Backstage instance (guided by README, not committed as generated output,
but the module/script source itself IS committed since it is lab teaching content):

```text
# In the student's Backstage instance (labs/lab-01-base-backstage/backstage/):
package.json                                   # Modified: add @stoplight/prism-http,
                                                # @stoplight/http-spec, js-yaml, concurrently;
                                                # change "start" script (research.md R4)
app-config.yaml                                # Modified: add mocking.gateway,
                                                # mocking.defaultCredential, and the static
                                                # proxy.endpoints['/mock'] entry (data-model.md)
scripts/
└── mock-gateway.mjs                           # New: copied from labs/lab-05-.../code/scripts/
packages/app/
└── src/
    ├── apis.ts                                # Modified: register the apiMocking module
    └── modules/
        └── apiMocking/
            └── index.tsx                      # New: copied from labs/lab-05-.../code/packages/
                                                # app/src/modules/apiMocking/
```

No `.gitignore` change is needed — the revised design generates no runtime config file (data-model.md).

**Structure Decision**: Tutorial-documentation layout, consistent with Labs 1–4. All
student-facing content lives under `labs/lab-05-mocking-testing/`; the gateway script and
frontend module are committed under its `code/` subdirectory (both exceed the ~40-50 line inline
threshold per Constitution Principle II) and linked from the README rather than embedded inline.
The student's Backstage instance (from Lab 1) is modified in place per the README instructions,
same pattern as Labs 3–4. No new sample API files are added — Museum (Lab 1) and Galaxy (Lab 4)
are reused unmodified. Speckit artefacts live under `specs/005-lab-5-mocking-testing/` per
convention.

## Complexity Tracking

No violations recorded — table omitted per template instructions.
