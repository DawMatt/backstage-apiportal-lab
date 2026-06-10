# Issues

# Run 1 - 20260608

Verification — Step 3

- [x] "After signing in, look at the user profile area in the top-right of the Backstage UI.". There is no user profile area in the top-right. I ended up clicking on the settings icon in the bottom left, which then showed me my profile. — Fixed (2026-06-10): Step 3 verification now says "Click the Settings icon in the bottom-left sidebar"; Step 3b sign-in instructions updated to remove "user icon in the top-right corner" reference.

# Run 2

Verification — Step 2

- [x] "Click Train Travel API → verify the Owner field shows platform-team and the Annotations section includes example.com/visibility: shared" - this annotation is not well known and is not currently visible in the UI — Fixed (2026-06-11): All three API descriptors now carry both an `example.com/visibility` annotation AND a corresponding `shared` or `private` tag. Tags are prominently displayed in Backstage's About card. Step 2 verification updated to check the Tags section (not Annotations). Summary Checklist updated accordingly. The annotation is retained for the permission policy; the tag makes visibility immediately visible in the UI.