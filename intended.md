# Intended Battle Flow

## A. Battle Initialization & Setup

### **1. Battle Start**
- User clicks "Deploy Purge" in BattlePreparationScreen
- 3-second countdown timer starts
- Battalions spawn at their home nodes (0,1,2 for attacker, 6,7,8 for defender)
  - **Note**: In MMO context, "attacker" and "defender" are relative to whoever initiated the battle. When viewing a saved battle, the original attacker's battalions are at nodes 0,1,2 and the original defender's battalions are at nodes 6,7,8, regardless of who is currently viewing the battle.

#### **Associated Files:**
- `mobile/src/screens/BattlePreparationScreen.tsx` - "Deploy Purge" button and battle start UI
- `mobile/src/components/battle/BattleCountdownOverlay.tsx` - 3-second countdown display
- `mobile/src/components/battle/BattleOverlayManager.tsx` - Manages countdown overlay visibility
- `mobile/src/store/api/battleApi.ts` - startBattle API mutation
- `server/src/controllers/BattleController.ts` - Handles battle start request
- `server/src/routes/battle.ts` - Battle start API endpoint
- `server/src/services/BattleSetupService.ts` - Creates battle with countdown phase
- `server/src/services/BattalionService.ts` - Creates and spawns battalions at home nodes
- `server/src/services/BattleTimer.ts` - Manages 3-second countdown timer
- `server/src/services/BattleService.ts` - Coordinates battle initialization
- `server/src/services/BattleResponseService.ts` - Sends countdown updates to client

##### **Discrepancies:**
- **Button Text Mismatch**: intended.md specifies "Deploy Purge" button, but BattlePreparationScreen.tsx shows "DEPLOY PURGE" (all caps) - this is a minor UI consistency issue
- **Battalion Spawning Logic**: intended.md states battalions spawn at "home nodes (0,1,2 for attacker, 6,7,8 for defender)" but BattalionService.ts shows:
  - Attacker battalions: `nodeIndex = index` (0,1,2) ✅ **CORRECT**
  - Defender battalions: `nodeIndex = index + 6` (6,7,8) ✅ **CORRECT**
  - **Note**: In MMO context, "attacker" and "defender" are relative to whoever initiated the battle. When viewing a saved battle, the original attacker's battalions are at nodes 0,1,2 and the original defender's battalions are at nodes 6,7,8, regardless of who is currently viewing the battle.
- **Countdown Timer**: intended.md specifies "3-second countdown timer" and BattleTimer.ts shows `COUNTDOWN_DURATION: 3` ✅ **CORRECT**
- **Battle Phase Initialization**: intended.md doesn't specify initial phase, but BattleSetupService.ts sets `phase: BattlePhase.COUNTDOWN` ✅ **CORRECT**
- **Timer Service Integration**: intended.md doesn't specify timer service usage, but BattleService.ts properly calls `this.timerService.startTimer(battle.battleId)` ✅ **CORRECT**
- **API Response Structure**: intended.md doesn't specify response format, but BattleResponseService.ts properly handles countdown updates ✅ **CORRECT**

## B. Movement System (Consistent Throughout Battle)

### **2. Movement Behavior**
- Battalions move along network lines following network topology
- **Intermediate node movement:** Battalion center moves to node center for network pathfinding
- **Final target movement:** Battalion stops at attack range distance, NOT on the node center
- Movement follows their speed stats and takes time
- Move node-by-node along calculated network paths
- Move to node centers for intermediate nodes to access new network connections
- Stop at attack range for the final target (closest network position with line-of-sight)
- Movement respects network topology - no shortcuts or jumps

