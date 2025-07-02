# Battle Sequence Corrections

**NOTE: This file tracks small-batch changes needed to align current implementation with intended behavior.**

## Rules for Corrections

1. **Small-batch changes only** - Each step should be testable independently
2. **Focus on one change at a time** - Avoid ripple effects and sweeping changes
3. **Preserve existing functionality** - Only change what's needed for intended behavior
4. **Minimize logs** - Clean up logs between steps once verified as functional
5. **Testable steps** - Each change should be verifiable by manual testing
6. **File and function specific** - Note exact locations where changes are needed
7. **Manual testing by user** - Changes will be tested manually and results reported back
8. **Forward-only progression** - Once a step is completed, no regressions against its intended behaviors
9. **Conflict awareness** - Each step notes potential conflicts with other steps or intended behaviors
10. **Progressive testing** - Each step includes expected behaviors and known temporary regressions

## Progressive Testing Framework

### Testing Philosophy
- **Baseline Establishment:** Each step establishes a new baseline of intended behavior
- **Temporary Regressions:** Some behaviors may temporarily break but will be corrected in later steps
- **Critical Path Testing:** Focus on the specific behavior being corrected in each step
- **Regression Detection:** Distinguish between temporary regressions and critical failures

### Testing Categories
1. **Primary Test Criteria:** The specific behavior being corrected in this step
2. **Baseline Verification:** Ensure previous steps' intended behaviors are maintained
3. **Known Temporary Regressions:** Behaviors that will break temporarily but be corrected later
4. **Critical Failures:** Behaviors that indicate a serious problem requiring immediate attention
5. **Log Management:** What logs to add, monitor, and clean up

### Testing Progression Rules
- **Step 1:** Establish foundation - test thoroughly before proceeding
- **Steps 2-3:** Movement and animation - critical for all subsequent steps
- **Steps 4-5:** Targeting and combat - complex interdependencies
- **Step 6:** Battle end and results - final integration testing

### Log Management Strategy
- **Add logs:** Include specific debug logs for the behavior being tested
- **Monitor logs:** Watch for expected vs unexpected behavior patterns
- **Clean up logs:** Remove debug logs once step is verified as working
- **Preserve logs:** Keep any logs that help with subsequent step debugging

## Step 1 Corrections

### Step 1.1: Node Ownership System Implementation
**Current State:** Uses `controlState` properties and `isNeutral()` utility
**Intended State:** Use separate arrays (`neutralNodes`, `userNodes`, `enemyNodes`) for ownership tracking

**Files to Modify:**
- `mobile/src/utils/nodeOwnership.ts` - Implement array-based ownership system
- `mobile/src/hooks/useBattleInitialization.ts` - Initialize ownership arrays instead of controlState

**Functions to Change:**
- `isNeutral()` - Update to check array membership instead of controlState
- `captureNode()` - Update to move nodes between arrays instead of changing controlState
- `initializeNodeOwnership()` - New function to set up initial arrays

**Test Criteria:**
- **Primary:** Nodes 0,1,2 show as user-controlled (blue)
- **Primary:** Nodes 6,7,8 show as enemy-controlled (red) 
- **Primary:** Nodes 3,4,5 show as neutral (secondary color)
- **Primary:** Only neutral nodes can be targeted initially
- **Baseline:** Battle initialization completes without errors
- **Baseline:** Network visualization renders correctly

**Known Temporary Regressions:**
- **Targeting may break:** Node targeting logic will temporarily fail until Step 1.2 is completed
- **Capture may not work:** Node capture will not function until Step 1.2 updates `handleNodeCapture()`
- **Console errors expected:** Some controlState-related errors may appear until Step 1.2

**Critical Failures:**
- **Battle won't start:** If initialization fails completely
- **Visual corruption:** If network nodes don't render at all
- **Array errors:** If ownership arrays are not properly initialized

**Log Management:**
- **Add:** `console.log('Node ownership initialized:', { neutralNodes, userNodes, enemyNodes })`
- **Add:** `console.log('isNeutral check:', nodeIndex, isNeutral(nodeIndex))`
- **Monitor:** Array initialization and `isNeutral()` function calls
- **Clean up:** Remove ownership logs once Step 1.2 is completed

**CONFLICT NOTES:**
- **Step 1.2 dependency:** This step must be completed before Step 1.2 can remove controlState references
- **Step 4.1 impact:** Changes to `isNeutral()` function will affect target validation logic in Step 4.1
- **Step 5.1 impact:** Array-based ownership will be used by `findAvailableTargets()` in Step 5.1
- **Step 6.1 impact:** Empty `neutralNodes` array check in Step 6.1 depends on this implementation

### Step 1.2: Remove ControlState Dependencies
**Current State:** Code references `controlState` properties throughout
**Intended State:** Remove all `controlState` references, use array-based system only

**Files to Modify:**
- `mobile/src/types/battle.ts` - Remove controlState from BattleNode interface
- `mobile/src/hooks/useBattleEngine.ts` - Update target validation logic
- `mobile/src/hooks/useTargeting.ts` - Update node capture handling

**Functions to Change:**
- `selectTargetNode()` - Remove controlState checks, use array-based validation
- `handleNodeCapture()` - Update to work with array system
- Any functions using `node.controlState` - Replace with array membership checks

**Test Criteria:**
- **Primary:** No console errors related to controlState
- **Primary:** Node targeting works correctly with array-based system
- **Primary:** Node capture updates ownership arrays properly
- **Baseline:** All Step 1.1 behaviors are maintained (node colors, initialization)
- **Baseline:** Network visualization continues to work correctly

**Known Temporary Regressions:**
- **Retargeting may break:** Retargeting logic will temporarily fail until Step 4.1 is completed
- **Battalion targeting may break:** Battalion targeting will not work until Step 5.1 is completed
- **Battle end detection may break:** Battle end detection will not work until Step 6.1 is completed

**Critical Failures:**
- **Targeting completely broken:** If no nodes can be targeted at all
- **Capture doesn't work:** If node capture fails to update ownership arrays
- **Visual corruption:** If node colors don't update after capture

**Log Management:**
- **Add:** `console.log('Node capture:', nodeIndex, 'from', oldState, 'to', newState)`
- **Add:** `console.log('Target selection:', availableTargets, 'selected:', selectedTarget)`
- **Monitor:** Node capture operations and target selection logic
- **Clean up:** Remove capture logs once Step 4.1 is completed

**CONFLICT NOTES:**
- **Step 1.1 dependency:** Must be completed AFTER Step 1.1 is implemented and tested
- **Step 4.1 impact:** Changes to `handleNodeCapture()` will affect retargeting logic in Step 4.1
- **Step 5.1 impact:** Changes to `selectTargetNode()` will affect targeting logic in Step 5.1
- **Step 6.1 impact:** Array-based capture logic will be used by battle end detection in Step 6.1

### Step 1.3: Performance Optimization Implementation
**Current State:** No specific performance optimizations noted
**Intended State:** Minimize array operations and state changes to limit action calls

**Files to Modify:**
- `mobile/src/hooks/useBattleInitialization.ts` - Optimize array operations
- `mobile/src/utils/nodeOwnership.ts` - Implement memoized state changes

**Functions to Change:**
- `captureNode()` - Add memoization to prevent unnecessary re-renders
- `updateNodeOwnership()` - New function with optimized array operations
- Add React.memo or useMemo where appropriate

**Test Criteria:**
- **Primary:** Node capture doesn't cause excessive re-renders
- **Primary:** Array operations are efficient (no performance lag)
- **Primary:** State changes are minimized during battle
- **Baseline:** All Step 1.1 and 1.2 behaviors are maintained
- **Baseline:** Performance is at least as good as before optimization

