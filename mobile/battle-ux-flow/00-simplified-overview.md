# Simplified Battle Structure Overview

## Current Implementation Scope
**Battle Start → 3s Countdown Overlay → 20s Battle Countdown + Network → Mock Battalions → Initial Targeting**

---

## File Section - Codebase Connections Standpoint

### **BattleGridScreen.tsx**
**Responsibility:** 
Orchestrates Battle Scene Automation / Visualization

**Imports:**
- BattleNetworkGrid
- BattleBattalionManager  
- BattleOverlayManager
- battleGridStyles

**Data Flow:**
- Receives `battleId` prop from parent navigation
- Passes `battleId` to all child components
- Each child component makes independent API calls
- No data coordination - pure visualization orchestration

---

### **BattleNetworkGrid.tsx**
**Responsibility:**
Receives props from BattleGridScreen to build visual network pieces. Calls database to fetch data and organize position calculations for visual pieces. Sends package back to BattleGridScreen when imported.

**Imports:**
- useGetBattleStateQuery (from battleApi)
- React Native components (View, Text, TouchableOpacity, etc.)

**Fetches:**
- Battle state data from `/api/battle/{battleId}/state` endpoint
- Server-provided network topology (connections, line properties, node positions)
- Real-time updates via 1-second polling

**Server Data Dependencies:**
- `nodes[]` - Node positions, ownership, health, capture progress
- `networkConnections[]` - Network topology (from/to node indices)
- `lineProperties[]` - Calculated line lengths, angles, positions

**Visual Output:**
- Network connection lines with calculated properties
- Nodes with ownership-based colors and labels

---

### **BattleBattalionManager.tsx**
**Responsibility:**
Receives props from BattleGridScreen to build battalion visual pieces. Calls database to fetch battalion data and position them on network nodes. Sends package back to BattleGridScreen when imported.

**Imports:**
- useGetBattleStateQuery (from battleApi)
- BattleBattalion component
- Battalion types from battle types

**Fetches:**
- Battle state data from `/api/battle/{battleId}/state` endpoint
- Server-provided battalion data and node positions
- Real-time updates via 1-second polling

**Server Data Dependencies:**
- `battalions[]` - Battalion data (type, quantity, health, nodeIndex)
- `nodes[]` - Node positions for battalion placement

**Visual Output:**
- Battalion sprites positioned on network nodes
- Health bars, quantity displays, bot type indicators
- Filtered to only show battalions with valid node positions

---

### **BattleOverlayManager.tsx**
**Responsibility:**
Receives props from BattleGridScreen to build overlay visual pieces. Calls database to fetch timer data and manage countdown/battle timer displays. Sends package back to BattleGridScreen when imported.

**Imports:**
- useGetBattleStateQuery (from battleApi)
- BattleCountdownOverlay component
- BattleTimerDisplay component
- BattlePhase types

**Fetches:**
- Battle state data from `/api/battle/{battleId}/state` endpoint
- Server-provided timer values and phase information
- Real-time updates via 1-second polling

**Server Data Dependencies:**
- `phase` - Current battle phase (setup/countdown/active/victory/defeat)
- `countdown` - Countdown timer value (3,2,1,0)
- `battleTime` - Battle timer value (0-20 seconds)

**Visual Output:**
- 3-second countdown overlay (3,2,1 display)
- 20-second battle timer display
- Phase-based visibility management

---

### **battleApi.ts**
**Responsibility:**
Defines API endpoints and data types for battle state communication between client and server.

**Imports:**
- Redux Toolkit Query (createApi, fetchBaseQuery)
- API_URL from config
- Battalion types

**API Endpoints:**
- `POST /api/battle/start` - Start new battle
- `GET /api/battle/{battleId}/state` - Get current battle state

**Data Types:**
- BattleState interface (matching server response)
- NetworkConnection interface
- LineProperties interface
- StartBattleRequest interface

**Client Integration:**
- Provides `useStartBattleMutation` hook
- Provides `useGetBattleStateQuery` hook
- Handles API response transformation

---

## Server-Side Architecture

### **BattleController.ts**
**Responsibility:**
Orchestrates battle API endpoints, coordinates between services, and manages response creation.

**Imports:**
- BattleService (battle lifecycle)
- BattalionMappingService (data transformation)
- BattleResponseService (response creation)
- BATTLE_CONFIG (network calculations)

**Key Methods:**
- `startBattle()` - Creates new battle and returns initial state
- `getBattleState()` - Returns current battle state with real-time timer values
- `generateNetworkData()` - Calculates network positions and line properties

**Data Flow:**
- Receives client requests
- Orchestrates service calls
- Returns formatted battle state responses

---

### **BattleService.ts**
**Responsibility:**
Manages battle lifecycle, database operations, and timer coordination.

**Key Methods:**
- `createBattle()` - Creates new battle in database
- `getBattle()` - Retrieves battle from database
- `getTimerService()` - Provides access to real-time timer
- `triggerInitialTargeting()` - Triggers initial targeting when countdown ends
- `getTargetingResults()` - Returns targeting results

**Timer Integration:**
- Coordinates with BattleTimerService for real-time countdown
- Manages phase transitions (setup → countdown → active)
- Triggers initial targeting when countdown reaches 0

---

### **TargetingService.ts**
**Responsibility:**
Handles initial targeting logic when battle becomes active.

**Key Logic:**
- Enforces direct network connections only (no 1-hop paths)
- Validates battalion positions and target availability
- Returns targeting results for client visualization

**Trigger Point:**
- Activated when `currentPhase === BattlePhase.ACTIVE && currentCountdown === 0`
- Only runs once per battle (initial targeting only)

---

## Data Flow Summary

1. **Battle Start:** Client calls `POST /api/battle/start` → BattleController.startBattle() → BattleService.createBattle() → Returns initial battle state

2. **Real-time Updates:** Client polls `GET /api/battle/{battleId}/state` every 1 second → BattleController.getBattleState() → Returns current state with timer values

3. **Countdown Phase:** Server manages 3-second countdown → Client displays countdown overlay

4. **Battle Phase:** Server manages 20-second battle timer → Client displays battle timer

5. **Initial Targeting:** When countdown reaches 0 → Server triggers TargetingService → Returns targeting results to client

6. **Visualization:** Each client component (Network, Battalions, Overlays) independently fetches and displays its portion of the battle state

---

## Current System Boundaries

**✅ IMPLEMENTED:**
- Battle creation and state management
- Real-time countdown and battle timers
- Network visualization with server-calculated positions
- Battalion visualization with mock data
- Initial targeting system (direct connections only)
- 3-second countdown overlay
- 20-second battle timer display

**❌ NOT YET IMPLEMENTED:**
- Battalion movement
- Combat engagement
- Node capture mechanics
- Victory determination
- Post-battle navigation
