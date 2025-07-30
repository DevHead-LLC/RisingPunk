# **BATTALION POSITION UPDATES & MOVEMENT TRACKING IMPLEMENTATION**

## **🎯 CURRENT FOCUS: Battalion Position Updates & Dynamic Path Adjustment**

**✅ COMPLETED: All previous combat system phases and bug fixes**
**✅ COMPLETED: 3-Second Timer Tests - Server and Client verification**
**🚧 NEW FOCUS: Battalion position updates and movement tracking system**

**🎯 User Requirements:**
1. **Battalions who are moving provide updates on their position once every 500ms**
2. **Battalions who target those moving battalions need to check for position updates every 250ms**
3. **Adjust path to target STAYING ON NETWORK nodes and lines as needed to meet the target in a destination where they are moving**
4. **Stop at the attack distance range for their particular bot unit type when they reach at the intersection or closer to their attack range**

**🐛 Current Issue: Static Targeting with Last Known Position**

**Problem**: When battalions retarget to enemy battalions, they target the last known position and never update. This causes:
- Battalions move to where the target WAS, not where it IS
- No dynamic path adjustment when targets move
- Attack range verification only happens on arrival, not continuously
- No real-time coordination between moving and targeting battalions

**Example Scenario:**
```
User guard battalion (ugb) retargets to enemy guard battalion (egb)
egb begins movement toward ugb along calculated path
ugb finishes attack and retargets to new target, begins movement
egb continues moving to ugb's OLD position (never updates)
egb arrives at empty location and gets stuck
```

**🎯 Required Solution: Dynamic Position Tracking System**

**Implementation Plan:**

### **Phase 1: Position Update Infrastructure**
**Goal:** Implement 500ms position updates for moving battalions

**Files to Modify:**
- `server/src/services/MovementService.ts` - Add position update broadcasting
- `server/src/services/BattalionService.ts` - Add position tracking system
- `server/src/types/battle.ts` - Add position update interfaces

**Implementation Steps:**
1. **Add position update intervals** to MovementService
2. **Broadcast position updates** every 500ms for moving battalions
3. **Store current positions** in battle state for tracking
4. **Add position update logging** for debugging

### **Phase 2: Target Position Monitoring**
**Goal:** Implement 250ms target position checking for pursuing battalions

**Files to Modify:**
- `server/src/services/AttackService.ts` - Add target position monitoring
- `server/src/services/MovementService.ts` - Add path recalculation logic
- `server/src/services/RetargetingService.ts` - Add dynamic targeting updates

**Implementation Steps:**
1. **Add target monitoring intervals** to AttackService
2. **Check target positions** every 250ms for battalions targeting moving enemies
3. **Trigger path recalculation** when target position changes
4. **Update movement paths** to new target destinations

### **Phase 3: Dynamic Path Adjustment**
**Goal:** Implement real-time path recalculation to moving targets

**Files to Modify:**
- `server/src/services/MovementService.ts` - Add dynamic path updates
- `server/src/services/PathfindingService.ts` - Add real-time pathfinding
- `server/src/services/MovementCalculationService.ts` - Add attack range verification

**Implementation Steps:**
1. **Recalculate paths** when target position changes
2. **Stay on network** - all path adjustments follow network lines
3. **Update movement states** with new target destinations
4. **Maintain attack range positioning** during pursuit

### **Phase 4: Attack Range Verification**
**Goal:** Implement continuous attack range checking during pursuit

**Files to Modify:**
- `server/src/services/AttackService.ts` - Add continuous range checking
- `server/src/services/CombatService.ts` - Add range verification logic
- `server/src/services/MovementCalculationService.ts` - Add real-time range calculation

**Implementation Steps:**
1. **Check attack range** every attack cycle during pursuit
2. **Stop attacking** if target moves out of range
3. **Recalculate pursuit** if target moves away
4. **Maintain positioning** at optimal attack range

### **Phase 5: Real-Time Coordination**
**Goal:** Implement synchronized position updates and path adjustments

**Files to Modify:**
- `server/src/services/BattalionService.ts` - Add coordination system
- `server/src/services/MovementService.ts` - Add synchronized updates
- `server/src/types/battle.ts` - Add coordination interfaces

**Implementation Steps:**
1. **Synchronize position updates** between moving and targeting battalions
2. **Coordinate path adjustments** to prevent conflicts
3. **Handle multiple pursuers** targeting same moving battalion
4. **Optimize update frequency** for performance

## **🔧 IMPLEMENTATION APPROACH:**

### **Key Technical Requirements:**
1. **Server Authority:** All position calculations and updates handled server-side
2. **Network Constraints:** All movement and positioning must stay on network lines
3. **Real-Time Updates:** Position updates trigger immediate path recalculation
4. **Performance Optimization:** Efficient update intervals to prevent lag

### **Expected Flow:**
1. **Battalion A** begins movement → broadcasts position every 500ms
2. **Battalion B** targets Battalion A → checks position every 250ms
3. **Battalion A** changes destination → Battalion B recalculates path
4. **Battalion B** adjusts movement → continues pursuit to new destination
5. **Battalion B** reaches attack range → begins attacking with continuous range checking

### **Success Metrics:**
- ✅ Moving battalions provide position updates every 500ms
- ✅ Targeting battalions check positions every 250ms
- ✅ Paths recalculate when targets move
- ✅ Attack range verification happens continuously
- ✅ All movement stays on network lines
- ✅ No battalions get stuck at old positions

## **📝 CURRENT STATUS:**
**✅ COMPLETED: 3-Second Timer Tests**

**Server Test (`server/__tests__/battleTimer.test.ts`):**
- ✅ **PASSING**: Verifies 3-second countdown starts correctly
- ✅ **PASSING**: Verifies user-visible countdown events: 2, 1 (0 triggers battle start)
- ✅ **PASSING**: Verifies phase transition to ACTIVE when countdown reaches 0
- ✅ **PASSING**: Verifies timer remains active after countdown
- ✅ **PASSING**: Uses Jest fake timers for predictable testing

**Manual Tests (`mobile/manual-test.md`):**
- ✅ **CREATED**: Manual test file with simple, concise descriptions
- ✅ **COVERS**: Visual countdown display (3, 2, 1)
- ✅ **COVERS**: Countdown timing (1 second per number)
- ✅ **COVERS**: Overlay visibility and animations
- 🎯 **APPROACH**: Client test removed due to React Native animation incompatibility; manual tests provide visual verification

**READY TO BEGIN PHASE 1** - Position Update Infrastructure

**Next Steps:**
1. Examine current movement update system (100ms intervals)
2. Implement 500ms position broadcasting for moving battalions
3. Add position tracking and storage system
4. Test position update frequency and accuracy