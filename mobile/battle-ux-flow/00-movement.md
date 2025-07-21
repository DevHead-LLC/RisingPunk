# Battalion Movement System - Network-Constrained Implementation

## **🎯 CORE PRINCIPLE**

**Battalions are locked onto the network without fail.** They travel along network lines and nodes only, able to travel to a new line destination by first moving to the center of a node to reach a new line and must otherwise have the line running through their center as they move along them and never leave the line/node network.

## **📋 IMPLEMENTATION CONCLUSIONS**

### **✅ USE EXISTING NETWORK TOPOLOGY CALCULATIONS FROM SERVER**

**Conclusion**: We MUST use the existing server-side network topology and calculations that are already connected to `BattleGridScreen.tsx`:

**Network Infrastructure Already Connected**:
- ✅ `BATTLE_CONFIG.NETWORK_CONNECTIONS` - 14-connection network definition (actively used)
- ✅ `BATTLE_CONFIG.calculateNodePositions()` - Node positioning for any screen size (actively used)
- ✅ `BATTLE_CONFIG.calculateLineProperties()` - Line calculations for movement direction (actively used)
- ✅ `BattleController.generateNetworkData()` - Screen adaptation (actively used)

**Why**: This infrastructure is already working and tested in the current system. No duplication needed.

### **✅ HANDLE MOVEMENTS IN SERVER, VISUALIZE ON CLIENT**

**Conclusion**: All movement calculations MUST happen on the server, client only receives position updates and animates.

**Server Authority Pattern Already Established**:
- ✅ `BattleService.ts` - Battle orchestration and state management
- ✅ `BattleController.ts` - API endpoint and data generation  
- ✅ `BattleResponseService.ts` - Response formatting
- ✅ `BattalionMappingService.ts` - Data transformation for client
- ✅ Client components - Receive data via `useGetBattleStateQuery()` and render

**Why**: Maintains server authority pattern already established. Client cannot manipulate movement.

### **✅ USE EXISTING TARGETING CALCULATIONS**

**Conclusion**: We MUST reuse the existing targeting logic that's already working:

**Targeting Infrastructure Already Working**:
- ✅ `TargetingService.ts` (125 lines) - Network path validation and target assignment
- ✅ `TargetingService.getNetworkPath()` - Direct path between nodes (use for movement routes)
- ✅ `TargetingService.isReachableViaNetwork()` - Network connection validation (use for movement validation)

**Why**: Targeting system already validates network paths. Movement uses same network validation logic.

## **🏗️ DETAILED IMPLEMENTATION BATCHES**

### **Batch 1: Create MovementService.ts**

**Goal**: Create focused movement service using only existing connected infrastructure

**File**: `server/src/services/MovementService.ts` (NEW - under 250 lines)

**Detailed Implementation Steps**:

1. **Import existing infrastructure** (no new dependencies):
```typescript
import { BATTLE_CONFIG } from '../config/battleConfig';
import { TargetingService } from './TargetingService';
import { IBattalion, INode } from '../types/battle';
```

2. **Define MovementState interface** (extend existing battalion position):
```typescript
interface MovementState {
  battalionId: string;
  startPosition: { x: number; y: number; nodeIndex: number };
  targetPosition: { x: number; y: number; nodeIndex: number };
  currentPosition: { x: number; y: number; nodeIndex: number };
  movementStatus: 'stationary' | 'moving' | 'arrived';
  movementProgress: number; // 0.0 to 1.0
  networkPath: number[]; // [startNode, targetNode] from TargetingService
  attackRangePosition?: { x: number; y: number };
  isWithinAttackRange: boolean;
}
```

3. **Implement initiateMovement()** using existing network validation:
```typescript
static initiateMovement(battalion: IBattalion, targetNode: number): MovementState {
  // Use existing TargetingService.getNetworkPath() for route validation
  const networkPath = TargetingService.getNetworkPath(battalion.position.nodeIndex, targetNode);
  // Use existing battalion.stats.speed for movement speed
  // Use existing battalion.stats.range for attack range calculations
  // Return MovementState with network-constrained path
}
```

