# Legacy Battle System Removal Plan

## Overview
This document outlines the safe removal of the legacy battle system (BattleScreen.tsx and its dependencies) while preserving the new BattleGridScreen system.

## Important Discovery
**Good News!** The legacy BattleScreen is already disconnected from the navigation flow:
- `TurfScreen.tsx` navigates to `BattleGridScreen` (new system), NOT `BattleScreen` (legacy)
- `BattlePreparationScreen` → `TurfScreen` → `BattleGridScreen`
- This means the legacy battle system is already isolated and can be removed more safely

## Visual Dependency Map
The diagram in this document shows:
- 🔴 **Red**: Legacy components to be removed
- 🟢 **Green**: New components to be preserved 
- 🟡 **Yellow**: Shared dependencies requiring careful handling

## System Architecture

### Legacy Battle System (To Remove)
- **Entry Point**: `BattleScreen.tsx`
- **Core Purpose**: Original battle implementation with animations, combat, and targeting

### New Battle Grid System (To Preserve)
- **Entry Point**: `BattleGridScreen.tsx`  
- **Core Purpose**: New network visualization system

### Shared Dependencies (Handle Carefully)
1. **Types**: `src/types/battle.ts` - Contains shared type definitions
2. **Theme**: `src/styles/theme.ts` - COLORS constant used by both systems

## Complete File Inventory

**Legend:**
- ✅ = Already deleted (accomplished)
- ✅⚠️ = Moved from “to delete” to “to keep” (required by new system, do NOT delete)

### Components to Delete (`src/components/battle/`)
- ✅ AnimatedBattalion.tsx
- ✅ BattleHeader.tsx
- ✅ BattleNetwork.tsx
- ✅ BattleOverlays.tsx
- ✅ BattleResultsOverlay.tsx
- ✅ BattleUnits.tsx
- ✅ CountdownOverlay.tsx
- ✅ DataStream.tsx
- ✅ NetworkLines.tsx
- ✅ NetworkNode.tsx
- ✅ BattalionDeploymentZone.tsx
- ✅ (all other legacy-only files not required by the new system)

### Components to Keep (`src/components/battle/` and new system dirs)
- ✅⚠️ BattlePreparationScreen.tsx
- ✅⚠️ BattleGridScreen.tsx
- ✅⚠️ BattalionSlot.tsx
- ✅⚠️ CircleSlot.tsx
- ✅⚠️ BattalionBotSelector/ (directory)
- ✅ BattleNetworkGrid.tsx
- ✅ BattleOverlayManager.tsx
- ✅ BattleTimerDisplay.tsx
- ✅ BattleCountdownOverlay.tsx
- ✅ (any other file imported by the above)

**Result:**
- All legacy-only files are gone (accomplished).
- All new system files and their dependencies are intact and preserved (accomplished).

### Hooks to Delete (`src/hooks/`)
- ❌ `useBattleCoordination.ts` - Legacy battle coordination
- ❌ `useBattleStateMachine.ts` - Legacy state machine
- ❌ `useBattleInitialization.ts` - Legacy initialization
- ❌ `useCombat.ts` - Legacy combat logic
- ❌ `useMovement.ts` - Legacy movement logic
- ❌ `useTargeting.ts` - Legacy targeting logic
- ❌ `useMovingTargetHandling.ts` - Legacy target handling
- ❌ `usePathFollowing.ts` - Legacy path following
- ❌ `useBattalionRefsAndState.ts` - Legacy battalion refs

### Hooks to Keep (`src/hooks/`)
- ✅ `useInitialBattleNodes.ts` - New node initialization (used by BattleGridScreen)
- ✅ `useBattleNetworkConnections.ts` - New network connections (used by BattleGridScreen)

### Utilities to Delete (`src/utils/`)
- ❌ `attackSetup.ts` - Legacy attack setup
- ❌ `battleCalculator.ts` - Legacy battle calculations
- ❌ `battleUtils.ts` - Legacy battle utilities
- ❌ `healthUtils.ts` - Legacy health management
- ❌ `movementMonitoring.ts` - Legacy movement monitoring
- ❌ `movementUtils.ts` - Legacy movement utilities
- ❌ `movementWrapper.ts` - Legacy movement wrapper
- ❌ `movingTargetHandler.ts` - Legacy target handler
- ❌ `nodeOwnership.ts` - Legacy node ownership system
- ❌ `pathFollowing.ts` - Legacy path following utilities
- ❌ `targetValidation.ts` - Legacy target validation

### Utilities to Keep/Review (`src/utils/`)
- ⚠️ `battleConstants.ts` - May contain shared constants (needs review)
- ⚠️ `networkConstants.ts` - May contain shared constants (needs review)
- ⚠️ `pathfinding.ts` - May be used by new system (needs review)

### Screens to Delete
- ❌ `src/screens/BattleScreen.tsx` - Legacy battle screen (NOT currently used in navigation!)
- ⚠️ `src/screens/BattlePreparationScreen.tsx` - Consider if this should be removed or updated

### Tests to Delete
All test files that test the legacy components, hooks, and utilities listed above.

### Redux State to Delete
- ❌ `src/store/slices/battleSlice.ts` - Legacy battle state management
- ⚠️ Update `src/store/index.ts` - Remove battleSlice import and reducer

## Shared Dependencies Analysis

### 1. Types File (`src/types/battle.ts`)
**Current Content**:
- `Path` type
- `BattalionType` enum
- `BattalionPosition` interface
- `BattleTarget` type
- `BattleNode` type

**Action Required**: 
- Check if BattleGridScreen uses any of these types
- If not, the entire file can be deleted
- If yes, keep only the types used by BattleGridScreen

