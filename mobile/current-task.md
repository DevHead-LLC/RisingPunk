====================================
AI MUST READ SECTION BELOW! START.
====================================

# CRITICAL AI DIRECTIVES - READ BEFORE ANY BATCH IMPLEMENTATION

## Intentions Document Requirements
**MANDATORY**: Before implementing any batch, read relevant intentions documents:
- **Battle mechanics**: [battle-intentions.md](./battle-intentions.md)
- **Node work**: [node-behaviors.md](./node-behaviors.md) 
- **Battalion/bot work**: [battalion-bot-behaviors.md](./battalion-bot-behaviors.md)
- **Architecture map**: [battle-architecture-map.md](./battle-architecture-map.md) - Shows current vs Phase 5 architecture

## Implementation Rules
- **NO INVENTION**: Only implement features specified in intentions documents
- **NO LEGACY FILES**: Create new files with unique names, don't modify existing ones
- **NO GAPS**: If batch requires logic not in intentions, STOP and ask for specification
- **BATTLEGRID FOCUS**: All work must connect to BattleGridScreen.tsx workflow

## Process
1. Read relevant intentions documents
2. Implement ONLY what's specified in batch description
3. If conflicts exist, intentions documents take precedence
4. Ask for clarification before proceeding with any deviation

# Battle System Rebuild - Detailed Implementation Plan

## Overview
Rebuilding the battle system from scratch with clean architecture, proper node management, and network-constrained movement. Each batch is small and testable with unique file names and clear references.

## Core Architecture Principles
- **Single Source of Truth**: Each concept has one authoritative location
- **File Size Limit**: No file exceeds 300 lines
- **Network-Constrained Movement**: Battalions must follow network lines
- **Clean Separation**: Logic, state, and UI are properly separated
- **Testable Components**: Each piece can be tested independently

====================================
AI MUST READ SECTION ABOVE! END.
====================================
=====================================================================================================================================================================
=====================================================================================================================================================================

## Batch 5D: Server Battle Service and Game Logic
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

## Batch 5E: Battle API Routes and Controllers
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

---

## Batch 5F: Server Battle State Updates and Timer Management
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Implement server-side battle state updates and timer management

### IMPLEMENTATION NOTES FOR AI:
- Timer service should use setInterval for periodic updates
- Store active timers in memory (Map or object)
- Clean up timers when battles end
- BattleUpdater orchestrates all state changes

### NEW SERVER FILES TO CREATE:
1. **`server/src/services/BattleTimer.ts`** (100 lines) - Timer management service
   - Singleton pattern to manage all battle timers
   - Methods: startTimer, stopTimer, getTimeRemaining
   - Handle countdown (3s) and battle (20s) phases
   - Emit events for phase transitions

2. **`server/src/services/BattleUpdater.ts`** (150 lines) - State update orchestration
   - Run update loop every 100ms per battle
   - Call BattleCalculator for damage calculations
   - Update battalion positions based on movement
   - Check victory conditions
   - Save state to database periodically (every 1s)

3. **`server/src/config/battleConfig.ts`** (30 lines) - Battle configuration constants
   - Export constants: COUNTDOWN_DURATION = 3, BATTLE_DURATION = 20
   - UPDATE_INTERVAL = 100, SYNC_INTERVAL = 1000
   - Copy network connections and bot stats here

### What This Achieves:
- ✅ Server-side timer management (3s countdown, 20s battle)
- ✅ Automatic phase transitions
- ✅ Periodic state calculations (every 100ms server-side)
- ✅ Efficient state diffing for client updates
- ✅ Battle cleanup on completion

### Update Strategy:
- Server calculates state every 100ms
- Client receives updates every 1000ms (1s)
- Only changed data is sent to minimize bandwidth
- Critical events (victory, destruction) sent immediately

### TESTING THIS BATCH:
- Start a battle and verify timer counts down
- Check database updates every second
- Verify battle ends after 20 seconds
- Ensure timers are cleaned up (no memory leaks)

---

## Batch 5G: Client Battle API Integration
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Update client to fetch battle state from server instead of local calculations

