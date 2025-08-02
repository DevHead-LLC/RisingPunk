# Retargeting System Documentation

## Overview
The retargeting system handles battalion redirection when their current target becomes invalid or captured. This document details the functions, dependencies, and step-by-step processes for all retargeting behaviors.

## Initial Targeting Process (Pre-Retargeting Context)

### Step 1: Battle Initialization
- **Function**: `BattleService.initializeBattle()`
  - **Plain Language**: This function sets up the battle state, spawns battalions at their home nodes (0,1,2 for user, 6,7,8 for enemy), and prepares the battlefield.

### Step 2: Initial Target Selection
- **Function**: `TargetingService.assignInitialTargets()`
  - **Plain Language**: When the countdown ends, each battalion randomly selects one of the three neutral nodes (3,4,5) as its initial target. This creates the chaotic opening where multiple battalions might target the same node.

### Step 3: Initial Movement
- **Function**: `MovementService.initiateMovement()` with `movementType: 'initial'`
  - **Plain Language**: Battalions begin moving along network paths toward their chosen neutral nodes. They calculate the shortest path and move at their designated speed.

### Step 4: Attack Range Positioning
- **Function**: Movement system stops at attack range
  - **Plain Language**: Battalions don't move onto the node center but stop at attack range distance on the network line, maintaining their position while attacking.

### Step 5: Initial Combat
- **Function**: `AttackService.startAttacking()`
  - **Plain Language**: Battalions begin attacking their target nodes, applying tug-of-war damage that pushes the node's control percentage toward ±100%.

## Data Structures

### RetargetingTask (AttackService)
```typescript
interface RetargetingTask {
  battleId: string;
  capturedNodeIndex?: number;
  affectedBattalionIds: string[];
  timestamp: number;
  triggerType?: 'node_capture' | 'battalion_destruction' | 'interrupted_recovery' | 'missing_target';
  destroyedBattalionId?: string;
  priority: number;
}
```

### RetargetingResult (RetargetingService)
```typescript
interface RetargetingResult {
  battalionId: string;
  currentNodeIndex: number;
  newTargetNodeIndex: number;
  pathToTarget: number[];
  pathDistance: number;
  targetType: 'neutral_node' | 'enemy_battalion';
  targetBattalionId?: string;
}
```

### Priority System
```typescript
const RETARGETING_PRIORITIES = {
  BATTALION_DESTRUCTION: 1,    // Highest priority - immediate response required
  INTERRUPTED_RECOVERY: 1,     // Same priority as destruction - immediate response
  MISSING_TARGET: 2,           // Medium priority - target not found
  NODE_CAPTURE: 2              // Same priority as missing target - normal retargeting
}
```

## 1. Retargeting Due to Node Capture

### Step 1: Node Capture Detection
- **Function**: `AttackService.processUnifiedAttack()`
  - **Plain Language**: This function handles all combat damage calculations. When a battalion attacks a node, it applies tug-of-war damage, pushing the node's control percentage toward ±100%. Once it reaches the threshold, the node is marked as captured.
- **Condition**: When node control reaches ±100%
- **Action**: Mark node as captured by owner (User or Enemy)
- **Data Update**: `node.owner = NodeOwner.USER/ENEMY`

### Step 2: Identify Affected Battalions
- **Function**: `AttackService.getBattalionsAttackingSpecificNode()`
  - **Plain Language**: This function loops through all active attack states and finds every battalion that is currently attacking the specified node. It returns a list of battalion IDs that need to stop attacking and find new targets.
- **Function**: `AttackService.stopAttacking()`
  - **Plain Language**: This function removes a battalion from the attack state map, effectively stopping its attack. It sets the battalion's attacking flag to false and cleans up the attack record.
- **Returns**: Array of battalion IDs currently attacking the captured node
- **Action**: Stop all attacks on the captured node

