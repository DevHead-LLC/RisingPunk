# Complete Refactor Plan: Eliminate useBattleMovementAndAttacks.ts

## Goal
Move ALL logic from `useBattleMovementAndAttacks.ts` into specialized hooks and delete the file entirely.

## Current State Analysis
The file currently contains:
- **Refs & State Management**: battalionRefs, attackIntervals, nodeRefs, battleInitializedRef, battalionsRef, nodesRef, retargetCooldowns, recentlyCapturedNodes, findAvailableTargetsRef
- **Main Logic**: moveBattalionAlongPath (already mostly extracted)
- **Combat Logic**: setupBattalionAttacks (partially extracted)
- **Node Capture Logic**: handleNodeCapture, retargetAllBattalions
- **Debug Logic**: debugLog, DEBUG_BATTLE flag
- **Constants**: ATTACK_DELAY, CAPTURE_MEMORY_DURATION
- **useEffect hooks**: for ref updates

## Target Distribution

### 1. useBattalionRefsAndState.ts
**Move to this file:**
- All refs: battalionRefs, attackIntervals, nodeRefs, battleInitializedRef, battalionsRef, nodesRef, retargetCooldowns, recentlyCapturedNodes, findAvailableTargetsRef
- Constants: ATTACK_DELAY, CAPTURE_MEMORY_DURATION
- Debug logic: debugLog, DEBUG_BATTLE flag
- useEffect hooks for ref updates
- Return all refs and state management functions

### 2. useCombat.ts
**Move to this file:**
- setupBattalionAttacks function (already partially extracted)
- Any remaining combat-related logic

### 3. useMovement.ts
**Already contains:**
- moveBattalionAlongPath logic (already extracted)
- Movement validation and execution

### 4. useTargeting.ts
**Move to this file:**
- handleNodeCapture function
- retargetAllBattalions function
- Node capture and retargeting logic

### 5. useBattleEngine.ts
**Already contains:**
- memoizedCalculations
- Battle calculations and stats

## Step-by-Step Plan

### Phase 1: Move Refs & State Management
1. **Move all refs to useBattalionRefsAndState.ts**
   - Add all refs as exports
   - Move constants (ATTACK_DELAY, CAPTURE_MEMORY_DURATION)
   - Move debug logic (debugLog, DEBUG_BATTLE)
   - Move useEffect hooks for ref updates

2. **Update useBattalionRefsAndState.ts exports**
   - Export all refs and state management functions
   - Export constants and debug utilities

### Phase 2: Move Combat Logic
3. **Complete setupBattalionAttacks extraction**
   - Move remaining parts to useCombat.ts
   - Ensure all combat logic is centralized

### Phase 3: Move Targeting Logic
4. **Move node capture logic to useTargeting.ts**
   - Move handleNodeCapture function
   - Move retargetAllBattalions function
   - Update useTargeting.ts to handle node capture events

### Phase 4: Update All Imports
5. **Update all files that import useBattleMovementAndAttacks**
   - Update BattleScreen.tsx
   - Update any other files using this hook
   - Import from appropriate specialized hooks instead

### Phase 5: Delete File
6. **Delete useBattleMovementAndAttacks.ts entirely**
   - Verify all functionality is preserved
   - Confirm no broken imports remain

## Expected Result
- `useBattleMovementAndAttacks.ts` is completely deleted
- All logic is properly distributed to specialized hooks
- Clean separation of concerns:
  - **useBattalionRefsAndState.ts**: Refs, state, constants, debug
  - **useCombat.ts**: Combat logic, attacks, damage
  - **useMovement.ts**: Movement logic, pathfinding
  - **useTargeting.ts**: Targeting logic, node capture, retargeting
  - **useBattleEngine.ts**: Battle calculations, stats, memoization

## Benefits
- Eliminates the monolithic hook
- Clear separation of concerns
- Easier to test individual pieces
- More maintainable and modular codebase
- Follows single responsibility principle