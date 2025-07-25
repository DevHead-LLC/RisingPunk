# Phase 5: Testing Framework & Debug Endpoints

## 🎯 GOAL: 
Implement testing framework and debug endpoints for comprehensive verification of the retargeting and movement system

## 🔍 LOGIC HOLES ADDRESSED:

This phase addresses verification and debugging needs rather than specific logic holes from intended.md. It provides the tools to validate that all previous phases work correctly together.

## 🏗️ WHAT WE'LL BUILD:

### 1. Debug Endpoint for Manual Node Capture:
```typescript
// In server/src/routes/battle.ts - ADD debug endpoint:

router.post('/debug/capture-node', async (req, res) => {
  try {
    const { battleId, nodeIndex, newOwner } = req.body;

    console.log(`🧪 MANUAL CAPTURE: Simulating capture of node ${nodeIndex} by ${newOwner}`);

    const battle = await Battle.findOne({ battleId });
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    const node = battle.nodes.find(n => n.index === nodeIndex);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    if (node.owner !== NodeOwner.NEUTRAL) {
      return res.status(400).json({ error: 'Can only capture neutral nodes' });
    }

    // Simulate capture
    const oldOwner = node.owner;
    node.owner = newOwner;
    node.tugOfWarProgress = newOwner === NodeOwner.USER ? 100 : -100;

    console.log(`🧪 MANUAL CAPTURE: Node ${nodeIndex} ${oldOwner} → ${newOwner}`);

    // Trigger selective retargeting (our new system)
    const affectedBattalions = AttackService.getBattalionsAttackingSpecificNode(nodeIndex);
    if (affectedBattalions.length > 0) {
      console.log(`🧪 MANUAL CAPTURE: Triggering retargeting for ${affectedBattalions.length} battalions`);
      await AttackService.queueRetargetingTask(battle.battleId, nodeIndex, affectedBattalions);
    } else {
      console.log(`🧪 MANUAL CAPTURE: No battalions attacking node ${nodeIndex}`);
    }

    await battle.save();

    res.json({
      success: true,
      message: `Node ${nodeIndex} captured by ${newOwner}`,
      affectedBattalions: affectedBattalions.length
    });

  } catch (error) {
    console.error('Manual capture error:', error);
    res.status(500).json({ error: 'Capture failed' });
  }
});
```

### 2. Debug Endpoint for Movement State Inspection:
```typescript
// In server/src/routes/battle.ts - ADD movement inspection endpoint:

router.get('/debug/movement-states/:battleId', async (req, res) => {
  try {
    const { battleId } = req.params;

    console.log(`🔍 DEBUG: Inspecting movement states for battle ${battleId}`);

    const movementStates = MovementService.getMovementStates(battleId);
    const stateDetails = [];

    for (const [battalionId, movementState] of movementStates) {
      stateDetails.push({
        battalionId,
        movementType: movementState.movementType,
        movementStatus: movementState.movementStatus,
        currentPosition: movementState.startPosition.nodeIndex,
        targetPosition: movementState.targetPosition.nodeIndex,
        fullPath: movementState.fullPath,
        currentPathIndex: movementState.currentPathIndex,
        finalTarget: movementState.finalTarget,
        isInterruptible: movementState.isInterruptible,
        isWithinAttackRange: movementState.isWithinAttackRange,
        progressPercent: Math.round(((Date.now() - movementState.startTime) / movementState.estimatedDuration) * 100)
      });
    }

    console.log(`🔍 DEBUG: Found ${stateDetails.length} movement states`);

    res.json({
      battleId,
      movementStates: stateDetails,
      summary: {
        totalMoving: stateDetails.filter(s => s.movementStatus === 'moving').length,
        totalArrived: stateDetails.filter(s => s.movementStatus === 'arrived').length,
        initialMovements: stateDetails.filter(s => s.movementType === 'initial').length,
        retargetingMovements: stateDetails.filter(s => s.movementType === 'retargeting').length,
        interruptibleMovements: stateDetails.filter(s => s.isInterruptible).length
      }
    });

  } catch (error) {
    console.error('Movement state inspection error:', error);
    res.status(500).json({ error: 'Inspection failed' });
  }
});
```

