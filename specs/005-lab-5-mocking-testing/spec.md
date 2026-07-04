# Feature Specification: Lab 5 - Mocking and Testing

**Feature Branch**: `005-lab-5-mocking-testing`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Create new feature and specification from feature 5 in GOAL.md" — Lab 5 (Mocking and testing): Add the ability to dynamically create and interact with a mock implementation of any API. Add the ability to interact with an existing test implementation of any API. Recommend an approach for managing and using non-production credentials for accessing these APIs. Users must be able to supply their own credentials if they have them.

## Clarifications

### Session 2026-07-04

- Q: Should dynamic mocking cover OpenAPI only, or also attempt AsyncAPI (message broker) APIs? → A: OpenAPI only — AsyncAPI/message-broker APIs are explicitly out of scope for dynamic mocking, documented as a known limitation, since $0 tooling for broker mocking is far less standardized than for HTTP/OpenAPI.
- Q: Where should the "existing test implementation" used in User Story 2 come from? → A: Public sandbox endpoints already run by real API providers (e.g. Lab 4's Scalar Galaxy API at `galaxy.scalar.com`), mirroring how real-world APIs commonly ship a public sandbox — no learner-hosted second service required.
- Q: How should non-production credentials be supplied when calling mock/test APIs from Backstage? → A: Backstage's proxy config injects a documented example non-production credential by default (per the constitution's allowance for example credentials in configuration), while learners with their own credentials can override this via the API viewer's client-side Authorize entry.
- Q: Which example APIs does this lab apply mocking/sandbox to? → A: The mocking mechanism itself MUST be generic and available by default to any registered OpenAPI API (not hardcoded to one example), while the lab's worked walkthrough uses the Museum API to demonstrate mocking (its `servers` entry is fictitious/non-resolvable) and the Galaxy API to demonstrate the sandbox path (it already has real, live servers from Lab 4).
- Q: Should the mock server's URL be added as a new entry to the API's own OpenAPI `servers` list, or overridden/injected at the Backstage plugin/config level? → A: Plugin/config-level override — the mock (and any lab-added test/sandbox target not already native to the spec) is exposed via Backstage plugin/proxy configuration, without editing the committed spec file's `servers` list. This keeps committed spec files representing production reality and avoids requiring learners to edit example API files just to try mocking.
- Q: Should starting the mock server be a separate manual step, or integrated into the existing local dev startup? → A: Integrated into dev startup — the mock server(s) start automatically alongside Backstage's existing local dev process (e.g. concurrently with `yarn start`), so mocking is available immediately whenever a learner runs the app, without a separate command to remember.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dynamically mock an API and try it from Backstage (Priority: P1)

As a learner exploring a registered OpenAPI-based API that has no reachable real backend, I want to generate a local mock implementation of that API and execute example requests against it directly from the API's page in Backstage, so I can understand and demonstrate the API's behavior without needing the real service to exist.

**Why this priority**: This is the core value of the lab — without it there is no "mocking" capability, and every other story builds on the same execution surface (the ability to send a request from the entity page and see a response).

**Independent Test**: Take a registered OpenAPI API whose spec `servers` entry is not reachable (e.g. the Museum API), start the local dev environment (which brings its mock server up automatically), select the mock as the active target from the API's page in Backstage, and successfully execute a sample request that returns a realistic example response.

**Acceptance Scenarios**:

1. **Given** a registered OpenAPI API with an example-rich specification, **When** a learner starts the existing local dev process, **Then** a locally running mock implementation for that API is automatically started alongside it and begins serving responses generated from the spec's own examples/schemas, with no separate mock-start command required.
2. **Given** a running mock implementation for an API, **When** a learner views that API's page in Backstage and selects the mock as the target, **Then** they can execute a request from within Backstage and receive a response from the mock — without leaving Backstage or using a separate tool.
3. **Given** the mock server is not currently running, **When** a learner attempts to execute a request against it from Backstage, **Then** they receive a clear, understandable connection error rather than a silent failure or generic browser network error.

---

### User Story 2 - Interact with an existing test implementation (Priority: P2)

As a learner, I want to point the same in-Backstage request execution at a real, already-running test/sandbox instance of an API (as opposed to a locally generated mock), so I can experience interacting with a genuine test deployment the way I would with a real-world API's sandbox environment.

**Why this priority**: Demonstrates the second half of the lab's premise — real APIs commonly expose a public test/sandbox environment distinct from a hand-generated mock — but depends on the request-execution mechanism established in User Story 1.

**Independent Test**: Select an API with a known public sandbox endpoint (e.g. the Galaxy API introduced in Lab 4), choose the test/sandbox target instead of the mock from that API's page in Backstage, execute a request, and confirm the response comes from the real sandbox service (not the local mock).

**Acceptance Scenarios**:

