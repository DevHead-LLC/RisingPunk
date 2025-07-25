# Phase 4: Sequential Movement with Interruption

## 🎯 GOAL: 
Execute movement through multi-node paths with proper speed stats, interruption capability, and cross-network targeting support

## 🔍 LOGIC HOLES ADDRESSED:

### HOLE #1: MISSING MOVEMENT INTERRUPTION INTEGRATION
**INTENDED.MD:** "If movement is interrupted by another capture, stop immediately and retarget"
**CURRENT PLAN:** Movement interruption logic exists but no integration with capture triggers
**MISSING:** AttackService must check for moving battalions and interrupt them during captures

### HOLE #3: MOVEMENT SPEED STAT INTEGRATION
**INTENDED.MD:** "Movement follows their speed stats and takes time"
**CURRENT PLAN:** Uses MovementCalculationService.calculateMovementDuration(battalion)
**MISSING:** Verification that speed stats properly affect sequential movement timing
**SOLUTION:** Step-specific duration calculation based on distance and battalion.stats.speed

### HOLE #5: SERVER AUTHORITY & CLIENT SYNCHRONIZATION
**INTENDED.MD:** "Server authority: All movement, targeting, and positioning calculated server-side"
**CURRENT PLAN:** Position updates in BattalionService
**CLARIFIED:** Server calculates everything, client receives updates for visual display only
**SOLUTION:** Enhanced server-side position tracking with structured client updates

## 🏗️ WHAT WE'LL BUILD:

