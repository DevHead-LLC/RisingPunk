====================================
AI MUST READ SECTION BELOW! START.
====================================
# IMPORTANT RULE: Only do what is necessary for the current batch/step && DO NOT USE legacy files - create new ones with unique names.

# CRITICAL AI DIRECTIVES - READ BEFORE IMPLEMENTING ANY BATCH

## Intentions Document Requirements
**MANDATORY**: Before implementing any batch, AI must read and understand the relevant intentions documents:

- **For ALL battle mechanics**: Read [battle-intentions.md](./battle-intentions.md) - Core battle flow, rules, and victory conditions
- **For node-related work**: Read [node-behaviors.md](./node-behaviors.md) - Node types, capture mechanics, advantages, network topology
- **For battalion/bot work**: Read [battalion-bot-behaviors.md](./battalion-bot-behaviors.md) - Bot types, combat mechanics, movement, targeting

## Strict Implementation Rules
- **NO INVENTION**: Do not create, imagine, or add features not specified in intentions documents
- **NO GAPS**: If anything falls outside intentions documents, STOP and ask clarifying questions
- **NO ROGUE LOGIC**: Every piece of logic must align with documented intentions or direct user specifications
- **DISCUSS FIRST**: Any deviation from intentions requires explicit user approval before implementation

## Implementation Process
1. Read relevant intentions documents for the batch
2. Implement ONLY what is specified in the batch description
3. If batch description conflicts with intentions documents, ask for clarification
4. If batch requires logic not covered in intentions, ask for specification
5. Never assume or fill in gaps - ask questions instead

## Conflict Resolution
**INTENTIONS DOCUMENTS ALWAYS WIN**: If any batch description conflicts with the intentions documents, the intentions documents take precedence. The batch description must be updated to align with intentions before implementation proceeds.

# Battle System Rebuild - Detailed Implementation Plan

## Overview
Rebuilding the battle system from scratch with clean architecture, proper node management, and network-constrained movement. Each batch is small and testable with specific file names and clear references.

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







## Batch 4A: Deployment Zone Types and Positions
**Goal**: Create deployment zone system foundation

### NEW FILES TO CREATE:
1. **`src/types/deployment.ts`** (30 lines) - Deployment zone types
2. **`src/utils/deploymentPositions.ts`** (40 lines) - Deployment position calculations

### FILES TO REFERENCE (READ ONLY):
- `src/components/battle/BattalionDeploymentZone.tsx` (existing - for reference only)
- `src/utils/battleConstants.ts` (existing - for reference only)

### What This Achieves:
- ✅ Deployment zone type definitions
- ✅ Position calculations for user/enemy zones
- ✅ Zone sizing and positioning logic

### Test Criteria:
- Position calculations are accurate
- Zones are properly sized
- Types compile correctly

---

## Batch 4B: Deployment Zone Visualization
**Goal**: Create visual deployment zone components

### NEW FILES TO CREATE:
1. **`src/components/battle/BattleDeploymentZone.tsx`** (60 lines) - Deployment zone component

### FILES TO REFERENCE (READ ONLY):
- `src/components/battle/BattalionDeploymentZone.tsx` (existing - for reference only)

### What This Achieves:
- ✅ Visual deployment zones
- ✅ Proper positioning for user/enemy sides
- ✅ Zone styling and indicators

### Test Criteria:
- Zones render correctly
- Positioning is accurate
- Styling matches design

---

## Batch 5A: Battalion Types and Data
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
