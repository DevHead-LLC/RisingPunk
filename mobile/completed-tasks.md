## Batch 1A: Core Types and Constants (Foundation)
**Goal**: Create the foundational types and network constants

### NEW FILES TO CREATE:
1. **`src/types/battleTypes.ts`** (30 lines) - Core type definitions
2. **`src/utils/battleNetworkConstants.ts`** (20 lines) - Network topology constants

### FILES TO REFERENCE (READ ONLY):
- `src/types/battle.ts` (existing - for reference only)
- `src/utils/networkConstants.ts` (existing - for reference only)

### What This Achieves:
- ✅ Core type definitions for nodes, battalions, battle state
- ✅ Network topology with fixed node connections
- ✅ Foundation for all future development

### Test Criteria:
- Types compile correctly
- Network constants are properly defined
- No TypeScript errors

---

## Batch 1B: Network Visualization with Single Source of Truth
**Goal**: Create network visualization with consolidated architecture

### NEW FILES CREATED:
1. **`src/hooks/useBattleNodes.ts`** (80 lines) - Single source of truth for node state and positioning
2. **`src/hooks/useBattleNetwork.ts`** (60 lines) - Single source of truth for network connections and line calculations
3. **`src/components/battle/BattleNetworkGrid.tsx`** (140 lines) - Consolidated network visualization component

### FILES DELETED (consolidation):
- `src/components/battle/BattleNetworkLines.tsx` (moved logic to useBattleNetwork.ts)
- `src/components/battle/BattleNetworkNode.tsx` (moved logic to useBattleNodes.ts)
- `src/utils/battleNetworkConstants.ts` (unused prep work)

### What This Achieves:
- ✅ Single source of truth for node state (positions, ownership, health, capture progress)
- ✅ Single source of truth for network connections and line rendering
- ✅ Consolidated component that renders both nodes and lines
- ✅ Responsive node positioning (user left, neutral center, enemy right)
- ✅ Network topology with neutral nodes as central hubs
- ✅ Proper color coding and styling utilities

### Test Criteria:
- ✅ Network topology tests (user/enemy connections, neutral hubs, no direct user-enemy)
- ✅ Line calculation tests (horizontal, vertical, diagonal)
- ✅ Node positioning tests (column layout, responsive behavior, ownership)
- ✅ Node rendering tests (colors, borders, consistency)

---

## Batch 1C: Main Battle Screen
**Goal**: Create the main battle screen container

### NEW FILES CREATED:
1. **`src/screens/BattleGridScreen.tsx`** (75 lines) - Main battle screen container

### What This Achieves:
- ✅ Main battle screen with black background
- ✅ Network visualization integration using BattleNetworkGrid
- ✅ Proper screen layout and styling with SafeAreaView
- ✅ Title and subtitle display
- ✅ Single source of truth integration (useBattleNodes, useBattleNetwork)

### Test Criteria:
- ✅ Screen renders with black background
- ✅ Network visualization displays correctly
- ✅ No layout issues

---

## Batch 1D: Navigation Integration
**Goal**: Update navigation to use new battle screen

### FILES MODIFIED:
1. **`src/screens/TurfScreen.tsx`** (updated navigation button)

### What This Achieves:
- ✅ Navigation button points to new BattleGridScreen
- ✅ Old battle screen is no longer used
- ✅ Proper import and integration

### Test Criteria:
- ✅ Navigation button works correctly
- ✅ New battle screen loads properly

---

## Batch 2A: Node Ownership Management
**Goal**: Add dynamic ownership transfer functionality to existing node system

### FILES ENHANCED:
1. **`src/hooks/useBattleNodes.ts`** (enhanced with ownership management)

### What This Achieves:
- ✅ Dynamic ownership transfer functions (neutral ↔ user ↔ enemy)
- ✅ Node filtering by owner (getUserNodes, getEnemyNodes, getNeutralNodes)
- ✅ State management with React hooks
- ✅ Maintains single source of truth principle

### Test Criteria:
- ✅ Ownership transfer tests (correct transfers, no side effects)
- ✅ Node filtering tests (correct grouping by owner)
- ✅ State persistence tests

---

## Batch 2B: Node Ownership Visualization
**Goal**: Update network nodes to show ownership colors

