# Feature Specification: Lab 2 — Users, Roles, and API Visibility

**Feature Branch**: `002-lab-2-users-roles`

**Created**: 2026-06-07

**Status**: Implemented (Updated: 2026-06-11 — FR-011, SC-007, US2 AS3 refined)

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
3. **Given** an API has been designated as shared or private via the metadata field that
   the permission policy evaluates, **When** any user who can view that API's catalog page
   does so, **Then** the visibility designation (shared or private) is clearly shown — and
   this displayed designation is read directly from the same metadata the policy evaluates,
   so that a change to that metadata is automatically reflected in the display without any
   additional update step.

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
APIs are categorised as either *shared* (visible to all authenticated users) or *private*
(visible only to members of the owning team). A user signed in as a member of Team A sees
all shared APIs plus Team A's private APIs, but not Team B's private APIs — and vice versa.
All other catalog entries (users, groups) remain visible to everyone. This story is the
primary learning outcome of Lab 2.

**Why this priority**: This is the stated goal of the lab — demonstrating that API
visibility varies by user. It depends on all preceding stories.

**Independent Test**: Can be tested by signing in as two different users (from different
teams) and confirming that shared APIs appear for both, while each team's private APIs
are visible only to members of that team.

**Acceptance Scenarios**:

1. **Given** a user signed in as a member of Team A, **When** they browse the API catalog,
   **Then** they see all shared APIs and Team A's private APIs, and they do NOT see
   Team B's private APIs.
2. **Given** a user signed in as a member of Team B, **When** they browse the API catalog,
   **Then** they see all shared APIs and Team B's private APIs, and they do NOT see
   Team A's private APIs.
3. **Given** any authenticated user, **When** they browse the shared APIs,
   **Then** those APIs are visible regardless of which team the user belongs to.
4. **Given** any authenticated user, **When** they browse users or groups in the catalog,
   **Then** all user and group entries are visible to them regardless of team membership.
5. **Given** an unauthenticated or guest user, **When** they attempt to browse the API
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
  displays for unowned APIs and whether they are treated as shared or private under the
  chosen visibility model.
- What happens if a shared API is accidentally configured as private? The lab MUST include
  a verification step that confirms shared APIs are accessible to users from all teams.
- What visibility rules apply to catalog entry types other than APIs (e.g. users, groups,
  systems, domains)? The lab MUST confirm that non-API catalog entries remain fully visible
  to all authenticated users and are not affected by the API visibility configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The lab MUST provide step-by-step instructions to define at least two User
  entities and at least two Group entities in the Backstage catalog using
  `catalog-info.yaml` descriptors committed to the repository.
- **FR-002**: The lab MUST define groups with distinct member sets, ensuring each sample
  user belongs to exactly one group (no multi-group membership in the demo setup, to keep
  the visibility demonstration unambiguous).
- **FR-003**: The lab MUST update the sample API catalog entries from Lab 1 to assign
  ownership to the defined groups, with at least one API owned by each group. At least one
  API MUST be designated as *shared* (visible to all authenticated users) and at least one
  API per team MUST be designated as *private* (visible only to members of the owning team).
  The mechanism for marking an API as shared versus private MUST be documented.
- **FR-004**: The lab MUST configure Backstage's built-in development sign-in provider so
  the developer can sign in as a named user without any external account or service.
  The lab MUST include a clearly labelled "Security Note" section (per Constitution
  Principle IX) explaining that the development provider is intentionally simplified for
  local learning, and that a production deployment would use an enterprise identity provider
  such as SSO via OIDC, SAML, or LDAP.
- **FR-005**: The lab MUST configure Backstage's permissions framework to implement a
  two-tier API visibility model:
  - *Shared* APIs MUST be visible to all authenticated users regardless of team membership.
  - *Private* APIs MUST be visible only to members of the owning team.
  - All other catalog entry types (including User and Group entities) MUST remain visible
    to all authenticated users without restriction.
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
- **FR-011**: Each API's catalog page MUST display the API's visibility designation
  (shared or private) as a visible metadata field, so that any user who can view that page
  can immediately determine whether the API is available to all authenticated users or is
  restricted to the owning team. The displayed designation MUST be derived directly from
  the same metadata field that the permission policy evaluates — it MUST NOT be maintained
  as a separate copy (for example, a tag or label that mirrors the policy-driving field),
  because copies can diverge and display a designation that no longer matches the enforced
  policy. If the underlying policy metadata is updated, the displayed designation MUST
  reflect that change automatically, with no additional manual update required.

