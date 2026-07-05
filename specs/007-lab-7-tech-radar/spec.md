# Feature Specification: Lab 7 - Other Documentation (Tech Radar)

**Feature Branch**: `007-lab-7-tech-radar`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Create new feature and specification to implement lab 7 in GOAL.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish an organization Tech Radar (Priority: P1)

As a learner running the Backstage instance built in prior labs, I want a Thoughtworks-style Tech Radar page added to my Backstage portal, so that I can see how platform and API teams communicate technology adoption guidance (e.g. which API styles, tools or techniques are recommended, being trialed, being assessed, or on hold) alongside the API catalog.

**Why this priority**: This is the core deliverable of the lab — without the radar visible in Backstage, there is nothing to demonstrate or extend.

**Independent Test**: Start Backstage after completing the lab and navigate to the Tech Radar page from the sidebar; the radar renders with quadrants and rings populated with sample entries, without needing any other lab feature to be present.

**Acceptance Scenarios**:

1. **Given** a Backstage instance with the plugin installed and configured, **When** a user navigates to the Tech Radar page, **Then** a radar diagram is displayed with labeled quadrants and rings.
2. **Given** the radar page is open, **When** the user hovers over or selects an individual blip, **Then** details for that blip (name, quadrant, ring, description) are shown.
3. **Given** the sample data ships with the lab, **When** the page loads, **Then** at least one blip appears in each quadrant and each ring, so learners can see the full range of the radar's visual vocabulary.

---

### User Story 2 - Register a new blip (Priority: P2)

As a team member documenting a technology decision, I want to add a new blip to the radar (or move an existing one to a different ring), so that the radar stays current as adoption guidance changes.

**Why this priority**: This is the main hands-on exercise of the lab — it teaches the mechanics of maintaining the radar over time, which is the point of the exercise once the radar is visible.

**Independent Test**: Following the lab's documented steps, add a new entry to the radar data source and restart/reload Backstage; the new blip appears on the radar in the correct quadrant and ring without any other change to the plugin configuration.

**Acceptance Scenarios**:

1. **Given** the radar data source used by the plugin, **When** a learner adds a new blip entry with a name, quadrant, ring and description, **Then** the new blip is visible on the radar after reload.
2. **Given** an existing blip, **When** a learner changes its ring (e.g. from "Assess" to "Trial"), **Then** the radar reflects the new ring and indicates that the blip has moved.
3. **Given** a learner provides an invalid quadrant or ring name, **When** Backstage loads the radar data, **Then** the lab documentation explains the resulting error and how to fix it.

---

### User Story 3 - Understand adoption ring semantics (Priority: P3)

As a learner new to Tech Radar concepts, I want the lab documentation to explain what each ring (e.g. Adopt, Trial, Assess, Hold) means and how movement between rings is shown, so that I can interpret and maintain the radar correctly.

**Why this priority**: Nice-to-have reinforcement of learning goals; the radar is functional and demonstrable without this story, but the lab's constitution emphasizes teaching, not just producing a working artifact.

**Independent Test**: A learner unfamiliar with Tech Radar can read the lab's documentation section and correctly explain, without looking at the diagram, what each ring means and how a "moved" indicator is represented.

**Acceptance Scenarios**:

1. **Given** the lab documentation, **When** a learner reads the ring definitions section, **Then** each ring used in the sample data has a plain-language definition.
2. **Given** the lab documentation, **When** a learner reads the maintenance section, **Then** it explains how to add, move, and retire blips, and how movement indicators are produced.

---

### Edge Cases

