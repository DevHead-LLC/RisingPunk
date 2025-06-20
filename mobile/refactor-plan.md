# Battle System Code Consolidation Plan

## AI Directive
**GOAL**: Eliminate all code duplication and conflicts in the battle system while preserving 100% functionality. Focus on consolidation, not logic changes. Each phase must be manually tested before proceeding. Prioritize eliminating conflicts that cause errors.

## Current State Analysis

### Major Code Duplication Issues Identified (21 Areas)

1. **Battalion Movement & Attack Logic** (1000+ lines duplicated)
   - `useBattleMovementAndAttacks.ts` (481 lines) 
   - `useBattleMovement.ts` (516 lines)
   - Both handle movement, targeting, attacks, and state management

2. **Battalion Visualization Components** (450+ lines duplicated)
   - `AnimatedBattalion.tsx` (311 lines)
   - `BattalionVisual.tsx` (136 lines)
   - Both render health bars, type indicators, mark indicators

3. **Network & Node Rendering** (200+ lines duplicated)
   - `BattleNetwork.tsx` + `NetworkNode.tsx`
   - `BattleUI.tsx` + `NodeVisual.tsx`
   - Both handle network connections and node states

4. **Battle State Management** (150+ lines duplicated)
   - `battleSlice.ts` (Redux state)
   - `BattleScreen.tsx` (Local state)
   - Both track battalions, nodes, health, positions

5. **Utility Functions** (100+ lines duplicated)
   - Health calculations in multiple components
   - Range calculations in multiple components
   - Network connections defined in multiple files

6. **Battle Hook Fragmentation** (500+ lines across 8 hooks)
   - `useBattleCombat.ts` (90 lines) - Combat calculations and damage
   - `useBattleStateMachine.ts` (95 lines) - Phase transitions and state management
   - `useBattleInitialization.ts` (109 lines) - Battle setup and initialization
   - `useBattleCoordinator.ts` (50 lines) - System coordination
   - `useBattleStateVisualization.ts` (61 lines) - Debug and validation
   - `useBattleControl.ts` (100 lines) - Node control logic
   - `useBattleAnimations.ts` (68 lines) - Animation management
   - **Total**: 8 separate hooks with overlapping functionality

7. **Network Connection Constants** (50+ lines duplicated)
   - `NETWORK_CONNECTIONS` defined in 4+ files:
     - `useBattleMovement.ts` (lines 7-12)
     - `useBattleControl.ts` (lines 13-18)
     - `BattleScreen.tsx` (lines 35-42)
     - `NetworkLines.tsx` (lines 7-9)

8. **Damage Calculation Logic** (100+ lines duplicated)
   - `calculateDamage` in `useBattleCombat.ts` (lines 35-38)
   - `calculateTotalDamage` in `battleUtils.ts` (lines 40-44)
   - `calculateDamage` in `useBattleMovementAndAttacks.ts` (lines 289-293)
   - Health calculations in multiple components

9. **Battalion Position Animation** (150+ lines duplicated)
   - `AnimatedBattalion.tsx` uses `translateX/translateY` with `position.x/y`
   - `BattalionVisual.tsx` uses same pattern
   - `RangeIndicator.tsx` uses same pattern
   - All components handle battalion positioning differently

10. **Attack Animation Triggers** (100+ lines duplicated)
    - `triggerAttackAnimation` and `triggerDamageAnimation` in multiple components
    - `AnimatedBattalion.tsx` has full implementation
    - `NetworkNode.tsx` has similar implementation
    - Ref patterns repeated across components

11. **Movement Animation Logic** (200+ lines duplicated)
    - `Animated.timing(battalion.position, ...)` in both movement hooks
    - `useBattleMovement.ts` lines 278-290
    - `useBattleMovementAndAttacks.ts` lines 241-260
    - Same animation patterns with different implementations

