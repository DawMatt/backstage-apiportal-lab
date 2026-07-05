## Run 3 - 2026/07/06

- [X] After the Run 2 fix, waited 2 scheduled poll cycles from a clean cold start and the
  auto-registered APIs (`scalar-galaxy`, `precedence-demo-api`) still hadn't loaded.

  **Resolved** (specs/004-lab-4-auto-registration/tasks.md T049–T051): root cause was that making
  the first discovery cycle run as early as possible (research.md R6 Follow-up 2, the `connect()`
  fix from Run 2) made it *more* likely to race ahead of org-data loading — `teams.yaml` is fetched
  from a remote URL and can easily still be loading when the very first cycle runs a fraction of a
  second after backend startup. When that race is lost, `scalar-galaxy`'s owner
  (`group:default/platform-team`) doesn't resolve yet, so the file registers as an error entity —
  and the existing mtime/content-hash change-detection logic then permanently excluded that
  unchanged file from re-validation on every later cycle, because owner-resolution failures were
  never distinguished from "nothing to do here" the way file changes are. Confirmed
  experimentally: cycle 1 (immediately after `connect()`) failed with "Owner ... does not resolve",
  while `platform-team` was independently confirmed resolvable in the catalog only ~3 seconds
  later — but the error never cleared on cycle 2 (the next 30s tick) because nothing about the
  file itself had changed. Fixed by always including a previously-errored cached row in
  `changedPaths` (and skipping the "unchanged, skip re-validation" short-circuit for such rows)
  regardless of mtime/hash, so a registration error is retried every cycle until it resolves.
  Verified via a clean `yarn start`: cycle 1 still shows the transient owner error (expected,
  logged), but by the next 30s cycle both `scalar-galaxy` and `precedence-demo-api` are present
  in the catalog with `spec.owner: group:default/platform-team` and no registration-error
  annotation.

## Run 2 - 2026/07/06

- [X] The cold start fix (research.md R6 Corollary, tasks.md T015) broke all API catalog item
  loading — not just auto-registered entities, everything.

  **Resolved** (specs/004-lab-4-auto-registration/tasks.md T042–T044): root cause was an
  unguarded `await scheduler.triggerTask(taskId)` added right after each
  `scheduler.scheduleTask(...)` call to force the first discovery cycle to run immediately at
  boot instead of waiting out a `next_run_start_at` persisted from a previous process. On a
  brand-new task (fresh database), the scheduler's own background worker loop can already have
  claimed that task's first run by the time the module's own `triggerTask` call reaches the
  database — `triggerTask` then throws `ConflictError` ("Task ... is currently running"). That
  throw happened inside the `auto-api-registration` backend module's `init()`, which runs as part
  of the `catalog` plugin's own init chain in the new backend system, so the uncaught error failed
  catalog plugin initialization entirely — hence *no* API entities loading, hand-authored or
  auto-registered. Fixed by wrapping both `triggerTask` calls in a helper
  (`triggerTaskIgnoringConflict`) that swallows `ConflictError` specifically (it just means the
  run we wanted was already happening) while letting any other error propagate. Verified via a
  clean `yarn start` against a fresh database: no `ConflictError` at startup, every previously
  registered entity loads, and auto-registered APIs are visible immediately rather than ~30s
  after the app-config locations.

## Run 1 - 2026/07/03

- [X] No APIs were available in the catalog after starting backstage. Relevant log entries are included below.

  **Resolved** (specs/004-lab-4-auto-registration/tasks.md T038–T040): root cause was six
  `catalog.locations` URLs in `labs/lab-01-base-backstage/backstage/app-config.yaml` still
  pinned to the stale, merged-and-gone `003-api-quality` branch. `teams.yaml` (defining
  `platform-team`) 404'd as a result, so the Lab 4 owner validator correctly rejected
  `galaxy-openapi.yaml`'s `owner: group:default/platform-team` — the actual cause of the empty
  catalog. Fixed by repointing those six URLs at `main`, where the content is already merged.
  Verified via a clean `yarn start`: museum/streetlights/train-travel/scalar-galaxy/
  precedence-demo-api all register with no `AutoApiRegistrationErrorProcessor` errors and no
  "Unable to read url" warnings.

