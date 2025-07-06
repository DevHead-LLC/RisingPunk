# BattleGridScreen.tsx Workflow Connections

**Last Updated:** Current session  
**Purpose:** Track all files directly connected to BattleGridScreen.tsx workflow through imports  
**Scope:** Only files that are actually imported/used in the BattleGridScreen workflow  

## Navigation Flow
```
TurfScreen.tsx → BattleGridScreen.tsx
```

## Core Files

### 1. BattleGridScreen.tsx
- **Location:** `mobile/src/screens/BattleGridScreen.tsx`
- **Purpose:** Main battle screen container with network visualization
- **Imports:**
  - `useInitialBattleNodes` from `../hooks/useBattleNodes`
  - `useBattleNetworkConnections` from `../hooks/useBattleNetwork`
  - `BattleNetworkGrid` from `../components/battle/BattleNetworkGrid`
  - `BattleOverlayManager` from `../components/battle/BattleOverlayManager`

### 2. TurfScreen.tsx
- **Location:** `mobile/src/screens/TurfScreen.tsx`
- **Purpose:** Navigation container that renders BattleGridScreen
- **Connection:** Imports and renders `BattleGridScreen` component
- **Navigation:** `case 'battle': return <BattleGridScreen onClose={...} />`

## Hooks

### 3. useBattleNodes.ts
- **Location:** `mobile/src/hooks/useBattleNodes.ts`
- **Purpose:** Single source of truth for battle node state, positions, and rendering
- **Imports:**
  - `NodeIndex` from `../types/battleTypes`
- **Exports:**
  - `useInitialBattleNodes` (used by BattleGridScreen)
  - `calculateNodePositions`
  - `useNodeOwnership`
  - `getNodeColor`, `getNodeBorderColor`
  - `NodeOwner` type

### 4. useBattleNetwork.ts
- **Location:** `mobile/src/hooks/useBattleNetwork.ts`
- **Purpose:** Hook for managing battle network connections and line calculations
- **Imports:**
  - `NodeIndex` from `../types/battleTypes`
- **Exports:**
  - `useBattleNetworkConnections` (used by BattleGridScreen)
  - `getNetworkConnections`
  - `calculateLineProperties`
  - `NetworkConnection` interface
  - `LineProperties` interface

### 5. useBattleState.ts
- **Location:** `mobile/src/hooks/useBattleState.ts`
- **Purpose:** Battle state management hook with timer functionality
- **Imports:**
  - `BattlePhase` from `../types/battleTypes`
  - `BattleStateData`, `BattleStateAction`, `BattleTimerConfig` from `../types/battleState`
- **Exports:**
  - `useBattleState` (used by BattleOverlayManager)

## Components

### 6. BattleNetworkGrid.tsx
- **Location:** `mobile/src/components/battle/BattleNetworkGrid.tsx`
- **Purpose:** Single network visualization component that renders nodes and connections
- **Imports:**
  - `NodeIndex` from `../../types/battleTypes`
  - `NetworkConnection`, `calculateLineProperties` from `../../hooks/useBattleNetwork`
  - `BattleNodeState`, `getNodeColor`, `getNodeBorderColor` from `../../hooks/useBattleNodes`
- **Used by:** BattleGridScreen.tsx

### 7. BattleOverlayManager.tsx
- **Location:** `mobile/src/components/battle/BattleOverlayManager.tsx`
- **Purpose:** Manages and displays battle overlays (countdown, timer)
- **Imports:**
  - `useBattleState` from `../../hooks/useBattleState`
  - `BattlePhase` from `../../types/battleTypes`
  - `BattleCountdownOverlay` from `./BattleCountdownOverlay`
  - `BattleTimerDisplay` from `./BattleTimerDisplay`
- **Used by:** BattleGridScreen.tsx

### 8. BattleCountdownOverlay.tsx
- **Location:** `mobile/src/components/battle/BattleCountdownOverlay.tsx`
- **Purpose:** Full-screen countdown overlay for battle initialization
- **Imports:** Only React Native imports (no custom imports)
- **Used by:** BattleOverlayManager.tsx

