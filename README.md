# Backstage API Developer Portal Lab

A progressive series of hands-on labs for building a fully functional
[Backstage](https://backstage.io/) API Developer Portal — from a blank installation to a
portal with users, roles, automated API registration, linting, and a technology radar.

Each lab is self-contained, cross-platform (Windows and macOS), and costs nothing to run.

---

## Lab Series

| Lab | Title | What you build |
|-----|-------|----------------|
| [Lab 1](labs/lab-01-base-backstage/) | Base Backstage | Install Backstage locally; register a REST API (OpenAPI) and an event API (AsyncAPI); verify both are visible and searchable |
| Lab 2 *(coming soon)* | Users, Roles & Teams | Add users, groups, and role-based visibility; see how the catalog changes depending on who is signed in |
| Lab 3 *(coming soon)* | Automatic API Registration | Auto-discover and register APIs from your codebase; pull catalog metadata from `x-*` fields in the spec itself |
| Lab 4 *(coming soon)* | API Linting with Spectral | Install the Spectral plugin; run a pre-defined ruleset against registered APIs; surface lint results in the portal |
| Lab 5 *(coming soon)* | Thoughtworks Radar | Add the Technology Radar plugin; register blips; see your API landscape plotted on the radar |

Each lab builds on the one before it. Start with Lab 1 and work through them in order.

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
└── lab-01-base-backstage/
    ├── README.md                  ← start here
    ├── apis/
    │   ├── museum/
    │   │   ├── openapi.yaml       ← Museum REST API (OpenAPI 3.1)
    │   │   └── catalog-info.yaml
    │   └── streetlights/
    │       ├── asyncapi.yaml      ← Streetlights Event API (AsyncAPI 2.6)
    │       └── catalog-info.yaml
    └── backstage/                 ← created by you during the lab (gitignored)
```

---

## Repository Structure

```
backstage-apiportal-lab/
├── labs/                          ← one directory per lab
│   └── lab-01-base-backstage/
├── specs/                         ← SDD artifacts (spec, plan, tasks per lab)
│   └── 001-lab-1-base-backstage/
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
