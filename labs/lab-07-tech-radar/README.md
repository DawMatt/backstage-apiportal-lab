# Lab 7 — Other Documentation (Tech Radar)

## Overview

Every lab so far has documented *this specific API catalog*: what's registered, who owns it, how
good it is, how to mock it, how its versions relate. A Tech Radar is a different kind of
documentation — it's how a platform or API team communicates broader technology guidance:
"we recommend this technique," "we're trialing this tool," "we're assessing this framework,"
"avoid this, we're moving away from it." This lab adds the community
[Tech Radar plugin](https://github.com/backstage/community-plugins/tree/main/workspaces/tech-radar)
to the Backstage instance built in Labs 1–6, so that kind of guidance lives alongside the API
catalog instead of in a wiki page nobody reads.

By the end of this lab you will have:

- A **Tech Radar** page, reachable from the sidebar with no manual navigation edit, showing the
  classic Thoughtworks quadrants (Techniques, Tools, Platforms, Languages & Frameworks) and rings
  (Adopt, Trial, Assess, Hold), populated with sample blips drawn from this lab series' own
  practices (Spectral linting, Prism mocking, design-first OpenAPI, and more).
- A radar dataset — `radarData.json` — that is **pure data**, not application source code. Adding,
  moving, or retiring a blip is a one-file JSON edit; nothing under this module's `.ts` files ever
  needs to change for routine radar maintenance.
- A working understanding of how to register a new blip, move an existing one to a different
  ring (with a visible "moved" indicator), and retire one that's no longer relevant.

**What you will learn:**

- Why this lab deliberately does **not** install the plugin's optional backend package, and
  instead supplies its own tiny, fixed piece of code that reads a committed JSON file (see "Why
  No Backend Package" below)
- Why the radar's content lives in a `.json` file rather than a `.ts` module — unlike every
  other lab in this series — and why that distinction matters
- How the new Backstage frontend system's `.override()` mechanism lets you replace one specific
  part of a plugin (its data source) while keeping everything else the plugin provides (the page,
  the routing, the UI) completely unmodified
- What actually happens — in detail, not in theory — when your radar data has a mistake in it

---

## Prerequisites

- **Labs 1–6 completed** — Backstage running locally via `yarn start` in
  `labs/lab-01-base-backstage/backstage/`
- **Node.js 20+ (or 22/24) and Yarn** — same toolchain as every prior lab
- One new dependency, freely available on npm at $0 cost:
  [`@backstage-community/plugin-tech-radar`](https://www.npmjs.com/package/@backstage-community/plugin-tech-radar)
  (pinned `^1.20.0` at time of writing). No account, API key, or paid service of any kind.
- Do **not** install `@backstage-community/plugin-tech-radar-backend` — see "Why No Backend
  Package" below for why this lab deliberately skips it.

No Security Note is needed for this lab: it introduces no authentication, credentials, or secrets
of any kind (Constitution Principle IX is not applicable here).

---

## Step 1 — Install the Plugin (Frontend Only)

From the Backstage instance's `packages/app` directory:

```bash
yarn --cwd packages/app add @backstage-community/plugin-tech-radar
```

That's the only install command this lab needs. Confirm `package.json` now lists it:

```json
"@backstage-community/plugin-tech-radar": "^1.20.0",
```

## Step 2 — Copy the Module In

Copy this lab's committed module into the student instance:

```text
labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/
  → labs/lab-01-base-backstage/backstage/packages/app/src/modules/techRadar/
```

It contains three files, each with a distinct job:

- [`radarData.json`](code/packages/app/src/modules/techRadar/radarData.json) — the radar's
  **content**. This is the only file you edit for day-to-day radar maintenance.
- [`techRadarApi.ts`](code/packages/app/src/modules/techRadar/techRadarApi.ts) — a small, fixed
  `TechRadarApi` implementation that reads `radarData.json`.
- [`index.ts`](code/packages/app/src/modules/techRadar/index.ts) — wires the plugin's page and
  this lab's data source into the new frontend system.

## Step 3 — Register the Module

In `packages/app/src/App.tsx`, import and register both the plugin's own default export (the
page) and this lab's override module:

```ts
import { techRadarPlugin, techRadarModule } from './modules/techRadar';

export default createApp({
  features: [
    // ...existing features from Labs 1–6...
    techRadarPlugin,
    techRadarModule,
  ],
});
```

No `app-config.yaml` change is required — see "Why `.override()`, Not `app-config.yaml`" below.

## Step 4 — Start Backstage and Verify

```bash
yarn start
```

Sign in (guest is fine) and look for a **Tech Radar** entry in the sidebar — it appears
automatically, the same way every other page registered in this series does. Open it and confirm:

- All 4 quadrants (Techniques, Tools, Platforms, Languages & Frameworks) and all 4 rings (Adopt,
  Trial, Assess, Hold) are visible, each with at least one blip.
- Clicking a blip (try "Spectral linting in CI") opens a detail view showing its description and
  full ring history, including a ↑/↓ movement indicator where the blip has changed rings.

---

## Step 5 — Register, Move, and Retire a Blip

All three operations below edit only `radarData.json` — no `.ts` file changes needed, and no
rebuild step beyond Backstage picking up the file change (the dev server watches it like any
other source file).

### Register a new blip

Add a new object to `radarData.json`'s `entries` array:

```json
{
  "id": "your-blip-id",
  "key": "your-blip-id",
  "title": "Your Blip Title",
  "quadrant": "tools",
  "description": "Why this technology/technique/tool is being tracked.",
  "timeline": [
    { "ringId": "assess", "date": "2026-07-06", "description": "Why it's at this ring." }
  ]
}
```

Save, reload the Tech Radar page, and confirm the new blip appears in the quadrant/ring you chose.

### Move a blip to a different ring

Append a new element to an existing entry's `timeline` array, with a later `date`, the new
`ringId`, and a `moved` value:

```json
{ "ringId": "trial", "date": "2026-08-01", "moved": 1, "description": "Why it was promoted." }
```

- `moved: 1` — the blip moved toward Adopt (more mature/more confident)
- `moved: -1` — the blip moved toward Hold (less mature/less confident)
- `moved: 0` or omitted — no change in confidence, just a note

Reload and confirm the blip now shows in its new ring, with the movement arrow in its detail view.

### Retire a blip

Delete the entry's entire object from the `entries` array. Reload and confirm it no longer
appears anywhere on the radar. There is no separate "retired" ring or archive — the Tech Radar
model doesn't have a formal retirement concept the way this series' API lifecycle lab (Lab 6)
does; a blip that's no longer relevant is simply removed from the current edition.

---

## Understanding the Rings and Quadrants

**Rings** (shared across all quadrants, describing how strongly something is recommended):

- **Adopt** — We recommend using this for every relevant new project. Proven in production, low
  risk.
- **Trial** — Worth pursuing. It's important to understand how to build up this capability. Try
  it on a project that can handle the risk.
- **Assess** — Worth exploring, with the goal of understanding how it will affect your
  organization. Not yet proven enough to trial.
- **Hold** — Proceed with caution. Either avoid for new work, or actively plan to migrate away
  from it.

**Quadrants** (categories of things being tracked — this lab uses the classic Thoughtworks four,
confirmed with the repository maintainer during specification):

- **Techniques** — practices and approaches (e.g. design-first OpenAPI, Spectral linting in CI)
- **Tools** — concrete software (e.g. the Backstage catalog itself, Prism mock servers)
- **Platforms** — where things run (e.g. self-hosted Backstage)
- **Languages & Frameworks** — specification languages and frameworks (e.g. AsyncAPI, OpenAPI)

**The "moved" indicator**: each blip's `timeline` is a history of ring snapshots over time. The
most recent snapshot's `moved` value tells you whether confidence went up (`1`, toward Adopt),
down (`-1`, toward Hold), or stayed the same (`0`/omitted) relative to the *previous* snapshot in
that same blip's timeline — not relative to any other blip.

---

## Why No Backend Package

The plugin has an optional companion, `@backstage-community/plugin-tech-radar-backend`, which
loads radar data from a **remote URL** via Backstage's `UrlReader` service — typically a raw
GitHub URL pointing at a JSON file in your repository. That's a reasonable choice for a team that
already has this repo pushed and public. It's the wrong choice for this lab series specifically,
because:

- It requires the repo to be **pushed to a public (or credentialed) remote** before the radar
  works at all — a learner following along locally, not yet pushed, would see it fail.
- It makes the radar's availability depend on **live network access** at every page load, which
  conflicts with this series' constitution (no lab may require network access beyond installing
  dependencies).

Instead, this lab implements its own `TechRadarApi` (`techRadarApi.ts`) whose `load()` method
statically imports the committed `radarData.json` and validates it with the plugin's own
`TechRadarLoaderResponseParser` — the exact same validation the backend package would apply to a
remote file, just applied to a local one with zero network dependency. If you fork this repo for
a real team, and you're comfortable depending on a pushed repository, the backend package with a
GitHub raw URL is a perfectly reasonable production alternative — this lab's approach optimizes
for "works standalone, offline, before you've pushed anything," not for "requires the least code."

## Why a JSON File, Not TypeScript Source

Every other lab in this series (Labs 2, 3, 5, 6) commits its sample data as typed `.ts`/`.tsx`
source, because that data is small, stable, and benefits from compile-time type-checking. This
lab deliberately breaks that pattern: `radarData.json` is plain JSON, not a `.ts` module, because
a Tech Radar's content is expected to change often — new blips added, existing ones moved or
retired — by people who shouldn't need to touch application source code or understand TypeScript
to do it. A `.json` file is unambiguously "data you edit," not "code you edit." The trade-off is
that a mistake (a missing field, a misspelled ring id) is now caught at **runtime** rather than at
compile time — see "What Actually Happens When Your Data Is Wrong" below for exactly what that
looks like in practice.

## Why `.override()`, Not `app-config.yaml`

An earlier version of this lab's plan assumed you'd need to disable the plugin's default API via
an `app.extensions` entry in `app-config.yaml`, then register a replacement separately. That
turned out to be unnecessary: the plugin's `/alpha` extensions
(`techRadarApi`, `techRadarPage`) are built as `OverridableExtensionDefinition`s in Backstage's
new frontend system, which expose a built-in `.override({ params: ... })` method. Calling
`techRadarApi.override(...)` replaces the default factory in place, under the same extension id —
no config file needs to know anything changed. `index.ts` does exactly this:

```ts
const staticTechRadarApi = techRadarApi.override({
  params: defineParams =>
    defineParams({
      api: techRadarApiRef,
      deps: {},
      factory: () => new StaticTechRadarApi(),
    }),
});
```

If you're overriding a *different* plugin's API in your own fork, check whether its extension is
similarly `Overridable` before reaching for an `app-config.yaml` disable-and-replace — it's often
unnecessary.

## What Actually Happens When Your Data Is Wrong

Both edge cases below were verified by deliberately breaking `radarData.json` against a running
instance — not assumed from documentation.

**A required field is missing or the wrong type** (e.g. an entry with no `title`): the
`TechRadarLoaderResponseParser.parse()` call in `techRadarApi.ts` throws a Zod validation error,
which the plugin surfaces as a visible error panel directly on the Tech Radar page:

```json
[{"code":"invalid_type","expected":"string","received":"undefined","path":["entries",0,"title"],"message":"Required"}]
```

The `path` array tells you exactly which entry (by index) and which field is at fault.

**A `quadrant` or `ringId` doesn't match a declared id** (e.g. a typo): this is **not** caught by
`TechRadarLoaderResponseParser` — it only checks that the value is a string, not that it matches
something in the `quadrants`/`rings` arrays. Instead, the plugin's own rendering code fails when
it tries to place the blip, crashing the **entire radar page** with a full-page error overlay:

```text
Unknown quadrant undefined for entry <your-blip-id>!
```

(or `Unknown ring undefined for entry <your-blip-id>!` for a bad `ringId`). This is louder than a
single missing blip — the whole page goes down — so double-check every `quadrant`/`ringId` value
against the arrays at the top of `radarData.json` before saving.

---

## Adaptable Conventions vs. Fixed Mechanics

**Freely adaptable** (change these for your own team without touching any code):

- Every blip in `radarData.json` — add, remove, rename, re-categorize, re-word descriptions
- The specific quadrant names and ring names, if your organization uses a different model (the
  plugin doesn't require the classic Thoughtworks four — this lab uses them because they're the
  most widely recognized starting point)
- How many entries you have per quadrant/ring (this lab keeps FR-009's "at least one per
  quadrant/ring" as a minimum for demonstration purposes, not a hard limit)

**Fixed mechanics** (the mechanism to replicate, not to redesign):

- `techRadarApi.ts`'s shape: import the JSON, validate with
  `TechRadarLoaderResponseParser.parse()`, return it. This is the pattern to reuse if you add a
  second radar or change how data is sourced.
- The `.override()` registration pattern in `index.ts` — this is how the new frontend system
  expects you to replace one specific extension of an installed plugin.

---

## Verification Checklist

- [ ] Tech Radar page reachable from the sidebar with no manual nav edit
- [ ] All 4 quadrants and all 4 rings have at least one visible blip
- [ ] Clicking a blip shows its title, description, and ring history
- [ ] A new blip can be registered by editing only `radarData.json`
- [ ] An existing blip can be moved to a new ring, with a visible movement indicator
- [ ] An existing blip can be retired (removed) and disappears after reload
- [ ] A malformed `radarData.json` (missing field) produces a visible Zod error panel
- [ ] An invalid quadrant/ring id crashes the whole radar page with a clear error message

## Troubleshooting

- **Radar page shows a full-page error overlay reading "Unknown quadrant/ring undefined for
  entry ..."**: one of your entries has a `quadrant` or `timeline[].ringId` value that doesn't
  match any `id` in the `quadrants`/`rings` arrays at the top of `radarData.json`. Check for
  typos — this is not caught automatically (see "What Actually Happens When Your Data Is Wrong").
- **Radar page shows a JSON error panel with `"code":"invalid_type"` or similar**: a required
  field is missing or has the wrong type. The `path` array in the error tells you which entry
  (by array index) and field to fix.
- **Sidebar has no "Tech Radar" entry**: confirm both `techRadarPlugin` and `techRadarModule` are
  listed in `App.tsx`'s `features` array (Step 3) and that `yarn start` restarted cleanly after
  the change.
- **Edits to `radarData.json` don't seem to take effect**: the dev server watches this file like
  any other source file and should recompile automatically within a few seconds — give it a
  moment, then do a full browser reload (not just re-navigating within the app).