- What happens when the radar data source is empty (no blips defined)? The page should still render (empty radar) rather than error, and the lab should note this.
- How does the system handle a blip assigned to a quadrant or ring name that doesn't exist in the configured quadrant/ring list? The lab documentation must explain the failure mode and how to correct it.
- What happens if two blips share the same name within the same quadrant? The lab should note this is allowed but discouraged, since it makes individual blips hard to distinguish.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Backstage instance MUST display a Tech Radar page reachable from the main navigation, following the same access approach (visible to all authenticated users) as other non-API catalog entry types established in prior labs.
- **FR-002**: The radar MUST define a fixed set of quadrants and a fixed set of rings representing adoption/lifecycle stages (e.g. Adopt, Trial, Assess, Hold), consistent with the standard Thoughtworks Radar model.
- **FR-003**: The radar's data (quadrants, rings, and blips) MUST be sourced from a file within the repository that learners can edit directly, without requiring any external service or paid API.
- **FR-004**: Each blip MUST include, at minimum: a name, its quadrant, its ring, and a short description explaining the recommendation or rationale.
- **FR-005**: The system MUST support indicating that a blip has moved between rings since a previous state (e.g. via a "moved" flag or equivalent mechanism supported by the plugin).
- **FR-006**: The lab documentation MUST provide step-by-step instructions for installing and configuring the Tech Radar plugin into the Backstage instance produced by prior labs.
- **FR-007**: The lab documentation MUST provide step-by-step instructions for registering a new blip and for moving an existing blip to a different ring.
- **FR-008**: The lab documentation MUST explain the meaning of each ring and quadrant used in the sample data, so learners can apply the model to their own technologies.
- **FR-009**: The sample radar data MUST include enough blips to populate every quadrant and every ring at least once, so the full visual model is demonstrated out of the box.
- **FR-010**: The lab MUST identify any prerequisites (packages, versions) needed for the Tech Radar plugin and how to source them, consistent with the repository's constitution.
- **FR-011**: The lab MUST run at $0 cost and work on both Windows and macOS, consistent with the repository's constitution.

### Key Entities

- **Radar Blip**: A single technology, tool, technique, or platform being tracked; has a name, description, an assigned quadrant, an assigned ring, and an optional "moved" indicator relative to its prior ring.
- **Quadrant**: A named category grouping related blips (e.g. Techniques, Tools, Platforms, Languages & Frameworks — or a set adapted to this repository's API-focused context).
- **Ring**: A named adoption/lifecycle stage shared across all quadrants (e.g. Adopt, Trial, Assess, Hold), representing how strongly the blip is recommended.
- **Radar Dataset**: The overall collection of quadrants, rings, and blips that together render as one Tech Radar page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner who has completed prior labs can complete this lab's setup and see a fully rendered Tech Radar page in under 20 minutes.
- **SC-002**: 100% of the sample dataset's quadrants and rings have at least one visible blip after setup, with no configuration errors.
- **SC-003**: A learner can successfully add a new blip and see it appear on the radar on their first attempt, following only the lab's written instructions.
- **SC-004**: A learner can successfully move an existing blip to a different ring and observe the "moved" indicator on their first attempt, following only the lab's written instructions.
- **SC-005**: A learner unfamiliar with the Tech Radar concept can, after reading the documentation, correctly describe the purpose of each ring without additional external research.

## Assumptions

- "Other documentation" in the GOAL.md lab list refers to using the Thoughtworks Tech Radar as a documentation/communication artifact within Backstage, distinct from the API-specific documentation (OpenAPI/AsyncAPI docs, quality, mocking) covered in earlier labs.
- The radar dataset is maintained as a static file (e.g. JSON or equivalent) committed to the repository and read directly by the plugin; no external Tech Radar backend service or hosted API is required, consistent with the $0-cost constraint.
- The radar is visible to all authenticated users regardless of team, matching the existing "allow all" visibility approach used for non-API catalog entry types in Lab 2 — the radar is organizational documentation, not team-owned API metadata.
- Sample blips will be chosen to relate to the API development practices this lab series already teaches (e.g. API design techniques, the OpenAPI/AsyncAPI tooling, mocking approaches from Lab 5), so the radar reinforces rather than distracts from the series' teaching goals.
- No historical time-series of radar snapshots is required beyond a single "moved" indicator per blip; multi-generation radar history is out of scope for this lab.