### IMPLEMENTATION NOTES FOR AI:
- Work in the `mobile` directory for this batch
- Follow RTK Query patterns from existing API slices
- Add TODO comments but keep existing code functional
- Test on mobile app after changes

### CLIENT FILES TO CREATE/MODIFY:
1. **`mobile/src/store/api/battleApi.ts`** (NEW - 80 lines) - Battle API slice
   - Copy pattern from `balanceApi.ts` or `botsApi.ts`
   - Define endpoints: startBattle, getBattleState (with polling)
   - Set polling interval to 1000ms for getBattleState
   - Export hooks: useStartBattleMutation, useGetBattleStateQuery

2. **`mobile/src/hooks/useBattleBattalions.ts`** - Remove local state, use server data
   - Add TODO comment at top: "// TODO: This hook will be deprecated once server integration is complete"
   - Keep existing functionality for now
   - Add commented code showing how to use battleApi

3. **`mobile/src/hooks/useBattalionData.ts`** - Mark calculations as deprecated
   - Add TODO comments before each calculation method:
     "// TODO: Server handles this calculation now - remove in cleanup phase"
   - Keep methods functional for now

4. **`mobile/src/screens/BattleGridScreen.tsx`** - Integrate server state
   - Import and use useGetBattleStateQuery
   - Add loading state while fetching
   - Keep existing rendering logic
   - Map server state to existing component props

### What This Achieves:
- ✅ RTK Query setup for battle endpoints
- ✅ Automatic polling for battle state (1s intervals)
- ✅ Remove local battalion creation/damage calculations
- ✅ Display server-provided battle state
- ✅ Proper loading and error states

### Migration Strategy:
- Add TODO comments to deprecated local calculations
- Keep visualization components unchanged
- Only data source changes from local to server

### TESTING THIS BATCH:
- Run mobile app with `npm start`
- Start a battle - should call server endpoint
- Verify state updates every second
- Check loading states display properly

---

## Batch 5H: Battle State Synchronization and Optimizations
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Optimize client-server synchronization for smooth gameplay

### IMPLEMENTATION NOTES FOR AI:
- Interpolation means smoothly animating between server updates
- Cache previous state to detect changes
- This is advanced - focus on basic functionality first

### CLIENT FILES TO CREATE/MODIFY:
1. **`mobile/src/hooks/useBattleSync.ts`** (NEW - 120 lines) - State sync management
   - Subscribe to battle state updates
   - Detect changes between updates
   - Trigger animations for position changes
   - Handle reconnection on network issues

2. **`mobile/src/utils/battleStateCache.ts`** (NEW - 60 lines) - Client-side state caching
   - Store previous battle state
   - Compare states to find differences
   - Export methods: cacheState, getStateDiff, clearCache

3. **`mobile/src/components/battle/BattleNetworkGrid.tsx`** - Add interpolation
   - Add TODO comment: "// TODO: Add position interpolation for smooth movement"
   - Keep existing rendering for now

### SERVER FILES TO MODIFY:
1. **`server/src/services/BattleUpdater.ts`** - Add state diffing
   - Add method: calculateStateDiff(oldState, newState)
   - Only send changed fields to client
   - Add TODO: "// TODO: Implement compression for large battles"

2. **`server/src/controllers/BattleController.ts`** - Add compression
   - Add TODO: "// TODO: Add gzip compression for responses"
   - Keep sending full state for now

### What This Achieves:
- ✅ Smooth visual updates between server ticks
- ✅ Client-side interpolation for movement
- ✅ Predictive UI for better responsiveness
- ✅ State compression for bandwidth efficiency
- ✅ Automatic reconnection handling

### Performance Targets:
- < 100ms perceived latency for actions
- < 50KB/s bandwidth per active battle
- Smooth 60fps animations
- Graceful degradation on poor connections

### TESTING THIS BATCH:
- Monitor network traffic in dev tools
- Verify smooth animations between updates
- Test with network throttling
- Check reconnection works on network loss

---

## Batch 5I: Battle Testing and Migration Cleanup
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Add comprehensive tests and clean up migration artifacts

