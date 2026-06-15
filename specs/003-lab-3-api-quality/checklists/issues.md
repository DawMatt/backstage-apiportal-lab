# Issues

## Run 1 - 2026/06/15

Step 2a — Install the api-grade Frontend Plugin

- [ ] These steps did not work. I had to use the npm equivalent of each of these instead:

```powershell
yarn install # Use npm install
yarn build # Use npm run build
```

- [ ] This step did not work in Powershell: `cd -`

- [ ] This step did not work: yarn install from checked out repo

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
npm error       node_modules/@backstage/frontend-defaults
npm error         @backstage/frontend-defaults@"^0.5.2" from @backstage/frontend-app-api@0.16.3
npm error         node_modules/@backstage/frontend-app-api
npm error         1 more (app)
npm error       22 more (@backstage/plugin-app, @backstage/plugin-api-docs, ...)
npm error     @material-ui/core@"^4.9.13" from @backstage/plugin-app@0.4.6
npm error     node_modules/@backstage/plugin-app
npm error       @backstage/plugin-app@"^0.4.6" from @backstage/frontend-defaults@0.5.2
npm error       node_modules/@backstage/frontend-defaults
npm error         @backstage/frontend-defaults@"^0.5.2" from @backstage/frontend-app-api@0.16.3
npm error         node_modules/@backstage/frontend-app-api
npm error         1 more (app)
npm error       1 more (@backstage/frontend-test-utils)
npm error     30 more (@backstage/plugin-api-docs, ...)
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
npm error to accept an incorrect (and potentially broken) dependency resolution.
```

