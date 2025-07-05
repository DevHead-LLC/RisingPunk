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
