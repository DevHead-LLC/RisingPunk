# Complete Battle Details - User Journey & Technical Flow

## AI Directive
This document provides a comprehensive walkthrough of the battle system from both user experience and technical implementation perspectives. It combines all battle mechanics, state management, and code flow into a narrative that follows the actual battle progression. Use this to understand the complete battle lifecycle, identify implementation gaps, and ensure all features work together cohesively. This serves as both a user journey map and a technical implementation guide.

## Phase 1: Battle Initialization & Countdown

**Logic Location:** `BattleScreen.tsx`, `useBattleInitialization.ts`, `useBattleAnimations.ts`, `BattalionDeploymentZone.tsx`, `BattalionSlot.tsx`, `BattleHeader.tsx`, `BattleNetwork.tsx`, `BattleOverlays.tsx`, `BattleUnits.tsx`, `CircleSlot.tsx`, `CountdownOverlay.tsx`, `NetworkLines.tsx`, `NetworkNode.tsx`, `networkConstants.ts`, `healthUtils.ts`, `useBattleStateMachine.ts`

**Conflicting Files:**
- **`BattleScreen.tsx` vs `useBattleInitialization.ts`**: Both have logic for initializing node health and managing node state
- **`BattleScreen.tsx` vs `useBattleStateMachine.ts`**: Both manage countdown state and phase transitions

### Step 1: Battle Screen Load
**User Experience:** Battle screen appears with network nodes visible, user battalions on the left, enemy battalions on the right. Header shows "BATTLE STARTING" with a 20-second timer.

**Code & State Details:** 
- Battle screen initializes with local state for nodes, battalions, timer, and animation values
- `useBattleInitialization` hook sets up initial node health (75% of total army health)
- User starts controlling left 3 nodes (nodes 0, 1, 2)
- All other nodes begin as neutral (gray)
- Battalion positions are calculated based on deployment zones

### Step 2: Pre-Battle Countdown Overlay
**User Experience:** Large countdown numbers appear (3, 2, 1) with fade animations, then disappear to reveal the active battlefield.

**Code & State Details:**
- `useBattleAnimations` manages countdown opacity and timing
- Countdown state tracks current number (3, 2, 1)
- Animation transitions from deployment phase to active phase
- Network and battalion opacity values control visibility

### Step 3: Battle Phase Transition
**User Experience:** Network becomes fully visible, battalions fade in, and battle begins with "SYSTEM BREACH IN PROGRESS" header.

**Code & State Details:**
- `battleStarted` state changes to true
- Animation values trigger fade-ins for network and battalions
- Battle timer starts counting down from 20 seconds
- All battalions begin their targeting and movement logic

**To-Do Items:**
- Verify initial node health calculation accuracy (75% of total army health)
- Ensure countdown timing is consistent across different devices
- Check phase transition animations are smooth
- **Validation:** Ensure all animation values initialize correctly
- **QA:** Test that deployment to active phase transition works consistently
- Consider moving battle initialization state to Redux for persistence
- **Development:** Always check this map before modifying battle-related files
- **Priority:** High - Core functionality verification

## Phase 2: Initial Battalion Movement & Targeting

**Logic Location:** `useBattleMovementAndAttacks.ts`, `BattleUnits.tsx`, `networkConstants.ts`, `AnimatedBattalion.tsx`, `BattleHeader.tsx`, `BattleNetwork.tsx`, `NetworkLines.tsx`, `NetworkNode.tsx`, `BattleScreen.tsx`, `battleCalculator.ts`, `battleUtils.ts`

**Conflicting Files:**
- **`BattleScreen.tsx` vs `useBattleMovementAndAttacks.ts`**: Both manage battalion state and targeting - duplicate targeting logic and battalion state management
- **`battleUtils.ts` vs `useBattleMovementAndAttacks.ts`**: Both contain targeting and movement logic - duplicate `findAvailableTargets` and movement calculation functions

### Step 1: Target Selection
**User Experience:** Battalions begin moving toward neutral nodes. Each battalion chooses a random neutral node that's connected via network lines.

**Code & State Details:**
- `findAvailableTargets` function identifies neutral nodes within network connections
- Random selection algorithm picks from available neutral nodes
- `targetNode` property is set on each battalion
- Movement paths are calculated using network topology

### Step 2: Movement Animation
**User Experience:** Battalions move along network connection lines toward their selected targets, with smooth animations showing their progress.

**Code & State Details:**
- `AnimatedBattalion` components handle movement animations
- Position calculations follow network paths, not direct lines
- Movement speed varies by battalion type (based on bot stats)
- Battalion refs track animation states and positions

