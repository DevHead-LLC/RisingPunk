# E. Event Handling & Retargeting

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

## 10. Node Capture Events
- When a node is captured, it becomes owned by the capturing party and un-attackable
- **Only battalions attacking or targeting the captured node stop attacking or moving and retarget**
- Other battalions continue attacking their current targets until those nodes are captured

#### **Associated Files:**
- `server/src/services/CombatService.ts` - `applyTugOfWarDamage()`, `isNodeCaptured()` handle node capture detection and completion
- `server/src/services/AttackService.ts` - `queueRetargetingTask()`, `executeRetargetingTask()`, `getMovingBattalionsTargetingNode()` manage node capture retargeting
- `server/src/services/BattleResponseService.ts` - Sends node capture events and retargeting status to client
- `server/src/services/RetargetingService.ts` - `retargetBattalionsAfterCapture()` handles post-capture retargeting logic
- `server/src/types/battle.ts` - Defines `RetargetingTask` with `node_capture` trigger type and `capturedNodeIndex`
- `server/src/controllers/BattleController.ts` - Sends captured node state to client
- `mobile/src/store/api/battleApi.ts` - Client-side node capture event handling
- `server/__tests__/nodeCaptureRetargeting.test.ts` - Tests node capture retargeting behavior
- `server/__tests__/selectiveRetargeting.test.ts` - Tests selective retargeting (only affected battalions)
- `mobile/__tests__/components/battle/nodeCaptureRetargeting.test.tsx` - Tests visual node capture behavior
- `mobile/__tests__/components/battle/selectiveRetargeting.test.tsx` - Tests visual selective retargeting

##### **Discrepancies:**
- **Node Capture Detection**: intended.md states "applyTugOfWarDamage(), isNodeCaptured() handle node capture detection and completion" and CombatService.ts correctly implements both methods ✅ **CORRECT**
- **Node Capture Retargeting**: intended.md states "queueRetargetingTask(), executeRetargetingTask(), getMovingBattalionsTargetingNode() manage node capture retargeting" and AttackService.ts correctly implements all three methods ✅ **CORRECT**
- **Client Communication**: intended.md states "Sends node capture events and retargeting status to client" and BattleResponseService.ts correctly includes retargetingStatus in response ✅ **CORRECT**
- **Post-Capture Retargeting**: intended.md states "retargetBattalionsAfterCapture() handles post-capture retargeting logic" and RetargetingService.ts correctly implements the method ✅ **CORRECT**
- **Retargeting Task Type**: intended.md states "Defines RetargetingTask with node_capture trigger type and capturedNodeIndex" and battle.ts correctly defines both properties ✅ **CORRECT**
- **Captured Node State**: intended.md states "Sends captured node state to client" and BattleController.ts correctly sends node state including owner and tugOfWarProgress ✅ **CORRECT**
- **Client-Side Handling**: intended.md states "Client-side node capture event handling" and battleApi.ts correctly defines node types with owner and tugOfWarProgress ✅ **CORRECT**
- **Node Capture Tests**: intended.md states "Tests node capture retargeting behavior" and nodeCaptureRetargeting.test.ts correctly tests node capture and ownership change ✅ **CORRECT**
- **Selective Retargeting Tests**: intended.md states "Tests selective retargeting (only affected battalions)" and selectiveRetargeting.test.ts correctly tests that only affected battalions retarget ✅ **CORRECT**
- **Visual Node Capture Tests**: intended.md states "Tests visual node capture behavior" and nodeCaptureRetargeting.test.tsx correctly tests visual capture behavior ✅ **CORRECT**
- **Visual Selective Retargeting Tests**: intended.md states "Tests visual selective retargeting" and selectiveRetargeting.test.tsx correctly tests visual selective retargeting ✅ **CORRECT**
- **❌ MISSING: Movement Interruption Logic**: intended.md states "Only battalions attacking or targeting the captured node stop attacking or moving and retarget" but while AttackService.ts has `getMovingBattalionsTargetingNode()`, there's no explicit logic to stop movements targeting captured nodes
- **❌ MISSING: Attack Stopping Logic**: intended.md states "Only battalions attacking or targeting the captured node stop attacking" but there's no explicit logic in the codebase to stop attacks on captured nodes - this appears to be handled implicitly in `processActiveAttacks()`
- **❌ MISSING: Other Battalions Continuation**: intended.md states "Other battalions continue attacking their current targets until those nodes are captured" but there's no explicit validation to ensure unaffected battalions continue their current behavior

