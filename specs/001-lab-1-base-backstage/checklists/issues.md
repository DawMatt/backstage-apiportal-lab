# Issues

## Run 1 - 20260507 1625

**Step 3: Start Backstage**

- [x] Starting backstage didn't work
```
yarn dev
Usage Error: Couldn't find a script named "dev".
```

Documentation recommended using `yarn start` instead.

**Checkpoint 1: Verify Backstage is Running**

- [x] First step in opening app missed

First screen may be:

```
Guest
Enter as a Guest User.
```

If you see this, you need to click the `Enter` button before reaching the "Backstage home screen".

**Step 5: Register the Museum API**

- [x] Lack of clarity could break config file

Instructions say: "Add the following entries inside the existing catalog: block:"

```
catalog:
  locations:
    # --- Lab 1: Museum REST API (OpenAPI 3.1) ---
    - type: file
      target: ../../apis/museum/catalog-info.yaml
      rules:
        - allow: [API]
```

If the user does exactly that, it will break the config file because the catalog: and locations: lines are already present in the file. The first two lines in the sample should not be included, only from the comment down. 

- [x] Path to catalog file is incorrect, and needs one more `../` in the path. 

```
2026-06-07T06:52:46.969Z catalog warn file /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/apis/museum/catalog-info.yaml does not exist entity="location:default/generated-9f407d22a5b3bb3d559b32fe7009f6a973f62c15" location="file:/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/apis/museum/catalog-info.yaml"
```

- [x] Once the path is corrected the catalog file still doesn't work

```
2026-06-07T06:47:39.984Z catalog warn Processor PlaceholderProcessor threw an error while preprocessing; caused by Error: Placeholder $text could not form a URL out of /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/apis/museum/catalog-info.yaml and ./openapi.yaml, TypeError: Invalid URL entity="api:default/museum-api" location="file:/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/apis/museum/catalog-info.yaml"
```

## Run 2 - 20260507 2044

**Step 5: Register the Museum API**

- [x] The catalog file still doesn't work

```
2026-06-07T10:41:54.667Z catalog warn Unable to read url, Reading from 'https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-01-base-backstage/apis/museum/catalog-info.yaml' is not allowed. You may need to configure an integration for the target host, or add it to the configured list of allowed hosts at 'backend.reading.allow' entity="location:default/generated-8dc4aa41b173ef5ef2434fb1e1aee32f99a45bb5" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-01-base-backstage/apis/museum/catalog-info.yaml"
```

## Run 3 - 20260507 2113

**Step 5: Register the Museum API**

- [x] The catalog file still doesn't work

```
2026-06-07T11:12:47.053Z catalog warn Unable to read url, no matching files found for https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-01-base-backstage/apis/museum/catalog-info.yaml entity="location:default/generated-8dc4aa41b173ef5ef2434fb1e1aee32f99a45bb5" location="url:https://raw.githubusercontent.com/DawMatt/backstage-apiportal-lab/main/labs/lab-01-base-backstage/apis/museum/catalog-info.yaml"
```

"no matching files found" means the GitHub raw URL returned a 404 — the catalog files existed
locally but were not yet committed to the `main` branch on GitHub at the time of this test run.
This is expected during feature branch development before merging to `main`.

Resolution: Added a dedicated **"no matching files found"** troubleshooting entry to
`labs/lab-01-base-backstage/README.md` that maps the terminal error to its fix (verify the URL
in a browser; update the branch name if needed). Also added a pre-restart URL verification
callout in Step 5b prompting users to check the URL works before restarting Backstage.