```
2026-07-03T12:38:51.027Z catalog info auto-api-registration:default: /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-openapi.yaml maps to "precedence-demo-api", which already has a hand-authored catalog-info.yaml — skipping auto-sourced registration 
2026-07-03T12:39:00.820Z catalog warn Unable to read url, no matching files found for https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml entity="location:default/generated-4c23d1d635d435e80cc8b698fc86956f9fffff3c" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/apis/streetlights-api.yaml"
2026-07-03T12:39:00.895Z catalog warn Unable to read url, no matching files found for https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-03-api-quality/catalog/platform-user.yaml entity="location:default/generated-2cde689609df331e9267009ea6c02850d6b1603e" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-03-api-quality/catalog/platform-user.yaml"
2026-07-03T12:39:00.896Z catalog warn Unable to read url, no matching files found for https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/teams.yaml entity="location:default/generated-cc3b19c3e787fc46d27f583f1d53dd2e8ec1a456" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/teams.yaml"
2026-07-03T12:39:00.899Z catalog warn Unable to read url, no matching files found for https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/users.yaml entity="location:default/generated-ae8dd75945a327a0201813834829ec035913de8e" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/users.yaml"
2026-07-03T12:39:00.907Z catalog warn Unable to read url, no matching files found for https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/apis/museum-api.yaml entity="location:default/generated-1390492c77b8f266a9f6608c0595f96efa060611" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/apis/museum-api.yaml"
2026-07-03T12:39:00.915Z catalog warn Unable to read url, no matching files found for https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/apis/train-travel-api.yaml entity="location:default/generated-9ecb0d8da3f46f025b2e5e23de21f385b1a49388" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/003-api-quality/labs/lab-02-users-roles/catalog/apis/train-travel-api.yaml"
2026-07-03T12:39:07.085Z catalog warn Processor AutoApiRegistrationErrorProcessor threw an error while preprocessing; caused by InputError: Owner "group:default/platform-team" does not resolve to a known User or Group entity entity="api:default/scalar-galaxy" location="file:/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-04-auto-registration/apis/galaxy/galaxy-openapi.yaml"
2026-07-03T12:39:21.056Z rootHttpRouter info [2026-07-03T12:39:21.056Z] "GET /api/catalog/entities?fields=kind,metadata.name,metadata.namespace&filter=kind%3DUser%2Ckind%3DGroup HTTP/1.1" 200 0 "-" "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)" type="incomingRequest" date="2026-07-03T12:39:21.056Z" method="GET" url="/api/catalog/entities?fields=kind,metadata.name,metadata.namespace&filter=kind%3DUser%2Ckind%3DGroup" status=200 httpVersion="1.1" userAgent="node-fetch/1.0 (+https://github.com/bitinn/node-fetch)"
2026-07-03T12:39:21.060Z rootHttpRouter info [2026-07-03T12:39:21.060Z] "GET /api/catalog/entities?filter=kind%3DAPI%2Cmetadata.name%3Dprecedence-demo-api HTTP/1.1" 200 0 "-" "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)" type="incomingRequest" date="2026-07-03T12:39:21.060Z" method="GET" url="/api/catalog/entities?filter=kind%3DAPI%2Cmetadata.name%3Dprecedence-demo-api" status=200 httpVersion="1.1" userAgent="node-fetch/1.0 (+https://github.com/bitinn/node-fetch)"
2026-07-03T12:39:21.061Z catalog info auto-api-registration:default: /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-openapi.yaml maps to "precedence-demo-api", which already has a hand-authored catalog-info.yaml — skipping auto-sourced registration 
2026-07-03T12:39:51.087Z rootHttpRouter info [2026-07-03T12:39:51.087Z] "GET /api/catalog/entities?fields=kind,metadata.name,metadata.namespace&filter=kind%3DUser%2Ckind%3DGroup HTTP/1.1" 200 0 "-" "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)" type="incomingRequest" date="2026-07-03T12:39:51.087Z" method="GET" url="/api/catalog/entities?fields=kind,metadata.name,metadata.namespace&filter=kind%3DUser%2Ckind%3DGroup" status=200 httpVersion="1.1" userAgent="node-fetch/1.0 (+https://github.com/bitinn/node-fetch)"
2026-07-03T12:39:51.092Z rootHttpRouter info [2026-07-03T12:39:51.092Z] "GET /api/catalog/entities?filter=kind%3DAPI%2Cmetadata.name%3Dprecedence-demo-api HTTP/1.1" 200 0 "-" "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)" type="incomingRequest" date="2026-07-03T12:39:51.092Z" method="GET" url="/api/catalog/entities?filter=kind%3DAPI%2Cmetadata.name%3Dprecedence-demo-api" status=200 httpVersion="1.1" userAgent="node-fetch/1.0 (+https://github.com/bitinn/node-fetch)"
2026-07-03T12:39:51.093Z catalog info auto-api-registration:default: /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-openapi.yaml maps to "precedence-demo-api", which already has a hand-authored catalog-info.yaml — skipping auto-sourced registration 
2026-07-03T12:40:21.123Z rootHttpRouter info [2026-07-03T12:40:21.123Z] "GET /api/catalog/entities?fields=kind,metadata.name,metadata.namespace&filter=kind%3DUser%2Ckind%3DGroup HTTP/1.1" 200 0 "-" "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)" type="incomingRequest" date="2026-07-03T12:40:21.123Z" method="GET" url="/api/catalog/entities?fields=kind,metadata.name,metadata.namespace&filter=kind%3DUser%2Ckind%3DGroup" status=200 httpVersion="1.1" userAgent="node-fetch/1.0 (+https://github.com/bitinn/node-fetch)"
2026-07-03T12:40:21.127Z rootHttpRouter info [2026-07-03T12:40:21.127Z] "GET /api/catalog/entities?filter=kind%3DAPI%2Cmetadata.name%3Dprecedence-demo-api HTTP/1.1" 200 0 "-" "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)" type="incomingRequest" date="2026-07-03T12:40:21.127Z" method="GET" url="/api/catalog/entities?filter=kind%3DAPI%2Cmetadata.name%3Dprecedence-demo-api" status=200 httpVersion="1.1" userAgent="node-fetch/1.0 (+https://github.com/bitinn/node-fetch)"
2026-07-03T12:40:21.128Z catalog info auto-api-registration:default: /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-04-auto-registration/apis/precedence-demo/precedence-demo-openapi.yaml maps to "precedence-demo-api", which already has a hand-authored catalog-info.yaml — skipping auto-sourced registration 
```