# Lab 6 — API Lifecycle Management

## Overview

Every API registered so far in this series has had exactly one version. Real APIs rarely stay
that way — a new major version ships while the old one is still serving production traffic, and
each version moves through its own development → test → production → deprecated → retired
progression on its own schedule. This lab registers a second major version of the Museum API
alongside the original, and demonstrates how Backstage represents "these are versions of one
logical API," which version is prominent by default, and how a version is deprecated and
eventually retired without ever deleting its history.

By the end of this lab you will have:

- Two Museum API versions — `museum-api-v1` (Lab 1's original, unmodified) and `museum-api-v2` (a
  new spec with deliberate breaking changes) — registered in the catalog **at the same time**,
  grouped under one new `System` entity (`museum-api`) via Backstage's native `spec.system`
  relation.
- A new frontend module (`packages/app/src/modules/apiVersions/`) that adds an "API Versions"
  card to every API's page, listing its sibling versions, computing and flagging the latest one,
  showing each version's own lifecycle chip, and collapsing retired versions behind a "Show
  retired versions" toggle.
- A worked walkthrough of the full lifecycle: v2 starting in `development` and advancing through
  `testing` to `production`, while v1 is marked `deprecated` and then `retired` — with v1's entity
  never deleted at any point.

**What you will learn:**

- Why a `System` entity — not a bespoke annotation — is the right native mechanism for "these
  entities are versions of one logical API" (see "Why a System entity" below)
- Why "latest version" is computed from a version annotation rather than a manually-maintained
  flag, and what goes wrong with the manual-flag approach
- Why this lab deliberately leaves Backstage's built-in search and catalog table unmodified,
  and where the "default" browsing experience actually lives instead
- Why `spec.lifecycle` — a field every API entity has already had since Lab 1 — is enough to
  represent five lifecycle states, including one (`retired`) Backstage doesn't define itself

---

## Prerequisites

- **Labs 1–5 completed** — Backstage running locally with Museum, Streetlights, Train Travel,
  Galaxy, and the precedence-demo API all registered, plus Lab 5's mocking/testing setup
- **Node.js 20+ (or 22/24) and Yarn** — same toolchain as Labs 1–5
- No new external accounts, services, or OS-level prerequisites, and no new dependencies to
  install — this lab only adds catalog YAML, one new OpenAPI spec, and one small frontend module

---

## Step 1 — Add the System and Both API Versions to the Catalog

Copy this lab's catalog files into your Backstage workspace's catalog location list. If you're
working directly in this repository (not a separate clone), the files are already at
[`catalog/system.yaml`](catalog/system.yaml), [`catalog/apis/museum-api-v1.yaml`](catalog/apis/museum-api-v1.yaml),
[`catalog/apis/museum-api-v2.yaml`](catalog/apis/museum-api-v2.yaml), and
[`catalog/apis/museum-v2/openapi.yaml`](catalog/apis/museum-v2/openapi.yaml).

- **`system.yaml`** registers `system:default/museum-api` — the logical grouping every version
  will point at via `spec.system`.
- **`museum-api-v1.yaml`** registers a *new* entity name, `museum-api-v1`, pointing its
  `spec.definition.$text` at the exact same, unmodified OpenAPI file Lab 1 already registered
  (`labs/lab-01-base-backstage/apis/museum/openapi.yaml`). It supersedes Lab 2's single
  `museum-api` entity — see "Why supersede, not edit" below.
- **`museum-api-v2.yaml`** registers `museum-api-v2`, pointing at a **new** spec file
  ([`catalog/apis/museum-v2/openapi.yaml`](catalog/apis/museum-v2/openapi.yaml)) with two
  deliberate breaking changes: the `/special-events/{eventId}` path parameter is renamed to
  `{id}`, and `GET /tickets/{ticketId}/qr` is renamed to `GET /tickets/{ticketId}/qr-code`. Both
  changes are called out in the spec's own `info.description`.

Both version entities carry:

- `annotations['apiportal.io/version']` — a `"major.minor"` string (`"1.0"`, `"2.0"`) used to sort
  versions and compute the latest one.
- `spec.system: museum-api` — the relation that groups them.
- `spec.lifecycle` — v1 starts at `production`, v2 starts at `development`.

## Step 2 — Update `app-config.yaml`'s Catalog Locations