4. **Implement updateMovementProgress()** using existing line calculations:
```typescript
static updateMovementProgress(movementState: MovementState, deltaTime: number): MovementState {
  // Use existing BATTLE_CONFIG.calculateLineProperties() for movement direction
  // Apply battalion.stats.speed for movement rate
  // Calculate position interpolation along network line vector
  // Update movementProgress and currentPosition
}
```

5. **Implement calculateAttackRangePosition()** using existing bot stats:
```typescript
static calculateAttackRangePosition(battalion: IBattalion, targetNode: number): Position {
  // Use existing battalion.stats.range from BATTLE_CONFIG.BOT_STATS
  // Calculate network-constrained range (not circular)
  // Use existing BATTLE_CONFIG.calculateLineProperties() for range direction
  // Return position where range intersects target along network line
}
```

**Requirements for Batch 1**:
- File size under 250 lines
- No new dependencies (use only existing connected infrastructure)
- No modifications to existing files
- Network-constrained movement only (never off-network)

### **Batch 2: Server Integration**

**Goal**: Integrate movement into existing server pipeline without breaking current system

**Detailed Implementation Steps**:

1. **Enhance BattleService.ts** (existing file - add movement orchestration):
```typescript
// Add movement state tracking
private movementStates: Map<string, Map<string, MovementState>> = new Map(); // battleId -> battalionId -> MovementState

// Add movement orchestration method
private async updateBattleMovement(battleId: string): Promise<void> {
  // Get battle from existing getBattle() method
  // Get targeting results from existing getTargetingResults() method
  // For each battalion with valid target, call MovementService.initiateMovement()
  // Store movement states in movementStates Map
  // Update battalion positions using MovementService.updateMovementProgress()
}

// Integrate with existing timer event listeners
this.timerService.on('battleTimeUpdate', (data) => {
  if (data.battleId === battleId) {
    // Add movement update call to existing timer logic
    await this.updateBattleMovement(battleId);
  }
});
```

2. **Enhance BattleController.ts** (existing file - add movement data to API response):
```typescript
// In existing getBattleState() method, after line 132:
// Get movement states from BattleService
const movementStates = this.battleService.getMovementStates(battleId);

// Pass movement states to existing BattleResponseService
return BattleResponseService.createBattleStateResponseWithTimer(
  battle, 
  mappedBattalions, 
  networkData, 
  currentPhase, 
  currentCountdown, 
  currentBattleTime, 
  targetingResults,
  movementStates // Add movement data to existing response
);
```

3. **Enhance BattleResponseService.ts** (existing file - include movement in response):
```typescript
// Add movementStates parameter to existing createBattleStateResponseWithTimer()
static createBattleStateResponseWithTimer(
  battle: IBattleDocument,
  mappedBattalions: ClientBattalion[],
  networkData: NetworkData,
  currentPhase: any,
  currentCountdown: number,
  currentBattleTime: number,
  targetingResults: any[] = [],
  movementStates: Map<string, MovementState> = new Map() // Add movement data
): BattleStateResponse {
  // Include movement data in existing response structure
  return {
    // ... existing fields remain unchanged
    movementStates: Array.from(movementStates.values()) // Add movement data to response
  };
}
```

4. **Enhance BattalionMappingService.ts** (existing file - include movement in battalion mapping):
```typescript
// Modify existing mapBattalionsForClient() to include movement data
static mapBattalionsForClient(battalions: IBattalion[], movementStates?: Map<string, MovementState>): ClientBattalion[] {
  return battalions.map(battalion => ({
    // ... existing fields remain unchanged
    movementState: movementStates?.get(battalion.id) // Add movement state to battalion data
  }));
}
```

**Requirements for Batch 2**:
- Use existing server pipeline (no new dependencies)
- Leverage existing timer system for movement updates
- Include movement data in existing API response structure
- No breaking changes to current BattleGridScreen.tsx system

### **Batch 3: Client Animation**

**Goal**: Animate battalion movement in existing client components using server movement data

**Detailed Implementation Steps**:

