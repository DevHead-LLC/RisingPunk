# Intended Battle Sequence Flow

**NOTE: This file describes how the battle sequence SHOULD work, not how it currently works.**

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
- **Animation coordination:** `useBattleStateMachine` manages phase transitions and opacity animations, uses `useNativeDriver: true` for performance, proper cleanup of animation listeners and intervals
- User sees their battalions positioned on the left side (nodes 0, 1, 2) with specific bot types and quantities:
  - Node 0: 5 Breacher bots (position: x=20, y=SCREEN_HEIGHT*0.225)
  - Node 1: 3 Guardian bots (position: x=20, y=SCREEN_HEIGHT*0.5)
  - Node 2: 4 Phreak bots (position: x=20, y=SCREEN_HEIGHT*0.775)
- Enemy battalions appear on the right side (nodes 6, 7, 8) with larger quantities:
  - Node 6: 24 Breacher bots (position: x=SCREEN_WIDTH-165, y=SCREEN_HEIGHT*0.225)
  - Node 7: 21 Guardian bots (position: x=SCREEN_WIDTH-165, y=SCREEN_HEIGHT*0.5)
  - Node 8: 18 Phreak bots (position: x=SCREEN_WIDTH-165, y=SCREEN_HEIGHT*0.775)
- **Battalion visualization:** `AnimatedBattalion` components render each battalion with type-specific shapes, health bars show percentage with color-coded bars, range indicators show visual circles (2x actual range for visibility)
- Neutral nodes (3, 4, 5) appear in the center at positions:
  - Node 3: x=SCREEN_WIDTH*0.425, y=SCREEN_HEIGHT*0.375
  - Node 4: x=SCREEN_WIDTH*0.425, y=SCREEN_HEIGHT*0.525
  - Node 5: x=SCREEN_WIDTH*0.425, y=SCREEN_HEIGHT*0.675
- **Node ownership arrays are initialized via `nodeOwnership.ts`:**
  - `neutralNodes = [3, 4, 5]` - ONLY these nodes can be targeted for capture during initial targeting
  - `userNodes = [0, 1, 2]` - user-controlled nodes, NEVER targetable for initial targeting
  - `enemyNodes = [6, 7, 8]` - enemy-controlled nodes, NEVER targetable for initial targeting
- **Initial targeting restrictions:**
  - Battalions can ONLY target nodes in the `neutralNodes` array during initial targeting
  - User/enemy controlled nodes are completely off-limits for targeting via `isNeutral()` utility
  - No `controlState` properties are used - ownership is determined solely by array membership
  - Multiple battalions can target the same neutral node simultaneously (no targeting restrictions)
  - **Network-based targeting:** Only neutral nodes directly connected to battalion's current node are considered for initial targeting
  - Connection logic uses `NETWORK_CONNECTIONS` array: `[0,3], [3,6], [1,4], [4,7], [2,5], [5,8], [0,4], [1,3], [1,5], [2,4], [3,7], [4,6], [4,8], [5,7]`
  - **Random selection:** Target is chosen randomly from available connected neutral nodes: `availableNodes[Math.floor(Math.random() * availableNodes.length)]`
  - **Proximity-based retargeting:** When a neutral node is eliminated, battalions retarget based solely on proximity to remaining neutral nodes
  - **Color coding system:** User nodes = blue (#4717F6), enemy nodes = red (#FF4141), neutral nodes = secondary color
  - **Node capture events:** When neutral node is captured, it's moved from `neutralNodes` array to respective party's array (`userNodes` or `enemyNodes`) with memoized state change for color update
  - **Network visualization:** `NetworkNode` components render each node with appropriate colors and states, `NetworkLines` component draws connections based on `NETWORK_CONNECTIONS`
  - **Performance optimization:** Minimize array operations and state changes to limit action calls during battle

**b) Pre-Battle Countdown Sequence**
- State machine transitions to 'countdown' phase using `startBattle()`
- A 3-second countdown overlay appears on screen showing "3... 2... 1..." via `CountdownOverlay` component with purple styling
- Countdown timer runs via `setInterval()` in `useBattleStateMachine.ts` > `startBattle()`
- During countdown, all battalions are visible but not yet moving or attacking
- Network lines and node connections are fully visible via `NetworkLines` component
- User can see the battlefield layout but cannot interact yet
- `BattleHeader` shows "BATTLE STARTING" with countdown number