**Known Temporary Regressions:**
- **None expected:** This is a performance optimization that shouldn't break functionality

**Critical Failures:**
- **Performance degradation:** If performance is worse than before optimization
- **Functionality broken:** If node capture or targeting stops working
- **Memory leaks:** If optimization introduces memory leaks

**Log Management:**
- **Add:** `console.log('Capture performance:', Date.now() - startTime, 'ms')`
- **Add:** `console.log('State change count:', stateChangeCount)`
- **Monitor:** Performance metrics and state change frequency
- **Clean up:** Remove performance logs once verified as working

**CONFLICT NOTES:**
- **Step 1.1 dependency:** Must be completed AFTER Step 1.1 array system is implemented
- **Step 1.2 dependency:** Must be completed AFTER Step 1.2 removes controlState references
- **Step 4.1 impact:** Optimized `captureNode()` will be used by retargeting system in Step 4.1
- **Step 5.3 impact:** Optimized state changes will affect destruction notification system in Step 5.3

### Step 1.4: Network Visualization Component Integration
**Current State:** Network visualization details not fully integrated
**Intended State:** Ensure NetworkNode and NetworkLines components work with new ownership system

**Files to Modify:**
- `mobile/src/components/battle/NetworkNode.tsx` - Update to use array-based ownership
- `mobile/src/components/battle/NetworkLines.tsx` - Ensure proper connection rendering

**Functions to Change:**
- NetworkNode rendering logic - Update color determination to use arrays
- NetworkLines connection logic - Ensure NETWORK_CONNECTIONS array is used correctly

**Test Criteria:**
- **Primary:** Network nodes display correct colors based on ownership arrays
- **Primary:** Connection lines render properly between nodes
- **Primary:** Visual updates happen immediately when ownership changes
- **Baseline:** All Step 1.1, 1.2, and 1.3 behaviors are maintained
- **Baseline:** Network visualization performance is acceptable

**Known Temporary Regressions:**
- **Movement validation may break:** Movement validation will not work until Step 3.2 is completed
- **Moving target visualization may break:** Moving target handling will not work until Step 4.3 is completed

**Critical Failures:**
- **Network doesn't render:** If network nodes or lines don't appear at all
- **Colors don't update:** If node colors don't change when ownership changes
- **Performance issues:** If network rendering causes significant lag

**Log Management:**
- **Add:** `console.log('Network render:', { nodeCount, connectionCount })`
- **Add:** `console.log('Color update:', nodeIndex, 'to', newColor)`
- **Monitor:** Network rendering performance and color update frequency
- **Clean up:** Remove network logs once Step 3.2 is completed

**CONFLICT NOTES:**
- **Step 1.1 dependency:** Must be completed AFTER Step 1.1 array system is implemented
- **Step 1.2 dependency:** Must be completed AFTER Step 1.2 removes controlState references
- **Step 3.2 impact:** Network line rendering will be critical for movement validation in Step 3.2
- **Step 4.3 impact:** Network visualization will be important for moving target handling in Step 4.3

## Step 2 Corrections

### Step 2.1: Animation Coordination Integration
**Current State:** Animation coordination details not fully integrated into step 2
**Intended State:** Ensure `useBattleStateMachine` properly manages phase transitions and animations

**Files to Modify:**
- `mobile/src/hooks/useBattleStateMachine.ts` - Ensure proper animation coordination
- `mobile/src/screens/BattleScreen.tsx` - Verify phase transition handling

**Functions to Change:**
- `transitionTo('active')` - Ensure proper animation timing and cleanup
- `startBattleTimer()` - Verify 20-second countdown starts correctly
- Animation cleanup functions - Ensure proper memory management

**Test Criteria:**
- **Primary:** Countdown overlay disappears smoothly when reaching 0
- **Primary:** Battle timer starts immediately at 20 seconds
- **Primary:** No animation memory leaks or performance issues
- **Primary:** Phase transition from 'countdown' to 'active' works correctly
- **Baseline:** All Step 1 behaviors are maintained (node ownership, targeting, visualization)
- **Baseline:** Battle initialization completes successfully

**Known Temporary Regressions:**
- **Battle end detection may break:** Battle end detection will not work until Step 6.1 is completed
- **Results display may break:** Results display will not work until Step 6.2 is completed
- **Movement monitoring timing may be off:** Movement monitoring timing will be adjusted in Step 4.2

**Critical Failures:**
- **Battle won't start:** If countdown doesn't transition to active phase
- **Timer doesn't work:** If 20-second timer doesn't start or count down
- **Memory leaks:** If animations cause significant memory issues
- **Performance degradation:** If animation coordination causes lag

**Log Management:**
- **Add:** `console.log('Phase transition:', oldPhase, '->', newPhase)`
- **Add:** `console.log('Timer start:', Date.now(), 'duration: 20s')`
- **Add:** `console.log('Animation cleanup:', cleanedUpIntervals)`
- **Monitor:** Phase transitions, timer accuracy, animation performance
- **Clean up:** Remove animation logs once Step 2.3 is completed

**CONFLICT NOTES:**
- **Step 1 dependency:** Must be completed AFTER all Step 1 corrections are implemented
- **Step 6.1 impact:** `startBattleTimer()` changes will affect battle end detection in Step 6.1
- **Step 6.2 impact:** Phase transitions will be important for results display in Step 6.2
- **Step 4.2 impact:** Animation coordination will affect movement monitoring timing in Step 4.2

### Step 2.2: Battle Coordination Hook Activation
**Current State:** `useBattleCoordination` hook activation may not be properly synchronized
**Intended State:** Ensure hook activates exactly when `phase === 'active' && !battleStarted`

**Files to Modify:**
- `mobile/src/screens/BattleScreen.tsx` - Verify `battleStarted` state management
- `mobile/src/hooks/useBattleCoordination.ts` - Ensure proper activation timing

**Functions to Change:**
- `useEffect([phase, battleStarted])` - Verify condition logic
- `useBattleCoordination` initialization - Ensure proper timing
- Battalion behavior activation - Verify targeting and movement logic starts

**Test Criteria:**
- **Primary:** `battleStarted` state sets to true exactly when phase becomes 'active'
- **Primary:** `useBattleCoordination` hook activates immediately
- **Primary:** Battalions begin targeting and movement logic without delay
- **Primary:** No premature activation or delayed activation
- **Baseline:** All Step 1 and 2.1 behaviors are maintained
- **Baseline:** Phase transitions work correctly

**Known Temporary Regressions:**
- **Movement precision may be off:** Movement precision will be corrected in Step 3.1
- **Retargeting may not work:** Retargeting system will be implemented in Step 4.1
- **Battalion targeting may not work:** Battalion targeting will be implemented in Step 5.1

**Critical Failures:**
- **Hook doesn't activate:** If `useBattleCoordination` never becomes active
- **Premature activation:** If hook activates before phase becomes 'active'
- **Delayed activation:** If hook doesn't activate immediately when phase changes
- **Battalions don't move:** If battalions don't start targeting and movement logic

**Log Management:**
- **Add:** `console.log('Battle coordination activation:', { phase, battleStarted, timestamp: Date.now() })`
- **Add:** `console.log('Hook state:', { isActive, battalionCount })`
- **Add:** `console.log('Battalion behavior start:', { userBattalions, enemyBattalions })`
- **Monitor:** Hook activation timing, battalion behavior initiation
- **Clean up:** Remove activation logs once Step 3.1 is completed

