# Research: Lab 7 — Tech Radar

## R1: Which package, and which install path (frontend-only vs. frontend+backend)?

**Decision**: Frontend-only. Install `@backstage-community/plugin-tech-radar` and register its
`/alpha` default export (`techRadarPage` + `techRadarApi`) as a `createApp` feature, exactly like
`catalogPlugin` is already registered in `App.tsx`. Do **not** install
`@backstage-community/plugin-tech-radar-backend`.

**Rationale**: The backend plugin (`plugin-tech-radar-backend`) only loads radar data from a
**remote URL** via Backstage's `UrlReader` service (`techRadar.url` in `app-config.yaml`,
typically a GitHub raw URL) — confirmed from its README. There is no documented local-file mode.
Requiring a pushed, publicly-reachable GitHub URL to render the radar at lab-run time would
violate Constitution Principle V (Zero-Cost, implicitly requires no *runtime* network dependency
beyond initial install) and the "no external network access beyond downloading dependencies"
rule in the Lab Structure Standards — the radar would break for a learner running fully offline
after `yarn install`, or one who hasn't pushed their fork yet. This is the same class of
limitation already recorded in project memory for `$text`/`type: file` in `catalog-info.yaml`
(GitHub-hosted URL required, no true local read) — the fix here is analogous but goes one step
further: avoid the network-dependent path entirely rather than routing through a raw URL.

