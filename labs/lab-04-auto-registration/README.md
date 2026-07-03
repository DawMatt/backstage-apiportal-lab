# Lab 4 — Auto Registration

## Overview

Labs 1–3 registered every API by hand-authoring a `catalog-info.yaml` per API and adding it as a
`type: url` catalog location. That works for three APIs; it does not work for a mono-repo with
hundreds. This lab replaces the per-API hand-authored file with a custom Backstage backend module
that scans a directory tree for `*-openapi.yaml` / `*-asyncapi.yaml` files and turns each one
directly into a catalog `API` entity — no `catalog-info.yaml` required.

By the end of this lab you will have:

- A new backend module (`autoApiRegistration.ts` + a small database migration) that discovers,
  parses, and registers API definitions on a poll schedule, using Backstage's `EntityProvider`
  mechanism so create, update, and removal all come from the same code path.
- Owner, lifecycle, and visibility metadata sourced from each spec's own `info.x-examplecorp`
  object, with documented defaults when a field is absent — no duplication of metadata that
  already has a natural home in the spec (`info.title`, `info.description`, native `tags`).
- Errors (malformed files, unresolvable owners, invalid visibility values, name collisions)
  surfaced through Backstage's own backend logs and its native catalog processing-error UI — no
  bespoke error-reporting system.
- Two new sample APIs: a vendored copy of the Scalar Galaxy API (pure auto-discovery, no
  `catalog-info.yaml`) and a small precedence-demo API pair that demonstrates a hand-authored
  `catalog-info.yaml` winning over auto-sourced metadata for the same API.

**What you will learn:**

- Why a custom `EntityProvider` (not a `CatalogProcessor`) is the right mechanism for
  filesystem-based catalog discovery, and how its `full`/`delta` mutation lifecycle gives you
  create/update/remove for free
- How to source catalog metadata from a vendor-namespaced `x-*` extension instead of a parallel
  hand-authored file, and how to fall back safely when a field is absent
- How to surface processing errors through Backstage's built-in mechanisms (backend logs + a
  `CatalogProcessor` that throws on a marker annotation) instead of inventing a new one
- How a persisted scan-state cache and `sources[]` config generalize this mechanism from "one
  small demo repo" to "1000+ files across multiple team repos" without an architecture change

---

## Prerequisites

- **Lab 3 completed** — Backstage running locally with Museum API, Streetlights API, and Train
  Travel API registered; `eve` (platform team) able to sign in and see quality detail
- **Node.js 20 LTS** and **Yarn** — same versions as Labs 1–3

---

## Step 1 — Add Dependencies

From `packages/backend`, add the three new direct dependencies (`fast-glob` for the filesystem
scan, `js-yaml` for parsing, `chokidar` for the optional `watch` mode used at real-world scale):

```
cd packages/backend
yarn add fast-glob@3.3.3 js-yaml@4.2.0 chokidar@3.6.0
```

All three are already present transitively in the workspace — this promotes them to explicit
dependencies of the backend package, which is what actually imports them.

---

## Step 2 — Add the Auto-Registration Backend Module

This is the heart of the lab: a backend module that scans a directory for API definition files,
parses each one, and emits catalog `API` entities via a custom `EntityProvider`. A companion
`CatalogProcessor` surfaces registration errors (invalid owner, invalid visibility, name
collisions) through Backstage's native processing-error UI.

**Why an `EntityProvider`, not a `CatalogProcessor`?** A `CatalogProcessor` only transforms
entities that already exist via some `Location` — it can't originate new entities from an
arbitrary filesystem scan on its own. An `EntityProvider` owns a versioned "set of entities I
currently know about"; anything it stops claiming is automatically retracted by the catalog. That
gives create, update, and removal-on-delete from one code path, with no separate cleanup logic.

**Why is owner/lifecycle/visibility sourced from `info.x-examplecorp` instead of duplicated
fields?** Metadata that already has a natural home in the spec — `info.title` (name),
`info.description` (description), native top-level `tags` — is read from there, not duplicated
into a vendor extension. Only metadata with **no** natural OpenAPI/AsyncAPI home (who owns this
API, what lifecycle stage it's in, whether it's private or shared) goes under `x-examplecorp`.
`examplecorp` is a fictional company namespace — it's the first thing you should rename to your
own company when adapting this lab (see "Adaptable Conventions" below).

