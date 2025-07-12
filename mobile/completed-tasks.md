## Batch 1A: Core Types and Constants (Foundation)
**Goal**: Create the foundational types and network constants

### NEW FILES TO CREATE:
1. **`src/types/battleTypes.ts`** (30 lines) - Core type definitions
2. **`src/utils/battleNetworkConstants.ts`** (20 lines) - Network topology constants

### FILES TO REFERENCE (READ ONLY):
- `src/types/battle.ts` (existing - for reference only)
- `src/utils/networkConstants.ts` (existing - for reference only)

### What This Achieves:
- ✅ Core type definitions for nodes, battalions, battle state
- ✅ Network topology with fixed node connections
- ✅ Foundation for all future development

### Test Criteria:
- Types compile correctly
- Network constants are properly defined
- No TypeScript errors

---

## Batch 1B: Network Visualization with Single Source of Truth
**Goal**: Create network visualization with consolidated architecture

### NEW FILES CREATED:
1. **`src/hooks/useBattleNodes.ts`** (80 lines) - Single source of truth for node state and positioning
2. **`src/hooks/useBattleNetwork.ts`** (60 lines) - Single source of truth for network connections and line calculations
3. **`src/components/battle/BattleNetworkGrid.tsx`** (140 lines) - Consolidated network visualization component

### FILES DELETED (consolidation):
- `src/components/battle/BattleNetworkLines.tsx` (moved logic to useBattleNetwork.ts)
- `src/components/battle/BattleNetworkNode.tsx` (moved logic to useBattleNodes.ts)
- `src/utils/battleNetworkConstants.ts` (unused prep work)

### What This Achieves:
- ✅ Single source of truth for node state (positions, ownership, health, capture progress)
- ✅ Single source of truth for network connections and line rendering
- ✅ Consolidated component that renders both nodes and lines
- ✅ Responsive node positioning (user left, neutral center, enemy right)
- ✅ Network topology with neutral nodes as central hubs
- ✅ Proper color coding and styling utilities

### Test Criteria:
- ✅ Network topology tests (user/enemy connections, neutral hubs, no direct user-enemy)
- ✅ Line calculation tests (horizontal, vertical, diagonal)
- ✅ Node positioning tests (column layout, responsive behavior, ownership)
- ✅ Node rendering tests (colors, borders, consistency)

---

## Batch 1C: Main Battle Screen
**Goal**: Create the main battle screen container

### NEW FILES CREATED:
1. **`src/screens/BattleGridScreen.tsx`** (75 lines) - Main battle screen container

### What This Achieves:
- ✅ Main battle screen with black background
- ✅ Network visualization integration using BattleNetworkGrid
- ✅ Proper screen layout and styling with SafeAreaView
- ✅ Title and subtitle display
- ✅ Single source of truth integration (useBattleNodes, useBattleNetwork)

### Test Criteria:
- ✅ Screen renders with black background
- ✅ Network visualization displays correctly
- ✅ No layout issues

---

## Batch 1D: Navigation Integration
**Goal**: Update navigation to use new battle screen

### FILES MODIFIED:
1. **`src/screens/TurfScreen.tsx`** (updated navigation button)

### What This Achieves:
- ✅ Navigation button points to new BattleGridScreen
- ✅ Old battle screen is no longer used
- ✅ Proper import and integration

### Test Criteria:
- ✅ Navigation button works correctly
- ✅ New battle screen loads properly

---

## Batch 2A: Node Ownership Management
**Goal**: Add dynamic ownership transfer functionality to existing node system

### FILES ENHANCED:
1. **`src/hooks/useBattleNodes.ts`** (enhanced with ownership management)

### What This Achieves:
- ✅ Dynamic ownership transfer functions (neutral ↔ user ↔ enemy)
- ✅ Node filtering by owner (getUserNodes, getEnemyNodes, getNeutralNodes)
- ✅ State management with React hooks
- ✅ Maintains single source of truth principle

### Test Criteria:
- ✅ Ownership transfer tests (correct transfers, no side effects)
- ✅ Node filtering tests (correct grouping by owner)
- ✅ State persistence tests

---

## Batch 2B: Node Ownership Visualization
**Goal**: Update network nodes to show ownership colors

