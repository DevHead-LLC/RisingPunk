# Battle Sequence Technical Flow

**NOTE: This document describes the actual technical implementation as it exists in the code today.**

# Battle Sequence Flow

## Step 1: Battle Initialization
**File:** `BattleScreen.tsx` > `initializeBattle()` and `useBattleInitialization.ts`

**a) Screen Setup and Initial State**
- Battle screen loads and immediately calls `initializeBattle()` in `useEffect([])`
- `initializeBattle()` calls `showNetwork()` which sets `networkOpacity.setValue(1)` to display the network immediately
- `startBattle()` is called, transitioning phase from 'initializing' to 'countdown' via `transitionTo('countdown')`
- During countdown transition, animations run in parallel:
  - `deploymentOpacity` fades from 1 to 0 (300ms)
  - `battalionOpacity` fades from 0 to 1 (500ms) 
  - `networkOpacity` fades from 0 to 1 (500ms)
- User sees their battalions positioned on the left side (nodes 0, 1, 2) with specific bot types and quantities:
  - Node 0: 5 Breacher bots (position: x=20, y=SCREEN_HEIGHT*0.225)
  - Node 1: 3 Guardian bots (position: x=20, y=SCREEN_HEIGHT*0.5)
  - Node 2: 4 Phreak bots (position: x=20, y=SCREEN_HEIGHT*0.775)
- Enemy battalions appear on the right side (nodes 6, 7, 8) with larger quantities:
  - Node 6: 24 Breacher bots (position: x=SCREEN_WIDTH-165, y=SCREEN_HEIGHT*0.225)
  - Node 7: 21 Guardian bots (position: x=SCREEN_WIDTH-165, y=SCREEN_HEIGHT*0.5)
  - Node 8: 18 Phreak bots (position: x=SCREEN_WIDTH-165, y=SCREEN_HEIGHT*0.775)
- Neutral nodes (3, 4, 5) appear in the center at positions:
  - Node 3: x=SCREEN_WIDTH*0.425, y=SCREEN_HEIGHT*0.375
  - Node 4: x=SCREEN_WIDTH*0.425, y=SCREEN_HEIGHT*0.525
  - Node 5: x=SCREEN_WIDTH*0.425, y=SCREEN_HEIGHT*0.675
- All nodes start with `controlState: 'neutral'` but only nodes 3, 4, 5 are actually targetable via `isNeutral()` utility

**b) Pre-Battle Countdown Sequence**
- State machine transitions to 'countdown' phase using `startBattle()`
- A 3-second countdown overlay appears on screen showing "3... 2... 1..." via `CountdownOverlay` component
- Countdown timer runs via `setInterval()` in `useBattleStateMachine.ts` > `startBattle()`
- During countdown, all battalions are visible but not yet moving or attacking
- Network lines and node connections are fully visible via `NetworkLines` component
- User can see the battlefield layout but cannot interact yet
- `BattleHeader` shows "BATTLE STARTING" with countdown number

**c) Node Health Assignment (Countdown = 3)**
- When countdown reaches exactly 3, `useEffect([countdown])` in `BattleScreen.tsx` triggers node health calculation
- `calculateInitialHealth()` computes health as 75% of total army strength (user + enemy)
- Health calculation: `Math.floor(total * 0.75)` where total = sum of all battalion health values
- Health is only assigned to neutral nodes (3, 4, 5) using `isNeutral()` utility
- User-controlled nodes (0, 1, 2) and enemy-controlled nodes (6, 7, 8) get 0 health and `isLocked: true`
- This ensures only neutral nodes can be targeted for capture

**d) Battle State Preparation**
- All nodes are now properly configured with ownership states via `nodeOwnership.ts` utilities
- Neutral nodes have health and are unlocked for targeting
- Controlled nodes are locked and cannot be targeted
- Battalion positions are finalized at their starting nodes
- Battle timer is prepared but not yet started (waits for countdown completion)

## Step 2: Battle Phase Activation
**File:** `BattleScreen.tsx` > `useEffect([phase, battleStarted])` and `useBattleStateMachine.ts` > `startBattle()`

**a) Countdown Completion**
- When countdown reaches 0, phase transitions from 'countdown' to 'active' via `transitionTo('active')`
- Countdown overlay disappears from screen (`countdown > 0` condition fails)
- Battle timer starts counting down from 20 seconds via `startBattleTimer()`

**b) Battle Coordination Activation**
- `battleStarted` state is set to true when `phase === 'active' && !battleStarted`
- `useBattleCoordination` hook becomes active and starts managing battalion behavior
- Battalions begin targeting and movement logic via `useBattleEngine.ts`

**c) Visual Transition**
- All UI elements are now fully visible (network, battalions, timer)
- Battle header shows "SYSTEM BREACH IN PROGRESS" with the 20-second countdown timer
- Battalions are ready to move and attack

## Step 3: Initial Targeting and Movement Setup
**File:** `useBattleEngine.ts` > `useEffect([battleStarted])`

