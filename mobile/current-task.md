# Active Task: Pathfinder Movement Logic Implementation

## Current Focus
Implementing proper pathfinding-based movement system where battalions follow network connections between nodes rather than direct movement.

## Core Problem
Current movement system allows direct movement to any target, but should require battalions to move along network connections (lines) by first moving to connecting nodes, then following the network topology.

## Movement, Animation, Pathfinding, Targeting, and Retargeting Logic Analysis

### 1. **useBattleMovementAndAttacks.ts** - Primary Movement Logic
**File:** `mobile/src/hooks/useBattleMovementAndAttacks.ts`

#### **Movement Logic (Lines 200-450)**
- **`moveBattalionAlongPath` function (Lines 200-450)**: Core movement implementation
  - **Lines 200-220**: Battalion ID generation and validation
  - **Lines 230-250**: Target validation before movement
  - **Lines 260-280**: Pre-movement range checking
  - **Lines 290-350**: **PATHFINDING INTEGRATION** - Uses `findShortestPaths` and `reconstructPath`
  - **Lines 360-380**: Path following logic with `remainingPath` and `finalTarget` properties
  - **Lines 390-420**: Movement distance calculations based on target type
  - **Lines 430-450**: Animated movement using `Animated.timing`

#### **Pathfinding Integration (Lines 290-350)**
- **Lines 290-310**: Calls `findShortestPaths(battalion.nodeIndex, nodes)` for path calculation
- **Lines 310-320**: Uses `reconstructPath(battalion.nodeIndex, target.index, previousNodes)` for path reconstruction
- **Lines 330-350**: Path following logic that updates `battalion.remainingPath` and `battalion.finalTarget`

#### **Targeting Logic (Lines 120-200)**
- **`findAvailableTargets` function (Lines 120-200)**: Target discovery and prioritization
  - **Lines 130-150**: Neutral node targeting (primary targets)
  - **Lines 160-180**: Enemy battalion targeting (secondary targets)
  - **Lines 190-200**: Target sorting by distance

#### **Retargeting Logic (Lines 920-1080)**
- **`findNewTarget` function (Lines 920-1080)**: Strategic retargeting system
  - **Lines 930-950**: Cooldown management with `retargetCooldowns`
  - **Lines 960-980**: Target filtering based on battalion type (guardian vs others)
  - **Lines 1000-1020**: **PATHFINDING VERIFICATION** - Calls pathfinding for each target
  - **Lines 1030-1050**: Target selection and movement initiation
- **`handleNodeCapture` function (Lines 1050-1070)**: Node capture handling
- **`retargetAllBattalions` function (Lines 1070-1080)**: Mass retargeting after node capture

#### **Animation Integration (Lines 430-450)**
- **Lines 430-450**: `Animated.timing(battalion.position, {...})` for smooth movement
- **Lines 450-480**: Movement completion callbacks and path continuation logic

### 2. **AnimatedBattalion.tsx** - Animation System
**File:** `mobile/src/components/battle/AnimatedBattalion.tsx`

#### **Position Animation (Lines 80-90)**
- **Lines 80-90**: `transform: [{ translateX: position.x }, { translateY: position.y }]` - Core position animation
- **Lines 50-70**: `triggerAttackAnimation` and `triggerDamageAnimation` for combat feedback

#### **Animation Refs (Lines 15-25)**
- **Lines 15-25**: `BattalionRef` type definition for external animation control
- **Lines 70-75**: `useImperativeHandle` to expose animation methods

### 3. **pathfinding.ts** - Pathfinding Algorithm
**File:** `mobile/src/utils/pathfinding.ts`

#### **Dijkstra's Algorithm (Lines 15-65)**
- **Lines 15-25**: `findShortestPaths` function - Core pathfinding implementation
- **Lines 30-45**: Priority queue implementation for node exploration
- **Lines 45-65**: Distance calculation and path reconstruction
- **Lines 65-90**: `reconstructPath` function - Path reconstruction from previous nodes

#### **Network Integration (Lines 40-50)**
- **Lines 40-50**: Uses `getConnectedNodes(currentIndex)` to respect network topology
- **Lines 50-60**: Physical distance calculation between connected nodes

### 4. **networkConstants.ts** - Network Topology
**File:** `mobile/src/utils/networkConstants.ts`

#### **Network Connections (Lines 15-30)**
- **Lines 15-30**: `NETWORK_CONNECTIONS` array defining valid node connections
- **Lines 35-40**: `getConnectedNodes` function for pathfinding integration

#### **Network Layout**
```
Node layout:
0 1 2
3 4 5  
6 7 8

Connections:
- Horizontal: [0,3], [3,6], [1,4], [4,7], [2,5], [5,8]
- Diagonal: [0,4], [1,3], [1,5], [2,4], [3,7], [4,6], [4,8], [5,7]
```

