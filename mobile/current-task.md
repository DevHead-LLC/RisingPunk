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

## **NEXT STEPS**
1. Move getNetworkVisualData from useBattleLines.ts to BattleNetworkGrid.tsx
2. Rename function to reflect network orchestration responsibility
3. Update imports and data flow
4. Ensure BattleGridScreen only imports BattleNetworkGrid.tsx