1. **Enhance BattleBattalionManager.tsx** (existing file - receive movement data):
```typescript
// In existing component, after line 77:
// Extract movement data from existing battleState response
const movementStates = battleState.movementStates || [];

// Create movement state lookup for battalions
const movementLookup = movementStates.reduce((acc, movement) => {
  acc[movement.battalionId] = movement;
  return acc;
}, {} as Record<string, MovementState>);

// Pass movement data to existing BattleBattalion components
return (
  <View style={styles.container}>
    {validBattalions.map((battalion) => {
      const nodePosition = nodePositions[battalion.nodeIndex];
      const movementState = movementLookup[battalion.id]; // Get movement data
      
      return (
        <BattleBattalion
          key={battalion.id}
          battalion={battalion}
          position={nodePosition}
          movementState={movementState} // Pass movement data to BattleBattalion
          size={battalionSize}
          showHealthBar={showHealthBars}
        />
      );
    })}
  </View>
);
```

2. **Enhance BattleBattalion.tsx** (existing file - animate position changes):
```typescript
// Add movementState prop to existing Props interface
interface Props {
  battalion: Battalion;
  position: { x: number; y: number };
  movementState?: MovementState; // Add movement data
  size?: number;
  showHealthBar?: boolean;
}

// In existing component, replace static position with animated position
export const BattleBattalion = React.memo(({
  battalion,
  position,
  movementState,
  size = 30,
  showHealthBar = true,
}: Props) => {
  
  // Use movementState.currentPosition if battalion is moving, otherwise use node position
  const displayPosition = movementState?.movementStatus === 'moving' 
    ? movementState.currentPosition 
    : position;

  // Update existing shape style to use displayPosition instead of position
  const getShapeStyle = () => {
    const base = {
      width: size,
      height: size,
      left: displayPosition.x - size / 2, // Use displayPosition
      top: displayPosition.y - size / 2,  // Use displayPosition
      // ... rest of existing style logic unchanged
    };
    // ... existing shape logic unchanged
  };

  // Update existing health bar and label positioning to use displayPosition
  <View style={[
    styles.healthBarContainer,
    {
      left: displayPosition.x - (size + 10) / 2, // Use displayPosition
      top: displayPosition.y - healthBarOffset,  // Use displayPosition
      width: size + 10,
    },
  ]}>
  
  // ... rest of existing component logic unchanged
});
```

3. **Update battleApi.ts types** (existing file - add movement data to response interface):
```typescript
// Add movement data to existing BattleState interface
export interface BattleState {
  // ... existing fields remain unchanged
  movementStates?: Array<{
    battalionId: string;
    currentPosition: { x: number; y: number; nodeIndex: number };
    movementStatus: 'stationary' | 'moving' | 'arrived';
    movementProgress: number;
    isWithinAttackRange: boolean;
  }>; // Add movement data to API response type
}
```

**Requirements for Batch 3**:
- Use existing client polling system (1-second updates)
- Leverage existing position prop structure in BattleBattalion
- Animate movement along network paths only
- No new client-side dependencies

## **🔄 INTEGRATION WITH EXISTING SYSTEMS**

### **Targeting System Integration**
- Use existing `TargetingResult.targetNode` as movement destination
- Use existing `TargetingService.getNetworkPath()` for movement routes
- Use existing `TargetingService.isReachableViaNetwork()` for movement validation

### **Timer System Integration**
- Use existing `battleTimeUpdate` events to trigger movement updates
- Use existing 100ms server update interval for movement calculations
- Use existing 1000ms client sync interval for position updates

### **Network System Integration**
- Use existing `BATTLE_CONFIG.calculateLineProperties()` for movement direction
- Use existing `BattleController.generateNetworkData()` for screen adaptation
- Use existing node position calculations for movement paths

## **📁 IMPLEMENTATION FILES**

**New File**:
- `server/src/services/MovementService.ts` (Batch 1)

**Enhanced Files**:
- `server/src/services/BattleService.ts` (Batch 2)
- `server/src/controllers/BattleController.ts` (Batch 2)
- `server/src/services/BattleResponseService.ts` (Batch 2)
- `server/src/services/BattalionMappingService.ts` (Batch 2)
- `mobile/src/components/battle/BattleBattalionManager.tsx` (Batch 3)
- `mobile/src/components/battle/BattleBattalion.tsx` (Batch 3)
- `mobile/src/store/api/battleApi.ts` (Batch 3)

**Leveraged Files** (no changes needed):
- `server/src/config/battleConfig.ts` - network topology, bot stats
- `server/src/services/TargetingService.ts` - network path validation
- `mobile/src/components/battle/BattleNetworkGrid.tsx` - network visualization
