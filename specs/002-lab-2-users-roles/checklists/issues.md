# Issues

# Run 1 - 20260608

Verification — Step 3

- [x] "After signing in, look at the user profile area in the top-right of the Backstage UI.". There is no user profile area in the top-right. I ended up clicking on the settings icon in the bottom left, which then showed me my profile. — Fixed (2026-06-10): Step 3 verification now says "Click the Settings icon in the bottom-left sidebar"; Step 3b sign-in instructions updated to remove "user icon in the top-right corner" reference.

# Run 2

Verification — Step 2

- [x] "Click Train Travel API → verify the Owner field shows platform-team and the Annotations section includes example.com/visibility: shared" - this annotation is not well known and is not currently visible in the UI — Fixed (2026-06-11, revised): Initial fix added `shared`/`private` tags as the primary display mechanism. Revised fix (2026-06-11, FR-011 refinement): tags removed — FR-011 explicitly prohibits a secondary copy (tag) that mirrors the policy field. The `example.com/visibility` annotation is now the single source of truth. Verification steps updated to direct learners to the Backstage Annotations section. A "Where are the Annotations?" guidance note added to Step 2 verification.