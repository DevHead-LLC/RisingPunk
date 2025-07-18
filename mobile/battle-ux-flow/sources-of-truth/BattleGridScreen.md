# BattleGridScreen Source of Truth

## Current Breakdown of Imported Logic vs Internal Logic

### Imported Logic

**Hooks (Data Sources):**
- `useInitialBattleNodes` - Provides node positions and state based on screen dimensions
- `useBattleNetworkConnections` - Provides network topology and connection data
- `useBattalionData` - Provides battalion creation and data management utilities
- `useBattleBattalions` - Provides battalion state management (local battalions, initialization)
- `useBots` - Provides bot categories, stats, and role information
- `useGetBattleStateQuery` - Provides server battle state (battalions, nodes, phase, timing)

**Components (Visual Rendering):**
- `BattleNetworkGrid` - Renders network nodes and connection lines
- `BattleBattalionManager` - Renders battalion visualizations and health bars
- `BattleOverlayManager` - Renders countdown and timer overlays

**Utilities:**
- `Dimensions` - Provides screen dimensions for responsive layout
- `React.memo` - Performance optimization wrapper

### Internal Logic

**Data Orchestration:**
- `displayBattalions` - Chooses between server battalions or local battalions
- `displayNodes` - Chooses between server nodes or local nodes
- `sampleBattalion` - Creates example battalion for demonstration (unused)

**Conditional Rendering Logic:**
- Loading state when fetching server data (`battleId && battleLoading`)
- Error state when server data fails (`battleId && battleError`)
- Fallback to local data when no server connection

**Lifecycle Management:**
- `useEffect` - Initializes sample battalions only when no battleId provided
- Component memoization for performance

**Styling:**
- Complete StyleSheet definition for all visual styling
- Responsive layout calculations using screen dimensions

**Props Interface:**
- `_onClose` - Optional callback for closing the screen
- `battleId` - Optional battle identifier for server integration

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

- [ ] **Batch 3:** Lifecycle Management
  - [ ] Extend useBattleState.ts with initialization logic
  - [ ] Move useEffect logic to useBattleState
  - [ ] Move component initialization to useBattleState
  - [ ] Update BattleGridScreen to use useBattleState
  - [ ] Test component initialization
  - [ ] Document in TOC

- [ ] **Batch 4:** Styling Extraction
  - [ ] Create battleGridStyles.ts utility file
  - [ ] Move all StyleSheet definitions to utility
  - [ ] Update BattleGridScreen to import styles
  - [ ] Test visual appearance
  - [ ] Document in TOC

- [ ] **Batch 5:** Demo Mode Removal
  - [ ] Remove demo logic from useBattleBattalions.ts
  - [ ] Remove demo logic from useBattleSync.ts
  - [ ] Remove sampleBattalion creation from BattleGridScreen
  - [ ] Require valid battleId for functionality
  - [ ] Test with real battleId only
  - [ ] Document in TOC

- [ ] **Batch 6:** Final Cleanup
  - [ ] Remove any remaining internal logic from BattleGridScreen
  - [ ] Verify BattleGridScreen is pure orchestrator
  - [ ] Update TOC hierarchy with new sources of truth
  - [ ] Full system validation
  - [ ] Document final state

### **Context Preservation Strategy**
- **Each batch creates a new source of truth file**
- **TOC updated after each batch**
- **Progress tracked in this file**
- **current-task.md maintains big picture context**
- **Each change is atomic and testable**

