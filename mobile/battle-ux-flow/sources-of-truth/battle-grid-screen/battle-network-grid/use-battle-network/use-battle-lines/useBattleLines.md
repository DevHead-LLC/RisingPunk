# Network Connections - How They Actually Work

## **WHAT THIS FILE COVERS**
ONLY network connections between nodes. NOT battle movement, NOT battalions, NOT timers, NOT anything else.

## **NETWORK CONNECTIONS INVENTORY**

### **Server-Side (Authoritative)**
- [battleConfig.ts](../../../../../../../server/src/config/battleConfig.ts) - **DEFINES** which nodes connect to which nodes

### **Client-Side (Visual)**
- [useBattleLines.ts](../../../../../../src/hooks/useBattleLines.ts) - **CALCULATES** line positions and visual properties
- [useBattleNodes.ts](../../../../../../src/hooks/useBattleNodes.ts) - **CALCULATES** node positions
- [BattleNetworkGrid.tsx](../../../../../../src/components/battle/BattleNetworkGrid.tsx) - **RENDERS** the network (nodes + lines)
- [BattleGridScreen.tsx](../../../../../../src/screens/BattleGridScreen.tsx) - **IMPORTS** BattleNetworkGrid

## **HOW CONNECTIONS ACTUALLY WORK**

### **1. Server Defines Connections**
```typescript
// battleConfig.ts - SERVER AUTHORITY
const NETWORK_TOPOLOGY = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 0, to: 3 },
  { from: 1, to: 4 },
  { from: 2, to: 5 },
  { from: 3, to: 6 },
  { from: 4, to: 7 },
  { from: 5, to: 8 }
];
```

### **2. Client Receives Connections**
```typescript
// useBattleSync.ts - RECEIVES server data
const networkConnections = battleState?.networkConnections || [];
```

### **3. Client Calculates Visual Properties**
```typescript
// useBattleLines.ts - CALCULATES line positions
const lines = networkConnections.map(connection => {
  const fromNode = nodes.find(n => n.index === connection.from);
  const toNode = nodes.find(n => n.index === connection.to);
  return calculateLineProperties(fromNode, toNode);
});
```

### **4. Client Renders Network**
```typescript
// BattleNetworkGrid.tsx - RENDERS everything
<View>
  {nodes.map(node => <NodeComponent key={node.index} {...node} />)}
  {lines.map(line => <LineComponent key={line.id} {...line} />)}
</View>
```

## **DATA FLOW (NETWORK ONLY)**
```
Server battleConfig.ts
    ↓ (defines connections)
API networkConnections
    ↓ (sends to client)
useBattleSync.ts
    ↓ (provides to components)
useBattleLines.ts
    ↓ (calculates line positions)
BattleNetworkGrid.tsx
    ↓ (renders network)
BattleGridScreen.tsx
```

## **WHAT EACH FILE DOES (NETWORK ONLY)**

| File | What It Does | Network Responsibility |
|------|-------------|----------------------|
| **battleConfig.ts** | Defines which nodes connect | Single source of truth for connections |
| **useBattleSync.ts** | Receives server data | Provides networkConnections to client |
| **useBattleNodes.ts** | Calculates node positions | Node positioning for line calculations |
| **useBattleLines.ts** | Calculates line positions | Line visual properties from node positions |
| **BattleNetworkGrid.tsx** | Renders nodes + lines | Visual orchestration of network |
| **BattleGridScreen.tsx** | Imports BattleNetworkGrid | Screen-level container |

## **CONNECTION FORMAT**
```typescript
// Server and client both use this format:
interface NetworkConnection {
  from: number;  // Node index
  to: number;    // Node index
}
```

That's it. Network connections only. No battle movement, no battalions, no timers, no extra BS.