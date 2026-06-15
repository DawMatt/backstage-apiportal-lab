# Feature Specification: Lab 3 — API Quality

**Feature Branch**: `003-api-quality`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Update specification for this feature based upon feature 3 within GOAL.md"

## Clarifications

### Session 2026-06-15

- Q: When does the Spectral quality assessment run? → A: Computed on demand then cached by the backend plugin (fresh Spectral run triggered on first request for a given API, result stored by the backend; subsequent visits serve the cached result).
- Q: Fallback if api-grade plugin cannot natively split summary vs. detail by permission? → A: Hide the grade card entirely from non-owners — show nothing to users outside the owning team or platform team; do not attempt a partial/placeholder display.
- Q: How should the lab handle AsyncAPI specifications under the OAS3-only Spectral ruleset? → A: Add AsyncAPI default rules to the shared Spectral ruleset alongside the OAS3 rules, so both OpenAPI and AsyncAPI specifications are assessed by appropriate default rules from a single ruleset file.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Define a Shared Spectral Ruleset (Priority: P1)

A developer building on their Lab 2 Backstage instance follows the lab instructions to
define a Spectral ruleset file that implements the default Spectral OAS3 and AsyncAPI rules. The
ruleset is committed to the repository and referenced by both API quality plugins in
subsequent stories. By the end of this story, a single, authoritative ruleset exists and
is ready to be consumed by the quality tooling.

**Why this priority**: The Spectral ruleset is the foundation for all API quality
assessment in this lab. Both the api-grade plugin and the Spectral linter plugin consume
the same ruleset — defining it first avoids duplication and ensures both tools produce
consistent results. Without this step, neither plugin can be meaningfully configured.

**Independent Test**: Can be fully tested by confirming the Spectral ruleset file exists
in the repository and, when run manually against one of the sample API specifications from
Lab 1, produces the expected default OAS3 and AsyncAPI validation output (at least one finding for any
intentional violation, or a clean pass for a conformant spec).

**Acceptance Scenarios**:

1. **Given** a running Backstage instance from Lab 2, **When** the developer follows the
   lab instructions to create a Spectral ruleset file, **Then** the file exists in the
   repository at the documented path and contains the default Spectral OAS3 and AsyncAPI rules.
2. **Given** the Spectral ruleset file exists, **When** the developer runs Spectral locally
   against a sample OpenAPI specification, **Then** Spectral applies the OAS3 rules and
   reports any violations found. When run against a sample AsyncAPI specification, Spectral
   applies the AsyncAPI rules and reports any violations found.

---

### User Story 2 — Add API Grade Plugin (Priority: P2)

The developer installs the `backstage-plugin-api-grade` frontend plugin and the
`backstage-plugin-api-grade-backend` backend plugin, then configures both to use the
Spectral ruleset defined in User Story 1. After completing this story, each API's catalog
page displays a quality grade card in the Info column, directly below the About entry.
All authenticated users see the summary grade; detailed quality information (individual
rule results) is visible only to members of the owning team and the platform team.

**Why this priority**: The API grade plugin provides the primary quality signal in this
lab — a summary grade that all users can see, with deeper detail scoped to owners and the
platform team. It builds on the Spectral ruleset (US1) and the ownership model established
in Lab 2.

**Independent Test**: Can be fully tested by signing in as a member of an API-owning team,
navigating to an API catalog page, and confirming that a quality grade card appears in the
Info column below the About card, and that the grade reflects the Spectral OAS3 assessment
of that API.

**Acceptance Scenarios**:

1. **Given** the api-grade plugins are installed and configured with the shared Spectral
   ruleset, **When** any authenticated user views an API's catalog page, **Then** a quality
   grade card is displayed in the Info column, below the About entry, showing the API's
   overall grade.
2. **Given** the api-grade plugins are configured, **When** a member of the API's owning
   team views the API catalog page, **Then** they see detailed quality information
   (individual rule results, issue descriptions) in addition to the summary grade.
3. **Given** the api-grade plugins are configured, **When** a user who is NOT a member of
   the API's owning team and NOT a member of the platform team views the API catalog page,
   **Then** they see the summary grade only if the plugin natively supports a split view;
   otherwise the grade card is not visible to them at all. Either outcome is acceptable
   and MUST be documented in the lab with the reason.
