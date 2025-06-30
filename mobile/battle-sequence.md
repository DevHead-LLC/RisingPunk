# Battle Targeting Expectations

**NOTE: For the latest architectural decisions and action items, see recent-assessment.md.**

# Battle Sequence Flow

## Step 1: Battle Initialization
**File:** `BattleScreen.tsx` > `initializeBattle()`

**a) Screen Setup**
- Battle screen loads and immediately shows the network of connected nodes
- User sees their battalions on the left side (nodes 0, 1, 2) and enemy battalions on the right side (nodes 6, 7, 8)
- Neutral nodes (3, 4, 5) appear in the center, ready to be captured

**b) Pre-Battle Countdown**
- A 3-second countdown overlay appears on screen
- User sees "3... 2... 1..." before the actual battle begins
- During countdown, all battalions are visible but not yet moving or attacking

**c) Battle State Preparation**
- Node health is calculated and assigned only to neutral nodes (3, 4, 5)
- Controlled nodes (user/enemy owned) are locked and cannot be targeted
- Battle timer is set to 20 seconds for the actual battle phase

## Step 2: Battle Phase Activation
**File:** `BattleScreen.tsx` > `useEffect([phase, battleStarted])` and `useBattleStateMachine.ts` > `startBattle()`

**a) Countdown Completion**
- When countdown reaches 0, phase transitions from 'countdown' to 'active'
- Countdown overlay disappears from screen
- Battle timer starts counting down from 20 seconds

**b) Battle Coordination Activation**
- `battleStarted` state is set to true
- `useBattleCoordination` hook becomes active and starts managing battalion behavior
- Battalions begin targeting and movement logic

**c) Visual Transition**
- All UI elements are now fully visible (network, battalions, timer)
- Battle header shows the 20-second countdown timer
- Battalions are ready to move and attack

## Step 3: Initial Targeting and Movement Setup
**File:** `useBattleEngine.ts` > `useEffect([battleStarted])`

**a) Battalion Initialization Check**
- The battle engine waits for both user and enemy battalions to be fully initialized (`battalionsRef.current.user` and `.enemy`).
- A retry mechanism (up to 5 seconds) ensures battalions are available before proceeding.

**b) Initial Target Selection**
- Each battalion (user and enemy) selects its initial target using `selectTargetNode()`.
- **Network-based targeting:** Only neutral nodes directly connected to the battalion's current node (via network lines) are considered.
- If no connected neutral nodes are available, the search is expanded to any neutral node.
- Multiple battalions can target the same neutral node; there are no restrictions or priorities.
- The target is chosen randomly from the available options.

**c) Movement to Attack Range Intersection**
- Each battalion calculates the path from its current node to the selected target node.
- The battalion animates along the network line toward the target node.
- **Precise stopping:** Movement stops at the exact point along the network line where the battalion's attack range edge intersects the center of the target node. This is calculated using the `getAttackRangeIntersectionPoint` utility, adjusted for the battalion's visual center offset.
- The battalion never leaves the network line during this movement.

**d) Initial Attack Setup**
- Once in position (attack range intersection), the battalion immediately begins attacking the target node.
- Attack intervals and damage calculations are set up using `setupNodeAttack()`.
- Both user and enemy battalions follow this process for their first attack.

## Step 4: Ongoing Battle Phase - Node Attacks and Retargeting
**File:** `useBattleEngine.ts` > `setupNodeAttack()` and `useCombat.ts` > `setupNewNodeAttack()` and `useTargeting.ts` > `handleNodeCapture()`

**a) Continuous Node Attacks**
- Once in position at attack range intersection, battalions begin attacking their target nodes using `setupNodeAttack()` (initial) or `setupNewNodeAttack()` (ongoing)
- **Attack timing:** Initial attack occurs after `INITIAL_ATTACK_DELAY` (500ms), then subsequent attacks follow the battalion's attack interval (based on speed stat)
- **Damage application:** Each attack applies damage to the target node using `nodeRef.applyDamage()`, which reduces the node's health
- **Visual feedback:** Battalion triggers attack animation, then node triggers damage animation after `ATTACK_DELAY` (300ms)

**b) Node Capture and Control Change**
- When a node's health reaches 0, it gets captured by the attacking side (user or enemy)
- **Control state update:** Node's `controlState` changes from 'neutral' to 'user' or 'enemy' permanently
- **Visual indication:** Captured nodes show the controlling side's color and cannot be retargeted
- **Capture memory:** Recently captured nodes are tracked for 5 seconds to prevent immediate retargeting

**c) Battalion Retargeting Triggers**
- **Node capture:** When any node gets captured, `handleNodeCapture()` triggers retargeting for all battalions
- **Target validation:** During attacks, battalions check if their target node is still neutral using `node.controlState !== 'neutral'`
- **Cooldown system:** Each battalion has a 2-second retarget cooldown to prevent excessive retargeting

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

## Step 5: [To be determined]
**File:** [file] > [function]
- [description]

## Step 6: [To be determined]
**File:** [file] > [function]
- [description] 