**CONFLICT NOTES:**
- **Step 1 dependency:** Must be completed AFTER all Step 1 corrections are implemented
- **Step 3.1 impact:** Hook activation timing will affect movement precision in Step 3.1
- **Step 4.1 impact:** Hook activation will affect retargeting system in Step 4.1
- **Step 5.1 impact:** Hook activation will affect targeting logic in Step 5.1

### Step 2.3: Visual Transition Verification
**Current State:** Visual transition details may not be fully implemented
**Intended State:** Ensure all UI elements become fully visible with correct header text

**Files to Modify:**
- `mobile/src/components/battle/BattleHeader.tsx` - Verify header text changes
- `mobile/src/screens/BattleScreen.tsx` - Ensure UI element visibility

**Functions to Change:**
- Header text display logic - Ensure "SYSTEM BREACH IN PROGRESS" shows
- UI element opacity management - Verify all elements are visible
- Timer display - Ensure 20-second countdown is visible

**Test Criteria:**
- **Primary:** Battle header shows "SYSTEM BREACH IN PROGRESS" 
- **Primary:** 20-second countdown timer is visible and counting down
- **Primary:** All UI elements (network, battalions, timer) are fully visible
- **Primary:** No hidden or partially visible elements
- **Baseline:** All Step 1 and 2.1-2.2 behaviors are maintained
- **Baseline:** Network visualization and hook activation work correctly

**Known Temporary Regressions:**
- **Results display may break:** Results display will be implemented in Step 6.3
- **Visual feedback may be limited:** Visual feedback will be enhanced in Step 5.5

**Critical Failures:**
- **Header doesn't show:** If battle header text doesn't appear or is incorrect
- **Timer not visible:** If 20-second countdown timer doesn't display
- **UI elements hidden:** If network, battalions, or timer are not visible
- **Visual corruption:** If UI elements appear corrupted or misplaced

**Log Management:**
- **Add:** `console.log('Header text update:', { oldText, newText, timestamp: Date.now() })`
- **Add:** `console.log('UI visibility:', { networkVisible, battalionsVisible, timerVisible })`
- **Add:** `console.log('Timer display:', { currentTime, isVisible })`
- **Monitor:** Header text changes, UI element visibility, timer display
- **Clean up:** Remove visibility logs once Step 3.1 is completed 

**CONFLICT NOTES:**
- **Step 1.4 dependency:** Must be completed AFTER Step 1.4 network visualization is implemented
- **Step 6.3 impact:** Header text changes will affect results display in Step 6.3
- **Step 5.5 impact:** UI element visibility will affect visual feedback in Step 5.5

## Step 3 Corrections

### Step 3.1: Attack Range Intersection Precision
**Current State:** Movement may overshoot node targets due to imprecise intersection calculation
**Intended State:** Battalions must stop exactly at attack range edge intersection with node center

**Files to Modify:**
- `mobile/src/hooks/useMovement.ts` - Attack range intersection calculation
- `mobile/src/utils/battleCalculator.ts` - Range calculation utilities

**Functions to Change:**
- `getAttackRangeIntersectionPoint()` - Ensure precise intersection calculation
- `checkRangeIntersection()` - Verify range checking logic
- Movement position monitoring in `moveBattalionAlongPath()`

**Specific Changes:**
- Add comments explaining battalion center offset logic
- Ensure `BATTALION_CENTER_OFFSET` is properly applied in intersection calculation
- Verify 2-pixel tolerance is working correctly in position monitoring

**Test Criteria:**
- **Primary:** Battalions stop exactly at attack range edge, not overshooting node targets
- **Primary:** Visual verification that battalions are positioned correctly relative to nodes
- **Primary:** No movement beyond the calculated intersection point
- **Baseline:** All Step 1 and 2 behaviors are maintained
- **Baseline:** Hook activation and UI visibility work correctly

**Known Temporary Regressions:**
- **Network line validation may be off:** Network line validation will be corrected in Step 3.2
- **Moving target handling may not work:** Moving target handling will be implemented in Step 4.3
- **Attack timing may be off:** Attack timing will be corrected in Step 4.4

**Critical Failures:**
- **Battalions don't move:** If battalions don't move at all toward targets
- **Overshooting continues:** If battalions consistently overshoot targets significantly
- **Intersection calculation fails:** If intersection point calculation causes errors
- **Movement completely broken:** If movement system fails entirely

**Log Management:**
- **Add:** `console.log('Intersection calculation:', { battalionPos, targetPos, intersectionPoint, range })`
- **Add:** `console.log('Movement precision:', { distanceToTarget, attackRange, tolerance })`
- **Add:** `console.log('Position monitoring:', { currentPos, targetPos, isInRange })`
- **Monitor:** Intersection calculations, movement precision, position monitoring
- **Clean up:** Remove precision logs once Step 3.2 is completed

**CONFLICT NOTES:**
- **Step 1 dependency:** Must be completed AFTER all Step 1 corrections are implemented
- **Step 2.2 dependency:** Must be completed AFTER Step 2.2 hook activation is working
- **Step 4.3 impact:** Intersection calculation will be critical for moving target handling in Step 4.3
- **Step 4.4 impact:** Precise positioning will affect attack timing in Step 4.4
- **CRITICAL:** This step establishes the foundation for all movement precision - must be done correctly

### Step 3.2: Network Line Movement Validation
**Current State:** Movement may not strictly adhere to network lines
**Intended State:** All battalion movement must follow network lines exactly

**Files to Modify:**
- `mobile/src/hooks/useMovement.ts` - Movement path validation
- `mobile/src/utils/pathfinding.ts` - Path reconstruction logic

**Functions to Change:**
- `moveBattalionAlongPath()` - Ensure strict network line adherence
- `reconstructPath()` - Verify path follows network connections

**Specific Changes:**
- Add validation to ensure battalion position never deviates from network lines
- Verify path reconstruction uses only valid network connections
- Add debug logging to track movement path adherence

**Test Criteria:**
- **Primary:** All battalion movement follows visible network lines
- **Primary:** No direct movement between non-connected nodes
- **Primary:** Movement path matches network topology exactly
- **Baseline:** All Step 1, 2, and 3.1 behaviors are maintained
- **Baseline:** Movement precision and intersection calculations work correctly

**Known Temporary Regressions:**
- **Movement monitoring may not work:** Movement monitoring will be implemented in Step 4.2
- **Moving target handling may not work:** Moving target handling will be implemented in Step 4.3
- **Battalion targeting may not work:** Battalion targeting will be implemented in Step 5.1

**Critical Failures:**
- **Battalions leave network:** If battalions move off network lines completely
- **Direct movement:** If battalions move directly between non-connected nodes
- **Path reconstruction fails:** If pathfinding fails to find valid network routes
- **Movement system broken:** If movement system fails entirely

**Log Management:**
- **Add:** `console.log('Network line adherence:', { battalionPos, nearestLine, distance })`
- **Add:** `console.log('Path validation:', { path, isValid, connectionCount })`
- **Add:** `console.log('Movement path:', { startNode, endNode, pathNodes })`
- **Monitor:** Network line adherence, path validation, movement paths
- **Clean up:** Remove validation logs once Step 4.2 is completed 

**CONFLICT NOTES:**
- **Step 1.4 dependency:** Must be completed AFTER Step 1.4 network visualization is implemented
- **Step 3.1 dependency:** Must be completed AFTER Step 3.1 intersection precision is working
- **Step 4.2 impact:** Network line adherence will be critical for movement monitoring in Step 4.2
- **Step 4.3 impact:** Path validation will affect moving target handling in Step 4.3
- **Step 5.1 impact:** Network movement will be required for battalion targeting in Step 5.1

