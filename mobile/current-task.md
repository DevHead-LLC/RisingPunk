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

### 1. Battalion ID Format Mismatch
**Issue**: Changed battalion ref keys from `user-${battalion.nodeIndex}` to `user-${battalion.type}-${index}` but movement logic may still be using old format
**Impact**: Battalion refs not found, attack animations and damage effects may not work
**Files Affected**: 
- `BattleUnits.tsx` - Changed ref key format
- `useBattleMovementAndAttacks.ts` - May still reference old format in attack logic

### 2. Target Validation Logic Broken
**Issue**: Path-based movement may have broken the target validation that prevents targeting captured nodes
**Impact**: Battalions continue moving toward already captured nodes instead of finding new targets
**Evidence**: Logs show "No valid targets found" but battalions still move to captured nodes
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Modified `moveBattalionAlongPath` function

### 3. Network Line Movement Not Implemented ✅ TESTED
**Issue**: Path-based movement calculates paths but doesn't actually move battalions along network lines
**Impact**: Battalions move in straight lines instead of following network connections
**Evidence**: Movement logs show path calculation but visual movement is off-network
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - `moveBattalionAlongPath` moves to node coordinates directly
**Status**: Minimal test implemented - using first step of calculated path for node targets

### 4. Battalion Index Finding Logic
**Issue**: Using `findIndex(b => b === battalion)` may not work reliably if battalion objects are recreated
**Impact**: Wrong battalion IDs generated, causing ref mismatches and broken functionality
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Modified battalion ID generation in multiple functions

### 5. Path Following Logic Incomplete
**Issue**: Path calculation works but actual movement doesn't follow the calculated path segments
**Impact**: Battalions jump between nodes instead of moving smoothly along network lines
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - `moveBattalionAlongPath` needs to move segment by segment

### 6. Removed Critical Target Validation Logic
**Issue**: Removed the original target validation that checked `node.controlState !== 'neutral'` before movement
**Impact**: Battalions move toward captured nodes because validation only happens after reaching the node
**Evidence**: Old code had validation before movement, new code only validates after reaching target
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Removed pre-movement target validation

### 7. Removed Range-Based Movement Logic
**Issue**: Removed the original logic that calculated optimal attack range positions and movement distances
**Impact**: Battalions move directly to node centers instead of stopping at attack range
**Evidence**: Old code had `moveDistance = Math.max(0, distance - range)` logic
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Removed range calculation and optimal positioning

### 8. Removed Pre-Movement Attack Range Checks
**Issue**: Removed the original logic that checked if battalion was already in range before moving
**Impact**: Battalions may move unnecessarily when already in attack range
**Evidence**: Old code had `if (distance <= range)` checks before movement
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Removed pre-movement range validation

### 9. Battalion vs Node Targeting Logic Confusion
**Issue**: Path-based movement treats all targets as nodes, but original logic distinguished between node and battalion targets
**Impact**: Battalion vs battalion combat may not work correctly
**Evidence**: Old code had separate logic for `target.type === 'node'` vs `target.type === 'battalion'`
**Files Affected**: 
- `useBattleMovementAndAttacks.ts` - Simplified targeting logic may break battalion combat

