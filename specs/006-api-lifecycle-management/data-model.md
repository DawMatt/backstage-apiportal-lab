# Data Model: Lab 6 — API Lifecycle Management

No database or persisted application state is introduced. All "data" in this lab is Backstage
catalog entity metadata (YAML), read at request time by one new read-only frontend card. This
document describes the shape of that catalog metadata and the in-memory view the frontend
constructs from it — not schema for a datastore.

## Entity: System (logical API grouping)

New catalog kind used for the first time in this repository (already allowed by
`catalog.rules: allow: [..., System, ...]` in `app-config.yaml`, unused until now).

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: museum-api
  description: >
    Logical grouping of all major versions of the Museum API.
spec:
  owner: group:default/museum-team
```

- **name**: The logical API's stable identity, independent of any version number.
- **owner**: Same owning team as its version entities (Lab 2's `museum-team`), consistent with
  "visibility of other catalog entry types remains allow all" (System pages are open to everyone
  regardless of any version's private/shared visibility, per the existing permission policy's
  Rule 1 — non-API kinds are always visible).

## Entity: API (one per major version)

Existing kind, extended with two new pieces of metadata (an annotation and the `spec.system`
relation); `spec.lifecycle` is Backstage's existing native field, not a new one.

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: museum-api-v1
  description: >
    Museum API — version 1. Covers special events, museum hours, and ticket purchasing.
  tags: [rest, openapi, sample]
  annotations:
    example.com/visibility: private       # unchanged from Lab 2
    apiportal.io/version: "1.0"           # new: major.minor version identifier
spec:
  type: openapi
  lifecycle: production                   # or: development | testing | deprecated | retired
  owner: group:default/museum-team
  system: museum-api                      # new: relation to the System above
  definition:
    $text: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-01-base-backstage/apis/museum/openapi.yaml
```

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: museum-api-v2
  description: >
    Museum API — version 2. Introduces breaking changes to special-event identifiers and the
    ticket QR-code endpoint; see the lab README's changelog callout.
  tags: [rest, openapi, sample]
  annotations:
    example.com/visibility: private
    apiportal.io/version: "2.0"
spec:
  type: openapi
  lifecycle: development                  # advanced through testing → production during the lab
  owner: group:default/museum-team
  system: museum-api
  definition:
    $text: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-06-api-lifecycle-management/apis/museum-v2/openapi.yaml
```

### Fields

| Field | Source | Notes |
|---|---|---|
| `metadata.name` | New per version (`<logical-name>-v<major>`) | Catalog-unique; the mechanism that makes "multiple versions" representable at all (FR-001). |
| `metadata.annotations['apiportal.io/version']` | New | `"<major>.<minor>"` string; sort key and "latest" computation input (research.md R2). Lab-defined convention — learners may rename or extend to full semver. |
| `spec.lifecycle` | Existing native field | Free-form string; convention values for this lab: `development`, `testing`, `production`, `deprecated`, `retired` (research.md R3). |
| `spec.system` | Existing native field, first used here | Relation to the shared `System` entity; the grouping mechanism (research.md R1). |
| `spec.owner` / `example.com/visibility` | Unchanged from Lab 2 | Inherited per-version, independent of every other version (FR-012). |

## Derived (non-persisted) view: Version list entry

Computed client-side by `ApiVersionsCard.tsx` for each sibling `API` entity sharing the viewed
entity's `spec.system` — not stored anywhere.

| Field | Derivation |
|---|---|
| `name` | `metadata.name` |
| `version` | `metadata.annotations['apiportal.io/version']` |
| `lifecycle` | `spec.lifecycle` |
| `isLatest` | `true` for the sibling with the numerically highest `version` among those whose `lifecycle !== 'retired'`; if every sibling is `retired`, the highest overall is flagged instead (edge case from spec.md) |
| `isRetired` | `lifecycle === 'retired'` — controls default collapse behavior (research.md R4) |
| `entityRef` | Standard Backstage entity ref, used for the `EntityRefLink` to that version's own page |

## State transitions (`spec.lifecycle`, per version, independent of sibling versions)

```text
development → testing → production → deprecated → retired
```

- Each arrow is a one-line YAML edit to that version's own file (research.md R7); no enforcement
  of ordering exists in Backstage itself — the lab documents the intended progression, it is not
  machine-validated. A version may also skip states (e.g. `development` → `deprecated`) if a
  learner chooses to; this is not blocked, consistent with Backstage's own lack of a lifecycle
  state machine.
- `retired` is a terminal state: the entity is never deleted (FR-009); only its default visibility
  within the Versions card changes (collapsed behind "Show retired versions").