## Step 4 Corrections

### Step 4.1: Remove Continuous Target Validation During Attacks
**Current State:** Battalions continuously check `isNeutral(target.index)` every 2 seconds during attacks
**Intended State:** No polling during attacks - retargeting only happens when triggered by node capture

**Files to Modify:**
- `mobile/src/hooks/useCombat.ts` - Remove continuous validation during attack intervals
- `mobile/src/hooks/useTargeting.ts` - Ensure event-driven retargeting only

**Functions to Change:**
- `setupNodeAttack()` - Remove periodic `isNeutral()` checks during attack intervals
- `setupNewNodeAttack()` - Remove periodic target validation
- `handleNodeCapture()` - Ensure this is the only trigger for retargeting

**Specific Changes:**
- Remove any `setInterval()` calls that check target validity during attacks
- Ensure `handleNodeCapture()` immediately triggers retargeting for all attacking battalions
- Add comments explaining event-driven retargeting system

**Test Criteria:**
- **Primary:** No continuous target validation during attack intervals
- **Primary:** Retargeting only occurs when nodes are captured
- **Primary:** Attack intervals run without interruption from validation checks
- **Baseline:** All Step 1, 2, and 3 behaviors are maintained
- **Baseline:** Movement precision and network validation work correctly

**Known Temporary Regressions:**
- **Movement monitoring may not work:** Movement monitoring will be implemented in Step 4.2
- **Moving target handling may not work:** Moving target handling will be implemented in Step 4.3
- **Attack timing may be off:** Attack timing will be corrected in Step 4.4
- **Destruction notifications may not work:** Destruction notifications will be implemented in Step 5.3

**Critical Failures:**
- **Continuous validation continues:** If periodic target checks still occur during attacks
- **Retargeting doesn't work:** If retargeting doesn't trigger when nodes are captured
- **Attack intervals broken:** If attack intervals are completely disrupted
- **Event system broken:** If event-driven retargeting system fails entirely

**Log Management:**
- **Add:** `console.log('Retargeting trigger:', { triggerType, targetIndex, timestamp })`
- **Add:** `console.log('Attack interval:', { battalionId, interval, isActive })`
- **Add:** `console.log('Event-driven retargeting:', { affectedBattalions, newTargets })`
- **Monitor:** Retargeting triggers, attack intervals, event system
- **Clean up:** Remove retargeting logs once Step 4.4 is completed

**CONFLICT NOTES:**
- **Step 1.1 dependency:** Must be completed AFTER Step 1.1 array-based `isNeutral()` is implemented
- **Step 1.2 dependency:** Must be completed AFTER Step 1.2 `handleNodeCapture()` is updated
- **Step 2.2 dependency:** Must be completed AFTER Step 2.2 hook activation is working
- **Step 4.2 impact:** This change will affect the monitoring system in Step 4.2
- **Step 5.3 impact:** Event-driven retargeting will be used by destruction notifications in Step 5.3

### Step 4.2: Implement Periodic Target Monitoring During Movement Only
**Current State:** No periodic target monitoring during movement
**Intended State:** Every 2 seconds during movement, check target position and available targets without interrupting movement

**Files to Modify:**
- `mobile/src/hooks/useMovement.ts` - Add periodic monitoring during movement
- `mobile/src/hooks/useTargeting.ts` - Add movement-specific target validation

**Functions to Change:**
- `moveBattalionAlongPath()` - Add periodic target monitoring during movement
- `findAvailableTargets()` - Ensure it's called during movement monitoring

**Specific Changes:**
- Add `setInterval()` during movement to check target status every 2 seconds
- If target is defeated/captured during movement, immediately retarget
- If closer target becomes available, recalculate pathfinding
- Ensure monitoring doesn't interrupt movement animation

**Test Criteria:**
- **Primary:** Battalions check target status every 2 seconds during movement only
- **Primary:** Movement continues uninterrupted during monitoring
- **Primary:** Immediate retargeting occurs if target is defeated/captured during movement
- **Baseline:** All Step 1, 2, 3, and 4.1 behaviors are maintained
- **Baseline:** Event-driven retargeting works correctly

**Known Temporary Regressions:**
- **Moving target handling may not work:** Moving target handling will be implemented in Step 4.3
- **Battalion targeting may not work:** Battalion targeting will be implemented in Step 5.1
- **Destruction notifications may not work:** Destruction notifications will be implemented in Step 5.3

**Critical Failures:**
- **Monitoring doesn't work:** If target status is never checked during movement
- **Movement interrupted:** If monitoring causes movement to stop or stutter
- **Retargeting fails:** If immediate retargeting doesn't occur when target is defeated
- **Monitoring timing off:** If checks don't occur every 2 seconds as expected

**Log Management:**
- **Add:** `console.log('Movement monitoring:', { battalionId, targetStatus, timestamp })`
- **Add:** `console.log('Target check interval:', { interval, isActive, checkCount })`
- **Add:** `console.log('Immediate retargeting:', { oldTarget, newTarget, reason })`
- **Monitor:** Monitoring intervals, target status checks, immediate retargeting
- **Clean up:** Remove monitoring logs once Step 4.4 is completed

**CONFLICT NOTES:**
- **Step 3.1 dependency:** Must be completed AFTER Step 3.1 movement precision is working
- **Step 3.2 dependency:** Must be completed AFTER Step 3.2 network line validation is working
- **Step 4.1 dependency:** Must be completed AFTER Step 4.1 removes continuous validation
- **Step 5.1 impact:** Monitoring will use `findAvailableTargets()` that will be modified in Step 5.1
- **Step 5.3 impact:** Monitoring will detect battalion destruction for notifications in Step 5.3

### Step 4.3: Implement Moving Target Handling
**Current State:** No handling for moving battalion targets
**Intended State:** When targeting moving battalions, update intersection point as target moves

**Files to Modify:**
- `mobile/src/hooks/useMovement.ts` - Add moving target handling
- `mobile/src/utils/battleCalculator.ts` - Update intersection calculations for moving targets

**Functions to Change:**
- `getAttackRangeIntersectionPoint()` - Handle moving target positions
- Movement monitoring - Update intersection point when target moves

**Specific Changes:**
- Track target battalion position during movement
- Recalculate intersection point when target position changes
- Update movement path to new intersection point
- Ensure attacker cannot attack from old positions

**Test Criteria:**
- **Primary:** Attackers update intersection point when target battalion moves
- **Primary:** Movement path adjusts to new target position
- **Primary:** No attacking from outdated positions
- **Baseline:** All Step 1, 2, 3, 4.1, and 4.2 behaviors are maintained
- **Baseline:** Movement monitoring and retargeting work correctly

**Known Temporary Regressions:**
- **Battalion targeting may not work:** Battalion targeting will be implemented in Step 5.1
- **Separate arrays may not exist:** Separate battalion arrays will be implemented in Step 5.2

**Critical Failures:**
- **Intersection not updated:** If intersection point doesn't update when target moves
- **Movement path broken:** If movement path doesn't adjust to new target position
- **Attacking from old positions:** If attackers continue from outdated positions
- **Moving target system broken:** If moving target handling fails entirely

**Log Management:**
- **Add:** `console.log('Moving target update:', { targetId, oldPos, newPos, intersectionPoint })`
- **Add:** `console.log('Path adjustment:', { oldPath, newPath, reason })`
- **Add:** `console.log('Position validation:', { attackerPos, targetPos, isValid })`
- **Monitor:** Moving target updates, path adjustments, position validation
- **Clean up:** Remove moving target logs once Step 5.1 is completed

