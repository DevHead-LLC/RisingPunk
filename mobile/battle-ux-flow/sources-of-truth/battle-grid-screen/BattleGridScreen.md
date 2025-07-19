# BattleGridScreen Source of Truth

## Current Breakdown of Imported Logic vs Internal Logic

### Imported Logic

**Hooks (Data Sources):**
- `useBattleSync` - Server/client data synchronization and orchestration
- `useBattleState` - Battle state, error management, and lifecycle management
- `useBattleNetworkConnections` - Provides network topology and connection data

**Components (Visual Rendering):**
- `BattleNetworkGrid` - Renders network nodes and connection lines
- `BattleBattalionManager` - Renders battalion visualizations and health bars
- `BattleOverlayManager` - Renders countdown and timer overlays

**Utilities:**
- `battleGridStyles` - Provides all visual styling and responsive layout

### Internal Logic

**Conditional Rendering Logic:**
- Loading state when fetching server data (`battleLoading || errorState.isLoading`)
- Error state when server data fails (`battleError || errorState.hasError`)
- No fallback to local data - requires valid server connection

**Props Interface:**
- `_onClose` - Optional callback for closing the screen
- `battleId` - Required battle identifier for server integration

---

## **Refactoring Plan: Move Internal Logic to Sources of Truth**

### **Methodology: Micro-Batch Approach**
- **One change per batch** - Test after each change
- **Checklist tracking** - Document progress and prevent duplication
- **Context preservation** - Maintain clear state between sessions
- **Rollback capability** - Each change is reversible

### **Batch 1: Data Orchestration Logic**
**Target:** Move `displayBattalions` and `displayNodes` logic
**Extend:** `useBattleSync.ts` (existing source of truth for server/client sync)
**Remove:** Internal data orchestration from BattleGridScreen
**Test:** Verify server and local data still display correctly
**Source of Truth:** Client-side data synchronization

### **Batch 2: Error State Logic** 
**Target:** Move loading/error state management
**Extend:** `useBattleState.ts` (existing source of truth for battle state)
**Remove:** Internal error handling from BattleGridScreen
**Test:** Verify loading/error states still work
**Source of Truth:** Client-side battle state management

### **Batch 3: Lifecycle Management**
**Target:** Move initialization logic
**Extend:** `useBattleState.ts` (existing source of truth for battle state)
**Remove:** Internal useEffect and initialization from BattleGridScreen
**Test:** Verify component still initializes properly
**Source of Truth:** Client-side battle state management

### **Batch 4: Styling Extraction**
**Target:** Move all StyleSheet definitions
**Create:** `battleGridStyles.ts` (new utility file)
**Remove:** Internal styles from BattleGridScreen
**Test:** Verify visual appearance unchanged
**Source of Truth:** Client-side styling utilities

### **Batch 5: Demo Mode Removal**
**Target:** Eliminate fallback demo functionality
**Update:** `useBattleBattalions.ts` and `useBattleSync.ts` (remove demo logic)
**Remove:** `sampleBattalion` creation and demo fallbacks
**Update:** Require valid battleId for functionality
**Test:** Verify app works only with real battleId
**Source of Truth:** Client-side battle data management

### **Batch 6: Final Cleanup**
**Target:** Remove any remaining internal logic
**Verify:** BattleGridScreen is pure orchestrator
**Update:** TOC with new sources of truth
**Test:** Full system validation

### **Progress Tracking Checklist**
- [x] **Batch 1:** Data Orchestration Logic ✅ COMPLETED
  - [x] Extend useBattleSync.ts with data orchestration logic
  - [x] Move displayBattalions logic to useBattleSync
  - [x] Move displayNodes logic to useBattleSync
  - [x] Update BattleGridScreen to use useBattleSync
  - [x] Test server data display
  - [x] Test local data display
  - [x] Document in TOC
  - **Result**: Data orchestration successfully moved to useBattleSync, BattleGridScreen simplified

- [x] **Batch 2:** Error State Logic ✅ COMPLETED
  - [x] Extend useBattleState.ts with error state management
  - [x] Move loading state logic to useBattleState
  - [x] Move error state logic to useBattleState
  - [x] Update BattleGridScreen to use useBattleState
  - [x] Sync error state from useBattleSync to useBattleState
  - **Result**: Error state management consolidated in useBattleState, BattleGridScreen simplified

- [x] **Batch 3:** Lifecycle Management ✅ COMPLETED
  - [x] Extend useBattleState.ts with initialization logic
  - [x] Move useEffect logic to useBattleState
  - [x] Move component initialization to useBattleState
  - [x] Update BattleGridScreen to use useBattleState
  - [x] Consolidate initialization and error sync effects
  - **Result**: Lifecycle management consolidated in useBattleState, BattleGridScreen simplified

- [x] **Batch 4:** Styling Extraction ✅ COMPLETED
  - [x] Create battleGridStyles.ts utility file
  - [x] Move all StyleSheet definitions to utility
  - [x] Update BattleGridScreen to import styles
  - [x] Test visual appearance
  - [x] Document in TOC
  - **Result**: Styling logic moved to dedicated utility, BattleGridScreen simplified

- [x] **Batch 5:** Demo Mode Removal ✅ COMPLETED
  - [x] Remove demo logic from useBattleBattalions.ts
  - [x] Remove demo logic from useBattleSync.ts
  - [x] Remove sampleBattalion creation from BattleGridScreen
  - [x] Require valid battleId for functionality
  - [x] Fix node positioning after demo removal
  - [x] Test with real battleId only
  - [x] Document in TOC
  - **Result**: Demo mode completely removed, server-driven architecture achieved

- [x] **Batch 6:** Final Cleanup ✅ COMPLETED
  - [x] Remove unused imports and variables from BattleGridScreen
  - [x] Remove unused hooks (useInitialBattleNodes, useBattalionData, useBattleBattalions, useBots)
  - [x] Remove unused state variables (isInitialized, resetInitialization)
  - [x] Verify BattleGridScreen is pure orchestrator
  - [x] Update TOC hierarchy with final sources of truth
  - [x] Full system validation
  - [x] Document final state
  - **Result**: BattleGridScreen is now a pure orchestrator with no internal logic

### **Final State Achieved**
- **Pure Orchestrator**: BattleGridScreen only orchestrates external components
- **No Internal Logic**: All functionality moved to proper sources of truth
- **Server-Driven**: No more demo fallbacks, requires valid battleId
- **Clean Architecture**: Clear separation of concerns and responsibilities
- **Minimal Imports**: Only imports what it actually uses
- **Single Responsibility**: Focused solely on orchestration

### **Context Preservation Strategy**
- **Each batch creates a new source of truth file**
- **TOC updated after each batch**
- **Progress tracked in this file**
- **current-task.md maintains big picture context**
- **Each change is atomic and testable**

