# Battle Flow: Move-by-Move Documentation

## **🎯 BATTLE INITIATION FLOW**

### **Step 1: User Clicks "DEPLOY PURGE" Button**
**File:** `mobile/src/screens/BattlePreparationScreen.tsx`
**Function:** `TouchableOpacity onPress` handler (lines 250-270)
**Action:** 
- User clicks the "DEPLOY PURGE" button
- This triggers an async function that:
  - Calls `startBattle()` mutation with hardcoded battalion data
  - Sends payload: `{ userBattalions: [{ type: 'guardian', quantity: 10, nodeIndex: 0 }, { type: 'breacher', quantity: 8, nodeIndex: 1 }, { type: 'phreak', quantity: 6, nodeIndex: 2 }] }`
  - Waits for response with `.unwrap()`
  - If successful, calls `onBattleStart(result.battleId)` to pass battleId to parent
  - If error, logs error and calls `onBattleStart()` without battleId (fallback mode)

### **Step 2: Client API Call**
**File:** `mobile/src/store/api/battleApi.ts`
**Function:** `startBattle` mutation (lines 55-62)
**Action:**
- The `startBattle` mutation is triggered with the payload from Step 1
- RTK Query creates a POST request to `/api/battle/start`
- Request body contains the `userBattalions` array with 3 battalions
- Expects response format: `{ battleId: string }`
- Uses `fetchBaseQuery` with `baseUrl: API_URL` (no authentication headers)
- Invalidates 'Battle' cache tags when called

### **Step 3: Server Route Handler**
**File:** `server/src/routes/battle.ts`
**Function:** `router.post('/start')` (lines 25-40)
**Action:**
- Express route receives POST request to `/api/battle/start`
- Extracts `userBattalions` and `defenderId` from request body
- Sets `attackerId = 'test-user-id'` (hardcoded for testing)
- Sets `defenderId = 'computer'` (default computer opponent)
- Calls `battleController.startBattle(attackerId, actualDefenderId)`
- **Important:** The `userBattalions` data from client is extracted but never used
- Returns `{ battleId: battle.battleId }` with status 201 on success
- Returns error response with status 500 if battle creation fails

### **Step 4: Battle Controller - Start Battle**
**File:** `server/src/controllers/BattleController.ts`
**Function:** `startBattle()` (lines 60-80)
**Action:**
- Receives `attackerId` and `defenderId` parameters
- Converts `defenderId` from 'computer' to 'computer-opponent' if needed
- Calls `battleService.createBattle(attackerId, actualDefenderId)` to create the battle
- **Note:** Does NOT use any battalion data from client - all battalion creation happens in BattleService
- Generates network data using `generateNetworkData(battle.nodes, 375, 667)` with default screen dimensions
- Maps battalions for client using `BattalionMappingService.mapBattalionsForClient(battle.battalions)`
- Returns battle state using `BattleResponseService.createBattleStateResponse(battle, mappedBattalions, networkData)`
- Throws error if any step fails

### **Step 5: Battle Service - Create Battle**
**File:** `server/src/services/BattleService.ts`
**Function:** `createBattle()` (lines 59-200)
**Action:**
- Generates unique `battleId` using timestamp and random string
- Creates nodes using `BATTLE_CONFIG.calculateNodePositions(375, 667, 125)` with standard mobile dimensions
- **Creates HARDCODED user battalions on nodes 0,1,2:**
  - Node 0: `guardian` (quantity: 10) with stats from `BATTLE_CONFIG.BOT_STATS`
  - Node 1: `breacher` (quantity: 8) with stats from `BATTLE_CONFIG.BOT_STATS`
  - Node 2: `phreak` (quantity: 6) with stats from `BATTLE_CONFIG.BOT_STATS`
