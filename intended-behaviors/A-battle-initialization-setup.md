# A. Battle Initialization & Setup

## Table of Contents

### [A. Battle Initialization & Setup](A-battle-initialization-setup.md)
0. [Battle Preparation](A-battle-initialization-setup.md#0-battle-preparation)
1. [Battle Start](A-battle-initialization-setup.md#1-battle-start)

### [B. Movement System (Consistent Throughout Battle)](B-movement-system.md)
2. [Movement Behavior](B-movement-system.md#2-movement-behavior)
3. [Movement Interruption Handling](B-movement-system.md#3-movement-interruption-handling)
4. [Natural Recovery Movement After Interruption](B-movement-system.md#4-natural-recovery-movement-after-interruption)

### [C. Targeting System (Two Distinct Behaviors)](C-targeting-system.md)
5. [Initial Targeting (Battle Start)](C-targeting-system.md#5-initial-targeting-battle-start)
6. [Retargeting (During Battle)](C-targeting-system.md#6-retargeting-during-battle)

### [D. Attack System (Consistent Throughout Battle)](D-attack-system.md)
7. [Attack Behavior](D-attack-system.md#7-attack-behavior)
8. [Node Combat (Tug-of-War System)](D-attack-system.md#8-node-combat-tug-of-war-system)
9. [Battalion-to-Battalion Combat System](D-attack-system.md#9-battalion-to-battalion-combat-system)

### [E. Event Handling & Retargeting](E-event-handling-retargeting.md)
10. [Node Capture Events](E-event-handling-retargeting.md#10-node-capture-events)
11. [Battalion Destruction Events](E-event-handling-retargeting.md#11-battalion-destruction-events)
12. [Battalion Movement Events](E-event-handling-retargeting.md#12-battalion-movement-events)
13. [Sequential Movement Phase](E-event-handling-retargeting.md#13-sequential-movement-phase)
14. [Immediate Response Events (Priority Queue Processing)](E-event-handling-retargeting.md#14-immediate-response-events-priority-queue-processing)
15. [Combat Queue System](E-event-handling-retargeting.md#15-combat-queue-system)
16. [Ongoing Combat](E-event-handling-retargeting.md#16-ongoing-combat)

### [F. Battle End & Point Tracking System](F-battle-end-point-tracking.md)
17. [Battle Duration & End Conditions](F-battle-end-point-tracking.md#17-battle-duration--end-conditions)
18. [Point Tracking System (Loss-Based Scoring)](F-battle-end-point-tracking.md#18-point-tracking-system-loss-based-scoring)
19. [Battle End Overlay Screen](F-battle-end-point-tracking.md#19-battle-end-overlay-screen)
20. [Battle End Data Structure](F-battle-end-point-tracking.md#20-battle-end-data-structure)

### [G. Architecture & Infrastructure](G-architecture-infrastructure.md)
21. [Key Rules & Network Lock-in](G-architecture-infrastructure.md#21-key-rules--network-lock-in)
22. [Attack Service Architecture Improvements](G-architecture-infrastructure.md#22-attack-service-architecture-improvements)

---

## 0. Battle Preparation
- User selects bot types and quantities in BattlePreparationScreen
- Bot selection flow:
  1. Pull available bots from user's built inventory (functional)
  2. Click Battalion A → popup shows Breacher, Guardian, Phreak with current counts (functional)
  3. Select bot type → quantity input with ±1/±25 buttons, max 250 bots (functional)
  4. Click "Assign Bots" → assigns quantity to battalion slot (functional)
  5. Click "DEPLOY PURGE" → starts battle (functional)
  6. Battle assigns user battalions based on selections instead of mock data (NOT functional)
  7. Battalions spawn at random available user nodes (0, 1, or 2) (NOT functional)
  8. Multiple battalions can spawn at same node - first spawns at start, second spawns 1 second after battle countdown with retargeting (NOT functional)

#### **Associated Files:**
- `mobile/src/screens/BattlePreparationScreen.tsx` - Bot selection UI and battalion assignment
- `mobile/src/components/battle/BattalionBotSelector/index.tsx` - Bot type selection popup
- `mobile/src/components/battle/BattalionBotSelector/BotTypeCard.tsx` - Individual bot type display
- `mobile/src/components/battle/BattalionBotSelector/QuantitySelector.tsx` - Quantity input with ±1/±25 buttons
- `mobile/src/store/api/botsApi.ts` - Fetches user's available bots
- `mobile/src/store/slices/botsSlice.ts` - Manages user bot inventory state
- `server/src/controllers/BattleController.ts` - Receives user battalion selections
- `server/src/services/BattalionService.ts` - Creates battalions from user selections
- `server/src/services/BattleSetupService.ts` - Assigns battalions to spawn nodes
- `server/src/services/MovementService.ts` - Handles delayed battalion spawning and retargeting

##### **Discrepancies:**
- **BattlePreparationScreen.tsx - CRITICAL DISCREPANCY:**
  - **✅ EXISTS:** Bot selection UI - battalion slot selection interface (lines 130-140)
  - **✅ EXISTS:** Bot type popup - shows Breacher, Guardian, Phreak options (line 207)
  - **✅ EXISTS:** Quantity input - ±1/±25 buttons with max 250 limit (line 207)
  - **✅ EXISTS:** "Assign Bots" functionality - assigns to battalion slots (lines 50-70)
  - **✅ EXISTS:** "DEPLOY PURGE" button - starts battle flow (lines 200-210)
  - **❌ CRITICAL:** Mock data being sent instead of real assignments (lines 95-99)
  - **❌ CRITICAL:** `userBattalions` hardcoded instead of using `assignments` state (lines 100-104)

- **BattalionBotSelector/index.tsx - FULLY IMPLEMENTED:**
  - **✅ EXISTS:** Bot type selection popup - shows available bot types (lines 40-50)
  - **✅ EXISTS:** Current counts display - shows user's bot inventory (line 45)
  - **✅ EXISTS:** Bot type selection logic - handles user bot type choice (lines 20-25)
  - **✅ EXISTS:** Quantity selector integration - connects to quantity input (lines 55-60)

- **BattalionBotSelector/BotTypeCard.tsx - FULLY IMPLEMENTED:**
  - **✅ EXISTS:** Individual bot type display - Guardian, Breacher, Phreak cards
  - **✅ EXISTS:** Bot type selection handling - click to select bot type
  - **✅ EXISTS:** Current count display - shows available quantity

- **BattalionBotSelector/QuantitySelector.tsx - FULLY IMPLEMENTED:**
  - **✅ EXISTS:** Quantity input field - numeric input for bot quantity (lines 30-35)
  - **✅ EXISTS:** ±1 buttons - increment/decrement by 1 (lines 40-45)
  - **✅ EXISTS:** ±25 buttons - increment/decrement by 25 (lines 50-55)
  - **✅ EXISTS:** Max 250 limit - prevents exceeding maximum (line 15: `MAX_BATTALION_SIZE = 250`)
  - **✅ EXISTS:** "Assign Bots" button - assigns quantity to battalion (lines 60-65)

- **botsApi.ts - FULLY IMPLEMENTED:**
  - **✅ EXISTS:** User bot inventory fetching - `fetchBots` query (lines 15-18)
  - **✅ EXISTS:** Bot type and quantity data - returns user's bot counts
  - **✅ EXISTS:** `assignToBattalion` mutation - assigns bots to battalions (lines 36-42)
  - **✅ EXISTS:** Integration with battle preparation - connected to battalion selection

- **botsSlice.ts - FULLY IMPLEMENTED:**
  - **✅ EXISTS:** User bot inventory state management - `botCounts` state (lines 15-20)
  - **✅ EXISTS:** Bot type and quantity tracking - manages user's bots
  - **✅ EXISTS:** Battle preparation integration - connected to battalion assignment

- **BattleController.ts - PARTIALLY IMPLEMENTED:**
  - **✅ EXISTS:** Battle start handling - `startBattle()` method (lines 62-70)
  - **✅ EXISTS:** User battalion parameter - accepts `userBattalions` array (line 62)
  - **✅ EXISTS:** Real user battalion data processing - passes to BattleService (line 64)
  - **❌ MISSING:** User battalion validation - no validation of user selections

- **BattalionService.ts - PARTIALLY IMPLEMENTED:**
  - **✅ EXISTS:** Battalion creation - `createUserBattalions()` method (lines 180-200)
  - **✅ EXISTS:** User battalion selection processing - uses `userBattalions` parameter (line 180)
  - **✅ EXISTS:** Bot type validation - `validateBotType()` method (lines 131-150)
  - **❌ MISSING:** Random spawn node assignment - uses fixed node indices (line 187: `nodeIndex = index`)
  - **❌ MISSING:** Multiple battalion spawn handling - no delayed spawning logic

- **BattleSetupService.ts - PARTIALLY IMPLEMENTED:**
  - **✅ EXISTS:** Battle creation - `createBattle()` method (lines 10-40)
  - **✅ EXISTS:** Battalion spawning - creates battalions at nodes (line 15)
  - **✅ EXISTS:** User battalion integration - passes `userBattalions` to BattalionService (line 15)
  - **❌ MISSING:** Random spawn node assignment - uses fixed node assignment
  - **❌ MISSING:** Multiple battalion spawn coordination - no spawn timing logic

- **MovementService.ts - MISSING FUNCTIONALITY:**
  - **❌ MISSING:** Delayed battalion spawning - no 1-second delay logic
  - **❌ MISSING:** Retargeting for delayed spawns - no retargeting phase for late spawns
  - **❌ MISSING:** Multiple battalion coordination - no spawn timing management
  - **✅ EXISTS:** Movement state management - handles battalion movement

- **Server-side Bot Assignment - FULLY IMPLEMENTED:**
  - **✅ EXISTS:** `/api/battalions/assign` endpoint - server.ts lines 350-395
  - **✅ EXISTS:** Bot inventory management - proper bot count tracking
  - **✅ EXISTS:** Battalion assignment tracking - stores assignments in database
  - **✅ EXISTS:** Bot count validation - prevents over-assignment 

## 1. Battle Start
- User clicks "Deploy Purge" in BattlePreparationScreen
- 3-second countdown timer starts
- Battalions spawn at their home nodes (0,1,2 for attacker, 6,7,8 for defender)
  - **Note**: In MMO context, "attacker" and "defender" are relative to whoever initiated the battle. When viewing a saved battle, the original attacker's battalions are at nodes 0,1,2 and the original defender's battalions are at nodes 6,7,8, regardless of who is currently viewing the battle.

#### **Associated Files:**
- `mobile/src/screens/BattlePreparationScreen.tsx` - "Deploy Purge" button and battle start UI
- `mobile/src/components/battle/BattleCountdownOverlay.tsx` - 3-second countdown display
- `mobile/src/components/battle/BattleOverlayManager.tsx` - Manages countdown overlay visibility
- `mobile/src/store/api/battleApi.ts` - startBattle API mutation
- `server/src/controllers/BattleController.ts` - Handles battle start request
- `server/src/routes/battle.ts` - Battle start API endpoint
- `server/src/services/BattleSetupService.ts` - Creates battle with countdown phase
- `server/src/services/BattalionService.ts` - Creates and spawns battalions at home nodes
- `server/src/services/BattleTimer.ts` - Manages 3-second countdown timer
- `server/src/services/BattleService.ts` - Coordinates battle initialization
- `server/src/services/BattleResponseService.ts` - Sends countdown updates to client

##### **Discrepancies:**
- **Button Text Mismatch**: intended.md specifies "Deploy Purge" button, but BattlePreparationScreen.tsx shows "DEPLOY PURGE" (all caps) - this is a minor UI consistency issue
- **Battalion Spawning Logic**: intended.md states battalions spawn at "home nodes (0,1,2 for attacker, 6,7,8 for defender)" but BattalionService.ts shows:
  - Attacker battalions: `nodeIndex = index` (0,1,2) ✅ **CORRECT**
  - Defender battalions: `nodeIndex = index + 6` (6,7,8) ✅ **CORRECT**
  - **Note**: In MMO context, "attacker" and "defender" are relative to whoever initiated the battle. When viewing a saved battle, the original attacker's battalions are at nodes 0,1,2 and the original defender's battalions are at nodes 6,7,8, regardless of who is currently viewing the battle.
- **Countdown Timer**: intended.md specifies "3-second countdown timer" and BattleTimer.ts shows `COUNTDOWN_DURATION: 3` ✅ **CORRECT**
- **Battle Phase Initialization**: intended.md doesn't specify initial phase, but BattleSetupService.ts sets `phase: BattlePhase.COUNTDOWN` ✅ **CORRECT**
- **Timer Service Integration**: intended.md doesn't specify timer service usage, but BattleService.ts properly calls `this.timerService.startTimer(battle.battleId)` ✅ **CORRECT**
- **API Response Structure**: intended.md doesn't specify response format, but BattleResponseService.ts properly handles countdown updates ✅ **CORRECT** 