### Step 3: Node Approach
**User Experience:** Battalions reach their target nodes and begin attacking, showing attack animations and damage effects on the nodes.

**Code & State Details:**
- Attack intervals are set up when battalions reach target nodes
- Node health begins decreasing with each attack
- Control progress bars start showing damage accumulation
- Attack animations trigger in `AnimatedBattalion` components

**To-Do Items:**
- Verify random node selection is truly random and working correctly
- Ensure all movement strictly follows network lines (no direct paths)
- Check that initial targeting prioritizes neutral nodes over enemy battalions
- **Validation:** Ensure pathfinding calculations use network distance, not direct distance
- **QA:** Test that movement animations follow network paths correctly
- Consider moving battalion target assignments to Redux for better coordination
- **Development:** Test node capture scenarios when changing targeting logic

## Phase 3: Node Control Tug-of-War

**Logic Location:** `BattleNetwork.tsx`, `useBattleMovementAndAttacks.ts`, `healthUtils.ts`, `BattleHeader.tsx`, `NetworkLines.tsx`, `NetworkNode.tsx`, `useBattleControl.ts`, `BattleScreen.tsx`, `networkConstants.ts`

### Step 1: Damage Accumulation
**User Experience:** Multiple battalions attack the same neutral nodes. Control progress bars fill with blue (user) or red (enemy) based on which side is dealing more damage.

**Code & State Details:**
- Node health decreases with each attack based on battalion damage
- Control progress calculation: `(user_damage - enemy_damage) / node_health * 100`
- Progress bar color reflects current damage leader
- Node becomes more vulnerable as health decreases

### Step 2: Control Threshold
**User Experience:** When one side's damage reaches the threshold, the node changes color (blue for user, red for enemy) and locks, preventing further capture attempts.

**Code & State Details:**
- Control threshold triggers at 100% progress (complete capture)
- Node `controlState` changes from 'neutral' to 'user' or 'enemy'
- `isLocked` property prevents further capture attempts
- `controlledNodes` array updates to track user-controlled nodes

### Step 3: Retargeting Trigger
**User Experience:** All battalions that were attacking the captured node immediately stop and begin moving toward new targets.

**Code & State Details:**
- `handleNodeControlChange` function triggers when node is captured
- Attack intervals are cleared for all affected battalions
- `findAvailableTargets` finds new nearest targets (uncontrolled nodes or enemy battalions)
- New movement animations begin toward new targets
- **Critical Impact:** All targeting battalions must retarget, intervals cleared, paths recalculated

**To-Do Items:**
- Verify tug-of-war mechanics accurately reflect damage leader
- Ensure control progress bars show correct colors and fill rates
- Confirm node health calculation uses total army health correctly
- Check that retargeting logic finds optimal new targets
- **Validation:** Ensure no infinite retargeting loops occur
- **QA:** Test that all attack intervals are properly cleared during node capture
- Consider moving node control states to Redux for global access
- **Development:** Test retargeting logic when modifying node control
- **Development:** Verify interval cleanup when modifying attack systems
- **Priority:** High - Tug-of-war mechanics verification
- **Validation:** Ensure movement respects network connections

## Phase 4: Battalion Combat & Health Management

**Logic Location:** `useBattleMovementAndAttacks.ts`, `healthUtils.ts`, `battleCalculator.ts`, `AnimatedBattalion.tsx`, `BattleHeader.tsx`, `BattleUnits.tsx`, `useBattleControl.ts`, `BattleScreen.tsx`, `battleUtils.ts`

### Step 1: Battalion Engagement
**User Experience:** When battalions encounter enemy battalions, they show attack animations. Defending battalions flash with damage effects and their health bars decrease.

**Code & State Details:**
- Attack animations trigger in `AnimatedBattalion` components
- Damage calculation: `attacking_bots × bot_type_attack_power`
- Health reduction: `remaining_bots × bot_type_health`
- Battalion `quantity` decreases as bots are destroyed

### Step 2: Bot Loss & Power Scaling
**User Experience:** As battalions take damage, their numbers decrease visibly. Their attack power decreases proportionally, while defense and speed remain constant.

**Code & State Details:**
- Bot quantity reduces with each attack based on damage dealt
- Attack power recalculates: `remaining_bots × bot_type_attack_power`
- Defense and speed stats remain constant (average of bot type)
- Health calculations update: `remaining_bots × bot_type_health`

### Step 3: Battalion Destruction
**User Experience:** When a battalion's health reaches zero, it disappears from the battlefield. Loss points are calculated based on the battalion's mark level.

