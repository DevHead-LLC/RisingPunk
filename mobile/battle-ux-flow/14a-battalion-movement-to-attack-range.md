# Step 14a: Battalion Movement to Attack Range

## User Experience Behavior
- Battalions that have retargeted to enemy battalions begin moving along network lines toward their targets
- **Dynamic target tracking**: Each battalion maintains a connection to their target battalion's position
- **Real-time position updates**: When a target battalion moves, attacking battalions receive position updates
- **Network-constrained movement**: All movement follows network connections, no off-network movement
- **Speed-based movement**: Each battalion moves at their bot type's movement speed (Guardian=9, Breacher=5, Phreak=7)
- **Attack range positioning**: Battalions stop when their attack range intersects the target battalion's position
- **Visual feedback**: Movement paths update in real-time as target positions change
- **Target validation**: System continuously validates that target battalions still exist and are reachable

## Feature Description
**Dynamic Battalion Movement System**: Battalions move toward enemy battalion targets with real-time position tracking. The system maintains active connections between attackers and targets, updating movement paths when targets move or are destroyed. All movement is network-constrained and follows the same speed-based timing as other movement phases.

## Source of Truth Files
- **Server**: `src/services/BattleMovement.ts` - Dynamic pathfinding and target tracking
- **Server**: `src/services/BattleUpdater.ts` - Real-time position updates and target validation
- **Server**: `src/services/BattleCalculator.ts` - Attack range calculations and positioning
- **Client**: `src/hooks/useBattleBattalions.ts` - Real-time movement visualization
- **Client**: `src/components/battle/BattleBattalion.tsx` - Dynamic movement path rendering
- **Config**: `src/config/battleConfig.ts` - Network connections and bot movement speeds

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleMovement.ts](../../../server/src/services/BattleMovement.ts)** (453 lines) - `moveAlongPath()` and `findClosestTarget()` methods exist
  - **Server Responsibility**: Dynamic path calculation, target position tracking, network-constrained movement validation, attack range positioning
  - **Anti-Cheat**: All movement calculations must be server-side to prevent client manipulation
  - **Code Status**: NEEDS ENHANCEMENT - should include real-time target position updates and dynamic path recalculation
  - **Target Tracking**: Currently static targeting, needs dynamic position updates
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - Orchestrates movement updates and target validation
  - **Server Responsibility**: Real-time target position broadcasting, movement path updates, target destruction detection
  - **Performance**: Server updates every 100ms, client syncs every 1 second
  - **Code Status**: NEEDS IMPLEMENTATION - dynamic target tracking and position update broadcasting
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Attack range calculations
  - **Server Responsibility**: Calculate attack range positioning for moving targets, validate attack range intersections
  - **Code Status**: NEEDS ENHANCEMENT - should handle dynamic target positioning
- ✅ **[useBattleBattalions.ts](../../src/hooks/useBattleBattalions.ts)** (85 lines) - Client-side battalion state management
  - **Client Responsibility**: Real-time display of dynamic movement paths, target position updates, movement completion detection
  - **Code Status**: NEEDS UPDATE - should handle dynamic path updates and target position changes
- ✅ **[BattleBattalion.tsx](../../src/components/battle/BattleBattalion.tsx)** (138 lines) - Visual representation of battalion movement
  - **Client Responsibility**: Dynamic movement path rendering, real-time position updates, attack range visualization
  - **Code Status**: NEEDS UPDATE - should render dynamic paths that update as targets move
- ✅ **[networkConstants.ts](../../src/utils/networkConstants.ts)** (31 lines) - Network topology for movement validation
  - **Code Status**: EXISTS - Network connections properly defined

**File Size Check:**
- **BattleMovement.ts** (453 lines) - **OVER 250 LINES** - Should be split
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/DynamicTargetTrackingService.ts` - Extract dynamic target tracking from BattleMovement (reason: file over 250 lines)
2. **Create**: `src/services/MovementPathService.ts` - Extract dynamic path calculation from BattleMovement (reason: file over 250 lines)
3. **Create**: `src/services/TargetPositionBroadcaster.ts` - Extract position broadcasting from BattleUpdater (reason: file over 250 lines)
4. **Import Strategy**: 
   - Import `DynamicTargetTrackingService` into `BattleMovement.ts`
   - Import `MovementPathService` into `BattleMovement.ts`
   - Import `TargetPositionBroadcaster` into `BattleUpdater.ts`
   - Ensure proper integration between dynamic tracking, path updates, and client visualization
   - Maintain network constraint enforcement throughout dynamic movement 