### IMPLEMENTATION NOTES FOR AI:
- Write tests using Jest (already configured)
- Focus on critical paths first
- Cleanup means removing TODO comments and deprecated code
- Update documentation as you go

### NEW TEST FILES:
1. **`server/src/__tests__/BattleService.test.ts`** (200 lines)
   - Test battle creation and initialization
   - Test phase transitions
   - Test victory conditions
   - Mock database calls

2. **`server/src/__tests__/BattleCalculator.test.ts`** (150 lines)
   - Test damage calculations match formulas
   - Test unit loss calculations
   - Test edge cases (zero health, negative damage)
   - Use specific test cases from intentions docs

3. **`mobile/__tests__/hooks/useBattleSync.test.ts`** (100 lines)
   - Test state diff detection
   - Test interpolation calculations
   - Test reconnection logic
   - Mock API responses

### CLEANUP TASKS:
1. Remove deprecated local calculation code
   - Delete methods marked with TODO in useBattalionData
   - Remove local state from useBattleBattalions
   - Clean up unused imports

2. Update documentation with server architecture
   - Add server setup instructions to README
   - Document API endpoints
   - Update battle-architecture-map.md if needed

3. Add monitoring/logging for battle performance
   - Add console.time() for performance tracking
   - Log battle events to help debug issues
   - Add error tracking

4. Create migration guide for future features
   - Document what moved to server
   - List remaining client-side code
   - Note extension points for phases 6-10

### What This Achieves:
- ✅ Unit tests for all battle calculations
- ✅ Integration tests for battle flow
- ✅ Clean codebase without deprecated code
- ✅ Performance benchmarks documented
- ✅ Clear path for future features (movement, targeting, attacks)

### TESTING THIS BATCH:
- Run tests: `npm test` in both directories
- All tests should pass
- Check code coverage if configured
- Manual test full battle flow end-to-end

### COMPLETION CRITERIA:
- Server handles all battle logic
- Client only displays state
- Tests pass
- Documentation updated
- Ready for Phase 6 (Movement)

---

## Batch 6A: Movement Types and Utilities
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create movement system foundation

### NEW FILES TO CREATE:
1. **`src/types/movement.ts`** (30 lines) - Movement type definitions
2. **`src/utils/networkMovement.ts`** (80 lines) - Movement utilities

### FILES TO REFERENCE (READ ONLY):
- `src/utils/movementUtils.ts` (existing - for reference only)
- `src/utils/pathfinding.ts` (existing - for reference only)

### What This Achieves:
- ✅ Movement type definitions
- ✅ Network line validation
- ✅ Path calculation between nodes
- ✅ Movement constraint enforcement

### Test Criteria:
- Paths follow network lines
- Invalid paths are rejected
- Movement constraints enforced

---

## Batch 6B: Movement Hook and Logic
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create movement React hook and logic

### NEW FILES TO CREATE:
1. **`src/hooks/useNetworkMovement.ts`** (70 lines) - Movement hook

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useMovement.ts` (existing - for reference only)
- `src/hooks/usePathFollowing.ts` (existing - for reference only)

### What This Achieves:
- ✅ Movement state management
- ✅ Path following logic
- ✅ Position projection onto lines

### Test Criteria:
- Movement state is managed correctly
- Position projection works
- Path following is accurate

---

## Batch 7A: Targeting Types and Logic
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create targeting system foundation

### NEW FILES TO CREATE:
1. **`src/types/targeting.ts`** (30 lines) - Targeting type definitions
2. **`src/utils/targeting.ts`** (80 lines) - Targeting logic

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useTargeting.ts` (existing - for reference only)
- `src/utils/targetValidation.ts` (existing - for reference only)

### What This Achieves:
- ✅ Targeting type definitions
- ✅ Target selection logic
- ✅ Range calculations
- ✅ Target validation

### Test Criteria:
- Targets are selected correctly
- Range calculations are accurate
- Invalid targets are rejected

---

## Batch 7B: Targeting Hook and Visualization
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create targeting React hook and visual components