## 11. Battalion Destruction Events
- **When a battalion is destroyed:** Any enemy battalions targeting it must immediately retarget
- **Retargeting queue:** Battalion destruction events are processed sequentially to prevent race conditions
- **Destruction updates:** Battalions targeting destroyed battalions stop movement and find new targets

#### **Associated Files:**
- `server/src/services/CombatService.ts` - `applyBattalionDamage()` detects when battalion health reaches 0 and triggers destruction
- `server/src/services/AttackService.ts` - `queueBattalionDestructionRetargeting()`, `executeBattalionDestructionRetargeting()`, `clearBattalionAttacks()` handle destruction retargeting
- `server/src/services/AttackService.ts` - `executeUnifiedRetargeting()` with 'BATTALION_DESTRUCTION' source handles unified retargeting logic
- `server/src/services/BattalionMappingService.ts` - `isDestroyed`, `destroyedAt` track battalion destruction state
- `server/src/services/RetargetingService.ts` - `retargetBattalionsAfterCapture()` handles post-destruction retargeting (same logic as node capture)
- `server/src/types/battle.ts` - Defines `RetargetingTask` with `battalion_destruction` trigger type and `destroyedBattalionId`
- `server/src/types/battle.ts` - Defines `IBattalion` with `isDestroyed`, `destroyedAt` fields
- `server/src/models/Battle.ts` - Database schema for battalion destruction fields
- `server/__tests__/selectiveRetargeting.test.ts` - Tests battalion destruction retargeting behavior
- `server/__tests__/initialCombatPhase.test.ts` - Tests battalion destruction detection

##### **Discrepancies:**
- **Battalion Destruction Detection**: intended.md states "applyBattalionDamage() detects when battalion health reaches 0 and triggers destruction" and CombatService.ts correctly implements this with `defender.currentHealth <= 0` check ✅ **CORRECT**
- **Destruction Retargeting**: intended.md states "queueBattalionDestructionRetargeting(), executeBattalionDestructionRetargeting(), clearBattalionAttacks() handle destruction retargeting" and AttackService.ts correctly implements all three methods ✅ **CORRECT**
- **Unified Retargeting Logic**: intended.md states "executeUnifiedRetargeting() with 'BATTALION_DESTRUCTION' source handles unified retargeting logic" and AttackService.ts correctly implements this with proper source parameter ✅ **CORRECT**
- **Destruction State Tracking**: intended.md states "isDestroyed, destroyedAt track battalion destruction state" and BattalionMappingService.ts correctly filters out destroyed battalions ✅ **CORRECT**
- **Post-Destruction Retargeting**: intended.md states "retargetBattalionsAfterCapture() handles post-destruction retargeting (same logic as node capture)" and RetargetingService.ts correctly implements this ✅ **CORRECT**
- **Retargeting Task Type**: intended.md states "Defines RetargetingTask with battalion_destruction trigger type and destroyedBattalionId" and battle.ts correctly defines both properties ✅ **CORRECT**
- **Battalion Interface**: intended.md states "Defines IBattalion with isDestroyed, destroyedAt fields" and battle.ts correctly defines both fields ✅ **CORRECT**
- **Database Schema**: intended.md states "Database schema for battalion destruction fields" and Battle.ts correctly defines isDestroyed and destroyedAt fields ✅ **CORRECT**
- **Destruction Retargeting Tests**: intended.md states "Tests battalion destruction retargeting behavior" and selectiveRetargeting.test.ts correctly tests retargeting behavior ✅ **CORRECT**
- **Destruction Detection Tests**: intended.md states "Tests battalion destruction detection" and initialCombatPhase.test.ts correctly tests damage application ✅ **CORRECT**
- **❌ MISSING: Immediate Retargeting Logic**: intended.md states "Any enemy battalions targeting it must immediately retarget" but while the system queues retargeting, there's no explicit "immediate" logic - the retargeting is processed through the queue system
- **❌ MISSING: Movement Stopping Logic**: intended.md states "Battalions targeting destroyed battalions stop movement and find new targets" but there's no explicit logic to stop movements targeting destroyed battalions
- **❌ MISSING: Sequential Processing Validation**: intended.md states "Battalion destruction events are processed sequentially to prevent race conditions" but while the queue system exists, there's no explicit validation that ensures sequential processing

