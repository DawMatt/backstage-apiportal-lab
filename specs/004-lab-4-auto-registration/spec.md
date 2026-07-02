# Feature Specification: Lab 4 - Auto Registration

**Feature Branch**: `004-lab-4-auto-registration`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Create new feature and specification from feature 4 in GOAL.md" — Lab 4 (Auto registration): Setup a process for automatic registration of APIs and creation of catalog metadata. Assume API definition files exist within a Git mono-repo. Include sourcing of metadata from x-* fields, within the API specifications themselves, into catalog metadata, fields and annotations.

## Clarifications

### Session 2026-07-02

- Q: What naming convention should the recognized `x-*` metadata fields use? → A: `x-backstage-owner`, `x-backstage-lifecycle`, `x-backstage-tags` (namespaced under `x-backstage-*`)
- Q: How is the mono-repo discovery scope defined — fixed folder(s) or filename pattern? → A: No fixed folder; discovery matches a filename pattern (e.g. `*-openapi.yaml`, `*-asyncapi.yaml`) anywhere in the repo
- Q: Where should discovery/registration errors be surfaced to the learner? → A: Both Backstage's built-in catalog processing errors UI (entity-level) and backend log output
- Q: How is the catalog entity's name derived from the API definition file? → A: From the spec's own `info.title` field, slugified (not the file path, not a separate `x-*` name field)
- Q: Where do recognized `x-*` metadata fields live within an AsyncAPI document, relative to OpenAPI? → A: Same placement as OpenAPI — under the document's top-level `info` object for both formats

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic discovery and registration of API definitions (Priority: P1)

As a platform engineer, when a new API definition file (OpenAPI or AsyncAPI) is added anywhere within the designated mono-repo location, I want it to appear in the Backstage catalog as a registered API entity without anyone hand-authoring a `catalog-info.yaml` for it.

**Why this priority**: This is the core value of the lab — removing manual catalog registration is the entire premise of "auto registration." Without this, there is no lab.

**Independent Test**: Add a new, previously-unregistered OpenAPI spec file to the mono-repo location, trigger a catalog refresh, and confirm a corresponding API entity appears in the Backstage catalog with no manual `catalog-info.yaml` written for that API.

**Acceptance Scenarios**:

1. **Given** a mono-repo containing one or more OpenAPI/AsyncAPI definition files with no matching catalog entity, **When** the catalog discovery process runs, **Then** a catalog API entity is created for each definition file found.
2. **Given** an API definition file that was previously registered, **When** its contents change (e.g., description or version updated) and discovery runs again, **Then** the existing catalog entity is updated in place rather than duplicated.
3. **Given** an API definition file is removed from the mono-repo, **When** discovery runs again, **Then** the corresponding catalog entity is no longer present as an active, discoverable entity.

---

### User Story 2 - Sourcing catalog metadata from spec `x-*` fields (Priority: P2)

As an API owner, I want to declare metadata that Backstage needs (such as owning team, lifecycle stage, or tags) directly inside my OpenAPI/AsyncAPI specification using `x-*` vendor extension fields, so that this information lives in one place — the spec itself — instead of being duplicated and maintained separately in a catalog file.

**Why this priority**: This is what makes registration genuinely "automatic" rather than just file discovery — without metadata sourcing, every API would still need a hand-maintained catalog file for ownership and lifecycle, which is exactly what Lab 2's ownership model depends on.

**Independent Test**: Author an API definition containing `x-*` fields for owning team and lifecycle, run discovery, and confirm the resulting catalog entity's `spec.owner`, `spec.lifecycle`, and equivalent fields/annotations reflect the values from the `x-*` fields — not placeholder or default values.

**Acceptance Scenarios**:

