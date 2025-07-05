====================================
AI MUST READ SECTION BELOW! START.
====================================

# CRITICAL AI DIRECTIVES - READ BEFORE ANY BATCH IMPLEMENTATION

## MANDATORY FILE CHECK
**BEFORE ANY FILE CREATION OR MODIFICATION**: Check [current-battlegrid-connections.md](./current-battlegrid-connections.md) to ensure ALL work stays focused on BattleGridScreen.tsx workflow. DO NOT work on BattleScreen.tsx or associated files.

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
1. Check current-battlegrid-connections.md for file scope
2. Read relevant intentions documents
3. Implement ONLY what's specified in batch description
4. If conflicts exist, intentions documents take precedence
5. Ask for clarification before proceeding with any deviation

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

## Batch 5A: Battalion Types and Data
REVIEW AI MUST READ 
**Goal**: Create battalion data management system

### NEW FILES TO CREATE:
1. **`src/types/battalion.ts`** (40 lines) - Battalion type definitions
2. **`src/hooks/useBattalionData.ts`** (60 lines) - Battalion data management hook

### FILES TO REFERENCE (READ ONLY):
- `src/types/bots.ts` (existing - for reference only)
- `src/hooks/useBattalionRefsAndState.ts` (existing - for reference only)

### What This Achieves:
- ✅ Battalion type definitions
- ✅ Battalion data management
- ✅ Bot type and quantity tracking

### Test Criteria:
- Battalion data is managed correctly
- Bot types are properly tracked
- Quantities are accurate

---

## Batch 5B: Battalion Visualization
**Goal**: Create static battalion visualization components

### NEW FILES TO CREATE:
1. **`src/components/battle/BattleBattalion.tsx`** (80 lines) - Battalion component

### FILES TO REFERENCE (READ ONLY):
- `src/components/battle/AnimatedBattalion.tsx` (existing - for reference only)
- `src/components/battle/BattalionSlot.tsx` (existing - for reference only)

### What This Achieves:
- ✅ Static battalion visualization
- ✅ Bot type indicators
- ✅ Quantity displays
- ✅ Health bars (static)

### Test Criteria:
- Battalions render correctly
- Bot types are distinguishable
- Quantities display properly
- Health bars show correctly

---

## Batch 5C: Server-Driven Battalion Initialization and Stats
**Goal:** Move battalion initialization and stat calculations to the server for authoritative state.

### What This Will Do:
- Server exposes endpoint to provide initial battle state (battalions, health, node positions, etc.)
- Client fetches this data on battle start
- All health/stat calculations are performed on the server, not the client
- Client only displays what the server sends

### TODO/Comments:
- Add TODOs in useBattalionData and related files to remind future devs to fetch from server, not calculate locally
- Server: Implement endpoint `/api/battle/init` (or similar)
- Client: Replace local battalion initialization with server fetch

---

## Batch 5D: Periodic Server Sync for Live Battle State
**Goal:** Sync frontend with server every 1s for live battle state updates

### What This Will Do:
- Server updates battle state as often as needed (every action, attack, etc.)
- Client polls server every 1s (or uses websockets) to get latest state
- Frontend only updates visuals once per second for health, quantity, etc.
- Ensures frontend is always in sync with server

### TODO/Comments:
- Add TODOs in battle screen and useBattalionData to replace local state with server-driven updates
- Server: Implement endpoint `/api/battle/state` (or websocket event)
- Client: Set up polling or websocket subscription

---

## Batch 5E: Code Comments and Future Integration Points
**Goal:** Add comments and TODOs in code and current-task.md for future server integration

### What This Will Do:
- Mark all places in code where server logic should eventually live
- Add clear comments in hooks/components (e.g., useBattalionData, BattleBattalion) for future devs
- Document API endpoints and expected data structures

### TODO/Comments:
- Add `// TODO: Move to server` comments in relevant files
- Document endpoints and data contracts in current-task.md

---

## Batch 6A: Movement Types and Utilities
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

## Implementation Notes

### Node Ownership Arrays:
```typescript
// Initial state
neutralNodes: [3, 4, 5]
userNodes: [0, 1, 2] 
enemyNodes: [6, 7, 8]

// When node 3 is captured by user
neutralNodes: [4, 5]
userNodes: [0, 1, 2, 3]
enemyNodes: [6, 7, 8]
```

### Network Topology:
- Fixed connections defined in `networkConstants.ts`
- All movement must follow these connections
- No direct movement between non-connected nodes

### File Organization:
- Each concept has its own file
- Hooks for React state management
- Utils for pure functions
- Components for UI rendering
- Types for type safety

### Testing Strategy:
- Test each batch before moving to next
- Verify visual appearance
- Check state management
- Validate logic correctness
- Ensure performance

---

## Next Steps
1. Start with **Batch 1A: Core Types and Constants**
2. Test thoroughly before proceeding
3. Iterate on each batch as needed
4. Maintain clean architecture throughout
5. Keep files under 300 lines
6. Document any deviations from plan

This plan provides a clear path to rebuild the battle system with proper architecture and network-constrained movement, with small, testable batches and specific file names.
