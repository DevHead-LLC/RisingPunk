====================================
AI MUST READ SECTION BELOW! START.
====================================

# CRITICAL AI DIRECTIVES - READ BEFORE ANY BATCH IMPLEMENTATION

## Intentions Document Requirements
**MANDATORY**: Before implementing any batch, read relevant intentions documents:
- **Battle mechanics**: [battle-intentions.md](./battle-intentions.md)
- **Node work**: [node-behaviors.md](./node-behaviors.md) 
- **Battalion/bot work**: [battalion-bot-behaviors.md](./battalion-bot-behaviors.md)
- **Architecture map**: [battle-architecture-map.md](./battle-architecture-map.md)

## Implementation Rules
- **NO INVENTION**: Only implement features specified in intentions documents
- **NO GAPS**: If batch requires logic not in intentions, STOP and ask for specification

## Process
1. Read relevant intentions documents
2. Implement ONLY what's specified in batch description
3. If conflicts exist, intentions documents take precedence
4. Ask for clarification before proceeding with any deviation

## Core Architecture Principles
- **Single Source of Truth**: Each concept has one authoritative location
- **File Size Limit**: No file exceeds 250 lines - if it does, create a new file and import as needed
- **Clean Separation**: Logic, state, and UI are properly separated
- **Testable Components**: Each piece can be tested independently

====================================
AI MUST READ SECTION ABOVE! END.
====================================
=====================================================================================================================================================================
=====================================================================================================================================================================

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

## Batch 5H: Server-Side Movement Execution and Real-Time Updates
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Activate server-side movement logic and implement real-time battle updates

### IMPLEMENTATION NOTES FOR AI:
- This batch activates the existing BattleMovement.ts service for actual movement execution
- Extends BattleUpdater to call movement logic every 100ms
- Server becomes the authoritative source for all movement and targeting

### SERVER FILES TO MODIFY/CREATE:
1. **`server/src/services/BattleUpdater.ts`** - Add movement execution
   - Add executeMovementPhase() method that calls BattleMovement.findClosestTarget()
   - Add updateBattalionPositions() method that calls BattleMovement.moveAlongPath()
   - Add retargetBattalions() method for when targets are captured/destroyed
   - Call these methods in the main update loop every 100ms

2. **`server/src/services/BattleMovement.ts`** - Extend for execution (add 50 lines)
   - Add executeBattalionMovement() method - orchestrates all movement for a battle
   - Add assignInitialTargets() method - assigns targets to battalions at battle start
   - Add checkRetargetingNeeded() method - determines when battalions need new targets
   - Integrate with existing findClosestTarget() and moveAlongPath() methods

3. **`server/src/controllers/BattleController.ts`** - Add movement endpoints
   - Add getBattalionMovement endpoint for debugging movement state
   - Add forceRetarget endpoint for testing retargeting logic
   - Extend getBattleState to include movement data (current targets, paths)

### What This Achieves:
- ✅ Server-side movement execution using existing BattleMovement service
- ✅ Automatic targeting and retargeting based on proximity
- ✅ Real-time movement updates every 100ms
- ✅ Attack range positioning per intentions documents
- ✅ Single source of truth for all movement decisions

### Integration Strategy:
- BattleUpdater orchestrates: timers → movement → combat → victory checks
- BattleMovement handles: targeting → pathfinding → positioning → movement execution
- All movement state saved to database and sent to clients

### TESTING THIS BATCH:
- Start battle and verify battalions automatically select targets
- Check movement follows network paths correctly
- Verify retargeting when nodes are captured
- Test attack range positioning accuracy

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

## Batch 6A: Client-Side Movement Visualization and Interpolation
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Create smooth client-side visualization of server-calculated movement

### IMPLEMENTATION NOTES FOR AI:
- Client receives movement data from server, doesn't calculate movement logic
- Focus on smooth interpolation between server updates (1s intervals)
- Reuse existing client pathfinding for visual interpolation only

### CLIENT FILES TO CREATE/MODIFY:
1. **`mobile/src/hooks/useBattleMovementVisualization.ts`** (NEW - 120 lines) - Movement visualization
   - Subscribe to server movement updates via battleApi
   - Interpolate battalion positions between server updates
   - Use existing pathfinding.ts for smooth line-following animation
   - Handle movement state transitions (idle → moving → attacking)

2. **`mobile/src/utils/movementInterpolation.ts`** (NEW - 80 lines) - Interpolation utilities
   - calculateIntermediatePosition() - position between two points on network line
   - smoothMovementTransition() - easing functions for natural movement
   - projectPositionOnPath() - keep battalions on network lines during animation
   - Use existing networkConstants.ts for network topology

3. **`mobile/src/components/battle/BattleMovementEffects.tsx`** (NEW - 60 lines) - Visual effects
   - Movement trails showing battalion paths
   - Attack range circles when battalions reach targets
   - Targeting lines connecting battalions to their targets
   - Path preview lines showing intended movement routes

### What This Achieves:
- ✅ Smooth 60fps movement visualization between server updates
- ✅ Visual feedback for targeting and movement decisions
- ✅ Reuses existing client pathfinding for visual interpolation only
- ✅ No duplicate movement logic (server remains authoritative)

### Coordination Strategy:
- Server sends: battalion positions, targets, movement paths every 1s
- Client interpolates: smooth animation between server positions
- Client displays: movement effects, targeting indicators, attack ranges

### TESTING THIS BATCH:
- Verify smooth movement animation between server updates
- Check targeting indicators display correctly
- Test movement effects render properly
- Monitor performance with multiple moving battalions

---

## Batch 6B: Integrated Movement System and Battle Coordination
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Integrate server movement logic with client visualization in BattleGridScreen

### IMPLEMENTATION NOTES FOR AI:
- This batch connects server movement execution with client visualization
- Updates BattleGridScreen to use server movement data
- Deprecates local movement calculations with TODO comments

### CLIENT FILES TO MODIFY:
1. **`mobile/src/screens/BattleGridScreen.tsx`** - Integrate movement visualization
   - Import and use useBattleMovementVisualization hook
   - Add movement effects to battle rendering
   - Display targeting indicators and attack ranges
   - Keep existing battle components unchanged

2. **`mobile/src/hooks/useBattleBattalions.ts`** - Deprecate local movement
   - Add TODO comments: "// TODO: Movement now handled by server - remove local movement logic"
   - Keep existing visualization functionality
   - Add server movement data integration

3. **`mobile/src/hooks/useBattalionData.ts`** - Mark movement calculations as deprecated
   - Add TODO comments before movement-related methods
   - Keep methods functional for backward compatibility
   - Add server data integration hooks

### SERVER FILES TO MODIFY:
1. **`server/src/controllers/BattleController.ts`** - Enhanced battle state response
   - Include movement data in getBattleState response
   - Add battalion targeting information
   - Include movement paths and attack ranges
   - Add movement timing information for client interpolation

### What This Achieves:
- ✅ Complete integration of server movement logic with client visualization
- ✅ BattleGridScreen displays server-calculated movement
- ✅ Smooth coordination between server updates and client animations
- ✅ Clear migration path from local to server-side movement

### Integration Points:
- **Server**: BattleUpdater → BattleMovement → database → API response
- **Client**: battleApi → useBattleMovementVisualization → BattleGridScreen
- **Coordination**: 100ms server updates, 1s client polling, 60fps interpolation

### TESTING THIS BATCH:
- Run full battle and verify movement works end-to-end
- Check server movement logic coordinates with client visualization
- Test targeting and retargeting displays correctly
- Verify no conflicts between server and client movement logic

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