**a) Battalion Initialization Check**
- The battle engine waits for both user and enemy battalions to be fully initialized (`battalionsRef.current.user` and `.enemy`)
- A retry mechanism (up to 50 attempts, 100ms intervals) ensures battalions are available before proceeding
- Once initialized, `battleInitializedRef.current = true` prevents re-initialization

**b) Initial Target Selection**
- Each battalion (user and enemy) selects its initial target using `selectTargetNode()` function
- **Network-based targeting:** Only neutral nodes directly connected to the battalion's current node (via `getConnectedNodes()`) are considered
- Connection logic uses `NETWORK_CONNECTIONS` array: `[0,3], [3,6], [1,4], [4,7], [2,5], [5,8], [0,4], [1,3], [1,5], [2,4], [3,7], [4,6], [4,8], [5,7]`
- If no connected neutral nodes are available, the search is expanded to any neutral node
- Multiple battalions can target the same neutral node; there are no restrictions or priorities
- The target is chosen randomly from the available options: `availableNodes[Math.floor(Math.random() * availableNodes.length)]`

**c) Movement to Attack Range Intersection**
- Each battalion calculates the path from its current node to the selected target node
- The battalion animates along the network line toward the target node using `Animated.timing()`
- **Precise stopping:** Movement stops at the exact point along the network line where the battalion's attack range edge intersects the center of the target node
- This is calculated using the `getAttackRangeIntersectionPoint()` utility, adjusted for the battalion's visual center offset (`BATTALION_CENTER_OFFSET`)
- The battalion never leaves the network line during this movement
- Movement duration is calculated based on battalion speed: `calculateMovementDuration(speed)`
- Position listener monitors distance to target and stops animation when `Math.abs(distanceToNode - range) <= tolerance` (2 pixel tolerance)

**d) Initial Attack Setup**
- Once in position (attack range intersection), the battalion immediately begins attacking the target node
- Attack intervals and damage calculations are set up using `setupNodeAttack()`
- Both user and enemy battalions follow this process for their first attack

## Step 4: Ongoing Battle Phase - Node Attacks and Retargeting
**File:** `useBattleEngine.ts` > `setupNodeAttack()` and `useCombat.ts` > `setupNewNodeAttack()` and `useTargeting.ts` > `handleNodeCapture()`

**a) Continuous Node Attacks**
- Once in position at attack range intersection, battalions begin attacking their target nodes using `setupNodeAttack()` (initial) or `setupNewNodeAttack()` (ongoing)
- **Attack timing:** Initial attack occurs after `INITIAL_ATTACK_DELAY` (500ms), then subsequent attacks follow the battalion's attack interval (based on speed stat)
- Attack interval calculation: `2000 * (5 / attackSpeed)` where attackSpeed comes from `BOT_CATEGORIES[type].stats.speed`
- **Damage application:** Each attack applies damage to the target node using `nodeRef.applyDamage()`, which reduces the node's health
- Total damage calculation: `attackPower * battalion.quantity` where attackPower comes from bot stats
- **Visual feedback:** Battalion triggers attack animation via `battalionRefs.current[createBattalionKey(isUser, battalion.nodeIndex)]?.triggerAttackAnimation()`, then node triggers damage animation after `ATTACK_DELAY` (300ms)

**b) Node Capture and Control Change**
- When a node's health reaches 0, it gets captured by the attacking side (user or enemy)
- **Control state update:** Node's ownership changes via `captureNode(nodeIndex, newState)` which updates the ownership arrays in `nodeOwnership.ts`
- **Visual indication:** Captured nodes show the controlling side's color and cannot be retargeted
- **Capture memory:** Recently captured nodes are tracked for 5 seconds to prevent immediate retargeting via `recentlyCapturedNodes.current.add(nodeIndex)`

**c) Battalion Retargeting Triggers**
- **Node capture:** When any node gets captured, `handleNodeCapture()` triggers retargeting for all battalions
- **Target validation:** During attacks, battalions check if their target node is still neutral using `isNeutral(target.index)`
- **Cooldown system:** Each battalion has a 2-second retarget cooldown to prevent excessive retargeting via `RETARGET_COOLDOWN` (2000ms)

**d) Retargeting Logic**
- **Available targets:** Battalions can target any neutral node (not connected-node restricted) or enemy battalions
- **Proximity-based selection:** Targets are sorted by distance - closest neutral node or enemy battalion is selected
- **No priority system:** Neutral nodes and enemy battalions are treated equally based on distance only
- **Multiple attackers:** Multiple battalions can target the same neutral node simultaneously

**e) Movement to New Targets**
- When retargeting, battalions use `moveBattalionAlongPath()` to move toward their new target
- **Path calculation:** Uses `findShortestPaths()` and `reconstructPath()` to find optimal route to target
- **Range positioning:** Stops at attack range intersection point, just like initial movement
- **Attack setup:** Once in position, immediately begins attacking the new target

## Step 5: Battalion-to-Battalion Combat
**File:** `useCombat.ts` > `setupBattalionAttack()` and `performBattalionAttack()`

