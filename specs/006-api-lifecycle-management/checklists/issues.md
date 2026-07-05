## Run 1 - 2026/07/05

- [ ] Step 4 verification failed at the following steps:

```markdown
- A `museum-api` `System` entity exists, listing both as "Has part" APIs, even though no
  `system.yaml` was ever authored — it was synthesized from both specs' matching
  `x-examplecorp.apiBasename: museum-api`.
- Opening either version's page shows the new "API Versions" card, listing both versions with
  working links between them, and `museum-api-v2` flagged **Latest** (computed from each spec's
  `info.version`, `1.0.0` vs. `2.0.0`).
```