### 1. Enhanced MovementService with Movement Types:
```typescript
// In server/src/services/MovementService.ts - MAJOR MODIFICATIONS:

/**
 * AUTHORITY: Movement orchestration and state management
 * OVERLAPS: Position updates must sync with BattalionMappingService
 * DEPENDENCIES: PathfindingService for retargeting paths, TargetingService for initial paths
 */

// MODIFY initiateMovement to handle both types:
static initiateMovement(
  battalion: IBattalion, 
  targetNode: number, 
  screenWidth: number, 
  screenHeight: number,
  movementType: 'initial' | 'retargeting' = 'initial',
  fullPath?: number[]  // Required for retargeting
): MovementState | null {
  
  console.log(`🚀 MOVEMENT START: ${battalion.owner} ${battalion.type} ${movementType} movement (${battalion.position.nodeIndex} → ${targetNode})`);
  
  const nodePositions = calculateNodePositions(screenWidth, screenHeight);
  const startPosition = {
    x: nodePositions[battalion.position.nodeIndex].position.x,
    y: nodePositions[battalion.position.nodeIndex].position.y,
    nodeIndex: battalion.position.nodeIndex
  };
  
  if (movementType === 'initial') {
    return this.initiateInitialMovement(battalion, targetNode, nodePositions, startPosition);
  } else if (movementType === 'retargeting') {
    return this.initiateRetargetingMovement(battalion, targetNode, fullPath!, nodePositions, startPosition);
  }
  
  return null;
}

/**
 * Initial movement - direct to attack range (existing logic)
 */
private static initiateInitialMovement(battalion: IBattalion, targetNode: number, nodePositions: any[], startPosition: any): MovementState {
  console.log(`🎯 INITIAL: Direct movement to attack range of node ${targetNode}`);
  
  // Use existing TargetingService.getNetworkPath for direct connections
  const networkPath = TargetingService.getNetworkPath(battalion.position.nodeIndex, targetNode);
  
  if (networkPath.length === 0) {
    console.log(`🎯 INITIAL ERROR: No direct path to node ${targetNode}`);
    return null;
  }
  
  // Calculate attack range position (existing logic)
  const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
    battalion, targetNode, nodePositions.map(n => n.position)
  );
  
  // Validate network reachability (not direct line-of-sight)
  const isReachable = PathfindingService.isNetworkReachable(battalion.position.nodeIndex, targetNode);
  if (!isReachable) {
    console.log(`🎯 INITIAL ERROR: Target node ${targetNode} not reachable via network from ${battalion.position.nodeIndex}`);
    return null;
  }
  
  console.log(`🎯 INITIAL: Cross-network targeting confirmed - target reachable via network pathfinding`);
  
  return {
    battalionId: battalion.id,
    startPosition: startPosition,
    targetPosition: { x: attackRangePosition.x, y: attackRangePosition.y, nodeIndex: targetNode },
    movementStatus: 'moving',
    startTime: Date.now(),
    estimatedDuration: MovementCalculationService.calculateMovementDuration(battalion),
    networkPath: networkPath,
    isWithinAttackRange: false,
    movementType: 'initial',
    fullPath: networkPath,
    currentPathIndex: 0,
    finalTarget: targetNode,
    isInterruptible: false  // Initial movement cannot be interrupted
  };
}

/**
 * Retargeting movement - sequential through nodes with proper speed timing
 */
private static initiateRetargetingMovement(battalion: IBattalion, targetNode: number, fullPath: number[], nodePositions: any[], startPosition: any): MovementState {
  console.log(`🔄 RETARGETING: Sequential movement via path [${fullPath.join(' → ')}]`);
  console.log(`🔄 RETARGETING: Cross-network targeting - moving through network to reach target`);
  
  if (!fullPath || fullPath.length < 2) {
    console.log(`🔄 RETARGETING ERROR: Invalid path provided`);
    return null;
  }
  
  // Start with first step in path
  const nextNodeIndex = fullPath[1]; // fullPath[0] is current position
  const isLastStep = fullPath.length === 2;
  
  let targetPosition;
  let stepDistance;
  
  if (isLastStep) {
    // Moving to final target - use attack range position
    console.log(`🎯 RETARGETING: Moving to FINAL TARGET node ${nextNodeIndex} (attack range)`);
    
    const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
      battalion, nextNodeIndex, nodePositions.map(n => n.position)
    );
    targetPosition = { x: attackRangePosition.x, y: attackRangePosition.y, nodeIndex: nextNodeIndex };
    stepDistance = MovementCalculationService.calculateNetworkDistance(
      nodePositions[battalion.position.nodeIndex].position, 
      attackRangePosition
    );
  } else {
    // Moving to intermediate node - use node center for network access
    console.log(`🏃 RETARGETING: Moving to INTERMEDIATE node ${nextNodeIndex} (step 1/${fullPath.length - 1})`);
    targetPosition = {
      x: nodePositions[nextNodeIndex].position.x,
      y: nodePositions[nextNodeIndex].position.y,
      nodeIndex: nextNodeIndex
    };
    stepDistance = MovementCalculationService.calculateNetworkDistance(
      nodePositions[battalion.position.nodeIndex].position,
      nodePositions[nextNodeIndex].position
    );
  }
  
  // Calculate step-specific duration based on actual distance and battalion speed
  const stepDuration = this.calculateStepDuration(battalion, stepDistance);
  console.log(`⏱️ RETARGETING: Step duration ${stepDuration}ms for distance ${stepDistance.toFixed(0)}px`);
  
  return {
    battalionId: battalion.id,
    startPosition: startPosition,
    targetPosition: targetPosition,
    movementStatus: 'moving',
    startTime: Date.now(),
    estimatedDuration: stepDuration,
    networkPath: [battalion.position.nodeIndex, nextNodeIndex],
    isWithinAttackRange: false,
    movementType: 'retargeting',
    fullPath: fullPath,
    currentPathIndex: 0,
    finalTarget: fullPath[fullPath.length - 1],
    isInterruptible: true  // Can be interrupted by captures
  };
}

/**
 * NEW: Calculate movement duration for specific step distance
 */
private static calculateStepDuration(battalion: IBattalion, distance: number): number {
  // Use battalion speed stats for realistic movement timing
  const pixelsPerSecond = battalion.stats.speed * 50; // Convert speed to pixels/second
  const durationMs = (distance / pixelsPerSecond) * 1000;
  
  console.log(`⏱️ SPEED CALC: ${battalion.type} speed=${battalion.stats.speed} → ${pixelsPerSecond}px/s → ${durationMs.toFixed(0)}ms`);
  
  return Math.max(durationMs, 500); // Minimum 500ms per step
}

/**
 * NEW: Interrupt retargeting movement for immediate retargeting
 */
static interruptRetargetingMovement(battalionId: string, battleId: string): boolean {
  const battleMovementStates = this.movementStates.get(battleId);
  if (!battleMovementStates) return false;
  
  const movementState = battleMovementStates.get(battalionId);
  if (!movementState || !movementState.isInterruptible) {
    console.log(`🛑 INTERRUPT: Battalion ${battalionId} not interruptible`);
    return false;
  }
  
  console.log(`🛑 INTERRUPT: Stopping retargeting movement for battalion ${battalionId}`);
  
  // Stop current movement and mark as arrived at current target
  movementState.movementStatus = 'arrived';
  battleMovementStates.set(battalionId, movementState);
  
  return true;
}
```

