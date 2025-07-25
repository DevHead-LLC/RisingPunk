# Phase 3: RetargetingService Implementation

## 🎯 GOAL:
Implement proximity-based retargeting using PathfindingService for NEAREST target selection (neutral nodes OR enemy battalions) with random tie-breaking

## 🔍 LOGIC HOLES ADDRESSED:

### HOLE #4: SIMULTANEOUS CAPTURE RACE CONDITIONS
**INTENDED.MD:** "Multiple simultaneous captures are processed in sequence to avoid race conditions"
**CURRENT PLAN:** Single capture → retargeting flow
**MISSING:** Retargeting queue system to handle rapid consecutive captures
**SOLUTION:** Implement retargeting task queue with sequential processing

## 🏗️ WHAT WE'LL BUILD:

### 1. RetargetingService.ts (NEW FILE):
```typescript
// server/src/services/RetargetingService.ts
import { IBattalion, INode, NodeOwner } from '../types/battle';
import { PathfindingService } from './PathfindingService';

export interface RetargetingResult {
  battalionId: string;
  currentNodeIndex: number;
  newTargetNodeIndex: number;
  pathToTarget: number[];  // Full path including start and end
  pathDistance: number;    // Hop count
  targetType: 'neutral_node' | 'enemy_battalion';  // Both neutral nodes and enemy battalions
}

/**
 * AUTHORITY: Post-capture proximity targeting for NEAREST targets (neutral nodes OR enemy battalions)
 * OVERLAPS: Uses PathfindingService for distances, integrates with AttackService
 * DEPENDENCIES: PathfindingService, node ownership validation
 */
export class RetargetingService {
  /**
   * Main retargeting function called after node capture
   */
  static retargetBattalionsAfterCapture(
    capturedNodeIndex: number,
    affectedBattalionIds: string[],
    allBattalions: IBattalion[],
    allNodes: INode[]
  ): RetargetingResult[] {
    console.log(`🎯 RETARGETING START: Node ${capturedNodeIndex} captured, ${affectedBattalionIds.length} battalions affected`);
    
    // Find the NEAREST target (neutral nodes OR enemy battalions)
    const neutralNodes = allNodes.filter(node => node.owner === NodeOwner.NEUTRAL);
    const enemyBattalions = allBattalions.filter(b => b.owner !== battalion.owner);
    
    console.log(`🎯 RETARGETING: Available neutral targets: [${neutralNodes.map(n => n.index).join(', ')}]`);
    console.log(`🎯 RETARGETING: Available enemy battalions: ${enemyBattalions.length}`);
    
    if (neutralNodes.length === 0 && enemyBattalions.length === 0) {
      console.log(`🎯 RETARGETING: No targets available for retargeting`);
      return [];
    }
    
    const retargetingResults: RetargetingResult[] = [];
    
    for (const battalionId of affectedBattalionIds) {
      const battalion = allBattalions.find(b => b.id === battalionId);
      if (!battalion) {
        console.log(`🎯 RETARGETING ERROR: Battalion ${battalionId} not found`);
        continue;
      }
      
      console.log(`🎯 PROXIMITY: Evaluating ${neutralNodes.length + enemyBattalions.length} total targets for ${battalion.owner} ${battalion.type}`);
      
      const targetResult = this.findClosestTarget(battalion, neutralNodes, enemyBattalions);
      if (targetResult) {
        console.log(`🎯 PROXIMITY: Selected ${targetResult.targetType} at node ${targetResult.targetNodeIndex} (${targetResult.pathDistance} hops via ${targetResult.pathToTarget.join(' → ')})`);
        
        retargetingResults.push({
          battalionId: battalion.id,
          currentNodeIndex: battalion.position.nodeIndex,
          newTargetNodeIndex: targetResult.targetNodeIndex,
          pathToTarget: targetResult.pathToTarget,
          pathDistance: targetResult.pathDistance,
          targetType: targetResult.targetType
        });
      } else {
        console.log(`🎯 PROXIMITY ERROR: No reachable targets for ${battalion.owner} ${battalion.type}`);
      }
    }
    
    console.log(`🎯 RETARGETING END: ${retargetingResults.length}/${affectedBattalionIds.length} battalions retargeted`);
    return retargetingResults;
  }
  
  /**
   * Find closest target (neutral node OR enemy battalion) using network pathfinding with random tie-breaking
   */
  static findClosestTarget(
    battalion: IBattalion,
    neutralNodes: INode[],
    enemyBattalions: IBattalion[]
  ): {targetNodeIndex: number, pathToTarget: number[], pathDistance: number, targetType: 'neutral_node' | 'enemy_battalion'} | null {
    
    let closestDistance = Infinity;
    let candidateTargets: Array<{nodeIndex: number, path: number[], distance: number}> = [];
    
    // Calculate network distance to each neutral node
    for (const node of neutralNodes) {
      const path = PathfindingService.findNetworkPath(battalion.position.nodeIndex, node.index);
      
      if (path.length > 0) {
        const distance = path.length - 1; // Hop count
        console.log(`🎯 PROXIMITY: Node ${node.index} reachable in ${distance} hops`);
        
        if (distance < closestDistance) {
          // Found closer target - reset candidates
          closestDistance = distance;
          candidateTargets = [{nodeIndex: node.index, path: path, distance: distance}];
        } else if (distance === closestDistance) {
          // Tied for closest - add to candidates
          candidateTargets.push({nodeIndex: node.index, path: path, distance: distance});
        }
      } else {
        console.log(`🎯 PROXIMITY: Node ${node.index} unreachable via network`);
      }
    }
    
    if (candidateTargets.length === 0) {
      console.log(`🎯 PROXIMITY ERROR: No reachable neutral nodes for battalion`);
      return null;
    }
    
    // Random selection from equidistant targets
    let selectedTarget;
    if (candidateTargets.length === 1) {
      selectedTarget = candidateTargets[0];
      console.log(`🎯 PROXIMITY: Single closest target selected`);
    } else {
      const randomIndex = Math.floor(Math.random() * candidateTargets.length);
      selectedTarget = candidateTargets[randomIndex];
      console.log(`🎯 PROXIMITY: Selected node ${selectedTarget.nodeIndex} (random from ${candidateTargets.length} equidistant)`);
    }
    
    return {
      targetNodeIndex: selectedTarget.nodeIndex,
      pathToTarget: selectedTarget.path,
      pathDistance: selectedTarget.distance
    };
  }
}
```