### 9. BattleTimerDisplay.tsx
- **Location:** `mobile/src/components/battle/BattleTimerDisplay.tsx`
- **Purpose:** Battle timer display for active battle phase
- **Imports:** Only React Native imports (no custom imports)
- **Used by:** BattleOverlayManager.tsx

## Types

### 10. battleTypes.ts
- **Location:** `mobile/src/types/battleTypes.ts`
- **Purpose:** Core type definitions for the battle system
- **Imports:** None (pure types file)
- **Exports:**
  - `NodeIndex` type (used by useBattleNodes, useBattleNetwork, BattleNetworkGrid)
  - `BattlePhase` enum (used by useBattleState, BattleOverlayManager)
  - `NodePosition` type
  - `BattleNode` interface
  - `BattalionType` enum
  - `Battalion` interface
  - `BattleState` interface
  - `Path` type
  - `NetworkConnection` type
  - `MovementTarget` interface

### 11. battleState.ts
- **Location:** `mobile/src/types/battleState.ts`
- **Purpose:** Battle state management types
- **Imports:**
  - `BattlePhase` from `./battleTypes`
- **Exports:**
  - `BattleTimerConfig` interface (used by useBattleState)
  - `BattleStateData` interface (used by useBattleState)
  - `BattleStateAction` type (used by useBattleState)
  - `BattleStateContext` interface

## Test Files

### 12. useBattleNetwork.test.ts
- **Location:** `mobile/__tests__/hooks/useBattleNetwork.test.ts`
- **Purpose:** Tests for useBattleNetworkConnections hook
- **Imports:**
  - `getNetworkConnections`, `calculateLineProperties` from `../../src/hooks/useBattleNetwork`

### 13. useBattleNodes.test.ts
- **Location:** `mobile/__tests__/hooks/useBattleNodes.test.ts`
- **Purpose:** Tests for useInitialBattleNodes hook logic
- **Imports:**
  - `useInitialBattleNodes`, `calculateNodePositions` from `../../src/hooks/useBattleNodes`
  - `getNodeColor`, `getNodeBorderColor`, `NodeOwner` from `../../src/hooks/useBattleNodes`
  - `NodeIndex` from `../../src/types/battleTypes`

### 14. useBattleState.test.ts
- **Location:** `mobile/__tests__/hooks/useBattleState.test.ts`
- **Purpose:** Tests for useBattleState hook
- **Imports:**
  - `useBattleState` from `../../src/hooks/useBattleState`
  - `BattlePhase` from `../../src/types/battleTypes`

### 15. battleState.test.ts
- **Location:** `mobile/__tests__/types/battleState.test.ts`
- **Purpose:** Tests for battle state types
- **Imports:**
  - `BattleTimerConfig`, `BattleStateData`, `BattleStateAction` from `../../src/types/battleState`
  - `BattlePhase` from `../../src/types/battleTypes`

## Import Chain Summary

**BattleGridScreen.tsx** imports:
1. `useInitialBattleNodes` → **useBattleNodes.ts** → imports `NodeIndex` from **battleTypes.ts**
2. `useBattleNetworkConnections` → **useBattleNetwork.ts** → imports `NodeIndex` from **battleTypes.ts**
3. `BattleNetworkGrid` → **BattleNetworkGrid.tsx** → imports from **battleTypes.ts**, **useBattleNetwork.ts**, **useBattleNodes.ts**
4. `BattleOverlayManager` → **BattleOverlayManager.tsx** → imports from **useBattleState.ts**, **battleTypes.ts**, **BattleCountdownOverlay.tsx**, **BattleTimerDisplay.tsx**

**TurfScreen.tsx** imports:
- `BattleGridScreen` → **BattleGridScreen.tsx**

## Total Files: 15

This represents the complete, verified import chain for the BattleGridScreen.tsx workflow. All connections are based on actual import statements, and no legacy files are included. 