## 12. Battalion Movement Events
- **When a battalion moves:** All enemy battalions targeting it receive immediate notification
- **Dynamic pursuit:** Targeting battalions adjust their movement to meet the target at its new destination
- **Real-time coordination:** Both moving battalion and pursuing battalions update positions continuously
- **Priority notifications:** Movement updates are processed as high-priority queue events

#### **Associated Files:**
- `server/src/services/MovementService.ts` - `updateBattleMovement()`, `updateMovementProgress()`, `startMovementUpdates()`, `stopMovementUpdates()` handle movement state updates
- `server/src/services/BattalionService.ts` - `startMovementUpdates()`, `stopMovementUpdates()`, `updateBattleMovement()` coordinate movement updates
- `server/src/services/BattalionMappingService.ts` - `mapBattalionsForClient()` sends updated battalion positions to client
- `server/src/services/BattleService.ts` - `startMovementUpdates()`, `stopMovementUpdates()` manage movement update lifecycle
- `server/src/controllers/BattleController.ts` - Sends updated battalion positions and movement states to client
- `mobile/src/components/battle/BattleBattalionManager.tsx` - Visual battalion positioning and movement display
- `server/src/types/battle.ts` - Defines `MovementState` with `wasPositionUpdated`, `movementStatus`, `movementType`
- `server/__tests__/battalionNetworkLineAdherence.test.ts` - Tests that battalions stay on network lines during movement
- `mobile/__tests__/components/battle/battalionNetworkLineAdherence.test.tsx` - Tests visual battalion movement adherence to network lines

##### **Discrepancies:**
- **Movement State Updates**: intended.md states "updateBattleMovement(), updateMovementProgress(), startMovementUpdates(), stopMovementUpdates() handle movement state updates" and MovementService.ts correctly implements all four methods ✅ **CORRECT**
- **Movement Coordination**: intended.md states "startMovementUpdates(), stopMovementUpdates(), updateBattleMovement() coordinate movement updates" and BattalionService.ts correctly implements all three methods ✅ **CORRECT**
- **Client Position Mapping**: intended.md states "mapBattalionsForClient() sends updated battalion positions to client" and BattalionMappingService.ts correctly maps battalion positions with movement states ✅ **CORRECT**
- **Movement Update Lifecycle**: intended.md states "startMovementUpdates(), stopMovementUpdates() manage movement update lifecycle" and BattleService.ts correctly manages the lifecycle ✅ **CORRECT**
- **Client Position Updates**: intended.md states "Sends updated battalion positions and movement states to client" and BattleController.ts correctly sends movement states in getBattleState() ✅ **CORRECT**
- **Visual Movement Display**: intended.md states "Visual battalion positioning and movement display" and BattleBattalionManager.tsx correctly renders battalions with movement states ✅ **CORRECT**
- **Movement State Interface**: intended.md states "Defines MovementState with wasPositionUpdated, movementStatus, movementType" and battle.ts correctly defines all three properties ✅ **CORRECT**
- **Network Line Adherence Tests**: intended.md states "Tests that battalions stay on network lines during movement" and battalionNetworkLineAdherence.test.ts correctly tests network line adherence ✅ **CORRECT**
- **Visual Network Adherence Tests**: intended.md states "Tests visual battalion movement adherence to network lines" and battalionNetworkLineAdherence.test.tsx correctly tests visual adherence ✅ **CORRECT**
- **❌ MISSING: Immediate Notification Logic**: intended.md states "When a battalion moves: All enemy battalions targeting it receive immediate notification" but there's no explicit logic to notify enemy battalions when a battalion moves
- **❌ MISSING: Dynamic Pursuit Logic**: intended.md states "Dynamic pursuit: Targeting battalions adjust their movement to meet the target at its new destination" but there's no explicit logic to adjust pursuit paths when targets move
- **❌ MISSING: Real-time Coordination**: intended.md states "Real-time coordination: Both moving battalion and pursuing battalions update positions continuously" but while position updates exist, there's no explicit coordination between moving and pursuing battalions
- **❌ MISSING: Priority Queue Processing**: intended.md states "Priority notifications: Movement updates are processed as high-priority queue events" but while movement updates exist, there's no explicit priority queue system for movement notifications