In `app-config.yaml`'s `catalog.locations`, **remove** Lab 2's single "Museum REST API" location
entry and **add** three new entries — one for the System, one for each version:

```yaml
    # --- Lab 6: Museum API System (groups museum-api-v1/v2 as versions of one logical API) ---
    - type: url
      target: https://raw.githubusercontent.com/<your-fork>/backstage-apiportal-lab/main/labs/lab-06-api-lifecycle-management/catalog/system.yaml
      rules:
        - allow: [System]

    # --- Lab 6: Museum API v1 ---
    - type: url
      target: https://raw.githubusercontent.com/<your-fork>/backstage-apiportal-lab/main/labs/lab-06-api-lifecycle-management/catalog/apis/museum-api-v1.yaml
      rules:
        - allow: [API]

    # --- Lab 6: Museum API v2 (deliberate breaking changes vs. v1) ---
    - type: url
      target: https://raw.githubusercontent.com/<your-fork>/backstage-apiportal-lab/main/labs/lab-06-api-lifecycle-management/catalog/apis/museum-api-v2.yaml
      rules:
        - allow: [API]
```

Replace `<your-fork>` with your own GitHub username/organization, matching the pattern already
used by every earlier lab's entries in this same file.

## Step 3 — Add the API Versions Frontend Module

Copy [`code/packages/app/src/modules/apiVersions/`](code/packages/app/src/modules/apiVersions/)
into your workspace's `packages/app/src/modules/apiVersions/`, then register it in
`packages/app/src/App.tsx` — the same pattern Lab 2's `apiVisibilityModule` and Lab 3's
`apiGradeModule` already use:

```ts
import { apiVersionsModule } from './modules/apiVersions'; // ← add this import (Lab 6)

export default createApp({
  features: [
    // ...earlier entries...
    apiVersionsModule, // ← add this entry (Lab 6: version grouping, latest, lifecycle, retirement)
  ],
});
```

The module adds one `EntityCardBlueprint` info card (`ApiVersionsCard.tsx`) to every `kind:API`
entity's page — no new backend module, no new dependency.

## Step 4 — Start Backstage and Confirm Both Versions Are Registered

```
cd labs/lab-01-base-backstage/backstage
yarn start
```

Open the catalog and confirm:

- `museum-api-v1` and `museum-api-v2` both appear as separate entities.
- The `museum-api` System's page lists both as "Has part" APIs.
- Opening either version's page shows the new "API Versions" card, listing both versions with
  working links between them, and `museum-api-v2` flagged **Latest**.

## Step 5 — Confirm Independent Lifecycle State

`museum-api-v1` starts at `production`, `museum-api-v2` starts at `development`. Confirm each
version's own "About" card and its row in the Versions card show its own state, and that the two
differ.

## Step 6 — Advance v2's Lifecycle

Edit `museum-api-v2.yaml`'s `spec.lifecycle`: change it from `development` to `testing`, then from
`testing` to `production`. After each edit, refresh either version's page — the Versions card and
v2's own About card should reflect the new value within Backstage's normal catalog refresh
interval, while `museum-api-v1` stays unaffected throughout.

## Step 7 — Deprecate v1

Edit `museum-api-v1.yaml`'s `spec.lifecycle` to `deprecated`. Confirm the Deprecated label appears
on v1's own page **and** in the Versions card on both v1 and v2's pages.

## Step 8 — Retire v1

Edit `museum-api-v1.yaml`'s `spec.lifecycle` to `retired`. Confirm:

- v1 disappears from the Versions card's default (expanded) list on both pages.
- A "Show retired versions (1)" button appears; clicking it reveals v1, clearly labeled Retired.
- `museum-api-v1` is still fully viewable by navigating directly to its own catalog page — it was
  never deleted, only deprioritized in the curated Versions view.

## Step 9 — Confirm Nothing Was Deleted

Open the full catalog list (or search for `museum-api-v1` by name directly). It is still there,
still labeled Retired, with its full history intact — retirement in this lab is a display
decision, not a data deletion.

---

## Why a System Entity, Not a Custom Annotation

Backstage already has a native entity kind for "these things belong to one logical group":
`System`. Setting `spec.system: museum-api` on every version gets you a real, already-indexed
relation — plus a free "Has part" list on the System's own page — with zero new backend code. A
bespoke annotation queried directly would still need a custom card to show anything, and would
forfeit that free System page for no benefit. See `research.md` R1 for the full comparison.

