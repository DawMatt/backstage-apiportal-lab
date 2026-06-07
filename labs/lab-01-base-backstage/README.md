# Lab 1: Base Backstage Implementation

## Overview

[Backstage](https://backstage.io/) is an open-source developer portal platform created by
Spotify. It gives engineering teams a single place to discover, understand, and manage their
software — including APIs, services, documentation, and infrastructure.

**What this lab teaches:**

- How to install and run Backstage locally using its official scaffolding tool
- How to register APIs in the Backstage catalog using the *catalog-as-code* pattern:
  committing `catalog-info.yaml` descriptor files alongside your API specifications
- How Backstage renders both OpenAPI (REST) and AsyncAPI (event-driven) specifications
- How Backstage's built-in search makes your APIs discoverable

**What you will have at the end:**

A Backstage instance running on your local machine with two sample APIs registered in the
catalog — a Museum REST API (OpenAPI) and a Streetlights event API (AsyncAPI) — both visible
and searchable.

> **Lab series context**: This is Lab 1 of a progressive series. Each lab builds on the
> environment created here. Complete this lab before attempting Lab 2.

---

## Prerequisites

Before starting, install the following tools. Each one is free and available on both Windows
and macOS.

### 1. Node.js 20 LTS

Backstage is a Node.js application. Node.js 20 LTS is the recommended version.

**Why**: Backstage's frontend and backend both run in Node.js. Using the LTS version ensures
maximum compatibility.

| Platform | Download | Verify |
|----------|----------|--------|
| macOS | [nodejs.org/en/download](https://nodejs.org/en/download) | `node --version` → `v20.x.x` |
| Windows | [nodejs.org/en/download](https://nodejs.org/en/download) | `node --version` → `v20.x.x` |

> **Note**: Node.js 18 LTS is also supported if you already have it installed.

### 2. Yarn Classic (v1)

Backstage uses Yarn workspaces for package management.

**Why**: The Backstage scaffolding tool and its generated project both require Yarn. npm is
not supported by Backstage's monorepo workspace setup.

Once Node.js is installed, run:

```
npm install -g yarn
```

Verify:

```
yarn --version
```

Expected output: `1.x.x`

### 3. Git

**Why**: You will clone this repository to access the sample API files that ship with the lab.

| Platform | Download | Verify |
|----------|----------|--------|
| macOS | [git-scm.com/downloads](https://git-scm.com/downloads) or pre-installed | `git --version` |
| Windows | [git-scm.com/downloads](https://git-scm.com/downloads) | `git --version` |

### Clone this repository

If you have not already cloned this repository, do so now:

```
git clone <repository-url>
cd backstage-apiportal-lab
```

---

## Step-by-step Instructions

### Step 1: Navigate to the Lab Directory

Open a terminal and navigate to the lab directory inside the cloned repository:

```
cd labs/lab-01-base-backstage
```

All subsequent commands in this lab run from this directory unless otherwise noted.

---

### Step 2: Create the Backstage App

Run the Backstage scaffolding tool to create a new Backstage application:

```
npx @backstage/create-app@0.8.3
```

> **Why this version?** We pin `0.8.3` so that every student following this lab creates
> the same application structure. Using an unpinned `npx @backstage/create-app` may produce
> a different version over time, causing instructions to diverge from reality.

When prompted:

- **Enter a name for the app**: type `backstage` and press Enter

The scaffolding tool will create a `backstage/` directory and install all dependencies.
This typically takes **3–5 minutes** depending on your internet connection.

**What the scaffolder creates**: A full Backstage application with a React frontend, a
Node.js/Express backend, and a local SQLite catalog database. The `backstage/` directory
is gitignored in this repository — it is yours to experiment with.

> **Windows note**: Run this command in Git Bash or PowerShell. The scaffolding tool works
> the same on both platforms.

---

### Step 3: Start Backstage

```
cd backstage
yarn dev
```

> **Windows variant**: `cd backstage; yarn dev` (semicolon instead of `&&` in PowerShell)

**What this starts:**

- The **frontend** (React app) on port **3000**
- The **backend** (Node.js/Express API + catalog) on port **7007**

Both start concurrently in the same terminal. You will see log output from both processes
interleaved. Wait until you see a line similar to:

```
[0] webpack compiled successfully
```

This indicates the frontend has finished building.

---

### ✅ Checkpoint 1: Verify Backstage is Running

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the Backstage home screen — a page with a navigation sidebar on the left
containing "Home", "Catalog", "APIs", and other items.

**If you see this screen, Backstage is running correctly. Proceed to Step 4.**

If the page does not load, check the terminal for error messages and refer to the
[Troubleshooting](#troubleshooting) section.

---

### Step 4: Understand the Catalog-as-Code Pattern

Before registering APIs, it helps to understand *why* Backstage uses descriptor files.

**The problem**: A developer portal needs to know about your APIs, services, and teams.
Maintaining this list manually in a UI is error-prone and goes out of date quickly.

**The solution — catalog-as-code**: You commit a small `catalog-info.yaml` file alongside
your API specification in your repository. Backstage reads this file and populates its
catalog automatically. The catalog stays in sync with your code.

This lab's repository already contains the descriptor files for two sample APIs:

```
labs/lab-01-base-backstage/apis/
├── museum/
│   ├── openapi.yaml         ← Museum REST API specification (OpenAPI 3.1)
│   └── catalog-info.yaml    ← Backstage descriptor pointing to openapi.yaml
└── streetlights/
    ├── asyncapi.yaml        ← Streetlights event API specification (AsyncAPI 2.6)
    └── catalog-info.yaml    ← Backstage descriptor pointing to asyncapi.yaml
```

The `catalog-info.yaml` file for the Museum API looks like this:

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: museum-api
  description: >
    A sample REST API for a fictional museum, demonstrating modern OpenAPI 3.1
    design practices.
  tags:
    - rest
    - openapi
    - sample
spec:
  type: openapi
  lifecycle: experimental
  owner: user:default/guest
  definition:
    $text: ./openapi.yaml
```

Key fields:

- `kind: API` — tells Backstage this is an API entity
- `spec.type: openapi` — indicates the specification format
- `spec.definition.$text: ./openapi.yaml` — relative path to the spec file (resolved from
  the descriptor's own directory)

---

### Step 5: Register the Museum API

To register the Museum API, you need to tell Backstage where its `catalog-info.yaml` lives.
You do this by adding a `catalog.locations` entry to Backstage's configuration file.

Open `labs/lab-01-base-backstage/backstage/app-config.yaml` in a text editor.

Find the `catalog:` section (it already exists — look for it near the bottom of the file).
Add the following entries **inside** the existing `catalog:` block:

```yaml
catalog:
  locations:
    # --- Lab 1: Museum REST API (OpenAPI 3.1) ---
    - type: file
      target: ../../apis/museum/catalog-info.yaml
      rules:
        - allow: [API]
```

**Why the `../../` path?** The `app-config.yaml` is inside `backstage/`. The `apis/` folder
is two levels up at `labs/lab-01-base-backstage/apis/`. Backstage resolves `file:` target
paths relative to the location of `app-config.yaml`.

> **Windows note**: Use forward slashes in YAML paths even on Windows —
> `../../apis/museum/catalog-info.yaml` not `..\..\apis\museum\catalog-info.yaml`.

Restart Backstage after saving (press `Ctrl+C` in the terminal, then run `yarn dev` again):

```
yarn dev
```

---

### ✅ Checkpoint 2: Verify the Museum API is Registered

1. Navigate to `http://localhost:3000`
2. Click **APIs** in the left sidebar (or go to `http://localhost:3000/api-docs`)
3. You should see **Museum API** listed in the catalog

Click on the **Museum API** entry. You should see:

- The API name, description, and tags
- An **Overview** tab showing the API metadata
- A **Definition** tab showing the rendered OpenAPI specification — paths, parameters, and
  schemas (Museum Hours, Special Events, Tickets)

**If you can see the Museum API spec rendered in Backstage, registration was successful.**

---

### Step 6: Register the Streetlights API

Now register the second API — an AsyncAPI event-driven specification. This demonstrates
that Backstage's catalog supports multiple API paradigms, not just REST.

**Why does this matter?** Modern software systems use a mix of synchronous REST APIs and
asynchronous event-driven APIs. A good developer portal needs to show developers all of
their APIs in one place, regardless of the communication style.

Add a second entry to the `catalog.locations` section in `app-config.yaml`:

```yaml
catalog:
  locations:
    # --- Lab 1: Museum REST API (OpenAPI 3.1) ---
    - type: file
      target: ../../apis/museum/catalog-info.yaml
      rules:
        - allow: [API]

    # --- Lab 1: Streetlights Event API (AsyncAPI 2.6) ---
    - type: file
      target: ../../apis/streetlights/catalog-info.yaml
      rules:
        - allow: [API]
```

Note that `spec.type: asyncapi` in the Streetlights descriptor tells Backstage to render
the spec as an AsyncAPI document (showing channels, messages, and schemas) rather than as
a REST API.

Restart Backstage again (`Ctrl+C`, then `yarn dev`).

---

### ✅ Checkpoint 3: Verify Both APIs are Registered

1. Navigate to `http://localhost:3000/api-docs`
2. You should see **both** "Museum API" and "Streetlights API" listed
3. Click on **Streetlights API** and open the **Definition** tab
4. You should see the AsyncAPI spec rendered with channels
   (`smartylighting/streetlights/...`) and message schemas (LightMeasured, TurnOnOff,
   DimLight)

**If both APIs are visible and their specs render correctly, you have mastered the
catalog-as-code registration pattern.**

---

### Step 7: Search for APIs

Backstage indexes the catalog and makes it searchable. This is one of its core value
propositions: engineers should be able to *discover* APIs, not just browse a list they
already know exists.

To open search:

- Click the **magnifying glass** icon in the top navigation bar, or
- Press `/` anywhere in the Backstage UI (keyboard shortcut)

**Why search matters**: As a developer portal grows to hundreds of APIs, a browsable
list becomes impractical. Search lets a developer find "all payment APIs" or "anything
related to users" without knowing the exact catalog structure.

---

### ✅ Checkpoint 4: Verify API Search

Try the following searches and confirm the expected results:

| Search query | Expected result |
|-------------|-----------------|
| `museum` | Museum API appears in results |
| `streetlights` | Streetlights API appears in results |
| `sample` | Both APIs appear (both have "sample" in their descriptions) |

Click on a search result to navigate directly to that API's catalog page.

**This is the final verification step. If both APIs appear in search results, Lab 1 is
complete!**

---

## Verification

Use this checklist to confirm you have completed every step of the lab:

- [ ] Backstage starts and the home screen loads at `http://localhost:3000`
- [ ] Museum API appears in the Backstage API catalog
- [ ] Museum API spec renders (OpenAPI paths and schemas visible)
- [ ] Streetlights API appears in the Backstage API catalog
- [ ] Streetlights API spec renders (AsyncAPI channels visible)
- [ ] Search for "museum" returns the Museum API
- [ ] Search for "streetlights" returns the Streetlights API
- [ ] Search for "sample" returns both APIs

All boxes checked? You are ready for **Lab 2**.

---

## Troubleshooting

### Port 3000 or 7007 is already in use

Backstage's frontend uses port 3000 and its backend uses port 7007. If another process
is using either port, Backstage will fail to start.

**Find the process using the port:**

| Platform | Command |
|----------|---------|
| macOS | `lsof -i :3000` |
| Windows | `netstat -ano \| findstr :3000` |

Stop the conflicting process, or change Backstage's ports by editing `app-config.yaml`:

```yaml
app:
  baseUrl: http://localhost:4000   # Change from 3000

backend:
  baseUrl: http://localhost:4007   # Change from 7007
  listen:
    port: 4007
```

### Node.js or Yarn not found

If you see `node: command not found` or `yarn: command not found`, Node.js or Yarn is not
installed or not on your PATH. Return to the [Prerequisites](#prerequisites) section and
verify your installation.

**Windows tip**: After installing Node.js or Yarn, close and reopen your terminal — the
PATH changes are not picked up by an already-open terminal session.

### YAML indentation errors in `app-config.yaml`

YAML is indentation-sensitive. If you see a startup error mentioning `app-config.yaml`,
there is likely an indentation problem in the catalog locations you added.

Use a YAML linter to check the file:

- Online: [yamllint.com](https://www.yamllint.com/)
- VS Code: Install the "YAML" extension by Red Hat
- CLI: `npx yaml-lint app-config.yaml`

Common mistake: using tabs instead of spaces. YAML requires spaces only.

### APIs not appearing after restarting Backstage

If you restart `yarn dev` but the APIs do not appear in the catalog:

1. **Check the path**: Verify that the `target` value in `app-config.yaml` exactly matches
   the path to your `catalog-info.yaml` file. The path is relative to `app-config.yaml`'s
   own location inside `backstage/`.

   Expected paths:
   ```
   ../../apis/museum/catalog-info.yaml
   ../../apis/streetlights/catalog-info.yaml
   ```

2. **Check the YAML structure**: Ensure the new entries are inside the existing `catalog:`
   block and `locations:` list — not duplicating the `catalog:` key.

3. **Check the terminal**: Look for error messages starting with `[1]` (backend) in the
   `yarn dev` output. Error messages will name the file that failed to parse.

### `npx @backstage/create-app` fails on Windows

- Ensure you are using Git Bash or PowerShell (not CMD)
- Ensure Node.js and npm are on your PATH: `npm --version`
- If you see a permission error, try running the terminal as Administrator

### `yarn dev` exits immediately

This usually means a dependency is missing. Run `yarn install` inside the `backstage/`
directory, then try `yarn dev` again.
