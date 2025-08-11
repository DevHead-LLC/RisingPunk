### CURRENT TASK: Shared Map — User Home Locations

Scope
- Set up and display per-user home locations on a single shared map. Remove unrelated work; focus solely on the five goals below.

Goals
1) Find/assign a location on the shared map for each user profile; everyone sees the same map and updates.
2) When the current user opens the map, center on their home if possible (respect map clamping). Do not change the view when returning from a battle (previous pan is preserved).
3) Visual styling: current user’s home has a blue background; other users’ homes have a gray background. This must not affect other map piece backgrounds.
4) All users’ homes use the same home image. No NPCs use this image.
5) Each user’s home label shows their handle (not "You").

Users to show (handles)
- BertToast
- IronLedger
- VioletVector
- NeonStrider
- CipherBloom
- SplatRat17

Authorities & constraints
- Server is the source of truth for user identities and home placement; map data should reference `userId` and resolve handle server-side or via a dedicated field. Client renders only.
- Do not modify battle systems or unrelated screens.
- Keep a single source of truth; avoid duplicating user/handle data on the client.

Step-by-step plan (manual verify after each step)
1) Server map data
- Ensure each active user has exactly one home cell in the shared map data, tied to `userId` and handle, and using the shared home image; no NPC uses this image.
- Manual check: map data includes entries for all six handles with `userId` present and a consistent home image reference.

2) Client rendering (labels and backgrounds)
- Render homes for all users. Label = handle. Background = blue for current user, gray for others. Do not impact other map piece backgrounds.
- Manual check: on the map, current user’s home shows blue; others show gray; labels match handles and never display "You".

3) Initial centering behavior
- When navigating into the map (e.g., from Hack Rig), center on the current user’s home within clamp limits. When returning from a battle, restore the prior pan and do not recenter.
- Manual check: fresh map entry centers on the user home; returning from battle preserves the prior view.

4) Shared home image
- Confirm a single image asset is used for all user homes and that NPCs do not reference it.
- Manual check: inspect assets and rendered homes; NPCs never display the home image.

5) Handle display correctness
- Ensure labels use each user’s handle resolved from server data; remove or bypass any "You" label logic for homes.
- Manual check: all homes display handles exactly as listed above.

Next action
- Start with Step 1 (server map data for user homes), then pause for your manual verification before proceeding to Step 2.
