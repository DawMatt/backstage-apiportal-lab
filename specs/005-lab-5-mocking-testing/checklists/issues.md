## Run 1 - 2026/07/04

- [x] Step 7 failed and returned a 404. The mock gateway started and lsof shows it is still running, but no mock log messages were generate at the time of executing the mock call.

  **Resolved** (tasks.md T030–T035, research.md R8): two stacked bugs — (1) the frontend module
  built the mock URL as a hardcoded relative path, which resolves against the frontend's own
  origin (`:3000`) rather than the backend (`:7007`) in `yarn start`; fixed by resolving it via
  `discoveryApiRef.getBaseUrl('proxy')` instead. (2) the `/mock` proxy endpoint's default
  `credentials: 'require'` policy rejected Swagger UI's uncredentialed `fetch()` with a 401; fixed
  by setting `credentials: 'dangerously-allow-unauthenticated'` on that endpoint. Re-verified live:
  the exact curl repro above now returns real mock JSON, and the gateway logs the load line.

Request
```
curl -X 'GET' \
  'http://localhost:3000/api/proxy/mock/museum-api/museum-hours?startDate=2024-02-01&page=1&limit=7' \
  -H 'accept: application/json'
```

Response
```
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/proxy/mock/museum-api/museum-hours</pre>
</body>
</html>
```

## Run 2 - 2026/07/04

- [ ] Step 9 didn't work as expected for the instructions quoted below.
    - [ ] You requested I open the lock / Authorize dialog. You didn't explain what you wanted me to do in that dialog, and there are 11 different authorization sub-sections and buttons to chose from. None of them seemed to contain any pre-filled data. The next instruction could not be completed without exiting the dialog first.
    - GET /me did work with the local mock
    - [ ] GET /me didn't work with the native sandbox server (galaxy.scalar.com), and returned a 401. I needed to use the POST /auth/token endpoint, then take `token` from that and put its contentså in the bearerAuth section of the Authorize dialog, before GET /me would work.

Step 9 instruction fragment
```
open the lock icon / Authorize dialog. Execute an authenticated operation like
GET /me against either the mock or a native sandbox server with no credential entered — it
succeeds automatically, because the "Authorize" dialog was already pre-filled with
mocking.defaultCredential's value on page load.
```

Step 9 native sandbox server response
```
{
  "error": "Unauthorized",
  "message": "Authentication is required to access this resource."
}
```
