# Contributing

Thank you for your interest in contributing to the Backstage API Developer Portal Lab.

This project follows a **Specification-Driven Development (SDD)** workflow powered by
[Speckit](https://github.com/dawsons-creek/speckit). Every lab — and every significant
change to an existing lab — starts with a specification, not with code. This guide explains
why, and how to follow the workflow.

---

## Contents

- [What is SDD?](#what-is-sdd)
- [Prerequisites](#prerequisites)
- [The Speckit Workflow](#the-speckit-workflow)
- [Adding a New Lab](#adding-a-new-lab)
- [Changing an Existing Lab](#changing-an-existing-lab)
- [The Project Constitution](#the-project-constitution)
- [Pull Request Checklist](#pull-request-checklist)
- [Branch and Merge Conventions](#branch-and-merge-conventions)

---

## What is SDD?

Specification-Driven Development means writing a clear, reviewable specification *before*
writing any lab content, code, or documentation. The spec answers:

- What is this lab teaching, and why?
- Who is the learner? What are they doing step by step?
- What does success look like — specifically and measurably?
- What are the prerequisites and constraints?

The spec is not a formality. It is the primary design document. Implementation follows from
it, not the other way around. This matters especially for tutorial content, where ambiguity
in the spec turns into confusion in the lab instructions.

The full SDD pipeline used here is:

```
constitution → specify → clarify → plan → tasks → analyze → implement
```

Each step produces or updates an artifact in `specs/<feature-dir>/`. These artifacts stay
in the repository alongside the lab content they produced.

---

## Prerequisites

To contribute using the Speckit workflow, you need:

- [Claude Code](https://claude.ai/code) — the CLI for Claude
- The Speckit Claude Code skill installed in this repository (already configured in
  `.claude/skills/`)
- Node.js 20 LTS and Git (see [README.md](README.md) for install links)

Claude Code with Speckit provides all the `/speckit-*` slash commands described below.

---

## The Speckit Workflow

### Step 0: Understand the constitution

Before doing anything else, read `.specify/memory/constitution.md`. It defines the
non-negotiable principles that apply to every lab. Any contribution that violates a
principle will be asked to revise before merge.

The key principles in brief:

| # | Principle | What it means in practice |
|---|-----------|--------------------------|
| I | Feature-Focused Learning | Every lab must teach a named Backstage feature |
| II | Process-Oriented Docs | Explain *why*, not just *what* |
| III | Cross-Platform | Every command works on Windows and macOS |
| IV | Self-Contained Prerequisites | List every tool needed, with install links |
| V | Zero-Cost | No paid tools or services — ever |
| VI | Progressive Structure | Each lab builds on the previous |
| VII | Modern API Examples | No Petstore; use quality references like the Museum API |

If you believe a principle should change, amend the constitution first (see
[The Project Constitution](#the-project-constitution)).

---

### Step 1: Specify

Start a new feature by running:

```
/speckit-specify
```

Describe the lab you want to add (or the change you want to make). Speckit will:

1. Create a numbered feature directory under `specs/` (e.g., `specs/002-lab-2-users-roles/`)
2. Generate a `spec.md` from the project's spec template
3. Prompt you to resolve any ambiguities

A good spec for a lab describes:
- The user stories (what the learner does, in priority order)
- Functional requirements (what the lab must demonstrate)
- Success criteria (how you know the lab worked — measurable, technology-agnostic)
- Assumptions and out-of-scope items

> **Tip**: If your spec has `[NEEDS CLARIFICATION]` markers, run `/speckit-clarify` next
> to resolve them interactively before planning.

---

### Step 2: Clarify (if needed)

```
/speckit-clarify
```

This command walks through the spec's ambiguities one at a time, updates `spec.md` with
the resolved answers, and flags any items that remain unresolved. Run it whenever the spec
contains open questions that would affect how the lab is structured.

---

### Step 3: Plan

```
/speckit-plan
```

Converts the spec into a technical plan. Produces:

- `plan.md` — architecture, tech stack, file structure, constitution check
- `research.md` — specific technical decisions with rationale and alternatives
- `data-model.md` — entities and relationships (where relevant)
- `contracts/` — reference YAML snippets that the lab instructions will show students

The plan is where technical decisions get locked in. For labs, the most important decisions
are usually: which API examples to use, which Backstage version to pin, and how files are
laid out inside `labs/`.

---

### Step 4: Generate Tasks

```
/speckit-tasks
```

Produces `tasks.md` — a flat, ordered checklist of implementation tasks derived from the
plan and spec. Each task has a unique ID (T001, T002, …), an optional parallel marker
`[P]`, and a user story label `[US1]`, `[US2]`, etc.

Tasks are the implementation contract. They tell you (or an AI agent) exactly what to
build, in what order, with what output.

---

### Step 5: Analyze

```
/speckit-analyze
```

Performs a cross-artifact consistency check across `spec.md`, `plan.md`, and `tasks.md`.
It flags:

- Requirements with no corresponding task (coverage gaps)
- Constitution violations
- Ambiguous or conflicting requirements
- Terminology drift

Fix any CRITICAL findings before implementing. MEDIUM/LOW findings can be addressed
in the PR review.

---

### Step 6: Implement

```
/speckit-implement
```

Executes the task list. For labs, this writes the lab's `README.md` and any pre-committed
asset files (API specs, catalog descriptors, config snippets). Tasks are marked `[x]` as
they complete.

After implementation, the `tasks.md` should show all tasks checked. The two tasks that
**cannot** be completed automatically are the end-to-end validation tasks (T023 / T024
equivalents) — these require you to follow the lab instructions yourself on a real machine.

---

### Step 7: Validate manually

Before opening a PR, follow the lab you wrote from start to finish on at least one
platform. Record the actual time it took and note any step that was unclear or failed.
Fix the lab instructions before submitting.

Cross-platform validation (macOS *and* Windows) is required before a lab is considered
complete. If you only have access to one platform, note this in your PR and request a
review from someone on the other platform.

---

### Step 8: Open a PR and merge

Once validation is complete and all tasks in `tasks.md` are checked, open a pull request
against `main`.

**PR title** — Use the format `Lab N: <Short description>` or
`[chore] <Short description>` for non-lab changes. Keep it under 72 characters.

**PR description** — The description must include:

- A one-paragraph summary of what the lab teaches (copy from `spec.md` if already written)
- Validation result: platform(s) tested, time to complete, any issues found and fixed
- A link or reference to the spec directory: `specs/<feature-dir>/`
- Any known limitations or items deferred to a later lab

**Review** — At least one maintainer review is required before merge. Reviews focus on
constitution compliance, lab clarity, and technical correctness. Address all comments
before requesting a re-review.

**Merge strategy** — PRs are merged with a **squash merge** into `main`. All commits on
the feature branch are collapsed into a single commit whose message should summarise the
lab at a high level (title + brief body). Do not force-push to `main`.

**After merge** — Once merged:

1. Delete the feature branch. GitHub will offer to do this automatically; accept it.
   Do not keep stale feature branches open after merge.
2. Verify that the merge commit appears correctly in `git log --oneline main`.
3. If the lab introduced new `specs/` artifacts, confirm they are present on `main`
   (the squash commit must include the entire `specs/<feature-dir>/` tree).

**Draft PRs** — You may open a draft PR earlier in the workflow (e.g., after Step 5) to
get early feedback or to run any future CI checks. Mark it ready for review only after
Step 7 is complete and the PR checklist below is satisfied.

---

## Adding a New Lab

1. Check `GOAL.md` for the intended scope of the next lab.
2. Follow Steps 1–7 above.
3. Name the spec directory to match the lab number: `specs/00N-lab-N-<short-name>/`.
4. Name the lab directory: `labs/lab-0N-<short-name>/`.
5. Ensure the lab's `README.md` has all five required sections:
   `## Overview`, `## Prerequisites`, `## Step-by-step Instructions`,
   `## Verification`, `## Troubleshooting`.
6. Confirm the lab starts from the state left by the previous lab and documents any
   dependencies on prior lab outputs.
7. Validate manually (Step 7 above) on at least one platform.
8. Open a PR and merge following Step 8 above.

---

## Changing an Existing Lab

Small fixes (typos, broken links, clarified wording) can go directly in a PR without a
full spec cycle.

Substantive changes — new steps, changed prerequisites, different API examples, structural
reorganisation — should go through at least Steps 1 (specify) and 6 (implement) so that
the `specs/` artifacts stay in sync with the lab content. Use the existing feature
directory for the lab being changed and update the relevant documents in place.

---

## The Project Constitution

`.specify/memory/constitution.md` is the governance document for this repository. It
defines the principles that every lab must satisfy.

To propose a change to the constitution:

1. Open an issue describing the gap the amendment addresses.
2. Run `/speckit-constitution` with the proposed change.
3. The command will update the constitution, increment its semantic version, and list any
   files that need propagation.
4. Submit a PR with the amended constitution and all propagated changes together.

Constitution amendments require explicit agreement from the repository maintainer before
merge. Do not amend the constitution unilaterally.

---

## Pull Request Checklist

Before submitting a PR for a new or changed lab, confirm:

- [ ] `specs/<feature-dir>/spec.md` exists and is complete (no `[NEEDS CLARIFICATION]` markers)
- [ ] `specs/<feature-dir>/plan.md` exists and the Constitution Check table shows all principles passing
- [ ] `specs/<feature-dir>/tasks.md` exists and all tasks are marked `[x]`
- [ ] Lab `README.md` contains all five required sections
- [ ] All shell commands have been tested (platform noted in PR description)
- [ ] Windows and macOS variants are documented wherever commands differ
- [ ] No paid tools or services are required
- [ ] No Petstore or similarly dated API examples are used (Constitution Principle VII)
- [ ] Pre-committed API spec files are self-contained (no external `$ref`s)
- [ ] The lab builds correctly on top of the previous lab's end state

---

## Branch and Merge Conventions

| Item | Convention |
|------|-----------|
| Feature branch name | `NNN-lab-N-<short-name>` — matches the `specs/` directory |
| Target branch | Always `main` |
| Merge strategy | Squash merge; all feature commits collapsed into one |
| Branch lifecycle | Delete feature branch immediately after merge |
| Direct pushes to `main` | Not permitted; all changes go through a PR |
| Force push | Never force-push to `main` |
| Draft PRs | Allowed; mark ready for review only after Step 7 is complete |

The numbered prefix on feature branches (`001-`, `002-`, …) corresponds to the lab
number and keeps branches, spec directories, and lab directories aligned without
requiring any additional tooling.