### Key Entities

- **User**: A named individual defined as a Backstage catalog entity, with a display name,
  email, and group membership.
- **Group (Team)**: A named team defined as a Backstage catalog entity, with a list of
  member users and a description.
- **API Ownership**: The association between an API catalog entry and its owning Group,
  established via the `spec.owner` field in the API's `catalog-info.yaml`.
- **Shared API**: An API catalog entry that is visible to all authenticated users,
  regardless of team membership.
- **Private API**: An API catalog entry that is visible only to members of the team that
  owns it.
- **Authentication Session**: The signed-in identity that Backstage uses to determine which
  user is accessing the catalog at a given time.
- **Permission Policy**: A configuration artifact that determines which catalog entities a
  signed-in user can view. In this lab, it implements the two-tier API visibility model
  (shared vs. private) while leaving all other catalog entry types unrestricted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer who completed Lab 1 can complete the full Lab 2 (user/group
  definition through visibility demonstration) within 60 minutes on a clean machine.
- **SC-002**: After following the lab, all defined users and groups appear correctly in
  the Backstage catalog with accurate membership data.
- **SC-003**: Each sample API in the catalog displays an owning team, and navigating from
  that team to its owned APIs requires no more than two clicks.
- **SC-007**: The visibility designation (shared or private) is visible on every API's
  catalog page without additional navigation or clicks, and is derived from the same
  metadata field the permission policy reads. When the policy-driving metadata is changed,
  the displayed designation updates automatically — no secondary field requires
  synchronisation. The designation MUST appear in the right-hand info column of the entity
  page (alongside the About card), not at the bottom of the main content area — a card
  buried below the main content fails this criterion even if it technically requires no
  extra navigation, because a learner browsing the page will not see it at a glance.
- **SC-004**: A developer signed in as a member of Team A sees all shared APIs and Team A's
  private APIs but not Team B's private APIs — and vice versa for a developer signed in as
  a member of Team B. The difference is directly attributable to the two-tier visibility
  configuration. All user and group catalog entries remain visible to both developers.
- **SC-005**: The lab instructions succeed on both Windows and macOS without requiring
  any steps outside of those documented.
- **SC-006**: Every prerequisite can be sourced at zero cost using only the instructions
  provided in the lab (including any authentication provider setup).

## Assumptions

- The developer has completed Lab 1 and has a working Backstage instance with the sample
  OpenAPI and AsyncAPI specifications registered.
- Two teams are sufficient to demonstrate the visibility concept. The sample APIs from Lab 1
  will be split across shared and private categories: at least one API will be designated
  shared (visible to all), and at least one private API will be owned by each team. Additional
  APIs may be introduced if needed to make the demonstration clearer.
- Two users per team (four users total) is sufficient for the demo. The exact user identities
  are illustrative and do not need to correspond to real people.
- The Backstage permissions framework will be used to implement the two-tier visibility
  model (shared vs. private APIs). This is the standard, built-in Backstage approach and
  does not require third-party plugins. The permission policy will apply only to API
  catalog entries; all other entity kinds (User, Group, System, Domain, etc.) will remain
  unrestricted.
- FR-011 requires that the displayed visibility designation is read from the same metadata
  field the permission policy evaluates, not from a secondary copy. The implication is
  that any implementation using a separate display field (e.g., a tag or label that mirrors
  the policy field) does not satisfy FR-011, even if the two fields are currently in sync.
  The display mechanism must read the policy-driving field directly.
- No GitHub account or any external service is required for authentication. The development
  sign-in provider is entirely local. A GitHub account may still be useful if the developer
  wishes to host catalog descriptors on GitHub (as in Lab 1), but it is not required for
  the authentication steps in Lab 2.
- The lab uses a simplified, local-only authentication approach for demonstration purposes
  (Constitution Principle IX). This is intentional and not a security oversight. The lab
  documentation MUST clearly label this and explain the production alternative (SSO/OIDC).
- Backstage version pinned in Lab 1 is forward-compatible with the permissions and
  authentication features used in Lab 2.