### 5. **battle.ts** - Type Definitions
**File:** `mobile/src/types/battle.ts`

#### **Movement-Related Types (Lines 15-25)**
- **Lines 15-25**: `BattalionPosition` interface with movement properties:
  - `remainingPath?: number[]` - For path following logic
  - `finalTarget?: number` - For path following logic
  - `position: any` - Animated.ValueXY for smooth movement
- **Lines 25-35**: `BattleTarget` type for targeting system

### 6. **battleUtils.ts** - Movement Calculations
**File:** `mobile/src/utils/battleUtils.ts`

#### **Movement Duration (Lines 15-25)**
- **Lines 15-25**: `calculateMovementDuration` function based on battalion speed
- **Lines 30-40**: `calculateAttackRange` function for range-based movement
- **Lines 50-70**: `getAvailableNodes` function for direct node connections

### 7. **battleConstants.ts** - Movement Constants
**File:** `mobile/src/utils/battleConstants.ts`

#### **Movement Timing (Lines 5-15)**
- **Lines 5-15**: `BASE_DURATION`, `RETARGET_COOLDOWN`, `CAPTURE_MEMORY_DURATION`
- **Lines 20-30**: `RANGE_MULTIPLIER`, `BATTALION_CENTER_OFFSET`

### 8. **BattleUnits.tsx** - Battalion Rendering
**File:** `mobile/src/components/battle/BattleUnits.tsx`

#### **Position Integration (Lines 50-80)**
- **Lines 50-80**: Renders `AnimatedBattalion` components with position props
- **Lines 60-70**: Health percentage calculation for visual feedback

### 9. **BattleScreen.tsx** - Battle Orchestration
**File:** `mobile/src/screens/BattleScreen.tsx`

#### **Movement Hook Integration (Lines 80-100)**
- **Lines 80-100**: Uses `useBattleMovementAndAttacks` hook for movement logic
- **Lines 100-120**: Node control change handling with `handleNodeCapture`

### 10. **battleCalculator.ts** - Range Calculations
**File:** `mobile/src/utils/battleCalculator.ts`

#### **Range Checking (Lines 70-80)**
- **Lines 70-80**: `checkRangeIntersection` function for attack range validation

## Current Issues Identified

### **1. Pathfinding Integration Issues**
- **Problem**: Pathfinding is calculated but not fully enforced in movement
- **Location**: `useBattleMovementAndAttacks.ts` Lines 290-350
- **Issue**: Battalion can still move directly to targets instead of following calculated paths

### **2. Network Line Following**
- **Problem**: Battalions don't follow network connections between nodes
- **Location**: `moveBattalionAlongPath` function
- **Issue**: Movement is direct rather than node-to-node along network lines

### **3. Path Continuation Logic**
- **Problem**: Path following stops after first node
- **Location**: Lines 360-380 in `useBattleMovementAndAttacks.ts`
- **Issue**: `remainingPath` logic is incomplete

## Required Changes

### **1. Enforce Pathfinding Movement**
- Modify `moveBattalionAlongPath` to always follow calculated paths
- Remove direct movement to targets
- Ensure battalions move node-to-node along network connections

### **2. Complete Path Following**
- Implement proper `remainingPath` continuation logic
- Update battalion `nodeIndex` as they move between nodes
- Handle path completion and target arrival

### **3. Network Line Visualization**
- Add visual indicators for battalion movement along network lines
- Show path preview during movement planning

## Associated Files Summary

| File | Primary Purpose | Key Lines | Status |
|------|----------------|-----------|---------|
| `useBattleMovementAndAttacks.ts` | Core movement logic | 200-450, 920-1080 | Needs pathfinding enforcement |
| `AnimatedBattalion.tsx` | Animation system | 80-90, 50-75 | Working correctly |
| `pathfinding.ts` | Pathfinding algorithm | 15-90 | Working correctly |
| `networkConstants.ts` | Network topology | 15-40 | Working correctly |
| `battle.ts` | Type definitions | 15-35 | Working correctly |
| `battleUtils.ts` | Movement calculations | 15-70 | Working correctly |
| `battleConstants.ts` | Movement constants | 5-30 | Working correctly |
| `BattleUnits.tsx` | Battalion rendering | 50-80 | Working correctly |
| `BattleScreen.tsx` | Battle orchestration | 80-120 | Working correctly |
| `battleCalculator.ts` | Range calculations | 70-80 | Working correctly |

## Next Steps
1. **Enforce pathfinding in movement logic**
2. **Complete path following implementation**
3. **Add network line movement visualization**
4. **Test battalion movement along network connections**

---

## Right Now Strategy: Enforce Pathfinding Movement

### **Target Issue**: Pathfinding Integration Issues
**Problem**: Pathfinding is calculated but not fully enforced in movement
**Location**: `useBattleMovementAndAttacks.ts` Lines 290-350

