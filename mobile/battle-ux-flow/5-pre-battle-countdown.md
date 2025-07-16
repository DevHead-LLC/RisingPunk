# Step 5: Pre-Battle Countdown

## User Experience Behavior
- User arrives at BattleGridScreen after clicking "DEPLOY PURGE"
- Screen immediately shows a full-screen countdown overlay with dark background
- Large animated countdown number appears (3, 2, 1) with "BATTLE STARTING" text
- Countdown numbers fade in/scale up with spring animations
- After 3 seconds, countdown overlay disappears and battle phase begins
- Battle timer (20 seconds) starts immediately after countdown completes

## Feature Description
**Countdown Overlay System**: Full-screen pre-battle countdown display with 3-second countdown management, automatic phase transitions, and visual feedback animations. The system manages countdown timer logic, overlay visibility, and automatic progression to the battle phase.

## Source of Truth Files
- **Client**: `src/hooks/useBattleState.ts` - Manages countdown value and phase transitions
- **Client**: `src/components/battle/BattleOverlayManager.tsx` - Controls countdown overlay display based on phase
- **Client**: `src/types/battleState.ts` - Defines countdown duration (3 seconds)
- **Client**: `src/components/battle/BattleCountdownOverlay.tsx` - Manages fade-in and scale animations

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[useBattleState.ts](../../src/hooks/useBattleState.ts)** - Manages countdown timer logic and phase transitions
  - **Client Responsibility**: startCountdown function now accepts battleId and syncs with server-side timer
  - **Code Status**: ✅ REFACTORED - Timer logic now syncs with server for consistency and anti-cheat
  - **Server Integration**: Uses CountdownTimerService to poll server for timer updates
- ✅ **[CountdownTimerService.ts](../../src/services/CountdownTimerService.ts)** - Client-side timer service that syncs with server
  - **Client Responsibility**: Polls server every second for timer updates, triggers callbacks on state changes
  - **Code Status**: ✅ IMPLEMENTED - Server-synced timer service with authentication
- ✅ **[BattleOverlayManager.tsx](../../src/components/battle/BattleOverlayManager.tsx)** - Manages countdown and timer overlays, starts countdown on mount
  - **Client Responsibility**: Controls countdown overlay display based on phase, passes battleId to timer service
  - **Code Status**: ✅ UPDATED - Now accepts battleId prop and passes to timer service
- ✅ **[BattleCountdownOverlay.tsx](../../src/components/battle/BattleCountdownOverlay.tsx)** - 3-second countdown overlay with fade-in/scale animations
  - **Client Responsibility**: Uses Animated.parallel for fade-in and scale-up effects, spring animation for countdown number scaling
  - **Code Status**: EXISTS - Animation system properly implemented
- ✅ **[BattleGridScreen.tsx](../../src/screens/BattleGridScreen.tsx)** - Contains BattleOverlayManager which triggers countdown
  - **Client Responsibility**: Contains BattleOverlayManager which triggers countdown, passes battleId prop
  - **Code Status**: ✅ UPDATED - Now passes battleId to BattleOverlayManager
- ✅ **[battleTypes.ts](../../src/types/battleTypes.ts)** - Defines BattlePhase.COUNTDOWN and BattlePhase.ACTIVE
  - **Code Status**: EXISTS - Phase definitions properly configured
- ✅ **[battleState.ts](../../src/types/battleState.ts)** - Timer configuration (COUNTDOWN_DURATION: 3)
  - **Code Status**: EXISTS - Timer configuration properly defined

**Server-Side Implementation:**
- ✅ **[BattleTimer.ts](../../../server/src/services/BattleTimer.ts)** - Server-side timer service with EventEmitter
  - **Server Responsibility**: Manages countdown and battle timers, emits events for phase changes
  - **Code Status**: ✅ EXISTS - Comprehensive timer service with event system
- ✅ **[BattleService.ts](../../../server/src/services/BattleService.ts)** - Battle service with timer integration
  - **Server Responsibility**: Creates battles and starts server-side timers, handles timer events
  - **Code Status**: ✅ UPDATED - Now integrates with BattleTimerService
- ✅ **[BattleController.ts](../../../server/src/controllers/BattleController.ts)** - Battle controller with timer endpoints
  - **Server Responsibility**: Provides timer state endpoint for client polling
  - **Code Status**: ✅ UPDATED - Added getBattleTimer method
- ✅ **[battle.ts](../../../server/src/routes/battle.ts)** - Battle API routes with timer endpoint
  - **Server Responsibility**: Exposes /:id/timer endpoint for client timer sync
  - **Code Status**: ✅ UPDATED - Added timer endpoint

**File Size Check:**
- All files are under 250 lines, no splitting needed

**Implementation Status:**
✅ **COMPLETED** - Server-side timer integration implemented
- Client now syncs with server every second for timer updates
- Server manages all timer logic and phase transitions
- Authentication properly handled for timer API calls
- Fallback to demo mode when no battleId provided 