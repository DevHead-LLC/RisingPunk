# Battle System Architecture Map

## Purpose
This document maps the battle system architecture to help AI assistants understand what handles what during implementation. It shows the current client-side architecture and the upcoming server-driven changes in Phase 5 (5C-5I).

## Current Architecture (Client-Side Only)

### Entry Point
- **BattleGridScreen.tsx** - Main battle screen component
  - Manages overall battle state
  - Coordinates all battle subsystems
  - Renders visual components

### Data Management Hooks
- **useBattleNodes** - Node positions and ownership
  - Calculates node positions based on screen dimensions
  - Manages node ownership state (user/enemy/neutral)
  
- **useBattleNetworkConnections** - Network line connections
  - Provides network topology from networkConstants
  - Used for rendering lines and pathfinding
  
- **useBattalionData** - Battalion calculations
  - Creates battalions with stats
  - Calculates health, attack power, defense
  - Applies damage and checks destruction
  - **Currently does calculations client-side (will move to server)**
  
- **useBattleBattalions** - Battalion state management
  - Manages array of battalions
  - Handles adding/removing/updating battalions
  - **Currently stores state locally (will fetch from server)**
  
- **useBattleState** - Battle phase and timers
  - Manages countdown (3s) and battle (20s) timers
  - Handles phase transitions
  - **Timers currently client-side (will be server-driven)**
  
- **useBots** - Bot type definitions and stats
  - Provides bot categories (Guardian/Breacher/Phreak)
  - Returns stats for each bot type

### Visual Components
- **BattleNetworkGrid** - Renders nodes and network lines
- **BattleBattalionManager** - Manages battalion rendering
- **BattleBattalion** - Individual battalion visualization
- **BattleOverlayManager** - Countdown and timer overlays

### Utilities
- **networkConstants** - Network topology definition
- **pathfinding** - Dijkstra's algorithm for shortest paths

### Types
- **battle.ts** - Battalion and node interfaces
- **battleState.ts** - Battle state interfaces
- **battleTypes.ts** - Battle phase enums

---

## Phase 5 Architecture (Server-Driven)

### Server Side (New)

#### Models (Database)
- **Battle.ts** - Battle state persistence
  - Stores complete battle state
  - Tracks all battalions, nodes, timers
  - Links to users and battle events
  
- **BattleEvent.ts** - Event logging
  - Records all battle actions
  - Enables replay and audit trails

#### Services (Business Logic)
- **BattleService.ts** - Core battle orchestration
  - Initializes battles
  - Manages battle lifecycle
  - Coordinates all subsystems
  
- **BattleCalculator.ts** - Combat calculations
  - **Handles all damage calculations (moved from client)**
  - **Calculates health, attack power, defense**
  - **Determines unit losses and destruction**
  
- **BattleMovement.ts** - Movement validation
  - Validates movement along network paths
  - Calculates pathfinding server-side
  - **Will handle movement in Phase 6**
  
- **BattleTimer.ts** - Timer management
  - **Manages countdown and battle timers (moved from client)**
  - Triggers phase transitions
  - Ensures synchronized timing
  
- **BattleUpdater.ts** - State updates
  - Runs every 100ms to update battle state
  - Performs state diffing for efficient updates
  - Sends updates to clients every 1s

#### API Layer
- **battle.ts** (routes) - RESTful endpoints
- **BattleController.ts** - Request handling

### Client Side (Modified)

#### New/Modified Components
- **battleApi.ts** (NEW) - RTK Query API slice
  - Fetches battle state from server
  - Polls every 1s for updates
  
- **useBattleSync.ts** (NEW) - State synchronization
  - Manages server state updates
  - Handles interpolation for smooth visuals
  
- **battleStateCache.ts** (NEW) - Client caching
  - Caches state for performance
  - Enables predictive UI

#### Modified Hooks
- **useBattleBattalions** - Now fetches from server instead of local state
- **useBattalionData** - Calculations marked as deprecated (server handles)
- **useBattleState** - Timer display only (server manages actual timers)

---

## Key Architecture Changes

### What Moves to Server
1. **All Calculations**
   - Health calculations
   - Damage calculations
   - Attack power and defense
   - Unit loss calculations
   
2. **State Management**
   - Battalion positions and health
   - Node ownership and capture progress
   - Timer management
   - Victory conditions
   
3. **Game Logic**
   - Target selection (Phase 7)
   - Movement validation (Phase 6)
   - Attack resolution (Phase 8)

### What Stays on Client
1. **Visualization**
   - All visual components unchanged
   - Animation and rendering
   - UI overlays
   
2. **User Input**
   - Touch/click handling
   - UI interactions
   
3. **State Display**
   - Shows server-provided state
   - Interpolates between updates

### Data Flow
1. Client requests battle start → Server initializes battle
2. Server calculates state every 100ms
3. Client polls state every 1000ms
4. Client interpolates visuals between updates
5. Critical events (victory, destruction) sent immediately

---

## Usage Guide for AI

### When Working on Battle Features

#### Client-Side Work
- **Visual components** → Modify existing components in `src/components/battle/`
- **State display** → Use data from `battleApi.ts` queries
- **Animations** → Add to components, use `useBattleSync` for interpolation

#### Server-Side Work
- **Game logic** → Add to `BattleService.ts` or related services
- **Calculations** → Add to `BattleCalculator.ts`
- **State updates** → Modify `BattleUpdater.ts`
- **New features** → Create new service files as needed

#### Connection Points
- **API calls** → Client `battleApi.ts` ↔ Server `battle.ts` routes
- **State updates** → Server `BattleUpdater.ts` → Client `useBattleSync.ts`
- **Events** → Server `BattleEvent.ts` → Client event display (future)

### Phase Dependencies
- **Phase 5** - Foundation (current focus)
- **Phase 6** - Movement (depends on Phase 5)
- **Phase 7** - Targeting (depends on Phase 5)
- **Phase 8** - Attacks (depends on Phases 5, 6, 7)
- **Phase 9** - Animations (client-side, depends on Phase 6)
- **Phase 10** - Integration (brings everything together) 