### NEW FILES TO CREATE:
1. **`src/hooks/useBattleTargeting.ts`** (70 lines) - Targeting hook
2. **`src/components/battle/BattleTargeting.tsx`** (60 lines) - Targeting visualization

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useTargeting.ts` (existing - for reference only)

### What This Achieves:
- ✅ Targeting state management
- ✅ Visual targeting indicators
- ✅ Target highlighting

### Test Criteria:
- Targeting state is managed correctly
- Visual indicators work
- Target highlighting is accurate

---

## Batch 8A: Attack Types and Logic
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create attack system foundation

### NEW FILES TO CREATE:
1. **`src/types/attacks.ts`** (30 lines) - Attack type definitions
2. **`src/utils/attacks.ts`** (80 lines) - Attack logic

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useCombat.ts` (existing - for reference only)
- `src/utils/battleCalculator.ts` (existing - for reference only)

### What This Achieves:
- ✅ Attack type definitions
- ✅ Attack calculations
- ✅ Damage application
- ✅ Health updates

### Test Criteria:
- Attacks calculate correctly
- Damage is applied properly
- Health updates accurately

---

## Batch 8B: Attack Hook and Effects
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create attack React hook and visual effects

### NEW FILES TO CREATE:
1. **`src/hooks/useAttacks.ts`** (70 lines) - Attack hook
2. **`src/components/battle/AttackEffects.tsx`** (60 lines) - Attack effects

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useCombat.ts` (existing - for reference only)

### What This Achieves:
- ✅ Attack state management
- ✅ Attack animations
- ✅ Visual attack effects

### Test Criteria:
- Attack state is managed correctly
- Animations play correctly
- Effects render properly

---

## Batch 9A: Animation Types and Utilities
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create animation system foundation

### NEW FILES TO CREATE:
1. **`src/types/animation.ts`** (30 lines) - Animation type definitions
2. **`src/utils/animationUtils.ts`** (60 lines) - Animation utilities

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useBattleCoordination.ts` (existing - for reference only)

### What This Achieves:
- ✅ Animation type definitions
- ✅ Animation timing utilities
- ✅ Animation coordination logic

### Test Criteria:
- Animation timing is correct
- Coordination works properly
- Utilities function correctly

---

## Batch 9B: Battalion Movement Animation
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create animated battalion movement

### NEW FILES TO CREATE:
1. **`src/hooks/useBattalionMovement.ts`** (80 lines) - Movement animation hook

### FILES TO MODIFY:
1. **`src/components/battle/BattleBattalion.tsx`** (update to add animation)

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useBattleCoordination.ts` (existing - for reference only)

### What This Achieves:
- ✅ Smooth battalion movement
- ✅ Network-constrained paths
- ✅ Movement timing
- ✅ Animation coordination

### Test Criteria:
- Movement is smooth
- Paths follow network lines
- Timing is correct
- Animations coordinate properly

---

## Batch 10A: Integration Types and Validation
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create system integration and validation

### NEW FILES TO CREATE:
1. **`src/types/integration.ts`** (30 lines) - Integration type definitions
2. **`src/utils/battleValidation.ts`** (60 lines) - Validation utilities

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useBattleEngine.ts` (existing - for reference only)

### What This Achieves:
- ✅ Integration type definitions
- ✅ System validation utilities
- ✅ Error handling

### Test Criteria:
- Validation works correctly
- Errors are handled properly
- Types compile correctly

---

## Batch 10B: Final Integration
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Integrate all systems into main battle screen

### FILES TO MODIFY:
1. **`src/screens/BattleGridScreen.tsx`** (update with full integration)

### NEW FILES TO CREATE:
1. **`src/hooks/useBattleIntegration.ts`** (80 lines) - System integration hook

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useBattleEngine.ts` (existing - for reference only)

### What This Achieves:
- ✅ Complete battle system
- ✅ All systems integrated
- ✅ Error handling
- ✅ Performance optimization

### Test Criteria:
- All systems work together
- No errors or crashes
- Performance is acceptable
- Battle flow is complete

---