12. **Animation System Fragmentation** (200+ lines duplicated)
    - `useBattleAnimations.ts` (68 lines)
    - `BattleAnimationSystem.tsx` (64 lines)
    - `useBattleStateMachine.ts` (95 lines)
    - All handle animation timing and transitions

13. **Network Pathfinding Logic** (150+ lines duplicated)
    - `getConnectedNodes` in `useBattleControl.ts` (lines 30-35)
    - `getConnectedNodes` in `useBattleMovement.ts` (lines 107-112)
    - `getAvailableNodes` in `battleUtils.ts` (lines 55-65)
    - All implement similar node connection logic with different approaches

14. **Network Topology Constants** (100+ lines duplicated)
    - `NETWORK_CONNECTIONS` defined in **5 different files**:
      - `NetworkLines.tsx` (lines 7-10)
      - `BattleNetwork.tsx` (lines 18-25)
      - `useBattleControl.ts` (lines 13-20)
      - `useBattleMovement.ts` (lines 7-14)
      - `BattleScreen.tsx` (lines 37-44)
    - Same network topology repeated everywhere with slight variations

15. **Data Stream Animation** (75+ lines duplicated)
    - `DataStream.tsx` (73 lines) - Animated particles moving along network lines
    - `NetworkLines.tsx` renders data streams with active/inactive states
    - Animation logic for network data flow duplicated in multiple places

16. **Network Rendering Components** (200+ lines duplicated)
    - `BattleNetwork.tsx` + `NetworkNode.tsx` + `NetworkLines.tsx`
    - `BattleUI.tsx` + `NodeVisual.tsx`
    - Both render network connections and nodes with different implementations

17. **Battalion Targeting Logic** (300+ lines duplicated)
    - `findAvailableTargets` in `useBattleMovement.ts` (lines 122-195)
    - `findAvailableTargets` in `useBattleMovementAndAttacks.ts` (imported from useBattleMovement)
    - `selectTargetNode` in `useBattleMovementAndAttacks.ts` (lines 164-180)
    - `findNewTarget` in both movement hooks with different implementations
    - All implement similar target selection logic with different approaches

18. **Attack Range Calculations** (150+ lines duplicated)
    - `calculateAttackRange` in `battleUtils.ts` (lines 32-39)
    - `checkRangeIntersection` in `battleCalculator.ts` (lines 66-76)
    - Range calculations in `AnimatedBattalion.tsx` (lines 40-41)
    - Range calculations in `RangeIndicator.tsx` (lines 20-22)
    - Range checks in both movement hooks with different implementations

19. **Attack Interval Management** (200+ lines duplicated)
    - `attackIntervals` ref in `useBattleState.ts` (lines 25-26)
    - `attackIntervals` ref in `useBattleMovementAndAttacks.ts` (lines 81-82)
    - `attackIntervals` ref in `useBattleMovement.ts` (lines 42-43)
    - `attackIntervals` ref in `useBattleCombat.ts` (lines 16-17)
    - All manage attack timing with different implementations

20. **Attack Setup Functions** (250+ lines duplicated)
    - `setupAttacks` in `useBattleMovementAndAttacks.ts` (lines 324-382)
    - `setupAttacks` in `useBattleMovement.ts` (lines 350-479)
    - `handleBattalionAttack` in `useBattleCombat.ts` (lines 45-83)
    - All set up attack intervals and damage application with different logic

21. **Retargeting Logic** (150+ lines duplicated)
    - `findNewTarget` in `useBattleMovementAndAttacks.ts` (lines 384-476)
    - `findNewTarget` in `useBattleMovement.ts` (lines 480-513)
    - Retargeting cooldowns and logic in both hooks
    - Node capture memory and strategic target selection duplicated

22. **Health Management Functions** (100+ lines duplicated)
    - `updateBattalionHealth` in `useBattleMovement.ts` (lines 77-95)
    - `handleBattalionDamage` in `useBattleMovementAndAttacks.ts` (lines 287-324)
    - Health calculations in `BattleScreen.tsx` (lines 206-209)
    - Health calculations in `useBattleInitialization.ts` (lines 33-98)
    - All manage battalion health with different approaches

