# Battle System User Experience Documentation

## 1. User Experience Flow (Non-Technical Perspective)

### What the User Sees and Experiences

**3-Second Countdown:**
The battle screen loads showing a network of 9 connected nodes - 3 blue (user) nodes on the left, 3 gray (neutral) nodes in the center, and 3 red (enemy) nodes on the right. Lines connect these nodes showing valid paths. Each user and enemy node has a colored battalion (army unit) positioned on it. A large countdown overlay appears showing "3", then "2", then "1", with "BATTLE STARTING" text below the number.

**Battle Begins:**
The countdown disappears and battalions immediately start moving. Each battalion moves smoothly along the network lines toward one of the neutral nodes in the center. The user can see their blue battalions moving from left to center, while red enemy battalions move from right to center. Movement looks natural and follows the connection lines - battalions don't move in straight lines but follow the network paths.

**Reaching Attack Positions:**
Battalions don't move all the way to the neutral nodes. Instead, they stop when they get close enough to attack (based on their weapon range). Faster battalions arrive first, slower ones take longer. Once a battalion reaches its attack position, it stops moving and starts attacking.

**Periodic Attacking & Tug-of-War:**
Above each neutral node, a health bar appears showing a tug-of-war battle. The bar starts empty (gray) and gradually fills with blue or red color as battalions attack. User battalions make the bar fill blue from the left, enemy battalions make it fill red from the right. Different battalion types attack at different speeds - some attack every second, others every few seconds. The user can see the health bar constantly changing as attacks happen.

**Node Capture:**
When the health bar reaches 100% for either side, the neutral node immediately changes color - gray becomes blue if user wins, or red if enemy wins. The health bar disappears since the node is now captured. All battalions that were attacking that node stop attacking since captured nodes can't be attacked anymore. The captured node stays that color permanently.

**Battle Conclusion:**
The battle continues until the 20-second timer runs out or some other victory condition is met. The user sees a real-time timer at the top showing battle time remaining. Throughout the battle, they can watch multiple tug-of-war battles happening simultaneously across different neutral nodes.

---

## 2. Technical Flow (Detailed File-by-File Account)

### Server-Side Battle Initialization

**`server/src/services/BattleSetupService.ts`** creates a new battle with 6 battalions (3 user, 3 enemy) positioned on their starting nodes (0,1,2 for user; 6,7,8 for enemy). It uses **`server/src/services/BattalionService.ts`** to create battalions with proper stats and calculate total army health. It uses **`server/src/services/NodeService.ts`** to set up 9 nodes with server-calculated positions. Neutral nodes (3,4,5) get tug-of-war progress initialized to 0 and max capture threshold set to total army health.

**`server/src/services/BattleTimer.ts`** starts a 3-second countdown timer, emitting countdown updates every second. When countdown reaches zero, it transitions the battle phase to ACTIVE and triggers the movement system.

### Battle Start & Targeting

**`server/src/services/BattleService.ts`** receives the phase change event and triggers initial targeting. It uses **`server/src/services/TargetingService.ts`** to assign random neutral node targets to all battalions. TargetingService validates that each battalion can reach its target via network connections defined in **`server/src/config/networkConfig.ts`**, then returns targeting results showing which battalion targets which node.

**`server/src/controllers/BattleController.ts`** receives client requests for battle state updates. When clients request battle state, it stores the client's actual screen dimensions, retrieves the battle from the database, gets real-time timer values from BattleTimerService, and calculates updated node positions for the client's specific screen size using **`server/src/services/NodeService.ts`**. It also calculates line properties for network connections using **`server/src/config/networkConfig.ts`**.

### Movement System

**`server/src/services/MovementService.ts`** handles battalion movement when BattleService initiates movement. It calculates the attack range position (not the target node center) using the battalion's range stat multiplied by 8 pixels per range unit. MovementService determines if the battalion is already within range, calculates movement duration based on the battalion's speed stat using its own movement constants, and returns movement state information with start position, target position, and timing.

BattleService updates movement every 100ms by checking movement progress, which uses time-based calculations to determine if movement is complete. When a battalion's movement status changes to 'arrived', BattleService triggers the attack system.

### Attack & Combat System

**`server/src/services/AttackService.ts`** manages periodic attacking. When a battalion arrives at its target, BattleService starts the attack process, which calculates the attack interval based on the battalion's speed stat (faster = more frequent attacks). AttackService stores attack state for each attacking battalion and processes attacks when enough time has elapsed.

**`server/src/services/CombatService.ts`** handles the actual damage calculations and tug-of-war mechanics. When AttackService processes an attack, CombatService calculates damage as (battalion offense × quantity), converts this to a percentage of total army health, and applies it to the node's tug-of-war progress. User attacks increase progress toward +100%, enemy attacks decrease toward -100%. When a node reaches ±100%, CombatService marks it as captured and changes its owner.

### Client-Side Visualization

**`mobile/src/components/battle/BattleOverlayManager.tsx`** polls the server every second for battle state updates. It displays the countdown overlay during the countdown phase and shows the battle timer during the active phase. The component manages overlay visibility based on the current battle phase received from the server.

**`mobile/src/components/battle/BattleNetworkGrid.tsx`** renders the 9 nodes and connecting lines using server-provided positions and line properties. It displays node colors based on ownership (blue/red/gray) and renders health bars for neutral nodes using **`mobile/src/components/battle/NodeHealthBar.tsx`**, which shows tug-of-war progress as a colored bar filling left-to-right for user or right-to-left for enemy.

