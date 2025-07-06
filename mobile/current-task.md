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
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create battalion data management system

### RELEVANT EXISTING FILES:
- **battleTypes.ts**: [current-battlegrid-connections.md#types](#types) - Already has `BattalionType` enum and `Battalion` interface
- **useBattleNodes.ts**: [current-battlegrid-connections.md#hooks](#hooks) - Provides node positioning for battalion placement

### BOT CATEGORIES TO ADD:
- **Source**: [battalion-bot-behaviors.md#bot-categories](#bot-categories) (lines 48-95)
- **Location**: Add to existing `src/types/battleTypes.ts` file
- **Content**: Guardian, Breacher, Phreak stats, advantages, and lore

### What This Achieves:
- ✅ Bot categories and stats added to existing battleTypes.ts
- ✅ Battalion data management using existing Battalion interface
- ✅ Health calculation based on bot type stats

### Test Criteria:
- Bot categories are available in battleTypes.ts
- Battalion data is managed correctly
- Health calculations use correct bot stats

---

## Batch 5B: Battalion Visualization
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
**Goal**: Create static battalion visualization components

### RELEVANT EXISTING FILES:
- **BattleNetworkGrid.tsx**: [current-battlegrid-connections.md#components](#components) - Will render battalions on nodes
- **battleTypes.ts**: [current-battlegrid-connections.md#types](#types) - Contains BattalionType enum and Battalion interface (updated in 5A)

### BATTALION VISUALIZATION REQUIREMENTS:
- **Source**: [battalion-bot-behaviors.md#battalion-structure](#battalion-structure) (lines 1-20)
- **Integration**: Add battalion rendering to existing BattleNetworkGrid.tsx
- **Requirements**: Shapes, quantity display, health bars, bot type indicators

### What This Achieves:
- ✅ Battalion visualization added to existing BattleNetworkGrid.tsx
- ✅ Bot type indicators using stats from battleTypes.ts (added in 5A)
- ✅ Health bars showing current/max health

### Test Criteria:
- Battalions render correctly on nodes in BattleNetworkGrid
- Bot types are distinguishable by shape/color
- Health bars show correctly

---

## Batch 5C: Server-Driven Battalion Initialization and Stats
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
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
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
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
REVIEW AI MUST READ SECTION at the top of this file before you move forward with these batch changes!
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