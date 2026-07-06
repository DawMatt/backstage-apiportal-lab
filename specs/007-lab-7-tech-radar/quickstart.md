# Quickstart / Verification: Lab 7 — Tech Radar

This is the manual verification walkthrough referenced by the lab README's own "Verification"
section (Lab Structure Standards) and by plan.md's Testing approach (research.md R6 — no
automated suite for this tutorial lab).

## Prerequisites

- Labs 1–6 completed; the Backstage instance from Lab 1 (`labs/lab-01-base-backstage/backstage/`)
  starts successfully with `yarn start`.

## Setup (summary — full steps live in the lab README)

1. `yarn --cwd packages/app add @backstage-community/plugin-tech-radar` (frontend only —
   research.md R1; do **not** add `@backstage-community/plugin-tech-radar-backend`).
2. Copy `labs/lab-07-tech-radar/code/packages/app/src/modules/techRadar/` into the student's
   `packages/app/src/modules/techRadar/`.
3. Register `techRadarModule` in `App.tsx`'s `features` array.
4. Disable the plugin's default (backend-calling) API extension and register this lab's static
   API implementation instead, per the README's exact `app-config.yaml` / module wiring
   (research.md R5).
5. `yarn start`.

## User Story 1 — Publish an organization Tech Radar (P1)

1. Open Backstage in a browser once `yarn start` is ready.
2. Confirm a **Tech Radar** entry appears in the left sidebar (no manual nav edit needed —
   research.md R4).
3. Click it; confirm the radar renders with 4 quadrants (Techniques, Tools, Platforms,
   Languages & Frameworks) and 4 rings (Adopt, Trial, Assess, Hold) — SC-002.
4. Hover/click an individual blip (e.g. "Design-first OpenAPI"); confirm its title, quadrant,
   ring, and description are shown.
5. Visually confirm at least one blip appears in every quadrant and every ring — SC-002.

**Expected time**: under 20 minutes from a clean Lab 1–6 environment — SC-001.

## User Story 2 — Register / move / retire a blip (P2)

All three operations edit only `radarData.json` — no TypeScript file changes needed.

**Register**:
1. Open `radarData.json`, add a new object to `entries[]` (see data-model.md's `RadarEntry`
   shape) — e.g. a new Tools blip in `assess`.
2. Save; reload the Backstage tab.
3. Confirm the new blip appears in the correct quadrant/ring — SC-003.

**Move**:
1. Pick an existing entry (e.g. "SOAP/WSDL for new APIs", currently in `hold`).
2. Append a new `timeline` element with a later `date` (ISO string), a different `ringId`, and
   `moved: 1` or `-1` as appropriate (data-model.md's Lifecycle mapping table).
3. Reload; confirm the blip now renders in its new ring with a movement indicator (the plugin's
   own directional marker on the blip) — SC-004.

**Retire**:
1. Pick an entry to remove; delete its entire object from `entries[]`.
2. Reload; confirm the blip no longer appears anywhere on the radar — SC-006.

**Invalid quadrant/ring (edge case — confirmed via live testing)**:
1. Temporarily change a blip's `quadrant` (or a timeline entry's `ringId`) to a value not present
   in the file's `quadrants`/`rings` arrays.
2. Reload; confirm the **entire radar page** fails with a full-page error overlay reading
   `Unknown quadrant undefined for entry <id>!` (or `Unknown ring undefined for entry <id>!`) —
   not just the one blip failing to render. This is because the plugin's own rendering code
   doesn't cross-check ids against the declared `quadrants`/`rings` arrays (data-model.md's
   Validation rules). Revert the change afterward.

**Malformed JSON / missing field (edge case — confirmed via live testing)**:
1. Temporarily remove a required field (e.g. an entry's `title`).
2. Reload; confirm a Zod validation error panel appears directly on the Tech Radar page, naming
   the exact field and array index (e.g. `path: ["entries",0,"title"], message: "Required"`) —
   this is the "loud" failure mode required by FR-007. Revert the change afterward.

## User Story 3 — Understand adoption ring semantics (P3)

1. Read the lab README's ring-definition section without looking at the running radar.
2. Confirm each of the 4 rings (Adopt/Trial/Assess/Hold) has a one-sentence, plain-language
   definition, and that the "moved" indicator's meaning (`1` = toward Adopt, `-1` = toward Hold)
   is explained — SC-005.

## Verification Checklist (for the lab README)

- [X] Tech Radar page reachable from the sidebar with no manual nav edit — confirmed via live testing
- [X] All 4 quadrants and all 4 rings have at least one blip — confirmed via live testing
- [X] A new blip can be registered and appears after reload — confirmed via live testing
- [X] An existing blip can be moved to a new ring, with a visible movement indicator — confirmed via live testing
- [X] An existing blip can be retired (removed) and disappears after reload — confirmed via live testing
- [X] A malformed/missing-field `radarData.json` produces a visible Zod validation error panel — confirmed via live testing
- [X] An invalid quadrant/ring id crashes the whole radar page with a full-page error overlay — confirmed via live testing (corrected from the originally-assumed silent failure)
- [ ] README's ring-definition section explains all 4 rings and the movement indicator
