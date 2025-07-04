# IMPORTANT RULE: Only do what is necessary for the current batch/step.

# Battle System Rebuild - Detailed Implementation Plan

## Overview
Rebuilding the battle system from scratch with clean architecture, proper node management, and network-constrained movement. Each batch is small and testable with specific file names and clear references.

## Core Architecture Principles
- **Single Source of Truth**: Each concept has one authoritative location
- **File Size Limit**: No file exceeds 300 lines
- **Network-Constrained Movement**: Battalions must follow network lines
- **Clean Separation**: Logic, state, and UI are properly separated
- **Testable Components**: Each piece can be tested independently

## Node Management Strategy
- **Array-Based Ownership**: Use separate arrays for neutral, user, and enemy nodes
- **Dynamic Transfers**: Nodes move between arrays when captured
- **Color Coding**: Blue (user), Red (enemy), Secondary (neutral)
- **Network Topology**: Fixed connections defined in `networkConstants.ts`

---

## Batch 1B: Basic Network Visualization
**Goal**: Create the basic network visualization components

### NEW FILES TO CREATE:
1. **`src/components/battle/BattleNetworkLines.tsx`** (40 lines) - Connection lines component
2. **`src/components/battle/BattleNetworkNode.tsx`** (60 lines) - Individual node component
3. **`src/components/battle/BattleNetworkGrid.tsx`** (80 lines) - Combined network visualization

### FILES TO REFERENCE (READ ONLY):
- `src/components/battle/NetworkLines.tsx` (existing - for reference only)
- `src/components/battle/NetworkNode.tsx` (existing - for reference only)
- `src/components/battle/BattleNetwork.tsx` (existing - for reference only)

### What This Achieves:
- ✅ Static network grid with 9 nodes
- ✅ Network lines connecting nodes
- ✅ Proper positioning and sizing
- ✅ Visual foundation for all future work

### Test Criteria:
- Network renders correctly
- All 9 nodes visible
- All connections drawn
- Proper screen positioning

---

## Batch 1C: Main Battle Screen
**Goal**: Create the main battle screen container

### NEW FILES TO CREATE:
1. **`src/screens/BattleGridScreen.tsx`** (50 lines) - Main battle screen container

### FILES TO REFERENCE (READ ONLY):
- `src/screens/BattleScreen.tsx` (existing - for reference only)
- `src/screens/TurfScreen.tsx` (existing - to see navigation structure)

### What This Achieves:
- ✅ Main battle screen with black background
- ✅ Network visualization integration
- ✅ Proper screen layout and styling

### Test Criteria:
- Screen renders with black background
- Network visualization displays correctly
- No layout issues

---

## Batch 1D: Navigation Integration
**Goal**: Update navigation to use new battle screen

### FILES TO MODIFY:
1. **`src/screens/TurfScreen.tsx`** (update navigation button)

### FILES TO REFERENCE (READ ONLY):
- `src/screens/TurfScreen.tsx` (existing - to see current navigation)

### What This Achieves:
- ✅ Navigation button points to new battle screen
- ✅ Old battle screen is no longer used

### Test Criteria:
- Navigation button works correctly
- New battle screen loads properly

---

## Batch 2A: Node Ownership Types and State
**Goal**: Create node ownership management types and state

### NEW FILES TO CREATE:
1. **`src/types/nodeOwnership.ts`** (30 lines) - Node ownership types
2. **`src/hooks/useNodeOwnership.ts`** (60 lines) - Node ownership React hook

### FILES TO REFERENCE (READ ONLY):
- `src/utils/nodeOwnership.ts` (existing - for reference only)
- `src/hooks/useBattalionRefsAndState.ts` (existing - for reference only)

### What This Achieves:
- ✅ Node ownership type definitions
- ✅ Ownership state management (neutral, user, enemy arrays)
- ✅ Dynamic ownership transfer functions

### Test Criteria:
- Ownership arrays work correctly
- Transfers between arrays function
- State persists properly

---

## Batch 2B: Node Ownership Visualization
**Goal**: Update network nodes to show ownership colors

### FILES TO MODIFY:
1. **`src/components/battle/BattleNetworkNode.tsx`** (update to show ownership colors)

### FILES TO REFERENCE (READ ONLY):
- `src/components/battle/NetworkNode.tsx` (existing - to see current implementation)

### What This Achieves:
- ✅ Nodes display correct colors based on ownership
- ✅ Color coding: Blue (user), Red (enemy), Secondary (neutral)

### Test Criteria:
- Nodes display correct colors
- Color changes when ownership changes

---

## Batch 3A: Battle State Types and Management
**Goal**: Create battle state management system

### NEW FILES TO CREATE:
1. **`src/types/battleState.ts`** (30 lines) - Battle state types
2. **`src/hooks/useBattleState.ts`** (80 lines) - Battle state management hook

### FILES TO REFERENCE (READ ONLY):
- `src/hooks/useBattleStateMachine.ts` (existing - for reference only)
- `src/hooks/useBattleInitialization.ts` (existing - for reference only)

### What This Achieves:
- ✅ Battle phases (initializing, countdown, active, complete)
- ✅ 3-second start countdown
- ✅ 20-second battle timer
- ✅ State transitions

### Test Criteria:
- State transitions work correctly
- Timer counts down properly
- Countdown displays correctly

---

## Batch 3B: Battle Overlay Components
**Goal**: Create countdown and timer overlay components

### NEW FILES TO CREATE:
1. **`src/components/battle/BattleCountdownOverlay.tsx`** (70 lines) - Countdown overlay
2. **`src/components/battle/BattleTimerDisplay.tsx`** (50 lines) - Battle timer display

### FILES TO REFERENCE (READ ONLY):
- `src/components/battle/CountdownOverlay.tsx` (existing - for reference only)
- `src/components/battle/BattleHeader.tsx` (existing - for reference only)

### What This Achieves:
- ✅ Visual countdown overlay
- ✅ Battle timer display
- ✅ Proper overlay positioning

### Test Criteria:
- Countdown displays correctly
- Timer counts down properly
- Overlay renders correctly

---

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
