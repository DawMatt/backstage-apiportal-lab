# Data Model: Lab 1 — Base Backstage Implementation

**Phase 1 output for**: `specs/001-lab-1-base-backstage/plan.md`

This lab is a documentation and configuration project rather than a software application.
The "data model" describes the file artefacts, their schemas, and the relationships between
them.

---

## Entities

### 1. Lab

A self-contained learning unit. There is exactly one Lab artefact per lab number.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Human-readable lab title |
| `number` | integer | Sequential lab number (1, 2, 3, …) |
| `directory` | path | Root directory: `labs/lab-NN-<slug>/` |
| `readme` | path | `labs/lab-NN-<slug>/README.md` |
| `apis` | API[] | Sample API artefacts committed under `apis/` |

**Validation rules**:
- Directory name MUST follow `lab-NN-<kebab-slug>` convention
- `README.md` MUST contain all five sections: Overview, Prerequisites, Instructions,
  Verification, Troubleshooting

---

### 2. APISpec (abstract)

A sample API specification file committed to the repository. Specialised as OpenAPISpec
and AsyncAPISpec.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable API name |
| `type` | enum | `openapi` or `asyncapi` |
| `file` | path | Specification file (e.g., `openapi.yaml`, `asyncapi.yaml`) |
| `catalogDescriptor` | path | Companion `catalog-info.yaml` |
| `directory` | path | Subdirectory under `labs/.../apis/<slug>/` |

**Relationships**: Each APISpec has exactly one companion `catalog-info.yaml`.

---

### 3. OpenAPISpec (extends APISpec)

| Field | Type | Constraint |
|-------|------|------------|
| `openapiVersion` | string | MUST be `3.0.x` |
| `title` | string | Used as display name in Backstage |
| `description` | string | Shown in catalog card |
| `paths` | object | At least 1 path; no external `$ref`s (self-contained) |

**File**: `labs/lab-01-base-backstage/apis/museum/openapi.yaml`

**Source**: Redocly Museum API (https://github.com/Redocly/museum-openapi-example) —
selected per Constitution Principle VII.

---

### 4. AsyncAPISpec (extends APISpec)

| Field | Type | Constraint |
|-------|------|------------|
| `asyncapiVersion` | string | MUST be `2.6.0` |
| `title` | string | Used as display name in Backstage |
| `description` | string | Shown in catalog card |
| `channels` | object | At least 1 channel; no external `$ref`s (self-contained) |

**File**: `labs/lab-01-base-backstage/apis/streetlights/asyncapi.yaml`

---

### 5. CatalogDescriptor (`catalog-info.yaml`)

The Backstage entity descriptor file. One per APISpec.

| Field | Value / Constraint |
|-------|--------------------|
| `apiVersion` | `backstage.io/v1alpha1` |
| `kind` | `API` |
| `metadata.name` | kebab-case, unique within the Backstage instance |
| `metadata.description` | Non-empty string |
| `spec.type` | `openapi` or `asyncapi` — must match the companion spec file |
| `spec.lifecycle` | `experimental` (appropriate for lab content) |
| `spec.owner` | `user:default/guest` (no auth in Lab 1) |
| `spec.definition.$text` | Relative path to the spec file (e.g., `./openapi.yaml`) |

**Relationships**:
- Each CatalogDescriptor belongs to exactly one APISpec
- The `spec.definition.$text` path MUST resolve relative to the descriptor's own directory

---

### 6. BackstageApp (created by student; not committed)

The running Backstage instance created by `npx @backstage/create-app`.

| Field | Value |
|-------|-------|
| `directory` | `labs/lab-01-base-backstage/backstage/` (gitignored) |
| `configFile` | `app-config.yaml` (student-modified) |
| `frontendPort` | 3000 (default) |
| `backendPort` | 7007 (default) |
| `catalogDB` | SQLite, auto-created at startup |

**Key modification**: The student adds `catalog.locations` entries to `app-config.yaml`
pointing to the pre-committed `catalog-info.yaml` files.

---

## File Relationships

```
labs/lab-01-base-backstage/
│
├── README.md ──────────────────────── Lab (documentation)
│
├── apis/museum/
│   ├── openapi.yaml ───────────────── OpenAPISpec (Museum API — Redocly)
│   └── catalog-info.yaml ──────────── CatalogDescriptor → references openapi.yaml
│                                        (spec.definition.$text: ./openapi.yaml)
│
├── apis/streetlights/
│   ├── asyncapi.yaml ──────────────── AsyncAPISpec
│   └── catalog-info.yaml ──────────── CatalogDescriptor → references asyncapi.yaml
│                                        (spec.definition.$text: ./asyncapi.yaml)
│
└── backstage/ (gitignored)
    └── app-config.yaml ────────────── BackstageApp config
        │                               (catalog.locations entries)
        ├── → ../../apis/museum/catalog-info.yaml
        └── → ../../apis/streetlights/catalog-info.yaml
```

---

## State Transitions

The developer progresses through four states during the lab:

```
[Prerequisites installed]
        ↓
[Backstage app created via npx @backstage/create-app]
        ↓ (US1 complete — verified: app loads at localhost:3000)
[Catalog locations configured in app-config.yaml]
        ↓
[OpenAPI catalog entry visible in Backstage] (US2 complete)
        ↓
[AsyncAPI catalog entry visible in Backstage] (US3 complete)
        ↓
[Both APIs discoverable via search] (US4 complete)
```
