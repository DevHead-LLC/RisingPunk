# Source of Truth Table of Contents - Network Authority

## **🏛️ SERVER AUTHORITY - Network**

**Battle Network Configuration**
- `[BATTLE_CONFIG]` - **⭐ NETWORK AUTHORITY** for topology, calculations, positioning
  - [battleConfig.ts](../../server/src/config/battleConfig.ts)
  - **Contains**: Network connections, node positioning, line calculations
  - **Authority**: All network data calculations for any screen size

  - `[NETWORK_CONNECTIONS]` - Network topology definition (**belongs to: BATTLE_CONFIG**)
    - **Array**: 14 connections defining 9-node network structure
    - **Authority**: Which nodes connect to which nodes

  - `[calculateNodePositions]` - Node positioning calculations (**belongs to: BATTLE_CONFIG**)
    - **Function**: Calculates node coordinates for any screen dimensions
    - **Authority**: All node (x, y) positions

  - `[calculateLineProperties]` - Line calculations (**belongs to: BATTLE_CONFIG**)
    - **Function**: Calculates line length, angle, positioning
    - **Authority**: All network line rendering data

**Network Data Generation**
- `[BattleController]` - **⭐ NETWORK CONTROLLER** for client data
  - [BattleController.ts](../../server/src/controllers/BattleController.ts)
  - **Authority**: Generates complete network data packages for clients

  - `[generateNetworkData]` - Network data pipeline (**belongs to: BattleController**)
    - **Function**: Creates screen-specific network data
    - **Input**: Screen width/height from client
    - **Output**: Complete network package (nodes, connections, line properties)

  - `[getBattleState]` - Network API endpoint (**belongs to: BattleController**)
    - **Function**: Serves network data to clients via API
    - **Authority**: Network data delivery with screen adaptation

**Network State Management**
- `[BattleService]` - Network initialization (**belongs to: BattleController**)
  - [BattleService.ts](../../server/src/services/BattleService.ts)
  - **Authority**: Initial network setup with node ownership

- `[Battle Model]` - Network data persistence (**belongs to: BattleService**)
  - [Battle.ts](../../server/src/models/Battle.ts)
  - **Authority**: Network state storage and retrieval

## **📱 CLIENT VISUALIZATION - Network**

**Network Display**
- `[BattleGridScreen]` - Network screen container
  - [BattleGridScreen.tsx](../src/screens/BattleGridScreen.tsx)
  - **Purpose**: Container for network visualization, API integration

  - `[useGetBattleStateQuery]` - Network data fetching (**belongs to: BattleGridScreen**)
    - [battleApi.ts](../src/store/api/battleApi.ts)
    - **Purpose**: Fetches network data from server
    - **Sends**: Screen dimensions to server
    - **Receives**: Complete network data package

  - `[battleGridStyles]` - Network styling (**belongs to: BattleGridScreen**)
    - [battleGridStyles.ts](../src/styles/battleGridStyles.ts)
    - **Purpose**: Visual layout and styling

**Network Rendering**
- `[BattleNetworkGrid]` - Network visualization component (**belongs to: BattleGridScreen**)
  - [BattleNetworkGrid.tsx](../src/components/battle/BattleNetworkGrid.tsx)
  - **Purpose**: Renders nodes and lines from server data

  - `[getNodeColor]` - Node visual mapping (**belongs to: BattleNetworkGrid**)
    - **Purpose**: Maps server owner data to colors (blue/red/gray)

  - `[getNodeBorderColor]` - Node border styling (**belongs to: BattleNetworkGrid**)
    - **Purpose**: Node border colors based on ownership

## **⚙️ TEMPORARY MOCK SETUP**

**Mock Battalions (TEMPORARY)**
- `[BattleBattalionManager]` - **TEMPORARY** battalion display (**belongs to: BattleGridScreen**)
  - [BattleBattalionManager.tsx](../src/components/battle/BattleBattalionManager.tsx)
  - **Purpose**: Shows mock battalions on network nodes
  - **Status**: TEMPORARY - will be replaced with real battalion system

  - `[BattleBattalion]` - **TEMPORARY** individual battalion display (**belongs to: BattleBattalionManager**)
    - [BattleBattalion.tsx](../src/components/battle/BattleBattalion.tsx)
    - **Purpose**: Visual representation of mock battalion
    - **Status**: TEMPORARY - placeholder for real battalions

**Mock Battle State (TEMPORARY)**
- Server creates mock battalions on nodes 0,1,2 (user) and 6,7,8 (enemy)
- Client displays these mock battalions using server nodeIndex data
- **Status**: TEMPORARY - will be replaced with dynamic battalion system

## **🔄 NETWORK DATA FLOW**

```
1. Client: Sends screen dimensions (width, height) to server
2. Server: Calculates node positions for client screen size
3. Server: Generates network connections and line properties
4. Server: Sends complete network package to client
5. Client: Renders network exactly as provided by server
```

## **📊 NETWORK ARCHITECTURE DIAGRAM**

```
SERVER SIDE                           CLIENT SIDE
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│                                 │   │                                 │
│  🏛️ BATTLE_CONFIG               │   │  📱 BattleGridScreen.tsx       │
│  ├─ NETWORK_CONNECTIONS         │   │  ├─ useGetBattleStateQuery      │
│  ├─ calculateNodePositions()    │   │  ├─ Screen dimensions           │
│  └─ calculateLineProperties()   │   │  └─ API calls                   │
│             │                   │   │             │                   │
│             ▼                   │   │             ▼                   │
│  🎮 BattleController            │   │  🖼️  BattleNetworkGrid          │
│  ├─ generateNetworkData()       │   │  ├─ Node rendering              │
│  ├─ getBattleState()            │◄──┤  ├─ Line rendering              │
│  └─ Screen adaptation           │   │  ├─ getNodeColor()              │
│             │                   │   │  └─ getNodeBorderColor()        │
│             ▼                   │   │             │                   │
│  💾 BattleService               │   │             ▼                   │
│  ├─ Network initialization      │   │  👥 BattleBattalionManager      │
│  └─ Node ownership setup        │   │  └─ (TEMPORARY mock display)    │
│             │                   │   │                                 │
│             ▼                   │   │                                 │
│  🗄️  Battle Model               │   │                                 │
│  └─ Network persistence         │   │                                 │
│                                 │   │                                 │
└─────────────────────────────────┘   └─────────────────────────────────┘
                 │                                       ▲
                 │    📡 API: Complete Network Package   │
                 └───────────────────────────────────────┘
                     • Node positions (x, y)
                     • Network connections (from, to)
                     • Line properties (length, angle, left, top)
                     • Mock battalion data (TEMPORARY)
```