- **Creates HARDCODED enemy battalions on nodes 6,7,8:**
  - Node 6: `guardian` (quantity: 8) with stats from `BATTLE_CONFIG.ENEMY_BOT_STATS`
  - Node 7: `breacher` (quantity: 10) with stats from `BATTLE_CONFIG.ENEMY_BOT_STATS`
  - Node 8: `phreak` (quantity: 7) with stats from `BATTLE_CONFIG.ENEMY_BOT_STATS`
- Sets neutral node health (nodes 3,4,5) to 75% of total army strength
- Creates Battle document with `phase: BattlePhase.COUNTDOWN`, `countdown: 3`
- Saves battle to database using `battle.save()`
- Starts timer using `timerService.startTimer(battleId)`
- Sets up timer event listeners for countdown updates, phase changes, and battle end
- Logs battle creation event to database
- Returns the saved battle document

### **Step 6: Battle Timer Service - Start Countdown**
**File:** `server/src/services/BattleTimer.ts`
**Function:** `startTimer()` → `startCountdown()` (lines 30-50, 100-130)
**Action:**
- Checks if timer already exists for this battleId (prevents duplicates)
- Creates new `BattleTimer` object with:
  - `countdown: BATTLE_CONFIG.COUNTDOWN_DURATION` (3 seconds)
  - `battleTime: 0`
  - `phase: BattlePhase.COUNTDOWN`
  - `isActive: true`
- Stores timer in `timers` Map using battleId as key
- Calls `startCountdown(battleId)` to begin countdown phase
- `startCountdown()` creates 1-second interval that:
  - Decrements `countdown` every second (3→2→1→0)
  - Emits `countdownUpdate` events with current countdown value
  - When countdown reaches 0, calls `startBattlePhase(battleId)`

### **Step 7: Return Battle ID to Client**
**Flow:** `BattleController` → `BattleService` → `BattleTimer` → `BattleController` → `Battle Routes` → `Client`
**Action:**
- `BattleController.startBattle()` returns `BattleStateResponse` from `BattleResponseService.createBattleStateResponse()`
- `BattleResponseService` formats the response with battle data, mapped battalions, and network data
- `BattleController` returns this response to the route handler
- Route handler extracts `battle.battleId` and sends `{ battleId: "battle-1234567890-abc123" }` to client
- Client receives the battleId in the `startBattle` mutation response
- **Note:** The full battle state is created but only the battleId is returned to client initially

### **Step 8: Navigate to Battle Screen**
**File:** `mobile/src/screens/BattlePreparationScreen.tsx`
**Function:** `onBattleStart(result.battleId)` (line 265)
**Action:**
- After successful battle creation, `onBattleStart(result.battleId)` is called
- This is a prop function passed from the parent component
- The parent component (likely navigation logic) receives the battleId
- Parent component navigates to `BattleGridScreen` with `battleId` as a prop
- **Note:** The actual navigation happens in the parent component, not in BattlePreparationScreen
- If battle creation fails, `onBattleStart()` is called without battleId for fallback mode

### **Step 9: Battle Grid Screen Mounts**
**File:** `mobile/src/screens/BattleGridScreen.tsx`
**Function:** Component render (lines 20-60)
**Action:**
- `BattleGridScreen` component receives `battleId` prop from navigation
- If `battleId` is missing, renders error message "No battle ID provided"
- If `battleId` exists, renders the main battle interface with three self-contained components:
  - `BattleOverlayManager` (countdown/timer display) - receives `battleId` prop
  - `BattleNetworkGrid` (nodes and network lines) - receives `battleId` prop and styling props
  - `BattleBattalionManager` (battalion visualization) - receives `battleId` prop and styling props
- Each component is self-contained and will make its own API calls to fetch battle state
- Components are wrapped in `SafeAreaView` with battle grid styles

### **Step 10: Components Start Independent API Polling**
**Files:** 
- `mobile/src/components/battle/BattleOverlayManager.tsx`
- `mobile/src/components/battle/BattleNetworkGrid.tsx`
- `mobile/src/components/battle/BattleBattalionManager.tsx`