**Why does visibility reuse the exact `example.com/visibility` annotation from Lab 2/3?** The
permission policy from Lab 3 (`packages/backend/src/extensions/permissionPolicy.ts`) already
reads that annotation to decide access: `shared` bypasses ownership entirely, anything else
(including absent) falls through to the ownership-only rule. This lab adds a **third way to set
that same annotation** — sourced from `x-examplecorp.visibility` — not a new visibility mechanism
or a change to the permission policy.

**Why do errors ride on Backstage's own backend logs and processing-error UI, instead of a new
error-reporting system?** Every discovery cycle logs one line per skipped/errored file via the
standard backend logger. For errors on a file specific enough to have a candidate entity (invalid
owner, invalid visibility, name collision), the provider still emits a minimal entity tagged with
an `apiportal-lab.io/registration-error` annotation; a small companion `CatalogProcessor` throws an
`InputError` when it sees that annotation, and Backstage's catalog engine natively records and
surfaces per-entity processing errors — the same "Inspect entity" / processing-errors view you'd
see for any other catalog ingestion problem. One message, written once, drives both surfaces.
Files that fail even the basic shape check (not parseable as an API spec at all — no
`openapi`/`asyncapi` field, no `info.title`) can't produce a minimal entity (there's no name to
register under), so those are logged only, not surfaced in the UI.

**Why does a hand-authored `catalog-info.yaml` win over auto-sourced metadata?** If a file already
has a hand-authored catalog entry (`kind: API`, matching `metadata.name`) that didn't come from
this provider, the provider skips its own auto-sourced candidate for that name entirely. This
lets you hand-author precise metadata for a specific API — pinning an owner, tightening
visibility — without the auto-registration mechanism fighting you for it every cycle.

Create the database migration first, at
`packages/backend/src/extensions/autoApiRegistrationMigrations/001_scan_state_cache.ts`. Its full
content is committed alongside this README —
[`code/packages/backend/src/extensions/autoApiRegistrationMigrations/001_scan_state_cache.ts`](./code/packages/backend/src/extensions/autoApiRegistrationMigrations/001_scan_state_cache.ts)
— copy it in as-is. It creates the `auto_api_registration_scan_state` table (`source_id`,
`file_path`, `mtime_ms`, `content_hash`, `entity_name`, `last_error`), applied via a knex custom
`migrationSource` (see the module below) rather than a filesystem `directory` migration source,
since this file lives alongside the module's TypeScript source rather than in a package-level
`migrations/` folder resolved at runtime.

Now the module itself, at `packages/backend/src/extensions/autoApiRegistration.ts` — this is the
heart of the lab. Its full content (~750 lines: config normalization, filesystem discovery and
YAML parsing, `x-*` candidate mapping with owner/visibility/collision validation, the scan-state
cache, the `EntityProvider` itself with its poll/watch scheduling, and the companion
`CatalogProcessor`) is committed alongside this README —
[`code/packages/backend/src/extensions/autoApiRegistration.ts`](./code/packages/backend/src/extensions/autoApiRegistration.ts)
— copy it in as-is.

---

## Step 3 — Register the Module

Open `packages/backend/src/index.ts` and add one line after the existing catalog module
registrations:

```typescript
// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// Lab 4: auto-discover *-openapi.yaml / *-asyncapi.yaml files and register them as API entities
// with no hand-authored catalog-info.yaml required — see labs/lab-04-auto-registration/README.md
backend.add(import('./extensions/autoApiRegistration'));
```

Like `permissionPolicy.ts` in Lab 3, the module self-registers and declares its own dependencies
via `createBackendModule` — no other wiring is needed.

---

## Step 4 — Configure Discovery

Add an `autoApiRegistration` block to `app-config.yaml`. This is the **single-source shorthand**
— equivalent to a one-entry `sources: [{ id: default, ... }]` list — which is all a single-repo
setup like this lab needs:

```yaml
autoApiRegistration:
  defaultOwner: group:default/platform-team
  defaultVisibility: private
  xNamespace: examplecorp
```