## Why Latest Is Computed, Not Hand-Flagged

It would be simpler to add an `apiportal.io/latest: "true"` annotation to whichever version is
newest. It would also be wrong the moment someone forgets to flip it when adding a third version —
two versions could both claim "latest," or none could. Instead, every version just carries its own
`apiportal.io/version` number, and the Versions card computes which one is highest (excluding
retired versions) every time it renders. There's no flag to get out of sync, because there's no
flag.

## Why Backstage's Native Search Is Left Unmodified

You might expect a retired version to be untraceable everywhere once it's retired — including
Backstage's own built-in full-text search. This lab deliberately does **not** touch that search
plugin or the default catalog table. A raw, catalog-wide search can still technically surface a
retired version (clearly labeled Retired once you open it) — that's the curated Versions card's
job, not the general-purpose search's. At real scale, this split is a feature, not a gap: an
auditor benefits from being able to find *everything* ever registered, while day-to-day discovery
benefits from a curated view that only shows what's current. See `research.md` R5.

## Why Supersede Lab 2's Entry, Not Edit It

Lab 2 registered a single `museum-api` entity. Introducing "multiple major versions of the same
API" properly requires versioned names (`museum-api-v1`, `museum-api-v2`) — there's no way to keep
one entity unversioned while its sibling is `-v2` and still teach "these are equally-versioned
parallel entities." This lab's `app-config.yaml` change therefore removes Lab 2's original catalog
location and replaces it with three new ones. This is an explicitly-permitted "breaking change to
the environment" under this repository's constitution (Development Workflow section) — if you're
adapting this pattern to your own APIs, plan for the same kind of one-time migration the first time
you introduce explicit versioning to an API that previously had none.

---

## Adaptable Conventions vs. Fixed Mechanics

Adaptable — change these freely for your own APIs:

- The `apiportal.io/version` annotation format (`"major.minor"`) — substitute full semver, a date,
  or whatever versioning scheme your organization already uses.
- The five-value lifecycle convention (`development`/`testing`/`production`/`deprecated`/
  `retired`) — `spec.lifecycle` accepts any string; use whatever states match your own process.
- "One `System` per logical API" — this is the pattern to replicate, not a fixed name; a real
  catalog would have one `System` per API family, not just Museum's.

Fixed — this is the mechanism itself, not a convention:

- The `System`/`spec.system` relation as the grouping mechanism.
- The `EntityCardBlueprint` pattern used to build the Versions card.

---

## Verification

1. Both `museum-api-v1` and `museum-api-v2` appear in the catalog at the same time (Step 4).
2. The Versions card on either page lists both versions and flags v2 Latest (Step 4).
3. v1 and v2 show independent lifecycle chips that update independently as you edit them
   (Steps 5–6).
4. Marking v1 deprecated shows the label everywhere v1 appears; marking it retired collapses it
   behind "Show retired versions" while it remains reachable via direct link (Steps 7–8).
5. `museum-api-v1`'s entity is never deleted — confirm it's still present at the end (Step 9).

## Troubleshooting

- **Versions card renders but shows only one version**: confirm both `museum-api-v1.yaml` and
  `museum-api-v2.yaml` set `spec.system: museum-api` (not `museum-api-v1`/`v2` — that's a typo that
  silently produces an empty sibling list, since the card queries by the exact `spec.system`
  string).
- **Old `museum-api` entity still shows up alongside the new versioned ones**: you likely forgot
  to remove Lab 2's original catalog location entry from `app-config.yaml` in Step 2 — the old and
  new entities can coexist harmlessly, but that defeats the "supersede, don't duplicate" point of
  this lab.
- **Lifecycle edit doesn't show up immediately**: catalog processing runs on its normal refresh
  interval; give it a few seconds and refresh the page, or trigger an immediate refresh via
  Backstage's `POST /api/catalog/refresh` endpoint with the entity's ref.
- **v2's spec fails to resolve (`$text` 404)**: if you're working from a fork, update the
  `$text` URL in `museum-api-v2.yaml` to point at your fork's raw URL, not this repository's.

---

## Further Reading

- [`research.md`](../../specs/006-api-lifecycle-management/research.md) — the full set of design
  decisions and alternatives considered for this lab.
- [`data-model.md`](../../specs/006-api-lifecycle-management/data-model.md) — the exact entity
  shapes and the lifecycle state-transition diagram.