**CONFLICT NOTES:**
- **Step 3.1 dependency:** Must be completed AFTER Step 3.1 intersection precision is working
- **Step 3.2 dependency:** Must be completed AFTER Step 3.2 network line validation is working
- **Step 4.2 dependency:** Must be completed AFTER Step 4.2 monitoring is implemented
- **Step 5.1 impact:** Moving target handling will work with battalion targeting in Step 5.1
- **Step 5.2 impact:** Moving target tracking will use separate battalion arrays from Step 5.2

### Step 4.4: Add Delayed Attack Initiation for Retargeting
**Current State:** Immediate attack setup after positioning
**Intended State:** Wait `INITIAL_ATTACK_DELAY` (500ms) before beginning attacks after retargeting

**Files to Modify:**
- `mobile/src/hooks/useCombat.ts` - Add delayed attack initiation
- `mobile/src/hooks/useTargeting.ts` - Ensure proper attack timing

**Functions to Change:**
- `setupAttacks()` - Add initial attack delay for retargeted battalions
- Attack setup logic - Ensure consistent timing with initial targeting

**Specific Changes:**
- Add `INITIAL_ATTACK_DELAY` (500ms) before first attack after positioning
- Ensure retargeted battalions follow same timing as initial targeting
- Maintain attack interval timing for subsequent attacks

**Test Criteria:**
- **Primary:** Retargeted battalions wait 500ms before first attack
- **Primary:** Attack timing is consistent between initial and retargeted attacks
- **Primary:** Subsequent attacks follow normal attack intervals
- **Baseline:** All Step 1, 2, 3, 4.1, 4.2, and 4.3 behaviors are maintained
- **Baseline:** Moving target handling works correctly

**Known Temporary Regressions:**
- **Visual feedback may be limited:** Visual feedback will be enhanced in Step 5.5
- **Victory point calculation may be off:** Victory point calculation will be corrected in Step 6.4

**Critical Failures:**
- **No attack delay:** If retargeted battalions attack immediately without 500ms delay
- **Inconsistent timing:** If attack timing differs between initial and retargeted attacks
- **Attack intervals broken:** If subsequent attacks don't follow normal intervals
- **Attack system broken:** If attack system fails entirely

**Log Management:**
- **Add:** `console.log('Attack delay:', { battalionId, delayType, duration, timestamp })`
- **Add:** `console.log('Attack timing:', { initialDelay, retargetDelay, interval })`
- **Add:** `console.log('Attack sequence:', { attackNumber, timing, isRetargeted })`
- **Monitor:** Attack delays, timing consistency, attack sequences
- **Clean up:** Remove attack timing logs once Step 5.5 is completed 

**CONFLICT NOTES:**
- **Step 3.1 dependency:** Must be completed AFTER Step 3.1 positioning precision is working
- **Step 4.1 dependency:** Must be completed AFTER Step 4.1 event-driven retargeting is working
- **Step 5.5 impact:** Attack timing will affect visual feedback in Step 5.5
- **Step 6.4 impact:** Attack timing will affect victory point calculation in Step 6.4

## Step 5 Corrections

### Step 5.1: Remove Neutral Node Priority System
**Current State:** Battalion targeting only occurs "when no neutral nodes are available"
**Intended State:** Proximity-based targeting with no priority between neutral nodes and enemy battalions

**Files to Modify:**
- `mobile/src/hooks/useTargeting.ts` - Remove neutral node priority logic
- `mobile/src/hooks/useBattleEngine.ts` - Update target selection logic

**Functions to Change:**
- `findAvailableTargets()` - Remove neutral node priority, treat all targets equally
- `selectTargetNode()` - Remove "when no neutral nodes are available" condition
- Any targeting logic that prioritizes neutral nodes over battalions

**Specific Changes:**
- Remove conditional logic that checks for neutral node availability first
- Ensure `findAvailableTargets()` returns all valid targets (neutral nodes + enemy battalions) sorted by distance only
- Update target selection to choose closest target regardless of type

**Test Criteria:**
- **Primary:** Battalions can target enemy battalions even when neutral nodes are available
- **Primary:** Target selection is purely proximity-based with no priority system
- **Primary:** Multiple battalions can target same enemy battalion simultaneously
- **Baseline:** All Step 1, 2, 3, and 4 behaviors are maintained
- **Baseline:** Attack timing and moving target handling work correctly

**Known Temporary Regressions:**
- **Separate arrays may not exist:** Separate battalion arrays will be implemented in Step 5.2
- **Destruction notifications may not work:** Destruction notifications will be implemented in Step 5.3
- **Visual feedback may be limited:** Visual feedback will be enhanced in Step 5.5

**Critical Failures:**
- **Can't target battalions:** If battalions cannot target enemy battalions at all
- **Priority system remains:** If any priority-based targeting still exists
- **Proximity targeting broken:** If closest target is not always selected
- **Targeting system broken:** If targeting system fails entirely

**Log Management:**
- **Add:** `console.log('Battalion targeting:', { attackerId, targetType, targetId, distance })`
- **Add:** `console.log('Proximity calculation:', { targets, distances, selectedTarget })`
- **Add:** `console.log('Priority removal:', { oldSystem, newSystem, timestamp })`
- **Monitor:** Battalion targeting, proximity calculations, priority system removal
- **Clean up:** Remove targeting logs once Step 5.3 is completed

**CONFLICT NOTES:**
- **Step 1.1 dependency:** Must be completed AFTER Step 1.1 array-based targeting is implemented
- **Step 4.2 dependency:** Must be completed AFTER Step 4.2 monitoring uses `findAvailableTargets()`
- **Step 5.2 dependency:** Must be completed BEFORE Step 5.2 implements separate battalion arrays
- **Step 5.3 impact:** This change will affect destruction notification targeting in Step 5.3
- **Step 6.1 impact:** Target selection will affect battle end detection in Step 6.1

### Step 5.2: Implement Separate Battalion Arrays for Targeting
**Current State:** No separate data structures for user/enemy battalion targeting
**Intended State:** Use separate `userBattalions` and `enemyBattalions` arrays for efficient targeting

**Files to Modify:**
- `mobile/src/hooks/useBattleInitialization.ts` - Create separate battalion arrays
- `mobile/src/hooks/useTargeting.ts` - Update targeting to use separate arrays
- `mobile/src/store/slices/battleSlice.ts` - Add battalion array state management

**Functions to Change:**
- Battalion initialization - Create separate arrays for user and enemy battalions
- `findAvailableTargets()` - Use appropriate array based on attacker type
- Target validation - Check only enemy battalion array for user attackers and vice versa

**Specific Changes:**
- Create `userBattalions` and `enemyBattalions` arrays in battle state
- Update targeting logic to use `enemyBattalions` for user attackers and `userBattalions` for enemy attackers
- Ensure cross-targeting is prevented (user can only target enemy, enemy can only target user)

**Test Criteria:**
- **Primary:** User battalions can only target enemy battalions
- **Primary:** Enemy battalions can only target user battalions
- **Primary:** No cross-targeting within same side
- **Primary:** Targeting is efficient using separate arrays
- **Baseline:** All Step 1, 2, 3, 4, and 5.1 behaviors are maintained
- **Baseline:** Proximity-based targeting works correctly

**Known Temporary Regressions:**
- **Destruction notifications may not work:** Destruction notifications will be implemented in Step 5.3
- **Battle end detection may not work:** Battle end detection will be implemented in Step 5.4
- **Visual feedback may be limited:** Visual feedback will be enhanced in Step 5.5

