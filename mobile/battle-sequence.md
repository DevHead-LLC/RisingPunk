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
- Battle engine waits for `battalionsRef.current` to be properly initialized
- Retry mechanism with 5-second timeout prevents infinite waiting
- Both user and enemy battalions must be available before proceeding

**b) Target Selection Process**
- Each battalion calls `selectTargetNode()` function with a `targetedNodes` Set to track claimed targets
- Available nodes filtered by: connected to battalion's current node AND neutral state AND not already targeted
- If no untargeted neutral nodes available, expands search to any neutral nodes
- Random selection from available nodes using `Math.floor(Math.random() * availableNodes.length)`
- First-come-first-served targeting: first battalion to process gets first choice

**c) Movement and Attack Setup**
- Battalions move toward target node using `Animated.timing()` with speed-based duration
- Movement stops when battalion reaches attack range (determined by `checkRangeIntersection()`)
- Attack setup begins immediately when in range with `setupNodeAttack()` function
- Attack intervals and damage calculations are configured for ongoing combat

## Step 4: [To be determined]
**File:** [file] > [function]
- [description]

## Step 5: [To be determined]
**File:** [file] > [function]
- [description]

## Step 6: [To be determined]
**File:** [file] > [function]
- [description] 