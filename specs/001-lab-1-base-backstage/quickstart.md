# Quickstart Validation: Lab 1 — Base Backstage Implementation

Use this checklist to verify the lab works end-to-end on a clean machine before publishing.
Run through each step in order on both Windows and macOS.

---

## Environment

- [ ] Node.js 20 LTS installed (`node --version` → `v20.x.x`)
- [ ] Yarn Classic installed (`yarn --version` → `1.x.x`)
- [ ] Git installed (`git --version`)
- [ ] No prior Backstage app in the target directory
- [ ] Internet available for package download

---

## Step 1 — Create Backstage App (US1)

```bash
# Navigate into the lab directory
cd labs/lab-01-base-backstage

# Create the Backstage app (replace <version> with the lab's pinned version)
npx @backstage/create-app@<version>
# When prompted for app name, enter: backstage
# This creates: labs/lab-01-base-backstage/backstage/
```

- [ ] `npx @backstage/create-app` completes without errors
- [ ] Directory `labs/lab-01-base-backstage/backstage/` exists

---

## Step 2 — Start Backstage (US1)

```bash
cd backstage
yarn start
```

- [ ] `yarn start` starts without errors
- [ ] Browser at `http://localhost:3000` shows the Guest login screen
- [ ] Click **Enter** on the Guest login screen to reach the Backstage home screen
- [ ] Backstage home screen is visible (navigation sidebar with Home, Catalog, APIs, etc.)
- [ ] No console errors in the terminal

**Verification checkpoint (US1 complete)**: Backstage home screen visible after clicking Enter on the Guest login screen.

---

## Step 3 — Configure Catalog Locations (US2 + US3 setup)

Edit `labs/lab-01-base-backstage/backstage/app-config.yaml` with two changes:

**Change 1** — Add `reading.allow` inside the existing `backend:` block:

```yaml
backend:
  reading:
    allow:
      - host: raw.githubusercontent.com
```

**Change 2** — Add these two entries **inside the existing `catalog: > locations:` list**:

```yaml
    # --- Lab 1: Museum REST API (OpenAPI 3.1) ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-01-base-backstage/apis/museum/catalog-info.yaml
      rules:
        - allow: [API]

    # --- Lab 1: Streetlights Event API (AsyncAPI 2.6) ---
    - type: url
      target: https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-01-base-backstage/apis/streetlights/catalog-info.yaml
      rules:
        - allow: [API]
```

> **Important — verify the URL resolves before restarting.** Open each URL in a browser;
> it must return the raw YAML content of the file. The example above uses the `main` branch.
> If validating from a feature branch before merging, replace `main` with the branch name
> (e.g., `001-lab-1-base-backstage`). A 404 means the files are not yet on that branch.

Restart `yarn start` (Ctrl+C then `yarn start` again).

- [ ] `app-config.yaml` saved with `reading.allow` and catalog locations added
- [ ] Each target URL opens in a browser and returns raw YAML content (not a 404)
- [ ] Backstage restarts without errors

---

## Step 4 — Verify OpenAPI Entry (US2)

- [ ] Navigate to `http://localhost:3000/api-docs` (or APIs section in sidebar)
- [ ] "Museum API" appears in the catalog list
- [ ] Clicking the entry shows name, description, and version
- [ ] The OpenAPI spec renders (paths and schemas visible)

**Verification checkpoint (US2 complete)**: Museum API visible and renderable.

---

## Step 5 — Verify AsyncAPI Entry (US3)

- [ ] "Streetlights API" appears in the catalog list alongside Petstore API
- [ ] Clicking the entry shows name and description
- [ ] The AsyncAPI spec renders (channels and messages visible)

**Verification checkpoint (US3 complete)**: Streetlights API visible and renderable.

---

## Step 6 — Search Verification (US4)

- [ ] Use the Backstage search bar (magnifying glass icon or `/` shortcut)
- [ ] Search for "museum" → Museum API appears in results
- [ ] Search for "streetlights" → Streetlights API appears in results
- [ ] Search for "sample" (present in both descriptions) → both APIs appear

**Verification checkpoint (US4 complete)**: Both APIs discoverable by name and keyword.

---

## Step 7 — Cross-Platform Check

- [ ] All above steps completed successfully on macOS
- [ ] All above steps completed successfully on Windows (Git Bash or PowerShell)
- [ ] No platform-specific steps required beyond those documented in the lab README

---

## Timing

- [ ] Full lab (Steps 1–6 inclusive) completed in under 60 minutes on a clean machine
  (record actual time: ______ minutes)

---

## Notes

Record any failures, workarounds, or unexpected steps here. Use findings to update the
lab README troubleshooting section before marking the lab complete.
