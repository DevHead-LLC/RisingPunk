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
  - **Performance optimization:** Minimize array operations and state changes to limit action calls during battle

**b) Pre-Battle Countdown Sequence**
- State machine transitions to 'countdown' phase using `startBattle()`
- A 3-second countdown overlay appears on screen showing "3... 2... 1..." via `CountdownOverlay` component
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