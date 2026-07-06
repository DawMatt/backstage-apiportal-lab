# Lab 6 — API Lifecycle Management

## Overview

Every API registered so far in this series has had exactly one version. Real APIs rarely stay
that way — a new major version ships while the old one is still serving production traffic, and
each version moves through its own development → test → production → deprecated → retired
progression on its own schedule. This lab registers a second major version of the Museum API
alongside the original, and demonstrates how Backstage represents "these are versions of one
logical API," which version is prominent by default, and how a version is deprecated and
eventually retired without ever deleting its history.

Lab 4 already built a mechanism for exactly this kind of problem: a file-glob `EntityProvider`
that reads OpenAPI/AsyncAPI specs directly and extracts owner/lifecycle/visibility from an
`info.x-<namespace>` extension block, so no hand-authored `catalog-info.yaml` is ever needed. This
lab **extends that same provider** (one additive change to
`labs/lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistration.ts`, still
backward-compatible with every existing Lab 4 spec) rather than reinventing catalog descriptors:
zero hand-authored catalog YAML is added by this lab, for either the two API versions or the
System that groups them.

By the end of this lab you will have:

- Two Museum API versions — `museum-api-v1` and `museum-api-v2` (a new spec with deliberate
  breaking changes) — both **auto-registered** from local OpenAPI files (no catalog-info.yaml),
  grouped under one **auto-synthesized** `System` entity via Backstage's native `spec.system`
  relation.
