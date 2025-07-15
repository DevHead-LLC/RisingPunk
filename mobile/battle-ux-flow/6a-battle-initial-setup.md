# Step 6a: Battle Phase Transition

## User Experience Behavior
- Countdown overlay disappears after 3 seconds
- Battle timer (20 seconds) begins counting down immediately
- BattleGridScreen shows network with nodes and battalion positions
- User battalions appear on left side (nodes 0, 1, 2) with single battalion of each bot type per node (default configuration)
- Enemy battalions appear on right side (nodes 6, 7, 8) with single battalion of each bot type per node (default configuration)
- Neutral nodes (3, 4, 5) are in center with health bars showing 75% of total army strength
- Node ownership is visually indicated: blue for user nodes, red for enemy nodes, gray for neutral nodes

## Feature Description
**Battle Phase Transition**: Automatic transition from countdown to active battle phase with battalion initialization, 20-second battle timer, and visual setup of the battle network. The system manages phase transitions, battalion state initialization, battle timer management, and node health assignment (75% of total army strength for neutral nodes). Node ownership is tracked and visually represented with color coding.

## Source of Truth Files
- **Client**: `src/hooks/useBattleState.ts` - Controls phase transitions and 20-second timer
- **Client**: `src/hooks/useBattalionData.ts` - Creates and manages battalion stats and health
- **Client**: `src/hooks/useBots.ts` - Provides bot type definitions and base stats
- **Client**: `src/utils/networkConstants.ts` - Defines node positions and connections
- **Client**: `src/hooks/useBattleNodes.ts` - Node ownership tracking and health management
- **Server**: `src/services/BattleTimer.ts` - Server-side timer service (not connected)
- **Server**: `src/services/BattleCalculator.ts` - Node health calculation (75% of total army strength)

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[useBattleState.ts](../../src/hooks/useBattleState.ts)** - Automatically transitions from COUNTDOWN to ACTIVE phase when countdown reaches 0
  - **Client Responsibility**: startBattle function initiates 20-second battle timer, controls phase transitions
  - **Code Status**: NEEDS REFACTORING - timer logic should be server-side for consistency and anti-cheat
  - **Future Enhancement**: Server-side timer management
- ✅ **[BattleOverlayManager.tsx](../../src/components/battle/BattleOverlayManager.tsx)** - Switches from countdown overlay to battle timer display
  - **Client Responsibility**: Visual rendering, timer display, battalion visualization
  - **Code Status**: EXISTS - Overlay management properly implemented
- ✅ **[useBattleBattalions.ts](../../src/hooks/useBattleBattalions.ts)** - Manages battalion state and initialization
  - **Client Responsibility**: Battalion state management and initialization
  - **Code Status**: NEEDS REFACTORING - battalion initialization should be server-side
- ✅ **[useBattalionData.ts](../../src/hooks/useBattalionData.ts)** - Creates battalions with bot type stats and quantities
  - **Client Responsibility**: Creates and manages battalion stats and health
  - **Code Status**: NEEDS REFACTORING - battalion data creation should be server-side
- ✅ **[useBots.ts](../../src/hooks/useBots.ts)** - Provides bot type definitions (Guardian, Breacher, Phreak) with stats
  - **Client Responsibility**: Provides bot type definitions and base stats
  - **Code Status**: EXISTS - Bot type definitions properly configured
- ✅ **[networkConstants.ts](../../src/utils/networkConstants.ts)** - Defines node positions and connections
  - **Client Responsibility**: Defines node positions and connections
  - **Code Status**: EXISTS - Network layout properly defined
- ✅ **[useBattleNodes.ts](../../src/hooks/useBattleNodes.ts)** - Node ownership tracking and health management
  - **Client Responsibility**: Node ownership state management, health bar display, color coding (blue=user, red=enemy, gray=neutral)
  - **Code Status**: EXISTS - Node ownership tracking properly implemented
- ❌ **[BattleTimer.ts](../../../server/src/services/BattleTimer.ts)** - Server-side timer service (not connected)
  - **Server Responsibility**: Server-side timer management
  - **Code Status**: EXISTS but NOT CONNECTED - needs integration with client-side battle state
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Node health calculation (75% of total army strength)
  - **Server Responsibility**: Calculate neutral node health as 75% of total army strength during setup
  - **Code Status**: NEEDS IMPLEMENTATION - node health calculation formula

**File Size Check:**
- All files are under 250 lines, no splitting needed

**Recommended File Structure:**
1. **Create**: `src/services/BattleInitializationService.ts` - Extract battalion initialization logic from useBattleBattalions (reason: needs refactoring for server-side implementation)
2. **Create**: `src/services/BattalionDataService.ts` - Extract battalion data creation from useBattalionData (reason: needs refactoring for server-side implementation)
3. **Create**: `src/services/NodeHealthService.ts` - Handle node health calculation (75% of total army strength) and ownership tracking
4. **Import Strategy**: 
   - Import `BattleInitializationService` into `useBattleBattalions.ts`
   - Import `BattalionDataService` into `useBattalionData.ts`
   - Import `NodeHealthService` into `BattleCalculator.ts` for health calculations
   - Connect `BattleTimer.ts` to client-side battle state
   - Ensure proper integration between server-side initialization and client-side visualization

**Complete Specifications:**
See: [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for mathematical formulas (node health calculation), bot specifications, network topology, and visual design specifications. 