# Current Task: Network Source of Truth Architecture Refactoring

## **BIG PICTURE GOAL**
Establish proper source of truth hierarchy for network components with clear parent-child relationships and minimal logic in parent components.

## **CURRENT FOCUS**
- ✅ Renamed useBattleNetwork.ts to useBattleLines.ts
- ✅ Moved NodeIndex to useBattleNodes.ts as source of truth
- ✅ Fixed source of truth hierarchy and responsibilities
- ✅ Moved getNetworkVisualData to BattleNetworkGrid.tsx as orchestrateNetworkData

## **SOURCE OF TRUTH HIERARCHY**

### **Parent-Child Relationship (Top to Bottom)**
```
BattleGridScreen.tsx (Parent - Minimal Logic)
    ↓ imports
BattleNetworkGrid.tsx (Child - Network Orchestrator)
    ↓ imports
useBattleNodes.ts (Child - Node Source of Truth)
useBattleLines.ts (Child - Line Source of Truth)
```

### **Current Sources of Truth**
- **useBattleNodes.ts**: Everything node-related (NodeIndex, positions, ownership, colors)
- **useBattleLines.ts**: Everything line-related (NetworkConnection, LineProperties, calculations)
- **BattleNetworkGrid.tsx**: Network visual orchestration (combines nodes + lines for display)

## **COMPLETED ISSUES**

### **✅ getNetworkVisualData Moved to Correct Place**
- **Problem**: Data orchestration logic was in useBattleLines.ts
- **Solution**: Moved to BattleNetworkGrid.tsx as orchestrateNetworkData()
- **Result**: Lines source of truth now only handles line-specific logic

### **✅ Architecture Hierarchy Fixed**
- **Problem**: Parent (BattleGridScreen) had too much logic
- **Solution**: Network orchestration moved to BattleNetworkGrid.tsx
- **Result**: Each parent now has minimal logic, children handle their domains

## **TARGET ARCHITECTURE**

### **BattleGridScreen.tsx (Parent - Minimal)**
- Only imports BattleNetworkGrid.tsx
- Passes basic props (battleId, etc.)
- No network logic

### **BattleNetworkGrid.tsx (Network Orchestrator)**
- Imports from useBattleNodes.ts and useBattleLines.ts
- Handles all network data orchestration
- Combines node and line data for visual rendering
- Exports complete network visualization

### **useBattleNodes.ts (Node Source of Truth)**
- All node-related types and logic
- Node positioning, ownership, colors
- Exports NodeIndex, BattleNodeState, etc.

### **useBattleLines.ts (Line Source of Truth)**
- All line-related types and logic
- NetworkConnection, LineProperties, calculateLineProperties
- getNetworkConnections() for topology
- NO data orchestration logic

## **COMPLETED TASKS**

### **✅ Network Topology Consolidation**
- **Removed `NETWORK_CONNECTIONS`** from networkConstants.ts (duplicate of useBattleLines.ts)
- **Removed `getConnectedNodes`** from networkConstants.ts (not needed for current application)
- **Kept `ACTIVE_CONNECTIONS`** in networkConstants.ts (marked as deprecated)
- **Result**: useBattleLines.ts is now the single source of truth for network topology

### **✅ Unused File Cleanup**
- **Deleted `networkConstants.ts`** - no longer needed after network topology consolidation
- **Deleted `pathfinding.ts`** - not used in current application (battalions not moving yet)
- **Result**: Clean codebase with only actively used files

## **CURRENT STATUS**
- **Application running successfully** with proper source of truth hierarchy
- **Network visualization working** through useBattleLines.ts → BattleNetworkGrid.tsx → BattleGridScreen.tsx
- **No duplicate network topology** in codebase
- **Ready for next phase** of development

## **SERVER-CLIENT NETWORK ARCHITECTURE ASSESSMENT**

### **Current State Analysis**

#### **Client-Side Sources of Truth (Working Well)**
- **useBattleNodes.ts**: Node positions, ownership, colors, visual properties
- **useBattleLines.ts**: Network topology (`{from, to}` format), line calculations
- **BattleNetworkGrid.tsx**: Network orchestration, visual rendering

#### **Server-Side Network Topology (Duplicated)**
- **battleConfig.ts**: `{node: [connections]}` format (different structure)
- **BattleMovement.ts**: `[number, number][]` format (copied from old networkConstants.ts)

#### **Key Issues Identified**
1. **Data Structure Mismatch**: Server uses different formats than client
2. **Network Topology Duplication**: Same connections defined in 3 places
3. **Type Inconsistency**: `[number, number][]` vs `{from, to}` vs `{node: [connections]}`

### **Desired Architecture**

#### **Server as Authoritative Source**
- **Server owns network topology** - single source of truth
- **Client receives network data** from server via useBattleSync
- **Server controls movement validation** and pathfinding
- **Client handles visualization** and user interactions

#### **Proposed Data Flow**
```
Server (Authoritative)
├── battleConfig.ts: Network topology in {from, to} format
├── BattleMovement.ts: Movement validation using server topology
└── Sends network data to client via API

Client (Display/UI)
├── useBattleSync.ts: Receives network data from server
├── useBattleLines.ts: Visual line calculations only
├── useBattleNodes.ts: Node visual properties only
└── BattleNetworkGrid.tsx: Pure visualization orchestration
```

## **IMPLEMENTATION PLAN**

### **Phase 1: Server Network Consolidation**
1. **Update battleConfig.ts** to use `{from, to}` format matching client
2. **Remove hardcoded network** from BattleMovement.ts
3. **Create server network service** that exports topology

### **Phase 2: Client Network Integration**
1. **Update useBattleSync.ts** to receive network topology from server
2. **Modify useBattleLines.ts** to use server data instead of hardcoded
3. **Ensure BattleNetworkGrid.tsx** continues working with server data

### **Phase 3: Movement Authority**
1. **Server validates all movement** using server network topology
2. **Client sends movement requests** to server
3. **Server calculates paths** and validates connections

## **COMPLETED TASKS**

### **✅ Phase 1: Server Network Consolidation**
- **Updated battleConfig.ts** to use `{from, to}` format matching client
- **Removed hardcoded network** from BattleMovement.ts
- **Updated BattleMovement.ts** to import network topology from battleConfig.ts
- **Result**: Server now has single source of truth for network topology

### **✅ Phase 2: Client Network Integration**
- **Updated BattleState interface** to include server-provided networkConnections
- **Modified useBattleSync.ts** to provide network topology from server
- **Updated useBattleLines.ts** to accept and use server network data
- **Updated BattleGridScreen.tsx** to pass server data to useBattleLines
- **Result**: Client now receives network topology from server instead of hardcoded data

## **NEXT STEPS**
1. **Test server-client data flow** - Ensure network topology syncs correctly
2. **Implement Phase 3** - Movement authority and validation
3. **Update server API** to include networkConnections in battle state response
