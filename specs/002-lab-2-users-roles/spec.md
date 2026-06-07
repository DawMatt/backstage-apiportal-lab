# Feature Specification: Lab 2 — Users, Roles, and API Visibility

**Feature Branch**: `002-lab-2-users-roles`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: "Add users, roles and teams. Demonstrate that visibility of APIs will vary based upon the user signed in at the time."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Define Users and Teams in the Catalog (Priority: P1)

A developer building on their Lab 1 Backstage instance follows the lab instructions to
create User and Group (team) entities in the Backstage catalog. By the end of this story,
named users and teams appear in the Backstage catalog and can be browsed.

**Why this priority**: Defining users and teams is the prerequisite for all subsequent
stories. Without catalog entries for users and groups, ownership and visibility cannot
be demonstrated. This is the foundational step for Lab 2.

**Independent Test**: Can be fully tested by navigating to the Backstage catalog, filtering
by "User" and "Group" kind, and confirming the defined users and teams appear with correct
names, descriptions, and group memberships.

**Acceptance Scenarios**:

1. **Given** a running Backstage instance from Lab 1, **When** the developer follows the
   lab instructions to add User and Group catalog descriptors, **Then** the defined users
   and groups appear in the Backstage catalog.
2. **Given** users are registered in the catalog, **When** the developer views a Group entry,
   **Then** the group lists its members correctly.
3. **Given** groups are registered in the catalog, **When** the developer views a User entry,
   **Then** the user shows their group membership.

---

### User Story 2 — Associate APIs with Owning Teams (Priority: P2)

The developer updates the sample API catalog entries from Lab 1 to assign ownership to the
teams defined in this lab. After completing this story, each API in the catalog displays
its owning team, and navigating from the team to its owned APIs is possible.

**Why this priority**: Ownership is the mechanism that connects users/teams to APIs. It is
the prerequisite for demonstrating visibility differences and provides independent value as
a documentation and discoverability improvement.

**Independent Test**: Can be fully tested by viewing any registered API and confirming it
shows an "Owner" field pointing to a defined team, and by viewing the team and confirming
the APIs it owns are listed.

**Acceptance Scenarios**:

1. **Given** teams are defined in the catalog and APIs are registered from Lab 1, **When**
   the developer updates the API catalog descriptors to assign ownership, **Then** each API
   displays its owning team in the catalog.
2. **Given** APIs are owned by teams, **When** the developer views a team's catalog page,
   **Then** the team's owned APIs are listed on that page.

---

### User Story 3 — Sign In as a Specific User (Priority: P3)

The developer configures Backstage authentication and signs in as one of the defined users.
After completing this story, Backstage recognises the signed-in user and displays their
identity (name and team membership) within the application.

**Why this priority**: Authentication is required to demonstrate per-user API visibility.
It depends on US1 (users must exist in the catalog) and is the prerequisite for US4.

**Independent Test**: Can be fully tested by signing in to Backstage as a defined user and
confirming the application shows the correct user identity and team affiliation.

**Acceptance Scenarios**:

1. **Given** authentication is configured and users exist in the catalog, **When** the
   developer signs in using the configured provider, **Then** Backstage displays the
   signed-in user's name and team membership.
2. **Given** the developer is signed in as User A (member of Team A), **When** they
   sign out and sign in as User B (member of Team B), **Then** Backstage reflects the
   identity of User B.

---

### User Story 4 — Demonstrate API Visibility Differences by User (Priority: P4)

The developer demonstrates that different signed-in users see different sets of APIs.
Specifically, a user signed in as a member of Team A sees Team A's APIs prominently or
exclusively, while a user signed in as Team B sees Team B's APIs. This story is the
primary learning outcome of Lab 2.

**Why this priority**: This is the stated goal of the lab — demonstrating that API
visibility varies by user. It depends on all preceding stories.

**Independent Test**: Can be tested by signing in as two different users (from different
teams) and comparing what APIs are visible or emphasised for each.

**Acceptance Scenarios**:

1. **Given** a user signed in as a member of Team A, **When** they browse the API catalog,
   **Then** they see only the APIs owned by Team A (APIs owned by other teams are not
   visible or are clearly distinguished).
2. **Given** a user signed in as a member of Team B, **When** they browse the API catalog,
   **Then** they see only the APIs owned by Team B (APIs owned by other teams are not
   visible or are clearly distinguished).
3. **Given** an unauthenticated or guest user, **When** they attempt to browse the API
   catalog, **Then** the lab documents what they can and cannot see.

---

### Edge Cases

- What happens if a user is a member of multiple teams? The lab MUST document how
  multi-team membership affects API visibility.
- What happens if a catalog entity references a user or group that does not exist in the
  catalog? The lab MUST document how to identify and fix broken references.