### Step 3: Queue Retargeting Task
- **Function**: `AttackService.queueRetargetingTask()`
  - **Plain Language**: This function creates a retargeting task and adds it to a priority queue. Rather than immediately retargeting battalions, it schedules the work to be done in order, preventing race conditions when multiple nodes are captured simultaneously. The task includes all the information needed to retarget the affected battalions later.
- **Creates**: RetargetingTask with:
  - `triggerType: 'node_capture'`
  - `capturedNodeIndex`: The node that was just captured
  - `affectedBattalionIds`: Battalions that were attacking the node
  - `priority: RETARGETING_PRIORITIES.NODE_CAPTURE` (2)
- **Queue**: Added to `AttackService.retargetingQueue`

### Step 4: Check for Moving Battalions
- **Function**: `AttackService.getMovingBattalionsTargetingNode()`
  - **Plain Language**: This function searches through all movement states to find battalions that are currently in transit toward the node that was just captured. These battalions need to be interrupted mid-movement since their destination is no longer valid.
- **Purpose**: Find battalions currently moving toward the captured node
- **Checks**: Movement states where `targetNode === capturedNodeIndex`

### Step 5: Interrupt Moving Battalions
- **Function**: `MovementService.interruptRetargetingMovement()`
  - **Plain Language**: This function stops a battalion exactly where it is on the network path. It calculates the battalion's current position based on how long it's been moving and its speed, then freezes it at those coordinates. The battalion is marked as "interrupted" so the system knows it needs special handling.
- **Function**: `MovementCalculationService.calculateCurrentMovementPosition()`
  - **Plain Language**: This function uses the elapsed time, movement speed, and path information to determine exactly where a battalion is located between nodes at any given moment.
- **Actions**:
  - Calculate current position
  - Set `movementState.wasInterrupted = true`
  - Store `movementState.interruptionPosition = currentPosition`
  - Update battalion position to interruption coordinates
  - Set `movementState.movementStatus = 'arrived'`

### Step 6: Queue Interrupted Battalion Recovery
- **Function**: `AttackService.queueInterruptedBattalionRetargeting()`
  - **Plain Language**: This function creates a high-priority task to handle battalions that were stopped mid-movement. These battalions need special recovery movement to get back to a node before they can retarget normally. The high priority (1) ensures they're handled before regular retargeting.
- **Creates**: RetargetingTask with:
  - `triggerType: 'interrupted_recovery'`
  - `priority: RETARGETING_PRIORITIES.INTERRUPTED_RECOVERY` (1)

### Step 7: Process Retargeting Queue
- **Function**: `AttackService.processRetargetingQueue()`
  - **Plain Language**: This function is the main queue processor. It sorts all pending retargeting tasks by priority (1 = highest), then processes them one by one with a 50ms delay between each to prevent overwhelming the system. It ensures only one queue processor runs at a time.
- **Function**: `AttackService.executeRetargetingTask()`
  - **Plain Language**: This function handles the actual retargeting work for node capture events. It processes both the battalions that were attacking and those that were moving toward the captured node.
- **Process**: Sort queue by priority, process tasks sequentially
- **Execution**: Routes to appropriate handler based on trigger type

### Step 8: Find New Targets
- **Function**: `RetargetingService.retargetBattalionsAfterCapture()`
  - **Plain Language**: This function coordinates the retargeting process for multiple battalions. It determines each battalion's current position, identifies all valid targets (both nodes and enemies), and finds the best target for each battalion.
- **Function**: `RetargetingService.getBattalionStartNode()`
  - **Plain Language**: This function determines which network node a battalion should calculate distances from. For interrupted battalions, it uses their interruption position to find the nearest node. Otherwise, it uses the battalion's current node position.
- **For Each Battalion**:
  - Get current position
  - Filter valid targets:
    - Neutral nodes: `node.owner === NodeOwner.NEUTRAL`
    - Enemy battalions: `battalion.owner !== attacker.owner`
  - Call `RetargetingService.findClosestTarget()`

