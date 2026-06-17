# Issues

## Run 1 - 2026/06/15

Step 2a — Install the api-grade Frontend Plugin

- [X] These steps did not work. I had to use the npm equivalent of each of these instead:

```powershell
yarn install # Use npm install
yarn build # Use npm run build
```

**Resolution (2026-06-15)**: README Step 2a and Step 2b macOS section now uses `npm install` / `npm run build` to build the api-grade repo. api-grade uses npm internally; the yarn equivalents do not work on this repo on either platform.

- [X] This step did not work in Powershell: `cd -`

**Resolution (2026-06-15)**: Windows (PowerShell) section now uses `Set-Location ..\backstage-apiportal-lab\labs\lab-01-base-backstage\backstage` instead of `cd -`. The `cd -` shorthand is Bash/zsh only.

- [X] This step did not work: yarn install from checked out repo

```powershell
yarn --cwd packages\app add "backstage-plugin-api-grade@file:../../../../api-grade/packages/backstage-plugin-api-grade"
➤ YN0000: · Yarn 4.4.1
➤ YN0000: ┌ Resolution step
➤ YN0001: │ Error: backstage-plugin-api-grade@file:../../../../api-grade/packages/backstage-plugin-api-grade::locator=app%40workspace%3Apackages%2Fapp: ENOENT: no such file or directory, lstat 'C:\GitHub\DawMatt\backstage-apiportal-lab\labs\api-grade\packages\backstage-plugin-api-grade'
➤ YN0000: └ Completed in 0s 204ms
➤ YN0000: · Failed with errors in 0s 209ms
```

Trying to replace this with:

`npm install --prefix packages/app "backstage-plugin-api-grade@file:../../../../api-grade/packages/backstage-plugin-api-grade"`

or

```powershell
cd packages/app
npm install "backstage-plugin-api-grade@file:../../../../api-grade/packages/backstage-plugin-api-grade"
```

Results:

```powershell
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: @material-ui/core@4.12.4
npm error Found: @types/react@18.3.31
npm error node_modules/@types/react
npm error   peerOptional @types/react@"^16.8.0 || ^17 || ^18 || ^19" from material-ui-popup-state@5.3.7
npm error   node_modules/material-ui-popup-state
npm error     material-ui-popup-state@"^5.3.6" from @backstage/plugin-catalog-react@3.0.0
npm error     node_modules/@backstage/plugin-catalog-react
npm error       @backstage/plugin-catalog-react@"^3.0.0" from @backstage/core-compat-api@0.5.11
npm error       node_modules/@backstage/core-compat-api
npm error         @backstage/core-compat-api@"^0.5.11" from @backstage/plugin-catalog@2.0.5
npm error         node_modules/@backstage/plugin-catalog
npm error         1 more (@backstage/plugin-catalog-react)
npm error       11 more (@backstage/plugin-api-docs, ...)
npm error   peer @types/react@">=16" from react-markdown@8.0.7
npm error   node_modules/react-markdown
npm error     react-markdown@"^8.0.0" from @backstage/core-components@0.18.10
npm error     node_modules/@backstage/core-components
npm error       @backstage/core-components@"^0.18.10" from @backstage/frontend-defaults@0.5.2
npm error       node_modules/@backstage/frontend-defaults
npm error         @backstage/frontend-defaults@"^0.5.2" from @backstage/frontend-app-api@0.16.3
npm error         node_modules/@backstage/frontend-app-api
npm error         1 more (app)
npm error       22 more (@backstage/plugin-app, @backstage/plugin-api-docs, ...)
npm error   85 more (react-remove-scroll, react-remove-scroll-bar, ...)
npm error
npm error Could not resolve dependency:
npm error peerOptional @types/react@"^16.8.6 || ^17.0.0" from @material-ui/core@4.12.4
npm error node_modules/@material-ui/core
npm error   @material-ui/core@"^4.12.2" from @backstage/core-components@0.18.10
npm error   node_modules/@backstage/core-components
npm error     @backstage/core-components@"^0.18.10" from @backstage/frontend-defaults@0.5.2
npm error     node_modules/@backstage/frontend-defaults
npm error       @backstage/frontend-defaults@"^0.5.2" from @backstage/frontend-app-api@0.16.3
npm error       node_modules/@backstage/frontend-app-api
npm error       1 more (app)
npm error     22 more (@backstage/plugin-app, @backstage/plugin-api-docs, ...)
npm error   @material-ui/core@"^4.9.13" from @backstage/plugin-app@0.4.6
npm error   node_modules/@backstage/plugin-app
npm error     @backstage/plugin-app@"^0.4.6" from @backstage/frontend-defaults@0.5.2
npm error     node_modules/@backstage/frontend-defaults
npm error       @backstage/frontend-defaults@"^0.5.2" from @backstage/frontend-app-api@0.16.3
npm error       node_modules/@backstage/frontend-app-api
npm error       1 more (app)
npm error     1 more (@backstage/frontend-test-utils)
npm error   30 more (@backstage/plugin-api-docs, ...)
npm error
npm error Conflicting peer dependency: @types/react@17.0.93
npm error node_modules/@types/react
npm error   peerOptional @types/react@"^16.8.6 || ^17.0.0" from @material-ui/core@4.12.4
npm error   node_modules/@material-ui/core
npm error     @material-ui/core@"^4.12.2" from @backstage/core-components@0.18.10
npm error     node_modules/@backstage/core-components
npm error       @backstage/core-components@"^0.18.10" from @backstage/frontend-defaults@0.5.2
npm error     node_modules/@backstage/frontend-defaults
npm error       @backstage/frontend-defaults@"^0.5.2" from @backstage/frontend-app-api@0.16.3
npm error         node_modules/@backstage/frontend-app-api
npm error         1 more (app)
npm error     22 more (@backstage/plugin-app, @backstage/plugin-api-docs, ...)
npm error   @material-ui/core@"^4.9.13" from @backstage/plugin-app@0.4.6
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
npm error to accept an incorrect (and potentially broken) dependency resolution.
```