**Function:** `useGetBattleStateQuery()` in each component
**Action:**
- Each component independently calls `useGetBattleStateQuery({ battleId, screenWidth, screenHeight })`
- `BattleOverlayManager` gets screen dimensions using `Dimensions.get('window')`
- All components set `pollingInterval: 1000` (poll every 1 second for real-time updates)
- All components set `skip: !battleId` (skip if no battleId provided)
- Each component receives the same battle state data but renders different parts:
  - **OverlayManager:** Shows countdown overlay and battle timer
  - **NetworkGrid:** Renders nodes and connecting lines
  - **BattalionManager:** Renders battalions on their assigned nodes
- Components show loading states while fetching data
- Components show error states if API calls fail

### **Step 11: Server Battle State Request**
**File:** `server/src/routes/battle.ts`
**Function:** `router.get('/:id/state')` (lines 45-85)
**Action:**
- Express route receives GET request to `/api/battle/${battleId}/state`
- Extracts `battleId` from URL parameters (`req.params.id`)
- Extracts `screenWidth` and `screenHeight` from query parameters (`req.query`)
- Sets `userId = 'test-user-id'` (hardcoded for testing)
- Parses screen dimensions: `width = parseInt(screenWidth) || 375`, `height = parseInt(screenHeight) || 667`
- Calls `battleController.getBattleState(id, userId, width, height)`
- If battle not found, returns 404 error
- If successful, transforms server response to match client expectations:
  - Maps server phases to client phases (`countdown` → `countdown`, `active` → `battle`, etc.)
  - Calculates `timeRemaining` based on phase (countdown value or 20 - battleTime)
  - Includes `battalions`, `nodes`, `networkConnections`, `lineProperties`
  - Returns `{ success: true, data: clientBattleState }`
- If error occurs, returns 500 error

### **Step 12: Battle Controller - Get Battle State**
**File:** `server/src/controllers/BattleController.ts`
**Function:** `getBattleState()` (lines 85-140)
**Action:**
- Receives `battleId`, `userId`, `screenWidth`, `screenHeight` parameters
- Gets battle from database using `battleService.getBattle(battleId)`
- Returns `null` if battle not found
- Gets real-time timer values from `timerService.getTimeRemaining(battleId)`
- Uses real-time timer values if available, otherwise falls back to database values:
  - `currentPhase = timerState.phase || battle.phase`
  - `currentCountdown = timerState.countdown || battle.countdown`
  - `currentBattleTime = timerState.battleTime || battle.battleTime`
- Maps battalions for client using `BattalionMappingService.mapBattalionsForClient(battle.battalions)`
- Generates network data using `generateNetworkData(battle.nodes, screenWidth, screenHeight)`
- **Key Logic:** If `currentPhase === BattlePhase.ACTIVE && currentCountdown === 0`, triggers initial targeting
- Returns battle state using `BattleResponseService.createBattleStateResponseWithTimer()`
- Throws error if any step fails

### **Step 13: Network Data Generation**
**File:** `server/src/controllers/BattleController.ts`
**Function:** `generateNetworkData()` (lines 20-55)
**Action:**
- Receives `nodes` array, `screenWidth`, and `screenHeight` parameters
- Recalculates node positions for client's actual screen size using `BATTLE_CONFIG.calculateNodePositions(screenWidth, screenHeight, 125)`
- Updates each node with correct position for client screen:
  - Finds repositioned node by index
  - Preserves `index`, `owner`, `health`, `captureProgress`
  - Updates `position` to match client screen dimensions
- Gets network connections from server config: `networkConnections = [...BATTLE_CONFIG.NETWORK_CONNECTIONS]`
- Creates node position map for line calculations using updated positions
- Calculates line properties for each connection using `BATTLE_CONFIG.calculateLineProperties(fromPos, toPos)`:
  - Returns `{ length, angle, left, top }` for each connection
  - Returns default properties `{ length: 0, angle: 0, left: 0, top: 0 }` if positions not found