#### **Associated Files:**
- `server/src/services/MovementService.ts` - Main movement coordination and state management
- `server/src/services/MovementCalculationService.ts` - Pure movement calculations and attack range positioning
- `server/src/services/BattalionPositionService.ts` - Battalion position updates and validation
- `server/src/services/PathfindingService.ts` - Network pathfinding and route calculation
- `server/src/services/TargetingService.ts` - Initial targeting pathfinding (direct connections)
- `server/src/services/BattalionService.ts` - Coordinates movement updates and targeting results
- `mobile/src/components/battle/BattleBattalionManager.tsx` - Visual battalion positioning and movement display
- `mobile/src/components/battle/BattleBattalion.tsx` - Individual battalion visual rendering and attack range display
- `mobile/__tests__/components/battle/movementSpeed.test.tsx` - Tests movement speed follows bot stats
- `mobile/__tests__/components/battle/battalionAttackRange.test.tsx` - Tests attack range positioning
- `mobile/__tests__/components/battle/battalionNetworkLineAdherence.test.tsx` - Tests network line adherence
- `server/__tests__/movementSpeed.test.ts` - Server-side movement speed tests
- `server/__tests__/battalionAttackRange.test.ts` - Server-side attack range tests
- `server/__tests__/battalionNetworkLineAdherence.test.ts` - Server-side network line adherence tests

##### **Discrepancies:**
- **Movement Speed Calculation**: intended.md states "Movement follows their speed stats and takes time" and MovementCalculationService.ts correctly implements `calculateMovementDuration(battalion)` using `BASE_MOVEMENT_TIME_MS / battalion.stats.speed` ✅ **CORRECT**
- **Attack Range Positioning**: intended.md states "Battalion stops at attack range distance, NOT on the node center" and MovementCalculationService.ts correctly implements `calculateAttackRangePosition()` that stops at `rangeInPixels = battalion.stats.range * 8` distance from target ✅ **CORRECT**
- **Network Pathfinding**: intended.md states "Move node-by-node along calculated network paths" and PathfindingService.ts correctly implements `findNetworkPath()` using BFS algorithm ✅ **CORRECT**
- **Network Line Adherence**: intended.md states "Movement respects network topology - no shortcuts or jumps" and MovementCalculationService.ts correctly implements `interpolateAlongNetworkLine()` for movement along network connections ✅ **CORRECT**
- **Intermediate Node Movement**: intended.md states "Battalion center moves to node center for network pathfinding" and MovementService.ts correctly handles intermediate node positioning ✅ **CORRECT**
- **TargetingService vs PathfindingService**: intended.md states "Initial targeting pathfinding (direct connections)" and TargetingService.ts correctly uses `isReachableViaNetwork()` for direct connections only, while PathfindingService.ts handles full pathfinding for retargeting ✅ **CORRECT**
- **Movement State Management**: intended.md doesn't specify movement state structure, but MovementService.ts properly manages movement states with start/target positions, duration, and progress ✅ **CORRECT**
- **Visual Movement Display**: intended.md doesn't specify visual implementation, but BattleBattalion.tsx correctly implements smooth position interpolation for visual movement ✅ **CORRECT**
- **Test Coverage**: All intended behaviors are properly tested with comprehensive test files covering movement speed, attack range positioning, and network line adherence ✅ **CORRECT**

### **3. Movement Interruption Handling**
- **🚨 CRITICAL: If movement is interrupted by current target capture, battalion MUST:**
  - **Stop immediately at its current position** (not jump to destination)
  - **Record exact interruption coordinates** (e.g., 248.0, 326.4) 
  - **Calculate nearest node** based on movement progress (>50% = closer to target node, <50% = closer to start node)
  - **NO instant position jumping** - battalion stays at interruption coordinates until natural movement begins

#### **Associated Files:**
- `server/src/services/MovementService.ts` - `interruptRetargetingMovement()` handles interruption logic
- `server/src/services/MovementCalculationService.ts` - `calculateCurrentMovementPosition()` determines exact interruption coordinates
- `server/src/services/BattalionPositionService.ts` - `createStartPositionFromInterruption()` creates positions from interruption coordinates
- `server/src/services/AttackService.ts` - Triggers interruption when nodes are captured or battalions destroyed
- `server/src/types/battle.ts` - Defines `MovementState` with `wasInterrupted`, `interruptionPosition`, `needsRetargetingOnArrival`
- `mobile/src/types/battleTypes.ts` - Client-side movement state types for interruption handling