### Step 9: Target Selection Algorithm
- **Function**: `RetargetingService.findClosestTarget()`
  - **Plain Language**: This is the core targeting logic. It evaluates every possible target (nodes and enemies), calculates the network path distance to each, and selects the closest one. If multiple targets are equally close, it randomly picks one to prevent predictable behavior.
- **Function**: `PathfindingService.findNetworkPath()`
  - **Plain Language**: This function uses graph traversal (likely Dijkstra's algorithm) to find the shortest path between two nodes following the network connections. It returns an array of node indices representing the path.
- **Function**: `CombatService.canTargetBattalion()`
  - **Plain Language**: This function checks if a battalion is a valid target (not destroyed, not on the same team).
- **Process**:
  1. Evaluate all neutral nodes:
     - Calculate network path distance
     - Track shortest distance and path
  2. Evaluate all enemy battalions:
     - Verify targetability
     - Calculate path distance
  3. For equidistant targets:
     - Add to `candidateTargets` array
     - Random selection
  4. Return: Target info with path, distance, type

### Step 10: Update Battalion Targeting
- **Function**: `BattalionService.updateTargetingResults()`
  - **Plain Language**: This function saves the new targeting information in a map structure. It stores which target each battalion is assigned to, what type of target it is, and the path to reach it. This information is used by the movement system to guide battalions.
- **Updates**: Store new targeting information for each battalion
- **Data**: Links battalion ID to new target and path

### Step 11: Initiate Movement
- **Function**: `AttackService.initiateRetargetingMovement()`
  - **Plain Language**: This function starts battalions moving toward their new targets. It creates movement states that track the battalion's progress along the path, calculates how long the journey will take based on the battalion's speed, and begins the movement animation.
- **Creates**: New movement states with:
  - `movementType: 'retargeting'`
  - Full path to new target
  - Movement speed based on battalion stats

## 2. Retargeting Due to Battalion Destruction

### Step 1: Battalion Destruction Detection
- **Function**: `AttackService.processUnifiedAttack()`
  - **Plain Language**: This function handles battalion-to-battalion combat. It calculates damage based on the attacker's offense and quantity, reduces it by the defender's defense percentage, then applies it to the defender's health. When health reaches zero, the battalion is marked as destroyed.
- **Condition**: When battalion health <= 0
- **Action**: Set `battalion.isDestroyed = true`
- **Save**: Battle state updated in database

### Step 2: Queue Destruction Retargeting
- **Function**: `AttackService.queueBattalionDestructionRetargeting()`
  - **Plain Language**: This function handles the immediate aftermath of battalion destruction. It first removes any attacks the destroyed battalion was making, then finds all enemy battalions that were targeting it. These battalions need new targets since their current target no longer exists.
- **Function**: `AttackService.clearBattalionAttacks()`
  - **Plain Language**: This function removes all attack records for a specific battalion from the attack state map.
- **Actions**:
  1. Clear destroyed battalion's attacks
  2. Find affected battalions:
     - Iterate through `AttackService.attackStates`
     - Check for battalions targeting the destroyed one
     - Stop their attacks
  3. Create RetargetingTask:
     - `triggerType: 'battalion_destruction'`
     - `priority: RETARGETING_PRIORITIES.BATTALION_DESTRUCTION` (1)
     - `destroyedBattalionId`: The destroyed battalion's ID

### Step 3: Process High Priority Queue
- **Function**: `AttackService.processRetargetingQueue()`
  - **Plain Language**: The same queue processor handles all retargeting, but battalion destruction has priority 1 (highest), so these tasks jump to the front of the queue. This ensures battalions don't waste time attacking non-existent targets.
- **Note**: Priority 1 ensures immediate processing before other tasks

### Step 4: Execute Battalion Destruction Retargeting
- **Function**: `AttackService.executeBattalionDestructionRetargeting()`
  - **Plain Language**: This function processes the battalion destruction retargeting task. It uses the same retargeting logic as node capture but is triggered by battalion destruction instead. The affected battalions find new targets and begin moving.
- **Process**: Same as node capture retargeting (Steps 8-11 above)
- **Difference**: Higher priority ensures faster response

### Step 5: Movement Interruption for Pursuers
- **Check**: Any battalions moving toward destroyed battalion
- **Action**: Queue missing target retargeting if battalion not found
- **Note**: Battalions already in motion toward the destroyed target will discover it's missing when they arrive

## 3. Dynamic Pursuit (Battalion Movement Updates)

### Step 1: Battalion Movement Detection
- **When**: A battalion begins moving to a new location
- **Function**: Movement state updates trigger notification system
  - **Plain Language**: When a battalion starts moving, the system needs to notify all enemy battalions that are targeting it. This allows pursuers to adjust their paths to intercept at the new destination rather than going to the old location.

### Step 2: Identify Pursuing Battalions
- **Check**: All battalions with `targetType === 'enemy_battalion'` and `targetBattalionId === movingBattalionId`
  - **Plain Language**: The system searches through all active targeting states to find which enemy battalions are currently pursuing the moving battalion.

### Step 3: Update Pursuit Paths
- **Function**: Dynamic path recalculation
  - **Plain Language**: For each pursuing battalion, the system recalculates the path to reach the moving battalion's new destination. This ensures pursuers don't waste time going to abandoned positions.
- **Actions**:
  - Recalculate path to new destination
  - Update movement timing
  - Adjust arrival estimates

### Step 4: Continuous Coordination
- **Real-time Updates**: Position updates every game tick
  - **Plain Language**: As battalions move, their positions are continuously updated, allowing smooth pursuit animations and accurate interception calculations.

## 4. Retargeting Due to Battalion Movement (Target Not Found)

### Step 1: Battalion Arrival Detection
- **Function**: `MovementService.updateBattleMovement()`
  - **Plain Language**: This function is called every game tick to update all moving battalions. It calculates new positions based on elapsed time and speed, checks if battalions have reached their destinations, and triggers appropriate actions when they arrive.
- **Condition**: When `movementState.movementStatus === 'arrived'`
- **Check**: Target type and target existence

### Step 2: Target Verification
- **Function**: `AttackService.startBattalionAttack()`
  - **Plain Language**: This function initiates combat between two battalions. It creates an attack state that tracks the attacker, defender, and attack timing.
- **For Enemy Battalion Targets**:
  - Find target battalion by ID or position
  - If found: Start attacking
  - If not found: Proceed to Step 3

### Step 3: Queue Missing Target Retargeting
- **Function**: `AttackService.queueMissingTargetRetargeting()`
  - **Plain Language**: This function handles the case where a battalion arrives at its destination but can't find its target (the enemy moved or was destroyed while the battalion was traveling). It queues a retargeting task so the battalion can find a new objective.
- **Creates**: RetargetingTask with:
  - `triggerType: 'missing_target'`
  - `priority: RETARGETING_PRIORITIES.MISSING_TARGET` (2)

### Step 4: Execute Missing Target Retargeting
- **Function**: `AttackService.executeMissingTargetRetargeting()`
  - **Plain Language**: This function processes the missing target scenario. It uses the standard retargeting logic to find a new target for the battalion that arrived at an empty location.
- **Process**: Same retargeting flow (find new target, update, move)

## Special Cases

### Interrupted Recovery Movement
When a battalion is moving and its target is captured:

**Step 1: Recovery Initiation**
- **Function**: `MovementService.handleInterruptedRecovery()`
  - **Plain Language**: This function initiates the recovery process for battalions that were stopped mid-journey. It creates a special movement state that guides the battalion from its interruption point to the nearest node. The movement is marked as non-interruptible to prevent the battalion from getting stuck in an endless interruption loop.
- **Creates**: Movement state with:
  - `movementType: 'interrupted_recovery'`
  - `isInterruptible: false` (prevents cascading interruptions)
  - `needsRetargetingOnArrival: true`

**Step 2: Natural Movement to Nearest Node**
- **Calculation Logic**:
  - **Plain Language**: The system determines which node the battalion should move to based on how far it had traveled before being interrupted. If it was more than halfway to its destination, it continues forward; otherwise, it retreats to where it came from. This prevents battalions from making inefficient backwards movements.
- **Calculate**: Nearest node based on interruption position
  - If progress > 50%: Use target node
  - If progress < 50%: Use start node
- **Move**: At normal battalion speed (no teleportation)

**Step 3: Retargeting Upon Arrival**
- **Function Check**:
  - **Plain Language**: When the battalion reaches the nearest node after recovery movement, the system automatically triggers a new retargeting process. This ensures the battalion doesn't idle at the node but immediately finds a new objective. The movement type is reset to normal retargeting.
- **Condition**: `movementType === 'interrupted_recovery' && needsRetargetingOnArrival`
- **Action**: Queue interrupted battalion retargeting
- **Reset**: `movementType = 'retargeting'`

### Targeting Priority Rules

**Valid Targets**:
1. **Neutral Nodes**: `node.owner === NodeOwner.NEUTRAL`
2. **Enemy Battalions**: `battalion.owner !== attacker.owner && !battalion.isDestroyed`

**Distance Calculation**:
- Always uses network paths via `PathfindingService.findNetworkPath()`
- Never straight-line distance
- Accounts for network topology and connections

**Target Selection**:
- Pure proximity-based (no priority system)
- Whichever is closer (neutral node or enemy battalion)
- Random selection for equidistant targets

## Movement State Transitions

```
initial → retargeting → interrupted_recovery → retargeting
```

**Key States**:
- `moving`: Battalion in transit
- `arrived`: Battalion reached destination
- `interrupted`: Movement stopped due to target capture

## Save Operations

**Database Updates Occur**:
1. After battalion destruction
2. After node capture
3. After position updates during movement
4. After retargeting completion

**Batched Operations**:
- Multiple retargeting tasks processed sequentially
- 50ms delay between queue items to prevent race conditions

## Network Lock-In Rules

**All Operations Respect**:
- Battalions never leave network lines
- Movement is node-to-node following NETWORK_CONNECTIONS
- Attack range calculations use closest network position
- Cross-network targeting is valid with proper pathfinding

## Summary of All Retargeting Triggers

1. **Node Capture** (`node_capture`)
   - Triggered when a node reaches ±100% control
   - Affects all battalions attacking or moving to that node
   - Priority: 2

2. **Battalion Destruction** (`battalion_destruction`)
   - Triggered when a battalion's health reaches 0
   - Affects all battalions targeting the destroyed battalion
   - Priority: 1 (highest)

3. **Interrupted Recovery** (`interrupted_recovery`)
   - Triggered after a battalion is interrupted mid-movement
   - Handles recovery movement to nearest node
   - Priority: 1 (highest)

4. **Missing Target** (`missing_target`)
   - Triggered when a battalion arrives but can't find its target
   - Handles cases where target moved or was destroyed during travel
   - Priority: 2

5. **Dynamic Pursuit** (not a retargeting trigger, but a movement update)
   - Triggered when a battalion moves to a new location
   - Updates pursuit paths for all battalions targeting it
   - Real-time coordination without retargeting

## Key System Behaviors

- **Sequential Processing**: All retargeting tasks are processed one at a time with 50ms delays to prevent race conditions
- **Priority Queue**: Higher priority tasks (1) are processed before lower priority tasks (2)
- **No Teleportation**: Battalions always move naturally at their designated speeds
- **Network Constraints**: All movement and positioning respects the network topology
- **Proximity-Based Selection**: Target selection is purely based on network path distance
- **Random Tiebreaker**: When multiple targets are equidistant, selection is random