**Code & State Details:**
- Battalion destruction triggers when `quantity <= 0` or `currentHealth <= 0`
- Loss points calculation: `quantity × 2^(mark-1)` (Mark 1=1pt, Mark 2=2pts, etc.)
- Attack intervals are cleaned up for destroyed battalions
- Targeting battalions must find new targets
- **Critical Impact:** `cleanupBattalion` function clears intervals, loss tracking updates, retargeting occurs

**To-Do Items:**
- Verify bot quantity reduction per attack is working correctly
- Ensure attack power scales properly with remaining bot quantity
- Confirm defense and speed remain constant during combat
- Check that health calculations use remaining bots correctly
- **Validation:** Ensure loss point calculations are mathematically correct
- **QA:** Test that all attack intervals are properly cleaned up during destruction
- **QA:** Verify targeting battalions find new targets after destruction
- Consider moving battalion health and quantity states to Redux
- **Development:** Validate health calculations after combat changes
- **Development:** Verify loss point calculations after battalion destruction
- **Priority:** High - Bot quantity reduction and attack power scaling
- **Validation:** Ensure attack intervals are cleaned up properly

## Phase 5: Battle Completion & Results

**Logic Location:** `BattleScreen.tsx`, `BattleOverlays.tsx`, `BattleResultsOverlay.tsx`, `useBattleAnimations.ts`, `useBattleControl.ts`, `battleCalculator.ts`, `useBattleStateMachine.ts`

### Step 1: Timer Expiration
**User Experience:** 20-second timer reaches zero, all combat stops, and battle results overlay appears.

**Code & State Details:**
- Timer state reaches 0, triggering `handleBattleComplete`
- All attack intervals are cleared
- Final loss calculations are performed for both sides
- Winner determination: side with fewer loss points wins (defender wins ties)
- **Critical Impact:** `handleBattleComplete` function triggers, clearing all intervals and calculating final results

### Step 2: Results Display
**User Experience:** Results overlay shows winner (VICTORY/DEFEAT), user loss points, enemy loss points, and a continue button.

**Code & State Details:**
- `battleWinner` state determines display text
- Loss points are calculated from `battleLosses` tracking
- Results overlay fades in with animation
- `onBattleComplete` callback triggers with winner

### Step 3: Battle Exit
**User Experience:** User clicks continue button, results overlay fades out, and user returns to previous screen.

**Code & State Details:**
- `onClose` function triggers screen exit
- All battle state is cleaned up
- Animation values reset for next battle
- Component unmounts and cleanup occurs

**To-Do Items:**
- Verify timer accuracy and consistency across devices
- Ensure loss point calculations are mathematically correct
- Check that results display shows accurate statistics
- Verify battle completion callback triggers properly
- **Validation:** Ensure all attack intervals are properly cleared on timer expiration
- **QA:** Test that final loss calculations are accurate
- Consider storing battle results in Redux for game progression
- **Development:** Monitor performance during complex battle scenarios
- **Priority:** High - Timer accuracy and loss point calculations
- **Validation:** Ensure timer triggers battle completion

## Phase 6: Animation Coordination

**Logic Location:** `useBattleAnimations.ts`, `BattleHeader.tsx`, `BattleOverlays.tsx`, `AnimatedBattalion.tsx`, `BattleAnimationSystem.tsx`, `BattleNetwork.tsx`, `BattleUnits.tsx`, `DataStream.tsx`, `NetworkLines.tsx`, `NetworkNode.tsx`, `BattleScreen.tsx`, `battleUtils.ts`, `networkConstants.ts`

### Step 1: Coordinated Transitions
**User Experience:** Smooth transitions between all battle phases with coordinated fade effects, movement animations, and visual feedback.

**Code & State Details:**
- Animation values control opacity and timing across all components
- Movement animations follow network paths with proper easing
- Attack animations sync with damage application timing
- Transition animations coordinate between phases

### Step 2: Performance Optimization
**User Experience:** All animations run smoothly at 60fps without frame drops, even during complex battles with multiple battalions.

**Code & State Details:**
- Animation frames are optimized for performance
- Memory management prevents leaks from animation refs
- Complex animations are throttled if needed
- Animation cleanup occurs on component unmount

**To-Do Items:**
- Verify animation timing and coordination across all phases
- Ensure smooth transitions between deployment and active phases
- Check that attack animations sync properly with damage application
- Monitor performance during complex animation sequences
- Consider animation state management in Redux for better coordination
- **Development:** Check animation conflicts when adding new animations
- **Development:** Check animation synchronization with state updates
- **Priority:** Low - Animation optimization
- **Validation:** Ensure no animation conflicts occur