### 2. AttackService Integration with Queue System:
```typescript
// In server/src/services/AttackService.ts - ADD retargeting queue system:

/**
 * AUTHORITY: Attack state management with retargeting queue for race condition prevention
 */

// NEW: Retargeting queue to handle simultaneous captures
private static retargetingQueue: Array<{
  battleId: string,
  capturedNodeIndex: number,
  affectedBattalionIds: string[],
  timestamp: number
}> = [];

private static isProcessingQueue: boolean = false;

/**
 * NEW: Add retargeting task to queue for sequential processing
 */
static queueRetargetingTask(battleId: string, capturedNodeIndex: number, affectedBattalionIds: string[]): void {
  const task = {
    battleId,
    capturedNodeIndex,
    affectedBattalionIds,
    timestamp: Date.now()
  };
  
  this.retargetingQueue.push(task);
  console.log(`📋 RETARGETING QUEUE: Added task for node ${capturedNodeIndex} capture (queue size: ${this.retargetingQueue.length})`);
  
  // Start processing if not already running
  if (!this.isProcessingQueue) {
    this.processRetargetingQueue();
  }
}

/**
 * NEW: Process retargeting queue sequentially to avoid race conditions
 */
static async processRetargetingQueue(): Promise<void> {
  if (this.isProcessingQueue) return;
  
  this.isProcessingQueue = true;
  console.log(`⚙️ RETARGETING QUEUE: Starting sequential processing`);
  
  while (this.retargetingQueue.length > 0) {
    const task = this.retargetingQueue.shift()!;
    
    console.log(`⚙️ RETARGETING QUEUE: Processing node ${task.capturedNodeIndex} capture (${task.affectedBattalionIds.length} battalions)`);
    
    try {
      const battle = await Battle.findOne({ battleId: task.battleId });
      if (battle) {
        await this.executeRetargetingTask(battle, task.capturedNodeIndex, task.affectedBattalionIds);
      }
    } catch (error) {
      console.error(`❌ RETARGETING QUEUE: Error processing task for node ${task.capturedNodeIndex}:`, error);
    }
    
    // Small delay between tasks to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  this.isProcessingQueue = false;
  console.log(`⚙️ RETARGETING QUEUE: Finished processing all tasks`);
}

/**
 * NEW: Execute individual retargeting task
 */
static async executeRetargetingTask(battle: any, capturedNodeIndex: number, affectedBattalionIds: string[]): Promise<void> {
  console.log(`🎯 EXECUTING: Retargeting for node ${capturedNodeIndex} capture`);
  
  // Use RetargetingService to find new targets
  const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
    capturedNodeIndex,
    affectedBattalionIds,
    battle.battalions,
    battle.nodes
  );
  
  // Update battalion targeting results
  if (retargetingResults.length > 0) {
    const targetingResults = retargetingResults.map(result => ({
      battalionId: result.battalionId,
      targetNode: result.newTargetNodeIndex,
      networkPath: result.pathToTarget
    }));
    
    // Integrate with BattalionService to update targeting
    await BattalionService.updateTargetingResults(battle.battleId, targetingResults);
    
    console.log(`🎯 INTEGRATION: Updated targeting for ${retargetingResults.length} battalions`);
  }
}

/**
 * MODIFIED: Use queue system in processActiveAttacks
 */
// In processActiveAttacks - after capture detection:
if (captured) {
  // Get ONLY battalions attacking this specific captured node
  const affectedAttackers = this.getBattalionsAttackingSpecificNode(node.index);
  
  // Stop attacks for ONLY these specific battalions
  affectedAttackers.forEach(id => this.stopAttacking(id));
  
  console.log(`🏆 NODE CAPTURED: Node ${node.index} → ${node.owner}, stopping ${affectedAttackers.length} specific attacks`);
  
  // NEW: Add to retargeting queue instead of immediate processing
  this.queueRetargetingTask(battle.battleId, node.index, affectedAttackers);
}
```