1. **Given** an API definition containing an `x-*` field identifying the owning team, **When** the entity is registered, **Then** the catalog entity's owner reference matches that team, consistent with the ownership model established in Lab 2.
2. **Given** an API definition containing `x-*` fields for additional metadata (e.g., lifecycle stage, tags, system grouping), **When** the entity is registered, **Then** those values populate the corresponding catalog entity fields or annotations rather than requiring manual entry.
3. **Given** an API definition that omits one or more recognized `x-*` metadata fields, **When** the entity is registered, **Then** the entity is still created successfully using documented default values, and the missing metadata does not block registration.
4. **Given** an API definition with an `x-*` field referencing a team that does not exist in the catalog, **When** the entity is registered, **Then** the system surfaces a clear, visible error or warning identifying the invalid reference rather than failing silently or crashing discovery for other APIs.

---

### User Story 3 - Learner can extend the mono-repo convention to their own structure (Priority: P3)

As a learner adapting this repository to my own organization, I want to understand which parts of the discovery and metadata-sourcing configuration are conventions I can change (e.g., file naming patterns, folder layout, `x-*` field names) versus fixed requirements, so I can apply this pattern to my own mono-repo layout.

**Why this priority**: Reinforces Constitution Principle VIII (Support Experimentation) — the lab must remain valuable to learners whose mono-repo doesn't match the example layout exactly. Lower priority than P1/P2 because the mechanism must exist and work correctly before its adaptability can be documented.

**Independent Test**: Follow the lab documentation's guidance to point discovery at a differently-structured example folder (different glob pattern, different `x-*` field names) and confirm registration still works as described.

**Acceptance Scenarios**:

1. **Given** the lab documentation, **When** a learner reads the configuration section, **Then** they can identify which settings (file location pattern, recognized `x-*` field names) are conventions they are expected to adapt, and which are fixed mechanics of the discovery process.

---

### Edge Cases

- What happens when an API definition file is malformed or fails to parse (invalid YAML/JSON, not valid OpenAPI/AsyncAPI)? The system MUST skip that file, continue processing other files, and surface a visible error identifying the offending file.
- What happens when two API definition files resolve to the same catalog entity name (i.e., the same slugified `info.title`)? The system MUST surface a visible conflict/error rather than silently overwriting one entity with the other.
- What happens when an `x-*` field contains an unexpected type or shape (e.g., owner field is a list instead of a string)? The system MUST surface a visible error for that entity rather than registering it with corrupted metadata.
- What happens when discovery runs against a mono-repo location containing zero API definitions? The system MUST complete without error and register zero entities.
- How does the system behave when the same API definition also contains a hand-authored `catalog-info.yaml` alongside it? The lab documentation MUST clarify precedence (i.e., which source of metadata wins) to avoid ambiguity for learners who mix approaches during Lab 4.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST discover API definition files (OpenAPI and AsyncAPI) anywhere within the mono-repo by matching a documented filename pattern (e.g. `*-openapi.yaml`, `*-asyncapi.yaml`) rather than requiring a fixed folder location, and without requiring a hand-authored `catalog-info.yaml` per API.
- **FR-002**: The system MUST automatically create a catalog API entity for each newly discovered API definition file.
- **FR-003**: The system MUST automatically update the corresponding catalog API entity when a previously-registered API definition file's contents change.
- **FR-004**: The system MUST stop presenting a catalog API entity as active once its source definition file is removed from the mono-repo.
- **FR-005**: The system MUST extract the owning team from a documented `x-*` field within the API specification and set it as the catalog entity's owner, using the same underlying ownership model relied upon by Lab 2's visibility policy (not a disconnected copy).
- **FR-006**: The system MUST extract additional catalog metadata (at minimum: lifecycle stage and tags/labels) from documented `x-*` fields — located under the document's top-level `info` object for both OpenAPI and AsyncAPI — and map them into the corresponding catalog entity fields or annotations.
- **FR-007**: The system MUST apply documented default values for any recognized `x-*` metadata field that is absent from a given API definition, rather than failing registration.
- **FR-008**: The system MUST surface a visible, actionable error — in both Backstage's built-in catalog processing errors UI (entity-level) and backend log output — when an API definition fails to parse, references a non-existent owning team, or produces an entity-name collision with another API definition, and MUST continue processing remaining, unaffected API definitions.
- **FR-009**: The system MUST support both OpenAPI and AsyncAPI definition files, consistent with the API types introduced in prior labs.
- **FR-010**: Lab documentation MUST identify which parts of the discovery and metadata-sourcing configuration (file location patterns, recognized `x-*` field names) are adaptable conventions versus fixed mechanics, per Constitution Principle VIII.
- **FR-011**: Lab documentation MUST state the precedence rule when both a hand-authored `catalog-info.yaml` and sourced `x-*` metadata exist for the same API.
- **FR-012**: The lab MUST run entirely on local, freely available tooling with $0 cost, requiring no paid service, hosted CI/CD, or webhook-reachable public endpoint (Constitution Principle V).
- **FR-013**: The lab MUST build upon the environment established by Labs 1-3 (base Backstage setup, users/roles/teams and ownership-based visibility, API quality tooling) without requiring those labs to be redone.

