# Step 11a: Tug-of-War Combat System

## User Experience Behavior
- Battalions continuously attack neutral nodes (3, 4, 5) once they reach attack range
- **Speed-based attack timing**: Each battalion attacks at intervals based on their bot type's speed stat
  - Fast bots (high speed) attack more frequently with shorter delays
  - Slow bots (low speed) attack less frequently with longer delays
- **Tug-of-war mechanics**: Each attack adds progress based on damage/health ratio toward capture threshold
- Visual progress bars show capture progress from -100% (enemy control) to +100% (user control)
- Progress moves toward user side (blue) or enemy side (red) based on attack strength vs node health
- Captured nodes cannot be attacked or recaptured for the rest of the battle

## Feature Description
**Tug-of-War Node Capture**: Battalions attack neutral nodes using a continuous tug-of-war system. Each battalion attacks at intervals determined by their bot type's speed stat - faster bots attack more frequently, slower bots attack less frequently. Each attack adds progress based on damage/health ratio toward capture threshold (±100%). Once captured, nodes provide permanent control and cannot be recaptured during the battle.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - Tug-of-war algorithm, damage/health ratio calculations, and capture threshold detection
- **Server**: `src/services/BattleUpdater.ts` - Combat orchestration, progress updates, and node ownership management
- **Client**: `src/hooks/useBattleNodes.ts` - Node ownership display, health tracking, and visual state management
- **Config**: `src/config/battleConfig.ts` - Combat parameters, bot stats, and node health calculation (75% of total army strength)

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Core tug-of-war calculations and capture logic
  - **Server Responsibility**: Tug-of-war calculation algorithm (damage/health ratio for progress), capture threshold detection (±100% progress)
  - **Anti-Cheat**: All combat calculations must be server-side
  - **Code Status**: NEEDS REFACTORING - should be properly integrated with node ownership system and health calculations
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - Orchestrates node combat and progress updates
  - **Server Responsibility**: Progress change calculations (damage/health ratio), speed-based attack timing intervals, node ownership updates and permanent capture state
  - **Performance**: Server updates every 100ms, client syncs every 1 second
  - **Code Status**: NEEDS IMPLEMENTATION - damage/health ratio calculation, speed-based timing system, and ownership array management
- ✅ **[BattleNetworkGrid.tsx](../../src/components/battle/BattleNetworkGrid.tsx)** - Visual representation of nodes and capture progress
  - **Client Responsibility**: Visual progress bars showing capture progress (-100% to +100%), node color changes based on ownership (blue=user, red=enemy, gray=neutral)
  - **Code Status**: EXISTS - Visual representation properly implemented
- ✅ **[useBattleNodes.ts](../../src/hooks/useBattleNodes.ts)** - Client-side node state management and ownership tracking
  - **Client Responsibility**: Real-time display of attack animations and progress updates, ownership transfer visual feedback when nodes are captured
  - **Code Status**: EXISTS - Node state management properly implemented

**File Size Check:**
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/NodeCombatService.ts` - Extract tug-of-war logic from BattleCalculator
2. **Create**: `src/services/CaptureProgressManager.ts` - Extract progress management from BattleUpdater
3. **Create**: `src/services/AttackTimingService.ts` - Handle speed-based attack intervals and timing calculations
4. **Import Strategy**: 
   - Import `NodeCombatService` into `BattleCalculator.ts`
   - Import `CaptureProgressManager` into `BattleUpdater.ts`
   - Import `AttackTimingService` into `BattleUpdater.ts` for speed-based timing
   - Ensure proper integration between combat calculations, timing system, and progress management

**Complete Specifications:**
See: [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for mathematical formulas (damage calculations, unit loss), combat specifications, and performance requirements. 