##### **Discrepancies:**
- **Interruption Logic Implementation**: intended.md states "Stop immediately at its current position" and MovementService.ts correctly implements `interruptRetargetingMovement()` that calls `MovementCalculationService.calculateCurrentMovementPosition()` to get exact coordinates ✅ **CORRECT**
- **Exact Coordinate Recording**: intended.md states "Record exact interruption coordinates (e.g., 248.0, 326.4)" and MovementService.ts correctly sets `movementState.interruptionPosition = currentPosition` ✅ **CORRECT**
- **Nearest Node Calculation**: intended.md states "Calculate nearest node based on movement progress (>50% = closer to target node, <50% = closer to start node)" and MovementCalculationService.ts correctly implements this logic in `calculateCurrentMovementPosition()` ✅ **CORRECT**
- **No Instant Position Jumping**: intended.md states "NO instant position jumping" and MovementService.ts correctly sets `movementState.targetPosition = currentPosition` and `movementStatus = 'arrived'` to stop movement ✅ **CORRECT**
- **Interruption Trigger Mechanism**: intended.md states "Triggers interruption when nodes are captured or battalions destroyed" and AttackService.ts correctly calls `MovementService.interruptRetargetingMovement()` in `executeRetargetingTask()` ✅ **CORRECT**
- **Movement State Structure**: intended.md states "Defines MovementState with wasInterrupted, interruptionPosition, needsRetargetingOnArrival" and battle.ts correctly defines these properties ✅ **CORRECT**
- **Client-Side Interruption Handling**: intended.md states "Client-side movement state types for interruption handling" and battleTypes.ts correctly defines MovementState with interruption properties ✅ **CORRECT**
- **Interrupted Recovery Queue**: intended.md doesn't specify queue mechanism, but AttackService.ts correctly implements `queueInterruptedBattalionRetargeting()` and `executeInterruptedBattalionRetargeting()` for recovery processing ✅ **CORRECT**

### **4. Natural Recovery Movement After Interruption**
- **🎯 DESIRED FLOW FOR INTERRUPTED BATTALIONS:**
  1. **Node capture at current node** (triggers interruption process)
  2. **Retarget to new node and begin moving along path** (normal retargeting)
  3. **Targeted node is captured (while moving)** (interruption trigger)
  4. **Stop movement pattern record position** - battalion stops at exact coordinates on the spot
  5. **Retarget from recorded position IF NEEDED** - using nearest node calculation:
  6. **Move to nearest node and use retargeted path** - following normal speed movement for battalion/bot type stats

- **Natural Recovery Process:**
  - **Initiate recovery movement** from interruption coordinates to nearest node at normal battalion speed
  - **No instant teleportation** - battalion moves naturally from (x, y) coordinates to node center
  - **Deferred retargeting** - retargeting happens AFTER battalion reaches nearest node, not immediately
  - **Recovery completion trigger** - when battalion arrives at nearest node, automatically queue retargeting
  - **Resume normal flow** - after retargeting, battalion proceeds with normal movement to new objectives

- **Movement Type Progression:**
  - `initial` → `retargeting` → `interrupted_recovery` → `retargeting` (normal flow resumes)
  - Recovery movements are **non-interruptible** to prevent cascading interruptions
  - Recovery movements use **normal battalion speed stats** for realistic animation

#### **Associated Files:**
- `server/src/services/MovementService.ts` - Recovery completion detection and `needsRetargetingOnArrival` handling
- `server/src/services/AttackService.ts` - `queueInterruptedBattalionRetargeting()` and `executeInterruptedBattalionRetargeting()`
- `server/src/services/BattalionPositionService.ts` - Creates recovery movement positions from interruption coordinates
- `server/src/services/MovementCalculationService.ts` - Calculates recovery movement duration using normal battalion speed
- `server/src/types/battle.ts` - Defines `interrupted_recovery` movement type and `needsRetargetingOnArrival` flag
- `server/src/services/RetargetingService.ts` - Handles retargeting after recovery completion