### 3. Debug Endpoint for Attack State Inspection:
```typescript
// In server/src/routes/battle.ts - ADD attack state inspection endpoint:

router.get('/debug/attack-states/:battleId', async (req, res) => {
  try {
    const { battleId } = req.params;

    console.log(`🔍 DEBUG: Inspecting attack states for battle ${battleId}`);

    const battle = await Battle.findOne({ battleId });
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    const attackDetails = [];
    const attackStates = AttackService.getActiveAttacks();

    for (const [battalionId, attackState] of attackStates) {
      const battalion = battle.battalions.find(b => b.id === battalionId);
      if (battalion) {
        attackDetails.push({
          battalionId,
          battalionType: battalion.type,
          battalionOwner: battalion.owner,
          isAttacking: attackState.isAttacking,
          targetNodeIndex: attackState.targetNodeIndex,
          attackStartTime: attackState.attackStartTime,
          lastDamageTime: attackState.lastDamageTime
        });
      }
    }

    // Group by target nodes
    const nodeAttacks = {};
    attackDetails.forEach(attack => {
      if (!nodeAttacks[attack.targetNodeIndex]) {
        nodeAttacks[attack.targetNodeIndex] = [];
      }
      nodeAttacks[attack.targetNodeIndex].push(attack);
    });

    console.log(`🔍 DEBUG: Found ${attackDetails.length} attack states across ${Object.keys(nodeAttacks).length} nodes`);

    res.json({
      battleId,
      attackStates: attackDetails,
      nodeAttacks: nodeAttacks,
      summary: {
        totalAttacking: attackDetails.filter(a => a.isAttacking).length,
        nodesUnderAttack: Object.keys(nodeAttacks).length,
        attacksByNode: Object.keys(nodeAttacks).map(nodeIndex => ({
          nodeIndex: parseInt(nodeIndex),
          attackCount: nodeAttacks[nodeIndex].length,
          attackers: nodeAttacks[nodeIndex].map(a => `${a.battalionOwner} ${a.battalionType}`)
        }))
      }
    });

  } catch (error) {
    console.error('Attack state inspection error:', error);
    res.status(500).json({ error: 'Inspection failed' });
  }
});
```

### 4. Combat Loop Temporary Disable for Testing:
```typescript
// In server/src/services/AttackService.ts - MODIFY processActiveAttacks for testing:

static async processActiveAttacks(battle: any): Promise<void> {
  console.log(`🔇 IMPLEMENTATION MODE: Combat disabled for retargeting/movement implementation`);

  // Comment out combat loop for implementation
  /*
  for (const [battalionId, attackState] of this.getActiveAttacks()) {
    if (!attackState.isAttacking) continue;

    const battalion = battle.battalions.find(b => b.id === battalionId);
    const targetNode = battle.nodes.find(n => n.index === attackState.targetNodeIndex);

    if (!battalion || !targetNode) continue;

    // ... existing combat logic commented out for testing
    const damageResult = CombatService.applyTugOfWarDamage(
      targetNode,
      battalion,
      attackState
    );

    if (damageResult.captured) {
      // ... capture logic
    }
  }
  */

  // Keep capture detection available for manual verification
  console.log(`🔇 IMPLEMENTATION MODE: Use manual capture for retargeting verification`);
  console.log(`🔇 IMPLEMENTATION MODE: Use /debug/capture-node endpoint to simulate captures`);
}
```

### 5. Enhanced Logging for Phase Integration:
```typescript
// In server/src/services/BattalionService.ts - ADD comprehensive logging:

static async updateBattleMovement(battleId: string): Promise<void> {
  console.log(`🔄 BATTALION UPDATE: Starting movement update for battle ${battleId}`);
  
  try {
    const battle = await Battle.findOne({ battleId });
    if (!battle) {
      console.log(`🔄 BATTALION UPDATE ERROR: Battle ${battleId} not found`);
      return;
    }

    // Update movement progress
    await MovementService.updateBattleMovement(battleId);
    
    // Enhanced position tracking with detailed logging
    const { positionUpdates, movementUpdates } = BattalionService.updateBattalionPositions(battleId, battle);
    
    if (positionUpdates.length > 0) {
      console.log(`🔄 BATTALION UPDATE: ${positionUpdates.length} position updates processed`);
      positionUpdates.forEach(update => {
        console.log(`🔄 POSITION: ${update.battalionId} moved from node ${update.oldPosition} to node ${update.newPosition}`);
      });
      
      await battle.save();
      console.log(`🔄 BATTALION UPDATE: Battle state saved with position updates`);
    }
    
    if (movementUpdates.length > 0) {
      console.log(`🔄 BATTALION UPDATE: ${movementUpdates.length} battalions currently moving`);
      movementUpdates.forEach(update => {
        console.log(`🔄 MOVEMENT: ${update.battalionId} ${update.movementState.movementType} movement in progress`);
      });
    }
    
  } catch (error) {
    console.error('🔄 BATTALION UPDATE ERROR:', error);
  }
}
```

