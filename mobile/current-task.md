# BATTLE VICTORY LEVELING SYSTEM - CURRENT FOCUS

## OVERVIEW
Implementing a comprehensive leveling system where users gain experience and level up when winning battles against NPCs. This system will include NPC experience values, payouts, battle end triggers, experience tracking, and progressive level requirements.

## PHASE 1: NPC EXPERIENCE & PAYOUT SYSTEM
**Status: 🔄 IN PROGRESS**

### Step 1.1: Provide NPCs with Level-Based Experience Amounts
- [ ] Define experience values for each NPC level
- [ ] Update NPC creation/configuration to include experience rewards
- [ ] Ensure experience scales appropriately with NPC difficulty

### Step 1.2: Provide NPCs with Level-Based Payouts  
- [ ] Define payout amounts for each NPC level
- [ ] Update NPC creation/configuration to include payout rewards
- [ ] Ensure payouts scale appropriately with NPC difficulty

## PHASE 2: BATTLE END TRIGGER SYSTEM
**Status: ⏳ PENDING**

### Step 2.1: Implement End-of-Battle Trigger
- [ ] Create trigger for when defender's battalions are entirely defeated
- [ ] Ensure trigger works for ALL battle types (user vs NPC, user vs user)
- [ ] Implement proper battle state management for end conditions

### Step 2.2: Attacker Reward Distribution
- [ ] Award experience to attacker upon victory
- [ ] Award payouts to attacker upon victory
- [ ] Ensure rewards are properly calculated and distributed

## PHASE 3: USER EXPERIENCE TRACKING
**Status: ⏳ PENDING**

### Step 3.1: Ongoing Experience Total Tracking
- [ ] Implement persistent experience storage in user model
- [ ] Ensure experience accumulates across multiple battles
- [ ] Add experience display in user interface

### Step 3.2: Experience Persistence
- [ ] Verify experience is saved to database after each battle
- [ ] Ensure experience survives server restarts
- [ ] Add experience history/logging for debugging

## PHASE 4: LEVEL PROGRESSION SYSTEM
**Status: ⏳ PENDING**

### Step 4.1: Level Increment Logic
- [ ] Implement check for experience meeting next level requirements
- [ ] Increment user level by 1 when requirements met
- [ ] Update user model and database accordingly

### Step 4.2: Progressive Experience Requirements
- [ ] Start with 1.5x multiplier for next level experience
- [ ] Implement .1x multiplier increase for each subsequent level
- [ ] Cap maximum multiplier at 3.0x
- [ ] Ensure proper calculation and storage of next level requirements

## IMPLEMENTATION APPROACH
- **Follow .cursor/rules/ directory files strictly** - Use intended.md, battle-intentions.md, and other authority files
- **One step at a time** - Complete each step before moving to next
- **Test thoroughly** - Verify each component works before proceeding
- **Maintain single source of truth** - Avoid duplicating logic across files
- **Use existing services** - Leverage BattleService, CombatService, etc. where possible

## NEXT ACTION
Complete Step 1.1: Provide NPCs with Level-Based Experience Amounts