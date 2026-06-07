# Feature Specification: Lab 1 — Base Backstage Implementation

**Feature Branch**: `001-lab-1-base-backstage`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: "Setup the base Backstage implementation, including sample OpenAPI
and AsyncAPI specifications. Demonstrate that the APIs are visible and searchable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Install and Run Backstage Locally (Priority: P1)

A developer who is new to Backstage follows the lab instructions to install Backstage on their
local machine (Windows or macOS). By the end of this story, Backstage is running locally and
the developer can open it in a browser.

**Why this priority**: Without a running Backstage instance, nothing else in the lab works.
This is the foundational step that every subsequent story depends on.

**Independent Test**: Can be fully tested by navigating to the locally running Backstage URL
and seeing the Backstage home screen load. No API content is required — just a working instance.

**Acceptance Scenarios**:

1. **Given** the developer has installed all listed prerequisites, **When** they follow the
   setup steps in the lab, **Then** Backstage starts without errors and is accessible in a
   browser at the documented local URL.
2. **Given** a Windows developer and a macOS developer follow the same lab, **When** each
   completes the setup, **Then** both reach a working Backstage instance using
   platform-appropriate instructions.

---

### User Story 2 — Register Sample OpenAPI Specification (Priority: P2)

The developer adds a provided sample OpenAPI specification to the Backstage catalog. After
completing this story, the OpenAPI-described API appears in the Backstage API catalog.

**Why this priority**: Demonstrating API registration is the core learning outcome of Lab 1.
It must be achievable after the instance is running, and independently verifiable.

**Independent Test**: Can be fully tested by navigating to the Backstage API catalog and
confirming the sample OpenAPI entry is listed with its correct name and description.

**Acceptance Scenarios**:

1. **Given** a running Backstage instance, **When** the developer registers the sample OpenAPI
   specification using the lab instructions, **Then** the API appears in the Backstage catalog
   with its name, version, and description visible.
2. **Given** the API is registered, **When** the developer clicks on the API entry, **Then**
   the full OpenAPI specification is rendered within Backstage.

---

### User Story 3 — Register Sample AsyncAPI Specification (Priority: P3)

The developer adds a provided sample AsyncAPI specification to the Backstage catalog. After
completing this story, the AsyncAPI-described API appears in the Backstage API catalog alongside
the OpenAPI entry.

**Why this priority**: Demonstrating support for AsyncAPI alongside OpenAPI shows Backstage's
multi-format capability. It builds on US2 and adds breadth to the learning outcome.

**Independent Test**: Can be fully tested by navigating to the Backstage API catalog and
confirming the sample AsyncAPI entry is listed, distinct from the OpenAPI entry.

**Acceptance Scenarios**:

1. **Given** a running Backstage instance with the OpenAPI spec already registered, **When**
   the developer registers the sample AsyncAPI specification, **Then** the AsyncAPI-described
   API appears in the catalog alongside the OpenAPI API.
2. **Given** both APIs are registered, **When** the developer views the AsyncAPI entry,
   **Then** the AsyncAPI specification is rendered correctly within Backstage.

---

### User Story 4 — Search for APIs (Priority: P4)

The developer uses Backstage's search functionality to find the registered APIs by name and
keyword. This story demonstrates that APIs are discoverable, not just listed.

**Why this priority**: Search discoverability is called out explicitly in the lab goals as a
key capability to demonstrate. It depends on US2 and US3 being complete.

**Independent Test**: Can be tested by using the Backstage search bar to query for the name of
each registered API and confirming both APIs appear in search results.

**Acceptance Scenarios**:

1. **Given** both APIs are registered, **When** the developer searches for the name of the
   OpenAPI-described service, **Then** the search results include that API.
2. **Given** both APIs are registered, **When** the developer searches for the name of the
   AsyncAPI-described service, **Then** the search results include that API.
3. **Given** both APIs are registered, **When** the developer searches for a keyword present
   in either API's description, **Then** the relevant API appears in results.

---

### Edge Cases

- What happens if the developer skips a prerequisite? The prerequisite list MUST make missing
  items detectable via a clear error message or a documented verification step.
