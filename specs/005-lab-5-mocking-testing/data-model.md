# Phase 1 Data Model: Lab 5 - Mocking and Testing

This lab has no application database entities. "Data model" here means the configuration and
runtime shapes introduced by the new mock-orchestration script and frontend module.

## Mock Registry Entry (in-memory, computed at each `start-mocks.mjs` run)

Computed once per run from the OpenAPI files matched by Lab 4's `autoApiRegistration`
`rootPath`/`patterns` config; not persisted between runs (recomputed deterministically each start).

| Field | Type | Description |
|---|---|---|
| `specFilePath` | string | Absolute path to the discovered `*-openapi.yaml` file |
| `entityNameSlug` | string | Slugified `info.title`, using the same algorithm as Lab 4's entity-name derivation, so the frontend module can compute a matching proxy path from `entity.metadata.name` alone |
| `port` | number | Assigned deterministically: `4010 + index`, where `index` is the 0-based position in the list of matched files sorted by path |
| `proxyPath` | string | `/api/proxy/mock/<entityNameSlug>` |

## Generated Config File: `app-config.mocks.yaml`

Written by `scripts/start-mocks.mjs` before Prism child processes are spawned; not committed to
the repository (generated artifact, added to `.gitignore`). Shape:

```yaml
proxy:
  endpoints:
    /mock/<entityNameSlug>:
      target: 'http://localhost:<port>'
      changeOrigin: true
```

One entry per Mock Registry Entry. Merged with the committed `app-config.yaml` via
`backstage-cli repo start --config app-config.yaml --config app-config.mocks.yaml`.

## New committed config: `mocking.defaultCredential` (in `app-config.yaml`)

```yaml
mocking:
  defaultCredential:
    scheme: 'bearer'        # matches the securityScheme type used in this lab's example APIs
    value: 'lab-mock-token-do-not-use'   # obviously fictional, per Constitution Principle IX
```

Read client-side via `configApiRef` by the `apiMocking` frontend module (research.md R6). Not a
secret — deliberately fictional and safe to ship in the frontend bundle, same as any other
documented lab-only example credential.

## Frontend runtime shape: merged `servers` list

At render time, for any `openapi`-type entity, the `apiMocking` module computes:

```text
effectiveServers = entity.spec.definition.servers (native, unmodified)
                    + [{ url: <proxyPath for this entity>, description: 'Local mock (Lab 5)' }]
```

No persistence; recomputed per render from the entity already loaded by the catalog page. The
proxy path is derived purely from `entityNameSlug(entity.metadata.name)` — no per-entity
configuration is required for a new API to get a mock server entry, satisfying the "generic by
default" requirement from this session's clarification.

## Relationships

```text
OpenAPI spec file (*-openapi.yaml)
   │  (discovered via Lab 4's autoApiRegistration config)
   ▼
Mock Registry Entry ──► Prism child process (serves on `port`)
   │
   ▼
app-config.mocks.yaml proxy endpoint ──► merged into running Backstage config
   │
   ▼
Catalog API entity's rendered `servers` list (apiMocking frontend module)
   │
   ▼
Learner selects target in Swagger UI "Try it out" ──► request routed through
Backstage's existing proxy (mock) or directly to the sandbox host (Galaxy's native servers)
```