1. **Given** an API definition whose `servers` list includes a public test/sandbox URL, **When** a learner views that API's page in Backstage, **Then** they can select that sandbox server as the active target alongside (or instead of) the local mock, using the same execution surface from User Story 1.
2. **Given** a learner has selected the test/sandbox target, **When** they execute a request, **Then** the request is sent to the real sandbox endpoint and the response is displayed in Backstage.
3. **Given** the public sandbox endpoint is temporarily unreachable, **When** a learner attempts to execute a request against it, **Then** they receive a clear error rather than the lab appearing broken, and the documentation notes this is an expected risk of depending on third-party infrastructure the lab does not control.

---

### User Story 3 - Supply and manage non-production credentials (Priority: P2)

As a learner calling a mock or test API that requires authentication, I want a working default credential available out of the box, but also the ability to supply my own credential when I have one, so I can try authenticated requests immediately while still being able to use my own test account when applicable.

**Why this priority**: Directly addresses the credential-management goal called out in the lab's brief; it is a peer to User Story 2 in priority because both are needed for a learner to fully exercise an authenticated test API, but it is a distinct concern (identity/auth) from where the request is sent (target selection).

**Independent Test**: Execute a request against an authenticated mock/test endpoint with no credential entered and confirm the documented default non-production credential is used automatically; then enter a personal credential in the API viewer's Authorize entry and confirm subsequent requests use that value instead.

**Acceptance Scenarios**:

1. **Given** an API that requires authentication, **When** a learner executes a request without supplying any credential of their own, **Then** the request succeeds using a documented example non-production credential injected via Backstage's proxy configuration.
2. **Given** a learner has their own non-production credential for an API, **When** they enter it via the API viewer's Authorize/credential entry, **Then** subsequent requests use the learner-supplied credential instead of the default, and this credential is not written to any file in the repository.
3. **Given** the lab documentation, **When** a learner reads the credentials section, **Then** they can identify both the shortcut taken in the lab (a shared example credential committed to configuration) and the recommended production approach (e.g. a secrets manager or vault-injected proxy configuration, per-user credentials, and never committing real credentials to source control).

---

### Edge Cases

- What happens when a learner tries to generate a mock for an AsyncAPI-defined API? The lab documentation MUST state this is out of scope and explain why, rather than the learner discovering a silent failure.
- What happens when the mock server's port is already in use, or the mock-server tooling is not installed? The learner MUST receive a clear, actionable error message pointing at the missing prerequisite or conflicting port, surfaced as part of the local dev startup output rather than requiring a separate diagnostic step.
- What happens when an API specification has no meaningful examples for its schemas? The mock implementation MUST still respond (using schema-derived placeholder values) rather than failing to start.
- What happens when a learner enters an invalid or expired personal credential? The API viewer MUST surface the resulting authentication error from the target server as-is, not mask it as a generic failure.
- How does the system prevent the default example credential from being mistaken for a real production credential? Lab documentation MUST explicitly label it as non-production/example-only, consistent with the constitution's allowance for simplified example credentials.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically start a local mock server that generates responses from a registered OpenAPI API's own examples and schemas, as part of the existing local dev startup process (e.g. alongside `yarn start`), without requiring the API's real backend to exist or be reachable and without a separate manual command to start the mock. This mechanism MUST be generic — usable by default against any registered OpenAPI API, not hardcoded to a single example — even though the lab's walkthrough demonstrates it using one specific API (the Museum API).
- **FR-002**: The system MUST let a learner execute requests against a running mock server directly from that API's page in Backstage, using the request-execution surface already available there (not a separate standalone tool).
- **FR-003**: The system MUST let a learner select, from the same API page, between the local mock and any documented public test/sandbox server for that API as the active request target. Target options that are not already part of the API's own native `servers` list (in particular, the mock) MUST be exposed via Backstage plugin/proxy configuration rather than by editing the committed spec file; where an API's spec already natively declares multiple `servers` (e.g. the Galaxy API), that native list MAY continue to satisfy target selection without additional configuration.
- **FR-004**: The system MUST route requests made from the Backstage frontend through Backstage's existing proxy mechanism, avoiding browser CORS restrictions, consistent with the proxy configuration pattern already present in the app.
- **FR-005**: The system MUST clearly document that dynamic mocking is scoped to OpenAPI-defined APIs only; AsyncAPI/message-broker APIs are explicitly out of scope for mock generation in this lab.
- **FR-006**: The system MUST supply a documented example non-production credential, injected via Backstage's proxy configuration, so authenticated mock/test requests succeed by default without any learner setup.
- **FR-007**: The system MUST allow a learner to supply and use their own non-production credential when interacting with a mock or test API, overriding the default, without that personal credential being written to any file committed to the repository.
- **FR-008**: The system MUST surface clear, actionable errors — not generic or silent failures — when the mock server is not running, when a public test/sandbox endpoint is unreachable, or when a supplied credential is rejected by the target server.
- **FR-009**: Lab documentation MUST explain both the simplified credential-handling shortcut used in the lab (a shared example credential in configuration) and the recommended production approach (per-user credentials sourced from a secrets manager, never committed to source control), per the constitution's guidance on simplified security practices.
- **FR-010**: Lab documentation MUST identify which parts of the mocking/testing configuration (mock tooling choice, which APIs have public sandboxes, credential values) are conventions learners are expected to adapt to their own APIs, per Constitution Principle VIII.
- **FR-011**: The lab MUST run entirely on local, freely available tooling with $0 cost, requiring no paid mock/testing service (Constitution Principle V); reliance on a third-party public sandbox endpoint (User Story 2) MUST remain optional relative to the fully local mock path (User Story 1), so the lab's core mocking capability does not depend on external infrastructure being available.
- **FR-012**: The lab MUST build upon the environment established by Labs 1-4 (base Backstage setup, users/roles/teams and visibility, API quality tooling, auto-registered API entities) without requiring those labs to be redone.

