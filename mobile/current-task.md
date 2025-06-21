# Active Task

- Pathfinder Movement Logic
- **Current Focus**: Testing minimal path-based movement changes to identify issues

## Associated Logic

- Battalion movement and targeting logic
- Animation system for battalion movement along network paths
- Pathfinding algorithm for calculating shortest routes between nodes
- Network node connections and routing
- Battalion position tracking and updates

## Associated Code

- `useBattleMovementAndAttacks.ts` - Battalion movement and targeting logic - See [useBattleMovementAndAttacks.ts](src/hooks/useBattleMovementAndAttacks.ts)
- `AnimatedBattalion.tsx` - Animation system for battalion movement - See [AnimatedBattalion.tsx](src/components/battle/AnimatedBattalion.tsx)
- `pathfinding.ts` - Pathfinding algorithm for network routes - See [pathfinding.ts](src/utils/pathfinding.ts)
- `networkConstants.ts` - Network node connections and routing data - See [networkConstants.ts](src/utils/networkConstants.ts)
- `BattleUnits.tsx` - Battalion position tracking and rendering - See [BattleUnits.tsx](src/components/battle/BattleUnits.tsx)

## Blocking Logic

- None identified yet - pathfinder logic is currently working

## Code Cleanup

- None identified yet

## Potential Problems

### 1. Battalion ID Format Mismatch ✅ FIXED & TESTED
**Issue**: Changed battalion ref keys from `user-${battalion.nodeIndex}` to `user-${battalion.type}-${index}` but movement logic may still be using old format
**Impact**: Battalion refs not found, attack animations and damage effects may not work
**Files Affected**: 
- `BattleUnits.tsx` - Changed ref key format
- `useBattleMovementAndAttacks.ts` - May still reference old format in attack logic
**Status**: Fixed & Tested - Using array index for battalion ID generation to match ref key format. Logs show consistent IDs like `user-breacher-0`, `user-guardian-1`, etc.

### 2. Target Validation Logic Broken ✅ TESTED
**Issue**: Path-based movement may have broken the target validation that prevents targeting captured nodes
**Impact**: Battalions continue moving toward already captured nodes instead of finding new targets
**Evidence**: Logs show "No valid targets found" but battalions still move to captured nodes
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Modified `moveBattalionAlongPath` function
**Status**: Minimal test implemented - checking target node state before movement for node targets

### 3. Network Line Movement Not Implemented ✅ TESTED
**Issue**: Path-based movement calculates paths but doesn't actually move battalions along network lines
**Impact**: Battalions move in straight lines instead of following network connections
**Evidence**: Movement logs show path calculation but visual movement is off-network
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - `moveBattalionAlongPath` moves to node coordinates directly
**Status**: Minimal test implemented - using first step of calculated path for node targets

### 4. Battalion Index Finding Logic ✅ TESTED
**Issue**: Using `findIndex(b => b === battalion)` may not work reliably if battalion objects are recreated
**Impact**: Wrong battalion IDs generated, causing ref mismatches and broken functionality
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Modified battalion ID generation in multiple functions
**Status**: Tested - Battalion ID generation using findIndex is working correctly. Logs show consistent IDs and no ref errors.

### 5. Path Following Logic Incomplete ✅ TESTED
**Issue**: Path calculation works but actual movement doesn't follow the calculated path segments
**Impact**: Battalions jump between nodes instead of moving smoothly along network lines
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - `moveBattalionAlongPath` needs to move segment by segment
**Status**: Minimal test implemented - path following logic with remainingPath and finalTarget properties

### 6. Removed Critical Target Validation Logic ✅ TESTED
**Issue**: Removed the original target validation that checked `node.controlState !== 'neutral'` before movement
**Impact**: Battalions move toward captured nodes because validation only happens after reaching the node
**Evidence**: Old code had validation before movement, new code only validates after reaching target
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Removed pre-movement target validation
**Status**: Tested - Added minimal pre-movement target validation test. No validation errors in logs, battalions properly retarget when nodes are captured.

### 7. Removed Range-Based Movement Logic ✅ TESTED
**Issue**: Removed the original logic that calculated optimal attack range positions and movement distances
**Impact**: Battalions move directly to node centers instead of stopping at attack range
**Evidence**: Old code had `moveDistance = Math.max(0, distance - range)` logic
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Removed range calculation and optimal positioning
**Status**: Tested - Added minimal range-based movement test. Logs show proper range calculations: distance=103.0, range=75.0, moveDistance=28.0. Battalions now stop at attack range instead of node centers.

### 8. Removed Pre-Movement Attack Range Checks ✅ TESTED
**Issue**: Removed the original logic that checked if battalion was already in range before moving
**Impact**: Battalions may move unnecessarily when already in attack range
**Evidence**: Old code had `if (distance <= range)` checks before movement
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Removed pre-movement range validation
**Status**: Tested - Added minimal pre-movement range check test. Logs show battalions starting attacks immediately when in range: "Already in range (135.0 <= 135.0), starting attacks immediately". No unnecessary movement when already positioned correctly.

### 9. Battalion vs Node Targeting Logic Confusion ✅ TESTED
**Issue**: Path-based movement treats all targets as nodes, but original logic distinguished between node and battalion targets
**Impact**: Battalion vs battalion combat may not work correctly
**Evidence**: Old code had separate logic for `target.type === 'node'` vs `target.type === 'battalion'`
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Simplified targeting logic may break battalion combat
**Status**: Tested - Added minimal battalion targeting test. Logs show battalion targeting working correctly: "[Battalion Targeting] enemy-phreak-2 - Moving directly to enemy battalion 1 at position (313.2, 256.9)". Battalion vs battalion combat is functioning properly with direct movement to target positions.