`rootPath` is deliberately left unset here — the module resolves a default of
`labs/lab-04-auto-registration/apis` (relative to the backend package) on its own. `patterns`,
`ignore`, `mode`, and `schedule.frequencySeconds` all default sensibly too (see "Adaptable
Conventions vs. Fixed Mechanics" below for the full list). `defaultOwner` and `xNamespace` have no
built-in default and must be set explicitly — a source shouldn't silently inherit a fallback team
or vendor namespace it never opted into.

---

## Step 5 — Add the Sample API Files

Two sample files are already committed alongside this README (nothing to create in this step —
just take a look):

- **`apis/galaxy/galaxy-openapi.yaml`** — a vendored copy of the MIT-licensed
  [Scalar Galaxy API](https://github.com/scalar/scalar), with an `info.x-examplecorp` object
  (`owner`, `lifecycle`, `visibility: shared`) added. It has **no** `catalog-info.yaml` — this is
  the "previously unregistered API" that Step 6 will confirm gets discovered automatically.
- **`apis/precedence-demo/precedence-demo-openapi.yaml`** + **`precedence-demo-catalog-info.yaml`**
  — a minimal API paired with a *hand-authored* catalog entry (owner `museum-team`,
  `visibility: private`) that deliberately differs from the spec file's own `x-examplecorp`
  values (owner `platform-team`, `visibility: shared`). This demonstrates the precedence rule:
  the hand-authored file wins.

The hand-authored `precedence-demo-catalog-info.yaml` needs its own catalog location, the same way
Lab 2/3's hand-authored files do — add it to `app-config.yaml`'s `catalog.locations`, replacing
`<user>` and `<branch>` with your fork and the current branch name:

```yaml
catalog:
  locations:
    # --- Lab 4: Precedence-demo API (hand-authored — must win over auto-sourced metadata) ---
    - type: url
      target: https://raw.githubusercontent.com/<user>/backstage-apiportal-lab/<branch>/labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-catalog-info.yaml
      rules:
        - allow: [API]
```

This only works once you've pushed your branch — the raw URL has to actually resolve. If you
haven't pushed yet, push now before continuing to Step 6.

---

## Step 6 — Start Backstage and Verify Discovery

```
yarn start
```

Within one discovery cycle (default 30s), open the catalog and confirm:

- **The Galaxy API appears with no hand-authored `catalog-info.yaml`.** Search for "Scalar
  Galaxy" — it should show up as an `API` entity even though you never wrote a `catalog-info.yaml`
  for it.
- **Its owner, lifecycle, and tags match the spec.** `spec.owner` and `spec.lifecycle` should
  match the `info.x-examplecorp` values in `galaxy-openapi.yaml`; `metadata.tags` should match its
  native `tags` array (slugified — kebab-case, not the original mixed-case names).
- **Visibility contrast.** Sign in as a non-owning, non-platform user (e.g. `charlie`, from Lab
  2 — see `app-config.local.yaml`). The Galaxy API (`visibility: shared`) should be visible; the
  precedence-demo API (`visibility: private`, hand-authored, owned by `museum-team`) should not be.
- **Precedence.** The precedence-demo API's entity should reflect the hand-authored
  `precedence-demo-catalog-info.yaml` (owner `museum-team`, `visibility: private`) — **not** the
  auto-sourced `x-examplecorp` values in its own spec file (owner `platform-team`,
  `visibility: shared`).

---

## Step 7 — Verify Update-in-Place

Edit `apis/galaxy/galaxy-openapi.yaml`'s `info.description` and wait one poll cycle. Reload the
Galaxy API's entity page — the description should update in place. The entity's `metadata.uid`
does not change; this is an update, not a duplicate registration.

---

## Step 8 — Verify Removal

Temporarily rename `galaxy-openapi.yaml` to something outside the discovery pattern (e.g.
`galaxy-openapi.yaml.bak`) and wait one poll cycle. The Galaxy API should disappear from the
catalog. Rename it back — it reappears within one more cycle, as a fresh registration (a new
`metadata.uid`, since from the provider's perspective this is indistinguishable from a new file).

---

## Step 9 — Verify Error Handling

Three failure modes, each temporary — revert after checking:

1. **Malformed YAML.** Break the syntax in one sample file (e.g. an unclosed quote). Check the
   backend logs — you should see a line identifying the specific file, and the entity for that
   file should simply stop appearing in the catalog (not appear broken; log-only, since a file
   that doesn't parse has no name to register an error entity under).
2. **Unresolvable owner.** Set `info.x-examplecorp.owner` to a nonexistent team (e.g.
   `group:default/nonexistent-team`). Within one cycle, the entity's "Inspect entity" view should
   show a catalog processing error naming the bad owner reference. Other entities are unaffected.
3. **Invalid visibility.** Set `info.x-examplecorp.visibility` to an unrecognized value (e.g.
   `public`). You should see the same kind of processing error — not a silent fallback to
   `private`.

---

## Adaptable Conventions vs. Fixed Mechanics

**Adaptable — change these to fit your own repo layout:**

- `rootPath` — where the scan starts. Point it at your own mono-repo root.
- `patterns` — the filename glob(s) that identify an API definition file. The default
  (`**/*-openapi.yaml`, `**/*-asyncapi.yaml`) is this lab's convention, not Backstage's; use
  whatever your team already follows.
- `xNamespace` — the vendor namespace under `info.x-<namespace>` that owner/lifecycle/visibility
  are read from. `examplecorp` is a fictional placeholder — **rename this to your own company or
  team first** when adapting this lab.
- `defaultOwner` / `defaultVisibility` — the fallback values used when a spec doesn't declare its
  own. Per-source, so different repos can have different fallbacks.
- `ignore` — glob exclusions, always applied. Extend (don't replace) the defaults
  (`node_modules`, `.git`, `dist`, `build`) for your own build-output directories.

**Fixed — this is how the mechanism works, not a config knob:**

- The `EntityProvider` full-then-delta mutation lifecycle (Step 2's rationale above).
- The scan-state cache schema and its role in restart/delta behavior (see "Scaling to a Real
  Mono-Repo" below).
- Errors riding on Backstage's native backend-log + processing-error-UI mechanisms, rather than a
  bespoke error system.
- The catalog-info.yaml precedence rule: a hand-authored entity for a name always wins over an
  auto-sourced candidate for that same name.

---

## Scaling to a Real Mono-Repo

This lab's defaults (`mode: 'poll'`, 30-second full sweep, no reconciliation) are tuned for 2–3
sample files and interactive feedback — they are **not** what a 1000+ file, 1GB+ mono-repo should
run with. The architecture (an `EntityProvider` driving mutations) scales fine as-is; only the
config values need to change:

- **`mode: 'watch'`** replaces the repeated full-tree poll with a `chokidar` watcher that reacts
  to individual file add/change/unlink events, so "how often do we rescan" stops scaling with
  repo size. A much longer `reconciliation.frequencySeconds` (minutes, not seconds) runs
  alongside it as a safety-net full sweep, catching anything a watcher event could plausibly miss
  (coalesced events under a big `git pull`, watcher reliability limits on some filesystems).
- **The scan-state cache is what makes restarts fast at scale.** It's a small table in the
  backend's own database (`coreServices.database` — SQLite in this lab, Postgres in a real
  deployment), storing each file's path, modification time, content hash, and mapped entity name.
  On restart, the provider compares this cache against the filesystem instead of re-parsing
  everything from zero — unchanged files cost nothing. This is deliberately **not** written back
  into the mono-repo as generated `catalog-info.yaml` files: that would reintroduce the
  hand-maintained-duplicate-file problem this lab exists to eliminate, and would require the
  discovery tool to have *write* access to a repo it should only need to read.
- After the first `full` mutation establishes the baseline, every later cycle sends a `delta`
  mutation (`added`/`removed` only) — cost proportional to what changed, not to total catalog
  size. This is the same pattern Backstage's own GitHub discovery provider uses at organization
  scale.
- `parseConcurrency` bounds how many files are parsed at once, so a large batch of simultaneous
  changes (e.g. checking out a branch that touches hundreds of files) doesn't spike memory or
  block the event loop.

If you scale this lab up, expect restarts to be fast (cache-driven, not a full re-scan) — that's
the part most likely to surprise you the first time.

---

## Scaling to Multiple Source Repositories

The config schema generalizes from one `rootPath` to a list of independently-configured sources:

```yaml
autoApiRegistration:
  sources:
    - id: platform-monorepo
      rootPath: ../platform-monorepo/apis
      patterns: ['**/*-openapi.yaml', '**/*-asyncapi.yaml']
      mode: watch
      reconciliation:
        frequencySeconds: 900
      defaultOwner: group:default/platform-team
      defaultVisibility: private
      xNamespace: examplecorp
    - id: team-checkout-api
      rootPath: ../team-checkout-api
      patterns: ['**/*-openapi.yaml']
      mode: poll
      schedule:
        frequencySeconds: 60
      defaultOwner: group:default/checkout-team
      defaultVisibility: shared
      xNamespace: checkoutteam
```

Each entry becomes its own `EntityProvider` instance with its own schedule, own mode, own default
owner, and own `x-*` namespace — a slow filesystem or config problem in one source can't stall or
break discovery for any other source.

`defaultOwner` and `xNamespace` are per-source with **no** built-in global fallback: a team
onboarding their own repo shouldn't have to adopt the platform mono-repo's team or vendor
namespace just to participate. `defaultVisibility` is the one exception — it's per-source but
*does* fall back to `private` if a source doesn't set it, because leaving visibility completely
unconfigured must still be safe by default, not just adaptable.

Collision detection and the catalog-info.yaml precedence check are **global across every source**,
not scoped to whichever source is currently being scanned — two different teams' repos can easily
produce the same slugified entity name (two `payments-api`s), and that must surface a visible
conflict rather than silently coexisting or overwriting.

Onboarding a genuinely separate Git remote (not a local sibling checkout, which is what this lab's
own multi-source walkthrough would use) needs one more piece this lab doesn't build: a sync step
(e.g. a scheduled shallow `git clone`/`pull` into a local cache directory) ahead of the existing
glob/parse pipeline, pointing that source's `rootPath` at the resulting local worktree. Every other
mechanism — glob patterns, ignore rules, delta mutations, scan-state cache, collision/precedence
checks — is reused unchanged; only how bytes arrive on local disk differs.

---

## Verification Checklist

- [ ] Galaxy API appears in the catalog within one poll cycle, with no hand-authored
      `catalog-info.yaml`
- [ ] Galaxy API's owner/lifecycle match its `x-examplecorp` values; tags match its native `tags`
      array
- [ ] Editing `galaxy-openapi.yaml`'s description updates the existing entity, not a duplicate
- [ ] Renaming `galaxy-openapi.yaml` out of the discovery pattern retracts the entity; renaming it
      back re-registers it
- [ ] Galaxy (`shared`) is visible to a non-owning, non-platform user; precedence-demo
      (`private`, hand-authored) is not
- [ ] The precedence-demo API reflects `precedence-demo-catalog-info.yaml`'s values, not its own
      spec file's `x-examplecorp` values
- [ ] A broken-YAML file logs an identifying error and its entity does not appear
- [ ] A nonexistent owner reference surfaces a catalog processing error on that entity only
- [ ] An unrecognized visibility value surfaces a processing error rather than a silent default

---

## Troubleshooting

- **Nothing appears after 30+ seconds.** Check the backend logs for
  `auto-api-registration:default:` lines. A "skipped a cycle — provider not yet connected"
  warning on the very first tick is normal (the scheduler's first run can fire slightly before
  the catalog engine finishes wiring up the provider); it should not repeat.
- **"Owner ... does not resolve to a known User or Group entity" for an owner you're sure
  exists.** Confirm that group is actually loaded in the catalog (check its entity page directly)
  — this error means the *catalog* doesn't know about the group yet, not that your YAML is wrong.
  A common cause locally is a `catalog.locations` URL that hasn't been pushed yet (see Step 5).
  This can also show up as "no APIs appear in the catalog at all" rather than a single owner
  error: if the `catalog.locations` entry for your org data (`teams.yaml`/`users.yaml`) points at
  a branch name that's since been merged and deleted (a stale reference from an earlier lab,
  rather than your current branch), that location 404s, the group it would have defined never
  registers, and *every* auto-sourced API whose owner references that group fails validation —
  which looks like the discovery mechanism itself is broken. Check the backend logs for "Unable
  to read url, no matching files found" lines against your `catalog.locations` URLs first; if any
  point at a branch other than `main` or your current branch, that's almost always the real cause.
- **An entity you expect to see is silently missing, with no error logged.** Check the backend
  logs for a `Policy check failed for api:default/<name>` warning — this means the entity was
  built and emitted, but failed Backstage's own entity-schema validation (for example,
  `metadata.tags` containing something that isn't a valid kebab-case slug) during processing, so
  it never got "stitched" into the catalog you can query. This is different from a registration
  error (which the error processor surfaces intentionally) — it's a schema mismatch the entity
  never should have had in the first place.
- **A stale entity keeps reappearing after you thought you removed it.** The scan-state cache
  persists across backend restarts (it's a real database table, not in-memory). If you manually
  edited the database or copied it between environments, the cache may be out of sync with the
  filesystem. Deleting the `auto_api_registration_scan_state` table (or just wiping the local
  SQLite file, per this lab's `':memory:'` dev config, restarting achieves the same thing) forces
  a fresh full rescan.
- **Glob pattern typos.** If a file you expect to be discovered isn't, double check `patterns` —
  a mismatched suffix (`-openapi.yml` vs `-openapi.yaml`) is a common culprit, and the discovery
  mechanism has no way to tell you "this almost matched."
- **Wrong `xNamespace`.** If owner/lifecycle/visibility all come back as defaults even though your
  spec file has an `x-*` object, check that the object's key matches `xNamespace` exactly —
  `x-examplecorp` in config but `x-example-corp` (extra hyphen) in the spec file will silently
  fall through to defaults rather than error, since an absent `x-*` object is valid input.
