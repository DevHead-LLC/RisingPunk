# Source of Truth Table of Contents - Targeting Authority

## **🏛️ SERVER AUTHORITY - Targeting**

**Targeting Logic Configuration**
- `[TargetingService]` - **⭐ TARGETING AUTHORITY** for battalion targeting logic
  - [TargetingService.ts](../../server/src/services/TargetingService.ts)
  - **Contains**: Initial targeting assignment, network validation, path calculation
  - **Authority**: All targeting decisions and network reachability validation

  - `[assignInitialTargets]` - Battalion targeting assignment (**belongs to: TargetingService**)
    - **Function**: Assigns random neutral node targets to all battalions
    - **Authority**: Which battalion targets which neutral node

  - `[getValidTargets]` - Network constraint filtering (**belongs to: TargetingService**)
    - **Function**: Filters neutral nodes reachable via network connections
    - **Authority**: Valid target selection based on network topology

  - `[isReachableViaNetwork]` - Network connectivity validation (**belongs to: TargetingService**)
    - **Function**: Validates direct network connections only
    - **Authority**: Network reachability decisions

  - `[getNetworkPath]` - Path calculation (**belongs to: TargetingService**)
    - **Function**: Returns network path from start to target node
    - **Authority**: Path determination for targeting routes

**Targeting Data Generation**
- `[BattleController]` - **⭐ TARGETING CONTROLLER** for client data
  - [BattleController.ts](../../server/src/controllers/BattleController.ts)
  - **Authority**: Triggers targeting and delivers targeting results to clients

  - `[triggerTargeting]` - Targeting trigger pipeline (**belongs to: BattleController**)
    - **Function**: Triggers targeting assignment on phase transition
    - **Input**: Phase change to ACTIVE or countdown completion
    - **Output**: Targeting results for all battalions

  - `[getBattleState]` - Targeting API endpoint (**belongs to: BattleController**)
    - **Function**: Serves targeting data to clients via API
    - **Authority**: Targeting data delivery with battle state

**Targeting State Management**
- `[BattleService]` - Targeting results storage (**belongs to: BattleController**)
  - [BattleService.ts](../../server/src/services/BattleService.ts)
  - **Authority**: Stores targeting results per battle ID

- `[Battle Model]` - Targeting data persistence (**belongs to: BattleService**)
  - [Battle.ts](../../server/src/models/Battle.ts)
  - **Authority**: Targeting state storage and retrieval

**Network Topology Integration**
- `[BATTLE_CONFIG]` - Network constraint authority (**belongs to: TargetingService**)
  - [battleConfig.ts](../../server/src/config/battleConfig.ts)
  - **Contains**: Network connections for targeting validation
  - **Authority**: Network topology for targeting reachability

## **📱 CLIENT VISUALIZATION - Targeting**

**Targeting Data Reception**
- `[BattleBattalionManager]` - **⭐ TARGETING DATA RECEIVER** (currently unused)
  - [BattleBattalionManager.tsx](../src/components/battle/BattleBattalionManager.tsx)
  - **Purpose**: Receives targeting data from server (currently ignored)
  - **Status**: Targeting data received but not visualized

  - `[useGetBattleStateQuery]` - Targeting data fetching (**belongs to: BattleBattalionManager**)
    - [battleApi.ts](../src/store/api/battleApi.ts)
    - **Purpose**: Fetches targeting data directly from server
    - **Receives**: Targeting results in battle state response
    - **Status**: Data received but not used for visualization

**Targeting Type Definitions**
- `[battleState.ts]` - Targeting data types (**belongs to: BattleBattalionManager**)
  - [battleState.ts](../src/types/battleState.ts)
  - **Purpose**: TypeScript interfaces for targeting data
  - **Status**: Types defined but not utilized

## **⚙️ TARGETING DATA FLOW**

```
1. BattleController: Detects phase transition to ACTIVE or countdown completion
2. BattleController: Triggers TargetingService.assignInitialTargets()
3. TargetingService: Uses BATTLE_CONFIG network topology for validation
4. TargetingService: Assigns random neutral node targets to all battalions
5. BattleService: Stores targeting results per battle ID
6. BattleController: Includes targeting results in API response
7. BattleBattalionManager: Receives targeting data (currently unused)
```

## **📊 TARGETING ARCHITECTURE DIAGRAM**

```
SERVER SIDE                           CLIENT SIDE
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│                                 │   │                                 │
│  🎯 TargetingService            │   │  👥 BattleBattalionManager      │
│  ├─ assignInitialTargets()      │   │  ├─ Receives targeting data     │
│  ├─ getValidTargets()           │   │  ├─ Currently unused            │
│  ├─ isReachableViaNetwork()     │   │  └─ No visualization            │
│  └─ getNetworkPath()            │   │                                 │
│             │                   │   │                                 │
│             ▼                   │   │                                 │
│  🎮 BattleController            │   │                                 │
│  ├─ triggerTargeting()          │   │                                 │
│  ├─ getBattleState()            │◄──┤                                 │
│  └─ Phase transition trigger    │   │                                 │
│             │                   │   │                                 │
│             ▼                   │   │                                 │
│  💾 BattleService               │   │                                 │
│  ├─ Targeting results storage   │   │                                 │
│  └─ Per-battle targeting data   │   │                                 │
│             │                   │   │                                 │
│             ▼                   │   │                                 │
│  🏛️ BATTLE_CONFIG               │   │                                 │
│  ├─ NETWORK_CONNECTIONS         │   │                                 │
│  └─ Network topology authority  │   │                                 │
│                                 │   │                                 │
└─────────────────────────────────┘   └─────────────────────────────────┘
                 │                                       ▲
                 │    📡 API: Targeting Results Package  │
                 └───────────────────────────────────────┘
                     • Battalion targeting assignments
                     • Target node selections
                     • Network path information
                     • Targeting validation status
```

## **🔗 TARGETING CONNECTION FLOW (SIMPLIFIED)**

**BattleController.ts** detects when the battle phase transitions to ACTIVE or when the countdown reaches zero. It then triggers the targeting assignment process.

**TargetingService.ts** receives the trigger and processes all battalions. For each battalion, it uses **battleConfig.ts** to check which neutral nodes (3, 4, 5) are reachable via the network connections.

**TargetingService.ts** validates network reachability by checking direct connections only. It then randomly selects a valid target from the reachable neutral nodes.

**BattleService.ts** stores the targeting results for each battle ID so that multiple battles don't interfere with each other's targeting data.

**BattleController.ts** includes the targeting results in the battle state API response and sends it to **BattleBattalionManager.tsx**.

**BattleBattalionManager.tsx** receives the targeting data through its API call but currently doesn't use it for visualization - the targeting results are present in the data but not displayed to the user.

So the flow is: **BattleController** → **Phase detection** → **TargetingService** → **battleConfig validation** → **Random target selection** → **BattleService storage** → **BattleController API response** → **BattleBattalionManager receives** → **Data unused for visualization**.