- A new frontend module (`packages/app/src/modules/apiVersions/`) that adds an "API Versions"
  card to every API's page, listing its sibling versions, computing and flagging the latest one
  (read straight from each spec's own `info.version` — never a duplicated annotation), showing
  each version's own lifecycle chip, and collapsing retired versions behind a "Show retired
  versions" toggle.
- A worked walkthrough of the full lifecycle: v2 starting in `development` and advancing through
  `testing` to `production`, while v1 is marked `deprecated` and then `retired` — with v1's entity
  never deleted at any point. Every transition is a one-line edit to the spec file's own
  `x-examplecorp.lifecycle` field — no catalog YAML to touch, no git push required.

**What you will learn:**

- Why a `System` entity — not a bespoke annotation — is the right native mechanism for "these
  entities are versions of one logical API," and why that `System` is worth auto-synthesizing
  from a spec-level field rather than hand-authoring (see "Why a System Entity" below)
- Why "latest version" is read directly from `info.version` (data the spec already has) rather
  than a parallel `apiportal.io/version` annotation, and what goes wrong with a duplicated copy
- Why lifecycle state belongs in the spec's own `x-<namespace>` extension block, picked up by the
  same mechanism Lab 4 already built for owner/visibility, instead of a hand-authored
  `spec.lifecycle` override that fights the source of truth
- Why this lab deliberately leaves Backstage's built-in search and catalog table unmodified,
  and where the "default" browsing experience actually lives instead

---

## Prerequisites

- **Labs 1–5 completed** — Backstage running locally with Museum, Streetlights, Train Travel,
  Galaxy, and the precedence-demo API all registered, plus Lab 4's auto-registration module and
  Lab 5's mocking/testing setup
- **Node.js 20+ (or 22/24) and Yarn** — same toolchain as Labs 1–5
- No new external accounts, services, or OS-level prerequisites, and no new dependency to
  install — `js-yaml` (used to read `info.version` client-side) is already a `packages/app`
  dependency as of Lab 5's mocking module

---

## Step 1 — Add the Two Museum API Spec Files

Unlike Labs 2–5's catalog-info.yaml-based registrations, there is no catalog YAML to author here
at all. This lab adds two local OpenAPI files, already in place at
[`apis/museum-v1/museum-v1-openapi.yaml`](apis/museum-v1/museum-v1-openapi.yaml) and
[`apis/museum-v2/museum-v2-openapi.yaml`](apis/museum-v2/museum-v2-openapi.yaml):

- **`museum-v1-openapi.yaml`** is a content-identical copy of Lab 1's `museum/openapi.yaml`
  (Lab 1's own committed file is never edited — see "Why Supersede Lab 2's Entry, Not Edit It"
  below for why a local copy, not a `$text` reference, is required here). Titled
  **"Museum API v1"**, not just "Museum API" — see the file's own `info.title` comment for why.
- **`museum-v2-openapi.yaml`** is a new spec, titled **"Museum API v2"**, with two deliberate
  breaking changes vs. v1: the `/special-events/{eventId}` path parameter is renamed to `{id}`,
  and `GET /tickets/{ticketId}/qr` is renamed to `GET /tickets/{ticketId}/qr-code`. Both changes
  are called out in the spec's own `info.description`.

Both specs carry an `info.x-examplecorp` block — the same `x-<namespace>` extension mechanism Lab 4
already introduced for owner/lifecycle/visibility:

```yaml
info:
  version: 1.0.0 # read directly for "latest version" — see "Why Version Comes From info.version"
  x-examplecorp:
    owner: group:default/museum-team
    visibility: private
    lifecycle: production # v2 starts at `development` — this is the field Steps 6-8 edit
    apiBasename: museum-api # groups every version of this API under one auto-synthesized System
```

`apiBasename` is new in this lab — see "Why apiBasename Drives System Assignment" below for why
it exists and how the provider turns it into a `System` entity with no catalog YAML of its own.

## Step 2 — Update the Shared Auto-Registration Module, Then Register a Second Source

This lab's `apiBasename` → `System` behavior is an additive change to Lab 4's own
`autoApiRegistration.ts`, not new code of its own. Copy the updated
[`labs/lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistration.ts`](../lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistration.ts)
over your Lab 4 copy at
`packages/backend/src/extensions/autoApiRegistration.ts`, and add the new migration file
[`002_add_system_slug.ts`](../lab-04-auto-registration/code/packages/backend/src/extensions/autoApiRegistrationMigrations/002_add_system_slug.ts)
alongside Lab 4's existing `001_scan_state_cache.ts` in
`packages/backend/src/extensions/autoApiRegistrationMigrations/` — copy both in as-is, same as
Lab 4's own Step 2. Skipping this step is the single most common way to stall on Step 4 below: the
frontend module renders, but every API's "API Versions" card reports "not part of a System,"
because `spec.system` and the synthesized `System` entity only exist once this file is updated.

Then convert `app-config.yaml`'s `autoApiRegistration` config from Lab 4's single-source shorthand
to the explicit multi-source form (see
[`labs/lab-04-auto-registration/README.md`'s "Scaling to Multiple Source Repositories"](../lab-04-auto-registration/README.md#scaling-to-multiple-source-repositories)):

```yaml
autoApiRegistration:
  sources:
    - id: default
      defaultOwner: group:default/platform-team
      defaultVisibility: private
      xNamespace: examplecorp

    # --- Lab 6: Museum API (all major versions + their System, all auto-registered) ---
    - id: lab6-museum-api
      rootPath: ../../../../lab-06-api-lifecycle-management/apis
      defaultOwner: group:default/museum-team
      defaultVisibility: private
      xNamespace: examplecorp
```

This is its own source (own `id`, own `rootPath`, own `defaultOwner`) rather than a change to
Lab 4's `default` source, exactly as the museum team's own repo would be onboarded independently
at real scale (Lab 4 README's "no built-in global fallback" rationale for `defaultOwner`). It
shares `xNamespace: examplecorp` with the `default` source deliberately: `x-examplecorp` is
`examplecorp`-the-company's vendor extension namespace for *any* API metadata a producer wants to
declare about their spec — owner, lifecycle, visibility, now `apiBasename` — not something scoped
to Backstage or "the API Portal" specifically. Every team at `examplecorp` uses the same namespace
regardless of which repo or catalog source picks their specs up; introducing a per-tool namespace
(e.g. `x-apiportal`) would wrongly imply the metadata exists *for* Backstage, when other systems
(a CLI linter, an internal API gateway, a docs generator) are equally valid consumers of the same
`x-examplecorp` block. Lab 2's original single "Museum REST API" `catalog.locations` entry must
also be **removed** — this lab's two auto-registered versions supersede it (see "Why Supersede
Lab 2's Entry, Not Edit It" below).

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

The module adds two `EntityCardBlueprint` cards to every `kind:API` entity's page — no new backend
module, no new dependency (`js-yaml`, used to read `info.version` from `spec.definition`, is
already present as of Lab 5):

- **`ApiVersionsCard.tsx`** — an `info` card (sidebar) listing sibling versions.
- **`ApiLifecycleBanner.tsx`** — a `content` card (main column) that renders nothing unless
  `spec.lifecycle` is `deprecated` or `retired`, in which case it shows a loud warning naming the
  latest version to use instead. The Versions card alone is easy to miss; this puts the same
  "don't use this" signal where you're already looking.

Card order in the main content column otherwise follows plugin/module discovery order, not
anything declared in `apiVersions/index.ts` — the auto-discovered `api-docs` Definition card would
render above the banner by default. Add one entry to `app-config.yaml`'s `app.extensions` list to
pin the banner first (Backstage has treated app-config extension order as authoritative since
v1.27 — see [the frontend-system override docs](https://github.com/backstage/backstage/blob/master/docs/frontend-system/architecture/25-extension-overrides.md)):

```yaml
app:
  extensions:
    - entity-card:catalog/api-lifecycle-banner
```

## Step 4 — Start Backstage and Confirm Both Versions Are Registered

```
cd labs/lab-01-base-backstage/backstage
yarn start
```

Within one `autoApiRegistration` poll cycle, open the catalog and confirm:

- `museum-api-v1` and `museum-api-v2` both appear as separate entities — with no
  `catalog-info.yaml` for either.
- A `museum-api` `System` entity exists, listing both as "Has part" APIs, even though no
  `system.yaml` was ever authored — it was synthesized from both specs' matching
  `x-examplecorp.apiBasename: museum-api`.
- Opening either version's page shows the new "API Versions" card, listing both versions with
  working links between them, and `museum-api-v2` flagged **Latest** (computed from each spec's
  `info.version`, `1.0.0` vs. `2.0.0`).

## Step 5 — Confirm Independent Lifecycle State

`museum-api-v1` starts at `production`, `museum-api-v2` starts at `development` (each spec's own
`x-examplecorp.lifecycle`). Confirm each version's own "About" card and its row in the Versions card
show its own state, and that the two differ.

## Step 6 — Advance v2's Lifecycle

Edit `apis/museum-v2/museum-v2-openapi.yaml`'s `info.x-examplecorp.lifecycle`: change it from
`development` to `testing`, then from `testing` to `production`. Unlike Labs 2–5's `type: url`
catalog locations, `autoApiRegistration` reads these files directly off **local disk** — there is
nothing to commit or push. Save the file, wait for the next poll cycle (30 seconds by default),
and refresh either version's page: the Versions card and v2's own About card should reflect the
new value, while `museum-api-v1` stays unaffected throughout.

## Step 7 — Deprecate v1

Edit `apis/museum-v1/museum-v1-openapi.yaml`'s `info.x-examplecorp.lifecycle` to `deprecated`, save,
and wait for the next poll cycle. Confirm the Deprecated label appears on v1's own page **and** in
the Versions card on both v1 and v2's pages.

## Step 8 — Retire v1

Edit `apis/museum-v1/museum-v1-openapi.yaml`'s `info.x-examplecorp.lifecycle` to `retired`, save, and
wait for the next poll cycle. Confirm:

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
relation — plus a free "Has part" list on the System's own page — with zero new backend code
beyond what Lab 4 already built. A bespoke annotation queried directly would still need a custom
card to show anything, and would forfeit that free System page for no benefit. See `research.md`
R1 for the full comparison.

Authoring `system.yaml` by hand would have worked too, but it would be one more hand-maintained
file per logical API, at odds with the whole reason Lab 4 exists. Instead, `autoApiRegistration.ts`
now synthesizes one `System` entity per distinct `x-examplecorp.apiBasename` value it discovers
across every spec in a source, the same way it already synthesizes `API` entities from spec
files — see `research.md` R1a.

## Why Version Comes From `info.version`, Not an Annotation

Every OpenAPI/AsyncAPI spec already has `info.version`. An earlier draft of this lab added a
parallel `apiportal.io/version` annotation to each catalog entity — but that's the same fact,
typed twice, with no mechanism keeping the two in sync if someone bumps one and not the other.
The Versions card instead parses `info.version` directly out of `spec.definition` (already a
plain, fully-resolved string by the time the catalog serves it, whether the entity came from
Lab 4's file-glob provider or a remote `$text` reference) — there's no copy to drift, because
there's no copy. See `research.md` R2.

## Why Lifecycle Reuses the x-* Extension Field, Not a Catalog Override

Lab 4's `autoApiRegistration.ts` already reads `info.x-<namespace>.lifecycle` and puts it straight
into `spec.lifecycle` on the generated entity. An earlier draft of this lab instead hand-authored
`spec.lifecycle` directly in a catalog-info.yaml, silently overriding whatever the spec itself
declared — two sources of truth for the same fact, with the hand-authored one always winning
invisibly. This lab removes that override entirely: `x-examplecorp.lifecycle` in the spec file is
now the *only* place lifecycle state lives, and Steps 6–8 edit it there. See `research.md` R3.

## Why apiBasename Drives System Assignment

`apiBasename` is a new `x-examplecorp` field, read the same way `owner`/`lifecycle`/`visibility`
already are. It exists because "which logical API is this a version of" is metadata the API
producer should declare once, at the source, the same way they'd declare their own team as owner
— not something a catalog maintainer re-derives and hand-wires into a separate `System` file per
API family. `autoApiRegistration.ts` slugifies the value (`museum-api`) and uses it both as
`spec.system` on every matching `API` entity and as the `metadata.name` of a synthesized `System`
entity, deduplicated across every spec that shares it. See `research.md` R1a.

## Why Latest Is Computed, Not Hand-Flagged

It would be simpler to add an `apiportal.io/latest: "true"` annotation to whichever version is
newest. It would also be wrong the moment someone forgets to flip it when adding a third version —
two versions could both claim "latest," or none could. Instead, every version's spec just carries
its own `info.version`, and the Versions card computes which one is highest (excluding retired
versions) every time it renders. There's no flag to get out of sync, because there's no flag.

## Why Backstage's Native Search Is Left Unmodified

You might expect a retired version to be untraceable everywhere once it's retired — including
Backstage's own built-in full-text search. This lab deliberately does **not** touch that search
plugin or the default catalog table. A raw, catalog-wide search can still technically surface a
retired version (clearly labeled Retired once you open it) — that's the curated Versions card's
job, not the general-purpose search's. At real scale, this split is a feature, not a gap: an
auditor benefits from being able to find *everything* ever registered, while day-to-day discovery
benefits from a curated view that only shows what's current. See `research.md` R5.

## Why Supersede Lab 2's Entry, Not Edit It

Lab 2 registered a single `museum-api` entity via a hand-authored catalog-info.yaml. Introducing
"multiple major versions of the same API" properly requires versioned, auto-registered entities
(`museum-api-v1`, `museum-api-v2`) — there's no way to keep one entity unversioned while its
sibling is `-v2` and still teach "these are equally-versioned parallel entities." This lab
therefore removes Lab 2's original catalog location and, separately, adds a second
`autoApiRegistration` source pointing at this lab's own `apis/` directory. This is an
explicitly-permitted "breaking change to the environment" under this repository's constitution
(Development Workflow section) — if you're adapting this pattern to your own APIs, plan for the
same kind of one-time migration the first time you introduce explicit versioning to an API that
previously had none.

`museum-v1-openapi.yaml` is a **local copy** of Lab 1's spec, not a `$text` reference to it,
specifically so Lab 4's file-glob provider (which only reads local files) can discover it without
requiring an edit to Lab 1's already-committed file — see the copy's own header comment.

---

## Adaptable Conventions vs. Fixed Mechanics

Adaptable — change these freely for your own APIs:

- The `x-examplecorp` namespace name (rename to your own company/vendor identifier, same as Lab
  4's `xNamespace` — one namespace per organization, shared by every team and repo, not one per
  tool that happens to read it) and its `owner`/`visibility`/`lifecycle`/`apiBasename` fields.
- The five-value lifecycle convention (`development`/`testing`/`production`/`deprecated`/
  `retired`) — `spec.lifecycle` accepts any string; use whatever states match your own process.
- "One `apiBasename` per logical API" — this is the pattern to replicate, not a fixed name; a real
  catalog would have one `apiBasename` per API family, not just Museum's.

Fixed — this is the mechanism itself, not a convention:

- The `System`/`spec.system` relation as the grouping mechanism, and `autoApiRegistration.ts`'s
  synthesis of one `System` per distinct `apiBasename`.
- The `EntityCardBlueprint` pattern used to build the Versions card.
- Reading `info.version` directly rather than a parallel annotation.

---

## Verification

1. Both `museum-api-v1` and `museum-api-v2` appear in the catalog at the same time, with no
   hand-authored catalog-info.yaml for either (Step 4).
2. A `museum-api` System exists with no `system.yaml` ever authored (Step 4).
3. The Versions card on either page lists both versions and flags v2 Latest, computed from
   `info.version` (Step 4).
4. v1 and v2 show independent lifecycle chips that update independently as you edit each spec's
   `x-examplecorp.lifecycle` field, with no commit/push required (Steps 5–6).
5. Marking v1 deprecated shows the label everywhere v1 appears; marking it retired collapses it
   behind "Show retired versions" while it remains reachable via direct link (Steps 7–8).
6. `museum-api-v1`'s entity is never deleted — confirm it's still present at the end (Step 9).

## Troubleshooting

- **Versions card renders but shows only one version**: confirm both spec files set the exact same
  `x-examplecorp.apiBasename` value (`museum-api`) — a typo produces two different System slugs and
  an empty sibling list on each side.
- **Neither museum API version appears at all**: check the backend logs for
  `auto-api-registration:lab6-museum-api:` lines. A wrong `rootPath` in `app-config.yaml`'s
  second `autoApiRegistration` source is the most common cause — it must resolve (relative to
  `packages/backend`) to this lab's `apis/` directory.
- **Old `museum-api` entity still shows up alongside the new versioned ones**: you likely forgot
  to remove Lab 2's original catalog location entry from `app-config.yaml` in Step 2 — the old and
  new entities can coexist harmlessly, but that defeats the "supersede, don't duplicate" point of
  this lab.
- **Lifecycle edit doesn't show up immediately**: `autoApiRegistration` polls on its configured
  interval (30 seconds by default, see Lab 4's `schedule.frequencySeconds`) — give it a few
  seconds and refresh the page. Unlike Labs 2–5, there is no git push step here.
- **"Owner ... does not resolve to a known User or Group entity"**: confirm `group:default/
  museum-team` is registered (Lab 2's `teams.yaml`) — the same check Lab 4 already performs for
  every auto-registered API applies here too.
- **The `museum-api` System appears right after a restart, then disappears a cycle or two
  later**: you're running an older copy of `autoApiRegistration.ts` whose `buildSystemEntity()`
  doesn't set location annotations on the synthesized `System` — Backstage's own catalog
  processing treats a location-less entity as an orphan and removes it. Re-copy the file per
  Step 2 above; the current version sets a synthetic `backstage.io/managed-by-location` on every
  `System` it builds specifically to avoid this.

---

## Further Reading

- [`research.md`](../../specs/006-api-lifecycle-management/research.md) — the full set of design
  decisions and alternatives considered for this lab.
- [`data-model.md`](../../specs/006-api-lifecycle-management/data-model.md) — the exact entity
  shapes and the lifecycle state-transition diagram.
- [`labs/lab-04-auto-registration/README.md`](../lab-04-auto-registration/README.md) — the
  auto-registration mechanism this lab extends.