23. **BOT_CATEGORIES Access Patterns** (75+ lines duplicated)
    - Direct `BOT_CATEGORIES[type].stats` access in 6+ files
    - `AnimatedBattalion.tsx` (line 43)
    - `BattleUnits.tsx` (lines 62, 83)
    - `BattleScreen.tsx` (lines 206, 209)
    - Multiple utility functions accessing same data

## Consolidation Strategy

### Phase 1: Extract Network Constants (Priority: HIGH - Low Risk)
**AI Directive**: Extract all network topology constants to eliminate duplication and potential conflicts.

**Files to Create/Modify**:
- **Create**: `src/utils/networkConstants.ts`
- **Modify**: All files with `NETWORK_CONNECTIONS`

**Changes**:
1. Create `networkConstants.ts` with single `NETWORK_CONNECTIONS` definition
2. Update all 5 files to import from `networkConstants.ts`
3. Remove duplicate definitions

**Files to Update**:
- `NetworkLines.tsx` (lines 7-10)
- `BattleNetwork.tsx` (lines 18-25)
- `useBattleControl.ts` (lines 13-20)
- `useBattleMovement.ts` (lines 7-14)
- `BattleScreen.tsx` (lines 37-44)

**Expected Reduction**: 50-75 lines
**Risk**: LOW (constants only)
**Manual Testing**: Verify network connections render correctly

### Phase 2: Consolidate Health Management (Priority: HIGH - Medium Risk)
**AI Directive**: Consolidate all health calculation and management functions to eliminate conflicts.

**Files to Create/Modify**:
- **Create**: `src/utils/healthUtils.ts`
- **Modify**: All files with health calculations

**Changes**:
1. Create `healthUtils.ts` with consolidated health functions
2. Move `updateBattalionHealth` and `handleBattalionDamage` to utilities
3. Create `calculateBattalionHealth` function
4. Update all components to use centralized health utilities

**Functions to Consolidate**:
- `updateBattalionHealth` (useBattleMovement.ts:77-95)
- `handleBattalionDamage` (useBattleMovementAndAttacks.ts:287-324)
- Health calculations in BattleScreen.tsx (lines 206-209)
- Health calculations in useBattleInitialization.ts (lines 33-98)

**Expected Reduction**: 100-150 lines
**Risk**: MEDIUM (health management is critical)
**Manual Testing**: Verify battalion health updates correctly, damage calculations accurate

### Phase 3: Consolidate Battle Logic Hooks (Priority: HIGH - High Risk)
**AI Directive**: Merge the two main battle movement hooks to eliminate the largest source of duplication and conflicts.

**Files to Modify**:
- `useBattleMovementAndAttacks.ts` (481 lines) - KEEP
- `useBattleMovement.ts` (516 lines) - MERGE INTO ABOVE

**Changes**:
1. Keep `useBattleMovementAndAttacks.ts` as primary hook
2. Extract unique functions from `useBattleMovement.ts`
3. Merge `findAvailableTargets`, `moveBattalionAlongPath`, `setupAttacks`
4. Remove `useBattleMovement.ts` entirely
5. Update all imports to use consolidated hook

**Functions to Merge**:
- `findAvailableTargets` (both hooks)
- `moveBattalionAlongPath` (both hooks)
- `setupAttacks` (both hooks)
- `findNewTarget` (both hooks)
- Attack interval management (both hooks)

**Expected Reduction**: 400-500 lines
**Risk**: HIGH (core battle functionality)
**Manual Testing**: Verify all movement, targeting, attacks work correctly

### Phase 4: Consolidate Battalion Components (Priority: HIGH - Low Risk)
**AI Directive**: Merge battalion visualization components to eliminate UI duplication.

**Files to Modify**:
- `AnimatedBattalion.tsx` (311 lines) - KEEP
- `BattalionVisual.tsx` (136 lines) - REMOVE