4. **Given** the api-grade plugins are configured, **When** the developer verifies the
   grade displayed for a sample API, **Then** the grade matches what Spectral produces
   when run against that API's specification using the same shared ruleset.

---

### User Story 3 — Add Spectral Linter Plugin (Priority: P3)

The developer installs the Spectral linter plugin (`backstage-plugins/api-docs-spectral-linter`)
and configures it to use the same shared Spectral ruleset from User Story 1. After
completing this story, API owners and the platform team can view an inline linting panel
on an API's catalog page that shows the specific OAS3 rule violations found in that API's
specification. This panel is not visible to other users.

**Why this priority**: The Spectral linter plugin provides deeper, inline quality
diagnostics for the people who can act on them — API owners and the platform team. It
reinforces the shared ruleset concept by demonstrating a second consumer of the same
configuration. It depends on the ruleset (US1) and the grade plugin (US2) for meaningful
context.

**Independent Test**: Can be fully tested by signing in as a member of the API-owning team,
navigating to an API catalog page, and confirming the Spectral linter panel is visible and
lists the OAS3 rule violations (or a clean pass) for that API. Then signing in as a user
from a different team and confirming the panel is not visible.

**Acceptance Scenarios**:

1. **Given** the Spectral linter plugin is installed and configured with the shared
   ruleset, **When** a member of the API's owning team views the API catalog page,
   **Then** a Spectral linting panel is visible showing the individual OAS3 rule results
   for that API's specification.
2. **Given** the Spectral linter plugin is configured, **When** a member of the platform
   team views any API catalog page, **Then** the Spectral linting panel is visible to them.
3. **Given** the Spectral linter plugin is configured, **When** a user who is neither a
   member of the owning team nor the platform team views an API catalog page, **Then**
   the Spectral linting panel is NOT visible.
4. **Given** the Spectral linter plugin is configured and the shared ruleset is updated,
   **When** a team member views the API catalog page after the update, **Then** the linter
   results reflect the updated ruleset without requiring changes to the plugin configuration.

---

### User Story 4 — Define and Configure the Platform Team (Priority: P4)

The developer defines a "platform team" group in the Backstage catalog to represent the
team responsible for maintaining the Backstage instance itself. This team is granted
visibility of all API quality features (both the detailed api-grade breakdown and the
Spectral linter panel) across all APIs, regardless of ownership. By the end of this story,
the platform team functions as a privileged observer of all quality information in the
system.

**Why this priority**: The platform team concept is necessary to make the quality
permissions model complete and realistic — it would be unworkable for the Backstage
maintainers to have no visibility into quality issues. It depends on the permission
configuration from US2 and US3, which is why it is the final story.

**Independent Test**: Can be fully tested by signing in as a member of the platform team
and confirming that the detailed api-grade breakdown and Spectral linter panel are visible
on every API catalog page, including APIs owned by other teams.

**Acceptance Scenarios**:

1. **Given** a platform team group is defined in the catalog and quality plugins are
   configured, **When** a member of the platform team views any API catalog page
   (including APIs owned by other teams), **Then** the detailed api-grade breakdown is
   visible to them.
2. **Given** the platform team is configured, **When** a member of the platform team views
   any API catalog page, **Then** the Spectral linting panel is visible to them.
3. **Given** the platform team is defined, **When** the developer views the platform team's
   catalog page, **Then** the team is distinguishable from the API-owning teams and its
   purpose as the Backstage platform steward is clear from the catalog metadata.

---

### Edge Cases

- What happens when an API specification has zero Spectral violations — does the grade
  plugin display a meaningful result (e.g., "A" or "Pass") or show an error?
- What happens when an API catalog entry has no specification file attached — what do the
  api-grade and Spectral linter plugins display?
- What happens if the Spectral ruleset file is moved or renamed — do both plugins fail
  gracefully and produce a clear error message?
- What happens when a user belongs to both an API-owning team and the platform team — do
  they see detailed quality information for all APIs or only the ones their team owns?
- What happens when the shared Spectral ruleset is updated — do the quality assessments
  re-run automatically or require a manual trigger?
