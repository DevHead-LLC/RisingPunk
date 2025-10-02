# Current Task: Fix State Mutation in Read-Only Method

## THE BUG:
**File:** `server/src/controllers/BattleController.ts` lines 101-104
**Issue:** `MovementService.updateBattleMovement` is being called in the read-only `getBattleState` method
**Problem:** This violates separation of concerns and can cause performance issues and race conditions

## WHAT WE'VE LEARNED:

### ❌ What DIDN'T Work:
1. **Moving movement logic to `handlePhaseChange`** - BROKE defender battalion targeting/attacking
2. **Removing movement logic from `getBattleState`** - BROKE defender battalion targeting/attacking
3. **Previous attempts** - Always broke existing functionality

### ✅ What DOES Work:
1. **Current `getBattleState` with movement logic** - Defender battalions CAN target and attack
2. **The movement logic in `getBattleState`** - Actually works for the battle system
3. **Bot assignment system** - Working correctly (double decrement was fixed)

## ROOT CAUSE ANALYSIS:
**The Real Issue:** The architectural violation exists, but removing it breaks the battle system.

**Key Insight:** The movement logic in `getBattleState` might be necessary for the battle system to work correctly, even though it's architecturally wrong.

**Questions to Investigate:**
1. Why does moving the logic to `handlePhaseChange` break defender targeting?
2. Is there a timing issue? Does `getBattleState` get called at the right time?
3. Are there multiple places where movement needs to be triggered?
4. Is the issue with the timing of when `handlePhaseChange` vs `getBattleState` is called?

## USEFUL LOGS TO ADD:
- When `getBattleState` is called vs when `handlePhaseChange` is called
- Whether defender battalions have targeting results when movement is triggered
- The sequence of events during battle phase transitions

## NOISE LOGS TO REMOVE:
- Client `availableBots` calculation logs (working fine)
- Client assignment logs (working fine)
- Server assignment logs (working fine)

## NEXT STEPS:
1. Add targeted logging to understand the timing difference
2. Investigate why `handlePhaseChange` doesn't work for defender targeting
3. Find a solution that fixes the architectural violation WITHOUT breaking functionality
4. Consider if the movement logic needs to be in BOTH places or a different place entirely