##### **Discrepancies:**
- **Recovery Completion Detection**: intended.md states "Recovery completion trigger - when battalion arrives at nearest node, automatically queue retargeting" and MovementService.ts correctly implements this in `updateBattleMovement()` with `movementType === 'interrupted_recovery' && needsRetargetingOnArrival` ✅ **CORRECT**
- **Interrupted Recovery Queue**: intended.md states "queueInterruptedBattalionRetargeting() and executeInterruptedBattalionRetargeting()" and AttackService.ts correctly implements both methods ✅ **CORRECT**
- **Recovery Position Creation**: intended.md states "Creates recovery movement positions from interruption coordinates" and BattalionPositionService.ts correctly implements `createStartPositionFromInterruption()` ✅ **CORRECT**
- **Recovery Movement Duration**: intended.md states "Calculates recovery movement duration using normal battalion speed" and MovementCalculationService.ts correctly uses `calculateMovementDuration(battalion)` for all movement types ✅ **CORRECT**
- **Movement Type Definition**: intended.md states "Defines interrupted_recovery movement type and needsRetargetingOnArrival flag" and battle.ts correctly defines both properties ✅ **CORRECT**
- **Retargeting After Recovery**: intended.md states "Handles retargeting after recovery completion" and RetargetingService.ts correctly implements `retargetBattalionsAfterCapture()` ✅ **CORRECT**
- **❌ MISSING: Recovery Movement Initiation**: intended.md states "Initiate recovery movement from interruption coordinates to nearest node" but there's no specific logic to create `interrupted_recovery` movement states from interruption coordinates - this appears to be missing from the implementation
- **❌ MISSING: Non-Interruptible Recovery**: intended.md states "Recovery movements are non-interruptible to prevent cascading interruptions" but there's no logic to set `isInterruptible: false` for recovery movements
- **❌ MISSING: Movement Type Progression**: intended.md states "initial → retargeting → interrupted_recovery → retargeting" but there's no logic to transition from `retargeting` to `interrupted_recovery` when interruption occurs

## C. Targeting System (Two Distinct Behaviors)

### **5. Initial Targeting (Battle Start)**
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

### **6. Retargeting (During Battle)**
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

## D. Attack System (Consistent Throughout Battle)

### **7. Attack Behavior**
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

### **8. Node Combat (Tug-of-War System)**
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

### **9. Battalion-to-Battalion Combat System**

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

## E. Event Handling & Retargeting

### **10. Node Capture Events**
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

### **11. Battalion Destruction Events**
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

### **12. Battalion Movement Events**
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

### **13. Sequential Movement Phase**
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

### **14. Immediate Response Events (Priority Queue Processing):**
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

### **15. Combat Queue System:**
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

### **16. Ongoing Combat**
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

## F. Architecture & Infrastructure

### **17. Key Rules & Network Lock-in**
- **Battalions NEVER leave the network lines** (movement, targeting, attacking)
- Movement is always node-to-node following NETWORK_CONNECTIONS
- **Attack range positioning:** Move to closest network node with line-of-sight to target
- **Cross-network targeting is valid:** Battalion at 0-3 line can target enemy at 5-8 line by moving: 0→3→7→5→(attack range toward 8)
- **Example pathfinding:** Node 0 → Node 3 (new connections available) → Node 7 (new connections) → Attack range of Node 5
- Only neutral nodes can be attacked (owned nodes become un-attackable)
- Retargeting only triggered by node capture of the specific node being attacked
- **Server authority:** All movement, targeting, and positioning calculated server-side and sent to client

#### **Associated Files:**
- `server/src/config/networkConfig.ts` - `NETWORK_CONNECTIONS` defines all valid network paths and connections
- `server/src/services/PathfindingService.ts` - `findNetworkPath()` ensures all movement follows NETWORK_CONNECTIONS
- `server/src/services/TargetingService.ts` - `isValidNetworkPath()` validates targeting follows network topology
- `server/src/services/MovementCalculationService.ts` - `calculateAttackRangePosition()` ensures attack positioning stays on network lines
- `server/src/services/BattalionPositionService.ts` - `createTargetPosition()` enforces network line adherence
- `server/src/controllers/BattleController.ts` - Sends network data to client (server authority)
- `mobile/src/types/battleState.ts` - Client-side types for server-authoritative data
- `server/__tests__/battalionNetworkLineAdherence.test.ts` - Tests that battalions stay on network lines during movement
- `mobile/__tests__/components/battle/battalionNetworkLineAdherence.test.tsx` - Tests visual network line adherence
- `server/__tests__/testUtils.ts` - `TEST_NETWORK_CONNECTIONS` for testing network topology
- `mobile/__tests__/testUtils.ts` - Client-side network connection test data

