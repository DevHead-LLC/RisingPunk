# Current Task: Network Line Adherence Enforcement

## Problem Statement
Battalions are moving directly to their targets rather than staying on network lines, especially during retargeting after neutral node capture. The retargeting system should use pathfinding to find a new target while also designing the path that the battalion should move on with the network.

## Root Cause Analysis
- **Initial movement**: Pathfinding is used, battalions move node-to-node ✅
- **Retargeting**: System calls `moveBattalionAlongPath` with new target but doesn't always reconstruct node-to-node paths ❌
- **Movement execution**: If `remainingPath` is not set, battalion moves directly to target position (off-network) ❌

## Design Requirements (from intended-battle-sequence.md)
- "Battalions must stay on network lines during movement and never leave the network structure"
- "Node-based pathfinding: When transferring between network lines, battalions move directly to the node position"
- "All movement must follow `NETWORK_CONNECTIONS` array"
- "When retargeting, battalions use `moveBattalionAlongPath()` to move toward their new target"

## Implementation Plan

### Batch 1: Pathfinding on Retarget ⏳
**Goal:** Ensure every retarget reconstructs a node-to-node path

**Files to Modify:**
- `mobile/src/hooks/useTargeting.ts` - `findNewTarget()` function
- `mobile/src/utils/targetValidation.ts` - `validateAndRetarget()` function
- `mobile/src/utils/movementMonitoring.ts` - `createMovementMonitoring()` function
- `mobile/src/hooks/useBattleCoordination.ts` - `moveBattalionAlongPath()` function

**Functions to Change:**
- `findNewTarget()` - Always reconstruct path when assigning new target
- `validateAndRetarget()` - Use pathfinding for retargeting, not direct movement
- `createMovementMonitoring()` - Ensure retargeting uses pathfinding
- `moveBattalionAlongPath()` - Always set up `remainingPath` and `finalTarget`

**Specific Changes:**
1. When a new target is assigned, determine battalion's current node
2. Reconstruct node-to-node path from current node to target's node using Dijkstra's
3. Set `remainingPath` and `finalTarget` for node-to-node traversal
4. Only after reaching final node, move to attack range intersection point

**Test Criteria:**
- **Primary:** Every retarget creates a new node-to-node path
- **Primary:** Battalions move through intermediate nodes, not directly to target
- **Primary:** `remainingPath` and `finalTarget` are always set for new targets
- **Baseline:** All existing pathfinding functionality is maintained

**Debug Logs to Add:**
- `console.log('Retarget pathfinding:', { battalionId, oldTarget, newTarget, path })`
- `console.log('Path reconstruction:', { startNode, endNode, path, remainingPath })`

### Batch 2: Enforce Path Adherence in Movement ⏳
**Goal:** Ensure all movement is along valid network segments

**Files to Modify:**
- `mobile/src/hooks/useMovement.ts` - Movement execution logic
- `mobile/src/utils/movementWrapper.ts` - Movement animation logic
- `mobile/src/hooks/usePathFollowing.ts` - Path following logic

**Functions to Change:**
- `handleMovementExecution()` - Validate movement is along network lines
- `executeMovementWithCleanup()` - Enforce path adherence during animation
- `handleBattalionPathFollowing()` - Ensure movement stays on current network segment

**Specific Changes:**
1. Only allow movement along current network segment (between two connected nodes)
2. If battalion is not on a node, snap to nearest valid network segment
3. Validate battalion position is always on or near a network line
4. Prevent direct movement to arbitrary positions off the network

**Test Criteria:**
- **Primary:** All movement is along valid network segments
- **Primary:** Battalion positions never deviate from network lines
- **Primary:** Invalid movement is prevented and logged
- **Baseline:** Movement speed and animation quality is maintained

**Debug Logs to Add:**
- `console.log('Movement validation:', { battalionPos, nearestLine, distance, isValid })`
- `console.log('Network snap:', { oldPos, newPos, nearestNode })`

### Batch 3: Add Validation and Debug Logging ⏳
**Goal:** Comprehensive validation and logging of network adherence

**Files to Modify:**
- `mobile/src/utils/pathfinding.ts` - Add validation utilities
- `mobile/src/hooks/useMovement.ts` - Add validation checks
- `mobile/src/utils/battleUtils.ts` - Add movement validation

**Functions to Change:**
- `validateBattalionPath()` - Enhanced validation for all movement
- `findNearestNetworkLine()` - Use for position validation
- `validateBattalionAndTarget()` - Add network adherence checks

**Specific Changes:**
1. Add validation before and during movement using `validateBattalionPath`
2. Use `findNearestNetworkLine` to validate battalion positions
3. Add comprehensive debug logging for network adherence
4. Log errors if battalion is ever off-network

**Test Criteria:**
- **Primary:** All movement is validated for network adherence
- **Primary:** Off-network positions are detected and logged
- **Primary:** Debug logs provide clear information about network adherence
- **Baseline:** Performance is not significantly impacted

**Debug Logs to Add:**
- `console.log('Network line adherence:', { battalionPos, nearestLine, distance })`
- `console.log('Path validation:', { path, isValid, violations })`
- `console.log('Position validation:', { position, onNetwork, distance })`

### Batch 4: Manual and Automated Testing ⏳
**Goal:** Comprehensive testing of all movement scenarios

**Test Scenarios:**
1. **Initial movement** - Battalions move to neutral nodes along network lines
2. **Retargeting after node capture** - Battalions find new targets using pathfinding
3. **Retargeting after battalion destruction** - Battalions retarget using pathfinding
4. **Moving target handling** - Battalions follow moving targets along network lines
5. **Complex pathfinding** - Multi-node traversal for distant targets
6. **Edge cases** - No valid paths, invalid targets, etc.

**Manual Testing:**
- Visual confirmation that battalions never move off network lines
- Console log verification for all debug messages
- Performance testing to ensure no significant slowdown

**Automated Testing:**
- Unit tests for all validation functions
- Integration tests for complete movement flows
- Regression tests to ensure existing functionality is maintained

## Success Criteria
- **All movement follows network lines** - No direct movement between non-connected nodes
- **Pathfinding used for all retargeting** - Every new target gets a reconstructed path
- **Comprehensive validation** - All movement is validated for network adherence
- **Clear debug logging** - Easy to verify network adherence via console logs
- **No performance regression** - Movement remains smooth and responsive

## Known Dependencies
- **Step 4.4 dependency:** Complex pathfinding must be working (✅ completed)
- **Step 3.2 dependency:** Network line validation must be implemented
- **Step 4.2 dependency:** Movement monitoring must be working

## Notes for Implementation
- Focus on small batches that can be tested independently
- Preserve existing functionality while adding network adherence
- Use debug logs to verify each step is working correctly
- Test thoroughly after each batch to catch issues early
- Ensure all movement scenarios are covered (initial, retargeting, moving targets, etc.)

## Next Steps
1. Start with Batch 1: Pathfinding on Retarget
2. Test thoroughly after Batch 1 completion
3. Proceed to Batch 2: Enforce Path Adherence in Movement
4. Continue through all batches with testing between each
5. Final validation that all movement stays on network lines 