## 13. Sequential Movement Phase
- Battalions cannot retarget during attacking phase until node capture or battalion destruction, depending on target respectively
- Battalions who retarget immediately begin movement upon finding a new target

#### **Associated Files:**
- `server/src/services/MovementService.ts` - `ensureMovementTypeProgression()` enforces proper movement type progression: initial → retargeting → interrupted_recovery → retargeting
- `server/src/services/MovementService.ts` - `initiateRetargetingMovement()` starts movement immediately after retargeting
- `server/src/services/AttackService.ts` - `initiateRetargetingMovement()` coordinates retargeting and movement initiation
- `server/src/services/TargetingService.ts` - Handles initial targeting (pre-retargeting context)
- `server/src/services/PathfindingService.ts` - Used for retargeting pathfinding (vs initial targeting)
- `server/src/types/battle.ts` - Defines `MovementState` with `movementType`: 'initial' | 'retargeting' | 'interrupted_recovery'
- `mobile/src/types/battleTypes.ts` - Client-side movement type definitions
- `server/__tests__/initialMovement.test.ts` - Tests initial movement phase behavior
- `mobile/__tests__/components/battle/initialMovement.test.tsx` - Tests visual initial movement phase

##### **Discrepancies:**
- **Movement Type Progression**: intended.md states "ensureMovementTypeProgression() enforces proper movement type progression: initial → retargeting → interrupted_recovery → retargeting" and MovementService.ts correctly implements this with valid transitions ✅ **CORRECT**
- **Retargeting Movement Initiation**: intended.md states "initiateRetargetingMovement() starts movement immediately after retargeting" and MovementService.ts correctly implements this with proper movement state creation ✅ **CORRECT**
- **Retargeting Coordination**: intended.md states "initiateRetargetingMovement() coordinates retargeting and movement initiation" and AttackService.ts correctly implements this by calling MovementService.initiateMovement() ✅ **CORRECT**
- **Initial Targeting**: intended.md states "Handles initial targeting (pre-retargeting context)" and TargetingService.ts correctly implements assignInitialTargets() for random neutral node selection ✅ **CORRECT**
- **Retargeting Pathfinding**: intended.md states "Used for retargeting pathfinding (vs initial targeting)" and PathfindingService.ts correctly implements findNetworkPath() for full pathfinding ✅ **CORRECT**
- **Movement State Interface**: intended.md states "Defines MovementState with movementType: 'initial' | 'retargeting' | 'interrupted_recovery'" and battle.ts correctly defines all three movement types ✅ **CORRECT**
- **Client Movement Types**: intended.md states "Client-side movement type definitions" and battleTypes.ts correctly defines movement types for client ✅ **CORRECT**
- **Initial Movement Tests**: intended.md states "Tests initial movement phase behavior" and initialMovement.test.ts correctly tests random neutral node assignment ✅ **CORRECT**
- **Visual Initial Movement Tests**: intended.md states "Tests visual initial movement phase" and initialMovement.test.tsx correctly tests visual behavior ✅ **CORRECT**
- **❌ MISSING: Retargeting Restriction Logic**: intended.md states "Battalions cannot retarget during attacking phase until node capture or battalion destruction" but there's no explicit logic to prevent retargeting while attacking
- **❌ MISSING: Immediate Movement Logic**: intended.md states "Battalions who retarget immediately begin movement upon finding a new target" but while movement is initiated, there's no explicit "immediate" timing validation

## 14. Immediate Response Events (Priority Queue Processing):
1. **Node Capture:** 
   - Immediately stop all attacks on captured node
   - Immediately interrupt all movements targeting captured node
   - Update battalion positions to interruption point
   - Trigger retargeting with updated positions
   