Instead, the plugin's `TechRadarApi` interface (`load(id): Promise<TechRadarLoaderResponse>`) is
designed to be user-implemented: the default implementation (`DefaultTechRadarApi`) itself falls
back to bundled mock data if no backend is present. This repo will supply its own
`TechRadarApi` implementation whose `load()` resolves a **statically imported, committed JSON data
file** — no network call, no backend package, no generated file (see R2 — the user explicitly
wants radar content managed as a data file in git, not as edits to application source code, so
this goes one step further than Lab 2/3/6's precedent of committing typed `.ts` source).

**Alternatives considered**:
- `tech-radar-backend` + local repo file via a raw GitHub URL: rejected — requires the fork to be
  pushed and public before the lab can be verified, and silently breaks for anyone working
  offline or from a private fork mid-edit.
- `tech-radar-backend` + a custom `UrlReader`/`file:` integration: not documented as supported by
  the plugin; would add backend complexity and a new dependency for no benefit over a static
  frontend client.
- Implementing a bespoke radar visualization instead of the plugin: rejected — the lab's purpose
  (GOAL.md Lab 7) is specifically to demonstrate the named Thoughtworks Radar **plugin**
  (Constitution Principle I: named, concrete Backstage feature).

## R2: How does registering/moving/retiring a blip work mechanically?

**Decision (revised after user feedback)**: The radar content is a single committed **JSON data
file**, `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/radarData.json`, holding
the raw `TechRadarLoaderResponse` shape (`quadrants`, `rings`, `entries`) as plain JSON — dates as
ISO strings, `moved` as a plain `-1`/`0`/`1` number. This file is the *only* thing a learner edits
to register, move, or retire a blip; nothing under `techRadar/*.ts` needs to change for a content
edit. The module's `techRadarApi.ts` (source code, not content) statically imports this JSON file
and passes it through `TechRadarLoaderResponseParser.parse(...)` — a Zod schema exported from
`@backstage-community/plugin-tech-radar-common`, the exact same parser the plugin's own backend
loader uses for its remote-URL case — which validates the shape and coerces date strings into
`Date` objects before returning it to the plugin. Each `entries[]` item's `timeline` array holds
one or more `{ ringId, date, moved, description }` snapshots, newest last (consistent with the
plugin's own sample data, `defaultApi.ts`). Registering a new blip = adding a new `entries[]`
object with a single-element `timeline`. Moving a blip = appending a new timeline entry with a
later `date`, the new `ringId`, and `moved` set to `1` (ring is "better"/more mature, e.g. Assess →
Trial) or `-1` (ring is "worse", e.g. Trial → Hold). Retiring a blip = deleting its `entries[]`
object entirely (per spec Assumptions: retirement removes the entry, it does not archive prior
radar editions — the plugin has no separate archive/history concept beyond the per-entry
`timeline`).

**Rationale**: The user explicitly wants radar content managed as **data in the git repo**, edited
without touching source code. A `.ts` data module (the originally-planned approach) is still
application source from the compiler's point of view — editing it means editing code inside
`packages/app/src`, even if the edit is "just" a data literal. A `.json` file is unambiguously a
content/data file: no TypeScript syntax, no imports, nothing to compile beyond bundling it as a
static asset. Using the plugin's own `TechRadarLoaderResponseParser` (rather than a bespoke
validator) means this lab teaches an existing, documented Backstage/plugin mechanism (the same
parser the optional backend package already uses) instead of inventing new validation code —
consistent with Constitution Principle I (named, concrete Backstage feature, not a bespoke
mechanism).

**Consequence for the edge-case/error-handling story (was: TS compile-time error)**: Because the
data is now JSON parsed at runtime, malformed *shape* (e.g. a missing required field) now surfaces
as a Zod validation error in the browser console / error boundary when the page loads, not a build
failure. More importantly — confirmed from the parser's schema — `TechRadarLoaderResponseParser`
validates that `quadrant` and `ringId` are *strings*, but does **not** cross-check that the string
actually matches one of the `quadrants[]`/`rings[]` ids declared in the same file. An entry with a
misspelled `quadrant`/`ringId` therefore passes validation silently and simply fails to render
where expected (or not at all) — this is now a "silent" pitfall like the existing duplicate-`id`
case, not a thrown error. data-model.md and the lab's Troubleshooting section are updated to
document this as a manual check ("does every `quadrant`/`ringId` value in your entry match an id
in the `quadrants`/`rings` arrays above?") rather than promising an automatic error message for
this specific case; genuine shape errors (missing fields, wrong types) still fail loudly via the
Zod parser.

**Alternatives considered**:
- Keep the `.ts` module (original decision): rejected per explicit user feedback — content edits
  would still count as source-code edits, not data-file edits.
- A `.yaml` data file instead of `.json`: also a legitimate "pure data" choice and arguably more
  consistent with this repo's other data files (`catalog-info.yaml`, OpenAPI specs); JSON was
  chosen instead because it's what `TechRadarLoaderResponseParser`/the plugin's own sample data
  (`sampleTechRadarResponse.json`) and backend loader already use natively, avoiding an extra
  YAML→JSON conversion step the plugin doesn't otherwise need.

## R3: What quadrants and rings, and what sample content?

**Decision**: Rings — the plugin's own four defaults, unchanged: `Adopt`, `Trial`, `Assess`,
`Hold` (clarified with the user during `/speckit-clarify`). Quadrants — the classic Thoughtworks
four, unchanged: `Techniques`, `Tools`, `Platforms`, `Languages & Frameworks` (also clarified with
the user). Sample entries are chosen to reinforce this lab series' own API teaching content
rather than generic industry buzzwords, e.g.: **Techniques** — "Design-first OpenAPI" (Adopt),
"Spectral linting in CI" (Trial, referencing Lab 3); **Tools** — "Backstage Software Catalog"
(Adopt), "Prism mock servers" (Trial, referencing Lab 5); **Platforms** — "Self-hosted Backstage"
(Adopt); **Languages & Frameworks** — "AsyncAPI 3.0" (Assess), "SOAP/WSDL for new APIs" (Hold, with
a `moved: -1` timeline entry to demonstrate the movement indicator). At least one entry per
quadrant and per ring, per FR-009/SC-002.

**Rationale**: Constitution Principle I (Feature-Focused Learning) and the series' established
pattern of using real, purposeful content rather than placeholder/lorem-ipsum data (Principle
VII's spirit, though that principle is scoped to OpenAPI/AsyncAPI samples specifically). Reusing
this lab series' own vocabulary (Spectral, Prism, OpenAPI, AsyncAPI) turns the radar into a
recap/reinforcement of Labs 1–6 rather than an unrelated add-on, addressing spec Assumption 4.

## R4: How is the radar page surfaced in navigation, and to whom?

**Decision**: No custom nav/sidebar work needed. The plugin's `techRadarPage` is a
`PageBlueprint` extension (path `/tech-radar`, own icon, own title) which Lab 1's existing
`SidebarContent` (`modules/nav/Sidebar.tsx`) already picks up automatically via
`nav.rest({ sortBy: 'title' })` — the same mechanism that already surfaces every other registered
page without per-lab sidebar edits. Visibility: allow all authenticated users (no team-based
filtering), matching spec FR-001 and the existing "allow all" treatment of non-API catalog entry
types from Lab 2 — the radar is organizational documentation, not team-owned API metadata, so no
Lab 2 policy/permission integration is needed.

**Rationale**: Avoids re-implementing navigation wiring Lab 1 already generalized; keeps this lab
scoped to the plugin itself rather than nav plumbing.

## R5: Overriding the plugin's default (backend-calling) `TechRadarApi`

**Decision**: Register our own `ApiBlueprint` for `techRadarApiRef` in a `createFrontendModule`
targeting `pluginId: 'tech-radar'`, and disable the plugin's own built-in API extension via
`app-config.yaml`'s `app.extensions` list (the same override mechanism the new frontend system
uses generally — confirmed pattern, exact extension id to be verified against the installed
package version at implementation time, since the plugin's `alpha.tsx` declares the default API
extension without an explicit `name`). This mirrors, in spirit, the existing
`spectralLinterApiPlugin`/`convertLegacyPlugin` precedent in this repo (Lab 3) for wiring a
non-default API implementation into the new frontend system.

**Rationale**: The default `DefaultTechRadarApi.load()` calls
`discoveryApi.getBaseUrl('tech-radar')` + `fetch(.../data)`, i.e. it always expects the backend
plugin to be present (falling back to its own unrelated mock data only on network/parse failure).
Since R1 deliberately omits the backend plugin, the default API must be replaced, not merely left
installed — otherwise every page load would attempt (and fail) a real network fetch before
falling back to generic mock data, which is confusing to a learner and not the sample content this
lab is teaching. This lab's replacement `TechRadarApi.load()` is a thin, fixed piece of code: it
statically imports `radarData.json` and returns
`TechRadarLoaderResponseParser.parse(radarData)` (R2) — the only thing a learner is expected to
edit for day-to-day radar maintenance is the JSON file, not this implementation.

**Alternatives considered**: Leaving the default API installed and relying on its
network-failure fallback to mock data — rejected: the fallback mock data (`defaultApi.ts`'s own
lorem-ipsum sample) does not satisfy FR-004/FR-009 (this lab's own sample content, populated in
every quadrant/ring), and a failed network fetch on every page load is a poor, silently-broken
learner experience, not an intentional design.

## R6: Testing/verification approach

**Decision**: Manual browser verification per lab README, consistent with Labs 1–6 (no automated
test suite for this lab).

**Rationale**: Same rationale as every prior lab (see Lab 6 plan.md Technical Context) — this is a
tutorial-lab series, not a production codebase; verification is a documented, repeatable manual
walkthrough (quickstart.md), not CI-run tests.
