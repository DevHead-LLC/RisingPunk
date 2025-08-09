### CURRENT TASK: Seamless battle return, unlock gating, and map windowing fix

### Objectives
- Preserve the previous screen and view when entering/exiting battles (no app reset/reload to Turf Screen).
- Only the Hack Rig unlock battle should set `unlockedFeatures.hackRig = true`; map NPC battles must never trigger unlocks.
- Fix map panning black patches by expanding the windowed tile loading and ensuring a final fill on finger-up.

### Constraints
- Follow `intended.md` behaviors and keep a single authority for battle outcomes on the **server**.
- Do not introduce duplicate sources of truth; keep navigation state minimal and consistent.

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

### Deliverables
- Navigation: `returnContext` plumbed through battle entry/exit; restored Home/Map state on return.
- Server: `unlockHackRigOnWin` respected; unlock only on hack rig battle.
- Map: smoother panning with no residual black patches; tiles fill on finger-up.
- Map NPCs: defeated NPCs are removed and respawn after `mapRecoverySeconds` (L1=5m, L2=10m, L3=15m).