**Critical Failures:**
- **Cross-targeting occurs:** If user battalions can target other user battalions
- **Targeting arrays broken:** If separate arrays don't work correctly
- **Targeting efficiency lost:** If targeting becomes significantly slower
- **Targeting system broken:** If targeting system fails entirely

**Log Management:**
- **Add:** `console.log('Array separation:', { userBattalions, enemyBattalions, targetArray })`
- **Add:** `console.log('Cross-targeting prevention:', { attackerType, targetType, isValid })`
- **Add:** `console.log('Targeting efficiency:', { arraySize, searchTime, targetFound })`
- **Monitor:** Array separation, cross-targeting prevention, targeting efficiency
- **Clean up:** Remove array logs once Step 5.4 is completed

**CONFLICT NOTES:**
- **Step 5.1 dependency:** Must be completed AFTER Step 5.1 removes priority system
- **Step 4.3 dependency:** Must be completed AFTER Step 4.3 moving target handling is implemented
- **Step 5.3 dependency:** Must be completed BEFORE Step 5.3 implements destruction notifications
- **Step 5.4 impact:** Separate arrays will be used for battle end detection in Step 5.4
- **Step 6.1 impact:** Empty array detection will be used in Step 6.1

### Step 5.3: Implement Battalion Destruction Notification System
**Current State:** No notification system when battalions are destroyed
**Intended State:** Destroyed battalions send signals to attacking battalions to trigger retargeting

**Files to Modify:**
- `mobile/src/hooks/useCombat.ts` - Add destruction notification logic
- `mobile/src/hooks/useTargeting.ts` - Handle destruction notifications
- `mobile/src/hooks/useMovement.ts` - Update movement logic for destruction signals

**Functions to Change:**
- `handleBattalionDamage()` - Send destruction signal when battalion reaches `quantity <= 0 && currentHealth <= 0`
- `cleanupBattalion()` - Notify all attacking battalions before cleanup
- Movement and targeting logic - Handle destruction notifications and trigger retargeting

**Specific Changes:**
- Add destruction signal system when battalion is destroyed
- Notify all battalions currently attacking the destroyed battalion
- Trigger immediate retargeting for all notified battalions
- Remove destroyed battalion from targetable arrays

**Test Criteria:**
- **Primary:** Destroyed battalions notify all attacking battalions
- **Primary:** Attacking battalions immediately retarget when target is destroyed
- **Primary:** Destroyed battalions are removed from targetable arrays
- **Primary:** No targeting of destroyed battalions
- **Baseline:** All Step 1, 2, 3, 4, 5.1, and 5.2 behaviors are maintained
- **Baseline:** Separate battalion arrays work correctly

**Known Temporary Regressions:**
- **Battle end detection may not work:** Battle end detection will be implemented in Step 5.4
- **Visual feedback may be limited:** Visual feedback will be enhanced in Step 5.5
- **Victory point calculation may be off:** Victory point calculation will be corrected in Step 6.4

**Critical Failures:**
- **No destruction notifications:** If destroyed battalions don't notify attackers
- **Retargeting doesn't work:** If attacking battalions don't retarget when target is destroyed
- **Destroyed battalions remain targetable:** If destroyed battalions aren't removed from arrays
- **Notification system broken:** If destruction notification system fails entirely

**Log Management:**
- **Add:** `console.log('Destruction notification:', { destroyedBattalion, attackingBattalions, timestamp })`
- **Add:** `console.log('Immediate retargeting:', { battalionId, oldTarget, newTarget, reason })`
- **Add:** `console.log('Array cleanup:', { removedBattalion, arrayType, remainingCount })`
- **Monitor:** Destruction notifications, immediate retargeting, array cleanup
- **Clean up:** Remove destruction logs once Step 5.5 is completed

**CONFLICT NOTES:**
- **Step 5.2 dependency:** Must be completed AFTER Step 5.2 separate arrays are implemented
- **Step 4.1 dependency:** Must be completed AFTER Step 4.1 event-driven retargeting is working
- **Step 5.4 dependency:** Must be completed BEFORE Step 5.4 implements battle end detection
- **Step 6.4 impact:** Destruction notifications will affect victory point calculation in Step 6.4

### Step 5.4: Implement Battle End Condition for Empty Targetable Arrays
**Current State:** No battle end condition when all targets are eliminated
**Intended State:** Battle ends when both neutral nodes and opposing battalions are eliminated

**Files to Modify:**
- `mobile/src/hooks/useTargeting.ts` - Add empty array detection
- `mobile/src/screens/BattleScreen.tsx` - Handle battle end condition
- `mobile/src/hooks/useBattleStateMachine.ts` - Trigger battle end

**Functions to Change:**
- `findAvailableTargets()` - Check if both neutral nodes and opposing battalions are empty
- `handleBattleComplete()` - Add condition for complete elimination
- Battle state machine - Handle new end condition

**Specific Changes:**
- Add check for empty `neutralNodes` array AND empty opposing battalion array
- Trigger `handleBattleComplete()` when both arrays are empty
- Prevent further movement/attacking/targeting when battle ends

**Test Criteria:**
- **Primary:** Battle ends when all neutral nodes are captured AND all opposing battalions are destroyed
- **Primary:** No further movement or attacking occurs after battle end
- **Primary:** Battle end condition is properly triggered and handled
- **Baseline:** All Step 1, 2, 3, 4, 5.1, 5.2, and 5.3 behaviors are maintained
- **Baseline:** Destruction notifications work correctly

**Known Temporary Regressions:**
- **Visual feedback may be limited:** Visual feedback will be enhanced in Step 5.5
- **Results display may not work:** Results display will be implemented in Step 6.3
- **Victory point calculation may be off:** Victory point calculation will be corrected in Step 6.4

**Critical Failures:**
- **Battle doesn't end:** If battle continues after all targets are eliminated
- **Movement continues:** If movement continues after battle end
- **Attacking continues:** If attacking continues after battle end
- **End condition broken:** If battle end condition detection fails entirely

**Log Management:**
- **Add:** `console.log('Battle end detection:', { neutralNodesEmpty, enemyBattalionsEmpty, battleEnded })`
- **Add:** `console.log('End condition trigger:', { condition, timestamp, remainingTargets })`
- **Add:** `console.log('Post-end prevention:', { movementStopped, attackingStopped, targetingStopped })`
- **Monitor:** Battle end detection, end condition triggers, post-end prevention
- **Clean up:** Remove end detection logs once Step 6.1 is completed

**CONFLICT NOTES:**
- **Step 5.2 dependency:** Must be completed AFTER Step 5.2 separate arrays are implemented
- **Step 5.3 dependency:** Must be completed AFTER Step 5.3 destruction notifications are working
- **Step 6.1 dependency:** Must be completed BEFORE Step 6.1 adds complete elimination condition
- **Step 6.2 impact:** Battle end will trigger results display in Step 6.2

### Step 5.5: Add Visual Feedback for Battalion Combat
**Current State:** No specific visual feedback for battalion-to-battalion combat
**Intended State:** Attack animations (flash effects) and damage animations (red flash effects)

**Files to Modify:**
- `mobile/src/components/battle/AnimatedBattalion.tsx` - Add damage animation
- `mobile/src/hooks/useCombat.ts` - Trigger visual feedback

**Functions to Change:**
- `triggerAttackAnimation()` - Ensure flash effects for battalion attacks
- `triggerDamageAnimation()` - Add red flash effects for battalion damage
- `handleBattalionDamage()` - Trigger damage animation when battalion takes damage

