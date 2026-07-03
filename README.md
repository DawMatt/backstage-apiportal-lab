# Backstage API Developer Portal Lab

A progressive series of hands-on labs for building a fully functional
[Backstage](https://backstage.io/) API Developer Portal — from a blank installation to a
portal with users, roles, API quality tooling, automated registration, mocking, lifecycle
management, and a technology radar.

Each lab is self-contained, cross-platform (Windows and macOS), and costs nothing to run.

---

## Lab Series

| Lab | Title | What you build |
|-----|-------|----------------|
| [Lab 1](labs/lab-01-base-backstage/) | Base Backstage | Install Backstage locally; register a REST API (OpenAPI) and an event API (AsyncAPI); verify both are visible and searchable |
| [Lab 2](labs/lab-02-users-roles/) | Users, Roles & API Visibility | Add users, teams, and a custom permission policy; private APIs are visible only to their owning team, shared APIs are visible to everyone |
| [Lab 3](labs/lab-03-api-quality/) | API Quality | Add a shared Spectral ruleset, the api-grade quality plugin, and the Spectral linter plugin; API owners and a platform team see detailed quality/lint results, everyone else sees a summary grade |
| [Lab 4](labs/lab-04-auto-registration/) | Auto Registration | Auto-discover and register APIs from a Git mono-repo via a custom `EntityProvider`; source owner, lifecycle, and visibility metadata from `x-*` fields in the spec itself |
| Lab 5 *(coming soon)* | Mocking & Testing | Dynamically mock or exercise a test implementation of any registered API, with support for user-supplied non-production credentials |
| Lab 6 *(coming soon)* | API Lifecycle Management | Register multiple major versions of an API in parallel; track lifecycle state (development/test/production) and deprecation/retirement per version |
| Lab 7 *(coming soon)* | Other Documentation | Add the Thoughtworks Tech Radar plugin; register blips to plot your API landscape |

Each lab builds on the one before it. Start with Lab 1 and work through them in order. See
[GOAL.md](GOAL.md) for the full series plan and the constitution the labs are held to.

---

## Prerequisites

Before starting **any** lab, you need:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | [nodejs.org/en/download](https://nodejs.org/en/download) |
| Yarn Classic | 1.x | `npm install -g yarn` |
| Git | Any recent | [git-scm.com/downloads](https://git-scm.com/downloads) |

All labs run on **Windows** (Git Bash or PowerShell) and **macOS**. No paid tools or cloud
accounts are required.

---

## Getting Started

```
git clone <repository-url>
cd backstage-apiportal-lab
```

Then open the lab you want to run and follow its `README.md`:

```
labs/
├── lab-01-base-backstage/
│   ├── README.md                  ← start here
│   ├── apis/
│   │   ├── museum/
│   │   │   ├── openapi.yaml       ← Museum REST API (OpenAPI 3.1)
│   │   │   └── catalog-info.yaml
│   │   └── streetlights/
│   │       ├── asyncapi.yaml      ← Streetlights Event API (AsyncAPI 2.6)
│   │       └── catalog-info.yaml
│   └── backstage/                 ← created by you during Lab 1 (gitignored); every later
│                                     lab continues to build on this same running instance
├── lab-02-users-roles/
│   ├── README.md                  ← continue here after Lab 1
│   └── catalog/                   ← teams.yaml, users, and updated API owners/visibility
├── lab-03-api-quality/
│   ├── README.md                  ← continue here after Lab 2
│   ├── .spectral.yaml             ← shared Spectral ruleset used by both quality plugins
│   └── catalog/                   ← platform team member (eve) added in this lab
└── lab-04-auto-registration/
    ├── README.md                  ← continue here after Lab 3
    ├── autoApiRegistration.ts     ← backend EntityProvider that scans and registers APIs
    └── apis/                      ← auto-discovered specs, incl. the Scalar Galaxy vendor copy
```

---

## Repository Structure

```
backstage-apiportal-lab/
├── labs/                          ← one directory per lab
│   ├── lab-01-base-backstage/
│   ├── lab-02-users-roles/
│   ├── lab-03-api-quality/
│   └── lab-04-auto-registration/
├── specs/                         ← SDD artifacts (spec, plan, tasks per lab)
│   ├── 001-lab-1-base-backstage/
│   ├── 002-lab-2-users-roles/
│   ├── 003-lab-3-api-quality/
│   └── 004-lab-4-auto-registration/
├── .specify/                      ← Speckit configuration and templates
├── GOAL.md                        ← high-level goals for the full lab series
├── CONTRIBUTING.md                ← how to contribute new labs
└── README.md                      ← this file
```

`specs/` contains the design documents that drove each lab's implementation —
specification, plan, research decisions, data model, and task list. They are kept in the
repository for transparency and to support contributors adding new labs.

---

## Contributing

Want to add a lab, fix an error, or improve the documentation? See
[CONTRIBUTING.md](CONTRIBUTING.md).

Labs in this repository are developed using
[Speckit](https://github.com/dawsons-creek/speckit) — an AI-assisted
Specification-Driven Development workflow. The contribution guide explains how to use it.

---

## License

MIT
