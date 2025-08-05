# CURRENT TASK: Battle Preparation TDD Implementation

## AI DIRECTIVES
- Follow TDD methodology: write failing tests first, implement minimal code to pass, then refactor
- Use testUtils.ts for repetitive data and helper functions
- Keep tests simple and focused on specific behaviors
- Write tests that can be manually verified in the actual application
- Update this file after each batch completion
- Check existing files before creating new ones
- Follow intended.md behaviors strictly

## ❌ CRITICAL ISSUES TO FIX
- ❌ BATTALION UI QUANTITY DISPLAY: When I have a quantity of 100 it looks like 10 and when I have a quantity of 250 it looks like 25
- ❌ ENEMY RANDOM SPAWN: Enemy battalions should spawn at random nodes (6, 7, or 8) instead of fixed positions
- ~~EMPTY DEPLOYMENT PREVENTION~~ ✅ COMPLETED: Users cannot deploy without assigning at least one battalion
- ~~BATTLE TIMER DURATION~~ ✅ COMPLETED: Timer now correctly shows 45 seconds and counts down properly (FINAL FIX: Updated BattleResponseService to use timeRemaining from timerState, cleaned up debug logging and hardcoded values)

## TESTING STRATEGY
- **TEST BATCH 1A**: User battalion assignment and random spawn logic
- **TEST BATCH 1B**: Enemy battalion random spawn logic  
- **TEST BATCH 1C**: Deployment validation (prevent empty deployments)
- **TEST BATCH 1D**: Battle timer duration (45 seconds with proper countdown)
- **TEST BATCH 2A**: Delayed spawning system (first spawns at start, second 1 second after countdown)
- **TEST BATCH 2B**: Enemy random spawn logic
- **TEST BATCH 3A**: Delayed spawn display and retargeting
- **TEST BATCH 4A**: Battalion UI quantity display

## IMPLEMENTATION PRIORITY
1. ✅ **Phase 1: User Battalion Assignment** - COMPLETED
   - ✅ Batch 1A: User battalion assignment and random spawn logic
   - ✅ Batch 1C: Deployment validation
   - ✅ Batch 1D: Battle timer duration (45 seconds)

2. ✅ **Phase 2: Enemy Battalion Spawning** - COMPLETED
   - ✅ Batch 1B: Enemy battalion random spawn logic
   - ✅ Batch 2B: Enemy random spawn logic

3. **Phase 3: Delayed Spawning** - PENDING
   - Batch 2A: Delayed spawning system
   - Batch 3A: Delayed spawn display and retargeting

4. **Phase 4: Battalion UI Quantity Display** - PENDING
   - Batch 4A: Battalion UI quantity display

## FILES TO MODIFY
- `server/src/services/BattalionService.ts` - ✅ COMPLETED: Random spawn logic for both user and enemy
- `server/src/services/BattleTimer.ts` - ✅ COMPLETED: 45-second duration and timeRemaining calculation
- `server/src/services/BattleResponseService.ts` - ✅ COMPLETED: Send timeRemaining to client
- `server/src/types/battle.ts` - ✅ COMPLETED: Added timeRemaining to BattleStateResponse
- `mobile/src/screens/BattlePreparationScreen.tsx` - ✅ COMPLETED: Deployment validation and real data usage
- `mobile/src/components/battle/BattleOverlayManager.tsx` - ✅ COMPLETED: 45-second timer logic
- `mobile/src/components/battle/BattleTimerDisplay.tsx` - ✅ COMPLETED: Display timeRemaining directly
- `BattalionSlot.tsx` - PENDING: Fix quantity display
- `QuantitySelector.tsx` - PENDING: Fix quantity display

## SUCCESS METRICS
- ✅ User battalions spawn at random nodes (0, 1, or 2) instead of fixed positions
- ✅ Enemy battalions spawn at random nodes (6, 7, or 8) instead of fixed positions
- ✅ Multiple battalions can spawn at the same node
- ✅ Users cannot deploy without assigning at least one battalion
- ✅ Battle timer shows 45 seconds and counts down properly (45s → 44s → ... → 0s)
- ✅ Server and client are properly coordinated for timer display
- ❌ Battalion UI shows correct quantities (100 shows as 100, not 10)

## COMPLETED
- ✅ **Batch 1A**: User battalion assignment and random spawn logic
  - Server: `BattalionService.createUserBattalions()` now uses random node selection
  - Client: `BattlePreparationScreen.tsx` now sends real assignment data instead of mock data
  - Tests: `server/__tests__/battlePreparation/spawnNodeAssignment.test.ts` and `mobile/__tests__/battlePreparation/battalionAssignment.test.tsx`

- ✅ **Batch 1B**: Enemy battalion random spawn logic
  - Server: `BattalionService.createEnemyBattalions()` now uses random node selection
  - Tests: `server/__tests__/battlePreparation/enemySpawnNodeAssignment.test.ts`

- ✅ **Batch 1C**: Deployment validation
  - Client: Added `validateDeployment()` function to prevent empty deployments
  - Tests: `mobile/__tests__/battlePreparation/deploymentValidation.test.tsx`

- ✅ **Batch 1D**: Battle timer duration (45 seconds)
  - Server: Updated `BattleTimer.ts` to use 45-second duration and emit timeRemaining
  - Server: Updated `BattleResponseService.ts` to send timeRemaining to client
  - Server: Updated `BattleStateResponse` type to include timeRemaining
  - Server: Updated `battle.ts` route to use timeRemaining from server instead of hardcoded calculation
  - Server: Updated `Battle.ts` model to allow max 45 seconds instead of 20
  - Server: Updated `getTimeRemaining()` method to return timeRemaining for proper countdown
  - Server: Updated `BattleResponseService.ts` to use timeRemaining from timerState instead of calculating locally
  - Server: Added `getTimerConfig()` method to expose TIMER_CONFIG
  - Client: Updated `BattleOverlayManager.tsx` to use 45-second logic
  - Client: Updated `BattleTimerDisplay.tsx` to display timeRemaining directly
  - Client: Created `battleConstants.ts` to centralize battle configuration
  - Client: Replaced hardcoded values with BATTLE_CONFIG constants
  - Cleanup: Removed debug console.log statements from both client and server
  - Tests: `server/__tests__/battleTimer.test.ts` and `mobile/__tests__/battlePreparation/battleTimerDisplay.test.tsx`

## NEXT STEPS
- **Phase 3: Delayed Spawning** - Implement delayed spawn system for multiple battalions at same node
- **Phase 4: Battalion UI Quantity Display** - Fix battalion UI to show correct quantities

## NOTES
- Server-client coordination for timer is now working correctly
- Server sends timeRemaining (45 down to 0) and client displays it directly
- All tests are passing and functionality is verified
- Ready to proceed to Phase 3 or Phase 4 when user is ready