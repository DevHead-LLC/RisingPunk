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
  - **Client Responsibility**: startCountdown function initiates 3-second countdown, automatically transitions from COUNTDOWN to ACTIVE phase
  - **Code Status**: NEEDS REFACTORING - timer logic should move to server for consistency and anti-cheat
  - **Future Enhancement**: Server-side countdown timer management and phase transitions
- ✅ **[BattleOverlayManager.tsx](../../src/components/battle/BattleOverlayManager.tsx)** - Manages countdown and timer overlays, starts countdown on mount
  - **Client Responsibility**: Controls countdown overlay display based on phase
  - **Code Status**: EXISTS - Overlay management properly implemented
- ✅ **[BattleCountdownOverlay.tsx](../../src/components/battle/BattleCountdownOverlay.tsx)** - 3-second countdown overlay with fade-in/scale animations
  - **Client Responsibility**: Uses Animated.parallel for fade-in and scale-up effects, spring animation for countdown number scaling
  - **Code Status**: EXISTS - Animation system properly implemented
- ✅ **[BattleGridScreen.tsx](../../src/screens/BattleGridScreen.tsx)** - Contains BattleOverlayManager which triggers countdown
  - **Client Responsibility**: Contains BattleOverlayManager which triggers countdown
  - **Code Status**: EXISTS - Screen integration properly implemented
- ✅ **[battleTypes.ts](../../src/types/battleTypes.ts)** - Defines BattlePhase.COUNTDOWN and BattlePhase.ACTIVE
  - **Code Status**: EXISTS - Phase definitions properly configured
- ✅ **[battleState.ts](../../src/types/battleState.ts)** - Timer configuration (COUNTDOWN_DURATION: 3)
  - **Code Status**: EXISTS - Timer configuration properly defined

**File Size Check:**
- All files are under 250 lines, no splitting needed

**Recommended File Structure:**
1. **Create**: `src/services/CountdownTimerService.ts` - Extract countdown timer logic from useBattleState (reason: needs refactoring for server-side implementation)
2. **Import Strategy**: 
   - Import `CountdownTimerService` into `useBattleState.ts`
   - Ensure proper integration between client-side animations and server-side timer logic 