### ANALYSIS:
- ✅ Ownership color logic already implemented in single source of truth (`useBattleNodes.ts`)
- ✅ Colors match intentions documents exactly (Blue #4717F6, Red #FF4141, Gray #666666)
- ✅ `BattleNetworkGrid.tsx` properly uses single source of truth functions
- ✅ No conflicting or doubled logic exists
- ✅ Comprehensive tests verify color functionality

### What This Achieves:
- ✅ Nodes display correct colors based on ownership
- ✅ Color coding: Blue (user), Red (enemy), Secondary (neutral)
- ✅ Single source of truth for all color logic
- ✅ Proper integration with current system architecture

### Test Criteria:
- ✅ Nodes display correct colors
- ✅ Color changes when ownership changes
- ✅ No duplicate color logic exists

---

## Batch 3A: Battle State Types and Management
**Goal**: Create battle state management system

### NEW FILES CREATED:
1. **`src/types/battleState.ts`** (40 lines) - Battle state types and actions
2. **`src/hooks/useBattleState.ts`** (150 lines) - Battle state management hook

### FILES ENHANCED:
1. **`src/types/battleTypes.ts`** (updated BattlePhase enum to remove 'initializing')

### What This Achieves:
- ✅ Battle phases (countdown, active, complete) - simplified from 4 to 3 phases
- ✅ 3-second start countdown with automatic transition to active
- ✅ 20-second battle timer with automatic completion
- ✅ State transitions with proper timer management
- ✅ Pause/resume functionality
- ✅ Manual battle end with winner specification
- ✅ Reset functionality to return to initial state

### Test Criteria:
- ✅ State transitions work correctly (countdown → active → complete)
- ✅ Timer counts down properly (3-second countdown, 20-second battle)
- ✅ Pause/resume functionality works
- ✅ Manual battle end works
- ✅ Reset returns to initial state
- ✅ Timer cleanup on unmount

---

## Batch 3B: Battle Overlay Components
**Goal**: Create countdown and timer overlay components

### NEW FILES CREATED:
1. **`src/components/battle/BattleCountdownOverlay.tsx`** (90 lines) - Full-screen countdown overlay with animations
2. **`src/components/battle/BattleTimerDisplay.tsx`** (80 lines) - Battle timer display with progress bar

### What This Achieves:
- ✅ Visual countdown overlay with fade-in/scale animations for 3-second countdown
- ✅ Battle timer display with progress bar for 20-second battle timer
- ✅ Proper overlay positioning and z-index management
- ✅ Responsive design with proper styling and text shadows
- ✅ Visibility controls for proper component lifecycle management

### Test Criteria:
- ✅ Countdown displays correctly with animations
- ✅ Timer counts down properly with progress visualization
- ✅ Overlay renders correctly with proper visibility controls

---

## Batch 3C: Overlay Integration
**Goal**: Integrate countdown and timer overlays into the main battle screen with clean, single-source layout logic

### NEW FILES CREATED:
1. **`src/components/battle/BattleOverlayManager.tsx`** - Manages all overlays for the battle screen

### FILES MODIFIED:
1. **`src/screens/BattleGridScreen.tsx`** - Uses BattleOverlayManager, passes full dimensions
2. **`src/hooks/useBattleNodes.ts`** - Now single source of truth for all node/network layout, including header/overlay space
3. **`__tests__/hooks/useBattleNodes.test.ts`** - Added meaningful regression tests for node positioning and layout

### What This Achieves:
- ✅ Overlays (countdown, timer) are managed in a dedicated, non-legacy component
- ✅ All node/network layout logic is controlled in useBattleNodes (single source of truth)
- ✅ Responsive, liquid layout for all screen sizes
- ✅ Overlay/header space is reserved and managed in one place
- ✅ No legacy code or unused logic remains
- ✅ Regression tests protect against accidental layout breakage

### Test Criteria:
- ✅ Countdown overlay appears for 3 seconds on screen load
- ✅ Timer overlay appears for 20 seconds after countdown
- ✅ Overlays disappear when phase is `complete`
- ✅ Node Y positions are always within bounds and stacked correctly
- ✅ Changing top margin shifts nodes as expected
- ✅ All tests pass

---

## Batch 4A: Deployment Zone Types and Positions (Skipped)
**Status:** Skipped for now. Will revisit and redesign deployment zone system at a later time.

---

## Batch 4B: Deployment Zone Visualization (Skipped)
**Status:** Skipped for now. Will revisit and redesign deployment zone visualization at a later time.

---

## Batch 5A: Battalion Types and Data
**Goal**: Create battalion data management system

### FILES ENHANCED:
1. **`src/types/battle.ts`** - Updated to integrate with useBots system
2. **`src/hooks/useBattalionData.ts`** - New battalion data management hook
3. **`src/screens/BattleGridScreen.tsx`** - Updated to demonstrate integration

### What This Achieves:
- ✅ Bot categories and stats integrated from useBots system
- ✅ Battalion data management with proper health calculations
- ✅ Battalion creation with stats from bot categories (Guardian, Breacher, Phreak)
- ✅ Health calculation based on bot type and quantity
- ✅ Attack power and defense calculations using bot stats
- ✅ Damage application system that reduces health and quantity
- ✅ Battalion destruction detection
- ✅ Integration demonstrated in BattleGridScreen

### Bot Categories Integration:
- **Guardian (Cavalry)**: Health 14, Speed 9, Range 4, Offense 8, Defense 6
- **Breacher (Infantry)**: Health 18, Speed 5, Range 5, Offense 7, Defense 8  
- **Phreak (Ranged)**: Health 12, Speed 7, Range 9, Offense 6, Defense 5

### Test Criteria:
- ✅ Bot categories are available in battle types system
- ✅ Battalion data is managed correctly with proper health calculations
- ✅ Health calculations use correct bot stats from useBots system

---

## Batch 5B: Battalion Visualization
**Goal**: Create static battalion visualization components

### FILES CREATED/ENHANCED:
1. **`src/components/battle/BattleBattalion.tsx`** - Individual battalion visualization (shapes, health bar, quantity, type, mark)
2. **`src/components/battle/BattleBattalionManager.tsx`** - Manages and renders multiple battalions
3. **`src/hooks/useBattleBattalions.ts`** - Battalion state management for visualization
4. **`src/screens/BattleGridScreen.tsx`** - Integrated battalion visualization with the network grid
5. **`src/hooks/useBattleNodes.ts`** - Node layout adjusted for better battalion visibility

### What This Achieves:
- ✅ Battalion visualization with distinct shapes: circle (Guardian), square (Breacher), diamond (Phreak)
- ✅ Quantity displayed in a black circular background, always upright
- ✅ Health bar above the shape, visually consistent for all types
- ✅ Bot type abbreviation and Mark level on the same line, just below the shape
- ✅ Red/blue border for enemy/user battalions
- ✅ Responsive node layout to avoid clipping and crowding
- ✅ All visual elements polished for clarity and consistency

### Test Criteria:
- ✅ Battalions render correctly on nodes in BattleNetworkGrid
- ✅ Bot types are distinguishable by shape/color
- ✅ Health bars and labels are visually clear and not clipped
- ✅ No UI overlap or crowding at screen edges

---

## Batch 5C: Server Battle Models and Database Schema
**Goal:** Create server-side battle models and database schema for authoritative battle state

### NEW SERVER FILES CREATED:
1. **`server/src/models/Battle.ts`** (150 lines) - Battle model with all state management
2. **`server/src/models/BattleEvent.ts`** (50 lines) - Battle event logging for replay/audit
3. **`server/src/types/battle.ts`** (80 lines) - Shared battle types for server

### What This Achieves:
- ✅ MongoDB schema for battle state (battalions, nodes, timers, etc.)
- ✅ Event logging for battle actions (movement, attacks, damage)
- ✅ Authoritative server state for all battle calculations
- ✅ Support for concurrent battles per user

### Database Schema Includes:
- Battle metadata (users, start time, phase, winner)
- Battalion state (positions, health, targets, movement paths)
- Node state (ownership, capture progress, health)
- Timer state (countdown, battle time)
- Event log for replay capability

### Implementation Details:
- **Battle Model**: Complete battle state with embedded battalion and node arrays
- **BattleEvent Model**: Event logging with proper indexing for efficient queries
- **Battle Types**: TypeScript interfaces and enums for all battle components
- **Instance Methods**: Helper methods for updating battle state
- **Static Methods**: Query methods for finding battles by various criteria
- **Proper Indexing**: Database indexes for efficient queries and performance

### Test Criteria:
- ✅ Server compiles with `npm run build` in server directory
- ✅ Models export properly and can be imported
- ✅ All TypeScript types compile correctly
- ✅ No runtime errors on model instantiation
- ✅ Database schemas are properly defined with validation

---

## Batch 5D: Server Battle Service and Game Logic (COMPLETE)
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Implement core battle logic and calculations on the server

### IMPLEMENTATION NOTES FOR AI:
- Services contain business logic, NOT database queries
- Import Battle model from 5C for database operations
- Copy bot stats from `mobile/src/hooks/useBots.ts` BOT_CATEGORIES
- Use existing `server/src/services/MapService.ts` as a pattern reference

### NEW SERVER FILES TO CREATE:
1. **`server/src/services/BattleService.ts`** (250 lines) - Core battle logic
   - Methods: createBattle, getBattle, endBattle
   - Initialize battalions on nodes 0-2 (user) and 6-8 (enemy)
   - Set neutral node health to 75% of total army strength
   - Handle phase transitions (countdown → active → complete)

2. **`server/src/services/BattleCalculator.ts`** (150 lines) - Damage/combat calculations
   - Copy formulas from intentions documents EXACTLY:
     - Attack Power = (Bot Type Strength + bonuses) × Quantity
     - Defense % = Bot Type Defense + bonuses
     - Damage = Attack Power / (Defense % × 100)
   - Methods: calculateDamage, applyDamage, checkDestruction

3. **`server/src/services/BattleMovement.ts`** (120 lines) - Movement and pathfinding
   - Copy NETWORK_CONNECTIONS from `mobile/src/utils/networkConstants.ts`
   - Implement Dijkstra's algorithm (reference `mobile/src/utils/pathfinding.ts`)
   - Methods: validatePath, calculatePath, moveAlongPath

### What This Achieves:
- ✅ Battle initialization with proper battalion placement
- ✅ Damage calculations (attack power, defense, unit loss)
- ✅ Node capture mechanics (tug-of-war system)
- ✅ Movement validation and pathfinding
- ✅ Victory condition checking

### Server-Side Calculations:
- Health: `(Bot Type Health + bonuses) × Quantity`
- Attack Power: `(Bot Type Strength + bonuses) × Quantity`
- Damage: `Attack Power / (Defense % × 100)`
- Node Capture: Progress based on damage/health ratio

### TESTING THIS BATCH:
- Services should compile without errors
- Export all service classes properly
- Unit tests can be written but are not required yet

---

## Batch 5E: Battle API Routes and Controllers (COMPLETE)
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Create REST API endpoints for battle operations

### IMPLEMENTATION NOTES FOR AI:
- Follow existing patterns in `server/src/routes/auth.ts` and `userRoutes.ts`
- Controllers handle HTTP requests/responses, services handle logic
- Use the auth middleware from `server/src/middleware/auth.ts`
- Add new routes to `server/server.ts` after creating them

### NEW SERVER FILES TO CREATE:
1. **`server/src/routes/battle.ts`** (100 lines) - Battle API routes
   - Use Express Router
   - Apply auth middleware to all routes
   - Define routes mapping to controller methods
   - Export router

2. **`server/src/controllers/BattleController.ts`** (180 lines) - Battle request handlers
   - Import services from 5D
   - Methods: startBattle, getBattleState, submitAction, getBattleEvents, endBattle
   - Handle errors with try/catch and proper HTTP status codes
   - Validate request parameters

3. **`server/src/middleware/battleAuth.ts`** (40 lines) - Battle-specific auth checks
   - Verify user owns the battle or is a participant
   - Check battle is active for action submissions
   - Export middleware function

### API Endpoints:
- `POST /api/battle/start` - Initialize new battle
- `GET /api/battle/:id/state` - Get current battle state
- `POST /api/battle/:id/action` - Submit battle action (future use)
- `GET /api/battle/:id/events` - Get battle event log
- `POST /api/battle/:id/end` - Force end battle (admin/timeout)

### IMPORTANT: Update server.ts
After creating routes, add to `server/server.ts`:
```typescript
import battleRoutes from './src/routes/battle';
app.use('/api/battle', battleRoutes);
```

### What This Achieves:
- ✅ RESTful API for all battle operations
- ✅ Proper authentication and authorization
- ✅ Battle state serialization for client
- ✅ Rate limiting for battle operations

### TESTING THIS BATCH:
- Start server with `npm run dev`
- Test with Postman or curl:
  - POST /api/battle/start (with auth token)
  - GET /api/battle/:id/state (with auth token)
- Verify proper error responses for unauthorized requests
