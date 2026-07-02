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
| `autoApiRegistration.ignore` | string[] | `['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']` | Glob exclusions, always applied regardless of `mode` (research.md R2/R6). Extendable, not replaceable, by learners. |
| `autoApiRegistration.mode` | `'poll' \| 'watch'` | `'poll'` | `poll`: full `fast-glob` sweep every `schedule.frequencySeconds` (lab default — simple, predictable for 2–3 files). `watch`: `chokidar`-driven incremental discovery with `reconciliation.frequencySeconds` as a safety-net sweep interval (research.md R6 — the real-world-scale mode). |
| `autoApiRegistration.schedule.frequencySeconds` | number | `30` | `poll` mode: full-sweep interval. `watch` mode: ignored in favor of `reconciliation.frequencySeconds`. |
| `autoApiRegistration.reconciliation.frequencySeconds` | number | `900` | `watch` mode only: interval for the periodic full-sweep safety net that catches missed watcher events (research.md R6, Problem 3). |
| `autoApiRegistration.parseConcurrency` | number | `4` | Max files parsed concurrently per cycle/event batch — bounds memory/event-loop impact when many files change at once (research.md R6). |
| `autoApiRegistration.defaultOwner` | string | `group:default/platform-team` | Fallback owner ref applied when `x-backstage-owner` is absent (FR-007). |

## Scan-state cache (persisted, `coreServices.database`)

A table private to this backend module, used to (a) avoid re-parsing unchanged files on restart
and (b) compute delta mutations after the initial full mutation (research.md R6, Problem 1 & 2).
Not a catalog entity, not written back into the mono-repo — internal backend state only.

| Column | Type | Purpose |
|---|---|---|
| `file_path` | string (PK) | Absolute path of the discovered file. |
| `mtime_ms` | number | Last-observed file modification time; cheap first-pass change check on restart/reconciliation. |
| `content_hash` | string | sha1 of file bytes; only computed/compared when `mtime_ms` differs, since hashing every file on every check is itself costly at 1000+ files. |
| `entity_name` | string | The catalog entity name this file currently maps to — doubles as the slug→path collision index (research.md R4). |
| `last_error` | string \| null | Last registration error for this file, if any (mirrors the `apiportal-lab.io/registration-error` annotation; lets a restart re-emit the same marker entity without re-deriving the error). |

## State transitions (per discovery cycle)

1. **First run only**: glob scan (streamed, ignore patterns applied) → parse + shape-check every
   matched file → build the initial scan-state cache → emit one `type: 'full'` mutation
   establishing the baseline with the catalog (research.md R6).
2. **Every subsequent cycle** (`poll` mode: full sweep on `schedule.frequencySeconds`; `watch`
   mode: per-event, plus a full sweep on `reconciliation.frequencySeconds`):
   a. Glob scan (or, in `watch` mode, the single changed path from the watcher event).
   b. For each candidate, `stat()` and compare `mtime_ms` against the cache; only files that
      differ (or are new) proceed to content-hash comparison and re-parse — unchanged files are
      skipped entirely (research.md R6, Problem 2).
   c. Parse + shape-check changed/new files → valid candidates / log-only errors.
   d. Slugify `info.title` → candidate entity name; check against the cache's `entity_name` index
      (O(1) lookup, not a full re-sort) → collisions become marker/error entities.
   e. Resolve `x-backstage-owner` against known `User`/`Group` entities → unresolvable owners
      become marker/error entities.
   f. Check for a pre-existing, non-auto-sourced entity at the same name (hand-authored
      `catalog-info.yaml`) → if found, skip the auto-sourced candidate for this name (FR-011).
   g. Diff the resulting candidate set against the cache → update cache rows → emit a
      `type: 'delta'` mutation (`added`/`removed`) for just what changed (FR-002/003/004),
      **not** a fresh full mutation (research.md R6, Problem 1).
