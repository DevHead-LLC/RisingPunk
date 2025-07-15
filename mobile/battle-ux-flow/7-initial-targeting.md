# Step 7: Initial Targeting Logic

## User Experience Behavior
- After countdown ends, battalions automatically select their first target
- Each battalion picks a random neutral node that is reachable via network connections from their starting position
- Targeting follows network topology - battalions can only target nodes connected to their network path
- Each battalion can only target ONE node at a time (single target rule)
- Multiple battalions can target the SAME node simultaneously (multiple attackers)
- This is the only time targeting is random - all subsequent targeting will be based on proximity
- No user input required - this is automatic targeting behavior
- Visual feedback shows which node each battalion is targeting

## Feature Description
**Initial Target Selection**: Battalions automatically choose their first target from neutral nodes that are reachable via network connections from their starting position. This is the only time targeting is random - all subsequent targeting will be based on proximity and strategic considerations. Each battalion can only target one node at a time, but multiple battalions can target the same node, creating concentrated attacks on strategic positions.

## Source of Truth Files
- **Client**: `src/hooks/useBattleNodes.ts` - Node state management and targeting UI
- **Server**: `src/services/BattleCalculator.ts` - Core targeting algorithm and validation
- **Config**: `src/config/battleConfig.ts` - Targeting range and behavior parameters

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleMovement.ts](../../../server/src/services/BattleMovement.ts)** (453 lines) - `assignInitialTargets()` method exists but needs enhancement for random selection
  - **Server Responsibility**: Actual target selection algorithm (random neutral node within range), validation that selected targets are valid and reachable
  - **Anti-Cheat**: Ensuring targeting follows game rules
  - **Code Status**: NEEDS REFACTORING - should use random selection instead of closest target
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - `findTargetsForBattalion()` exists but simplified, needs proper initial targeting logic
  - **Server Responsibility**: Broadcasting target selections to all clients
  - **Code Status**: NEEDS IMPLEMENTATION - proper initial targeting logic
- ✅ **[networkConstants.ts](../../src/utils/networkConstants.ts)** (31 lines) - Single source of truth for network connections, properly connected
  - **Code Status**: EXISTS - Network connection logic properly implemented
- ✅ **[pathfinding.ts](../../src/utils/pathfinding.ts)** (399 lines) - Client-side pathfinding utilities, properly connected
  - **Client Responsibility**: Client-side pathfinding utilities
  - **Code Status**: EXISTS - Pathfinding utilities properly implemented
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Network connections and bot stats, properly connected
  - **Code Status**: EXISTS - Network connections and bot stats properly configured
- ✅ **[BattleNetworkGrid.tsx](../../src/components/battle/BattleNetworkGrid.tsx)** - Renders the network and handles targeting visualization
  - **Client Responsibility**: Visual representation of targeting (lines, highlights), immediate UI feedback when targets are selected
  - **Code Status**: EXISTS - Targeting visualization properly implemented
- ✅ **[useBattleNodes.ts](../../src/hooks/useBattleNodes.ts)** - Manages node state and targeting logic
  - **Client Responsibility**: Display of targeting ranges and valid targets
  - **Code Status**: EXISTS - Node state management properly implemented
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Server-side targeting calculations
  - **Server Responsibility**: Core targeting algorithm and validation
  - **Code Status**: EXISTS - Basic targeting framework properly implemented

**File Size Check:**
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split
- **BattleMovement.ts** (453 lines) - **OVER 250 LINES** - Should be split
- **pathfinding.ts** (399 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/InitialTargetingService.ts` - Extract random targeting logic from BattleMovement (reason: file over 250 lines)
2. **Create**: `src/services/TargetingValidator.ts` - Extract targeting validation from BattleUpdater (reason: file over 250 lines)
3. **Create**: `src/utils/NetworkPathfinding.ts` - Extract network-specific pathfinding from pathfinding.ts (reason: file over 250 lines)
4. **Import Strategy**: 
   - Import `InitialTargetingService` into `BattleMovement.ts`
   - Import `TargetingValidator` into `BattleUpdater.ts`
   - Import `NetworkPathfinding` into existing pathfinding utilities 