# Phase 1 Data Model: Lab 4 — Auto Registration

This lab has no application database. "Data model" here means the shape of the catalog entities
produced, the config schema that drives discovery, and the mapping rules between an API
definition file and the resulting Backstage `API` entity.

## Entity: API Definition File (input, not a catalog entity)

A file on disk matched by the discovery glob (`**/*-openapi.yaml`, `**/*-asyncapi.yaml`).

| Field | Type | Notes |
|---|---|---|
| `openapi` / `asyncapi` | string | Version field; presence of either identifies the spec type. Exactly one is expected. |
| `info.title` | string | **Required.** Source of the catalog entity name (slugified) and `metadata.title`. |
| `info.description` | string | Optional. Maps to `metadata.description` if present. |
| `info.x-backstage-owner` | string | Optional. Owner entity ref (kind defaults to `group:default/` if unprefixed). Absent → registration proceeds with no `spec.owner` override... actually **required by FR-005/FR-007's documented default** — see Mapping Rule 1 below. |
| `info.x-backstage-lifecycle` | string | Optional. One of `experimental` \| `production` \| `deprecated` (Backstage's standard lifecycle values). Default: `experimental`. |
| `info.x-backstage-tags` | string[] | Optional. Default: `[]`. |

## Entity: Catalog API Entity (output)

Standard Backstage `API` kind entity, produced by the EntityProvider's full mutation.

| Field | Source | Mapping Rule |
|---|---|---|
| `metadata.name` | `info.title` | Slugified (lowercase, spaces/punctuation → `-`, per Backstage entity-name character rules). This is the identity used for update-in-place (FR-003) and collision detection. |
| `metadata.title` | `info.title` | Verbatim. |
| `metadata.description` | `info.description` | Verbatim if present, else omitted. |
| `metadata.tags` | `info.x-backstage-tags` | Default `[]` if absent. |
| `metadata.annotations['backstage.io/managed-by-location']` | discovery | Set to the source file's resolved path/URL, identifying this entity as auto-sourced (used for the FR-011 precedence check and for the "which file caused this" debugging path in SC-003). |
| `metadata.annotations['apiportal-lab.io/registration-error']` | discovery | Present **only** on marker/error entities (invalid owner ref or name collision); absent on normally-registered entities. |
| `spec.type` | discovery | `openapi` if the file has a top-level `openapi` field, `asyncapi` if it has a top-level `asyncapi` field. |
| `spec.lifecycle` | `info.x-backstage-lifecycle` | Default `experimental` if absent (FR-007). |
| `spec.owner` | `info.x-backstage-owner` | **Mapping Rule 1**: if absent, registration still succeeds (FR-007) using a documented default owner ref (`group:default/platform-team`, the same shared/fallback team introduced in Lab 3), rather than blocking. If present but unresolvable against the catalog's known `User`/`Group` entities, the file is registered as a marker/error entity instead (see research.md R4). |
| `spec.definition.$text` | discovery | The source file's own path/URL — same `$text` mechanism used by hand-authored entities in Labs 1–3 (per the existing project convention noted in memory: `$text` requires `type: url`-style resolution, not inline embedding). |

## Config: `autoApiRegistration` (app-config.yaml)

| Key | Type | Default | Purpose |
|---|---|---|---|
| `autoApiRegistration.rootPath` | string | resolved repo root (see research.md R2) | Root directory the glob scan starts from. Adaptable per FR-010. |
| `autoApiRegistration.patterns` | string[] | `['**/*-openapi.yaml', '**/*-asyncapi.yaml']` | Filename glob patterns. Adaptable per FR-010. |
| `autoApiRegistration.schedule.frequencySeconds` | number | `30` | How often the EntityProvider re-scans. |
| `autoApiRegistration.defaultOwner` | string | `group:default/platform-team` | Fallback owner ref applied when `x-backstage-owner` is absent (FR-007). |

## State transitions (per discovery cycle)

1. Glob scan → candidate file list.
2. Parse + shape-check each file → valid candidates / log-only errors (unparseable files).
3. Slugify `info.title` → candidate entity name; detect duplicates among this cycle's candidates
   → second-and-later duplicates become marker/error entities.
4. Resolve `x-backstage-owner` against known `User`/`Group` entities → unresolvable owners become
   marker/error entities.
5. Check for a pre-existing, non-auto-sourced entity at the same name (hand-authored
   `catalog-info.yaml`) → if found, skip the auto-sourced candidate for this name (FR-011).
6. Emit a `type: 'full'` mutation containing every entity produced by steps 2–5 (normal +
   marker/error entities). Entities not included are retracted by the catalog (FR-004).