2. **Battalion Destruction:**
   - Immediately remove destroyed battalion from battle
   - Immediately stop all targeting/attacking of destroyed battalion
   - Immediately interrupt all movements targeting destroyed battalion
   - Trigger retargeting for all affected battalions
   
3. **Battalion Movement:**
   - Immediately notify all battalions targeting the moving battalion
   - Update pursuit paths to new destination
   - Recalculate movement timing and positioning

#### **Associated Files:**
- `server/src/services/AttackService.ts` - `processRetargetingQueue()`, `executeRetargetingTask()` with 50ms delays between tasks to prevent race conditions
- `server/src/services/AttackService.ts` - `RETARGETING_PRIORITIES` defines priority levels: BATTALION_DESTRUCTION(1), INTERRUPTED_RECOVERY(1), NODE_CAPTURE(2), MISSING_TARGET(2)
- `server/src/services/AttackService.ts` - `queueRetargetingTask()` creates priority-sorted retargeting tasks
- `server/src/services/MovementService.ts` - `interruptRetargetingMovement()` immediately stops movements targeting invalid targets
- `server/src/services/CombatService.ts` - `applyTugOfWarDamage()`, `applyBattalionDamage()` trigger immediate response events
- `server/src/services/BattalionPositionService.ts` - `createInterruptionPosition()` updates battalion positions to interruption point
- `server/src/types/battle.ts` - Defines `RetargetingTask` with priority and trigger type fields
- `server/__tests__/selectiveRetargeting.test.ts` - Tests immediate stopping of attacks on captured nodes

##### **Discrepancies:**
- **Retargeting Queue Processing**: intended.md states "processRetargetingQueue(), executeRetargetingTask() with 50ms delays between tasks to prevent race conditions" and AttackService.ts correctly implements this with 50ms delays ✅ **CORRECT**
- **Priority Levels**: intended.md states "RETARGETING_PRIORITIES defines priority levels: BATTALION_DESTRUCTION(1), INTERRUPTED_RECOVERY(1), NODE_CAPTURE(2), MISSING_TARGET(2)" and AttackService.ts correctly defines all four priority levels ✅ **CORRECT**
- **Priority-Sorted Tasks**: intended.md states "queueRetargetingTask() creates priority-sorted retargeting tasks" and AttackService.ts correctly implements priority sorting ✅ **CORRECT**
- **Movement Interruption**: intended.md states "interruptRetargetingMovement() immediately stops movements targeting invalid targets" and MovementService.ts correctly implements this ✅ **CORRECT**
- **Immediate Response Events**: intended.md states "applyTugOfWarDamage(), applyBattalionDamage() trigger immediate response events" and CombatService.ts correctly implements both methods ✅ **CORRECT**
- **Interruption Position Updates**: intended.md states "createInterruptionPosition() updates battalion positions to interruption point" but BattalionPositionService.ts doesn't have this method - it has `createStartPositionFromInterruption()` instead ❌ **MISSING**
- **Retargeting Task Interface**: intended.md states "Defines RetargetingTask with priority and trigger type fields" and battle.ts correctly defines both fields ✅ **CORRECT**
- **Immediate Attack Stopping Tests**: intended.md states "Tests immediate stopping of attacks on captured nodes" and selectiveRetargeting.test.ts correctly tests this behavior ✅ **CORRECT**
- **❌ MISSING: Node Capture Immediate Response**: intended.md states "Immediately stop all attacks on captured node" but while the system stops attacks, there's no explicit "immediate" timing validation
- **❌ MISSING: Movement Interruption Logic**: intended.md states "Immediately interrupt all movements targeting captured node" but while the system interrupts movements, there's no explicit validation for all movements targeting the node
- **❌ MISSING: Battalion Destruction Immediate Response**: intended.md states "Immediately remove destroyed battalion from battle" but while the system marks battalions as destroyed, there's no explicit "immediate" removal logic
- **❌ MISSING: Battalion Movement Notifications**: intended.md states "Immediately notify all battalions targeting the moving battalion" but there's no explicit notification system for battalion movement events
- **❌ MISSING: Pursuit Path Updates**: intended.md states "Update pursuit paths to new destination" but there's no explicit logic to update pursuit paths when targets move
- **❌ MISSING: Movement Timing Recalculation**: intended.md states "Recalculate movement timing and positioning" but there's no explicit logic to recalculate timing when targets move

