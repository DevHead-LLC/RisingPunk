# B. Movement System (Consistent Throughout Battle)

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

## 2. Movement Behavior
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

## 3. Movement Interruption Handling
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

## 4. Natural Recovery Movement After Interruption
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