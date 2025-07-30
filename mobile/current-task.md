# **BATTALION NETWORK LINE ADHERENCE TESTING**

## **🎯 CURRENT FOCUS: Battalion Network Line Adherence Verification**

**✅ COMPLETED: All previous combat system phases and bug fixes**
**✅ COMPLETED: 3-Second Timer Tests - Server and Client verification**
**✅ COMPLETED: Battalion Network Line Adherence Tests - Server and Client verification**
**✅ COMPLETED: Battalion Attack Range Tests - Server and Client verification**
**✅ COMPLETED: Movement Speed Tests - Server and Client verification**
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

### **Phase 4: Attack Range Verification** ✅ **COMPLETED**
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

**🎯 BEHAVIOR VERIFIED:**
- ✅ **Server Test**: `server/__tests__/battalionAttackRange.test.ts` - Verifies `MovementCalculationService.calculateAttackRangePosition` correctly calculates attack range positions
- ✅ **Client Test**: `mobile/__tests__/components/battle/battalionAttackRange.test.tsx` - Verifies visual attack range behavior matches server calculations
- ✅ **Bot Stats Integration**: Added `TEST_BOT_STATS` to both `testUtils` files for consistent bot range values
- ✅ **Realistic Dimensions**: Updated test node positions to match actual screen dimension calculations (800x600)
- ✅ **Network Validation**: Tests use valid network connections (Node 0 → Node 3) instead of invalid paths
- ✅ **Range Calculations**: Guardian (32px), Breacher (40px), Phreak (72px) ranges verified
- ✅ **Position Verification**: Battalions move to correct attack range distance from targets

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

**✅ COMPLETED: Battalion Network Line Adherence Tests**

**Server Test (`server/__tests__/battalionNetworkLineAdherence.test.ts`):**
- ✅ **CREATED**: Verifies battalion movement calculations stay on network lines
- ✅ **PASSING**: Tests attack range position calculation using MovementCalculationService
- ✅ **PASSING**: Tests position interpolation along network lines
- ✅ **PASSING**: Uses geometric line segment validation for position accuracy
- ✅ **PASSING**: Validates positions stay within network connection boundaries

**Client Test (`mobile/__tests__/components/battle/battalionNetworkLineAdherence.test.tsx`):**
- ✅ **CREATED**: Verifies battalion visual positions stay on network lines during movement
- ✅ **PASSING**: Tests movement state validation with network connections
- ✅ **PASSING**: Tests movement interpolation between connected nodes
- ✅ **PASSING**: Validates position calculations match server-side logic
- ✅ **PASSING**: Uses same geometric validation as server test for consistency

**🎯 BEHAVIOR VERIFIED**: Battalions stay on network lines as specified in intended.md
- ✅ **Network Constraints**: All movement calculations respect NETWORK_CONNECTIONS
- ✅ **Position Validation**: Interpolated positions lie on line segments between nodes
- ✅ **Attack Range**: Positions calculated at proper attack range distance
- ✅ **Visual Consistency**: Client-side interpolation matches server-side calculations

**✅ COMPLETED: Battalion Attack Range Tests**

**Server Test (`server/__tests__/battalionAttackRange.test.ts`):**
- ✅ **CREATED**: Verifies battalions stop at their attack range when targeting nodes
- ✅ **PASSING**: Tests attack range calculations for different bot types (guardian: 32px, phreak: 72px, breacher: 40px)
- ✅ **PASSING**: Tests movement stops at exact attack range distance from target
- ✅ **PASSING**: Tests no movement when target is already within attack range
- ✅ **PASSING**: Tests attack range detection for in-range and out-of-range targets
- ✅ **PASSING**: Uses shared bot stats from testUtils for consistency

**Client Test (`mobile/__tests__/components/battle/battalionAttackRange.test.tsx`):**
- ✅ **CREATED**: Verifies battalion visual positions stop at attack range when targeting nodes
- ✅ **PASSING**: Tests attack range values for different bot types
- ✅ **PASSING**: Tests attack range positioning in battle state
- ✅ **PASSING**: Tests attack range distance calculations (8 pixels per range unit)
- ✅ **PASSING**: Tests movement stops at attack range distance with geometric validation
- ✅ **PASSING**: Uses shared bot stats from testUtils for consistency

**🎯 BEHAVIOR VERIFIED**: Battalions stop at attack range as specified in intended.md
- ✅ **Attack Range Calculation**: Range = bot.stats.range * 8 pixels
- ✅ **Movement Stopping**: Battalions stop at attack range distance from target
- ✅ **Range Hierarchy**: Phreak (72px) > Breacher (40px) > Guardian (32px)
- ✅ **No Movement**: Battalions don't move if target is already within range
- ✅ **Network Constraints**: All attack range positions stay on network lines

**✅ COMPLETED: Movement Speed Tests**

**Server Test (`server/__tests__/movementSpeed.test.ts`):**
- ✅ **CREATED**: Verifies movement speed follows bot stats during initial movement
- ✅ **PASSING**: Tests movement duration calculation for different bot types (guardian: 2222ms, breacher: 4000ms, phreak: 2857ms)
- ✅ **PASSING**: Tests speed hierarchy: guardian (fastest) > phreak > breacher (slowest)
- ✅ **PASSING**: Tests movement duration formula: BASE_MOVEMENT_TIME_MS / battalion.stats.speed
- ✅ **PASSING**: Tests bot speed values from stats (guardian: 9, breacher: 5, phreak: 7)
- ✅ **PASSING**: Uses shared bot stats from testUtils for consistency

**Client Test (`mobile/__tests__/components/battle/movementSpeed.test.tsx`):**
- ✅ **CREATED**: Verifies movement speed follows bot stats during initial movement visualization
- ✅ **PASSING**: Tests speed values for different bot types
- ✅ **PASSING**: Tests movement duration calculation formula (20000ms / speed)
- ✅ **PASSING**: Tests speed hierarchy: guardian (fastest) > phreak > breacher (slowest)
- ✅ **PASSING**: Tests movement state validation with correct speed stats
- ✅ **PASSING**: Uses shared bot stats from testUtils for consistency

**🎯 BEHAVIOR VERIFIED**: Movement speed follows bot stats as specified in intended.md
- ✅ **Speed Formula**: Duration = BASE_MOVEMENT_TIME_MS / battalion.stats.speed
- ✅ **Speed Hierarchy**: Guardian (9) > Phreak (7) > Breacher (5)
- ✅ **Duration Calculations**: Guardian (2222ms), Breacher (4000ms), Phreak (2857ms)
- ✅ **Base Movement Time**: 20000ms (20 seconds) as configured in MovementCalculationService
- ✅ **Inverse Relationship**: Higher speed = shorter duration, lower speed = longer duration

**READY TO BEGIN PHASE 1** - Position Update Infrastructure

**Next Steps:**
1. Examine current movement update system (100ms intervals)
2. Implement 500ms position broadcasting for moving battalions
3. Add position tracking and storage system
4. Test position update frequency and accuracy