**Changes**:
1. Keep `AnimatedBattalion.tsx` as primary component
2. Extract shared styling to utilities if needed
3. Remove `BattalionVisual.tsx` entirely
4. Update all imports to use `AnimatedBattalion`

**Expected Reduction**: 200-250 lines
**Risk**: LOW (UI components only)
**Manual Testing**: Verify battalion appearance and animations

### Phase 5: Consolidate Attack Functions (Priority: MEDIUM - Medium Risk)
**AI Directive**: Consolidate all attack setup and interval management functions.

**Files to Modify**:
- `useBattleCombat.ts` (90 lines) - MERGE INTO MAIN HOOK
- `useBattleState.ts` (93 lines) - EXTRACT ATTACK LOGIC

**Changes**:
1. Move `handleBattalionAttack` from `useBattleCombat.ts` to main battle hook
2. Extract attack interval management from `useBattleState.ts`
3. Consolidate all attack setup logic
4. Remove duplicate attack functions

**Expected Reduction**: 150-200 lines
**Risk**: MEDIUM (attack logic is critical)
**Manual Testing**: Verify attack timing and damage application

### Phase 6: Consolidate Network Rendering (Priority: MEDIUM - Low Risk)
**AI Directive**: Choose one network rendering approach and remove duplicates.

**Files to Modify**:
- `BattleNetwork.tsx` + `NetworkNode.tsx` + `NetworkLines.tsx` - KEEP
- `BattleUI.tsx` + `NodeVisual.tsx` - REMOVE NETWORK LOGIC

**Changes**:
1. Keep `BattleNetwork.tsx` as primary network component
2. Remove network rendering logic from `BattleUI.tsx`
3. Remove `NodeVisual.tsx` (redundant with `NetworkNode.tsx`)
4. Update `BattleScreen.tsx` to use only `BattleNetwork`

**Expected Reduction**: 100-150 lines
**Risk**: LOW (UI components only)
**Manual Testing**: Verify network appearance and node interactions

### Phase 7: Consolidate Animation Systems (Priority: MEDIUM - Low Risk)
**AI Directive**: Merge animation systems to eliminate fragmentation.

**Files to Modify**:
- `useBattleAnimations.ts` (68 lines) - KEEP
- `BattleAnimationSystem.tsx` (64 lines) - REMOVE
- `useBattleStateMachine.ts` (95 lines) - EXTRACT ANIMATION LOGIC

**Changes**:
1. Keep `useBattleAnimations.ts` as primary animation hook
2. Remove `BattleAnimationSystem.tsx` (appears unused)
3. Extract animation logic from `useBattleStateMachine.ts`
4. Consolidate all animation timing

**Expected Reduction**: 150-200 lines
**Risk**: LOW (animation logic)
**Manual Testing**: Verify all animations work correctly

### Phase 8: Consolidate Remaining Battle Hooks (Priority: LOW - Medium Risk)
**AI Directive**: Merge remaining scattered battle hooks into logical groups.

**Files to Modify**:
- `useBattleInitialization.ts` (109 lines) - MERGE INTO BATTLE SCREEN
- `useBattleControl.ts` (100 lines) - MERGE INTO MAIN HOOK
- `useBattleCoordinator.ts` (50 lines) - MERGE INTO MAIN HOOK
- `useBattleStateVisualization.ts` (61 lines) - REMOVE (debug only)

**Changes**:
1. Move initialization logic to `BattleScreen.tsx`
2. Merge control logic into main battle hook
3. Merge coordination logic into main battle hook
4. Remove debug/visualization hook

**Expected Reduction**: 200-300 lines
**Risk**: MEDIUM (multiple hook consolidation)
**Manual Testing**: Verify all battle systems work correctly

### Phase 9: Extract BOT_CATEGORIES Access (Priority: LOW - Low Risk)
**AI Directive**: Create centralized access patterns for BOT_CATEGORIES to eliminate scattered access.

