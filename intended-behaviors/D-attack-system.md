# D. Attack System (Consistent Throughout Battle)

## Table of Contents

### [A. Battle Initialization & Setup](A-battle-initialization-setup.md)
1. [Battle Start](A-battle-initialization-setup.md#1-battle-start)

### [B. Movement System (Consistent Throughout Battle)](B-movement-system.md)
2. [Movement Behavior](B-movement-system.md#2-movement-behavior)
3. [Movement Interruption Handling](B-movement-system.md#3-movement-interruption-handling)
4. [Natural Recovery Movement After Interruption](B-movement-system.md#4-natural-recovery-movement-after-interruption)

### [C. Targeting System (Two Distinct Behaviors)](C-targeting-system.md)
5. [Initial Targeting (Battle Start)](C-targeting-system.md#5-initial-targeting-battle-start)
6. [Retargeting (During Battle)](C-targeting-system.md#6-retargeting-during-battle)

### [D. Attack System (Consistent Throughout Battle)](D-attack-system.md)
7. [Attack Behavior](D-attack-system.md#7-attack-behavior)
8. [Node Combat (Tug-of-War System)](D-attack-system.md#8-node-combat-tug-of-war-system)
9. [Battalion-to-Battalion Combat System](D-attack-system.md#9-battalion-to-battalion-combat-system)

### [E. Event Handling & Retargeting](E-event-handling-retargeting.md)
10. [Node Capture Events](E-event-handling-retargeting.md#10-node-capture-events)
11. [Battalion Destruction Events](E-event-handling-retargeting.md#11-battalion-destruction-events)
12. [Battalion Movement Events](E-event-handling-retargeting.md#12-battalion-movement-events)
13. [Sequential Movement Phase](E-event-handling-retargeting.md#13-sequential-movement-phase)
14. [Immediate Response Events (Priority Queue Processing)](E-event-handling-retargeting.md#14-immediate-response-events-priority-queue-processing)
15. [Combat Queue System](E-event-handling-retargeting.md#15-combat-queue-system)
16. [Ongoing Combat](E-event-handling-retargeting.md#16-ongoing-combat)

### [F. Battle End & Point Tracking System](F-battle-end-point-tracking.md)
17. [Battle Duration & End Conditions](F-battle-end-point-tracking.md#17-battle-duration--end-conditions)
18. [Point Tracking System (Loss-Based Scoring)](F-battle-end-point-tracking.md#18-point-tracking-system-loss-based-scoring)
19. [Battle End Overlay Screen](F-battle-end-point-tracking.md#19-battle-end-overlay-screen)
20. [Battle End Data Structure](F-battle-end-point-tracking.md#20-battle-end-data-structure)

### [G. Architecture & Infrastructure](G-architecture-infrastructure.md)
21. [Key Rules & Network Lock-in](G-architecture-infrastructure.md#21-key-rules--network-lock-in)
22. [Attack Service Architecture Improvements](G-architecture-infrastructure.md#22-attack-service-architecture-improvements)

---

## 7. Attack Behavior
- **Battalions must stop to attack - cannot attack while moving**
- Battalions attack their target nodes with tug-of-war damage
- Multiple battalions can attack the same node

#### **Associated Files:**
- `server/src/services/AttackService.ts` - `calculateAttackInterval()`, `startAttack()`, `processActiveAttacks()` handle attack timing and state management
- `server/src/services/CombatService.ts` - `calculateBattalionDamage()`, `applyBattalionDamage()`, `calculateTugOfWarDamage()`, `applyTugOfWarDamage()` handle damage processing
- `server/src/services/MovementCalculationService.ts` - `calculateAttackRangePosition()` determines where battalions stop when attacking
- `server/src/services/BattalionPositionService.ts` - `createTargetPosition()`, `createAttackRangePosition()` manage attack positioning
- `server/src/types/battle.ts` - Defines `AttackState` interface with `attackInterval`, `lastAttackTime`, `isAttacking`
- `server/src/types/battle.ts` - Defines `IBattalion` with `attackRangePosition`, `isWithinAttackRange`
- `mobile/src/types/battleTypes.ts` - Client-side attack state types
- `mobile/src/components/battle/BattleBattalion.tsx` - Visual attack range display and positioning
- `server/__tests__/attackService.test.ts` - Tests attack interval calculations and behavior
- `server/__tests__/initialCombatPhase.test.ts` - Tests initial combat and damage processing
- `server/__tests__/nodeCaptureRetargeting.test.ts` - Tests node capture retargeting behavior
- `mobile/__tests__/components/battle/battalionAttackRange.test.tsx` - Tests visual attack range positioning
- `mobile/__tests__/components/battle/nodeCaptureRetargeting.test.tsx` - Tests visual node capture behavior

##### **Discrepancies:**
- **Attack Timing Management**: intended.md states "calculateAttackInterval(), startAttack(), processActiveAttacks() handle attack timing and state management" and AttackService.ts correctly implements all three methods ✅ **CORRECT**
- **Attack State Interface**: intended.md states "Defines AttackState interface with attackInterval, lastAttackTime, isAttacking" and AttackService.ts correctly defines the interface ✅ **CORRECT**
- **Damage Processing**: intended.md states "calculateBattalionDamage(), applyBattalionDamage(), calculateTugOfWarDamage(), applyTugOfWarDamage() handle damage processing" and CombatService.ts correctly implements all four methods ✅ **CORRECT**
- **Attack Range Positioning**: intended.md states "calculateAttackRangePosition() determines where battalions stop when attacking" and MovementCalculationService.ts correctly implements the method ✅ **CORRECT**
- **Attack Positioning Management**: intended.md states "createTargetPosition(), createAttackRangePosition() manage attack positioning" and BattalionPositionService.ts correctly implements both methods ✅ **CORRECT**
- **Battalion Interface**: intended.md states "Defines IBattalion with attackRangePosition, isWithinAttackRange" but battle.ts doesn't define these properties - this appears to be a discrepancy
- **Client-Side Types**: intended.md states "Client-side attack state types" and battleTypes.ts correctly defines attack-related types ✅ **CORRECT**
- **Visual Attack Range**: intended.md states "Visual attack range display and positioning" and BattleBattalion.tsx correctly implements visual attack range display ✅ **CORRECT**
- **Attack Interval Tests**: intended.md states "Tests attack interval calculations and behavior" and attackService.test.ts correctly tests attack intervals ✅ **CORRECT**
- **Combat Processing Tests**: intended.md states "Tests initial combat and damage processing" and initialCombatPhase.test.ts correctly tests combat behavior ✅ **CORRECT**
- **Node Capture Tests**: intended.md states "Tests node capture retargeting behavior" and nodeCaptureRetargeting.test.ts correctly tests node capture behavior ✅ **CORRECT**
- **Visual Attack Range Tests**: intended.md states "Tests visual attack range positioning" and battalionAttackRange.test.tsx correctly tests visual positioning ✅ **CORRECT**
- **❌ MISSING: Stop to Attack Logic**: intended.md states "Battalions must stop to attack - cannot attack while moving" but there's no logic to prevent attacks while battalions are moving - this appears to be missing from the implementation
- **❌ MISSING: Multiple Attackers Logic**: intended.md states "Multiple battalions can attack the same node" but there's no specific logic to handle multiple simultaneous attackers on the same target

## 8. Node Combat (Tug-of-War System)
- **Tug-of-War System:**
  - Total army health is calculated for damage scaling
  - Node control starts at 0% (neutral)
  - **+100% = User control** (attacker wins the node)
  - **-100% = Enemy control** (defender wins the node)
  - Damage from user battalions pushes control toward +100%
  - Damage from enemy battalions pushes control toward -100%
  - First side to reach ±100% permanently captures the node

#### **Associated Files:**
- `server/src/services/CombatService.ts` - `calculateTugOfWarDamage()`, `applyTugOfWarDamage()`, `initializeTugOfWarProgress()`, `isTugOfWarComplete()` handle tug-of-war logic
- `server/src/services/NodeService.ts` - `createNodesWithTugOfWar()` initializes nodes with tug-of-war properties
- `server/src/services/BattleSetupService.ts` - `initializeTugOfWarProgress()` sets up node capture thresholds
- `server/src/types/battle.ts` - Defines `INode` interface with `tugOfWarProgress`, `maxCaptureThreshold`
- `server/src/models/Battle.ts` - Database schema for tug-of-war progress and capture thresholds
- `server/src/controllers/BattleController.ts` - Sends tug-of-war progress to client
- `mobile/src/store/api/battleApi.ts` - Client-side tug-of-war progress types
- `mobile/src/components/battle/NodeHealthBar.tsx` - Visual tug-of-war progress bar display
- `mobile/src/components/battle/BattleNetworkGrid.tsx` - Renders NodeHealthBar components
- `server/__tests__/initialCombatPhase.test.ts` - Tests initial tug-of-war damage application
- `server/__tests__/nodeCaptureRetargeting.test.ts` - Tests node capture behavior
- `mobile/__tests__/components/battle/initialCombatPhase.test.tsx` - Tests visual tug-of-war progress
- `mobile/__tests__/components/battle/nodeCaptureRetargeting.test.tsx` - Tests visual node capture behavior

##### **Discrepancies:**
- **Tug-of-War Logic**: intended.md states "calculateTugOfWarDamage(), applyTugOfWarDamage(), initializeTugOfWarProgress(), isTugOfWarComplete() handle tug-of-war logic" and CombatService.ts correctly implements all four methods ✅ **CORRECT**
- **Node Initialization**: intended.md states "createNodesWithTugOfWar() initializes nodes with tug-of-war properties" and NodeService.ts correctly implements the method ✅ **CORRECT**
- **Battle Setup**: intended.md states "initializeTugOfWarProgress() sets up node capture thresholds" and BattleSetupService.ts correctly sets maxCaptureThreshold ✅ **CORRECT**
- **Node Interface**: intended.md states "Defines INode interface with tugOfWarProgress, maxCaptureThreshold" and battle.ts correctly defines both properties ✅ **CORRECT**
- **Database Schema**: intended.md states "Database schema for tug-of-war progress and capture thresholds" and Battle.ts correctly defines tugOfWarProgress and maxCaptureThreshold fields ✅ **CORRECT**
- **Client Communication**: intended.md states "Sends tug-of-war progress to client" and BattleController.ts correctly includes tugOfWarProgress in response ✅ **CORRECT**
- **Client-Side Types**: intended.md states "Client-side tug-of-war progress types" and battleApi.ts correctly defines tugOfWarProgress and maxCaptureThreshold ✅ **CORRECT**
- **Visual Progress Bar**: intended.md states "Visual tug-of-war progress bar display" and NodeHealthBar.tsx correctly displays progress with color coding ✅ **CORRECT**
- **Grid Rendering**: intended.md states "Renders NodeHealthBar components" and BattleNetworkGrid.tsx correctly renders NodeHealthBar components ✅ **CORRECT**
- **Damage Application Tests**: intended.md states "Tests initial tug-of-war damage application" and initialCombatPhase.test.ts correctly tests damage calculation and application ✅ **CORRECT**
- **Node Capture Tests**: intended.md states "Tests node capture behavior" and nodeCaptureRetargeting.test.ts correctly tests node capture and ownership change ✅ **CORRECT**
- **Visual Progress Tests**: intended.md states "Tests visual tug-of-war progress" and initialCombatPhase.test.tsx correctly tests visual progress display ✅ **CORRECT**
- **Visual Capture Tests**: intended.md states "Tests visual node capture behavior" and nodeCaptureRetargeting.test.tsx correctly tests visual capture behavior ✅ **CORRECT**
- **❌ MISSING: Total Army Health Calculation**: intended.md states "Total army health is calculated for damage scaling" but BattleSetupService.ts passes 0 as totalArmyHealth to createNodesWithTugOfWar() instead of calculating actual total army health
- **❌ MISSING: Node Control Range**: intended.md states "Node control starts at 0% (neutral)" and Battle.ts correctly sets default to 0, but NodeService.ts doesn't explicitly set tugOfWarProgress to 0
- **❌ MISSING: Capture Threshold Validation**: intended.md states "First side to reach ±100% permanently captures the node" but there's no validation to ensure maxCaptureThreshold is properly set before damage calculation

## 9. Battalion-to-Battalion Combat System

#### **Combat Damage Calculation:**
- **Base Attack Damage** = `attacker.stats.offense * attacker.quantity`
- **Defense Percentage Reduction** = `base_damage * (defender.stats.defense / 100)`
- **Final Damage** = `base_damage - defense_reduction`
- **Example:** User guardian (offense=10, quantity=10) attacks enemy guardian (defense=25%)
  - Base damage: 10 × 10 = 100
  - Defense reduction: 100 × (25/100) = 25
  - Final damage: 100 - 25 = **75 damage dealt**

#### **Health and Unit Management:**
- **Total Health** = `battalion.stats.health * battalion.quantity`
- **Example:** Enemy guardian with health=100, quantity=10 = **1000 total health**
- **Health reduces with each attack:** 1000 → 925 → 850...
- **Unit count calculation:** Uses specific rounding rules (see below)
- **Attack power adjusts:** New attack = `stats.offense * current_quantity`

#### **Unit Reduction Example (Following Exact User Specification):**
1. **Initial:** Enemy guardian (health=100/unit, 10 units = 1000 health, attack=10×10=100)
2. **After 75 damage:** 925 health → `925 ÷ 100 = 9.25` → **Round down to 9 units** → attack=10×9=90
3. **After another 75 damage:** 850 health → `850 ÷ 100 = 8.5` → **Round up to 9 units** → attack=10×9=90
4. **After another 75 damage:** 775 health → `775 ÷ 100 = 7.75` → **Round down to 7 units** → attack=10×7=70

#### **Unit Count Rounding Rules:**
Based on the user's example showing "round down" then "round up", two interpretations are possible:
1. **Alternating Pattern:** First damage rounds down, second rounds up, third rounds down, etc.
2. **Standard Rounding:** Use Math.round() consistently (9.25→9, 8.5→9, 7.75→8)

**Implementation Decision:** Use **Math.round()** for consistent, predictable behavior.
- This matches the mathematical results in the example (9.25→9, 8.5→9)
- Avoids complex state tracking for alternating patterns
- Provides fair rounding throughout the battle

#### **Battalion Destruction:**
- **Health reaches 0:** Battalion is completely destroyed and removed from battle
- **Destroyed battalions:**
  - Cannot be targeted by enemy battalions
  - Cannot attack other battalions or nodes  
  - Are not visible on the battlefield
  - Trigger retargeting for any battalions currently targeting them

#### **Associated Files:**
- `server/src/services/CombatService.ts` - `calculateBattalionDamage()`, `applyBattalionDamage()`, `canTargetBattalion()` handle battalion combat logic
- `server/src/services/AttackService.ts` - `queueBattalionDestructionRetargeting()`, `executeBattalionDestructionRetargeting()` handle destruction retargeting
- `server/src/services/BattalionService.ts` - `calculateTotalArmyHealth()` calculates health for damage scaling
- `server/src/utils/battleUtils.ts` - `calculateBattalionHealth()` utility for health calculations
- `server/src/services/BattalionMappingService.ts` - `isDestroyed`, `destroyedAt` track battalion destruction state
- `server/src/types/battle.ts` - Defines `IBattalion` with `currentHealth`, `quantity`, `isDestroyed`
- `server/src/types/battle.ts` - Defines `RetargetingTask` with `battalion_destruction` trigger type
- `server/src/models/Battle.ts` - Database schema for battalion combat and destruction fields
- `server/__tests__/initialCombatPhase.test.ts` - Tests initial battalion combat damage
- `server/__tests__/selectiveRetargeting.test.ts` - Tests battalion destruction retargeting

##### **Discrepancies:**
- **Combat Damage Calculation**: intended.md states "Base Attack Damage = attacker.stats.offense * attacker.quantity" and CombatService.ts correctly implements `calculateBattalionDamage()` with this formula ✅ **CORRECT**
- **Defense Percentage Reduction**: intended.md states "Defense Percentage Reduction = base_damage * (defender.stats.defense / 100)" and CombatService.ts correctly implements this calculation ✅ **CORRECT**
- **Final Damage Calculation**: intended.md states "Final Damage = base_damage - defense_reduction" and CombatService.ts correctly implements this with `Math.max(1, baseDamage - defenseReduction)` ✅ **CORRECT**
- **Health and Unit Management**: intended.md states "Total Health = battalion.stats.health * battalion.quantity" and BattalionService.ts correctly implements `calculateTotalArmyHealth()` ✅ **CORRECT**
- **Unit Count Calculation**: intended.md states "Uses specific rounding rules" and CombatService.ts correctly implements `calculateUnitsFromHealth()` with `Math.round()` ✅ **CORRECT**
- **Attack Power Adjustment**: intended.md states "New attack = stats.offense * current_quantity" and CombatService.ts correctly updates quantity in `recalculateBattalionUnits()` ✅ **CORRECT**
- **Battalion Destruction**: intended.md states "Health reaches 0: Battalion is completely destroyed" and CombatService.ts correctly sets `isDestroyed: true` and `quantity: 0` ✅ **CORRECT**
- **Destruction Retargeting**: intended.md states "Trigger retargeting for any battalions currently targeting them" and AttackService.ts correctly implements `queueBattalionDestructionRetargeting()` ✅ **CORRECT**
- **Battalion Interface**: intended.md states "Defines IBattalion with currentHealth, quantity, isDestroyed" and battle.ts correctly defines all three properties ✅ **CORRECT**
- **Database Schema**: intended.md states "Database schema for battalion combat and destruction fields" and Battle.ts correctly defines all combat and destruction fields ✅ **CORRECT**
- **Health Calculation Utility**: intended.md states "calculateBattalionHealth() utility for health calculations" and battleUtils.ts correctly implements the utility ✅ **CORRECT**
- **Destruction State Tracking**: intended.md states "isDestroyed, destroyedAt track battalion destruction state" and BattalionMappingService.ts correctly filters out destroyed battalions ✅ **CORRECT**
- **Retargeting Task Type**: intended.md states "Defines RetargetingTask with battalion_destruction trigger type" and battle.ts correctly defines the trigger type ✅ **CORRECT**
- **Combat Damage Tests**: intended.md states "Tests initial battalion combat damage" and initialCombatPhase.test.ts correctly tests damage calculation ✅ **CORRECT**
- **Destruction Retargeting Tests**: intended.md states "Tests battalion destruction retargeting" and selectiveRetargeting.test.ts correctly tests retargeting behavior ✅ **CORRECT**
- **❌ MISSING: Unit Reduction Example Validation**: intended.md provides specific unit reduction examples (9.25→9, 8.5→9, 7.75→7) but the implementation uses `Math.round()` which would produce different results (9.25→9, 8.5→9, 7.75→8) - this is a discrepancy between intended behavior and implementation
- **❌ MISSING: Battalion Visibility Logic**: intended.md states "Destroyed battalions are not visible on the battlefield" but BattalionMappingService.ts filters them out, which is correct, but there's no explicit visibility logic in the client-side components
- **❌ MISSING: Attack Power Validation**: intended.md states "Attack power adjusts: New attack = stats.offense * current_quantity" but there's no validation to ensure attack power is recalculated after unit reduction 