- Returns: `{ networkConnections, lineProperties, updatedNodes }`

### **Step 14: Battle Response Service**
**File:** `server/src/services/BattleResponseService.ts`
**Function:** `createBattleStateResponseWithTimer()`
**Action:**
- Receives battle document, mapped battalions, network data, timer values, and targeting results
- Creates `BattleStateResponse` object with:
  - `battleId`: from battle document
  - `phase`: current real-time phase (not database phase)
  - `countdown`: current real-time countdown value
  - `battleTime`: current real-time battle time
  - `winner`: from battle document
  - `battalions`: mapped battalions for client consumption
  - `nodes`: updated nodes with client screen positions
  - `networkConnections`: network topology from server config
  - `lineProperties`: calculated line properties for rendering
  - `targetingResults`: initial targeting results (if available)
  - `lastUpdated`: battle document update timestamp
- Returns formatted battle state response for client

### **Step 15: Client Receives Battle State**
**Files:** All three battle components
**Function:** `useGetBattleStateQuery` response
**Action:**
- Each component receives the same complete battle state from server
- `BattleOverlayManager` processes the data:
  - Extracts `phase`, `timeRemaining` from server response
  - Maps server phases to client phases using `mapServerPhaseToClientPhase()`
  - Calculates `battleTime = maxBattleTime - timeRemaining` (20 - timeRemaining)
  - Determines if in countdown phase: `clientPhase === BattlePhase.COUNTDOWN && timeRemaining <= 3 && timeRemaining > 0`
  - Renders `BattleTimerDisplay` during countdown and active phases
  - Renders `BattleCountdownOverlay` with countdown value (3,2,1) during countdown phase
- `BattleNetworkGrid` receives `nodes`, `networkConnections`, `lineProperties` for rendering
- `BattleBattalionManager` receives `battalions` array for rendering battalion positions
- All components show loading states while fetching and error states if API fails

### **Step 16: Countdown Display**
**File:** `server/src/services/BattleTimer.ts`
**Function:** `startCountdown()` interval (lines 100-130)
**Action:**
- 1-second interval runs continuously during countdown phase
- Every second: `timer.countdown--` (3→2→1→0)
- Emits `countdownUpdate` events with current countdown value and phase
- Client receives updated `timeRemaining: 3,2,1` in battle state responses
- When `countdown <= 0`, calls `startBattlePhase(battleId)` to transition to battle phase

**File:** `mobile/src/components/battle/BattleOverlayManager.tsx`
**Function:** Countdown logic (lines 70-90)
**Action:**
- Detects countdown phase: `clientPhase === BattlePhase.COUNTDOWN && timeRemaining <= 3 && timeRemaining > 0`
- Renders `BattleCountdownOverlay` with current countdown value (3,2,1)
- Shows countdown overlay on top of battle screen
- Battle timer continues to display during countdown
- When countdown reaches 0, overlay disappears and battle phase begins

### **Step 17: Countdown Ends**
**File:** `server/src/services/BattleTimer.ts`
**Function:** `startCountdown()` → `startBattlePhase()` (lines 125-150)
**Action:**
- When `countdown <= 0`, `startBattlePhase(battleId)` is called
- Clears countdown interval: `clearInterval(timer.countdownInterval)`
- Sets `timer.countdownInterval = undefined`
- Transitions to active phase: `timer.phase = BattlePhase.ACTIVE`
- Sets `timer.countdown = 0`
- Emits `phaseChange` event with `phase: BattlePhase.ACTIVE, countdown: 0`
- Starts battle timer interval (20 seconds) that increments `battleTime` every second
- Battle timer emits `battleTimeUpdate` events with current battle time
- If `battleTime >= BATTLE_CONFIG.BATTLE_DURATION`, calls `endBattle(battleId)`

