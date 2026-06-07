<!--
Sync Impact Report
==================
Version change: N/A (initial) → 1.0.0
Added sections:
  - Core Principles (I through VI)
  - Lab Structure Standards
  - Development Workflow
  - Governance
Modified principles: N/A (initial constitution)
Removed sections: N/A
Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section is generic; no updates required
  ✅ .specify/templates/spec-template.md — No principle-specific references; no updates required
  ✅ .specify/templates/tasks-template.md — No principle-specific references; no updates required
Follow-up TODOs: None
-->

# Backstage API Portal Lab Constitution

## Core Principles

### I. Feature-Focused Learning

Each lab MUST demonstrate at least one concrete, named Backstage feature or capability.
Labs exist to teach — every implementation decision MUST serve a clear learning outcome.
A lab that runs but teaches nothing has failed its purpose.

**Rationale**: The project's value is educational. Without a clear feature focus, labs become
noise rather than signal.

### II. Process-Oriented Documentation

Documentation MUST explain the *why* and *how* of each step, not just the *what*.
The journey of setting up Backstage is as important as the final running instance.
Steps that are non-obvious, error-prone, or surprising MUST include explanatory context.

**Rationale**: A user who follows steps blindly cannot troubleshoot or adapt. Understanding
the process produces durable knowledge; following a script does not.

### III. Cross-Platform Compatibility

All labs MUST run correctly on both Windows and macOS.
Instructions, scripts, and commands MUST include platform-specific variants where they differ.
Assumptions about Unix-only tooling are NOT permitted without a Windows-compatible alternative.

**Rationale**: Restricting to one platform excludes a significant portion of learners and
limits real-world applicability.

### IV. Self-Contained Prerequisites

Each lab MUST list all prerequisites required to run it, including version requirements where
relevant, and MUST provide instructions or links for sourcing each prerequisite.
A user starting a lab cold MUST be able to identify and install everything needed without
hunting for information outside the lab documentation.

**Rationale**: Undocumented prerequisites are the most common cause of lab failure. Complete
prerequisite documentation is non-negotiable for a functional learning experience.

### V. Zero-Cost Operation

No lab MAY require a paid tool, service, subscription, or account to complete.
All dependencies MUST be freely available under open-source or freeware terms.
Cloud services with free tiers are permitted only if the free tier is sufficient for the entire
lab and the user is explicitly warned if approaching limits.

**Rationale**: Cost barriers exclude learners and undermine the goal of accessible education.

### VI. Progressive Lab Structure

Labs MUST be implemented as sequential speckit features, each numbered and ordered.
Each lab MUST build upon the environment established by all preceding labs.
A lab MUST NOT assume state beyond what was established by the labs that precede it.
Lab N MUST be completable if and only if labs 1 through N−1 have been completed successfully.

**Rationale**: Progressive structure reduces cognitive load, provides natural checkpoints, and
ensures each lab can be validated in isolation relative to its prerequisites.

## Lab Structure Standards

Each lab MUST include the following documentation components:

- **Overview**: What the lab demonstrates and what the user will have at the end.
- **Prerequisites**: All software, tools, and prior labs required, with sourcing instructions.
- **Step-by-step instructions**: Numbered steps with platform variants where needed.
- **Verification**: A clear test the user can perform to confirm the lab completed successfully.
- **Troubleshooting**: Common failure modes and their resolutions.

Labs MUST NOT require external network access beyond downloading freely available software
and dependencies. All API samples and test data MUST be included in the repository.

## Development Workflow

- Each lab corresponds to one speckit feature branch following the `###-lab-name` convention.
- Lab numbering MUST be sequential: `001-lab-1-base-backstage`, `002-lab-2-users-roles`, etc.
- A lab MUST be fully documented and verifiable on both platforms before it is considered complete.
- Cross-platform verification is a required gate — marking a lab complete on macOS only is
  insufficient.
- Breaking changes to a lab's environment MUST be reflected in all subsequent labs.

## Governance

This constitution supersedes all other guidelines for this repository. All feature work MUST
comply with every applicable principle before being considered complete.

Amendment procedure:
1. Propose the amendment with a rationale that references a specific, demonstrated gap.
2. Verify that the amendment does not contradict an existing principle; if it does, resolve
   the conflict explicitly.
3. Update `CONSTITUTION_VERSION` per semantic versioning:
   - MAJOR: Removal or redefinition of a principle.
   - MINOR: Addition of a new principle or materially expanded guidance.
   - PATCH: Clarification, wording, or non-semantic refinement.
4. Update `LAST_AMENDED_DATE` to the date of the change.
5. Propagate any changes to dependent templates and commit together.

All plan `Constitution Check` gates MUST reference the principles by Roman numeral and name.

**Version**: 1.0.0 | **Ratified**: 2026-06-07 | **Last Amended**: 2026-06-07
