# Issues

## Run 1 - 20260608

Verification — Step 3

- [x] "After signing in, look at the user profile area in the top-right of the Backstage UI.". There is no user profile area in the top-right. I ended up clicking on the settings icon in the bottom left, which then showed me my profile. — Fixed (2026-06-10): Step 3 verification now says "Click the Settings icon in the bottom-left sidebar"; Step 3b sign-in instructions updated to remove "user icon in the top-right corner" reference.

## Run 2

Verification — Step 2

- [x] "Click Train Travel API → verify the Owner field shows platform-team and the Annotations section includes example.com/visibility: shared" - this annotation is not well known and is not currently visible in the UI — Fixed (2026-06-11, revised): Initial fix added `shared`/`private` tags as the primary display mechanism. Revised fix (2026-06-11, FR-011 refinement): tags removed — FR-011 explicitly prohibits a secondary copy (tag) that mirrors the policy field. The `example.com/visibility` annotation is now the single source of truth. Verification steps updated to direct learners to the Backstage Annotations section. A "Where are the Annotations?" guidance note added to Step 2 verification.

## Run 3

Summary Checklist

- [x] The following steps all fail, as the visibility annotation is not shown. It also isn't clear where to expect the annotations to be visibile:

 Museum API shows museum-team as owner and example.com/visibility: private in Annotations
 Streetlights API shows streetlights-team as owner and example.com/visibility: private in Annotations
 Train Travel API shows platform-team as owner and example.com/visibility: shared in Annotations

 Fixed (2026-06-11): EntityCardBlueprint module added — a custom "API Visibility" card now appears on every API entity page, reading the `example.com/visibility` annotation directly from the entity object. Card visible without extra navigation (SC-007). No secondary copy (FR-011). Checklist items updated to reference the API Visibility card instead of the Annotations section.

 ## Run 4

 Verification — Step 2

- [ ] The following statement about API Visibility location is correct. It currently shows at the very bottom of the page, under the main content. I want it to display either within or immediately below the About card, as this statement indicates.

 Where is the API Visibility card? The card appears on the right-hand side of the API entity detail page, typically below the About card.