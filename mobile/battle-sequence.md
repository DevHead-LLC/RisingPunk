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

**a) Battalion Priority Sorting**
- Battalions are sorted by priority: Guardian > Breacher > Phreak
- Higher priority battalions get first choice of targets
- Both user and enemy battalions are processed simultaneously

**b) Target Selection**
- Each battalion finds available neutral nodes (3, 4, 5) that are connected to their current position
- Battalions avoid targeting nodes already chosen by higher priority battalions
- If no connected neutral nodes are available, battalions expand their search

**c) Movement Initiation**
- Battalions begin moving toward their selected neutral nodes
- Movement speed is based on each battalion's speed stat
- Battalions move along the shortest path to their target

## Step 4: [To be determined]
**File:** [file] > [function]
- [description]

## Step 5: [To be determined]
**File:** [file] > [function]
- [description]

## Step 6: [To be determined]
**File:** [file] > [function]
- [description] 