**Specific Changes:**
- Ensure `triggerAttackAnimation()` shows flash effects for battalion-to-battalion attacks
- Add `triggerDamageAnimation()` calls when battalions take damage
- Implement red flash effects for damage visualization

**Test Criteria:**
- **Primary:** Battalion attack animations show flash effects
- **Primary:** Battalion damage animations show red flash effects
- **Primary:** Visual feedback is consistent between node and battalion attacks
- **Baseline:** All Step 1, 2, 3, 4, 5.1, 5.2, 5.3, and 5.4 behaviors are maintained
- **Baseline:** Battle end detection works correctly

**Known Temporary Regressions:**
- **Results display may not work:** Results display will be implemented in Step 6.3
- **Victory point calculation may be off:** Victory point calculation will be corrected in Step 6.4

**Critical Failures:**
- **No attack animations:** If battalion attack animations don't show flash effects
- **No damage animations:** If battalion damage animations don't show red flash effects
- **Inconsistent feedback:** If visual feedback differs between node and battalion attacks
- **Animation system broken:** If animation system fails entirely

**Log Management:**
- **Add:** `console.log('Attack animation:', { battalionId, targetType, animationType, timestamp })`
- **Add:** `console.log('Damage animation:', { battalionId, damageAmount, animationType, timestamp })`
- **Add:** `console.log('Visual consistency:', { nodeAttackFeedback, battalionAttackFeedback, isConsistent })`
- **Monitor:** Attack animations, damage animations, visual consistency
- **Clean up:** Remove animation logs once Step 6.3 is completed

**CONFLICT NOTES:**
- **Step 2.3 dependency:** Must be completed AFTER Step 2.3 visual transitions are working
- **Step 4.4 dependency:** Must be completed AFTER Step 4.4 attack timing is implemented
- **Step 6.3 impact:** Visual feedback will be important for results display in Step 6.3

## Step 6 Corrections

### Step 6.1: Add Complete Elimination Battle End Condition
**Current State:** Battle only ends when 20-second timer reaches 0
**Intended State:** Battle ends when timer expires OR when only one side remains standing (all opposing battalions defeated AND all neutral nodes captured)

**Files to Modify:**
- `mobile/src/screens/BattleScreen.tsx` - Add complete elimination condition
- `mobile/src/hooks/useBattleStateMachine.ts` - Handle new end condition
- `mobile/src/hooks/useTargeting.ts` - Check for empty targetable arrays

**Functions to Change:**
- `handleBattleComplete()` - Add condition for complete elimination
- `startBattleTimer()` - Add check for empty targetable arrays
- Battle state machine - Handle new end condition trigger

**Specific Changes:**
- Add check for empty `neutralNodes` array AND empty opposing battalion array
- Trigger `handleBattleComplete()` when either timer expires OR complete elimination occurs
- Ensure battle ends immediately when complete elimination is detected

**Test Criteria:**
- **Primary:** Battle ends when 20-second timer reaches 0 (existing behavior)
- **Primary:** Battle ends when all neutral nodes are captured AND all opposing battalions are destroyed
- **Primary:** No further movement or attacking occurs after battle end
- **Primary:** Battle end condition is properly triggered and handled
- **Baseline:** All Step 1, 2, 3, 4, and 5 behaviors are maintained
- **Baseline:** Battle end detection and visual feedback work correctly

**Known Temporary Regressions:**
- **Defender advantage may not work:** Defender advantage will be implemented in Step 6.2
- **Results display may not work:** Results display will be implemented in Step 6.3
- **Victory point calculation may be off:** Victory point calculation will be corrected in Step 6.4

**Critical Failures:**
- **Timer end doesn't work:** If battle doesn't end when 20-second timer reaches 0
- **Elimination end doesn't work:** If battle doesn't end when all targets are eliminated
- **Movement continues after end:** If movement continues after battle end
- **End condition system broken:** If battle end condition system fails entirely

**Log Management:**
- **Add:** `console.log('Battle end condition:', { timerExpired, completeElimination, battleEnded })`
- **Add:** `console.log('End trigger:', { triggerType, timestamp, remainingTargets })`
- **Add:** `console.log('Post-end state:', { movementStopped, attackingStopped, phase })`
- **Monitor:** Battle end conditions, end triggers, post-end state
- **Clean up:** Remove end condition logs once Step 6.2 is completed

**CONFLICT NOTES:**
- **Step 1.1 dependency:** Must be completed AFTER Step 1.1 array-based ownership is implemented
- **Step 5.4 dependency:** Must be completed AFTER Step 5.4 empty array detection is working
- **Step 2.1 dependency:** Must be completed AFTER Step 2.1 timer management is working
- **Step 6.2 dependency:** Must be completed BEFORE Step 6.2 implements defender advantage
- **Step 6.3 dependency:** Must be completed BEFORE Step 6.3 implements detailed loss display

### Step 6.2: Implement Defender Advantage System
**Current State:** Simple tie breaker where defending party (enemy) wins automatically
**Intended State:** When tie occurs, enemy gains 1 unit of lowest mark value back to their remaining forces

**Files to Modify:**
- `mobile/src/screens/BattleScreen.tsx` - Implement defender advantage logic
- `mobile/src/store/slices/battleSlice.ts` - Add unit return functionality
- `mobile/src/components/battle/BattleResultsOverlay.tsx` - Show defender advantage message

**Functions to Change:**
- `determineVictor()` - Add defender advantage logic when tie occurs
- Battle state management - Add unit return to enemy forces
- Results display - Show defender advantage activation message

**Specific Changes:**
- When points are equal, find enemy battalion with lowest mark value
- Add 1 unit to that battalion's quantity
- Show "DEFENDER ADVANTAGE ACTIVATED" message with notification of unit returned
- Update battle state to reflect returned unit

**Test Criteria:**
- **Primary:** When tie occurs, enemy gains 1 unit of lowest mark value
- **Primary:** Defender advantage message is displayed
- **Primary:** Battle state reflects returned unit
- **Primary:** Tie breaker works correctly with unit return
- **Baseline:** All Step 1, 2, 3, 4, 5, and 6.1 behaviors are maintained
- **Baseline:** Battle end conditions work correctly

**Known Temporary Regressions:**
- **Results display may not work:** Results display will be implemented in Step 6.3
- **Victory point calculation may be off:** Victory point calculation will be corrected in Step 6.4

**Critical Failures:**
- **No unit return:** If enemy doesn't gain 1 unit when tie occurs
- **Wrong mark selected:** If unit is added to wrong mark value battalion
- **No message display:** If defender advantage message doesn't appear
- **State not updated:** If battle state doesn't reflect returned unit

**Log Management:**
- **Add:** `console.log('Defender advantage:', { tieDetected, lowestMark, unitReturned, timestamp })`
- **Add:** `console.log('Unit return:', { battalionId, oldQuantity, newQuantity, markValue })`
- **Add:** `console.log('Message display:', { messageShown, notificationType, timestamp })`
- **Monitor:** Defender advantage detection, unit returns, message display
- **Clean up:** Remove defender advantage logs once Step 6.3 is completed

**CONFLICT NOTES:**
- **Step 6.1 dependency:** Must be completed AFTER Step 6.1 battle end conditions are working
- **Step 6.4 dependency:** Must be completed AFTER Step 6.4 victory calculation functions are working
- **Step 5.2 dependency:** Must be completed AFTER Step 5.2 separate battalion arrays are implemented
- **Step 6.3 dependency:** Must be completed BEFORE Step 6.3 implements detailed loss display