### ANALYSIS:
- ✅ Ownership color logic already implemented in single source of truth (`useBattleNodes.ts`)
- ✅ Colors match intentions documents exactly (Blue #4717F6, Red #FF4141, Gray #666666)
- ✅ `BattleNetworkGrid.tsx` properly uses single source of truth functions
- ✅ No conflicting or doubled logic exists
- ✅ Comprehensive tests verify color functionality

### What This Achieves:
- ✅ Nodes display correct colors based on ownership
- ✅ Color coding: Blue (user), Red (enemy), Secondary (neutral)
- ✅ Single source of truth for all color logic
- ✅ Proper integration with current system architecture

### Test Criteria:
- ✅ Nodes display correct colors
- ✅ Color changes when ownership changes
- ✅ No duplicate color logic exists

---

## Batch 3A: Battle State Types and Management
**Goal**: Create battle state management system

### NEW FILES CREATED:
1. **`src/types/battleState.ts`** (40 lines) - Battle state types and actions
2. **`src/hooks/useBattleState.ts`** (150 lines) - Battle state management hook

### FILES ENHANCED:
1. **`src/types/battleTypes.ts`** (updated BattlePhase enum to remove 'initializing')

### What This Achieves:
- ✅ Battle phases (countdown, active, complete) - simplified from 4 to 3 phases
- ✅ 3-second start countdown with automatic transition to active
- ✅ 20-second battle timer with automatic completion
- ✅ State transitions with proper timer management
- ✅ Pause/resume functionality
- ✅ Manual battle end with winner specification
- ✅ Reset functionality to return to initial state

### Test Criteria:
- ✅ State transitions work correctly (countdown → active → complete)
- ✅ Timer counts down properly (3-second countdown, 20-second battle)
- ✅ Pause/resume functionality works
- ✅ Manual battle end works
- ✅ Reset returns to initial state
- ✅ Timer cleanup on unmount

---

## Batch 3B: Battle Overlay Components
**Goal**: Create countdown and timer overlay components

### NEW FILES CREATED:
1. **`src/components/battle/BattleCountdownOverlay.tsx`** (90 lines) - Full-screen countdown overlay with animations
2. **`src/components/battle/BattleTimerDisplay.tsx`** (80 lines) - Battle timer display with progress bar

### What This Achieves:
- ✅ Visual countdown overlay with fade-in/scale animations for 3-second countdown
- ✅ Battle timer display with progress bar for 20-second battle timer
- ✅ Proper overlay positioning and z-index management
- ✅ Responsive design with proper styling and text shadows
- ✅ Visibility controls for proper component lifecycle management

### Test Criteria:
- ✅ Countdown displays correctly with animations
- ✅ Timer counts down properly with progress visualization
- ✅ Overlay renders correctly with proper visibility controls

---

## Batch 3C: Overlay Integration
**Goal**: Integrate countdown and timer overlays into the main battle screen with clean, single-source layout logic

### NEW FILES CREATED:
1. **`src/components/battle/BattleOverlayManager.tsx`** - Manages all overlays for the battle screen

### FILES MODIFIED:
1. **`src/screens/BattleGridScreen.tsx`** - Uses BattleOverlayManager, passes full dimensions
2. **`src/hooks/useBattleNodes.ts`** - Now single source of truth for all node/network layout, including header/overlay space
3. **`__tests__/hooks/useBattleNodes.test.ts`** - Added meaningful regression tests for node positioning and layout

### What This Achieves:
- ✅ Overlays (countdown, timer) are managed in a dedicated, non-legacy component
- ✅ All node/network layout logic is controlled in useBattleNodes (single source of truth)
- ✅ Responsive, liquid layout for all screen sizes
- ✅ Overlay/header space is reserved and managed in one place
- ✅ No legacy code or unused logic remains
- ✅ Regression tests protect against accidental layout breakage

### Test Criteria:
- ✅ Countdown overlay appears for 3 seconds on screen load
- ✅ Timer overlay appears for 20 seconds after countdown
- ✅ Overlays disappear when phase is `complete`
- ✅ Node Y positions are always within bounds and stacked correctly
- ✅ Changing top margin shifts nodes as expected
- ✅ All tests pass

---