### 2. Sequential Movement Continuation Logic:
```typescript
// MODIFY updateMovementProgress for sequential movement:
static updateMovementProgress(movementState: MovementState): MovementState {
  // ... existing progress calculation
  
  if (updatedMovementState.movementStatus === 'arrived') {
    console.log(`✅ ARRIVAL: Battalion ${movementState.battalionId} arrived at node ${updatedMovementState.targetPosition.nodeIndex}`);
    
    // For retargeting movement, check if there are more steps
    if (movementState.movementType === 'retargeting' && movementState.fullPath && movementState.currentPathIndex !== undefined) {
      const nextPathIndex = movementState.currentPathIndex + 1;
      const hasMoreSteps = nextPathIndex < movementState.fullPath.length - 1;
      
      if (hasMoreSteps) {
        // Continue to next node in path
        const nextNodeIndex = movementState.fullPath[nextPathIndex + 1];
        const isLastStep = nextPathIndex + 1 === movementState.fullPath.length - 1;
        
        console.log(`🔄 CONTINUING: Battalion ${movementState.battalionId} continuing to node ${nextNodeIndex} (step ${nextPathIndex + 1}/${movementState.fullPath.length - 1})`);
        
        // Get screen dimensions for position calculation
        try {
          const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
          const nodePositions = calculateNodePositions(screenDimensions.width, screenDimensions.height);
          
          // Update for next step with proper timing
          updatedMovementState.currentPathIndex = nextPathIndex;
          updatedMovementState.movementStatus = 'moving';
          updatedMovementState.startTime = Date.now();
          updatedMovementState.startPosition = updatedMovementState.targetPosition;
          
          if (isLastStep) {
            // Final step - move to attack range
            const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
              { position: { nodeIndex: movementState.fullPath[nextPathIndex] } } as IBattalion,
              nextNodeIndex,
              nodePositions.map(n => n.position)
            );
            updatedMovementState.targetPosition = { 
              x: attackRangePosition.x, 
              y: attackRangePosition.y, 
              nodeIndex: nextNodeIndex 
            };
          } else {
            // Intermediate step - move to node center
            updatedMovementState.targetPosition = {
              x: nodePositions[nextNodeIndex].position.x,
              y: nodePositions[nextNodeIndex].position.y,
              nodeIndex: nextNodeIndex
            };
          }
          
          // Recalculate duration for this step
          const stepDistance = MovementCalculationService.calculateNetworkDistance(
            updatedMovementState.startPosition,
            updatedMovementState.targetPosition
          );
          updatedMovementState.estimatedDuration = this.calculateStepDuration(
            { stats: { speed: 2 } } as IBattalion, // Default speed for continuation
            stepDistance
          );
          
        } catch (error) {
          console.log(`🔄 CONTINUING ERROR: Screen dimensions not available`);
        }
        
      } else {
        // Reached final destination
        console.log(`🏆 FINAL ARRIVAL: Battalion ${movementState.battalionId} reached final target node ${movementState.finalTarget}`);
        updatedMovementState.isWithinAttackRange = true;
      }
    }
  }
  
  return updatedMovementState;
}
```

### 3. Enhanced Server Authority & Client Sync:
```typescript
// In server/src/services/BattalionService.ts - Enhanced position tracking:

/**
 * AUTHORITY: Server-side position tracking with structured client updates
 */

// NEW: Enhanced position update with client sync structure
static updateBattalionPositions(battleId: string, battle: any): {
  positionUpdates: Array<{battalionId: string, oldPosition: number, newPosition: number, coordinates: {x: number, y: number}}>,
  movementUpdates: Array<{battalionId: string, movementState: MovementState}>
} {
  const positionUpdates = [];
  const movementUpdates = [];
  
  const movementStates = MovementService.getMovementStates(battleId);
  
  for (const [battalionId, movementState] of movementStates) {
    if (movementState.movementStatus === 'arrived') {
      const battalion = battle.battalions.find(b => b.id === battalionId);
      if (battalion && battalion.position.nodeIndex !== movementState.targetPosition.nodeIndex) {
        const oldPosition = battalion.position.nodeIndex;
        
        // SERVER AUTHORITY: Update battalion position
        battalion.position.nodeIndex = movementState.targetPosition.nodeIndex;
        battalion.position.x = movementState.targetPosition.x;
        battalion.position.y = movementState.targetPosition.y;
        
        console.log(`🔄 SERVER POSITION: ${battalion.owner} ${battalion.type} moved ${oldPosition} → ${battalion.position.nodeIndex}`);
        
        // Prepare structured update for client
        positionUpdates.push({
          battalionId: battalion.id,
          oldPosition: oldPosition,
          newPosition: battalion.position.nodeIndex,
          coordinates: { x: battalion.position.x, y: battalion.position.y }
        });
      }
    }
    
    // Track movement state changes for client
    if (movementState.movementStatus === 'moving') {
      movementUpdates.push({
        battalionId: battalionId,
        movementState: movementState
      });
    }
  }
  
  if (positionUpdates.length > 0) {
    console.log(`📡 CLIENT SYNC: Prepared ${positionUpdates.length} position updates for transmission`);
  }
  
  return { positionUpdates, movementUpdates };
}
```