### **Strategy Overview**
Break down the pathfinding enforcement into small, verifiable steps that can be tested individually. Each step will add logging to verify the logic is working correctly before moving to the next step.

### **Step-by-Step Implementation Plan**

#### **Step 1: Add Pathfinding Validation Logging**
**File**: `mobile/src/hooks/useBattleMovementAndAttacks.ts`
**Lines**: 290-350
**Task**: Add comprehensive logging to verify pathfinding calculations are working
**Verification**: Check console logs show correct path calculations for each battalion movement

**Specific Changes**:
- **Line 290**: Add logging before `findShortestPaths` call
- **Line 310**: Add logging after path reconstruction
- **Line 330**: Add logging for path validation
- **Line 350**: Add logging for path following decision

#### **Step 2: Enforce Pathfinding for Node Targets**
**File**: `mobile/src/hooks/useBattleMovementAndAttacks.ts`
**Lines**: 290-320
**Task**: Modify node targeting to always use calculated paths
**Verification**: Battalions only move to connected nodes, never directly to distant targets

**Specific Changes**:
- **Line 290**: Ensure `findShortestPaths` is always called for node targets
- **Line 310**: Validate that reconstructed path exists before movement
- **Line 320**: Force movement to first node in path instead of direct target

#### **Step 3: Implement Path Following Logic**
**File**: `mobile/src/hooks/useBattleMovementAndAttacks.ts`
**Lines**: 330-350
**Task**: Complete the path following implementation
**Verification**: Battalions follow complete paths node-by-node

**Specific Changes**:
- **Line 330**: Properly set `battalion.remainingPath` with full path
- **Line 340**: Set `battalion.finalTarget` to ultimate target
- **Line 350**: Ensure movement targets next node in path

#### **Step 4: Update Battalion Node Index Tracking**
**File**: `mobile/src/hooks/useBattleMovementAndAttacks.ts`
**Lines**: 450-480
**Task**: Update battalion's `nodeIndex` as it moves between nodes
**Verification**: Battalion's current node is always accurate

**Specific Changes**:
- **Line 450**: Update `battalion.nodeIndex` when reaching a new node
- **Line 460**: Remove completed node from `remainingPath`
- **Line 470**: Check if final target reached

#### **Step 5: Enforce Pathfinding for Battalion Targets**
**File**: `mobile/src/hooks/useBattleMovementAndAttacks.ts`
**Lines**: 360-380
**Task**: Apply same pathfinding logic to battalion-to-battalion movement
**Verification**: Battalions follow network paths even when targeting enemy battalions

**Specific Changes**:
- **Line 360**: Calculate path to enemy battalion's node
- **Line 370**: Follow path to reach enemy battalion's location
- **Line 380**: Only attack when in range after following path

#### **Step 6: Remove Direct Movement Fallbacks**
**File**: `mobile/src/hooks/useBattleMovementAndAttacks.ts`
**Lines**: 390-420
**Task**: Remove any direct movement calculations that bypass pathfinding
**Verification**: All movement goes through pathfinding system

**Specific Changes**:
- **Line 390**: Remove direct distance calculations for non-path movement
- **Line 400**: Ensure all movement uses calculated paths
- **Line 410**: Remove fallback to direct movement

#### **Step 7: Add Path Validation**
**File**: `mobile/src/hooks/useBattleMovementAndAttacks.ts`
**Lines**: 290-320
**Task**: Add validation to ensure paths are valid before movement
**Verification**: Invalid paths are detected and handled gracefully

**Specific Changes**:
- **Line 290**: Validate that start and target nodes are valid
- **Line 300**: Check that path exists and is not empty
- **Line 310**: Verify path follows network connections

#### **Step 8: Test and Verify Each Step**
**Files**: All modified files
**Task**: Test each step individually with logging
**Verification**: Each step produces expected behavior and logs

**Testing Approach**:
1. **Step 1**: Verify pathfinding logs appear correctly
2. **Step 2**: Verify node targeting uses paths only
3. **Step 3**: Verify path following works end-to-end
4. **Step 4**: Verify node index updates correctly
5. **Step 5**: Verify battalion targeting uses paths
6. **Step 6**: Verify no direct movement occurs
7. **Step 7**: Verify path validation catches errors

### **Success Criteria**
- All battalion movement follows calculated network paths
- No direct movement to distant targets
- Paths are validated before movement begins
- Battalion node indices are always accurate
- Movement logs show correct path following
- Network topology is respected in all movement

### **Files to Modify**
1. **`useBattleMovementAndAttacks.ts`** (Primary changes)
2. **`battle.ts`** (May need type updates for path validation)
3. **`pathfinding.ts`** (May need validation functions)

### **Testing Strategy**
- Add console logs at each step
- Test with simple scenarios first (adjacent nodes)
- Test with complex scenarios (multi-node paths)
- Verify network topology is respected
- Check that invalid paths are handled gracefully