### Step 6.3: Add Detailed Bot Loss Display
**Current State:** Shows only total loss points
**Intended State:** Shows detailed bot losses per mark: "User Losses: Mark 1 - 15, Mark 2 - 34, Mark 3 - 8, Mark 4 - 2"

**Files to Modify:**
- `mobile/src/components/battle/BattleResultsOverlay.tsx` - Add detailed loss display
- `mobile/src/store/slices/battleSlice.ts` - Track losses per mark
- `mobile/src/utils/battleCalculator.ts` - Calculate losses by mark

**Functions to Change:**
- `calculateTotalLossPoints()` - Add breakdown by mark
- Results overlay rendering - Display detailed loss statistics
- Loss tracking - Track losses per mark instead of just total points

**Specific Changes:**
- Track losses by mark in battle state
- Calculate and display losses per mark for each side
- Format display as "User Losses: Mark 1 - 15, Mark 2 - 34, Mark 3 - 8, Mark 4 - 2"
- Show same format for enemy losses

**Test Criteria:**
- **Primary:** Results overlay shows detailed bot losses per mark
- **Primary:** Loss display format matches intended specification
- **Primary:** Loss tracking is accurate per mark
- **Primary:** Display works for both user and enemy losses
- **Baseline:** All Step 1, 2, 3, 4, 5, 6.1, and 6.2 behaviors are maintained
- **Baseline:** Defender advantage system works correctly

**Known Temporary Regressions:**
- **Victory point calculation may be off:** Victory point calculation will be corrected in Step 6.4

**Critical Failures:**
- **No detailed display:** If results overlay doesn't show losses per mark
- **Wrong format:** If loss display format doesn't match specification
- **Inaccurate tracking:** If loss tracking is not accurate per mark
- **Display broken:** If display doesn't work for both user and enemy losses

**Log Management:**
- **Add:** `console.log('Loss tracking:', { mark, userLosses, enemyLosses, timestamp })`
- **Add:** `console.log('Display format:', { format, userDisplay, enemyDisplay })`
- **Add:** `console.log('Loss accuracy:', { calculatedLosses, displayedLosses, isAccurate })`
- **Monitor:** Loss tracking, display format, loss accuracy
- **Clean up:** Remove loss display logs once Step 6.4 is completed

**CONFLICT NOTES:**
- **Step 6.1 dependency:** Must be completed AFTER Step 6.1 battle end conditions are working
- **Step 6.2 dependency:** Must be completed AFTER Step 6.2 defender advantage is implemented
- **Step 6.4 dependency:** Must be completed AFTER Step 6.4 victory calculation functions are working
- **Step 5.3 dependency:** Must be completed AFTER Step 5.3 destruction notifications are working

### Step 6.4: Update Victory Point Calculation Functions
**Current State:** Victory point calculation may not use the correct functions
**Intended State:** Use `handleBattalionDamage()`, `onBattalionLoss()`, `calculateLossPoints()`, and `calculateTotalLossPoints()` as specified

**Files to Modify:**
- `mobile/src/screens/BattleScreen.tsx` - Update victory calculation
- `mobile/src/hooks/useCombat.ts` - Ensure proper loss tracking
- `mobile/src/utils/battleCalculator.ts` - Verify calculation functions

**Functions to Change:**
- `handleBattleComplete()` - Use correct calculation functions
- `determineVictor()` - Use `calculateTotalLossPoints()` for point comparison
- Loss tracking - Ensure `handleBattalionDamage()` and `onBattalionLoss()` are used

**Specific Changes:**
- Ensure `handleBattalionDamage()` calculates units lost and calls `onBattalionLoss()`
- Verify `calculateLossPoints()` uses correct formula: `quantity * Math.pow(2, mark - 1)`
- Use `calculateTotalLossPoints()` to sum all loss points from `battleLosses` state
- Ensure loss tracking is per battalion ID as specified

**Test Criteria:**
- **Primary:** Victory point calculation uses correct functions
- **Primary:** Point formula works correctly (1, 2, 4, 8 points per unit for marks 1-4)
- **Primary:** Loss tracking is accurate per battalion ID
- **Primary:** Total calculation sums all losses correctly
- **Baseline:** All Step 1, 2, 3, 4, 5, 6.1, 6.2, and 6.3 behaviors are maintained
- **Baseline:** Detailed loss display works correctly

**Known Temporary Regressions:**
- **None:** This is the final step in the correction sequence

**Critical Failures:**
- **Wrong functions used:** If victory point calculation doesn't use specified functions
- **Wrong formula:** If point formula doesn't work correctly (1, 2, 4, 8 points)
- **Inaccurate tracking:** If loss tracking is not accurate per battalion ID
- **Wrong total:** If total calculation doesn't sum all losses correctly

**Log Management:**
- **Add:** `console.log('Victory calculation:', { functionUsed, pointsCalculated, battalionId })`
- **Add:** `console.log('Point formula:', { mark, quantity, points, formula })`
- **Add:** `console.log('Loss tracking:', { battalionId, losses, totalLosses, isAccurate })`
- **Monitor:** Victory calculation functions, point formulas, loss tracking accuracy
- **Clean up:** Remove victory calculation logs once all steps are completed 

**CONFLICT NOTES:**
- **Step 5.3 dependency:** Must be completed AFTER Step 5.3 destruction notifications are working
- **Step 4.4 dependency:** Must be completed AFTER Step 4.4 attack timing is implemented
- **Step 6.1 dependency:** Must be completed AFTER Step 6.1 battle end conditions are working
- **Step 6.2 dependency:** Must be completed BEFORE Step 6.2 implements defender advantage
- **Step 6.3 dependency:** Must be completed BEFORE Step 6.3 implements detailed loss display


## Summary

This document provides a comprehensive, step-by-step correction plan for aligning the battle system with the intended behavior. Each step includes:

- **Current vs Intended State:** Clear description of what needs to change
- **Files and Functions:** Specific code locations to modify
- **Test Criteria:** Primary and baseline tests with known temporary regressions
- **Critical Failures:** What constitutes a failure requiring immediate attention
- **Log Management:** Specific logs to add, monitor, and clean up
- **Conflict Notes:** Dependencies and potential impacts on other steps

The correction sequence is designed to be implemented progressively, with each step building on the previous ones while maintaining forward-only progression to avoid regressions.

**Before Testing:**
- [ ] Previous step's intended behaviors are working
- [ ] No critical failures from previous steps
- [ ] Debug logs are added for current step
- [ ] Known temporary regressions are documented

**During Testing:**
- [ ] Primary test criteria are met
- [ ] Baseline behaviors are maintained
- [ ] Known temporary regressions are identified
- [ ] No critical failures occur
- [ ] Performance is acceptable

**After Testing:**
- [ ] Step is verified as working
- [ ] Debug logs are cleaned up (if appropriate)
- [ ] Results are documented
- [ ] Ready to proceed to next step

### Communication Protocol

**When Reporting Test Results:**
1. **Step being tested:** Clearly identify which correction step
2. **Primary criteria results:** What worked and what didn't
3. **Baseline verification:** Whether previous behaviors are maintained
4. **Temporary regressions:** Any expected issues found
5. **Critical failures:** Any unexpected serious problems
6. **Log observations:** Any relevant log output
7. **Performance notes:** Any performance issues or improvements
8. **Readiness assessment:** Whether ready to proceed to next step

**When Issues Arise:**
- **Temporary regression:** Note it and continue if it's expected
- **Critical failure:** Stop and report immediately
- **Unclear behavior:** Add more specific logs and retest
- **Performance issue:** Document and assess impact on progression