**c) Node Health Assignment (Countdown = 3)**
- When countdown starts at 3, `useEffect([countdown])` in `BattleScreen.tsx` triggers node health calculation
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
- **Damage application:** Each attack applies damage to the target node using `nodeRef.applyDamage()`, which converts damage to progress percentage using the node's health as a divisor
- Total damage calculation: `attackPower * battalion.quantity` where attackPower comes from bot stats
- **Visual feedback:** Battalion triggers attack animation via `battalionRefs.current[createBattalionKey(isUser, battalion.nodeIndex)]?.triggerAttackAnimation()` (flash effects), then node triggers damage animation after `ATTACK_DELAY` (300ms)

**b) Node Capture and Control Change**
- **Node health system:** Neutral nodes have health equal to 75% of the total combined army health (user + enemy battalions)
- **Health calculation:** `Math.floor(total * 0.75)` where total = sum of all battalion health values (`BOT_CATEGORIES[type].stats.health * quantity`)
- **Tug-of-war system:** Neutral nodes use a control progress system where user attacks add positive progress and enemy attacks add negative progress
- **Progress calculation:** Each attack adds `(damage / nodeHealth) * 100` percentage points to the control progress, where `damage = attackPower * battalion.quantity`
- **Progress range:** Control progress ranges from -100% to +100%, starting at 0% (neutral)
- **Capture threshold:** When the absolute progress reaches 100%, the node is captured by the side that pushed it over the threshold
- **Capture determination:** When progress reaches +100%, user captures. When progress reaches -100%, enemy captures
- **Control state update:** Node's ownership changes via `captureNode(nodeIndex, newState)` which updates the ownership arrays in `nodeOwnership.ts`
- **Visual indication:** Captured nodes show the controlling side's color and cannot be retargeted
- **Progress bars:** Neutral nodes show capture progress bars with user/enemy colors during tug-of-war system

**c) Battalion Retargeting Triggers**
- **Event-driven retargeting:** When a node gets captured, `handleNodeCapture()` immediately triggers retargeting for all battalions attacking that node
- **Single capture operation:** `handleNodeCapture()` serves as the single point of capture that calls `captureNode()` and triggers retargeting in one atomic operation
- **No polling during attacks:** Battalions do NOT continuously check `isNeutral(target.index)` every 2 seconds during attacks
- **Immediate signal system:** Captured nodes immediately notify all attacking battalions to retarget
- **Efficient retargeting:** No continuous validation during attack intervals - retargeting only happens when triggered by neutral node capture

**d) Retargeting Logic**
- **Target discovery:** `findAvailableTargets()` function (in `useTargeting.ts`) collects all possible targets (neutral nodes and enemy battalions).
- **Proximity-based selection:** Targets are sorted by distance using Euclidean distance (`Math.sqrt(...)`)—the closest target is selected, regardless of type.
- **No priority system:** Neutral nodes and enemy battalions are treated equally based on distance only.
- **Target validation:** Only healthy battalions (`quantity > 0 && currentHealth > 0`) and neutral nodes (`isNeutral(index)`) are considered.
- **Multiple attackers:** Multiple battalions can target the same neutral node simultaneously.

**e) Movement to New Targets**
- **Delayed attack initiation:** Once in position at attack range intersection, battalions wait `INITIAL_ATTACK_DELAY` (500ms) before beginning attacks, just like initial targeting
- **Network line adherence:** Battalions must stay on network lines during movement and never leave the network structure
- **Node-based pathfinding:** When transferring between network lines, battalions move directly to the node position (not using attack range to determine "reached" status)
- **Periodic target validation:** Every 2 seconds during movement, battalions check target position and available targets without interrupting movement
- **Dynamic target updates:** If a closer target becomes available or the current target moves/is defeated/captured, battalions recalculate pathfinding and intersection point
- **Moving target handling:** When targeting a moving battalion, the attacker updates its intersection point as the target moves - cannot attack from old positions
- **Path recalculation:** New targets or target movement triggers fresh pathfinding via `findShortestPaths()` and `reconstructPath()`
- **Attack setup:** Once in final position, immediately begins attacking the new target via `setupAttacks()` (in `useCombat.ts`) using same initial attack delay like initial targeting.

## Step 5: Battalion-to-Battalion Combat
**File:** `useCombat.ts` > `setupBattalionAttack()` and `performBattalionAttack()`