**a) Battalion Targeting**
- When no neutral nodes are available, battalions target enemy battalions
- **Target selection:** Uses same proximity-based logic as node targeting
- **Movement:** Battalions move to attack range of enemy battalion using same pathfinding logic

**b) Battalion Combat Mechanics**
- **Attack setup:** `setupBattalionAttack()` creates attack intervals for battalion-to-battalion combat
- **Damage calculation:** Same formula as node attacks: `attackPower * battalion.quantity`
- **Health reduction:** Enemy battalion health is reduced by damage amount
- **Unit loss:** When battalion health reaches 0, units are lost and `quantity` is reduced
- **Loss tracking:** Battalion losses are recorded via `recordBattalionLoss()` for victory calculation

**c) Battalion Destruction**
- When a battalion's quantity reaches 0, it is considered destroyed
- **Cleanup:** `cleanupBattalion()` clears all attack intervals and removes battalion from combat
- **Victory points:** Destroyed units contribute to victory calculation based on mark value

## Step 6: Battle End Conditions and Victory Calculation
**File:** `BattleScreen.tsx` > `handleBattleComplete()` and `determineVictor()`

**a) Battle End Triggers**
- **Timer expiration:** Battle ends when 20-second timer reaches 0
- **Future feature:** Battle should also end if all of one side's battalions are defeated (not yet implemented)

**b) Victory Point Calculation**
- **Loss tracking:** Each destroyed battalion unit contributes points based on mark value
- **Point formula:** `quantity * Math.pow(2, mark - 1)` where mark 1 = 1pt, mark 2 = 2pts, mark 3 = 4pts, mark 4 = 8pts
- **Total calculation:** Sum of all loss points for each side

**c) Winner Determination**
- **Point comparison:** Side with fewer loss points wins
- **Tie breaker:** If points are equal, defending party (enemy) wins automatically
- **Result:** Winner is set to 'user' or 'enemy'

**d) Results Display**
- **Phase transition:** Battle transitions to 'complete' then 'results' phase
- **Results overlay:** `BattleResultsOverlay` shows winner and loss statistics
- **Winner message:** "SYSTEM BREACH SUCCESSFUL" for user win, "BREACH REPELLED" for enemy win
- **Loss display:** Shows user and enemy loss points
- **Tie breaker message:** "DEFENDER ADVANTAGE ACTIVATED" if points are equal
- **Continue button:** Allows user to exit battle and return to previous screen

## Step 7: Visual and Animation Systems
**File:** Various component files

**a) Network Visualization**
- **Node rendering:** `NetworkNode` components render each node with appropriate colors and states
- **Connection lines:** `NetworkLines` component draws connections between nodes based on `NETWORK_CONNECTIONS`
- **Color coding:** User nodes = blue (#4717F6), enemy nodes = red (#FF4141), neutral nodes = secondary color
- **Progress bars:** Neutral nodes show capture progress bars with user/enemy colors

**b) Battalion Visualization**
- **Animated battalions:** `AnimatedBattalion` components render each battalion with type-specific shapes
- **Health bars:** Each battalion shows health percentage with color-coded bars
- **Attack animations:** Flash effects when attacking via `triggerAttackAnimation()`
- **Damage animations:** Red flash effects when taking damage via `triggerDamageAnimation()`
- **Range indicators:** Visual circles showing attack range (2x actual range for visibility)

**c) Overlay System**
- **Countdown overlay:** Shows 3-2-1 countdown with purple styling
- **Results overlay:** Shows battle results with statistics and continue button
- **Header display:** Shows battle status and timer information

**d) Animation Coordination**
- **State machine:** `useBattleStateMachine` manages phase transitions and opacity animations
- **Timing coordination:** All animations are synchronized with battle phases
- **Performance optimization:** Uses `useNativeDriver: true` for transform animations
- **Memory management:** Proper cleanup of animation listeners and intervals

## Technical Architecture Summary

**Key Files and Their Roles:**
- `BattleScreen.tsx`: Main battle orchestrator and state management
- `useBattleInitialization.ts`: Sets up initial battle data and positions
- `useBattleStateMachine.ts`: Manages battle phases and animations
- `useBattleCoordination.ts`: Coordinates battalion movement and targeting
- `useBattleEngine.ts`: Handles initial targeting and attack setup
- `useTargeting.ts`: Manages target selection and retargeting logic
- `useCombat.ts`: Handles attack mechanics and damage application
- `useMovement.ts`: Manages battalion movement and pathfinding
- `nodeOwnership.ts`: Tracks node ownership states
- `networkConstants.ts`: Defines network topology and connections

**Data Flow:**
1. Battle initialization creates nodes and battalions
2. State machine manages phase transitions
3. Battle engine sets up initial targeting
4. Coordination system manages ongoing combat
5. Targeting system handles retargeting
6. Combat system applies damage and tracks losses
7. Victory calculation determines winner
8. Results display shows outcome

**Performance Considerations:**
- Memoized calculations in battle engine
- Native driver animations for performance
- Proper cleanup of intervals and listeners
- Efficient pathfinding algorithms
- Optimized rendering with React.memo 