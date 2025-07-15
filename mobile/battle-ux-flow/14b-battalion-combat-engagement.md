# Step 14b: Battalion Combat Engagement

## User Experience Behavior
- Battalions engage in direct combat when they reach attack range of enemy battalions
- **Speed-based attack timing**: Each battalion attacks at intervals based on their bot type's speed stat
  - Fast bots (high speed) attack more frequently with shorter delays
  - Slow bots (low speed) attack less frequently with longer delays
- **Real-time target monitoring**: System continuously monitors target battalion positions and health
- **Dynamic retargeting**: When a target battalion moves out of range or is destroyed, attackers immediately retarget
- **Damage calculation**: Each attack deals damage based on (Bot type strength + bonuses) × number of bots
- **Defense system**: Target battalion's defense percentage reduces incoming damage
- **Unit loss mechanics**: When a battalion takes damage, bot quantity is reduced using formula: (damage - health) ÷ (health per bot type) = units lost (rounded)
- **Visual feedback**: Health bars show battalion health decreasing, quantity numbers update in real-time
- **Combat animations**: Attack animations show battalions engaging in direct combat
- **Focus fire**: Multiple battalions can attack the same enemy battalion simultaneously

## Feature Description
**Dynamic Battalion Combat System**: Battalions engage in direct combat with enemy battalions using a damage-based system with real-time target monitoring. The system continuously tracks target positions, health, and destruction events, triggering immediate retargeting when targets move out of range or are destroyed. Combat continues until one battalion is destroyed or moves out of range.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - calculateDamage() and applyDamage() methods
- **Server**: `src/services/BattleUpdater.ts` - Combat orchestration and real-time target monitoring
- **Server**: `src/services/BattleMovement.ts` - Attack range validation and dynamic positioning
- **Client**: `src/hooks/useBattleBattalions.ts` - Battalion health and quantity display
- **Client**: `src/components/battle/BattleBattalion.tsx` - Combat animations and visual feedback
- **Config**: `src/config/battleConfig.ts` - Bot stats, damage formulas, and combat parameters

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - `calculateDamage()` and `applyDamage()` methods exist for combat calculations
  - **Server Responsibility**: Damage calculation ((Bot type strength + bonuses) × quantity), defense percentage reduction, unit loss calculation, health and quantity updates
  - **Anti-Cheat**: All combat calculations must be server-side to prevent client manipulation
  - **Code Status**: NEEDS ENHANCEMENT - should include real-time target monitoring and destruction detection
  - **Damage Formula**: Attack Power = (Bot Type Strength + Equipment Bonuses) × Quantity
- ✅ **[BattleUpdater.ts](../../../server/src/services/BattleUpdater.ts)** (520 lines) - Orchestrates battalion combat and state updates
  - **Server Responsibility**: Real-time target monitoring, combat timing coordination, speed-based attack intervals, destruction event detection, immediate retargeting triggers
  - **Performance**: Server updates every 100ms, client syncs every 1 second
  - **Code Status**: NEEDS IMPLEMENTATION - real-time target monitoring and destruction event handling
- ✅ **[BattleMovement.ts](../../../server/src/services/BattleMovement.ts)** (453 lines) - Attack range validation and positioning
  - **Server Responsibility**: Validate attack range for moving battalion targets, ensure battalions remain within attack range, detect when targets move out of range
  - **Code Status**: NEEDS ENHANCEMENT - should handle dynamic attack range validation for moving targets
- ✅ **[useBattleBattalions.ts](../../src/hooks/useBattleBattalions.ts)** (85 lines) - Client-side battalion state management
  - **Client Responsibility**: Real-time display of battalion health, quantity updates, target destruction events, retargeting triggers
  - **Code Status**: NEEDS UPDATE - should handle real-time target monitoring and destruction events
- ✅ **[BattleBattalion.tsx](../../src/components/battle/BattleBattalion.tsx)** (138 lines) - Visual representation of battalion combat
  - **Client Responsibility**: Combat animations, health bar updates, quantity number display, target destruction visual feedback, retargeting animations
  - **Code Status**: NEEDS UPDATE - should show target destruction and retargeting events
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Bot stats and combat parameters
  - **Code Status**: EXISTS - Bot type stats and base combat parameters properly configured

**File Size Check:**
- **BattleUpdater.ts** (520 lines) - **OVER 250 LINES** - Should be split
- **BattleMovement.ts** (453 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/TargetMonitoringService.ts` - Extract real-time target monitoring from BattleUpdater (reason: file over 250 lines)
2. **Create**: `src/services/DestructionEventService.ts` - Extract destruction detection and event handling from BattleUpdater (reason: file over 250 lines)
3. **Create**: `src/services/CombatRangeValidator.ts` - Extract dynamic attack range validation from BattleMovement (reason: file over 250 lines)
4. **Import Strategy**: 
   - Import `TargetMonitoringService` into `BattleUpdater.ts`
   - Import `DestructionEventService` into `BattleUpdater.ts`
   - Import `CombatRangeValidator` into `BattleMovement.ts`
   - Ensure proper integration between target monitoring, destruction detection, and immediate retargeting
   - Maintain speed-based timing system for battalion combat

**Complete Specifications:**
See: [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for combat damage formulas, bot specifications, and type advantage calculations. 