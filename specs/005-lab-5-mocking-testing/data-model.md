# Phase 1 Data Model: Lab 5 - Mocking and Testing

This lab has no application database entities. "Data model" here means the configuration and
runtime shapes introduced by the single mock gateway process and the frontend module.

## Discovery Map (in-memory, built once at gateway startup)

Computed once when `scripts/mock-gateway.mjs` starts, from the OpenAPI files matched by Lab 4's
`autoApiRegistration` `rootPath`/`patterns` config (research.md R3), **plus** one additional,
explicitly-named source (`mocking.gateway.additionalSources`, default: Lab 1's `apis/` directory,
pattern `**/openapi.yaml`) that exists solely to cover Museum's own spec file, which predates Lab
4's naming convention and is catalogued by hand rather than auto-discovered (research.md R3
correction). A cheap directory walk plus a lightweight `info.title` read (not the expensive
OAS-to-Prism-operations conversion) — safe to do eagerly even at 500+ files. Not refreshed while
the process is running (a newly added file requires a gateway restart to become mockable —
research.md R7, documented as an intentional, Lab-4-style poll/watch-mode tradeoff, not silently
unsupported).

| Field | Type | Description |
|---|---|---|
| `entityNameSlug` | string | Slugified `info.title`, using the same algorithm as Lab 4's entity-name derivation, so the frontend module can compute a matching gateway path from `entity.metadata.name` alone |
| `specFilePath` | string | Absolute path to the matched `*-openapi.yaml` file |

## Loaded Spec Cache (in-memory, lazy, LRU-bounded)

Populated on first request for a given `entityNameSlug`; empty at gateway startup. Not persisted —
rebuilt (lazily, again) on every gateway restart.

| Field | Type | Description |
|---|---|---|
| `entityNameSlug` | string | Cache key |
| `operations` | `IHttpOperation[]` | Result of `@stoplight/http-spec`'s `transformOas3Operations(document)` (research.md R2) — the shape Prism's `.request()` accepts |
| `loadedAt` | timestamp | Set on cache insert; used only for logging/troubleshooting, not eviction |

**Eviction**: bounded by `mocking.gateway.maxCachedSpecs` (config, default `100`). On a cache miss
that would exceed the bound, the least-recently-used entry is evicted before inserting the new one.
This is the single knob documented as changing between lab-demo scale and a 500+ API deployment
(research.md R7) — no code change required to raise it.

## New committed config: `mocking` block (in `app-config.yaml`)

```yaml
mocking:
  gateway:
    port: 4010                          # single fixed port for the whole gateway (not per-API)
    maxCachedSpecs: 100                 # LRU bound (research.md R7)
  defaultCredential:
    scheme: 'bearer'                    # matches the securityScheme type used in this lab's example APIs
    value: 'lab-mock-token-do-not-use'  # obviously fictional, per Constitution Principle IX

proxy:
  endpoints:
    /mock:
      target: 'http://localhost:4010'   # matches mocking.gateway.port — single static entry,
      changeOrigin: true                 # no generated config file (research.md R5)
```

Read by two consumers:
- `scripts/mock-gateway.mjs` reads `mocking.gateway.*` to know which port to bind, how large a
  cache to keep, and (via `mocking.gateway.additionalSources`) which extra spec directories to
  scan alongside Lab 4's own.
- The `apiMocking` frontend module reads `mocking.defaultCredential` client-side via `configApiRef`
  (research.md R6) — not a secret, deliberately fictional and safe to ship in the frontend bundle.
  **This requires `packages/app/config.d.ts`** declaring `mocking.defaultCredential.{scheme,value}`
  with `@visibility frontend`, and `"configSchema": "config.d.ts"` in `packages/app/package.json` —
  without both, Backstage's config-visibility filter silently strips the key before it ever reaches
  the browser (research.md R6 correction; confirmed live, not assumed).

No generated/uncommitted config file is produced by this lab (unlike the superseded per-API-process
design, which generated `app-config.mocks.yaml` at every startup — removed, research.md R4/R5).

## Frontend runtime shape: merged `servers` list

At render time, for any `openapi`-type entity, the `apiMocking` module computes:

```text
effectiveServers = entity.spec.definition.servers (native, unmodified)
                    + [{ url: '/api/proxy/mock/' + entityNameSlug(entity.metadata.name),
                         description: 'Local mock (Lab 5)' }]
```

No persistence; recomputed per render from the entity already loaded by the catalog page. The
gateway path is derived purely from `entityNameSlug(entity.metadata.name)` — no per-entity
configuration is required for a new API to get a mock server entry, satisfying the "generic by
default" requirement from this session's clarification.

## Relationships

```text
OpenAPI spec file (*-openapi.yaml)
   │  (discovered via Lab 4's autoApiRegistration config, once, at gateway startup)
   ▼
Discovery Map entry (entityNameSlug → specFilePath)
   │
   │  (first request for this slug only)
   ▼
Loaded Spec Cache entry (transformOas3Operations, LRU-bounded)
   │
   ▼
Prism instance.request(...) ──► mocked HTTP response
   ▲
   │  (every request, single static proxy hop)
Backstage proxy `/api/proxy/mock/<slug>` ──► gateway port (mocking.gateway.port)
   ▲
   │
Catalog API entity's rendered `servers` list (apiMocking frontend module)
   ▲
   │
Learner selects target in Swagger UI "Try it out"
```