### 2. Theme File (`src/styles/theme.ts`)
**Usage**:
- BattleScreen uses `COLORS.background`
- BattleGridScreen doesn't import it (uses inline styles)

**Action Required**: Keep this file as it's likely used elsewhere in the app

## Step-by-Step Removal Process

### Phase 1: Preparation
- ✅ You created a backup branch and restored the repo as needed.
- ✅ Clarified the distinction between legacy and new system files.
- ✅ Updated this plan to explicitly protect all new system dependencies (BattlePreparationScreen.tsx, BattleGridScreen.tsx, and their imports).

### Phase 2: Remove Screen Reference
- ✅ Searched for all references to `BattleScreen.tsx`.
- ✅ Confirmed it is not imported or navigated to anywhere in the app (only documentation/comments reference it now).

### Phase 3: Remove Test Files
- ✅ Searched for and reviewed all test files.
- ✅ Confirmed there are no test files for legacy battle components/hooks/utilities; all remaining tests are for the new system.

### Phase 4: Remove Components (Order Matters)
- ✅ Attempted to delete all files listed as legacy in the plan.
- ✅ Only files not required by the new system were actually deleted.
- ✅ Any file that could not be deleted is still in use by the new system and must be kept.
- ✅ The plan is now explicit: **never touch anything used by BattlePreparationScreen.tsx or BattleGridScreen.tsx**.

**Result:**
- All legacy-only files are gone.
- All new system files and their dependencies are intact.
- Ready to proceed to the next phase, or further refine the plan as needed.

### Phase 5: Remove Hooks
1. **Remove combat/movement hooks**:
   - useCombat, useMovement, useTargeting
   - useMovingTargetHandling, usePathFollowing
   
2. **Remove coordination hooks**:
   - useBattalionRefsAndState
   - useBattleCoordination
   
3. **Remove main hooks**:
   - useBattleInitialization
   - useBattleStateMachine

### Phase 6: Remove Utilities
1. **Check utility usage**:
   ```bash
   grep -r "battleUtils\|healthUtils\|movementUtils" --include="*.tsx" --include="*.ts"
   ```
2. **Remove unused utilities** in order of dependency

### Phase 7: Clean Shared Dependencies
1. **Review battleConstants.ts and networkConstants.ts**
2. **Check battle.ts types usage in BattleGridScreen**
3. **Remove unused exports**

### Phase 8: Remove BattleScreen
1. **Delete BattleScreen.tsx**
2. **Remove all imports of BattleScreen**

### Phase 9: Final Cleanup
1. **Run linter**: Fix any import errors
2. **Run tests**: Ensure remaining tests pass
3. **Test app thoroughly**: Verify BattleGridScreen still works

## Testing Checklist After Each Phase
- [ ] App builds successfully
- [ ] No console errors
- [ ] BattleGridScreen displays correctly
- [ ] Network visualization works
- [ ] Timer/countdown overlays function
- [ ] No TypeScript errors

## Potential Issues to Watch For

### 1. Hidden Dependencies
Some components might be imported in unexpected places (e.g., for type definitions only).

### 2. Redux State
Check if any legacy battle state is stored in Redux slices that need cleanup.

### 3. Navigation Stack
Ensure removing BattleScreen doesn't break navigation flow.

### 4. Asset References
Check for any images/assets only used by legacy system.

## Rollback Strategy
If issues arise at any phase:
1. `git stash` or `git commit` current changes
2. `git checkout main` to return to working state
3. Analyze what went wrong
4. Adjust plan and retry

## Success Criteria
- ✅ All legacy battle code removed
- ✅ BattleGridScreen works perfectly
- ✅ No broken imports or references
- ✅ App size reduced
- ✅ Codebase simplified

## Simplified Removal Strategy (Since BattleScreen is Disconnected)

Since BattleScreen is already not being used in navigation, the removal can be more straightforward:

### Quick Removal Order:
1. **Start with BattleScreen.tsx** - Delete it first and see what breaks
2. **Fix broken imports** - This will reveal all direct dependencies
3. **Remove orphaned components** - Components only used by BattleScreen
4. **Remove orphaned hooks** - Hooks only used by legacy components
5. **Remove orphaned utilities** - Utils only used by legacy system
6. **Clean up Redux** - Remove battleSlice if not used elsewhere
7. **Clean up shared files** - Remove unused types from battle.ts

### Quick Check Commands:
```bash
# Find all imports of BattleScreen
grep -r "BattleScreen" --include="*.tsx" --include="*.ts" .

# Find all files importing legacy components
grep -r "BattleNetwork\|BattleHeader\|BattleUnits\|BattleOverlays" --include="*.tsx" --include="*.ts" .

# Find all files importing legacy hooks
grep -r "useBattleCoordination\|useBattleStateMachine\|useBattleInitialization" --include="*.tsx" --include="*.ts" .
```

## Notes
- The issue that affected all repos was likely in `.gitignore`d files like `node_modules` or cache files, not source code
- Take extra care with babel/metro configs - don't modify these during cleanup
- Consider using `git clean -fdx` if cache issues persist after removal

## Root Cause of Previous Issue
The Metro bundler issue you experienced was caused by:
1. **Conflicting Babel presets**: Both `metro-react-native-babel-preset` (v0.77.0) and `@react-native/babel-preset` (v0.76.6) were installed
2. **Version mismatch**: The metro preset was newer than your React Native version
3. **Wrong preset in babel.config.js**: Using the metro preset instead of the React Native preset

**Lesson learned**: When removing files, avoid modifying:
- `babel.config.js`
- `metro.config.js`
- `package.json` dependencies (unless specifically removing unused packages)
- Any build tool configurations 