**a) Battalion Targeting**
- **Proximity-based targeting:** As in step 4d, battalions target the nearest available target (neutral nodes or enemy battalions) based solely on distance using `findAvailableTargets()` function
- **Movement and pathfinding:** As in step 4e, battalions use `findShortestPaths()` and `reconstructPath()` for pathfinding, move along network lines via `moveBattalionAlongPath()`, and stop at attack range intersection points
- **Target validation:** Only healthy enemy battalions (`quantity > 0 && currentHealth > 0`) are considered as valid targets
- **Periodic target monitoring:** As in step 4e, during movement only, battalions check every 2 seconds for target position changes or destruction without interrupting movement
- **Dynamic target updates:** If target battalion is destroyed during movement, battalion immediately retargets to nearest available target
- **Moving target handling:** If target battalion moves during movement, attacker updates intersection point and continues pursuit
- **Efficient data structure:** Use separate `userBattalions` and `enemyBattalions` arrays for targeting - user battalions can only target enemy battalions and vice versa
- **Destruction notification:** When battalion reaches `quantity <= 0 && currentHealth <= 0`, it sends destruction signal to all attacking battalions and is removed from targetable data structure
- **Battle end condition:** If both neutral nodes and opposing battalions are eliminated (empty targetable arrays), battle ends and prevents further movement/attacking/targeting

**b) Battalion Combat Mechanics**
- **Attack setup:** `setupBattalionAttack()` creates attack intervals for battalion-to-battalion combat
- **Damage calculation:** Same formula as node attacks: `attackPower * battalion.quantity`
- **Health reduction:** Enemy battalion health is reduced by damage amount
- **Unit loss:** When battalion health reaches 0, units are lost and `quantity` is reduced
- **Loss tracking:** Battalion losses are recorded via `recordBattalionLoss()` for victory calculation
- **Visual feedback:** Attack animations (flash effects) via `triggerAttackAnimation()`, damage animations (red flash effects) via `triggerDamageAnimation()`

**c) Battalion Destruction**
- When a battalion's quantity reaches 0, it is considered destroyed
- **Cleanup:** `cleanupBattalion()` clears all attack intervals and removes battalion from combat
- **Destruction notification:** As established in step 5a, destroyed battalion sends signal to all attacking battalions to trigger retargeting
- **Data structure removal:** Destroyed battalion is removed from targetable data structure (`userBattalions` or `enemyBattalions` arrays)
- **Unit loss tracking:** `handleBattalionDamage()` calculates units lost (`botsLost = Math.floor(damage / healthPerBot)`) and calls `onBattalionLoss()` for each unit
- **Mark value calculation:** `calculateLossPoints()` uses formula `quantity * Math.pow(2, mark - 1)` where mark 1=1pt, mark 2=2pts, mark 3=4pts, mark 4=8pts per unit
- **Victory points accumulation:** `recordBattalionLoss()` accumulates points in `battleLosses` state for each unit lost, tracked per battalion ID
- **Battle end check:** If destruction results in empty targetable arrays (no neutral nodes and no opposing battalions), battle ends as established in step 5a

## Step 6: Battle End Conditions and Victory Calculation
**File:** `BattleScreen.tsx` > `handleBattleComplete()` and `determineVictor()`

**a) Battle End Triggers**
- **Timer expiration:** Battle ends when 20-second timer reaches 0 via `startBattleTimer()` countdown
- **Complete elimination:** Battle ends when only one side remains standing (all opposing battalions defeated AND all neutral nodes captured)
- **End condition check:** `handleBattleComplete()` is called when either condition is met

**b) Victory Point Calculation**
- **Loss tracking:** As in step 5c, each destroyed battalion unit contributes points based on mark value via `handleBattalionDamage()` and `onBattalionLoss()`
- **Point formula:** As in step 5c, `calculateLossPoints()` uses formula `quantity * Math.pow(2, mark - 1)` where mark 1=1pt, mark 2=2pts, mark 3=4pts, mark 4=8pts
- **Total calculation:** `calculateTotalLossPoints()` sums all loss points for each side from accumulated `battleLosses` state

**c) Winner Determination**
- **Point comparison:** `determineVictor()` compares total loss points - side with fewer loss points wins
- **Tie breaker:** If points are equal, defending party (enemy) wins automatically via defender advantage
- **Defender advantage activation:** When tie occurs, enemy gains 1 unit of lowest mark value back to their remaining forces
- **Result:** Winner is set to 'user' or 'enemy' and returned by `determineVictor()`

**d) Results Display**
- **Phase transition:** Battle transitions to 'complete' then 'results' phase via `useBattleStateMachine`
- **Results overlay:** `BattleResultsOverlay` shows winner and detailed loss statistics
- **Winner message:** "SYSTEM BREACH SUCCESSFUL" for user win, "BREACH REPELLED" for enemy win
- **Bot loss display:** Shows detailed bot losses per mark: "User Losses: Mark 1 - 15, Mark 2 - 34, Mark 3 - 8, Mark 4 - 2" for each side
- **Tie breaker message:** "DEFENDER ADVANTAGE ACTIVATED" if points are equal, with notification of unit returned
- **Continue button:** Allows user to exit battle and return to previous screen via `onClose` callback

## Technical Architecture Notes

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