- What happens if the developer tries to sign in but authentication is not yet configured?
  The lab MUST include a verification step to confirm authentication is correctly set up
  before demonstrating visibility differences.
- What happens when an API has no owner assigned? The lab MUST show what the catalog
  displays for unowned APIs and whether they are visible to all or no users under the
  chosen visibility model.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The lab MUST provide step-by-step instructions to define at least two User
  entities and at least two Group entities in the Backstage catalog using
  `catalog-info.yaml` descriptors committed to the repository.
- **FR-002**: The lab MUST define groups with distinct member sets, ensuring each sample
  user belongs to exactly one group (no multi-group membership in the demo setup, to keep
  the visibility demonstration unambiguous).
- **FR-003**: The lab MUST update the sample API catalog entries from Lab 1 to assign
  ownership to the defined groups, with at least one API owned by each group.
- **FR-004**: The lab MUST configure Backstage's built-in development sign-in provider so
  the developer can sign in as a named user without any external account or service.
  The lab MUST include a clearly labelled "Security Note" section (per Constitution
  Principle IX) explaining that the development provider is intentionally simplified for
  local learning, and that a production deployment would use an enterprise identity provider
  such as SSO via OIDC, SAML, or LDAP.
- **FR-005**: The lab MUST configure Backstage's permissions framework to filter API
  visibility based on the signed-in user's group membership, so that users from Team A
  see only Team A's APIs and users from Team B see only Team B's APIs.
- **FR-006**: The lab MUST include verification steps after each major stage: after
  defining users/groups, after assigning ownership, after configuring authentication, and
  after confirming visibility differences.
- **FR-007**: The lab MUST include a troubleshooting section covering: auth configuration
  errors, missing catalog entity references, and permission configuration mistakes.
- **FR-008**: All tools and dependencies used MUST be free and open-source; no paid accounts
  or subscriptions beyond those already documented as free in Lab 1 are required.
- **FR-009**: Lab documentation MUST reside at `labs/lab-02-users-roles/README.md`. All
  catalog descriptor files for users and groups MUST reside under `labs/lab-02-users-roles/`.
- **FR-010**: Instructions MUST include platform-specific variants for any steps that
  differ between Windows and macOS.

### Key Entities

- **User**: A named individual defined as a Backstage catalog entity, with a display name,
  email, and group membership.
- **Group (Team)**: A named team defined as a Backstage catalog entity, with a list of
  member users and a description.
- **API Ownership**: The association between an API catalog entry and its owning Group,
  established via the `spec.owner` field in the API's `catalog-info.yaml`.
- **Authentication Session**: The signed-in identity that Backstage uses to determine which
  user is accessing the catalog at a given time.
- **Permission Policy**: A configuration artifact that determines which catalog entities a
  signed-in user can view, based on their group membership.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer who completed Lab 1 can complete the full Lab 2 (user/group
  definition through visibility demonstration) within 60 minutes on a clean machine.
- **SC-002**: After following the lab, all defined users and groups appear correctly in
  the Backstage catalog with accurate membership data.
- **SC-003**: Each sample API in the catalog displays an owning team, and navigating from
  that team to its owned APIs requires no more than two clicks.
- **SC-004**: A developer signed in as a member of Team A sees a different set of APIs
  than a developer signed in as a member of Team B, with the difference directly
  attributable to group-based visibility configuration.
- **SC-005**: The lab instructions succeed on both Windows and macOS without requiring
  any steps outside of those documented.
- **SC-006**: Every prerequisite can be sourced at zero cost using only the instructions
  provided in the lab (including any authentication provider setup).

## Assumptions

- The developer has completed Lab 1 and has a working Backstage instance with the sample
  OpenAPI and AsyncAPI specifications registered.
- Two teams are sufficient to demonstrate the visibility concept: Team A owns the OpenAPI
  API (from Lab 1), Team B owns the AsyncAPI API (from Lab 1). Additional APIs may be
  added if needed to make the demonstration clearer.
- Two users per team (four users total) is sufficient for the demo. The exact user identities
  are illustrative and do not need to correspond to real people.
- The Backstage permissions framework will be used to implement visibility differences.
  This is the standard, built-in Backstage approach and does not require third-party plugins.
- No GitHub account or any external service is required for authentication. The development
  sign-in provider is entirely local. A GitHub account may still be useful if the developer
  wishes to host catalog descriptors on GitHub (as in Lab 1), but it is not required for
  the authentication steps in Lab 2.
- The lab uses a simplified, local-only authentication approach for demonstration purposes
  (Constitution Principle IX). This is intentional and not a security oversight. The lab
  documentation MUST clearly label this and explain the production alternative (SSO/OIDC).
- Backstage version pinned in Lab 1 is forward-compatible with the permissions and
  authentication features used in Lab 2.
