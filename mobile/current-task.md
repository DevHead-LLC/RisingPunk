# Movement Function Overview (useMovement.ts)

**File:** mobile/src/hooks/useMovement.ts

---

## Function Index

- [calculateMovementDistance](#calculatemovementdistance)
- [executeBattalionMovement](#executebattalionmovement)
- [handlePostMovementActions](#handlepostmovementactions)
- [handleMovementValidation](#handlemovementvalidation)
- [handleMovementDecision](#handlemovementdecision)
- [handleMovementExecution](#handlemovementexecution)
- [validateNetworkLineMovement](#validatenetworklinemovement)

---

## Function Summaries

### [calculateMovementDistance](mobile/src/hooks/useMovement.ts)
- **Purpose:** Calculates how far and in what direction a battalion should move to reach its target, considering attack range and type of target (node or battalion).

### [executeBattalionMovement](mobile/src/hooks/useMovement.ts)
- **Purpose:** Animates the battalion's movement to the calculated position. Handles timing, speed, and sets up monitoring for retargeting if the target changes during movement.

### [handlePostMovementActions](mobile/src/hooks/useMovement.ts)
- **Purpose:** After movement completes, determines what to do next (e.g., start attacking, continue along a path, or retarget if the target is gone).

### [handleMovementValidation](mobile/src/hooks/useMovement.ts)
- **Purpose:** Checks if the battalion's current target is still valid (alive, in range, etc.) and whether the battalion should continue moving or start attacking.

### [handleMovementDecision](mobile/src/hooks/useMovement.ts)
- **Purpose:** Decides if the battalion should attack immediately or move closer to the target, based on current distance and range.

### [handleMovementExecution](mobile/src/hooks/useMovement.ts)
- **Purpose:** Orchestrates the entire movement process: validates, decides, animates, and triggers post-movement actions for a battalion.

### [validateNetworkLineMovement](mobile/src/hooks/useMovement.ts)
- **Purpose:** Checks if a battalion's movement path stays on valid network lines, and provides debug info about the path's validity.

---

**All functions are defined in:**
`mobile/src/hooks/useMovement.ts`

---

# useMovement.ts Refactoring Plan

## Overview
Consolidate repeated logic in useMovement.ts into single-purpose utilities to reduce repetition, improve maintainability, and increase efficiency.

## Phase 1: Target Validation & Retargeting Utility
**Goal:** Extract repeated target validation and retargeting logic into a single utility.

### Files to Create/Modify:
- `mobile/src/utils/targetValidation.ts` (NEW)
- `mobile/src/hooks/useMovement.ts` (MODIFY)

### Changes:
1. Create `validateAndRetarget()` function that:
   - Validates if target is still valid
   - Finds new targets if current is invalid
   - Moves to new target if available
   - Returns validation result

2. Replace repeated logic in:
   - `handleMovementValidation()`
   - `handlePostMovementActions()`

### Test Points:
- Battalion retargets when current target becomes invalid
- Battalion continues with valid target
- No infinite retargeting loops

---

## Phase 2: Movement Distance Calculation Optimization
**Goal:** Prevent redundant movement distance calculations and centralize movement decision logic.

### Files to Modify:
- `mobile/src/hooks/useMovement.ts`

### Changes:
1. Modify `handleMovementDecision()` to return complete movement data
2. Update `handleMovementExecution()` to use pre-calculated values
3. Remove redundant `calculateMovementDistance()` calls

### Test Points:
- Movement calculations are accurate
- No performance regression
- All movement scenarios still work

---

## Phase 3: Attack Setup Consolidation
**Goal:** Extract repeated attack setup logic into a single utility.

### Files to Create/Modify:
- `mobile/src/utils/attackSetup.ts` (NEW)
- `mobile/src/hooks/useMovement.ts` (MODIFY)

### Changes:
1. Create `setupAttackIfInRange()` function that:
   - Checks if battalion is in range
   - Sets up attacks if conditions are met
   - Handles both node and battalion targets

2. Replace repeated logic in:
   - `handlePostMovementActions()`
   - `handleMovementExecution()`

### Test Points:
- Attacks start when battalion reaches range
- No duplicate attack setups
- Attack timing is correct

---

## Phase 4: Path Following Utility
**Goal:** Extract path progression logic into a dedicated utility.

### Files to Create/Modify:
- `mobile/src/utils/pathFollowing.ts` (NEW)
- `mobile/src/hooks/useMovement.ts` (MODIFY)

### Changes:
1. Create `continuePathIfNeeded()` function that:
   - Checks if battalion has remaining path
   - Updates battalion's current node
   - Moves to next node in path
   - Clears path when final target reached

2. Replace logic in `handlePostMovementActions()`

### Test Points:
- Multi-node paths are followed correctly
- Path state is updated properly
- Final target detection works

---

## Phase 5: Movement Wrapper Consolidation ✅
**Goal:** Create a unified movement wrapper that handles cleanup and monitoring.

### Files to Create/Modify:
- `mobile/src/utils/movementWrapper.ts` (NEW) ✅
- `mobile/src/hooks/useMovement.ts` (MODIFY) ✅

### Changes:
1. Create `executeMovementWithCleanup()` function that:
   - Handles battalion cleanup ✅
   - Sets up movement monitoring ✅
   - Executes movement animation ✅
   - Manages completion callbacks ✅

2. Simplify `executeBattalionMovement()` ✅

### Test Points:
- Cleanup happens correctly ✅
- Monitoring works during movement ✅
- No memory leaks ✅

---

## Phase 6: Integration & Testing
**Goal:** Ensure all utilities work together and comprehensive testing.

### Files to Modify:
- `mobile/src/hooks/useMovement.ts`
- All test files

### Changes:
1. Update all function calls to use new utilities
2. Add integration tests
3. Verify no functionality is lost

### Test Points:
- All existing functionality preserved
- Performance improved
- Code is more maintainable

---

## Testing Strategy
Each phase should be tested independently:
1. Unit tests for new utilities
2. Integration tests for modified functions
3. Manual testing of battle scenarios
4. Performance comparison

## Success Criteria
- Reduced code duplication
- Improved maintainability
- No performance regression
- All existing functionality preserved
- Clear separation of concerns