## 15. Combat Queue System:
- **Attack queue:** All battalion attacks are queued to prevent race conditions
- **Damage processing:** Sequential damage application with health/unit recalculation
- **Destruction handling:** Immediate removal and retargeting trigger when health ≤ 0
- **Movement coordination:** Dynamic pursuit and interception calculations
- **Position updates:** Real-time battalion position tracking for accurate retargeting

#### **Associated Files:**
- `server/src/services/AttackService.ts` - `processActiveAttacks()` processes all queued attacks with timing intervals
- `server/src/services/AttackService.ts` - `processUnifiedAttack()` handles both battalion-to-battalion and node attacks
- `server/src/services/AttackService.ts` - `attackStates` Map tracks all active attack states
- `server/src/services/AttackService.ts` - `getBattalionsAttackingSpecificNode()` finds battalions attacking specific nodes
- `server/src/services/AttackService.ts` - `clearBattalionAttacks()` removes attack states for destroyed battalions
- `server/src/services/AttackService.ts` - `getActiveAttacks()`, `getAttackState()`, `isAttacking()` manage attack state queries
- `server/src/services/MovementService.ts` - Calls `processActiveAttacks()` after movement updates
- `server/src/types/battle.ts` - Defines `AttackState` interface with attack timing and target information
- `mobile/src/types/battleTypes.ts` - Client-side attack state types
- `server/__tests__/attackService.test.ts` - Tests attack processing with correct timing intervals
- `server/__tests__/selectiveRetargeting.test.ts` - Tests attack state management and cleanup

##### **Discrepancies:**
- **Attack Queue Processing**: intended.md states "processActiveAttacks() processes all queued attacks with timing intervals" and AttackService.ts correctly implements this with timing-based processing ✅ **CORRECT**
- **Unified Attack Handling**: intended.md states "processUnifiedAttack() handles both battalion-to-battalion and node attacks" and AttackService.ts correctly implements this with unified processing ✅ **CORRECT**
- **Attack States Tracking**: intended.md states "attackStates Map tracks all active attack states" and AttackService.ts correctly implements this with a Map ✅ **CORRECT**
- **Specific Node Attack Finding**: intended.md states "getBattalionsAttackingSpecificNode() finds battalions attacking specific nodes" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Destroyed Battalion Cleanup**: intended.md states "clearBattalionAttacks() removes attack states for destroyed battalions" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Attack State Management**: intended.md states "getActiveAttacks(), getAttackState(), isAttacking() manage attack state queries" and AttackService.ts correctly implements all three methods ✅ **CORRECT**
- **Movement-Attack Coordination**: intended.md states "Calls processActiveAttacks() after movement updates" and MovementService.ts correctly calls this in coordinateMovementState() ✅ **CORRECT**
- **Attack State Interface**: intended.md states "Defines AttackState interface with attack timing and target information" and battle.ts correctly defines this interface ✅ **CORRECT**
- **Client Attack State Types**: intended.md states "Client-side attack state types" but battleTypes.ts doesn't define AttackState - it only has MovementState ❌ **MISSING**
- **Attack Processing Tests**: intended.md states "Tests attack processing with correct timing intervals" and attackService.test.ts correctly tests timing intervals ✅ **CORRECT**
- **Attack State Management Tests**: intended.md states "Tests attack state management and cleanup" and selectiveRetargeting.test.ts correctly tests state management ✅ **CORRECT**
- **❌ MISSING: Sequential Damage Processing**: intended.md states "Sequential damage application with health/unit recalculation" but while damage is applied, there's no explicit validation that it's processed sequentially
- **❌ MISSING: Immediate Destruction Handling**: intended.md states "Immediate removal and retargeting trigger when health ≤ 0" but while destruction triggers retargeting, there's no explicit "immediate" timing validation
- **❌ MISSING: Dynamic Pursuit Calculations**: intended.md states "Dynamic pursuit and interception calculations" but there's no explicit pursuit or interception calculation logic
- **❌ MISSING: Real-time Position Tracking**: intended.md states "Real-time battalion position tracking for accurate retargeting" but while positions are tracked, there's no explicit "real-time" validation

