# C. Targeting System (Two Distinct Behaviors)

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

## 5. Initial Targeting (Battle Start)
- When countdown ends, battalions randomly pick neutral nodes (3,4,5) to attack
- **Random selection** - no proximity or strategic considerations
- **Targets:** Only neutral nodes (3,4,5)

#### **Associated Files:**
- `server/src/services/TargetingService.ts` - `assignInitialTargets()` handles random neutral node selection
- `server/src/services/BattalionService.ts` - `triggerInitialTargeting()` coordinates initial targeting process
- `server/src/services/BattleService.ts` - `triggerInitialTargeting()` called when countdown ends
- `server/src/services/BattleTimer.ts` - `startBattlePhase()` triggers initial targeting when countdown reaches 0
- `server/src/controllers/BattleController.ts` - Calls initial targeting after countdown completion
- `server/src/services/BattleResponseService.ts` - Sends targeting results to client
- `server/__tests__/initialMovement.test.ts` - Tests random neutral node assignment
- `mobile/__tests__/components/battle/initialMovement.test.tsx` - Tests initial movement visual behavior

##### **Discrepancies:**
- **Random Neutral Node Selection**: intended.md states "battalions randomly pick neutral nodes (3,4,5)" and TargetingService.ts correctly implements `assignInitialTargets()` with `Math.floor(Math.random() * validTargets.length)` ✅ **CORRECT**
- **Neutral Node Filtering**: intended.md states "Targets: Only neutral nodes (3,4,5)" and TargetingService.ts correctly filters with `nodes.filter(node => node.owner === NodeOwner.NEUTRAL)` ✅ **CORRECT**
- **Initial Targeting Coordination**: intended.md states "triggerInitialTargeting() coordinates initial targeting process" and BattalionService.ts correctly calls `TargetingService.assignInitialTargeting()` ✅ **CORRECT**
- **Countdown End Trigger**: intended.md states "triggerInitialTargeting() called when countdown ends" and BattleService.ts correctly implements `triggerInitialTargeting()` method ✅ **CORRECT**
- **Timer Phase Change**: intended.md states "startBattlePhase() triggers initial targeting when countdown reaches 0" and BattleTimer.ts correctly emits `phaseChange` event when countdown reaches 0 ✅ **CORRECT**
- **Controller Integration**: intended.md states "Calls initial targeting after countdown completion" and BattleController.ts correctly calls `this.battleService.triggerInitialTargeting(battleId)` when `currentPhase === BattlePhase.ACTIVE && currentCountdown === 0` ✅ **CORRECT**
- **Response Service**: intended.md states "Sends targeting results to client" and BattleResponseService.ts correctly includes `targetingResults` in the response ✅ **CORRECT**
- **Test Coverage**: intended.md states "Tests random neutral node assignment" and initialMovement.test.ts correctly tests random selection with multiple iterations ✅ **CORRECT**
- **Visual Test Coverage**: intended.md states "Tests initial movement visual behavior" and initialMovement.test.tsx correctly verifies neutral nodes and battalion positions ✅ **CORRECT**

## 6. Retargeting (During Battle)
- Retargeting finds the NEAREST target using network pathfinding:
  - **Targets:** EITHER uncaptured neutral nodes OR enemy battalions
  - **Selection:** Whichever is closer to the battalion's current position
  - **No priority system:** Pure proximity-based selection
- Distance measured along network paths, not straight lines
- **For equidistant targets:** Random selection
- **Retargeting queuing:** Multiple simultaneous captures are processed in sequence to avoid race conditions

#### **Associated Files:**
- `server/src/services/RetargetingService.ts` - `findClosestTarget()` and `retargetBattalionsAfterCapture()` handle nearest target selection
- `server/src/services/AttackService.ts` - `queueRetargetingTask()`, `processRetargetingQueue()`, `executeRetargetingTask()` manage retargeting queue
- `server/src/services/PathfindingService.ts` - `findNetworkPath()` calculates network distances for proximity-based selection
- `server/src/services/BattalionService.ts` - `updateTargetingResults()` updates battalion targeting after retargeting
- `server/src/services/MovementService.ts` - `initiateRetargetingMovement()` starts movement to new targets
- `server/__tests__/nearestTargetRetargeting.test.ts` - Tests nearest target selection logic
- `server/__tests__/selectiveRetargeting.test.ts` - Tests selective retargeting behavior
- `mobile/__tests__/components/battle/nearestTargetRetargeting.test.tsx` - Tests visual retargeting behavior
- `mobile/__tests__/components/battle/selectiveRetargeting.test.tsx` - Tests selective retargeting visual behavior

##### **Discrepancies:**
- **Nearest Target Selection**: intended.md states "Retargeting finds the NEAREST target using network pathfinding" and RetargetingService.ts correctly implements `findClosestTarget()` with `closestDistance` tracking ✅ **CORRECT**
- **Target Types**: intended.md states "Targets: EITHER uncaptured neutral nodes OR enemy battalions" and RetargetingService.ts correctly evaluates both neutral nodes and enemy battalions ✅ **CORRECT**
- **Proximity-Based Selection**: intended.md states "Selection: Whichever is closer to the battalion's current position" and RetargetingService.ts correctly uses `distance < closestDistance` logic ✅ **CORRECT**
- **Network Pathfinding**: intended.md states "Distance measured along network paths, not straight lines" and PathfindingService.ts correctly implements `findNetworkPath()` using BFS algorithm ✅ **CORRECT**
- **Equidistant Random Selection**: intended.md states "For equidistant targets: Random selection" and RetargetingService.ts correctly implements `candidateTargets[Math.floor(Math.random() * candidateTargets.length)]` ✅ **CORRECT**
- **Retargeting Queue Management**: intended.md states "Retargeting queuing: Multiple simultaneous captures are processed in sequence" and AttackService.ts correctly implements `processRetargetingQueue()` with priority sorting ✅ **CORRECT**
- **Targeting Results Update**: intended.md states "updateTargetingResults() updates battalion targeting after retargeting" and BattalionService.ts correctly updates targeting results ✅ **CORRECT**
- **Movement Initiation**: intended.md states "initiateRetargetingMovement() starts movement to new targets" and MovementService.ts correctly implements `initiateRetargetingMovement()` ✅ **CORRECT**
- **Test Coverage**: intended.md states "Tests nearest target selection logic" and nearestTargetRetargeting.test.ts correctly tests network pathfinding and distance calculation ✅ **CORRECT**
- **Selective Retargeting Tests**: intended.md states "Tests selective retargeting behavior" and selectiveRetargeting.test.ts correctly tests that only affected battalions are retargeted ✅ **CORRECT** 