**Resolution (2026-06-15)**: Two separate fixes applied:
1. The `file:` path was wrong — 4 levels (`../../../../`) reaches `labs/api-grade/` inside the repo, not the sibling clone. Corrected to 6 levels (`../../../../../../`) from `packages/app`.
2. The `npm install` ERESOLVE is a known `@material-ui/core@4` / `@types/react@18` peer dependency conflict. Use `yarn --cwd` instead (yarn 4.x ignores it silently), or add `--legacy-peer-deps` if npm must be used. Both approaches are now documented in Step 2a and the Troubleshooting section.

---

## Run 2 - 2026/06/15

- [X] Yarn does not work with api-grade on any operating system. api-grade uses npm as its package manager so yarn refuses to install or build that repository. So these commands fail:

```
yarn install
yarn build
```

**Resolution (2026-06-15)**: README Step 2a macOS section now uses `npm install` / `npm run build` for the api-grade repo build step. Was previously using yarn on macOS but npm on Windows; now consistently npm on both platforms for building the api-grade source.

- [X] Manual plugin install process failed with the following error message:

```bash
$ yarn --cwd packages/app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"

➤ YN0000: · Yarn 4.4.1
➤ YN0000: ┌ Resolution step
➤ YN0035: │ api-grade-core@npm:*: Package not found
➤ YN0035: │   Response Code: 404 (Not Found)
➤ YN0035: │   Request Method: GET
➤ YN0035: │   Request URL: https://registry.yarnpkg.com/api-grade-core
➤ YN0000: └ Completed in 0s 260ms
➤ YN0000: · Failed with errors in 0s 264ms
```

**Resolution (2026-06-15)**: `api-grade-core` is a workspace dependency of `backstage-plugin-api-grade` that is not published to npm. README Step 2a now pre-installs `api-grade-core` from the local file path before installing `backstage-plugin-api-grade`:
```bash
yarn --cwd packages/app add "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core"
yarn --cwd packages/app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"
```

- [X] This command does install the missing package, but it was not sufficient to make the backstage plugin work at the second install attempt.

```bash
$ yarn --cwd packages/app add "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core" 

➤ YN0000: · Yarn 4.4.1
➤ YN0000: ┌ Resolution step
➤ YN0085: │ + api-grade-core@file:../../../../../../api-grade/packages/api-grade-core#../../../../../../api-grade/packages/api-grade-core::hash=55c1d3&locator=app%40workspace%3Apackages%2Fapp, and 18 more.
➤ YN0000: └ Completed in 2s 145ms
➤ YN0000: ┌ Post-resolution validation
➤ YN0060: │ @testing-library/react is listed by your project with version 14.3.1 (pc9eb9), which doesn't satisfy what @backstage/frontend-test-utils and other dependencies request (^16.0.0).
➤ YN0060: │ react is listed by your project with version 18.3.1 (pd98da), which doesn't satisfy what @material-ui/core and other dependencies request (but they have non-overlapping ranges!).
➤ YN0060: │ react-dom is listed by your project with version 18.3.1 (pfa800), which doesn't satisfy what @material-ui/core and other dependencies request (but they have non-overlapping ranges!).
➤ YN0002: │ app@workspace:packages/app doesn't provide @types/react (pceee1), requested by @backstage/core-components and other dependencies.
➤ YN0002: │ app@workspace:packages/app doesn't provide jest (p99cdc), requested by @backstage/cli.
➤ YN0002: │ backend@workspace:packages/backend doesn't provide jest (p35ee3), requested by @backstage/cli.
➤ YN0086: │ Some peer dependencies are incorrectly met by your project; run yarn explain peer-requirements <hash> for details, where <hash> is the six-letter p-prefixed code.
➤ YN0086: │ Some peer dependencies are incorrectly met by dependencies; run yarn explain peer-requirements for details.
➤ YN0000: └ Completed
➤ YN0000: ┌ Fetch step
➤ YN0013: │ 19 packages were added to the project (+ 12.9 MiB).
➤ YN0000: └ Completed in 0s 948ms
➤ YN0000: ┌ Link step
➤ YN0000: └ Completed in 0s 659ms
➤ YN0000: · Done with warnings in 4s 16ms
```

