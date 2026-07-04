<!--
Sync Impact Report
==================
Version change: 1.5.0 → 1.6.0
Modified principles:
  - VIII. Support Experimentation → VIII. Support Experimentation & Scale — added a new
    requirement: labs' technical choices MUST be able to scale to real-world implementation
    sizes (reference point: 500+ APIs) via configuration/sizing changes rather than a
    different architecture, even though the lab itself may only build/exercise a small demo;
    lab-only simplifications that don't generalize to scale even in principle MUST be flagged
    explicitly rather than left implicit
Added sections: None
Removed sections: None
Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section is generic (gates are
    derived from the constitution file at plan time, no fixed per-principle table); no edit
    required, the expanded principle is picked up automatically
  ✅ .specify/templates/tasks-template.md — No principle-specific references to Principle VIII;
    no edit required (scale-related tasks, where applicable, fall under each user story's own
    phase or the existing Polish phase)
  ✅ .specify/templates/spec-template.md — No principle-specific references; no updates required
Instance files requiring updates (in-progress/completed feature work):
  ✅ specs/004-lab-4-auto-registration/plan.md — already compliant without changes: its
    `autoApiRegistration` design (persisted scan-state cache, multi-source config) was already
    documented as scaling to 1000+ files/1GB+ via config only, ahead of this amendment; this is
    the precedent the new principle text codifies
  ⚠→✅ specs/005-lab-5-mocking-testing/{research.md,data-model.md,plan.md,quickstart.md,tasks.md}
    — CORRECTION (2026-07-04, post-amendment): this report originally claimed Lab 5 was "already
    compliant without changes" at v1.6.0's adoption. That was wrong — its then-current design
    spawned one `prism` CLI process per discovered API, which does not scale (500+ APIs → 500+
    permanently-running processes/ports regardless of use; a real ceiling, not a config knob).
    Caught on user review immediately after this amendment and reworked to a single in-process,
    lazily-loading gateway (research.md R2/R7) before any implementation began. Left here as a
    record that the "already compliant" pass at amendment time was not rigorous enough — it read
    the existing scaling *prose* as sufficient without checking whether the underlying mechanism
    actually had a scaling ceiling
  ⚠ specs/001-lab-1-base-backstage/plan.md — Constitution Check table missing Principle IX
    (pre-existing gap, unrelated to this amendment) and does not yet address Principle VIII's
    new scale requirement (new gap, low priority — Lab 1 is base setup, not a scaling-sensitive
    mechanism)
  ⚠ specs/002-lab-2-users-roles/spec.md — Should note Principle IX applies to auth credential
    handling (pre-existing gap, unrelated to this amendment)
  ⚠ specs/002-lab-2-users-roles/plan.md and specs/003-lab-3-api-quality/plan.md — neither
    Constitution Check table currently addresses Principle VIII's new scale requirement
    (new gap; not blocking since both labs already precede Lab 4's scale precedent, but worth a
    pass if either plan is revisited)
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

When a lab step instructs the user to create a file, and that file's full content either
(a) cannot reasonably fit on one screen (as a rough guide, more than ~40–50 lines) or
(b) is a complete, reusable source file rather than a short edit/diff snippet — regardless of
length — the file's full content MUST be committed to the repository under the lab's own
directory (convention: a `code/` subdirectory mirroring the target relative path, e.g.
`labs/lab-0N-*/code/packages/app/src/modules/foo/Bar.tsx`), and the README MUST link to that
committed file instead of embedding the whole content inline in a fenced code block. Short
edit-in-place snippets that show surrounding context for a targeted diff against a file created
in an earlier step (not a full new file) are exempt and may remain inline.

**Rationale**: A user who follows steps blindly cannot troubleshoot or adapt. Understanding
the process produces durable knowledge; following a script does not. Embedding entire source
files inline inflates page length without adding explanatory value — the prose around the file
(the *why*) is what teaches; the file content itself is better consulted, copied, or diffed as
a real file. A committed, linked file is also directly reusable by a learner adapting the lab
to their own repo, which an inline fence is not.

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

### VII. Modern & Purposeful API Examples

Sample API specifications used in labs MUST reflect current, real-world API design practices.
Dated "Hello World" examples — including the OpenAPI Petstore and any similarly trivial
canonical placeholders — MUST NOT be used.

Preferred sources for OpenAPI examples include community-recognised, well-designed references
such as:
- Redocly's Museum API: https://github.com/Redocly/museum-openapi-example
- The Train Travel API: https://github.com/bump-sh-examples/train-travel-api

Every sample API MUST meet all of the following criteria:
- Self-contained: no external `$ref` dependencies that require network access at runtime.
- No running backend required: the spec file alone is sufficient for Backstage to render it.
- Demonstrates good API design (meaningful resource names, clear descriptions, realistic
  data shapes) — not just syntactic correctness.
- Freely available and open-source.

**Rationale**: Petstore and similar placeholders teach registration mechanics without teaching
good API design. Learners leave with a correct Backstage setup but no intuition for what a
well-designed API looks like. Using purposeful examples makes both lessons land simultaneously.

### VIII. Support Experimentation & Scale

