# Research: Lab 1 — Base Backstage Implementation

**Phase 0 output for**: `specs/001-lab-1-base-backstage/plan.md`

---

## Decision 1: Node.js Version

**Decision**: Node.js 20 LTS (Active LTS at time of authoring)

**Rationale**: Backstage officially supports Node.js 18 and 20 LTS. Node.js 20 is the newer
Active LTS, available free from nodejs.org for Windows and macOS with native installers.
Node.js 20 aligns with Backstage's own CI matrix and gives the widest compatibility window.

**Alternatives considered**:
- Node.js 18 LTS: Also supported; acceptable fallback if 20 has issues on a target machine
- Node.js 22: Newer; not yet in Backstage's primary CI matrix at lab authoring time

---

## Decision 2: Package Manager

**Decision**: Yarn Classic (v1.x), installed globally via `npm install -g yarn`

**Rationale**: Backstage's monorepo scaffolding uses Yarn workspaces. Yarn Classic is what
`@backstage/create-app` bootstraps with by default and is Backstage's officially recommended
package manager. It is free and installs in one command on both platforms.

**Alternatives considered**:
- npm: Not supported by Backstage's workspace setup; would require significant reconfiguration
- Yarn Berry (v3+): Supported but requires additional `.yarnrc.yml` configuration; adds
  complexity inappropriate for a first-contact lab

---

## Decision 3: Backstage Version Strategy

**Decision**: `@backstage/create-app@0.8.3` — pinned on 2026-06-07 via
`npm view @backstage/create-app version`.

**Rationale**: Backstage releases frequently (bi-weekly minor bumps). Using a pinned version
ensures every student who follows the lab gets identical output. The lab README uses
`npx @backstage/create-app@0.8.3` so all students scaffold the same app structure regardless
of when they run the lab.

**Alternatives considered**:
- Always use latest: Causes drift; acceptance scenarios may fail as UI changes
- No version guidance: Creates ambiguity; contradicts SC-001 (60-minute completion target)

---

## Decision 4: Sample OpenAPI Specification

**Decision**: Use the Redocly Museum API (OpenAPI 3.1) — a purposeful, well-designed example
API for a fictional museum (special events, museum hours, tickets, exhibits).
Source: https://github.com/Redocly/museum-openapi-example

**Rationale**: Constitution Principle VII prohibits dated "Hello World" examples such as
Petstore. The Museum API is a community-recognised, high-quality OpenAPI 3.1 example that
demonstrates modern API design practices: meaningful resource names, clear descriptions,
realistic data shapes, and proper use of components/schemas. It is self-contained, requires
no running backend, and is freely available under an open-source licence.

**Alternatives considered**:
- Petstore: Explicitly prohibited by Constitution Principle VII; teaches syntax without
  illustrating good API design
- Train Travel API (https://github.com/bump-sh-examples/train-travel-api): Also a strong
  candidate; Museum API selected as first choice because it has a simpler resource model
  suitable for a first-contact lab
- Custom API: Adds authoring time with no learning benefit over existing quality examples

---

## Decision 5: Sample AsyncAPI Specification

**Decision**: Use the Streetlights API (AsyncAPI 2.6) — the canonical AsyncAPI example
(smart streetlights that publish light measurement events).

**Rationale**: The Streetlights example is the official AsyncAPI "Hello World" and is linked
from the AsyncAPI homepage. It is event-driven (MQTT/WebSocket), which clearly contrasts with
the REST-based Petstore, demonstrating Backstage's multi-paradigm catalog support.

**Alternatives considered**:
- Custom event API: Adds authoring time with no learning benefit
- AsyncAPI 3.0: Newer spec version; less Backstage-validated at lab authoring time; 2.6 is
  the stable widely-supported version

---

## Decision 6: API Catalog Registration Method

**Decision**: Static `catalog-info.yaml` entity descriptors committed to the repository,
referenced via `type: file` locations in Backstage's `app-config.yaml`.

**Rationale**: This is the "catalog-as-code" pattern — the foundational Backstage concept
that every subsequent lab and production use of Backstage builds on. Teaching it in Lab 1
means all future labs inherit a correct mental model. The `type: file` approach works fully
offline after initial setup and requires no external services.

**File path strategy**: The Backstage app is created at
`labs/lab-01-base-backstage/backstage/`. The catalog locations in `app-config.yaml` use
relative paths from the Backstage app root:
```yaml
catalog:
  locations:
    - type: file
      target: ../../apis/museum/catalog-info.yaml
    - type: file
      target: ../../apis/streetlights/catalog-info.yaml
```

**Alternatives considered**:
- UI-based registration ("Register existing component" button): Works but doesn't persist
  across restarts and doesn't teach catalog-as-code
- URL-based registration: Requires internet during catalog refresh; contradicts offline assumption

---

## Decision 7: AsyncAPI Rendering in Backstage

**Decision**: Use Backstage's built-in API entity rendering. Set `spec.type: asyncapi` in
the `catalog-info.yaml`. No additional plugin installation required for Lab 1.

**Rationale**: Backstage's default API entity page renders AsyncAPI specifications natively
when `spec.type` is set to `asyncapi`. The rendered view shows channels, messages, and
schemas. This requires zero plugin installation — keeping Lab 1 simple. Plugins are introduced
in Lab 4 (Spectral) and Lab 5 (Thoughtworks Radar).

**Alternatives considered**:
- Third-party AsyncAPI plugin: Provides richer rendering but adds plugin installation steps
  to Lab 1, violating the principle of progressive complexity

---

## Decision 8: Backstage Search Configuration

**Decision**: Use Backstage's built-in search (enabled by default). No additional
configuration required for Lab 4's search user story.

**Rationale**: `@backstage/create-app` scaffolds search as an out-of-the-box feature.
The catalog search index is populated automatically when catalog entries are loaded.
Students can use the search bar immediately after registering their APIs.

**Alternatives considered**:
- ElasticSearch backend: Production-grade but requires a running ES instance — violates the
  zero-cost and local-only constraints

---

## Decision 9: Backstage App Location in Repository

**Decision**: The Backstage app is created by the student at
`labs/lab-01-base-backstage/backstage/` during the lab. This directory is gitignored. Only
the sample API files and catalog descriptors are pre-committed.

**Rationale**: Constitution Principle II requires the setup process to be a learning
experience, not just a precondition. Students run `npx @backstage/create-app` themselves.
Gitignoring the generated app keeps the repository lean and avoids committing thousands of
Backstage source files. A `.gitignore` entry (`labs/*/backstage/`) will be added to the repo.

**Alternatives considered**:
- Commit the full Backstage app (minus node_modules): Bloats the repo; students skip the
  installation step that Lab 1 is designed to teach
- Commit only modified files (app-config.yaml patches): Complex merge workflow inappropriate
  for a beginner lab

---

## Resolved NEEDS CLARIFICATION items

All Technical Context fields resolved; no outstanding unknowns. See plan.md Technical Context
for final values.
