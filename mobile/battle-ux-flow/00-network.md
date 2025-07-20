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
- `[BattleGridScreen]` - **⭐ PURE ORCHESTRATOR** for battle layout
  - [BattleGridScreen.tsx](../src/screens/BattleGridScreen.tsx)
  - **Purpose**: Container that orchestrates battle components
  - **Authority**: Layout management only - no data handling

  - `[battleGridStyles]` - Network styling (**belongs to: BattleGridScreen**)
    - [battleGridStyles.ts](../src/styles/battleGridStyles.ts)
    - **Purpose**: Visual layout and styling

**Self-Contained Network Components**
- `[BattleNetworkGrid]` - **⭐ SELF-CONTAINED** network visualization
  - [BattleNetworkGrid.tsx](../src/components/battle/BattleNetworkGrid.tsx)
  - **Purpose**: Renders nodes and lines with direct server integration
  - **Authority**: Own API calls, loading states, error handling

  - `[useGetBattleStateQuery]` - Network data fetching (**belongs to: BattleNetworkGrid**)
    - [battleApi.ts](../src/store/api/battleApi.ts)
    - **Purpose**: Fetches network data directly from server
    - **Sends**: Screen dimensions to server
    - **Receives**: Complete network data package

  - `[getNodeColor]` - Node visual mapping (**belongs to: BattleNetworkGrid**)
    - **Purpose**: Maps server owner data to colors (blue/red/gray)

  - `[getNodeBorderColor]` - Node border styling (**belongs to: BattleNetworkGrid**)
    - **Purpose**: Node border colors based on ownership

**Self-Contained Battalion Components**
- `[BattleBattalionManager]` - **⭐ SELF-CONTAINED** battalion visualization
  - [BattleBattalionManager.tsx](../src/components/battle/BattleBattalionManager.tsx)
  - **Purpose**: Renders battalions with direct server integration
  - **Authority**: Own API calls, loading states, error handling

  - `[useGetBattleStateQuery]` - Battalion data fetching (**belongs to: BattleBattalionManager**)
    - [battleApi.ts](../src/store/api/battleApi.ts)
    - **Purpose**: Fetches battalion data directly from server
    - **Receives**: Battalion and node data for positioning

  - `[BattleBattalion]` - Individual battalion display (**belongs to: BattleBattalionManager**)
    - [BattleBattalion.tsx](../src/components/battle/BattleBattalion.tsx)
    - **Purpose**: Visual representation of battalion
    - **Status**: TEMPORARY - placeholder for real battalions

**Self-Contained Overlay Components**
- `[BattleOverlayManager]` - **⭐ SELF-CONTAINED** timer and overlay management
  - [BattleOverlayManager.tsx](../src/components/battle/BattleOverlayManager.tsx)
  - **Purpose**: Manages countdown overlay and battle timer with direct server integration
  - **Authority**: Own API calls, phase detection, timer calculations

  - `[useGetBattleStateQuery]` - Timer data fetching (**belongs to: BattleOverlayManager**)
    - [battleApi.ts](../src/store/api/battleApi.ts)
    - **Purpose**: Fetches phase and timer data directly from server
    - **Receives**: Phase, timeRemaining, battle state

  - `[BattleCountdownOverlay]` - Countdown display (**belongs to: BattleOverlayManager**)
    - [BattleCountdownOverlay.tsx](../src/components/battle/BattleCountdownOverlay.tsx)
    - **Purpose**: Shows 3,2,1 countdown overlay

  - `[BattleTimerDisplay]` - Battle timer display (**belongs to: BattleOverlayManager**)
    - [BattleTimerDisplay.tsx](../src/components/battle/BattleTimerDisplay.tsx)
    - **Purpose**: Shows battle time remaining

## **⚙️ TEMPORARY MOCK SETUP**

**Mock Battalions (TEMPORARY)**
- Server creates mock battalions on nodes 0,1,2 (user) and 6,7,8 (enemy)
- **BattleBattalionManager** displays these mock battalions using server nodeIndex data
- **Status**: TEMPORARY - will be replaced with dynamic battalion system

