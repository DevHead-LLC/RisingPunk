====================================
AI MUST READ SECTION BELOW! START.
====================================

# CRITICAL AI DIRECTIVES - READ BEFORE ANY BATCH IMPLEMENTATION

## Intentions Document Requirements
**MANDATORY**: Before implementing any batch, read relevant intentions documents:
- **Battle mechanics**: [battle-intentions.md](./battle-intentions.md)
- **Node work**: [node-behaviors.md](./node-behaviors.md) 
- **Battalion/bot work**: [battalion-bot-behaviors.md](./battalion-bot-behaviors.md)

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

## Batch 5C: Server Battle Models and Database Schema
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Create server-side battle models and database schema for authoritative battle state

### NEW SERVER FILES TO CREATE:
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

---

## Batch 5D: Server Battle Service and Game Logic
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Implement core battle logic and calculations on the server

### NEW SERVER FILES TO CREATE:
1. **`server/src/services/BattleService.ts`** (250 lines) - Core battle logic
2. **`server/src/services/BattleCalculator.ts`** (150 lines) - Damage/combat calculations
3. **`server/src/services/BattleMovement.ts`** (120 lines) - Movement and pathfinding

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

---

## Batch 5E: Battle API Routes and Controllers
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Create REST API endpoints for battle operations

### NEW SERVER FILES TO CREATE:
1. **`server/src/routes/battle.ts`** (100 lines) - Battle API routes
2. **`server/src/controllers/BattleController.ts`** (180 lines) - Battle request handlers
3. **`server/src/middleware/battleAuth.ts`** (40 lines) - Battle-specific auth checks

### API Endpoints:
- `POST /api/battle/start` - Initialize new battle
- `GET /api/battle/:id/state` - Get current battle state
- `POST /api/battle/:id/action` - Submit battle action (future use)
- `GET /api/battle/:id/events` - Get battle event log
- `POST /api/battle/:id/end` - Force end battle (admin/timeout)

### What This Achieves:
- ✅ RESTful API for all battle operations
- ✅ Proper authentication and authorization
- ✅ Battle state serialization for client
- ✅ Rate limiting for battle operations

---

## Batch 5F: Server Battle State Updates and Timer Management
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Implement server-side battle state updates and timer management

### NEW SERVER FILES TO CREATE:
1. **`server/src/services/BattleTimer.ts`** (100 lines) - Timer management service
2. **`server/src/services/BattleUpdater.ts`** (150 lines) - State update orchestration
3. **`server/src/config/battleConfig.ts`** (30 lines) - Battle configuration constants

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

---

## Batch 5G: Client Battle API Integration
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Update client to fetch battle state from server instead of local calculations

### CLIENT FILES TO MODIFY:
1. **`src/store/api/battleApi.ts`** (NEW - 80 lines) - Battle API slice
2. **`src/hooks/useBattleBattalions.ts`** - Remove local state, use server data
3. **`src/hooks/useBattalionData.ts`** - Mark calculations as deprecated
4. **`src/screens/BattleGridScreen.tsx`** - Integrate server state

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

---

## Batch 5H: Battle State Synchronization and Optimizations
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Optimize client-server synchronization for smooth gameplay

### CLIENT FILES TO CREATE/MODIFY:
1. **`src/hooks/useBattleSync.ts`** (NEW - 120 lines) - State sync management
2. **`src/utils/battleStateCache.ts`** (NEW - 60 lines) - Client-side state caching
3. **`src/components/battle/BattleNetworkGrid.tsx`** - Add interpolation

### SERVER FILES TO MODIFY:
1. **`server/src/services/BattleUpdater.ts`** - Add state diffing
2. **`server/src/controllers/BattleController.ts`** - Add compression

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

---

## Batch 5I: Battle Testing and Migration Cleanup
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal:** Add comprehensive tests and clean up migration artifacts

### NEW TEST FILES:
1. **`server/src/__tests__/BattleService.test.ts`** (200 lines)
2. **`server/src/__tests__/BattleCalculator.test.ts`** (150 lines)
3. **`mobile/__tests__/hooks/useBattleSync.test.ts`** (100 lines)

### CLEANUP TASKS:
1. Remove deprecated local calculation code
2. Update documentation with server architecture
3. Add monitoring/logging for battle performance
4. Create migration guide for future features

### What This Achieves:
- ✅ Unit tests for all battle calculations
- ✅ Integration tests for battle flow
- ✅ Clean codebase without deprecated code
- ✅ Performance benchmarks documented
- ✅ Clear path for future features (movement, targeting, attacks)

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