# Step 15b: Victory Determination System

## User Experience Behavior
- **Victory condition monitoring**: System continuously checks for complete army elimination or 20-second timer expiration
- **Battle timer**: 20-second countdown starts immediately after 3-second countdown overlay completes and battle phase begins
- **Battle end detection**: Battle ends immediately when either all enemy battalions are destroyed OR 20-second timer reaches 0
- **Victory point calculation**: Side with fewer losses wins, calculated using bot mark values (cost to build) multiplied by units lost for each side
- **Tie-breaker**: If tied, enemy wins automatically (defender advantage) and user's single lowest-mark unit is 'saved' from destruction
- **Victory determination**: System calculates final winner based on bot mark values and sends results to client

## Feature Description
**Victory Determination System**: The battle concludes when either all enemy battalions are destroyed or the 20-second timer expires. Victory is determined by calculating losses based on bot mark values, with the side suffering fewer losses declared the winner. The system handles victory condition monitoring, point calculations, and tie-breaker rules.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - Victory condition calculations and point calculations
- **Server**: `src/services/BattleUpdater.ts` - Victory condition monitoring and battle end orchestration
- **Server**: `src/services/BattleTimer.ts` - 20-second timer management and expiration detection
- **Client**: `src/hooks/useBattleState.ts` - Battle phase transitions and victory state management
- **Config**: `src/config/battleConfig.ts` - Victory conditions, timer settings, and bot mark values

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Victory condition calculations and point calculations
  - **Server Responsibility**: Victory point calculations based on bot mark values, loss tracking for both sides, tie-breaker logic
  - **Anti-Cheat**: All victory calculations must be server-side to prevent client manipulation
  - **Code Status**: NEEDS ENHANCEMENT - should include comprehensive victory condition checking and point calculations
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - Orchestrates battle state updates and victory monitoring
  - **Server Responsibility**: Continuous victory condition monitoring, battle end detection, victory event broadcasting
  - **Performance**: Server updates every 100ms, client syncs every 1 second
  - **Code Status**: NEEDS IMPLEMENTATION - comprehensive victory condition monitoring and battle end handling
- ✅ **[BattleTimer.ts](../../../server/src/services/BattleTimer.ts)** - 20-second timer management
  - **Server Responsibility**: Battle timer countdown, expiration detection, timer event broadcasting
  - **Code Status**: EXISTS - Timer management properly implemented
- ✅ **[useBattleState.ts](../../src/hooks/useBattleState.ts)** - Client-side battle state management
  - **Client Responsibility**: Battle phase transitions, victory state display, battle end handling
  - **Code Status**: NEEDS UPDATE - should handle victory conditions and battle end transitions
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Victory conditions and timer settings
  - **Code Status**: NEEDS UPDATE - should include victory point calculation formulas and tie-breaker rules

**File Size Check:**
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/VictoryConditionService.ts` - Extract victory condition monitoring from BattleUpdater
2. **Create**: `src/services/BattleEndService.ts` - Extract battle end handling from BattleUpdater
3. **Import Strategy**: 
   - Import `VictoryConditionService` into `BattleUpdater.ts`
   - Import `BattleEndService` into `BattleUpdater.ts`
   - Ensure proper integration between victory monitoring, battle end detection, and result calculation
   - Maintain proper cleanup and state transitions

**Complete Specifications:**
See: [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for victory conditions detail, tie-breaker rules, and mark value calculations. 