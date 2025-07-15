# Step 13: Battalion Retargeting After Node Capture

## User Experience Behavior
- When a neutral node is captured (progress reaches ±100%), all battalions attacking that node immediately stop attacking
- Battalions automatically scan for new available targets (remaining neutral nodes or enemy battalions)
- **Proximity-based targeting**: Battalions select the closest available target via network pathfinding with no preference between neutral nodes and enemy battalions
- **Neutral node targeting**: Remaining neutral nodes always use tug-of-war system until captured, then become unavailable for targeting
- **Battalion targeting**: Enemy battalions use direct combat system (Steps 14a-14b) with dynamic positioning
- **Dynamic pathfinding**: Each battalion calculates shortest path to their new target using network connections
- Visual feedback shows battalions retargeting with new movement paths
- **Speed-based movement**: Battalions begin moving toward new targets at their bot type's movement speed
- **No user input required**: Retargeting is automatic and immediate

## Feature Description
**Post-Capture Retargeting System**: When a neutral node is captured, all attacking battalions automatically retarget using proximity-based pathfinding. This system ensures continuous combat engagement by immediately finding the closest available targets (neutral nodes or enemy battalions) and calculating optimal network paths to reach them. Retargeting follows the same movement and attack range rules as initial targeting.

## Source of Truth Files
- **Server**: `src/services/BattleMovement.ts` - findClosestTarget() and retargeting logic
- **Server**: `src/services/BattleUpdater.ts` - Retargeting orchestration and state management
- **Server**: `src/services/BattleCalculator.ts` - Pathfinding calculations and target validation
- **Client**: `src/hooks/useBattleBattalions.ts` - Battalion retargeting visual updates
- **Client**: `src/components/battle/BattleBattalion.tsx` - Retargeting movement animations
- **Config**: `src/config/battleConfig.ts` - Network connections and bot movement speeds

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleMovement.ts](../../../server/src/services/BattleMovement.ts)** (453 lines) - `findClosestTarget()` method exists for retargeting logic
  - **Server Responsibility**: Scan available targets, calculate shortest paths via network lines, select closest target, validate target accessibility
  - **Anti-Cheat**: All retargeting logic must be server-side to prevent client manipulation
  - **Code Status**: NEEDS REFACTORING - should properly handle post-capture retargeting scenarios
  - **Pathfinding**: Uses Dijkstra's algorithm for shortest path calculation
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - Orchestrates retargeting when nodes are captured
  - **Server Responsibility**: Trigger retargeting when node capture is detected, coordinate battalion state changes, broadcast retargeting events to clients
  - **Performance**: Server updates every 100ms, client syncs every 1 second
  - **Code Status**: NEEDS IMPLEMENTATION - proper integration with node capture completion
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Pathfinding calculations and target validation
  - **Server Responsibility**: Validate target accessibility, calculate network distances, ensure targets are reachable via network connections
  - **Code Status**: EXISTS - Basic pathfinding framework properly implemented
- ✅ **[useBattleBattalions.ts](../../src/hooks/useBattleBattalions.ts)** (85 lines) - Client-side battalion state management
  - **Client Responsibility**: Real-time display of retargeting movements, visual feedback for new target selection, battalion position updates
  - **Code Status**: EXISTS - Battalion state management properly implemented
- ✅ **[BattleBattalion.tsx](../../src/components/battle/BattleBattalion.tsx)** (138 lines) - Visual representation of battalion retargeting
  - **Client Responsibility**: Smooth animation of retargeting movements, visual feedback for new target selection, movement path visualization
  - **Code Status**: EXISTS - Visual representation properly implemented
- ✅ **[networkConstants.ts](../../src/utils/networkConstants.ts)** (31 lines) - Network topology for pathfinding
  - **Code Status**: EXISTS - Network connections properly defined

**File Size Check:**
- **BattleMovement.ts** (453 lines) - **OVER 250 LINES** - Should be split
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/RetargetingService.ts` - Extract retargeting logic from BattleMovement (reason: file over 250 lines)
2. **Create**: `src/services/PathfindingService.ts` - Extract pathfinding calculations from BattleMovement (reason: file over 250 lines)
3. **Create**: `src/services/TargetSelectionService.ts` - Extract target selection logic from BattleUpdater (reason: file over 250 lines)
4. **Import Strategy**: 
   - Import `RetargetingService` into `BattleMovement.ts`
   - Import `PathfindingService` into `BattleMovement.ts`
   - Import `TargetSelectionService` into `BattleUpdater.ts`
   - Ensure proper integration between node capture completion and battalion retargeting
   - Maintain network constraint enforcement throughout retargeting process 