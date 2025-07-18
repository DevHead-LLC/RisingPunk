# useBattleSync Hook - Source of Truth

## File Description
The `useBattleSync` hook is the primary data orchestration mechanism for the battle system. It handles server/client data synchronization and manages the merging of server data with client positioning. This hook serves as the central coordinator for all battle state data flow between the server and client components, requiring valid server data to function.

## Imported Logic
- **RTK Query API calls** - Uses `useGetBattleStateQuery` for server data fetching
- **React hooks** - `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef` for state management
- **Battle types** - `BattleState`, `Battalion`, `NodeIndex` interfaces for type safety
- **Animation frames** - `requestAnimationFrame` for smooth interpolation
- **Node positioning** - `calculateNodePositions` from useBattleNodes for proper layout
- **Screen dimensions** - `Dimensions` for responsive positioning

## Internal Logic
- **Server data orchestration** - Uses server battalion data exclusively
- **Node data merging** - Combines server ownership/health with client positioning
- **State diff detection** - Tracks changes between battle state updates
- **Interpolation system** - Smooth transitions between state changes
- **Connection management** - Handles reconnection attempts and connection state
- **Error handling** - Manages API errors without fallback scenarios
- **Performance optimization** - Memoized calculations and efficient re-renders
- **Positioning integration** - Proper node positioning using established layout logic

## Key Functions
- `displayBattalions` - Server battalion data orchestration
- `displayNodes` - Server node data with client positioning
- `detectStateDiff` - State change detection for interpolation
- `interpolatePosition` - Smooth position transitions
- `handleConnectionLoss` - Connection error management
- `handleReconnection` - Reconnection logic

## Data Orchestration Functions
- **`displayBattalions`** - Uses server battalion data exclusively, no local fallbacks
- **`displayNodes`** - Combines server node ownership/health data with proper client positioning coordinates using calculateNodePositions 