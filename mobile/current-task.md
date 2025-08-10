### CURRENT TASK: Seamless battle return, unlock gating, map windowing, and NPC respawn isolation

Progress
- Added server test `server/__tests__/npcInstanceIsolation.test.ts` verifying map route preserves live NPC state (no reseed on count change).
- Added skipped placeholders for `npcInstanceId` behaviors to drive next implementation without breaking current suite.

### Objectives
- Preserve the previous screen and view when entering/exiting battles (no app reset/reload to Turf Screen).
- Only the Hack Rig unlock battle should set `unlockedFeatures.hackRig = true`; map NPC battles must never trigger unlocks.
- Fix map panning black patches by expanding the windowed tile loading and ensuring a final fill on finger-up.
- Fix NPC defeat/respawn so defeating a single instance affects only that one instance and it respawns after its `mapRecoverySeconds`.
- Clamp map panning to grid bounds so the red edge stays within the viewport and users cannot pan into the black void.

### Constraints
- Follow `intended.md` behaviors and keep a single authority for battle outcomes on the **server**.
- Do not introduce duplicate sources of truth; keep navigation state minimal and consistent.
- Use existing authorities first. Map occupancy and NPC lifecycle remain on the **server**; the client only renders and requests actions.

### Plan (step-by-step)
1) Navigation return context (no map/home reset)
- Capture a lightweight `returnContext` when starting any battle: `{ origin: 'hackRig' | 'map', mapPan?: { x, y } }`.
- When user taps Continue on battle end, navigate to `returnContext.origin`:
  - origin = 'hackRig' → return to HomeScreen (Hack Rig view) without re-centering.
  - origin = 'map' → return to HackMapScreen and restore `mapPan` to the saved pan offset (skip any initial centerView effects).
- Ensure screens do not remount or reinitialize state unnecessarily when returning from battle (skip side-effect initializers if `returnContext` is present).

2) Hack Rig unlock gating (server authority)
- Add a boolean flag to the start-battle payload: `unlockHackRigOnWin` (true only for the hack rig flow).
- Server checks this flag before calling the unlock logic; map NPC battles omit/false.
- Keep existing winner/endCondition checks; do not double-unlock if already true.

3) Map windowing/black patch fix
- Increase prefetch window: raise base buffer and velocity lead so more tiles mount while panning.
- On pan release (finger up), run a final `computeWindow()` and synchronous view fill to eliminate visible black cells.
- Ensure the pooled tile count (`poolSize`) always meets or exceeds the current visible tile count + buffer.
- Keep the grid shell always mounted (already) and avoid tearing by preventing premature unmounts inside the window.

4) Map NPC defeat and timed respawn (server authority)
- When an NPC on the map is defeated, remove it from the map database state immediately (cell becomes unoccupied) and schedule respawn after its `mapRecoverySeconds`:
  - Level 1: 300s (5 minutes)
  - Level 2: 600s (10 minutes)
  - Level 3: 900s (15 minutes)
- Respawn by placing the same `npcSlug` at a valid random cell (non-water/mountain, unoccupied), updating map cells only (no full map rebuild).
- Ensure no duplicate concurrent spawns for the same scheduled NPC; enforce single active instance per `npcSlug` spawn event.

5) NPC instance isolation (multiple of the same slug)
- Problem: multiple map entities share the same `npcSlug` (e.g., `npc-small-corporation`). Defeating one should not affect the others.
- Add `npcInstanceId: string` to map cells that contain an NPC. Generate a UUID when placing each NPC on the map.
- Include `npcInstanceId` in the map API response and in the client’s "Hack Entity" start-battle payload.
- Extend battle creation and the `Battle` model to carry `defenderNpcInstanceId` alongside `defenderNpcSlug`.
- Update `NPCRespawnService` to:
  - Clear only the cell matching `npcInstanceId` (not all cells with the same slug).
  - Schedule respawn keyed by `mapName:npcInstanceId` to avoid dedup collisions across instances.
  - Respawn exactly one entity for that `npcInstanceId`, preserving the instance identity across cycles.
- Ensure `routes/map.ts` no longer rebuilds/reseeds NPCs when counts change; it must preserve live state and only return what the DB has.

6) Map pan clamping (no black void)
- Compute dynamic pan bounds using container size, total grid size, and margin: 
  - `minX = -(totalSize + 2*MARGIN_SIZE - containerWidth)`, `maxX = 0`.
  - `minY = -(totalSize + 2*MARGIN_SIZE - containerHeight)`, `maxY = 0`.
- During `onUpdate`, apply clamped values `clamp(x, minX, maxX)` and `clamp(y, minY, maxY)` to `offsetX/offsetY`.
- During `onEnd`, apply decay and then snap to bounds with a final clamp (or spring) so the red edge stays aligned with the viewport, allowing minimal elastic feel without exposing the void.

### Deliverables
- Navigation: `returnContext` plumbed through battle entry/exit; restored Home/Map state on return.
- Server: `unlockHackRigOnWin` respected; unlock only on hack rig battle.
- Map: smoother panning with no residual black patches; tiles fill on finger-up.
- Map NPCs: defeating one instance affects only that instance; it disappears immediately and respawns after `mapRecoverySeconds`.
- Map panning is clamped to bounds; users cannot pan into the black void beyond the red edge.
