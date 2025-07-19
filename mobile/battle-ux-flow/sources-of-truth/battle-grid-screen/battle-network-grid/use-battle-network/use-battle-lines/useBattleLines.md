# useBattleNetwork Hook - Source of Truth

## **NETWORK FILES INVENTORY**

### **Client-Side Network Files**
- [useBattleLines.ts](../../../../../src/hooks/useBattleLines.ts)
- [useBattleNodes.ts](../../../../../src/hooks/useBattleNodes.ts)
- [useBattleSync.ts](../../../../../src/hooks/useBattleSync.ts)
- [BattleNetworkGrid.tsx](../../../../../src/components/battle/BattleNetworkGrid.tsx)
- [BattleGridScreen.tsx](../../../../../src/screens/BattleGridScreen.tsx)
- [useBattleNetwork.test.ts](../../../../../__tests__/hooks/useBattleNetwork.test.ts)
- [useBattleNodes.test.ts](../../../../../__tests__/hooks/useBattleNodes.test.ts)

### **Server-Side Network Files**
- [BattleMovement.ts](../../../../../../server/src/services/BattleMovement.ts)
- [BattleUpdater.ts](../../../../../../server/src/services/BattleUpdater.ts)
- [battleConfig.ts](../../../../../../server/src/config/battleConfig.ts)
- [BattleController.ts](../../../../../../server/src/controllers/BattleController.ts)
- [BattleMovement.test.ts](../../../../../../server/__tests__/BattleMovement.test.ts)



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

### **Remaining Architecture Violations**
- **Server-Side Network Topology Duplication**: 2 different files define network connections
- **Server-Client Mismatch**: Different data structures for same network topology
- **Type Inconsistency**: Server uses `[number, number][]` vs client uses `{from, to}` format