### **Step 18: Battle Phase Begins**
**File:** `server/src/controllers/BattleController.ts`
**Function:** `getBattleState()` targeting logic (lines 120-130)
**Action:**
- When client polls for battle state after countdown ends
- Detects `currentPhase === BattlePhase.ACTIVE && currentCountdown === 0`
- Checks if targeting already done: `battleService.getTargetingResults(battleId).length === 0`
- If targeting not done, calls `battleService.triggerInitialTargeting(battleId)`
- Gets targeting results: `targetingResults = battleService.getTargetingResults(battleId)`
- Includes targeting results in battle state response
- **Note:** This happens on the first client poll after countdown reaches 0

### **Step 19: Trigger Initial Targeting**
**File:** `server/src/services/BattleService.ts`
**Function:** `triggerInitialTargeting()` (lines 25-40)
**Action:**
- Receives `battleId` parameter
- Gets battle from database using `this.getBattle(battleId)`
- Returns empty array if battle not found
- Logs "🎯 TRIGGERING INITIAL TARGETING for battle: {battleId}"
- Calls `TargetingService.assignInitialTargets(battle.battalions, battle.nodes)` to assign targets
- Stores results in `targetingResults` Map using battleId as key: `this.targetingResults.set(battleId, results)`
- Returns targeting results array
- **Note:** This processes all 6 battalions (3 user + 3 enemy) simultaneously

### **Step 20: Targeting Service - Assign Targets**
**File:** `server/src/services/TargetingService.ts`
**Function:** `assignInitialTargets()` (lines 15-40)
**Action:**
- Receives `battalions` array (6 total: 3 user + 3 enemy) and `nodes` array
- Gets neutral nodes (indices 3, 4, 5) using `nodes.filter(node => node.owner === NodeOwner.NEUTRAL)`
- Logs "🎯 INITIAL TARGETING START" and available neutral nodes
- For each battalion in the array:
  - Determines owner label: `'user'` or `'enemy'`
  - Calls `assignTargetToBattalion(battalion, neutralNodeIndices, ownerLabel)`
  - Adds result to results array
- Logs targeting summary: number of valid vs invalid targets
- Logs "🎯 INITIAL TARGETING COMPLETE"
- Returns array of `TargetingResult` objects
- **Note:** Each battalion gets assigned a target to one of the neutral nodes (3, 4, 5)

### **Step 21: Network Validation**
**File:** `server/src/services/TargetingService.ts`
**Function:** `isReachableViaNetwork()` (lines 90-100)
**Action:**
- Receives `startingNode` (battalion's current node) and `targetNode` (neutral node)
- Checks `BATTLE_CONFIG.NETWORK_CONNECTIONS` for direct connections
- Validates: `(connection.from === startingNode && connection.to === targetNode) || (connection.from === targetNode && connection.to === startingNode)`
- Returns `true` if direct connection exists, `false` otherwise
- **Important:** Only allows direct connections (no 1-hop paths for initial targeting)
- Used by `getValidTargets()` to filter neutral nodes that are directly reachable
- Used by `getNetworkPath()` to return direct path `[startingNode, targetNode]` if valid

### **Step 22: Targeting Results Returned**
**Flow:** `TargetingService` → `BattleService` → `BattleController` → `Battle Response Service` → `Client`
**Action:**
- `TargetingService.assignInitialTargets()` returns array of `TargetingResult` objects
- `BattleService.triggerInitialTargeting()` stores results in `targetingResults` Map
- `BattleController.getBattleState()` retrieves results: `targetingResults = battleService.getTargetingResults(battleId)`
- `BattleResponseService.createBattleStateResponseWithTimer()` includes targeting results in response
- Client receives targeting results in battle state response with format:
  - `battalionId`: battalion identifier
  - `battalionType`: guardian/breacher/phreak
  - `battalionOwner`: user/enemy
  - `startingNode`: battalion's current node
  - `targetNode`: assigned neutral node target
  - `isValidTarget`: true/false based on network validation
  - `reason`: explanation if target is invalid
- **Result:** All 6 battalions now have assigned targets to neutral nodes (3, 4, 5) with network validation completed