##### **Discrepancies:**
- **Network Connections Definition**: intended.md states "NETWORK_CONNECTIONS defines all valid network paths and connections" and networkConfig.ts correctly defines all network connections ✅ **CORRECT**
- **Pathfinding Network Adherence**: intended.md states "findNetworkPath() ensures all movement follows NETWORK_CONNECTIONS" and PathfindingService.ts correctly implements BFS pathfinding using network connections ✅ **CORRECT**
- **Targeting Network Validation**: intended.md states "isValidNetworkPath() validates targeting follows network topology" but TargetingService.ts doesn't have `isValidNetworkPath()` method - it has `isReachableViaNetwork()` ❌ **MISSING**
- **Attack Range Positioning**: intended.md states "calculateAttackRangePosition() ensures attack positioning stays on network lines" and MovementCalculationService.ts correctly implements this ✅ **CORRECT**
- **Network Line Adherence**: intended.md states "createTargetPosition() enforces network line adherence" and BattalionPositionService.ts correctly implements this ✅ **CORRECT**
- **Server Authority Network Data**: intended.md states "Sends network data to client (server authority)" and BattleController.ts correctly sends network connections and line properties ✅ **CORRECT**
- **Client Server-Authoritative Types**: intended.md states "Client-side types for server-authoritative data" but battleState.ts is deprecated and doesn't define network types ❌ **MISSING**
- **Network Line Adherence Tests**: intended.md states "Tests that battalions stay on network lines during movement" and battalionNetworkLineAdherence.test.ts correctly tests this ✅ **CORRECT**
- **Visual Network Line Adherence**: intended.md states "Tests visual network line adherence" and battalionNetworkLineAdherence.test.tsx correctly tests this ✅ **CORRECT**
- **Network Topology Test Data**: intended.md states "TEST_NETWORK_CONNECTIONS for testing network topology" and testUtils.ts correctly defines this ✅ **CORRECT**
- **Client Network Test Data**: intended.md states "Client-side network connection test data" and mobile testUtils.ts correctly defines this ✅ **CORRECT**
- **❌ MISSING: Cross-Network Targeting Validation**: intended.md states "Cross-network targeting is valid: Battalion at 0-3 line can target enemy at 5-8 line by moving: 0→3→7→5→(attack range toward 8)" but there's no explicit validation of cross-network targeting paths
- **❌ MISSING: Example Pathfinding Validation**: intended.md states "Example pathfinding: Node 0 → Node 3 (new connections available) → Node 7 (new connections) → Attack range of Node 5" but there's no explicit validation of this specific pathfinding example
- **❌ MISSING: Neutral Node Attack Restriction**: intended.md states "Only neutral nodes can be attacked (owned nodes become un-attackable)" but while CombatService.canTargetNode() checks this, there's no explicit validation that owned nodes are un-attackable
- **❌ MISSING: Specific Node Capture Retargeting**: intended.md states "Retargeting only triggered by node capture of the specific node being attacked" but while this logic exists, there's no explicit validation that only specific node capture triggers retargeting

### **18. Attack Service Architecture Improvements**

#### **Waterfall Authority Structure:**
- **Attack flow should follow a clear waterfall pattern:**
  1. **Determine Target** - Identify if target is node or battalion
  2. **Start Attack** - Initialize attack state with correct intervals
  3. **Process Attack** - Handle attack timing and damage calculation
  4. **Process Damage** - Apply damage to target (node control or battalion health)
  5. **Process Capture/Destruction** - Handle node capture or battalion destruction
  6. **Alert Affected Battalions** - Notify all battalions affected by the event

#### **Targeting Array System:**
- **Each node and battalion should maintain targeting arrays:**
  - **Nodes:** `targetingBattalions: string[]` - List of battalion IDs targeting this node
  - **Battalions:** `targetingBattalions: string[]` - List of battalion IDs targeting this battalion
- **Benefits of targeting arrays:**
  - **O(1) lookups** instead of O(n) scans through all attack states
  - **Direct relationships** - Each target knows exactly who's targeting it
  - **Efficient retargeting** - Just iterate through targeting arrays
  - **Simplified event handling** - Easy to notify affected battalions