**Files to Create/Modify**:
- **Create**: `src/utils/botStatsUtils.ts`
- **Modify**: All files with direct BOT_CATEGORIES access

**Changes**:
1. Create utility functions for accessing bot stats
2. Replace direct `BOT_CATEGORIES[type].stats` access
3. Centralize all bot stat calculations

**Expected Reduction**: 75-100 lines
**Risk**: LOW (utility functions)
**Manual Testing**: Verify all bot stats calculations remain accurate

## Implementation Order & Testing Strategy

### Phase Order (Risk-Based):
1. **Phase 1** - Network Constants (LOW RISK)
2. **Phase 2** - Health Management (MEDIUM RISK)
3. **Phase 3** - Battle Logic Hooks (HIGH RISK)
4. **Phase 4** - Battalion Components (LOW RISK)
5. **Phase 5** - Attack Functions (MEDIUM RISK)
6. **Phase 6** - Network Rendering (LOW RISK)
7. **Phase 7** - Animation Systems (LOW RISK)
8. **Phase 8** - Remaining Hooks (MEDIUM RISK)
9. **Phase 9** - BOT_CATEGORIES Access (LOW RISK)

### Manual Testing After Each Phase:
1. **Start battle** and verify all battalions move correctly
2. **Check targeting** - ensure strategic behavior maintained
3. **Verify attacks** - timing and damage calculations correct
4. **Test animations** - battalion and node animations work
5. **Check network** - nodes and connections render properly
6. **Verify state** - all state updates work correctly
7. **Test health** - battalion health updates correctly
8. **Check intervals** - attack intervals work properly

### Expected Total Reduction: 1,425-1,925 lines (35-45% reduction)

### Success Criteria:
- **Zero functional regression** - identical user experience
- **Reduced bundle size** - fewer files and lines
- **Improved maintainability** - single source of truth for each concept
- **Eliminated conflicts** - no competing implementations
- **Better performance** - reduced re-renders and calculations

## Manual Testing Strategy

### After Each Phase:
1. **Start battle** and verify all battalions move correctly
2. **Check targeting** - ensure strategic behavior maintained
3. **Verify attacks** - timing and damage calculations correct
4. **Test animations** - battalion and node animations work
5. **Check network** - nodes and connections render properly
6. **Verify state** - all state updates work correctly

### Specific Test Cases:
- User and enemy battalions move to appropriate targets
- Attack intervals work correctly for both nodes and battalions
- Node capture triggers new targeting
- Battalion destruction handled properly
- Health bars and animations display correctly
- Network connections and node states update properly
- Battle phase transitions work smoothly
- All battle hooks coordinate correctly

## Risk Mitigation

1. **Incremental Changes**: Each phase is self-contained
2. **Behavior Preservation**: Focus on consolidation, not logic changes
3. **Manual Testing**: Verify each phase before proceeding
4. **Rollback Plan**: Keep original files as backup until complete
5. **Component Isolation**: Test each component independently

## Phase 1 Details: Battle Logic Consolidation

### Files to Modify:
- `mobile/src/hooks/useBattleMovementAndAttacks.ts`
- `mobile/src/hooks/useBattleMovement.ts`

### Changes:
1. Analyze both hooks to identify unique functionality
2. Merge `useBattleMovement.ts` functions into `useBattleMovementAndAttacks.ts`
3. Remove duplicate movement, targeting, and attack logic
4. Consolidate all battle state management
5. Update all imports and references

### Expected Outcome:
- Single battle logic hook with all functionality
- Eliminated duplicate movement and attack code
- Cleaner, more maintainable battle system
- Reduced complexity and potential bugs

### Manual Testing Instructions:
1. Start the app
2. Navigate to battle screen
3. Start a battle
4. Verify all battalions move correctly
5. Verify attacks work for both nodes and battalions
6. Check that targeting behavior is maintained
7. Verify no console errors
8. Test that all animations trigger correctly

---

**Ready to begin Phase 1 implementation** 