# CURRENT TASK: Battle Loss Tracking & Winner Determination

## AI DIRECTIVES
- Follow TDD methodology: write failing tests first, implement minimal code to pass, then refactor
- Use testUtils.ts for repetitive data and helper functions
- Keep tests simple and focused on specific behaviors
- Write tests that can be manually verified in the actual application
- Update this file after each batch completion
- Check existing files before creating new ones (use existing FIRST)
- Follow intended.md behaviors strictly
- Use authorities pattern - single source of truth for each feature
- No files larger than 250 lines - create new files and import as needed

## CURRENT FOCUS: Battle Loss Tracking System

### **Objective:**
Implement a comprehensive battle loss tracking system that:
1. Tracks starting troops for each battalion (by mark level)
2. Tracks remaining troops at battle end
3. Calculates total losses for user and enemy
4. Determines winner based on fewest losses (not hardcoded)
5. Shows detailed loss breakdown in battle end overlay
6. Handles complete victory scenarios

**FOCUS:** Point system and winner determination only - no timer changes

### **Key Requirements:**
- **Point Values:** Mark 1 = 1 point, Mark 2 = 2 points, Mark 3 = 4 points, Mark 4 = 8 points
- **Loss Calculation:** Starting points - ending points = losses
- **Winner:** Side with fewer losses (closer to zero) wins
- **Victory Messages:** "Attacker breach!" (attacker wins) or "Breach defended!" (defender wins)
- **Complete Victory:** When one side destroys all enemy battalions

### **Current State Analysis:**

#### **What We Have:**
1. **Server-side:**
   - Battalion structure with `mark`, `quantity`, `currentHealth` fields
   - Combat damage tracking in `CombatService.applyBattalionDamage()`
   - Battle end detection (timer & elimination) in `BattleService`
   - Winner field in Battle model and types
   - Basic battle end response in `BattleResponseService`
   - **ISSUE:** Winner hardcoded to ENEMY in `BattleService.handleBattleEnd()`

2. **Client-side:**
   - Basic `BattleEndOverlay` component (shows winner, continue button)
   - Battle state handling with winner field
   - Battalion data with mark and quantity

#### **What We Need:**
1. **Server-side:**
   - PointTrackingService for score calculations
   - Track starting battalion states at battle start
   - Calculate ending scores at battle end
   - Determine winner based on losses (not hardcoded)
   - Include loss data in battle end response

2. **Client-side:**
   - Enhanced BattleEndOverlay with loss display
   - Scrollable loss breakdown by battalion
   - Victory message display
   - Loss calculation visualization

### **Implementation Plan:**

#### **Phase 1: Server-Side Loss Tracking Infrastructure**
- **Batch 1A:** Create PointTrackingService test
  - Test starting score calculation
  - Test ending score calculation
  - Test loss calculation
  - Test winner determination
  
- **Batch 1B:** Implement PointTrackingService
  - `calculateBattalionPoints(battalion)` - points for single battalion
  - `calculateTotalPoints(battalions)` - total points for side
  - `calculateLosses(startingPoints, endingPoints)` - loss calculation
  - `determineWinner(userLosses, enemyLosses)` - winner logic

- **Batch 1C:** Integrate with BattleService
  - Store starting battalion states at battle start
  - Calculate losses at battle end
  - Fix hardcoded winner issue
  - Pass loss data to BattleResponseService

#### **Phase 2: Battle End Data Structure & Response** - ✅ COMPLETED
- ✅ **Batch 2A:** Define battle loss data types
  - Server: `BattleEndData`, `BattleLosses`, `BattalionLoss` interfaces
  - Client: Matching types in battleApi.ts
  - Update BattleStateResponse to include loss data

- ✅ **Batch 2B:** Update BattleResponseService
  - Include loss calculations in response
  - Format battalion losses by mark level
  - Include victory message based on winner
  - Added `createBattleEndData()` method with comprehensive loss tracking

#### **Phase 3: Client-Side Loss Display** - ✅ COMPLETED
- ✅ **Batch 3A:** Create loss display components test
  - Test loss calculation display
  - Test battalion breakdown
  - Test victory messages
  - Test scrollable loss list

- ✅ **Batch 3B:** Implement loss display components
  - `BattleLossBreakdown` - main loss container with scrollable battalion list
  - `BattalionLossItem` - individual battalion loss with color coding
  - Update `BattleEndOverlay` to include losses when battleEndData is available

- ✅ **Batch 3C:** Victory message & complete victory
  - Show appropriate victory message based on winner
  - Handle complete victory scenarios (0 losses for one side)
  - Maintain continue button functionality
  - All tests passing ✅

