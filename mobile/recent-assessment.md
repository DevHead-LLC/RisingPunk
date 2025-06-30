# Recent Assessment: Node Ownership, Targeting, and Capture Logic

## Purpose (AI/Assistant Context)
This file is for the AI (assistant) to:
- Maintain up-to-date, relevant context and alignment with the user's goals.
- Serve as a single source of truth for architectural decisions and action items.
- Be pruned and updated for clarity and relevance with every change, removing outdated or unused content.
- Ensure that, even when starting from zero context, the AI can immediately get back on track and understand the current state, goals, and next steps.

---

## Current Focus (as of latest user direction)
- **Primary goal:** Ensure the `neutralNodes` array is the only source of truth for node capture/targeting.
- Only nodes 3, 4, and 5 should ever be in the `neutralNodes` array and be valid for capture.
- User nodes (0, 1, 2) and enemy nodes (6, 7, 8) are never valid capture/attack targets and should never be included in any target list for node capture.
- Once a neutral node is captured, it must be removed from the `neutralNodes` array and never targeted again.
- Battalion retargeting for nodes must only consider the current `neutralNodes` array. After all neutral nodes are captured, battalions may target enemy battalions directly.
- User/enemy nodes are valid for movement transitions (network pathfinding), but never for attack/capture.

---

## Current State (as of last review)
- **Node ownership utilities (`nodeOwnership.ts`) are fully implemented and correct.**
- **Targeting and movement logic (`useTargeting.ts`, `useMovement.ts`) are fully migrated to the new utilities.**
- **Visual components (`BattleNetwork.tsx`, `NetworkNode.tsx`) are now fully migrated to use the new array-based system.**
- **Battle screen logic (`BattleScreen.tsx`, `useBattleControl.ts`) is being migrated to use the new array-based system (Phase 6 in progress).**
- **Combat logic is mostly migrated, but some hooks (`useBattleEngine.ts`) still use legacy `controlState` checks.**
- **Type definitions (`BattleNode` in `types/battle.ts`) still include `controlState` for legacy compatibility.**
- **Fixed battalion-to-battalion targeting issue** - Movement logic was incorrectly blocking battalion attacks when all neutral nodes were captured.

---

## Recent Fixes
- **Battalion-to-battalion targeting**: Fixed `handleNodePathCalculation` in `useMovement.ts` to only check `isNeutral()` for actual node targets, not battalion targets. This allows battalions to properly retarget enemy battalions after all neutral nodes are captured.
- **Battalion path following**: Fixed `handleBattalionPathFollowing` in `useMovement.ts` to preserve the original target type (`battalion` or `node`) when creating intermediate movement targets, instead of hardcoding `type: 'node'`. This prevents battalion targets from being incorrectly treated as node targets during path following.

---

## Next Step (Phase 6: Battle Screen Logic - In Progress)
- **Update `BattleScreen.tsx`:**
  - Replace controlState checks with utility functions
  - Update `handleNodeControlChange`
  - Remove `controlledNodes` state (use arrays instead)
- **Update `useBattleControl.ts`:**
  - Replace controlState-based logic with array-based logic
  - Update victory condition checking

---

## Action Items
- [x] Core logic (targeting, movement, capture) migrated to array-based system.
- [x] Visual layer (BattleNetwork, NetworkNode) migrated to array-based system.
- [ ] Battle screen logic migrated to array-based system (**in progress**).
- [ ] Remove legacy `controlState` from hooks and types (Phase 7).

---

**Referenced by:**
- current-task.md
- battle-sequence.md 