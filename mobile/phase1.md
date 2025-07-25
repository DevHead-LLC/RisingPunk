# Phase 1: Foundation Setup & Overlap Resolution

## 🎯 GOAL:
Separate initial vs retargeting movement logic and resolve service overlaps to prevent conflicts between movement types.

## 🔍 LOGIC HOLES ADDRESSED:

### HOLE #1: MISSING MOVEMENT INTERRUPTION INTEGRATION
**INTENDED.MD:** "If movement is interrupted by another capture, stop immediately and retarget"
**CURRENT PLAN:** Movement interruption logic exists but no integration with capture triggers
**MISSING:** AttackService must check for moving battalions and interrupt them during captures

### HOLE #5: SERVER AUTHORITY & CLIENT SYNCHRONIZATION
**INTENDED.MD:** "Server authority: All movement, targeting, and positioning calculated server-side"
**CURRENT PLAN:** Position updates in BattalionService
**CLARIFIED:** Server calculates everything, client receives updates for visual display only
**SOLUTION:** Enhanced server-side position tracking with structured client updates

## 🏗️ WHAT WE'LL BUILD:

### 1. Enhanced MovementState Interface:
```typescript
// In mobile/src/types/battleTypes.ts - ADD these properties:
export interface MovementState {
  // ... existing properties
  movementType: 'initial' | 'retargeting';        // NEW - prevents logic mixing
  fullPath?: number[];                             // NEW - complete multi-node path [0,3,1,4]
  currentPathIndex?: number;                       // NEW - current position in fullPath (0=start)
  finalTarget?: number;                            // NEW - ultimate destination node
  isInterruptible?: boolean;                       // NEW - can be stopped for retargeting
}
```

### 2. AttackService Selective Stopping:
```typescript
// In server/src/services/AttackService.ts - MODIFY getBattalionsAttackingNode():
static getBattalionsAttackingSpecificNode(nodeIndex: number): string[] {
  // Return ONLY battalions attacking this specific node
  // This ensures we don't stop ALL attacks when one node is captured
  console.log(`🔍 SELECTIVE: Finding battalions attacking node ${nodeIndex} specifically`);

  const attackers: string[] = [];
  for (const [battalionId, attackState] of this.attackStates) {
    if (attackState.isAttacking && attackState.targetNodeIndex === nodeIndex) {
      attackers.push(battalionId);
      console.log(`🔍 SELECTIVE: Battalion ${battalionId} is attacking node ${nodeIndex}`);
    }
  }

  console.log(`🔍 SELECTIVE: Found ${attackers.length} battalions attacking node ${nodeIndex}`);
  return attackers;
}
```

### 3. BattleResponseService Retargeting Data:
```typescript
// In server/src/services/BattleResponseService.ts - ADD retargeting status:
static createBattleStateResponse(
  battle: IBattleDocument,
  mappedBattalions: ClientBattalion[],
  networkData: NetworkData,
  targetingResults: any[] = [],
  retargetingStatus?: {nodeIndex: number, affectedBattalionIds: string[]} // NEW
): BattleStateResponse {
  console.log(`📡 CLIENT SYNC: Including retargeting status in response`);
  // Include retargeting data for client awareness
}
```

### 4. MovementService Movement Type Detection:
```typescript
// In server/src/services/MovementService.ts - MODIFY initiateMovement signature:
static initiateMovement(
  battalion: IBattalion,
  targetNode: number,
  screenWidth: number,
  screenHeight: number,
  movementType: 'initial' | 'retargeting' = 'initial', // NEW parameter
  fullPath?: number[]  // Required for retargeting
): MovementState | null {
  console.log(`🔧 MOVEMENT TYPE: ${battalion.owner} ${battalion.type} starting ${movementType} movement (${battalion.position.nodeIndex} → ${targetNode})`);
  
  // Implementation will be completed in Phase 4
  // For now, just log the movement type distinction
}
```

## 🔧 OVERLAP RESOLUTIONS:

### AttackService Authority & Conflicts:
- **AUTHORITY:** Attack state tracking, starting/stopping attacks, capture triggers
- **OVERLAPS:** Node capture detection - PRIMARY retargeting trigger point
- **CONFLICTS:** Must stop ONLY attacks on captured node, not all attacks
- **RESOLUTION:** Add `getBattalionsAttackingSpecificNode()` for selective targeting

### BattleResponseService Authority & Conflicts:
- **AUTHORITY:** Client data formatting and API response structure
- **OVERLAPS:** Uses `MovementState` and targeting data - MUST coordinate with retargeting implementation
- **CONFLICTS:** May need to include retargeting data in client responses
- **RESOLUTION:** Add optional `retargetingStatus` parameter to response creation

### BattalionMappingService Authority & Conflicts:
- **AUTHORITY:** Battalion data transformation for client display
- **OVERLAPS:** Uses `battalion.position.nodeIndex` - CRITICAL for retargeting position updates
- **CONFLICTS:** Position updates in retargeting MUST be reflected here for client sync
- **RESOLUTION:** Ensure position updates are properly mapped through service

### MovementService Authority & Conflicts:
- **AUTHORITY:** Movement orchestration and state management
- **OVERLAPS:** Position updates must sync with BattalionMappingService
- **CONFLICTS:** Initial vs retargeting movement logic mixing
- **RESOLUTION:** Add `movementType` parameter to distinguish movement types

## 📋 STEP-BY-STEP IMPLEMENTATION:

### Step 1: Update MovementState Interface
- Add `movementType`, `isInterruptible`, and path tracking properties
- Ensure existing movement logic still works with new optional properties

### Step 2: Implement Selective Attack Identification
- Add `getBattalionsAttackingSpecificNode()` method to AttackService
- Test that it correctly identifies only relevant battalions

### Step 3: Enhance BattleResponseService
- Add optional `retargetingStatus` parameter to response creation
- Prepare for future retargeting data inclusion

### Step 4: Update MovementService Signature
- Modify `initiateMovement` to accept `movementType` parameter
- Add logging to distinguish between initial and retargeting movements
- Maintain backward compatibility for existing calls

### Step 5: Verify No Conflicts
- Ensure all services maintain their distinct authorities
- Confirm no logic duplication between services
- Test that selective attack identification works correctly

## 🐛 DEBUG LOGS EXPECTED:
```
🔧 MOVEMENT TYPE: user guardian starting initial movement (0 → 4)
🔍 SELECTIVE: Finding battalions attacking node 3 specifically
🔍 SELECTIVE: Battalion user-battalion-1 is attacking node 3
🔍 SELECTIVE: Found 1 battalions attacking node 3
📡 CLIENT SYNC: Including retargeting status in response
🏗️ FOUNDATION: Enhanced MovementState with interruption support
```

## ✅ SUCCESS CRITERIA:
- Movement types are clearly distinguished in logs
- Selective attack identification targets specific nodes only
- Enhanced MovementState interface supports both movement types
- No conflicts between service authorities
- Foundation ready for pathfinding implementation (Phase 2)

## 🚀 NEXT PHASE:
After Phase 1 completion, Phase 2 will implement the PathfindingService with BFS algorithm and network validation. 