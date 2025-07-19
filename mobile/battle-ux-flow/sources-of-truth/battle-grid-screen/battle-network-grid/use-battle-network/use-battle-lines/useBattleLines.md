# useBattleNetwork Hook - Source of Truth

## **NETWORK FILES INVENTORY**

### **Client-Side Network Files**
- [useBattleLines.ts](../../../../../src/hooks/useBattleLines.ts)
- [useBattleNodes.ts](../../../../../src/hooks/useBattleNodes.ts)
- [useBattleSync.ts](../../../../../src/hooks/useBattleSync.ts)
- [BattleNetworkGrid.tsx](../../../../../src/components/battle/BattleNetworkGrid.tsx)
- [BattleGridScreen.tsx](../../../../../src/screens/BattleGridScreen.tsx)
- [networkConstants.ts](../../../../../src/utils/networkConstants.ts)
- [pathfinding.ts](../../../../../src/utils/pathfinding.ts)
- [useBattleNetwork.test.ts](../../../../../__tests__/hooks/useBattleNetwork.test.ts)
- [useBattleNodes.test.ts](../../../../../__tests__/hooks/useBattleNodes.test.ts)

### **Server-Side Network Files**
- [BattleMovement.ts](../../../../../../server/src/services/BattleMovement.ts)
- [BattleUpdater.ts](../../../../../../server/src/services/BattleUpdater.ts)
- [battleConfig.ts](../../../../../../server/src/config/battleConfig.ts)
- [BattleController.ts](../../../../../../server/src/controllers/BattleController.ts)
- [BattleMovement.test.ts](../../../../../../server/__tests__/BattleMovement.test.ts)

## **POTENTIAL CONFLICTS**

### **Client-Side Network Topology Duplication**
- **[networkConstants.ts](../../../../../src/utils/networkConstants.ts)**
  - **Conflict**: `NETWORK_CONNECTIONS` array duplicates network topology
  - **Current**: `[number, number][]` format
  - **useBattleLines**: `NetworkConnection[]` format with proper typing
  - **Impact**: Two sources of truth for same network structure

- **[pathfinding.ts](../../../../../src/utils/pathfinding.ts)**
  - **Conflict**: Imports `NETWORK_CONNECTIONS` from networkConstants.ts
  - **Current**: Uses `[number, number][]` format for validation
  - **useBattleLines**: Has `getNetworkConnections()` with proper typing
  - **Impact**: Pathfinding logic depends on competing network topology

### **Server-Side Network Topology Duplication**
- **[battleConfig.ts](../../../../../../server/src/config/battleConfig.ts)**
  - **Conflict**: `NETWORK_CONNECTIONS` object with node-to-connections mapping
  - **Current**: `{ 0: [3, 4], 1: [3, 4, 5], ... }` format
  - **useBattleLines**: Array format with `{from, to}` objects
  - **Impact**: Server and client have different network topology representations

- **[BattleMovement.ts](../../../../../../server/src/services/BattleMovement.ts)**
  - **Conflict**: Hardcoded `NETWORK_CONNECTIONS` array copied from mobile
  - **Current**: `[number, number][]` format, identical to networkConstants.ts
  - **useBattleLines**: Properly typed `NetworkConnection[]` format
  - **Impact**: Server movement logic depends on duplicated network topology

### **Architecture Violations**
- **Multiple Network Topology Sources**: 4 different files define network connections
- **Type Inconsistency**: `[number, number][]` vs `{from, to}` vs `[NodeIndex, NodeIndex]`
- **Import Dependencies**: pathfinding.ts depends on networkConstants.ts instead of useBattleLines
- **Server-Client Mismatch**: Different data structures for same network topology