- What happens if an AsyncAPI specification has zero rule violations under the AsyncAPI
  default rules — does the grade plugin display a meaningful result (e.g., "A" or "Pass")?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The lab MUST provide step-by-step instructions to create a single Spectral
  ruleset file in the repository that extends both the default Spectral OAS3 recommended
  rules and the default Spectral AsyncAPI recommended rules, so that OpenAPI and AsyncAPI
  specifications are each assessed by the appropriate default rules from the same shared
  file. The file path MUST be documented and consistent across all plugin configurations
  in the lab.
- **FR-002**: The lab MUST provide instructions to install and configure the
  `backstage-plugin-api-grade` frontend plugin and `backstage-plugin-api-grade-backend`
  backend plugin from https://github.com/DawMatt/api-grade, pointing both at the shared
  Spectral ruleset defined in FR-001.
- **FR-003**: The api-grade plugin MUST be configured to appear in the Info column of each
  API's catalog page, positioned below the About card. This placement MUST be verified as
  part of the lab's acceptance steps.
- **FR-004**: The lab MUST provide instructions to install and configure the Spectral
  linter plugin (`api-docs-spectral-linter`) from
  https://github.com/dweber019/backstage-plugins/tree/main/plugins/api-docs-spectral-linter,
  pointing it at the same shared Spectral ruleset defined in FR-001.
- **FR-005**: The lab MUST add a new platform team member (`eve`) to the existing
  `group:default/platform-team` Group entity from Lab 2, and MUST register `eve`'s User
  entity in the Backstage catalog. The Group entity itself is not redefined in Lab 3 —
  only the `members` list in `labs/lab-02-users-roles/catalog/teams.yaml` is updated.
- **FR-006**: The lab MUST configure Backstage's permissions framework so that all API
  quality features (api-grade card and Spectral linter panel) are visible only to members
  of the API's owning team and members of the platform team. If the api-grade plugin
  natively supports a split view (summary grade for all, detailed breakdown for owners),
  the lab MUST use that split. If no native split is available, the grade card MUST be
  hidden entirely from users outside the owning team and platform team — no placeholder or
  partial display is acceptable.
- **FR-007**: Where the api-grade plugin natively supports displaying a summary grade to
  all authenticated users independently of the detailed breakdown, the lab MUST configure
  this split. If the plugin does not support this natively, this requirement is superseded
  by FR-006's hide-entirely fallback and MUST be documented as a known limitation of the
  chosen plugin version.
- **FR-008**: The lab MUST include verification steps that confirm quality features are
  visible to an owning team member, visible to a platform team member, and NOT visible
  to a user from a different team.
- **FR-009**: The lab MUST include a troubleshooting section covering: Spectral ruleset
  path misconfiguration, plugin installation issues, and permission configuration mistakes
  that cause quality features to appear for all users or no users.
- **FR-010**: All tools and dependencies (Spectral, api-grade plugin, Spectral linter
  plugin) MUST be freely available under open-source or freeware terms. No paid accounts
  or subscriptions are required.
- **FR-011**: Lab documentation MUST reside at `labs/lab-03-api-quality/README.md`. The
  shared Spectral ruleset file MUST reside at a documented, consistent path within the
  repository. All catalog descriptor files introduced in this lab MUST reside under
  `labs/lab-03-api-quality/`.
- **FR-012**: Instructions MUST include platform-specific variants for any steps that
  differ between Windows and macOS.
- **FR-013**: The lab MUST explain WHY a single shared Spectral ruleset is used for both
  plugins, to reinforce the principle that quality assessments should be consistent and
  traceable to a single source of truth.
- **FR-014**: The api-grade backend computes quality grades on demand — a grade is
  recalculated on every page load and no result is cached between requests. The lab MUST
  include a verification step that confirms a grade is visible for both an OpenAPI and an
  AsyncAPI specification before the learner tests visibility permissions.

### Key Entities

- **Spectral Ruleset**: A configuration file that defines the linting rules applied to API
  specifications. The shared ruleset in this lab extends both the default OAS3 recommended
  rules (for OpenAPI specifications) and the default AsyncAPI recommended rules (for
  AsyncAPI specifications). Both quality plugins consume this single file to ensure
  consistent assessment results across all API types.
- **API Grade**: A summary quality score assigned to an API by the api-grade plugin, based
  on how well the API's specification conforms to the Spectral ruleset. Visible to all
  authenticated users as a high-level indicator.