- **Current inefficiency:** `getBattalionsAttackingSpecificNode()` scans all attack states
- **Improved approach:** Direct access to targeting arrays for immediate notification

#### **Associated Files:**
- `server/src/services/AttackService.ts` - `startAttack()` implements step 2 (Start Attack) of waterfall authority
- `server/src/services/AttackService.ts` - `processActiveAttacks()` implements step 3 (Process Attack) of waterfall authority
- `server/src/services/AttackService.ts` - `processUnifiedAttack()` implements step 4 (Process Damage) of waterfall authority
- `server/src/services/AttackService.ts` - `getBattalionsAttackingSpecificNode()` represents current O(n) inefficiency to be replaced
- `server/src/services/CombatService.ts` - `applyTugOfWarDamage()`, `applyBattalionDamage()` implement step 5 (Process Capture/Destruction)
- `server/src/services/AttackService.ts` - `queueRetargetingTask()` implements step 6 (Alert Affected Battalions)
- `server/src/services/BattalionService.ts` - `updateTargetingResults()` manages targeting relationships
- `server/src/types/battle.ts` - Defines interfaces for future targeting array implementation
- `server/__tests__/attackService.test.ts` - Tests current waterfall authority implementation
- `server/__tests__/selectiveRetargeting.test.ts` - Tests current O(n) scanning behavior

##### **Discrepancies:**
- **Waterfall Step 2 Implementation**: intended.md states "startAttack() implements step 2 (Start Attack) of waterfall authority" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Waterfall Step 3 Implementation**: intended.md states "processActiveAttacks() implements step 3 (Process Attack) of waterfall authority" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Waterfall Step 4 Implementation**: intended.md states "processUnifiedAttack() implements step 4 (Process Damage) of waterfall authority" and AttackService.ts correctly implements this ✅ **CORRECT**
- **O(n) Inefficiency Identification**: intended.md states "getBattalionsAttackingSpecificNode() represents current O(n) inefficiency to be replaced" and AttackService.ts correctly shows this O(n) scanning behavior ✅ **CORRECT**
- **Waterfall Step 5 Implementation**: intended.md states "applyTugOfWarDamage(), applyBattalionDamage() implement step 5 (Process Capture/Destruction)" and CombatService.ts correctly implements both methods ✅ **CORRECT**
- **Waterfall Step 6 Implementation**: intended.md states "queueRetargetingTask() implements step 6 (Alert Affected Battalions)" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Targeting Relationships Management**: intended.md states "updateTargetingResults() manages targeting relationships" and BattalionService.ts correctly implements this ✅ **CORRECT**
- **Future Targeting Array Interfaces**: intended.md states "Defines interfaces for future targeting array implementation" but battle.ts doesn't define targeting array interfaces - only existing IBattalion and INode interfaces ❌ **MISSING**
- **Waterfall Authority Tests**: intended.md states "Tests current waterfall authority implementation" but attackService.test.ts only tests attack intervals, not the waterfall authority pattern ❌ **MISSING**
- **O(n) Scanning Tests**: intended.md states "Tests current O(n) scanning behavior" and selectiveRetargeting.test.ts correctly tests this ✅ **CORRECT**
- **❌ MISSING: Step 1 Implementation**: intended.md states "Determine Target - Identify if target is node or battalion" but there's no explicit step 1 implementation in the waterfall authority
- **❌ MISSING: Targeting Array System**: intended.md describes a complete targeting array system with `targetingBattalions: string[]` arrays on nodes and battalions, but this system is not implemented
- **❌ MISSING: O(1) Lookup Benefits**: intended.md states "O(1) lookups instead of O(n) scans" but the targeting array system for O(1) lookups is not implemented
- **❌ MISSING: Direct Relationships**: intended.md states "Direct relationships - Each target knows exactly who's targeting it" but the targeting array system for direct relationships is not implemented
- **❌ MISSING: Efficient Retargeting**: intended.md states "Efficient retargeting - Just iterate through targeting arrays" but the targeting array system for efficient retargeting is not implemented
- **❌ MISSING: Simplified Event Handling**: intended.md states "Simplified event handling - Easy to notify affected battalions" but the targeting array system for simplified event handling is not implemented
