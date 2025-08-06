# F. Battle End & Point Tracking System

## Table of Contents

### [A. Battle Initialization & Setup](A-battle-initialization-setup.md)
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

## 17. Battle Duration & End Conditions
- **Battle Duration:** 45 seconds (increased from 20 seconds)
- **Battle End Conditions:**
  - **Timer Expiration:** Battle ends when 45-second timer reaches 0
  - **Complete Elimination:** Battle ends when all opposing battalions are defeated
- **Timer Management:** BattleTimer.ts manages countdown and triggers battle end
- **End Detection:** BattleService.ts detects both timer expiration and complete elimination

#### **Associated Files:**
- `server/src/services/BattleTimer.ts` - `BATTLE_DURATION: 45` (updated from 20), `endBattle()` triggers battle end
- `server/src/services/BattleService.ts` - `checkBattleEndConditions()`, `handleBattleEnd()` detect and handle battle end
- `server/src/services/CombatService.ts` - `checkAllBattalionsDefeated()` detects complete elimination
- `server/src/controllers/BattleController.ts` - Sends battle end state to client
- `mobile/src/components/battle/BattleTimerDisplay.tsx` - Shows 45-second countdown timer
- `mobile/src/store/api/battleApi.ts` - Client-side battle end state handling
- `server/src/types/battle.ts` - Defines battle end conditions and winner determination
- `mobile/src/types/battleTypes.ts` - Client-side battle end types

##### **Discrepancies:**
- **BattleTimer.ts - Partially Implemented:**
  - **✅ EXISTS:** `BATTLE_DURATION: 20` (line 5) - needs update to 30
  - **✅ EXISTS:** `endBattle()` method (line 164) - triggers battle end
  - **✅ EXISTS:** Timer expiration logic (line 154) - checks `timer.battleTime >= TIMER_CONFIG.BATTLE_DURATION`
  - **❌ MISSING:** Update duration from 20 to 30 seconds

- **BattleService.ts - Partially Implemented:**
  - **✅ EXISTS:** `handleBattleEnd()` method (line 116) - handles timer end
  - **✅ EXISTS:** Timer event listeners setup - `setupTimerListeners()` method
  - **❌ MISSING:** `checkBattleEndConditions()` method - needs to detect both timer and elimination
  - **❌ MISSING:** Complete elimination detection logic - no method to check if all battalions defeated

- **CombatService.ts - Missing:**
  - **❌ MISSING:** `checkAllBattalionsDefeated()` method - no method exists
  - **✅ EXISTS:** Battalion destruction logic in `applyBattalionDamage()` - sets `isDestroyed = true`
  - **✅ EXISTS:** `canTargetBattalion()` method - checks `!battalion.isDestroyed`

- **BattleController.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state handling - `getBattleState()` method
  - **❌ MISSING:** Battle end state sending to client - no winner determination
  - **❌ MISSING:** Winner determination logic - no logic to determine winner

- **BattleTimerDisplay.tsx - Implemented:**
  - **✅ EXISTS:** Shows countdown timer - `timerText` calculation
  - **✅ EXISTS:** Progress bar visualization - `progressFillStyle`
  - **❌ MISSING:** Update to show 30-second countdown - currently uses `maxBattleTime` prop

- **battleApi.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state handling - `BattleState` interface
  - **❌ MISSING:** Battle end state handling - no end condition types
  - **❌ MISSING:** Winner determination types - no winner field in interface

- **battle.ts (Server Types) - Partially Implemented:**
  - **✅ EXISTS:** `BattlePhase.COMPLETE` enum - for battle end phase
  - **✅ EXISTS:** `winner?: NodeOwner` field - for storing winner
  - **❌ MISSING:** Battle end conditions interface - no `BattleEndConditions` type
  - **❌ MISSING:** Winner determination types - no end reason types

- **battleTypes.ts (Mobile Types) - Missing:**
  - **❌ MISSING:** Battle end conditions types - no end condition interface
  - **❌ MISSING:** Winner determination types - no winner field in client types