#### **Phase 4: Integration & Testing**
- **Batch 4A:** End-to-end test
  - Test full flow from battle start to loss display
  - Test various win scenarios
  - Test complete victory

- **Batch 4B:** Manual testing checklist
  - Verify loss calculations are accurate
  - Verify winner determination works correctly
  - Verify UI displays all information clearly

### **Success Metrics:**
- Losses tracked accurately using mark-based point system
- Winner determined by fewest losses (not hardcoded)
- Battle end overlay shows detailed loss breakdown
- Scrollable loss display for many battalions
- Victory messages display correctly
- Complete victory scenarios handled
- All tests pass and functionality manually verifiable

### **Files to Create/Modify:**

**Server:**
- CREATE: `server/src/services/PointTrackingService.ts` (new service)
- CREATE: `server/__tests__/pointTracking.test.ts` (tests)
- UPDATE: `server/src/services/BattleService.ts` (fix winner logic)
- UPDATE: `server/src/services/BattleSetupService.ts` (store starting states)
- UPDATE: `server/src/services/BattleResponseService.ts` (include loss data)
- UPDATE: `server/src/types/battle.ts` (add loss interfaces)
- UPDATE: `server/src/models/Battle.ts` (add loss tracking fields)

**Client:**
- CREATE: `mobile/src/components/battle/BattleLossBreakdown.tsx` (loss display)
- CREATE: `mobile/src/components/battle/BattalionLossItem.tsx` (battalion loss)
- CREATE: `mobile/__tests__/battleLossDisplay.test.tsx` (tests)
- UPDATE: `mobile/src/components/battle/BattleEndOverlay.tsx` (add losses)
- UPDATE: `mobile/src/types/battleTypes.ts` (add loss types)
- UPDATE: `mobile/src/store/api/battleApi.ts` (handle loss data)
- UPDATE: `intended-behaviors/F-battle-end-point-tracking.md` (document changes)

### **Technical Considerations:**
- Use existing battalion data structure (mark, quantity, health)
- Leverage existing combat damage tracking
- Maintain backward compatibility with current overlay
- Keep components under 250 lines (split if needed)
- Use authorities pattern - PointTrackingService owns loss calculations
- Store minimal data - calculate derived values as needed

## ❌ CRITICAL ISSUES TO FIX
- ✅ WINNER HARDCODED: Fixed - now determined by loss calculation
- ✅ NO LOSS TRACKING: Fixed - PointTrackingService implemented
- ✅ NO POINT CALCULATION: Fixed - exponential mark-based scoring implemented
- ✅ NEUTRAL NODE HEALTH BARS: Fixed - maxCaptureThreshold calculation issue resolved
- ❌ BATTALION UI QUANTITY DISPLAY: When I have a quantity of 100 it looks like 10 and when I have a quantity of 250 it looks like 25
- ❌ ENEMY RANDOM SPAWN: Enemy battalions should spawn at random nodes (6, 7, or 8) instead of fixed positions

## COMPLETED
- ✅ **Phase 1: Server-Side Loss Tracking Infrastructure** - COMPLETED
  - ✅ **Batch 1A:** PointTrackingService test created and passing
    - Tests starting score calculation, ending score calculation, loss calculation, winner determination
    - All 17 tests passing ✅
  - ✅ **Batch 1B:** PointTrackingService implemented
    - `calculateBattalionPoints()` - exponential scoring (Mark 1=1, Mark 2=2, Mark 3=4, Mark 4=8)
    - `calculateTotalPoints()` - total points for side, filters destroyed battalions
    - `calculateLosses()` - starting points minus ending points
    - `determineWinner()` - side with fewer losses wins, defender wins ties
    - `calculateBattleLosses()` - complete battle loss calculation for both sides
  - ✅ **Batch 1C:** BattleService integration completed
    - Added `startingBattalions` field to Battle model and IBattle interface
    - BattleSetupService stores starting battalion states at battle creation
    - Fixed hardcoded winner issue in `BattleService.handleBattleEnd()`
    - Winner now determined by loss calculation instead of always ENEMY
    - Integration tests verify correct winner determination
    - Fixed neutral node health bar issue (maxCaptureThreshold calculation)
    - Added safety checks to prevent division by zero in damage calculations
- ✅ Basic battle end detection and overlay implemented
- ✅ Winner field exists in data structures
- ✅ Battalion data includes mark and quantity
- ✅ Combat damage tracking exists

## NEXT STEPS
1. Start with Phase 1, Batch 1A - Create PointTrackingService test
2. Follow TDD approach throughout implementation
3. Update F-battle-end-point-tracking.md with implementation details
4. Manual test each phase before moving to next