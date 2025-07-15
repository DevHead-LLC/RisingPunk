# Step 12: Node Capture Completion & Ownership Transfer

## User Experience Behavior
- When a neutral node's progress bar reaches +100% (user) or -100% (enemy), the node is instantly captured
- The node changes color to indicate new ownership (blue for user, red for enemy)
- The progress bar locks and is no longer updated
- Node ownership is permanently transferred to the capturing side in ownership arrays
- **Multi-battalion retargeting**: ALL battalions attacking the captured node (from any side) stop attacking and immediately retarget
- **Capture event**: Node emits a captured event that triggers retargeting for all attacking battalions simultaneously
- **Single ownership**: Only one side can capture a node - tug-of-war ensures clear winner, no simultaneous captures possible
- Captured nodes cannot be attacked or recaptured for the rest of the battle
- Visual feedback: color transition, progress bar lock, all attacking battalions retargeting

## Feature Description
**Node Capture Completion**: When a node's tug-of-war progress reaches the capture threshold (±100%), ownership is transferred permanently. The node's state is updated in the ownership arrays, all attacking battalions are notified to retarget, and the node is locked from further attacks. Captured nodes provide permanent control and cannot be recaptured during the battle.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - checkNodeCapture() for capture logic and threshold detection
- **Server**: `src/services/BattleUpdater.ts` - Ownership array updates, event logging, retargeting coordination
- **Server**: `src/models/BattleEvent.ts` - Node capture event log for audit/replay
- **Client**: `src/hooks/useBattleNodes.ts` - Node ownership state management and retargeting triggers
- **Visual**: `src/components/battle/BattleNetworkGrid.tsx` - Node color changes and progress bar lock
- **Config**: `src/config/battleConfig.ts` - Capture threshold values (±100%)
- **Storage**: Node ownership arrays - permanent transfer of node control to capturing side

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - checkNodeCapture() method for capture detection
  - **Server Responsibility**: Detect capture threshold reached (±100%), update node ownership and lock state
  - **Anti-Cheat**: All capture logic and state changes must be server-side
  - **Code Status**: EXISTS - Capture detection logic properly implemented
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - Updates node ownership, logs capture event, triggers retargeting
  - **Server Responsibility**: Update ownership arrays, log node capture event for audit/replay, notify clients of ownership change, trigger battalion retargeting
  - **Strategic Impact**: Node capture is permanent and changes battle dynamics
  - **Code Status**: NEEDS IMPLEMENTATION - ownership array management and permanent transfer logic
- ✅ **[BattleEvent.ts](../../../server/src/models/BattleEvent.ts)** - Logs node capture events for audit/replay
  - **Server Responsibility**: Event logging for audit/replay functionality
  - **Code Status**: EXISTS - Event logging properly implemented
- ✅ **[useBattleNodes.ts](../../src/hooks/useBattleNodes.ts)** - Client-side node ownership state and retargeting
  - **Client Responsibility**: Remove node from attackable targets, trigger battalion retargeting logic, update ownership state in arrays
  - **Code Status**: NEEDS UPDATE - should include ownership array management
- ✅ **[BattleNetworkGrid.tsx](../../src/components/battle/BattleNetworkGrid.tsx)** - Visual update for node color and progress bar
  - **Client Responsibility**: Animate node color change and progress bar lock, visual feedback for ownership change
  - **Code Status**: EXISTS - Visual updates properly implemented
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Capture threshold values
  - **Code Status**: EXISTS - Capture threshold values properly configured

**File Size Check:**
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/NodeCaptureService.ts` - Extract capture completion logic from BattleCalculator (reason: improve modularity)
2. **Create**: `src/services/RetargetingManager.ts` - Extract retargeting logic from BattleUpdater (reason: file over 250 lines)
3. **Create**: `src/services/NodeOwnershipTransferService.ts` - Handle ownership array updates and permanent transfer logic
4. **Import Strategy**: 
   - Import `NodeCaptureService` into `BattleCalculator.ts`
   - Import `RetargetingManager` into `BattleUpdater.ts`
   - Import `NodeOwnershipTransferService` into `BattleUpdater.ts` for ownership array management
   - Ensure proper integration between capture completion, ownership transfer, and battalion retargeting 