## 18. Point Tracking System (Loss-Based Scoring)
- **Point Calculation:** Based on bot Mark levels with exponential scoring
  - **Mark 1:** 1 point per bot
  - **Mark 2:** 2 points per bot  
  - **Mark 3:** 4 points per bot
  - **Mark 4:** 8 points per bot
- **Starting Score Calculation:** Total starting points for each bot type mark in each battalion
  - **Formula:** `(botMark * botQuantity)` for each battalion
  - **Example:** Mark 1 × 10 bots = 10 points, Mark 2 × 10 bots = 20 points
- **Ending Score Calculation:** Remaining points for each bot type mark, rounded down to floor
  - **Formula:** `Math.floor(botMark * remainingQuantity)` for each battalion
  - **Example:** Mark 2 × 5 remaining bots = Math.floor(2 × 5) = 10 points
- **Loss Calculation:** Starting score minus ending score = total losses
  - **Formula:** `startingScore - endingScore = losses`
  - **Example:** Starting 50 points, ending 0 points = -50 losses
- **Winner Determination:** Side with fewer losses (closer to zero) wins
  - **Attacker wins:** "Attacker breach!" (attacker had fewer losses)
  - **Defender wins:** "Breach defended!" (defender had fewer losses)

#### **Associated Files:**
- `server/src/services/PointTrackingService.ts` - `calculateStartingScore()`, `calculateEndingScore()`, `trackBattleScores()`
- `server/src/services/BattalionService.ts` - `calculateBattalionPoints()` calculates points for individual battalions
- `server/src/services/CombatService.ts` - `updateScoreAfterDamage()` updates scores after each damage event
- `server/src/types/battle.ts` - Defines `BattleScore` interface with userScore, enemyScore, startingScores, endingScores
- `server/src/models/Battle.ts` - Database schema for battle scores and point tracking
- `server/src/controllers/BattleController.ts` - Sends score updates to client during battle
- `mobile/src/store/api/battleApi.ts` - Client-side score tracking types
- `mobile/src/components/battle/BattleScoreDisplay.tsx` - Real-time score display during battle

##### **Discrepancies:**
- **PointTrackingService.ts - Missing:**
  - **❌ MISSING:** `calculateStartingScore()` method - no method exists
  - **❌ MISSING:** `calculateEndingScore()` method - no method exists
  - **❌ MISSING:** `trackBattleScores()` method - no method exists
  - **❌ MISSING:** Exponential scoring logic - no Mark-based point calculation

- **BattalionService.ts - Partially Implemented:**
  - **❌ MISSING:** `calculateBattalionPoints()` method - no method exists
  - **✅ EXISTS:** Battalion creation with `mark: 1` default - `createBattalion()` method
  - **✅ EXISTS:** Battalion structure with mark field - `IBattalion` interface
  - **✅ EXISTS:** Quantity and health tracking - battalion properties

- **CombatService.ts - Partially Implemented:**
  - **❌ MISSING:** `updateScoreAfterDamage()` method - no method exists
  - **✅ EXISTS:** `applyBattalionDamage()` method - handles battalion destruction
  - **✅ EXISTS:** Battalion destruction logic - sets `isDestroyed = true`
  - **✅ EXISTS:** Health tracking - updates `currentHealth` and `quantity`

- **battle.ts (Server Types) - Missing:**
  - **❌ MISSING:** `BattleScore` interface - no interface exists
  - **❌ MISSING:** `userScore`, `enemyScore` fields - no score tracking types
  - **❌ MISSING:** `startingScores`, `endingScores` fields - no score history types
  - **✅ EXISTS:** `mark: number` field in `IBattalion` - for point calculation

- **Battle.ts (Database Model) - Partially Implemented:**
  - **✅ EXISTS:** Battalion sub-schema with mark field - `mark: { type: Number, min: 1 }`
  - **✅ EXISTS:** Owner field for user/enemy distinction - `owner: { enum: Object.values(NodeOwner) }`
  - **❌ MISSING:** Battle scores schema - no score tracking fields
  - **❌ MISSING:** Point tracking fields - no starting/ending score storage

- **BattleController.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state handling - `getBattleState()` method
  - **❌ MISSING:** Score updates sending to client - no score tracking
  - **❌ MISSING:** Point calculation integration - no score calculation

