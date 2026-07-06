# Data Model: Lab 7 — Tech Radar

No Backstage catalog entities (no `API`/`System`/`Component` YAML) are introduced by this lab —
the Tech Radar is a standalone documentation surface, not catalog metadata. The only "data model"
is the shape of the radar dataset itself, defined by
`@backstage-community/plugin-tech-radar-common`'s `TechRadarLoaderResponse` type and populated by
this lab's own committed **JSON data file**, `radarData.json` (research.md R1, R2 — content lives
in data, not in application source code). This file is loaded and validated at runtime by
`techRadarApi.ts` via the plugin's own `TechRadarLoaderResponseParser` (a Zod schema), which
coerces the JSON's ISO date strings into `Date` objects expected by the plugin's React components.

## TechRadarLoaderResponse (top-level shape, from the plugin's common package)

| Field | Type | Notes |
|---|---|---|
| `quadrants` | `RadarQuadrant[]` | Fixed set of 4 for this lab (research.md R3) |
| `rings` | `RadarRing[]` | Fixed set of 4 for this lab (research.md R3) |
| `entries` | `RadarEntry[]` | The blips (spec's "Radar Blip" entity) |

## RadarQuadrant

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` | Unique; referenced by `RadarEntry.quadrant` |
| `name` | `string` | Display label |

This lab's fixed quadrants (research.md R3, classic Thoughtworks set):
`techniques` / Techniques, `tools` / Tools, `platforms` / Platforms,
`languages-frameworks` / Languages & Frameworks.

## RadarRing

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` | Unique; referenced by each timeline entry's `ringId` |
| `name` | `string` | Display label |
| `color` | `string` | Hex color, drives the plugin's own ring-color rendering |
| `description` | `string` (optional) | Plain-language definition — required by this lab's FR-008 even though the field is optional in the plugin's type |

This lab's fixed rings (research.md R3, plugin defaults, unchanged):
`adopt` / Adopt, `trial` / Trial, `assess` / Assess, `hold` / Hold — each given a one-sentence
description addressing spec User Story 3 / FR-008.

## RadarEntry (the spec's "Radar Blip" entity)

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` | Unique across all entries |
| `key` | `string` | Conventionally equal to `id` (plugin sample data does this) |
| `title` | `string` | Blip display name — spec FR-004 "name" |
| `quadrant` | `string` | Must match a `RadarQuadrant.id`. In `radarData.json` this is plain JSON — no compile-time cross-check (research.md R2); see Validation rules below |
| `description` | `string` (optional) | Rationale/recommendation text — spec FR-004 "short description"; this lab treats it as required in practice for every sample entry |
| `links` | `{ url: string; title: string }[]` (optional) | Not required by this lab's functional requirements; omitted from most sample entries, included on 1–2 to show the option |
| `timeline` | `RadarEntryTimeline[]` | Non-empty; newest entry last (plugin convention) |

### RadarEntryTimeline (one snapshot in a blip's history — spec's "moved" indicator)

| Field | JSON type (in `radarData.json`) | Runtime type (after `TechRadarLoaderResponseParser.parse`) | Constraints |
|---|---|---|---|
| `ringId` | `string` | `string` | Must match a `RadarRing.id`; see Validation rules below |
| `date` | `string` (ISO 8601, e.g. `"2026-06-01"`) | `Date` | Ordering across a blip's `timeline` array determines "previous ring" for the moved indicator; the Zod parser (`z.coerce.date()`) converts the string to a `Date` |
| `moved` | `-1 \| 0 \| 1` (optional) | same | `1` = moved toward Adopt (more mature), `-1` = moved toward Hold (less mature), `0`/omitted = unchanged. Spec FR-005's "moved indicator" |
| `description` | `string` (optional) | same | Rationale for this specific ring/date, distinct from the entry's overall `description` |

## Lifecycle mapping (spec operations → data changes)

| Spec operation | Data-model change |
|---|---|
| Register a new blip (US2) | Add a new `RadarEntry` to `entries[]` with a single `timeline` element |
| Move a blip to a different ring (US2) | Append a new `RadarEntryTimeline` element (later `date`, new `ringId`, `moved: 1` or `-1`) to the existing entry's `timeline` array — do not mutate the prior element |
| Retire a blip (US2, post-clarification) | Remove the `RadarEntry` object from `entries[]` entirely — no separate "retired" ring or archive (spec Assumptions) |

## Validation rules carried over from the spec

- **FR-002 / FR-009**: every `RadarQuadrant.id` and `RadarRing.id` in the fixed sets above MUST
  have at least one `RadarEntry` referencing it (directly, or via its latest `timeline.ringId`).
- **Shape validation (structural) — confirmed by live testing**: `techRadarApi.ts` runs the
  imported `radarData.json` through `TechRadarLoaderResponseParser.parse(...)` before returning it
  to the plugin. A missing required field (tested: removing an entry's `title`) throws a Zod
  validation error that the plugin surfaces as a visible in-app error panel on the Tech Radar page
  itself — e.g. `[{"code":"invalid_type","expected":"string","received":"undefined","path":
  ["entries",0,"title"],"message":"Required"}]` — naming the exact field and array index at fault.
  This is the "resulting error and how to fix it" required by spec FR-007, and it fires for *any*
  structurally malformed `radarData.json`, not just quadrant/ring typos.
- **Edge case (invalid quadrant/ring id) — corrected by live testing**: `TechRadarLoaderResponseParser`
  validates that `quadrant`/`ringId` are strings but does not cross-check that the string matches
  an actual `id` in `quadrants[]`/`rings[]`. However, this is **not** a silent failure as originally
  assumed during planning — the plugin's own rendering logic (`adjustEntries` in
  `@backstage-community/plugin-tech-radar`'s `Radar/utils`) throws an uncaught error when it can't
  resolve an entry's quadrant/ring, which crashes the *entire* radar page (not just the one blip)
  to a full-page dev error overlay reading `Unknown quadrant undefined for entry <id>!` (or
  `Unknown ring undefined for entry <id>!`) — confirmed by deliberately adding an entry with a
  bogus `quadrant`/`ringId` and observing the crash. This is louder and more disruptive than a
  single missing blip, so the lab's Troubleshooting section documents it as "the whole radar goes
  blank with an error overlay if any one entry's `quadrant`/`ringId` doesn't match a declared
  `id`" rather than the originally-planned "silently fails to render."
- **Edge case (duplicate blip names)**: no uniqueness constraint on `title` is enforced by the
  plugin, the parser, or this lab — `id`/`key` must still be unique per the plugin's own React
  key usage, but a duplicate `id` in JSON is not itself a parse error either, so the lab's
  Troubleshooting section calls this out as a "silent" pitfall to check manually, per spec Edge
  Cases (same category as the invalid quadrant/ring case above).
