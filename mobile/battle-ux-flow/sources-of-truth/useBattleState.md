# useBattleState Hook - Source of Truth

## File Description
The `useBattleState` hook manages battle state transitions, timer synchronization, and error state management for the battle system. It serves as the central coordinator for battle lifecycle management, including countdown phases, battle phases, and error handling. This hook provides a unified interface for battle state management and error handling across the battle system.

## Imported Logic
- **React hooks** - `useReducer`, `useCallback`, `useRef`, `useEffect`, `useState` for state management
- **Battle types** - `BattlePhase`, `BattleStateData`, `BattleStateAction`, `BattleTimerConfig` for type safety
- **CountdownTimerService** - Server timer synchronization and callbacks
- **Timer configuration** - Constants for countdown and battle durations

## Internal Logic
- **Battle state management** - Phase transitions (countdown → active → complete)
- **Timer synchronization** - Server-side timer integration with local state
- **Error state management** - Loading states, error handling, and error clearing
- **Lifecycle management** - Timer service cleanup and component unmount handling
- **State reduction** - Centralized state updates through reducer pattern
- **Callback management** - Timer update callbacks and state synchronization

## Key Functions
- `startCountdown` - Initialize countdown phase with server sync
- `startBattle` - Transition to battle phase (server-managed)
- `endBattle` - End battle and cleanup timer service
- `setLoading` - Manage loading state
- `setError` - Set error state and clear loading
- `clearError` - Reset error state

## Error State Management
- **Loading states** - Track when data is being fetched
- **Error handling** - Capture and display error messages
- **Error clearing** - Reset error state when issues resolve
- **State synchronization** - Sync error states from other hooks 