# Phase 1 Data Model: Lab 4 — Auto Registration

This lab has no application database. "Data model" here means the shape of the catalog entities
produced, the config schema that drives discovery, and the mapping rules between an API
definition file and the resulting Backstage `API` entity.

## Entity: API Definition File (input, not a catalog entity)

A file on disk matched by the discovery glob (`**/*-openapi.yaml`, `**/*-asyncapi.yaml`).

| Field | Type | Notes |
|---|---|---|
| `openapi` / `asyncapi` | string | Version field; presence of either identifies the spec type. Exactly one is expected. |
| `info.title` | string | **Required.** Source of the catalog entity name (slugified) and `metadata.title`. Not duplicated into `x-examplecorp`. |
| `info.description` | string | Optional. Maps to `metadata.description` if present. Not duplicated into `x-examplecorp`. |
| `tags[].name` | string[] | Optional, native top-level OpenAPI/AsyncAPI field (not under `info`, not under `x-examplecorp`). Default `[]` if absent. |
| `info.x-examplecorp.owner` | string | Optional. Owner entity ref (kind defaults to `group:default/` if unprefixed). Absent → registration still succeeds using a documented default — see Mapping Rule 1 below. |
| `info.x-examplecorp.lifecycle` | string | Optional. One of `experimental` \| `production` \| `deprecated` (Backstage's standard lifecycle values). Default: `experimental`. |

## Entity: Catalog API Entity (output)

Standard Backstage `API` kind entity, produced by the EntityProvider's full mutation.

| Field | Source | Mapping Rule |
|---|---|---|
| `metadata.name` | `info.title` | Slugified (lowercase, spaces/punctuation → `-`, per Backstage entity-name character rules). This is the identity used for update-in-place (FR-003) and collision detection. |
| `metadata.title` | `info.title` | Verbatim. |
| `metadata.description` | `info.description` | Verbatim if present, else omitted. |
| `metadata.tags` | `tags[].name` | Native top-level spec field, not `x-examplecorp`. Default `[]` if absent. |
| `metadata.annotations['backstage.io/managed-by-location']` | discovery | Set to the source file's resolved path/URL, identifying this entity as auto-sourced (used for the FR-011 precedence check and for the "which file caused this" debugging path in SC-003). |
| `metadata.annotations['apiportal-lab.io/registration-error']` | discovery | Present **only** on marker/error entities (invalid owner ref or name collision); absent on normally-registered entities. |
| `spec.type` | discovery | `openapi` if the file has a top-level `openapi` field, `asyncapi` if it has a top-level `asyncapi` field. |
| `spec.lifecycle` | `info.x-examplecorp.lifecycle` | Default `experimental` if absent (FR-007). |
| `spec.owner` | `info.x-examplecorp.owner` | **Mapping Rule 1**: if absent, registration still succeeds (FR-007) using that file's source's configured `defaultOwner` (the lab's single source defaults this to `group:default/platform-team`, the same shared/fallback team introduced in Lab 3 — but this is per-source, not global, per research.md R7), rather than blocking. If present but unresolvable against the catalog's known `User`/`Group` entities, the file is registered as a marker/error entity instead (see research.md R4). |
| `spec.definition.$text` | discovery | The source file's own path/URL — same `$text` mechanism used by hand-authored entities in Labs 1–3 (per the existing project convention noted in memory: `$text` requires `type: url`-style resolution, not inline embedding). |

## Config: `autoApiRegistration` (app-config.yaml)

The canonical shape is a list of sources (research.md R7), each independently configured. A flat
`autoApiRegistration.{rootPath,patterns,...}` (no `sources` key) is shorthand for a single
implicit source named `default` — this is what the lab's own `app-config.yaml` uses, so a
single-repo setup never has to write the list form.

```yaml
autoApiRegistration:
  sources:
    - id: platform-monorepo      # required, unique; becomes part of the EntityProvider name
                                  # and the scan-state cache's source_id column
      rootPath: ...
      patterns: ['**/*-openapi.yaml', '**/*-asyncapi.yaml']
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
      mode: poll                 # or 'watch' — independent per source (research.md R6/R7)
      schedule: { frequencySeconds: 30 }
      reconciliation: { frequencySeconds: 900 }   # watch mode only
      parseConcurrency: 4
      defaultOwner: group:default/platform-team
      xNamespace: examplecorp
    - id: team-checkout-api      # a second source: a different team's repo, a local sibling
      rootPath: ../team-checkout-api               # checkout for the lab; a real remote repo's
      patterns: ['**/*-openapi.yaml']              # synced local worktree in production (R7
      defaultOwner: group:default/checkout-team    # Problem 4)
      xNamespace: checkoutteam
```

| Key (per source, under `sources[]`, or flat for the single-source shorthand) | Type | Default | Purpose |
|---|---|---|---|
| `id` | string | `'default'` (flat-config shorthand only) | Unique source identifier. Required when using the `sources[]` list form. Used as the `EntityProvider` name suffix and the scan-state cache's `source_id` (research.md R7). |
| `rootPath` | string | resolved repo root (see research.md R2) | Root directory the glob scan starts from. Adaptable per FR-010. In production, may point at a locally-synced worktree of a genuinely remote repo (research.md R7, Problem 4) — this schema does not change either way. |
| `patterns` | string[] | `['**/*-openapi.yaml', '**/*-asyncapi.yaml']` | Filename glob patterns. Adaptable per FR-010, per source. |
| `ignore` | string[] | `['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']` | Glob exclusions, always applied regardless of `mode` (research.md R2/R6). Extendable, not replaceable, by learners. |
| `mode` | `'poll' \| 'watch'` | `'poll'` | `poll`: full `fast-glob` sweep every `schedule.frequencySeconds` (lab default — simple, predictable for 2–3 files). `watch`: `chokidar`-driven incremental discovery with `reconciliation.frequencySeconds` as a safety-net sweep interval (research.md R6 — the real-world-scale mode). Independent per source — e.g. a large mono-repo can run `watch` while a small team repo runs `poll` (research.md R7). |
| `schedule.frequencySeconds` | number | `30` | `poll` mode: full-sweep interval. `watch` mode: ignored in favor of `reconciliation.frequencySeconds`. |
| `reconciliation.frequencySeconds` | number | `900` | `watch` mode only: interval for the periodic full-sweep safety net that catches missed watcher events (research.md R6, Problem 3). |
| `parseConcurrency` | number | `4` | Max files parsed concurrently per cycle/event batch — bounds memory/event-loop impact when many files change at once (research.md R6). |
| `defaultOwner` | string | *(no global default — each source must set its own, or inherit `autoApiRegistration.defaults.defaultOwner` if configured)* | Fallback owner ref applied when `x-<namespace>.owner` is absent (FR-007). Deliberately per-source, not global — a team/pre-production repo plausibly has a different fallback owner than the platform mono-repo (research.md R7, Problem 2). |
| `xNamespace` | string | *(no global default — see `defaultOwner`)* | The vendor namespace under `info.x-<namespace>` this source reads owner/lifecycle from. Per-source so a repo that already has its own established `x-*` convention isn't forced to rename it to onboard (research.md R7, Problem 2). The lab's single source sets this to `'examplecorp'`. |

## Scan-state cache (persisted, `coreServices.database`)

A table private to this backend module, used to (a) avoid re-parsing unchanged files on restart,
(b) compute delta mutations after the initial full mutation (research.md R6, Problem 1 & 2), and
(c) support collision/precedence checks across every configured source, not just the one currently
scanning (research.md R7, Problem 3). Not a catalog entity, not written back into any source
repo — internal backend state only.

| Column | Type | Purpose |
|---|---|---|
| `source_id` | string (PK, part 1) | Which configured source (research.md R7) this row came from — `'default'` for the flat single-source config. Lets a collision/error message name *which repo*, not just which file. |
| `file_path` | string (PK, part 2) | Absolute path of the discovered file, within that source. |
| `mtime_ms` | number | Last-observed file modification time; cheap first-pass change check on restart/reconciliation. |
| `content_hash` | string | sha1 of file bytes; only computed/compared when `mtime_ms` differs, since hashing every file on every check is itself costly at 1000+ files. |
| `entity_name` | string, indexed | The catalog entity name this file currently maps to — doubles as the slug→(source, path) collision index (research.md R4), queried **without** filtering by `source_id` so collisions across sources are caught (research.md R7, Problem 3). |
| `last_error` | string \| null | Last registration error for this file, if any (mirrors the `apiportal-lab.io/registration-error` annotation; lets a restart re-emit the same marker entity without re-deriving the error). |

## State transitions (per discovery cycle)

Runs independently **per configured source** (research.md R7) — each source is its own
`EntityProvider` instance with its own schedule/mode, so one source's cycle does not block or
depend on another's. Steps (d)–(f) below query the scan-state cache and catalog **without**
filtering by `source_id`, since collision and precedence checks must be global (research.md R7,
Problem 3) even though discovery itself runs per source.

1. **First run of a given source**: glob scan (streamed, ignore patterns applied) → parse +
   shape-check every matched file → build that source's rows in the scan-state cache → emit one
   `type: 'full'` mutation (from that source's `EntityProvider` instance) establishing the
   baseline with the catalog (research.md R6).
2. **Every subsequent cycle for that source** (`poll` mode: full sweep on
   `schedule.frequencySeconds`; `watch` mode: per-event, plus a full sweep on
   `reconciliation.frequencySeconds`):
   a. Glob scan of that source's `rootPath` (or, in `watch` mode, the single changed path from the
      watcher event).
   b. For each candidate, `stat()` and compare `mtime_ms` against that source's cache rows; only
      files that differ (or are new) proceed to content-hash comparison and re-parse — unchanged
      files are skipped entirely (research.md R6, Problem 2).
   c. Parse + shape-check changed/new files, using that source's `xNamespace` → valid candidates /
      log-only errors.
   d. Slugify `info.title` → candidate entity name; check against the cache's `entity_name` index
      **across all sources** (O(1) lookup, not a full re-sort) → collisions become marker/error
      entities, whether the colliding file is in this source or another one (research.md R7,
      Problem 3).
   e. Resolve `x-<namespace>.owner` (falling back to this source's `defaultOwner` if absent)
      against known `User`/`Group` entities → unresolvable owners become marker/error entities.
   f. Check for a pre-existing, non-auto-sourced entity at the same name anywhere in the catalog
      (hand-authored `catalog-info.yaml`) → if found, skip the auto-sourced candidate for this name
      (FR-011).
   g. Diff the resulting candidate set against this source's cache rows → update cache rows →
      emit a `type: 'delta'` mutation (`added`/`removed`) from this source's `EntityProvider`
      instance for just what changed (FR-002/003/004), **not** a fresh full mutation (research.md
      R6, Problem 1).