**Mock Battle State (TEMPORARY)**
- Server provides mock battalion data in battle state response
- Each component fetches this data independently via API calls
- **Status**: TEMPORARY - will be replaced with dynamic battalion system

## **🔄 NETWORK DATA FLOW**

```
1. Each component: Sends screen dimensions (width, height) to server independently
2. Server: Calculates node positions for client screen size
3. Server: Generates network connections and line properties
4. Server: Sends complete network package to each component
5. Each component: Renders its specific data exactly as provided by server
```

## **📊 NETWORK ARCHITECTURE DIAGRAM**

```
SERVER SIDE                           CLIENT SIDE
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│                                 │   │                                 │
│  🏛️ BATTLE_CONFIG               │   │  📱 BattleGridScreen.tsx       │
│  ├─ NETWORK_CONNECTIONS         │   │  ├─ Pure orchestrator           │
│  ├─ calculateNodePositions()    │   │  ├─ Layout management           │
│  └─ calculateLineProperties()   │   │  └─ Component coordination      │
│             │                   │   │             │                   │
│             ▼                   │   │             ▼                   │
│  🎮 BattleController            │   │  🖼️  BattleNetworkGrid          │
│  ├─ generateNetworkData()       │   │  ├─ Direct API call             │
│  ├─ getBattleState()            │◄──┤  ├─ Node rendering              │
│  └─ Screen adaptation           │   │  ├─ Line rendering              │
│             │                   │   │  ├─ Loading/error states        │
│             ▼                   │   │  └─ Self-contained              │
│  💾 BattleService               │   │             │                   │
│  ├─ Network initialization      │   │             ▼                   │
│  └─ Node ownership setup        │   │  👥 BattleBattalionManager      │
│             │                   │   │  ├─ Direct API call             │
│             ▼                   │   │  ├─ Battalion rendering         │
│  🗄️  Battle Model               │   │  ├─ Loading/error states        │
│  └─ Network persistence         │   │  └─ Self-contained              │
│                                 │   │             │                   │
│                                 │   │             ▼                   │
│                                 │   │  ⏰ BattleOverlayManager        │
│                                 │   │  ├─ Direct API call             │
│                                 │   │  ├─ Timer display               │
│                                 │   │  ├─ Countdown overlay           │
│                                 │   │  └─ Self-contained              │
│                                 │   │                                 │
└─────────────────────────────────┘   └─────────────────────────────────┘
                 │                                       ▲
                 │    📡 API: Complete Network Package   │
                 └───────────────────────────────────────┘
                     • Node positions (x, y)
                     • Network connections (from, to)
                     • Line properties (length, angle, left, top)
                     • Mock battalion data (TEMPORARY)
                     • Phase and timer data
```

## **🔗 NETWORK CONNECTION FLOW (SIMPLIFIED)**

**BattleGridScreen.tsx** is the main container that orchestrates the battle layout. It passes the **battleId** to each component and lets them handle their own data needs.

**BattleNetworkGrid.tsx** makes its own API call to get network data. The server's **BattleController.ts** receives this request and uses **battleConfig.ts** to calculate where nodes should be positioned based on the screen dimensions sent from the client.

**battleConfig.ts** contains the network topology (which nodes connect to which) and calculates node positions and line properties. It sends this calculated data back through **BattleController.ts**.

**BattleController.ts** packages everything together - the node positions, network connections, and line properties - and sends it back to **BattleNetworkGrid.tsx** as a complete network package.

**BattleNetworkGrid.tsx** takes the server's calculated node positions and line properties and renders them as colored circles and connecting lines on the screen.

**BattleBattalionManager.tsx** makes its own API call and displays the battalions (currently mock data) positioned on their assigned nodes.

**BattleOverlayManager.tsx** makes its own API call to get phase and timer data, then displays the countdown overlay and battle timer.

So the flow is: **Each component** → **Independent API call** → **BattleController** → **battleConfig calculations** → **BattleController packages data** → **Each component receives** → **Each component renders** → **User sees complete battle**.

