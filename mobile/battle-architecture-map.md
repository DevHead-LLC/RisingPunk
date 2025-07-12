# Battle System Architecture Map

## Purpose
This document maps the battle system architecture to help AI assistants understand what handles what during implementation. It shows the current client-side architecture and the server-driven changes in Phase 5 (5C-5I).

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

## Phase 5 Architecture (Server-Driven) - IN PROGRESS

### Server Side (Partially Complete)

#### Models (Database) - ✅ COMPLETED (Batch 5C)
- **Battle.ts** - Battle state persistence
  - ✅ Stores complete battle state with embedded battalion and node arrays
  - ✅ Tracks all battalions, nodes, timers with proper validation
  - ✅ Links to users and battle events
  - ✅ Instance methods for state updates (updatePhase, updateTimer, etc.)
  - ✅ Static methods for querying battles (findByBattleId, findActiveBattles, etc.)
  
- **BattleEvent.ts** - Event logging
  - ✅ Records all battle actions with proper indexing
  - ✅ Enables replay and audit trails
  - ✅ Flexible data field for event-specific information
  - ✅ Compound indexes for efficient queries

#### Services (Business Logic) - ✅ COMPLETED (Batch 5D)
- **BattleService.ts** - Core battle orchestration
  - ✅ Initializes battles with proper battalion placement
  - ✅ Manages battle lifecycle (create, get, end battles)
  - ✅ Coordinates all subsystems
  - ✅ Handles user and enemy battalion setup
  - ✅ Calculates neutral node health based on army strength
  
- **BattleCalculator.ts** - Combat calculations
  - ✅ **Handles all damage calculations (moved from client)**
  - ✅ **Calculates health, attack power, defense using exact formulas**
  - ✅ **Determines unit losses and destruction**
  - ✅ **Tug-of-war node capture system (-100% to +100% progress)**
  - ✅ **Victory conditions: 20-second timer OR complete elimination**
  - ✅ **Tie-breaker: enemy wins (defender advantage)**
  
- **BattleMovement.ts** - Movement validation
  - ✅ Validates movement along network paths
  - ✅ Calculates pathfinding server-side using Dijkstra's algorithm
  - ✅ **Will handle movement in Phase 6**
  - ✅ Network connection validation
  - ✅ Movement cost calculations
  - ✅ **Closest target selection (neutral nodes and enemy battalions)**
  - ✅ **Attack range positioning (stop at exact range from targets)**

#### Timer & Updates - 🔄 PENDING (Batch 5F)
- **BattleTimer.ts** - Timer management
  - **Manages countdown and battle timers (moved from client)**
  - Triggers phase transitions
  - Ensures synchronized timing
  
- **BattleUpdater.ts** - State updates
  - Runs every 100ms to update battle state
  - Performs state diffing for efficient updates
  - Sends updates to clients every 1s

#### API Layer - ✅ COMPLETED (Batch 5E)
- **battle.ts** (routes) - RESTful endpoints ✅
- **BattleController.ts** - Request handling ✅
- **battleAuth.ts** - Battle-specific authentication ✅

### Client Side (Modified) - 🔄 PENDING (Batch 5G-5H)

#### New/Modified Components - 🔄 PENDING
- **battleApi.ts** (NEW) - RTK Query API slice
  - Fetches battle state from server
  - Polls every 1s for updates
  
- **useBattleSync.ts** (NEW) - State synchronization
  - Manages server state updates
  - Handles interpolation for smooth visuals
  
- **battleStateCache.ts** (NEW) - Client caching
  - Caches state for performance
  - Enables predictive UI

#### Modified Hooks - 🔄 PENDING
- **useBattleBattalions** - Now fetches from server instead of local state
- **useBattalionData** - Calculations marked as deprecated (server handles)
- **useBattleState** - Timer display only (server manages actual timers)

---

## Current Status After Batch 5C

### ✅ What's Complete
1. **Database Foundation**
   - MongoDB schemas for Battle and BattleEvent models
   - TypeScript interfaces and enums for all battle components
   - Proper database indexing for performance
   - Instance and static methods for battle operations

2. **Type Safety**
   - Complete TypeScript support across server and client
   - Shared types between server models and client interfaces
   - Proper validation and constraints

3. **Event Logging Infrastructure**
   - BattleEvent model ready for comprehensive logging
   - Indexes for efficient event queries
   - Flexible data structure for all event types

### ✅ What's Complete (Batch 5D)
1. **BattleService.ts** - Core battle orchestration ✅
2. **BattleCalculator.ts** - Move all calculations from client to server ✅ (basic regression test added)
3. **BattleMovement.ts** - Server-side pathfinding and movement validation ✅

### ✅ What's Complete (Batch 5E)
1. **battle.ts** (routes) - RESTful API endpoints ✅
2. **BattleController.ts** - Request handling ✅
3. **battleAuth.ts** - Battle-specific authentication ✅
4. **Regression test** - Unauthenticated access protection ✅

### 📋 What's Set Up for Future Phases
- **Phase 6 (Movement)**: BattleMovement.ts service ready to implement
- **Phase 7 (Targeting)**: Event logging ready for target selection events
- **Phase 8 (Attacks)**: BattleCalculator.ts ready for damage calculations
- **Phase 9 (Animations)**: Client-side interpolation hooks ready to implement
- **Phase 10 (Integration)**: All foundation pieces in place

---

## Key Architecture Changes

### What Moves to Server
1. **All Calculations** - ✅ COMPLETED (Batch 5D)
   - Health calculations ✅
   - Damage calculations ✅
   - Attack power and defense ✅
   - Unit loss calculations ✅
   
2. **State Management** - 🔄 PENDING (Batch 5F)
   - Battalion positions and health
   - Node ownership and capture progress
   - Timer management
   - Victory conditions
   
3. **Game Logic** - 🔄 PENDING (Phases 6-8)
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

### Data Flow - 🔄 PENDING (Batch 5G)
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
- **State display** → Use data from `battleApi.ts` queries (once implemented)
- **Animations** → Add to components, use `useBattleSync` for interpolation (once implemented)

#### Server-Side Work
- **Game logic** → Add to `BattleService.ts` or related services (once created)
- **Calculations** → Add to `BattleCalculator.ts` (once created)
- **State updates** → Modify `BattleUpdater.ts` (once created)
- **New features** → Create new service files as needed

#### Connection Points - 🔄 PENDING
- **API calls** → Client `battleApi.ts` ↔ Server `battle.ts` routes
- **State updates** → Server `BattleUpdater.ts` → Client `useBattleSync.ts`
- **Events** → Server `BattleEvent.ts` → Client event display (future)

### Phase Dependencies
- **Phase 5** - Foundation (5C ✅ COMPLETE, 5D-5I 🔄 PENDING)
- **Phase 6** - Movement (depends on Phase 5)
- **Phase 7** - Targeting (depends on Phase 5)
- **Phase 8** - Attacks (depends on Phases 5, 6, 7)
- **Phase 9** - Animations (client-side, depends on Phase 6)
- **Phase 10** - Integration (brings everything together)

### Current Working Directory
- **Server work**: `server/src/` directory
- **Client work**: `mobile/src/` directory
- **Database**: MongoDB with Mongoose schemas
- **Types**: Shared between server and client via `server/src/types/battle.ts` 