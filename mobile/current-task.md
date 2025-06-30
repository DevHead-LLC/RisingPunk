# ControlState to Array-Based Node Ownership Refactor

**NOTE: For the latest architectural decisions and action items, see recent-assessment.md.**

**NOTE: User will manually run and test all changes. AI will not execute any commands. User will report logs and visual verification results.**

## Overview
Replace the current `controlState` property system with simple arrays for node ownership tracking. This eliminates redundant checks, improves performance, and centralizes node ownership logic.

## Current Issues
- 15+ redundant `controlState !== 'neutral'` checks across files
- O(n) array filtering operations during battle
- Logic duplication in node capture handling
- Complex state management with multiple sources of truth
- Type safety issues with string comparisons

## Target Architecture
```typescript
// Replace controlState with arrays
const neutralNodes = [3, 4, 5];  // Start with middle nodes
const userNodes = [0, 1, 2];     // Fixed user nodes  
const enemyNodes = [6, 7, 8];    // Fixed enemy nodes

// Simple utility functions
const isNeutral = (nodeIndex: number) => neutralNodes.includes(nodeIndex);
const isUserControlled = (nodeIndex: number) => userNodes.includes(nodeIndex);
const isEnemyControlled = (nodeIndex: number) => enemyNodes.includes(nodeIndex);
```

## Phase 1: Create New Node Ownership System
**Goal**: Add new array-based system alongside existing controlState (no breaking changes)

### Changes:
1. **Create utility functions** in new file `src/utils/nodeOwnership.ts`
   - `isNeutral(nodeIndex)`, `isUserControlled(nodeIndex)`, `isEnemyControlled(nodeIndex)`
   - `captureNode(nodeIndex, newOwner)`
   - `getNodeOwner(nodeIndex)`

2. **Add logging** to verify function behavior
   - Log when nodes are captured
   - Log current neutral nodes array

### Test:
- Verify utility functions return correct ownership status
- Verify capture function moves nodes between arrays correctly
- Check logs show expected behavior

## Phase 2: Update Targeting Logic
**Goal**: Replace controlState checks in targeting functions with new utility functions

### Changes:
1. **Update `useTargeting.ts`**
   - Replace `node.controlState !== 'neutral'` with `!isNeutral(index)`
   - Replace `node.controlState === 'neutral'` with `isNeutral(index)`
   - Update `handleNodeCapture` to use new capture function

2. **Add logging** to verify targeting behavior
   - Log when targets are filtered out
   - Log available targets found

### Test:
- Verify battalions only target neutral nodes
- Verify targeting stops when node is captured
- Check logs show correct targeting decisions

## Phase 3: Update Movement Logic
**Goal**: Replace controlState checks in movement validation

### Changes:
1. **Update `useMovement.ts`**
   - Replace all `node.controlState !== 'neutral'` checks with `!isNeutral(index)`
   - Update movement validation functions

2. **Add logging** to verify movement behavior
   - Log when movement is blocked due to node ownership
   - Log path validation results

### Test:
- Verify battalions can't move to controlled nodes
- Verify pathfinding respects node ownership
- Check logs show correct movement decisions

## Phase 4: Update Combat Logic
**Goal**: Replace controlState checks in attack setup

### Changes:
1. **Update `useCombat.ts`**
   - Replace `node.controlState !== 'neutral'` with `!isNeutral(index)`
   - Update `setupNewNodeAttack` validation

2. **Update `useBattleEngine.ts`**
   - Replace controlState checks in `setupNodeAttack`
   - Update `selectTargetNode` function

3. **Add logging** to verify combat behavior
   - Log when attacks are stopped due to node capture
   - Log retargeting decisions

### Test:
- Verify attacks stop when node is captured
- Verify retargeting works correctly
- Check logs show correct combat decisions

## Phase 5: Update Visual Components
**Goal**: Replace controlState-based rendering with array-based logic

### Changes:
1. **Update `NetworkNode.tsx`**
   - Replace controlState prop with nodeIndex prop
   - Use utility functions for color/state determination

2. **Update `BattleNetwork.tsx`**
   - Pass nodeIndex instead of controlState
   - Update node rendering logic

3. **Add logging** to verify visual behavior
   - Log node color changes
   - Log capture visual updates

### Test:
- Verify nodes display correct colors
- Verify capture animations work
- Check logs show correct visual updates

## Phase 6: Update Battle Screen Logic
**Goal**: Replace controlState in main battle coordination

### Changes:
1. **Update `BattleScreen.tsx`**
   - Replace controlState checks with utility functions
   - Update `handleNodeControlChange`
   - Remove `controlledNodes` state (use arrays instead)

2. **Update `useBattleControl.ts`**
   - Replace controlState-based logic with array-based logic
   - Update victory condition checking

3. **Add logging** to verify battle coordination
   - Log node capture events
   - Log victory condition checks

### Test:
- Verify node captures work correctly
- Verify victory conditions trigger properly
- Check logs show correct battle flow

## Phase 7: Clean Up and Remove Old System
**Goal**: Remove all controlState references and clean up

### Changes:
1. **Remove controlState from types**
   - Update `BattleNode` interface
   - Remove controlState from node initialization

2. **Remove old utility functions**
   - Clean up any remaining controlState references
   - Remove unused imports

3. **Remove logging**
   - Clean up all debug logs added during refactor

### Test:
- Verify all functionality still works
- Verify no console errors
- Verify performance improvement

## Success Criteria
- All 15+ controlState checks replaced with array-based logic
- Performance improvement (no more O(n) filtering)
- Single source of truth for node ownership
- No breaking changes to battle functionality
- Clean, maintainable codebase

## Notes
- Each phase should be tested independently
- Logs will be added and removed as we progress
- User will manually verify each phase before proceeding
- Focus only on controlState refactor - no other changes 