### Key Entities

- **API Definition File**: An OpenAPI or AsyncAPI specification file stored within the mono-repo, containing both the technical API contract and `x-*` vendor extension fields carrying catalog metadata (owning team, lifecycle, tags, etc.).
- **Catalog API Entity**: The Backstage catalog representation automatically created and kept in sync from an API Definition File; its entity name is derived from the spec's own `info.title` field (slugified), and it carries ownership, lifecycle, and tag metadata sourced from that file's `x-*` fields.
- **Mono-repo Location**: The designated filename-pattern convention (e.g. `*-openapi.yaml`, `*-asyncapi.yaml`) matched anywhere within the repo, used as the scope for discovery — not tied to a fixed folder.
- **`x-*` Metadata Mapping**: The documented set of vendor extension field names and their corresponding catalog entity fields/annotations, including default values applied when a field is absent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can add a new API definition file to the mono-repo location and see it appear as a registered catalog entity within one discovery cycle, without writing any catalog metadata file by hand.
- **SC-002**: 100% of the owning-team, lifecycle, and tag metadata visible on a registered API's catalog entity originates from `x-*` fields in its definition file, with zero manual duplication of that metadata elsewhere.
- **SC-003**: A learner who introduces a malformed API definition file can identify, from a visible error surfaced in both the Backstage catalog processing errors UI and backend log output, exactly which file and problem caused registration to fail, without needing to inspect system internals.
- **SC-004**: A learner following the lab can successfully repoint discovery and metadata sourcing at a mono-repo layout that differs from the example (different folder structure or `x-*` field names) using only the lab documentation.
- **SC-005**: Removing an API definition file from the mono-repo results in its catalog entity no longer being presented as active, without any manual catalog cleanup step.

## Assumptions

- The "Git mono-repo" referenced in Lab 4 is simulated as a filename-pattern convention (not a fixed folder) within the lab's own repository (or a local sibling repository the learner creates), consistent with the zero-cost, no-external-network constraints established for all labs — it is not assumed to be a real remote Git hosting integration or webhook-driven trigger.
- "Automatic" registration is achieved via a periodic/on-demand discovery and refresh cycle consistent with Backstage's standard catalog processing model, not a real-time push notification from a Git host.
- Default `x-*` field names are defined by this lab as `x-backstage-owner`, `x-backstage-lifecycle`, and `x-backstage-tags` (namespaced under `x-backstage-*` to avoid collision with other vendor extensions); learners are expected to adapt these names to their own organization's practices, per Constitution Principle VIII.
- The ownership model and set of valid owning teams established in Lab 2 (002-lab-2-users-roles) is the source of truth referenced when validating an `x-*` owner field — Lab 4 does not introduce a new/parallel ownership mechanism.
- When both a hand-authored `catalog-info.yaml` and sourced `x-*` metadata exist for the same API, the hand-authored `catalog-info.yaml` is assumed to take precedence, treating auto-sourced metadata as a default that manual configuration can override; this is documented explicitly for learners.
- Removal of a catalog entity when its source file disappears is treated as removal from active/discoverable presentation within Backstage's catalog processing, not necessarily an irreversible deletion of historical records.