Labs MUST be designed to support forking, adaptation, and deviation.
Documentation MUST NOT assume users will follow every step exactly as written.
Where users may reasonably substitute tools, configurations, or approaches, the lab SHOULD
acknowledge this and explain the trade-offs rather than presenting one path as the only path.
Verification steps MUST test outcomes, not prescribed implementation details.

Labs MUST also choose technical approaches that can scale to real-world implementation sizes
(as a reference point, 500+ APIs) via configuration and resource-sizing changes rather than a
different architecture. A lab MAY defer building or exercising the at-scale behavior itself —
the lab demo may run against a handful of sample APIs — as long as: (a) the chosen mechanism has
no fundamental scaling ceiling that would force a redesign, and (b) the lab's documentation
identifies what changes (config, not code) between lab-demo scale and a large-scale deployment,
and why. Design choices whose sole purpose is to simplify the lab, and which do not generalize to
a larger scale even in principle, MUST be flagged explicitly as a known lab-only simplification
rather than left implicit.

**Rationale**: Users fork this repository to adapt it to their own needs, teams, and
constraints — including scale far beyond the lab's own small demo. A lab that only works when
followed to the letter fails the majority of its audience; a lab whose only path to real-world
scale is a rewrite fails learners evaluating whether the approach will actually hold up in their
organization. Outcome-based verification and acknowledged variation points make labs resilient to
experimentation; requiring the *mechanism* — not necessarily the lab's exercised scenario — to
scale keeps labs honest about what's a genuine design decision versus a shortcut taken purely for
tutorial simplicity. Lab 4's `autoApiRegistration` design (a persisted scan-state cache and
multi-source config built for 1000+ files/1GB+ repos, though the lab itself exercises only two
small sample files) already established this pattern; this principle codifies that precedent for
all labs going forward.

### IX. Pragmatic Security for Learning Environments

Labs MAY use simplified security practices — including storing example credentials in
configuration files committed to the repository — when doing so meaningfully reduces
the barrier to completing the lab.

Any such practice MUST meet all of the following conditions:

- **Clearly labelled**: Every instance of a simplified security practice MUST be accompanied
  by a visible callout (e.g., a `> ⚠️ Lab only` block) that identifies it as intentionally
  insecure.
- **Fictional values**: Any credentials, secrets, or tokens used in examples MUST be
  obviously fictional (e.g., `example-password`, `lab-secret-do-not-use`). Real or
  reusable credentials MUST NOT appear anywhere in the repository.
- **Production guidance provided**: Each simplified practice MUST be paired with a note
  explaining what a production-appropriate alternative looks like. Examples include:
  - Hardcoded passwords → secrets management (Vault, AWS Secrets Manager, Kubernetes Secrets)
  - Local development auth → enterprise SSO / identity provider (LDAP, SAML, OIDC)
  - Self-signed certificates → CA-signed certificates or a managed certificate service
- **Scope-limited**: Simplified practices are only permitted in local development contexts.
  No lab MAY configure a simplified security practice in a way that could be accidentally
  deployed to a shared or internet-accessible environment without modification.

Labs that introduce authentication or credential configuration MUST include a dedicated
"Security Note" section explaining the production alternative before the learner encounters
the first insecure configuration step.

**Rationale**: Enforcing production-grade security in a local tutorial context adds
prerequisites, cost, and complexity that exclude learners and obscure the Backstage
concepts being taught. However, presenting insecure practices without context normalises
them. This principle permits necessary simplifications while ensuring learners leave
understanding both the shortcut they took and the right path for production.

## Lab Structure Standards

Each lab MUST include the following documentation components:

- **Overview**: What the lab demonstrates and what the user will have at the end.
- **Prerequisites**: All software, tools, and prior labs required, with sourcing instructions.
- **Step-by-step instructions**: Numbered steps with platform variants where needed.
- **Verification**: A clear test the user can perform to confirm the lab completed successfully.
- **Troubleshooting**: Common failure modes and their resolutions.

Labs that use simplified security practices (Principle IX) MUST also include:

- **Security Note**: A section appearing before the first insecure configuration step that
  explains what production-appropriate alternatives exist.

Labs MUST NOT require external network access beyond downloading freely available software
and dependencies. All API samples and test data MUST be included in the repository.

Labs that instruct the user to create a large or reusable source file MUST commit that file's
content under a `code/` subdirectory within the lab's own directory and link to it from the
README, per Principle II, rather than embedding it inline.

A lab is NOT complete until the root `README.md` is updated to reference it: a Lab Series
table row (linked, no longer marked "coming soon"), and an entry in both the Getting Started
tree and the Repository Structure tree for the new `labs/` and `specs/` directories. This is
part of the lab's definition of done, not a follow-up chore — `/speckit-plan` and
`/speckit-tasks` MUST account for it (an explicit task, not a generic "documentation updates"
placeholder), so it is done during `/speckit-implement` rather than caught later at PR review
or in CI.

**Rationale**: The root README previously drifted out of date — Lab 4 shipped fully functional
while the README still listed it as "coming soon" — because README maintenance wasn't part of
any lab's definition of done. It was only caught after the fact, via an ad hoc CI check, which
is too late: by then the fix is a follow-up interruption rather than something completed as
part of the original work.

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

## Common Issues

- `yarn dev` does not exist. Use `yarn start` instead. 

**Version**: 1.6.0 | **Ratified**: 2026-06-07 | **Last Amended**: 2026-07-04