**Resolution (2026-06-15)**: The pre-install approach does not work because yarn v4 resolves `backstage-plugin-api-grade`'s transitive dependencies independently — `api-grade-core@npm:*` is treated as a separate key from `api-grade-core@file:...` so the pre-install is ignored. Fixed by adding a `resolutions` override to the workspace root `package.json` that maps `api-grade-core` to the local file path before running `yarn add`. The `resolutions` field is read by yarn during the resolution step and applies to all packages, including transitive dependencies. README Step 2a (macOS and Windows) and Troubleshooting Symptom B updated accordingly.

## Run 3 - 2026/06/15

- [X] The api-grade-core install command does install that package, but the backstage plugin install command fails anyway.

```bash
# api-grade-core is a dependency of backstage-plugin-api-grade that is not published to npm.
# Install it from the local build first so yarn can resolve it:
yarn --cwd packages/app add "api-grade-core@file:../../../../../../api-grade/packages/api-grade-core"
...
➤ YN0000: · Done with warnings in 1s 922ms

# Now install the frontend plugin:
$ yarn --cwd packages/app add "backstage-plugin-api-grade@file:../../../../../../api-grade/packages/backstage-plugin-api-grade"

➤ YN0000: · Yarn 4.4.1
➤ YN0000: ┌ Resolution step
➤ YN0035: │ api-grade-core@npm:*: Package not found
➤ YN0035: │   Response Code: 404 (Not Found)
➤ YN0035: │   Request Method: GET
➤ YN0035: │   Request URL: https://registry.yarnpkg.com/api-grade-core
➤ YN0000: └ Completed in 0s 490ms
➤ YN0000: · Failed with errors in 0s 495ms
```

**Resolution (2026-06-15)**: Confirmed root cause — yarn v4 re-resolves `api-grade-core@npm:*` independently when processing `backstage-plugin-api-grade`'s transitive dependencies, ignoring any `api-grade-core@file:...` entry already in the lockfile (different resolution keys). Fixed by adding `"resolutions": { "api-grade-core": "file:../../../../api-grade/packages/api-grade-core" }` to the workspace root `package.json` before installing `backstage-plugin-api-grade`. The `resolutions` field causes yarn to substitute the local file path for any request for `api-grade-core`, regardless of the requester's version range. README Step 2a (macOS and Windows sections) and Troubleshooting Symptom B updated.

## Run 4 - 2026/06/15

Step 5 — Register the api-grade Backend Plugin

- [x] Added the import line to the index.ts file, as requested. i.e.
`backend.add(import('backstage-plugin-api-grade-backend'));`. This was added as the last line before the `backend.start();` line. The "import" part of that statement (and the package name) showed with a squiggly red underline in VS Code. The entire Backstage environment failed to work properly with lots of errors in the UI. No objects, APIs, etc would show. Error messages in the terminal were captured and included below:

```
Starting app, backend
Loaded config from app-config.yaml, app-config.local.yaml
<i> [webpack-dev-server] Project is running at:
<i> [webpack-dev-server] Loopback: http://localhost:3000/, http://[::1]:3000/
<i> [webpack-dev-server] Content not from webpack is served from '/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/packages/app/public' directory
<i> [webpack-dev-server] 404s will fallback to '/index.html'
<i> [webpack-dev-middleware] wait until bundle finished: /api-docs?filters%5Bkind%5D=api&filters%5Buser%5D=all
Rspack compiled successfully
/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/helpers.ts:23
  if ('$$type' in feature) {
      ^


TypeError: Cannot use 'in' operator to search for '$$type' in undefined
    at Object.unwrapFeature (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/helpers.ts:23:7)
    at <anonymous> (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackstageBackend.ts:41:47)
    at async BackendInitializer.#doStart (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:285:24)
    at async BackendInitializer.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:278:12)
    at async BackstageBackend.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackstageBackend.ts:48:12)
```