**`mobile/src/components/battle/BattleBattalionManager.tsx`** renders all battalions using server-provided battalion data. It passes movement state information to **`mobile/src/components/battle/BattleBattalion.tsx`**, which handles smooth client-side movement interpolation between server updates. BattleBattalion calculates intermediate positions during movement and animates battalions smoothly from start to target positions.

### Data Flow & Communication

**`mobile/src/store/api/battleApi.ts`** defines the client-server API interface and provides the battle state query hook for real-time polling. **`server/src/services/BattleResponseService.ts`** formats server data for client consumption, converting server database models to client-friendly formats.

**`server/src/services/BattalionMappingService.ts`** maps server battalion data to client format, adding movement state information. **`server/src/models/Battle.ts`** defines the database schema for battles, battalions, and nodes. **`server/src/types/battle.ts`** and **`mobile/src/types/battleTypes.ts`** provide shared type definitions for server-client communication.

---

## 3. Behavior Categorization by File Type

### Network: Nodes, Lines, and Position Calculations

**Server Files:**
- `server/src/config/networkConfig.ts` - Network connection definitions, line property calculations, network topology
- `server/src/services/NodeService.ts` - Node positioning calculations, node types, node creation with tug-of-war
- `server/src/controllers/BattleController.ts` - `generateNetworkData()` method that recalculates positions for client screen sizes
- `server/src/utils/battleUtils.ts` - `createNodePositionMap()` utility for position lookups

**Client Files:**
- `mobile/src/components/battle/BattleNetworkGrid.tsx` - Network visualization, node and line rendering
- `mobile/src/utils/battleUtils.ts` - `createNodePositionMap()` utility for position lookups
- `mobile/src/types/battleTypes.ts` - Network connection and line property interfaces

### Movement: Pathfinding, Initial Movement vs. Retargeted Movement

**Server Files:**
- `server/src/services/MovementService.ts` - Attack range calculations, movement initiation, progress updates, distance calculations, pathfinding logic, movement timing constants
- `server/src/services/TargetingService.ts` - Initial targeting assignment, network path validation, reachability checks
- `server/src/services/BattleService.ts` - Movement state management, movement update loop, battalion arrival detection

**Client Files:**
- `mobile/src/components/battle/BattleBattalion.tsx` - Smooth movement interpolation, client-side animation
- `mobile/src/components/battle/BattleBattalionManager.tsx` - Battalion movement coordination, movement state handling
- `mobile/src/types/battleTypes.ts` - MovementState interface definition

### Battalions: Attack Behaviors, Targeting, Combat Rules

**Server Files:**
- `server/src/services/AttackService.ts` - Periodic attack management, attack interval calculation, attack state tracking
- `server/src/services/CombatService.ts` - Damage calculation, attack rules, tug-of-war damage application
- `server/src/services/BattalionMappingService.ts` - Server-to-client battalion data mapping
- `server/src/services/BattalionService.ts` - Battalion creation with proper stats, health calculation, battalion business logic
- `server/src/services/BattleSetupService.ts` - Battle initialization that coordinates battalion creation
- `server/src/services/BotService.ts` - Bot stats authority, battalion type definitions and statistics
- `server/src/models/Battle.ts` - Battalion schema, stats definition, health and position properties
- `server/src/types/battle.ts` - Battalion interfaces and ownership enums

**Client Files:**
- `mobile/src/store/api/battleApi.ts` - Battalion data interfaces for client consumption
- `mobile/src/components/battle/BattleBattalion.tsx` - Battalion visualization, health bar display
- `mobile/src/types/battleTypes.ts` - Movement state and battalion type definitions

### Node Behaviors: Node Rules, Tug-of-War, Capture Mechanics

**Server Files:**
- `server/src/services/CombatService.ts` - Tug-of-war mechanics, node capture detection, ownership changes, targeting validation
- `server/src/services/NodeService.ts` - Node creation with tug-of-war system setup, node positioning authority
- `server/src/models/Battle.ts` - Node schema with tug-of-war progress, capture threshold, ownership properties
- `server/src/types/battle.ts` - Node interfaces, ownership enums, capture state definitions
- `server/src/services/BattleSetupService.ts` - Battle initialization that coordinates node creation

**Client Files:**
- `mobile/src/components/battle/NodeHealthBar.tsx` - Tug-of-war progress visualization, capture progress display
- `mobile/src/components/battle/BattleNetworkGrid.tsx` - Node color changes on capture, ownership visualization
- `mobile/src/store/api/battleApi.ts` - Node state interfaces for tug-of-war progress and ownership

### Timer System: Countdown and Battle Duration Management

**Server Files:**
- `server/src/services/BattleTimer.ts` - Timer authority, countdown duration (3s), battle duration (20s), phase transitions
- `server/src/services/BattleService.ts` - Timer event handling, phase change coordination
- `server/src/models/Battle.ts` - Timer state storage in database schema

**Client Files:**
- `mobile/src/components/battle/BattleOverlayManager.tsx` - Countdown overlay display, battle timer visualization
- `mobile/src/components/battle/BattleTimerDisplay.tsx` - Real-time timer display during active battle

---

## System Architecture Summary

### **Server Authority (Security Critical)**
- All game logic calculations
- Attack timing and damage
- Movement validation and pathfinding
- Node capture detection
- Battle state management
- Screen dimension adaptation

### **Client Visualization (Display Only)**  
- Real-time polling for updates
- Smooth movement interpolation
- Health bar animations
- Node color changes
- UI overlay management
- User input handling (future) 