- **battleApi.ts - Missing:**
  - **❌ MISSING:** Client-side score tracking types - no score interfaces
  - **❌ MISSING:** Real-time score updates - no score state handling
  - **✅ EXISTS:** Battalion structure with mark field - `mark: number` in interface

- **BattleScoreDisplay.tsx - Missing:**
  - **❌ MISSING:** Real-time score display component - file doesn't exist
  - **❌ MISSING:** Score visualization - no score UI components
  - **❌ MISSING:** Point calculation display - no score breakdown

## 19. Battle End Overlay Screen
- **Overlay Display:** Full-screen overlay appears when battle ends
- **Loss Summary:** Shows starting vs ending scores and total losses for both user and enemy
- **Battalion Losses:** Displays bot quantity losses for each battalion by Mark level
- **Winner Determination:** Side with fewer losses (closer to zero) wins
- **Victory Messages:** 
  - **Attacker wins:** "Attacker breach!" (attacker had fewer losses)
  - **Defender wins:** "Breach defended!" (defender had fewer losses)
- **Detailed Breakdown:** Shows individual battalion contributions to total losses
- **Visual Design:** Clean, informative layout with clear loss comparison and winner indication

#### **Associated Files:**
- `mobile/src/components/battle/BattleEndOverlay.tsx` - Main overlay component with score display
- `mobile/src/components/battle/BattleLossBreakdown.tsx` - Detailed loss breakdown by battalion
- `mobile/src/components/battle/BattalionLossDisplay.tsx` - Individual battalion loss display
- `mobile/src/components/battle/VictoryMessage.tsx` - Victory message display
- `mobile/src/screens/BattleGridScreen.tsx` - Manages overlay visibility and battle end state
- `mobile/src/store/api/battleApi.ts` - Client-side battle end data types
- `mobile/src/types/battleTypes.ts` - Battle end overlay data structures
- `server/src/controllers/BattleController.ts` - Sends complete battle end data including scores
- `server/src/services/BattleResponseService.ts` - Formats battle end response with scores and losses

##### **Discrepancies:**
- **BattleEndOverlay.tsx - Missing:**
  - **❌ MISSING:** Main overlay component - file doesn't exist
  - **❌ MISSING:** Full-screen overlay display - no overlay component
  - **❌ MISSING:** Score display functionality - no score visualization
  - **❌ MISSING:** Loss summary display - no loss breakdown UI

- **BattleLossBreakdown.tsx - Missing:**
  - **❌ MISSING:** Detailed loss breakdown component - file doesn't exist
  - **❌ MISSING:** Battalion loss display - no loss visualization
  - **❌ MISSING:** Score comparison UI - no starting vs ending score display
  - **❌ MISSING:** Loss calculation display - no loss formula visualization

- **BattalionLossDisplay.tsx - Missing:**
  - **❌ MISSING:** Individual battalion loss component - file doesn't exist
  - **❌ MISSING:** Bot quantity loss display - no quantity tracking UI
  - **❌ MISSING:** Mark level loss breakdown - no mark-based loss display
  - **❌ MISSING:** Battalion-specific loss visualization - no per-battalion UI

- **VictoryMessage.tsx - Missing:**
  - **❌ MISSING:** Victory message component - file doesn't exist
  - **❌ MISSING:** "Attacker breach!" message - no attacker victory UI
  - **❌ MISSING:** "Breach defended!" message - no defender victory UI
  - **❌ MISSING:** Winner determination display - no winner indication

- **BattleGridScreen.tsx - Partially Implemented:**
  - **✅ EXISTS:** Basic battle screen structure - main container component
  - **✅ EXISTS:** Battle overlay management - `BattleOverlayManager` integration
  - **❌ MISSING:** Battle end overlay visibility - no end overlay management
  - **❌ MISSING:** Battle end state handling - no end state integration

- **battleApi.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state handling - `BattleState` interface
  - **✅ EXISTS:** Victory/defeat phases - `phase: 'victory' | 'defeat'` in interface
  - **❌ MISSING:** Battle end data types - no end data interface
  - **❌ MISSING:** Loss data handling - no loss tracking types

