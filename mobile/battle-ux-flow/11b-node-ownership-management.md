# Step 11b: Node Ownership Management

## User Experience Behavior
- **Node health system**: Neutral nodes have health equal to 75% of total army strength, providing capture resistance
- **Capture threshold**: When progress reaches ±100%, node is captured and changes color permanently (blue=user, red=enemy)
- Captured nodes cannot be attacked or recaptured for the rest of the battle
- Node ownership is tracked in ownership arrays - prevents recapture during battle
- Visual feedback shows node color changes and permanent ownership state

## Feature Description
**Node Ownership Management**: Neutral nodes have health equal to 75% of total army strength, providing capture resistance. Once captured, nodes provide permanent control and cannot be recaptured during the battle. Node ownership is tracked in ownership arrays and visually represented with color coding.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - Node health calculation (75% of total army strength)
- **Server**: `src/services/BattleUpdater.ts` - Node ownership updates and permanent capture state
- **Storage**: Node ownership arrays - tracks which nodes belong to user vs enemy, prevents recapture
- **Client**: `src/hooks/useBattleNodes.ts` - Node ownership display and health tracking
- **Config**: `src/config/battleConfig.ts` - Node health calculation (75% of total army strength)

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Node health calculation (75% of total army strength)
  - **Server Responsibility**: Calculate neutral node health as 75% of total army strength during setup
  - **Code Status**: NEEDS IMPLEMENTATION - node health calculation formula
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - Node ownership updates and permanent capture state
  - **Server Responsibility**: Node ownership updates and permanent capture state, ownership array management
  - **Performance**: Server updates every 100ms, client syncs every 1 second
  - **Code Status**: NEEDS IMPLEMENTATION - ownership array management
- ✅ **[useBattleNodes.ts](../../src/hooks/useBattleNodes.ts)** - Client-side node state management and ownership tracking
  - **Client Responsibility**: Node ownership state management, health bar display, color coding (blue=user, red=enemy, gray=neutral)
  - **Code Status**: EXISTS - Node ownership tracking properly implemented
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Node health calculation configuration
  - **Code Status**: NEEDS UPDATE - should include node health calculation formula (75% of total army strength)

**File Size Check:**
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/NodeOwnershipManager.ts` - Extract ownership management from BattleUpdater
2. **Create**: `src/services/NodeHealthService.ts` - Handle node health calculation (75% of total army strength)
3. **Import Strategy**: 
   - Import `NodeOwnershipManager` into `BattleUpdater.ts` for ownership array management
   - Import `NodeHealthService` into `BattleCalculator.ts` for health calculations
   - Ensure proper integration between ownership management, health calculations, and capture state

**Complete Specifications:**
See: [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for mathematical formulas (node health calculation), ownership specifications, and visual design requirements. 