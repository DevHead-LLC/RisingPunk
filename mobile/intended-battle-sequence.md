# Intended Battle Sequence Flow

**NOTE: This file describes how the battle sequence SHOULD work, not how it currently works.**

# Battle Sequence Flow

## Step 1: Battle Initialization
**File:** `BattleScreen.tsx` > `initializeBattle()` and `useBattleInitialization.ts`

**a) Screen Setup and Initial State**
- Battle screen loads and immediately shows the network of connected nodes using `showNetwork()`
- User sees their battalions positioned on the left side (nodes 0, 1, 2) with specific bot types and quantities:
  - Node 0: 5 Breacher bots
  - Node 1: 3 Guardian bots  
  - Node 2: 4 Phreak bots
- Enemy battalions appear on the right side (nodes 6, 7, 8) with larger quantities:
  - Node 6: 24 Breacher bots
  - Node 7: 21 Guardian bots
  - Node 8: 18 Phreak bots
- Neutral nodes (3, 4, 5) appear in the center, initially without health values
- **Node ownership arrays are initialized:**
  - `neutralNodes = [3, 4, 5]` - ONLY these nodes can be targeted for capture during initial targeting
  - `userNodes = [0, 1, 2]` - user-controlled nodes, NEVER targetable
  - `enemyNodes = [6, 7, 8]` - enemy-controlled nodes, NEVER targetable
- **Initial targeting restrictions:**
  - Battalions can ONLY target nodes in the `neutralNodes` array
  - User/enemy controlled nodes are completely off-limits for targeting
  - No `controlState` properties are used - ownership is determined solely by array membership 