### Key Entities

- **Mock Implementation**: A locally running process that serves responses for a single OpenAPI API, generated from that API's own spec examples/schemas, started automatically as part of the existing local dev startup process and stopped alongside it (no separate lifecycle for the learner to manage).
- **Test/Sandbox Endpoint**: A real, already-running public server for a given API — either declared via that API's own native `servers` list (e.g. Galaxy) or exposed through Backstage plugin/proxy configuration when not already native to the spec — that a learner can select as an alternative to the local mock, without controlling or hosting it themselves.
- **Request Target Selection**: The mechanism, surfaced on the API's page in Backstage, by which a learner chooses which server (mock, sandbox, or any other declared/configured server) receives requests executed from the API viewer, sourced from the spec's native `servers` list and/or Backstage plugin/proxy configuration.
- **Non-production Credential**: A documented example credential value, either the shared default injected via Backstage's proxy configuration or a learner-supplied personal value entered client-side, used only against mock/test endpoints and never a real production secret.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner who starts the local dev environment as usual has the mock server for an OpenAPI API already running with no extra step, and can successfully execute a request against it from within Backstage, receiving a realistic example response.
- **SC-002**: A learner can switch the active request target between the local mock and a public test/sandbox endpoint for the same API, from the same page in Backstage, without editing the underlying catalog entity or spec file.
- **SC-003**: A learner can execute an authenticated request against a mock/test API with zero credential setup of their own, using the documented default credential, on the first attempt.
- **SC-004**: A learner with their own non-production credential can override the default and confirm their credential was used, with zero personal credentials ever appearing in a file committed to the repository.
- **SC-005**: A learner who introduces a connectivity problem (mock not running, sandbox unreachable, bad credential) can identify the cause from a clear, visible error without inspecting system internals or logs outside Backstage.
- **SC-006**: The lab's core mocking capability (User Story 1) functions with zero paid services and zero dependency on external network availability; only the optional sandbox path (User Story 2) depends on third-party infrastructure.

## Assumptions

- "Any API" from the lab's brief is interpreted as any OpenAPI-defined API for dynamic mock generation; AsyncAPI/message-broker APIs are explicitly out of scope for mocking in this lab, documented as a known limitation rather than silently unsupported.
- The request-execution ("try it out") surface used throughout this lab is the existing OpenAPI viewer already present on API entity pages from Lab 1 (`@backstage/plugin-api-docs`), extended with target-server selection and proxy routing rather than replaced by a new plugin.
- The mock-server tooling is a freely available, locally installable tool capable of generating responses from an OpenAPI spec's examples/schemas (e.g. Prism); the specific tool is a documented convention learners may substitute, per Constitution Principle VIII.
- The "existing test implementation" in User Story 2 is a real, already-running public sandbox endpoint belonging to the example API itself (such as the Galaxy API's `galaxy.scalar.com` / `void.scalar.com` servers introduced in Lab 4), not infrastructure the learner deploys or the lab hosts. Because Galaxy's spec already natively declares both servers, its sandbox-switching demonstration relies on that pre-existing native `servers` list; no Lab 5 configuration is needed to add a target for Galaxy specifically.
- Mock and other lab-added target servers (e.g. Museum's mock, since its spec's only native `servers` entry is fictitious/non-resolvable) are exposed to the API viewer via Backstage plugin/proxy configuration, not by editing the committed example spec files — keeping those files representing production reality and avoiding a requirement that learners edit example API files just to try mocking.
- The default non-production credential is a documented, clearly-labeled example value stored in Backstage's proxy configuration, consistent with the constitution's allowance for simplified example credentials committed to the repository; it grants no access to any real production system.
- Learner-supplied personal credentials are entered client-side (e.g. via the API viewer's Authorize dialog) and are session-scoped only — never persisted to a file or transmitted anywhere other than directly to the target mock/test/sandbox server.
- This lab does not introduce a new visibility or permission mechanism; where the mock/test execution surface appears on an API's page, it is subject to the same entity-level visibility already established in Labs 2-3.
- Mock server(s) are started automatically as part of the existing local dev startup process (e.g. run concurrently with `yarn start`) rather than via a separate command the learner must remember to run; this trades a small amount of added startup complexity/background process overhead for a simpler, always-available learner experience, consistent with keeping mocking available "by default" per this session's scope clarification.