- **Detailed Quality Report**: The per-rule breakdown produced by the api-grade plugin,
  showing which specific rules passed or failed for a given API specification. Visible
  only to the API's owning team and the platform team.
- **Spectral Lint Results**: The inline linting panel produced by the Spectral linter
  plugin, showing individual rule violations with descriptions and locations within the
  specification. Visible only to the API's owning team and the platform team.
- **Platform Team**: A Backstage Group entity representing the team responsible for
  maintaining the Backstage instance. Members of this team have visibility of all API
  quality details across all APIs.
- **Quality Permission Policy**: An extension of the permission policy from Lab 2 that
  gates access to detailed quality information based on team membership (owning team or
  platform team).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer who completed Lab 2 can complete the full Lab 3 (Spectral
  ruleset definition through permission verification) within 60 minutes on a clean machine.
- **SC-002**: After following the lab, a quality grade card is visible in the Info column
  below the About entry on every API catalog page, for all authenticated users. The grade
  is computed on demand with each page load; in a local development environment with three
  small API specifications, computation is fast enough that no loading state is noticeable.
- **SC-003**: The grade displayed by the api-grade plugin for a sample API matches the
  result produced when running the same Spectral ruleset against that API's specification
  manually, confirming the plugin and ruleset are correctly connected. The lab MUST include
  a step to trigger (or verify) the initial grade computation so the learner sees a result
  rather than an empty/pending state.
- **SC-004**: A developer signed in as an API owner sees detailed quality information
  (individual rule results) on their API's catalog page, while a developer signed in as a
  non-owner from a different team does NOT see the detailed breakdown or Spectral linter
  panel for that API.
- **SC-005**: A developer signed in as a member of the platform team sees detailed quality
  information on every API catalog page, regardless of which team owns the API.
- **SC-006**: Both the api-grade plugin and the Spectral linter plugin produce results
  derived from the same Spectral ruleset file. Updating the ruleset causes both plugins
  to reflect the change without modifying either plugin's configuration.
- **SC-007**: The lab instructions succeed on both Windows and macOS without requiring any
  steps outside of those documented.
- **SC-008**: Every prerequisite introduced in Lab 3 can be sourced at zero cost using
  only the instructions provided in the lab.

## Assumptions

- The developer has completed Lab 2 and has a working Backstage instance with at least
  two API-owning teams, signed-in user support, and permission-based API visibility already
  configured.
- The default Spectral OAS3 recommended ruleset (`@stoplight/spectral-openapi`) is
  sufficient for this lab. No custom rules are added in Lab 3; the focus is on integrating
  the tooling, not authoring bespoke rules.
- The api-grade plugin ideally supports a split display: summary grade visible to all
  authenticated users, detailed breakdown visible only to the owning team and platform team.
  If the plugin does not natively support this split, the entire grade card is hidden from
  users outside the owning team and platform team. This fallback is preferable to showing
  partial or unrestricted data and MUST be documented as a known limitation if applied.
- The Spectral linter plugin can be hidden from unauthorised users via Backstage's
  permissions framework or conditional rendering. If the plugin does not natively support
  permission gating, the lab will document the closest available mechanism and note the
  limitation.
- The `platform-team` Group entity was introduced in Lab 2 as an owner for shared platform
  APIs. Lab 3 adds the first member to this group (user `eve`) and configures the quality
  plugins to grant platform team members access to detailed API quality information across
  all APIs. The permission policy extension adds a platform team membership check alongside
  the existing ownership check. A second Group definition for platform-team MUST NOT be
  created in Lab 3 — doing so causes a duplicate entity error in the catalog.
- The shared Spectral ruleset extends both OAS3 and AsyncAPI default recommended rules.
  OpenAPI specifications are assessed by the OAS3 rules; AsyncAPI specifications are
  assessed by the AsyncAPI rules. Both API types present in Lab 1 will receive quality
  grades. The lab MUST verify that quality assessment works for at least one OpenAPI and
  one AsyncAPI specification.
- The Backstage version pinned in Lab 1 is forward-compatible with both quality plugins
  used in Lab 3.
- Labs may use simplified security practices for local development (Constitution Principle IX).
  No new authentication shortcuts are introduced in Lab 3; the development sign-in provider
  from Lab 2 is reused. A Security Note is not required unless a new insecure practice is
  introduced in this lab.