- What happens on a machine where the required port is already in use? The lab MUST document
  how to identify and resolve port conflicts.
- What happens if the sample specification files are malformed? The sample files are
  provided by the lab and MUST be tested and valid before the lab is published.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The lab MUST provide step-by-step instructions to install and run Backstage
  locally on both Windows and macOS using `npx @backstage/create-app`.
- **FR-002**: The lab MUST list all prerequisites with version requirements and instructions
  for sourcing each one at zero cost.
- **FR-003**: The lab MUST include a sample OpenAPI specification file and its accompanying
  `catalog-info.yaml` descriptor, both committed to the repository. The developer registers
  the API by adding the descriptor path to Backstage's `app-config.yaml`.
- **FR-004**: The lab MUST include a sample AsyncAPI specification file and its accompanying
  `catalog-info.yaml` descriptor, both committed to the repository, registered the same way
  as the OpenAPI entry.
- **FR-005**: The lab MUST include a verification step after each major stage (running
  Backstage, registering each API) so the developer can confirm success before proceeding.
- **FR-006**: The lab MUST demonstrate that both APIs are visible in the Backstage catalog
  after registration.
- **FR-007**: The lab MUST demonstrate that both APIs are findable via Backstage's built-in
  search functionality.
- **FR-008**: The lab MUST include a troubleshooting section covering common failure modes
  (port conflicts, missing prerequisites, malformed specs).
- **FR-009**: All tools and dependencies used MUST be free and open-source; no paid accounts
  or subscriptions are required.
- **FR-010**: Lab documentation MUST reside at `labs/lab-01-base-backstage/README.md`.
  Sample specification files and catalog descriptors MUST reside under the same
  `labs/lab-01-base-backstage/` directory.

### Key Entities

- **Lab**: A self-contained learning unit with overview, prerequisites, steps, verification,
  and troubleshooting sections.
- **OpenAPI Specification**: A sample REST API description file in OpenAPI format, included
  in the repository.
- **AsyncAPI Specification**: A sample event-driven API description file in AsyncAPI format,
  included in the repository.
- **Backstage Catalog Entry**: The Backstage representation of a registered API, derived from
  a specification file and a `catalog-info.yaml` descriptor registered via `app-config.yaml`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with no prior Backstage experience can complete the full lab
  (installation through search verification) within 60 minutes on a clean machine.
- **SC-002**: Both the OpenAPI and AsyncAPI APIs appear in the Backstage catalog after the
  developer follows the registration steps exactly as written.
- **SC-003**: Both APIs are discoverable by name via the Backstage search bar.
- **SC-004**: The lab instructions succeed on both Windows and macOS without requiring any
  steps outside of those documented.
- **SC-005**: Every prerequisite can be sourced at zero cost using only the instructions
  provided in the lab.

## Assumptions

- The developer has a modern computer capable of running Node.js applications locally
  (16 GB RAM or equivalent is a reasonable baseline).
- The developer has an internet connection for downloading prerequisites and Backstage packages
  during the setup phase; no ongoing internet connection is assumed after installation.
- The sample OpenAPI specification will describe a simple REST API (e.g., a petstore or
  similar well-known example) that is self-contained and requires no running backend.
- The sample AsyncAPI specification will describe a simple event-driven API (e.g., a
  user-signup event stream) that is similarly self-contained.
- Lab 1 does not require user accounts, authentication, or role-based access control
  (those are introduced in Lab 2).
- The Backstage version used will be current stable at the time of lab authoring; the lab
  will pin the version to ensure reproducibility.
- Backstage is installed using the official `npx @backstage/create-app` scaffolding CLI.
  This is the supported, documented approach and provides Windows and macOS compatibility
  out of the box.

## Clarifications

### Session 2026-06-07

- Q: How will Backstage be installed in the lab? → A: Option A — `npx @backstage/create-app`, the official Backstage scaffolding CLI
- Q: How will sample APIs be registered in Backstage? → A: Option A — static `catalog-info.yaml` descriptors committed to the repo, registered via `app-config.yaml`
- Q: Where does lab documentation live in the repository? → A: Option A — `labs/lab-01-base-backstage/README.md`, one subfolder per lab under a dedicated `labs/` directory