## 📋 STEP-BY-STEP IMPLEMENTATION:

### Step 1: Add Debug Endpoints
- Create `/debug/capture-node` POST endpoint for manual node captures
- Create `/debug/movement-states/:battleId` GET endpoint for movement inspection
- Create `/debug/attack-states/:battleId` GET endpoint for attack state inspection

### Step 2: Temporarily Disable Combat Loop
- Comment out damage application in `AttackService.processActiveAttacks`
- Keep capture detection logic available for manual triggering
- Add clear logging about implementation mode

### Step 3: Enhanced Integration Logging
- Add comprehensive logging to `BattalionService.updateBattleMovement`
- Include position update details and movement state summaries
- Log save operations and error handling

### Step 4: Create Test Scenarios
- Test initial movement (user clicks deploy, battalions move to neutral nodes)
- Test manual capture with retargeting (use debug endpoint)
- Test sequential movement through multi-hop paths
- Test movement interruption during captures

### Step 5: Verification Checklist
- Verify Phase 1: Movement type distinction and selective attacking
- Verify Phase 2: Cross-network pathfinding (0→8, 1→5, etc.)
- Verify Phase 3: Proximity-based retargeting with random tie-breaking
- Verify Phase 4: Sequential movement with speed stats and interruption

## 🐛 DEBUG LOGS EXPECTED:
```
🧪 MANUAL CAPTURE: Simulating capture of node 3 by user
🧪 MANUAL CAPTURE: Node 3 neutral → user
🧪 MANUAL CAPTURE: Triggering retargeting for 2 battalions
📋 RETARGETING QUEUE: Added task for node 3 capture (queue size: 1)
⚙️ RETARGETING QUEUE: Starting sequential processing
🎯 RETARGETING START: Node 3 captured, 2 battalions affected
🎯 PROXIMITY: Selected node 5 (2 hops via [1 → 3 → 7 → 5])
🚀 MOVEMENT START: enemy breacher retargeting movement (1 → 5)
🔄 RETARGETING: Sequential movement via path [1 → 3 → 7 → 5]
🏃 RETARGETING: Moving to INTERMEDIATE node 3 (step 1/3)
⏱️ SPEED CALC: breacher speed=3 → 150px/s → 2000ms
🔍 DEBUG: Found 3 movement states across 2 battles
🔇 IMPLEMENTATION MODE: Combat disabled for retargeting/movement implementation
```

## 🧪 TEST SCENARIOS:

### Scenario 1: Basic Initial Movement
1. Start application and deploy battalions
2. Verify initial movement logs show correct targeting
3. Check attack range positioning works correctly

### Scenario 2: Manual Capture & Retargeting
1. Use `/debug/capture-node` to capture a contested node
2. Verify only affected battalions retarget
3. Check proximity-based target selection with random tie-breaking

### Scenario 3: Cross-Network Movement
1. Force retargeting from node 0 to node 8
2. Verify pathfinding generates correct multi-hop path: [0 → 3 → 7 → 5 → 8]
3. Check sequential movement through each intermediate node

### Scenario 4: Movement Interruption
1. Start retargeting movement for a battalion
2. Trigger another capture while battalion is moving
3. Verify movement is interrupted and new retargeting begins

### Scenario 5: Queue System Testing
1. Trigger multiple simultaneous captures using debug endpoint
2. Verify retargeting queue processes tasks sequentially
3. Check no race conditions occur

## ✅ SUCCESS CRITERIA:
- All debug endpoints provide accurate system state information
- Manual capture triggering works correctly with retargeting
- Combat loop can be disabled without breaking retargeting
- Comprehensive logging provides clear visibility into system behavior
- All previous phases integrate smoothly without conflicts
- Cross-network targeting works for all valid node combinations
- Sequential movement respects speed stats and network topology
- Movement interruption prevents conflicts during rapid captures

## 🚀 NEXT STEPS:
After Phase 5 completion, the retargeting and movement system will be fully implemented and tested. The user can then re-enable combat and proceed with normal battle gameplay, or request additional features based on testing results. 