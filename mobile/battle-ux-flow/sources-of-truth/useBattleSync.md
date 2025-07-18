# useBattleSync Hook - Source of Truth

## File Description
The `useBattleSync` hook is the primary data orchestration mechanism for the battle system. It handles server/client data synchronization, provides fallback logic for offline scenarios, and manages the merging of server data with client positioning. This hook serves as the central coordinator for all battle state data flow between the server and client components.

## Imported Logic
- **RTK Query API calls** - Uses `useGetBattleStateQuery` for server data fetching
- **React hooks** - `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef` for state management
- **Battle types** - `BattleState`, `Battalion` interfaces for type safety
- **Animation frames** - `requestAnimationFrame` for smooth interpolation

## Internal Logic
- **Data orchestration** - Merges server battalion data with client positioning
- **Node data merging** - Combines server ownership/health with client positioning
- **State diff detection** - Tracks changes between battle state updates
- **Interpolation system** - Smooth transitions between state changes
- **Connection management** - Handles reconnection attempts and connection state
- **Error handling** - Manages API errors and fallback scenarios
- **Performance optimization** - Memoized calculations and efficient re-renders

## Key Functions
- `displayBattalions` - Battalion data orchestration between server and client
- `displayNodes` - Node data orchestration between server and client
- `detectStateDiff` - State change detection for interpolation
- `interpolatePosition` - Smooth position transitions
- `handleConnectionLoss` - Connection error management
- `handleReconnection` - Reconnection logic

## Data Orchestration Functions
- **`displayBattalions`** - Merges server battalion data with client positioning, handles undefined data gracefully
- **`displayNodes`** - Combines server node ownership/health data with client positioning coordinates 