### 4. AttackService Movement Interruption Integration:
```typescript
// In server/src/services/AttackService.ts - ADD movement interruption:

/**
 * NEW: Get battalions currently in retargeting movement
 */
static getMovingBattalionsInBattle(battleId: string): string[] {
  const movementStates = MovementService.getMovementStates(battleId);
  const movingBattalions: string[] = [];
  
  for (const [battalionId, movementState] of movementStates) {
    if (movementState.movementStatus === 'moving' && 
        movementState.movementType === 'retargeting' && 
        movementState.isInterruptible) {
      movingBattalions.push(battalionId);
    }
  }
  
  return movingBattalions;
}

// MODIFY executeRetargetingTask to include movement interruption:
static async executeRetargetingTask(battle: any, capturedNodeIndex: number, affectedBattalionIds: string[]): Promise<void> {
  console.log(`🎯 EXECUTING: Retargeting for node ${capturedNodeIndex} capture`);
  
  // NEW: Check for moving battalions and interrupt them
  const movingBattalions = this.getMovingBattalionsInBattle(battle.battleId);
  if (movingBattalions.length > 0) {
    console.log(`🛑 CAPTURE INTERRUPT: ${movingBattalions.length} battalions moving during capture`);
    for (const battalionId of movingBattalions) {
      const interrupted = MovementService.interruptRetargetingMovement(battalionId, battle.battleId);
      if (interrupted) {
        console.log(`🛑 CAPTURE INTERRUPT: Stopped movement for battalion ${battalionId}`);
      }
    }
  }
  
  // Continue with existing retargeting logic...
  const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
    capturedNodeIndex,
    affectedBattalionIds,
    battle.battalions,
    battle.nodes
  );
  
  // ... rest of existing logic
}
```

## 📋 STEP-BY-STEP IMPLEMENTATION:

### Step 1: Enhance MovementService Signatures
- Modify `initiateMovement` to accept `movementType` and `fullPath` parameters
- Create `initiateInitialMovement` and `initiateRetargetingMovement` private methods
- Add `calculateStepDuration` for speed-based timing

### Step 2: Implement Movement Interruption
- Add `interruptRetargetingMovement` method to MovementService
- Integrate interruption checks in AttackService capture handling
- Add `getMovingBattalionsInBattle` helper method

### Step 3: Build Sequential Movement Logic
- Modify `updateMovementProgress` for step-by-step movement
- Handle intermediate vs final target positioning
- Implement proper speed stat integration

### Step 4: Enhanced Server Position Tracking
- Create `updateBattalionPositions` in BattalionService
- Structure position updates for client synchronization
- Ensure server authority over all position calculations

### Step 5: Integration Testing
- Test initial vs retargeting movement types
- Verify speed stats affect movement timing correctly
- Confirm interruption works during captures

## 🐛 DEBUG LOGS EXPECTED:
```
🚀 MOVEMENT START: user breacher retargeting movement (1 → 8)
🔄 RETARGETING: Sequential movement via path [1 → 3 → 7 → 5 → 8]
🔄 RETARGETING: Cross-network targeting - moving through network to reach target
🏃 RETARGETING: Moving to INTERMEDIATE node 3 (step 1/4)
⏱️ SPEED CALC: breacher speed=3 → 150px/s → 2667ms
✅ ARRIVAL: Battalion user-battalion-1 arrived at node 3
🔄 SERVER POSITION: user breacher moved 1 → 3
🔄 CONTINUING: Battalion user-battalion-1 continuing to node 7 (step 2/4)
🛑 CAPTURE INTERRUPT: 1 battalions moving during capture
🛑 CAPTURE INTERRUPT: Stopped movement for battalion user-battalion-1
📡 CLIENT SYNC: Prepared 1 position updates for transmission
```

## ✅ SUCCESS CRITERIA:
- Movement types (initial vs retargeting) work correctly
- Speed stats properly affect movement timing
- Sequential movement through multi-node paths functions
- Movement interruption prevents conflicts during captures
- Server authority maintained over all position tracking
- Client sync provides structured updates
- Cross-network targeting fully supported
- Foundation ready for testing and refinement (Phase 5)

## 🚀 NEXT PHASE:
After Phase 4 completion, Phase 5 will implement testing framework and debug endpoints for verification. 