- **battleTypes.ts (Mobile Types) - Missing:**
  - **❌ MISSING:** Battle end overlay data structures - no end data types
  - **❌ MISSING:** Loss breakdown types - no loss data interfaces
  - **❌ MISSING:** Victory message types - no victory data types
  - **❌ MISSING:** Winner determination types - no winner data types

- **BattleController.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state handling - `getBattleState()` method
  - **❌ MISSING:** Complete battle end data sending - no end data response
  - **❌ MISSING:** Score and loss data integration - no score tracking
  - **❌ MISSING:** Winner determination logic - no winner calculation

- **BattleResponseService.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state response - `createBattleStateResponse()` method
  - **✅ EXISTS:** Winner field handling - `winner: battle.winner` in response
  - **❌ MISSING:** Battle end response formatting - no end-specific response
  - **❌ MISSING:** Score and loss data formatting - no score integration

## 20. Battle End Data Structure
- **Battle End Response:** Complete data package sent to client when battle ends
- **Score Data:** Starting and ending scores for both sides
- **Loss Data:** Total losses and individual battalion losses with bot quantities by Mark level
- **Winner Data:** Determined winner based on fewer losses and victory message
- **Timing Data:** Battle duration and end condition (timer vs elimination)

#### **Associated Files:**
- `server/src/types/battle.ts` - Defines `BattleEndData` interface with scores, losses, winner
- `server/src/models/Battle.ts` - Database schema for battle end data storage
- `server/src/controllers/BattleController.ts` - Sends `BattleEndData` to client
- `mobile/src/types/battleTypes.ts` - Client-side battle end data types
- `mobile/src/store/api/battleApi.ts` - API response types for battle end data
- `mobile/src/components/battle/BattleEndOverlay.tsx` - Consumes and displays battle end data 

##### **Discrepancies:**
- **battle.ts (Server Types) - Missing:**
  - **❌ MISSING:** `BattleEndData` interface - no interface exists
  - **❌ MISSING:** Score data fields - no score tracking types
  - **❌ MISSING:** Loss data fields - no loss tracking types
  - **❌ MISSING:** Winner data fields - no winner determination types
  - **❌ MISSING:** Timing data fields - no end condition types

- **Battle.ts (Database Model) - Partially Implemented:**
  - **✅ EXISTS:** Basic battle schema - main battle document structure
  - **✅ EXISTS:** Winner field - `winner: { type: String, enum: Object.values(NodeOwner) }`
  - **✅ EXISTS:** End time field - `endTime: { type: Date, required: false }`
  - **❌ MISSING:** Battle scores schema - no score tracking fields
  - **❌ MISSING:** Point tracking fields - no starting/ending score storage
  - **❌ MISSING:** Loss data fields - no loss tracking storage

- **BattleController.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state handling - `getBattleState()` method
  - **✅ EXISTS:** Battle creation - `startBattle()` method
  - **❌ MISSING:** `BattleEndData` sending - no end data response method
  - **❌ MISSING:** Score and loss data integration - no score tracking
  - **❌ MISSING:** Winner determination logic - no winner calculation

- **battleTypes.ts (Mobile Types) - Missing:**
  - **❌ MISSING:** Client-side battle end data types - no end data interfaces
  - **❌ MISSING:** Score data types - no score tracking interfaces
  - **❌ MISSING:** Loss data types - no loss tracking interfaces
  - **❌ MISSING:** Winner data types - no winner determination interfaces

- **battleApi.ts - Partially Implemented:**
  - **✅ EXISTS:** Basic battle state handling - `BattleState` interface
  - **✅ EXISTS:** API endpoints - `startBattle` and `getBattleState` mutations
  - **❌ MISSING:** Battle end data API response types - no end data interface
  - **❌ MISSING:** Score and loss data handling - no score tracking types
  - **❌ MISSING:** Winner determination types - no winner data types

- **BattleEndOverlay.tsx - Missing:**
  - **❌ MISSING:** Battle end overlay component - file doesn't exist
  - **❌ MISSING:** `BattleEndData` consumption - no end data handling
  - **❌ MISSING:** Score and loss display - no data visualization
  - **❌ MISSING:** Winner determination display - no winner indication 