## 📋 STEP-BY-STEP IMPLEMENTATION:

### Step 1: Create RetargetingService File
- Create new file: `server/src/services/RetargetingService.ts`
- Import PathfindingService and battle types
- Define RetargetingResult interface

### Step 2: Implement Proximity Logic
- Build `findClosestTarget()` with network distance calculation for both neutral nodes and enemy battalions
- Use PathfindingService for hop count calculations
- Implement random tie-breaking for equidistant targets

### Step 3: Add Queue System to AttackService
- Implement retargeting task queue with timestamps
- Add sequential processing to prevent race conditions
- Integrate with existing capture detection

### Step 4: Integrate with BattalionService
- Connect retargeting results to targeting system
- Update targeting results for retargeted battalions
- Ensure smooth transition from old targets to new ones

### Step 5: Integrate Retargeting Status with Client Responses
- Fix BattleResponseService to include retargetingStatus in response object
- Pass retargeting data from AttackService to BattleResponseService
- Ensure client receives retargeting information for UI updates

```typescript
// In server/src/services/BattleResponseService.ts - FIX retargetingStatus integration:
static createBattleStateResponse(
  battle: IBattleDocument,
  mappedBattalions: ClientBattalion[],
  networkData: NetworkData,
  targetingResults: any[] = [],
  retargetingStatus?: {nodeIndex: number, affectedBattalionIds: string[]}
): BattleStateResponse {
  // PHASE 3: Actually include retargeting status in response
  if (retargetingStatus) {
    console.log(`📡 CLIENT SYNC: Including retargeting status in response`);
    console.log(`📡 CLIENT SYNC: Node ${retargetingStatus.nodeIndex} captured, ${retargetingStatus.affectedBattalionIds.length} battalions affected`);
  }

  return {
    battleId: battle.battleId,
    phase: battle.phase,
    countdown: battle.countdown,
    battleTime: battle.battleTime,
    winner: battle.winner,
    battalions: mappedBattalions,
    nodes: networkData.updatedNodes,
    networkConnections: networkData.networkConnections,
    lineProperties: networkData.lineProperties,
    targetingResults,
    retargetingStatus, // NEW: Actually include in response
    lastUpdated: battle.updatedAt
  };
}
```

### Step 6: Test Queue Processing
- Verify sequential processing of simultaneous captures
- Confirm no race conditions in retargeting
- Test random selection for equidistant targets

## 🐛 DEBUG LOGS EXPECTED:
```
🏆 NODE CAPTURED: Node 3 → user, stopping 2 specific attacks
📋 RETARGETING QUEUE: Added task for node 3 capture (queue size: 1)
⚙️ RETARGETING QUEUE: Starting sequential processing
⚙️ RETARGETING QUEUE: Processing node 3 capture (2 battalions)
🎯 RETARGETING START: Node 3 captured, 2 battalions affected
🎯 RETARGETING: Available neutral targets: [4, 5]
🎯 RETARGETING: Available enemy battalions: 2
🎯 PROXIMITY: Evaluating 4 total targets for enemy breacher
🎯 PROXIMITY: Neutral node 4 reachable in 1 hops
🎯 PROXIMITY: Neutral node 5 reachable in 2 hops
🎯 PROXIMITY: Enemy battalion at node 7 reachable in 1 hops
🎯 PROXIMITY: Selected neutral_node at node 4 (random from 2 equidistant)
🎯 RETARGETING END: 2/2 battalions retargeted
🎯 INTEGRATION: Updated targeting for 2 battalions
📡 CLIENT SYNC: Including retargeting status in response
📡 CLIENT SYNC: Node 3 captured, 2 battalions affected
⚙️ RETARGETING QUEUE: Finished processing all tasks
```

## ✅ SUCCESS CRITERIA:
- RetargetingService correctly identifies closest targets (neutral nodes OR enemy battalions)
- Random tie-breaking works for equidistant targets
- Queue system prevents race conditions from simultaneous captures
- Integration with PathfindingService provides accurate distances
- Pure proximity-based selection (no priority system)
- Affected battalions get new targets smoothly
- Foundation ready for sequential movement implementation (Phase 4)

## 🚀 NEXT PHASE:
After Phase 3 completion, Phase 4 will implement sequential movement with speed stats and interruption capability. 