## 16. Ongoing Combat
- Battalions continue attacking and retargeting until battle ends or until all opposing battalions are defeated
- Process repeats: attack → capture → retarget → move → attack
- Battalion-to-battalion combat with health/destruction

#### **Associated Files:**
- `server/src/services/BattleService.ts` - `endBattle()`, `handleBattleEnd()` manage battle termination
- `server/src/services/BattleTimer.ts` - `endBattle()` triggers battle end when timer expires
- `server/src/services/AttackService.ts` - `processActiveAttacks()` continues processing attacks until battle ends
- `server/src/services/AttackService.ts` - `processUnifiedAttack()` handles ongoing battalion-to-battalion combat
- `server/src/services/CombatService.ts` - `applyBattalionDamage()` tracks battalion destruction for battle end condition
- `server/src/services/MovementService.ts` - `updateBattleMovement()` continues movement updates throughout battle
- `server/src/services/RetargetingService.ts` - `retargetBattalionsAfterCapture()` handles ongoing retargeting cycles
- `server/src/models/Battle.ts` - `endBattle()` method updates battle state and determines winner
- `server/src/types/battle.ts` - Defines `IBattle` interface with battle lifecycle fields
- `server/src/controllers/BattleController.ts` - `startBattle()` initiates ongoing combat process
- `mobile/src/store/api/battleApi.ts` - Client-side battle state management for ongoing combat
- `server/__tests__/selectiveRetargeting.test.ts` - Tests ongoing attack and retargeting cycles

##### **Discrepancies:**
- **Battle Termination Management**: intended.md states "endBattle(), handleBattleEnd() manage battle termination" and BattleService.ts correctly implements both methods ✅ **CORRECT**
- **Timer Battle End**: intended.md states "endBattle() triggers battle end when timer expires" and BattleTimer.ts correctly implements this ✅ **CORRECT**
- **Attack Processing Continuation**: intended.md states "processActiveAttacks() continues processing attacks until battle ends" and AttackService.ts correctly implements this with phase check ✅ **CORRECT**
- **Battalion Combat Handling**: intended.md states "processUnifiedAttack() handles ongoing battalion-to-battalion combat" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Battalion Destruction Tracking**: intended.md states "applyBattalionDamage() tracks battalion destruction for battle end condition" and CombatService.ts correctly implements this ✅ **CORRECT**
- **Movement Updates Continuation**: intended.md states "updateBattleMovement() continues movement updates throughout battle" and MovementService.ts correctly implements this ✅ **CORRECT**
- **Retargeting Cycles**: intended.md states "retargetBattalionsAfterCapture() handles ongoing retargeting cycles" and RetargetingService.ts correctly implements this ✅ **CORRECT**
- **Battle State Updates**: intended.md states "endBattle() method updates battle state and determines winner" and Battle.ts correctly implements this ✅ **CORRECT**
- **Battle Lifecycle Interface**: intended.md states "Defines IBattle interface with battle lifecycle fields" and battle.ts correctly defines all required fields ✅ **CORRECT**
- **Combat Process Initiation**: intended.md states "startBattle() initiates ongoing combat process" and BattleController.ts correctly implements this ✅ **CORRECT**
- **Client Battle State Management**: intended.md states "Client-side battle state management for ongoing combat" and battleApi.ts correctly implements this ✅ **CORRECT**
- **Ongoing Combat Tests**: intended.md states "Tests ongoing attack and retargeting cycles" and selectiveRetargeting.test.ts correctly tests this ✅ **CORRECT**
- **❌ MISSING: Battle End Condition Logic**: intended.md states "Battalions continue attacking and retargeting until battle ends or until all opposing battalions are defeated" but there's no explicit logic to check if all opposing battalions are defeated
- **❌ MISSING: Process Repetition Validation**: intended.md states "Process repeats: attack → capture → retarget → move → attack" but there's no explicit validation that this cycle repeats correctly
- **❌ MISSING: Health/Destruction Combat**: intended.md states "Battalion-to-battalion combat with health/destruction" but while health/destruction exists, there's no explicit validation of the combat cycle 