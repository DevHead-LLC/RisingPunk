# NEW Source of Truth Table of Contents - New Source of Truth Being Built Piece by Piece

## **BattleGridScreen Source of Truth**
  - `[BattleGridScreen]` - Main battle screen orchestrator and container
    - [Battle Grid Screen](../src/screens/BattleGridScreen.tsx)
    - [Battle Grid Screen MD](sources-of-truth/BattleGridScreen.md)
    - `[useBattleSync]` - Server/client data synchronization and orchestration (**belongs to: BattleGridScreen**)
      - [useBattleSync](../src/hooks/useBattleSync.ts)
      - [useBattleSync MD](sources-of-truth/useBattleSync.md)
    - `[useBattleState]` - Battle state, error management, and lifecycle management (**belongs to: BattleGridScreen**)
      - [useBattleState](../src/hooks/useBattleState.ts)
      - [useBattleState MD](sources-of-truth/useBattleState.md)
    - `[useBattleNetworkConnections]` - Network topology and connection data (**belongs to: BattleGridScreen**)
      - [useBattleNetworkConnections](../src/hooks/useBattleNetwork.ts)
      - [useBattleNetworkConnections MD](sources-of-truth/useBattleNetworkConnections.md)
    - `[battleGridStyles]` - Visual styling and responsive layout utilities (**belongs to: BattleGridScreen**)
      - [battleGridStyles](../src/styles/battleGridStyles.ts)
      - [battleGridStyles MD](sources-of-truth/battleGridStyles.md)

---

## Current Architecture (As Is - For Reference)

### **Core Systems**
- `Timers`
- `Overlays`

### **Battle State Management**
- `[Battle State]` - Battle phase orchestration and state transitions
  - `Phase Transitions` (*belongs to: Battle State*) - Countdown to active to complete phase management
  - `Countdown Display` (*belongs to: Battle State*) - 3-second countdown overlay and timer display
  - `Victory Overlay` (*belongs to: Battle State*) - Victory results display and post-battle navigation
    - `Victory Response` (*belongs to: Victory Overlay*) - Battle end response with complete results
    - `Victory State Management` (*belongs to: Victory Overlay*) - Victory state management and overlay triggering
    - `Victory Overlay Management` (*belongs to: Victory Overlay*) - Victory overlay component management
    - `Victory Screen UI` (*belongs to: Victory Overlay*) - Victory screen UI component
    - `Victory State Storage` (*belongs to: Victory Overlay*) - Victory state storage and result data
    - `Post-Battle Navigation` (*belongs to: Victory Overlay*) - Post-battle navigation and reward system
      - `Reward Configuration` (*belongs to: Post-Battle Navigation*) - Victory point calculations and reward structures
      - `Navigation UI` (*belongs to: Post-Battle Navigation*) - Post-battle navigation UI
      - `Navigation State` (*belongs to: Post-Battle Navigation*) - Post-battle navigation state
      - `Navigation Management` (*belongs to: Post-Battle Navigation*) - Navigation state management

### **Timer System**
- `[Battle Timer]` - Server-side timer management
  - `Countdown Timer` (*belongs to: Battle Timer*) - 3-second countdown orchestration
  - `Battle Timer` (*belongs to: Battle Timer*) - 20-second battle duration management
  - `Timer-Driven Phase Changes` (*belongs to: Battle Timer*) - Timer-driven phase transitions

### **Bot System**
- `[Bots]` - Bot type definitions and base stats
  - `Bot Categories` (*belongs to: Bots*) - Guardian, Breacher, Phreak type definitions
  - `Bot Stats` (*belongs to: Bots*) - Health, speed, range, offense, defense calculations
  - `Bot Advantages` (*belongs to: Bots*) - Type advantage system and role definitions

### **Network System**
- `[Network Topology]` - Network structure and connection definitions
  - `Node Connections` (*belongs to: Network Topology*) - Network topology and pathfinding connections
  - `Node Positions` (*belongs to: Network Topology*) - Screen-based node positioning calculations
  - `Network Lines` (*belongs to: Network Topology*) - Network line rendering and connections

### **Node Management**
- `[Nodes]` - Node state, ownership, and rendering management
  - `Node Ownership` (*belongs to: Nodes*) - User/enemy/neutral ownership tracking and transfers
    - `Node Health Calculation` (*belongs to: Node Ownership*) - 75% of total army strength calculation
    - `Ownership Updates` (*belongs to: Node Ownership*) - Permanent capture state and ownership transfers
    - `Ownership Display` (*belongs to: Node Ownership*) - Health tracking and visual state management
    - `Ownership Storage` (*belongs to: Node Ownership*) - Ownership arrays preventing recapture
    - `Ownership Configuration` (*belongs to: Node Ownership*) - Node health calculation parameters
  - `Node Rendering` (*belongs to: Nodes*) - Color coding and visual representation
  - `Node Health` (*belongs to: Nodes*) - Health management and capture progress
  - `Node Types` (*belongs to: Nodes*) - Node type definitions and classifications

### **Combat System**
- `[Combat Calculations]` - Server-side damage and combat logic
  - `Damage Calculation` (*belongs to: Combat Calculations*) - Attack power, defense, and damage formulas
  - `Battalion Combat` (*belongs to: Combat Calculations*) - Direct battalion vs battalion combat system
    - `Combat Damage` (*belongs to: Battalion Combat*) - calculateDamage() and applyDamage() methods
    - `Combat Orchestration` (*belongs to: Battalion Combat*) - Combat orchestration and real-time target monitoring
    - `Combat Range Validation` (*belongs to: Battalion Combat*) - Attack range validation and dynamic positioning
    - `Combat Health Display` (*belongs to: Battalion Combat*) - Battalion health and quantity display
    - `Combat Animation` (*belongs to: Battalion Combat*) - Combat animations and visual feedback
    - `Combat Configuration` (*belongs to: Battalion Combat*) - Bot stats, damage formulas, and combat parameters
  - `Battalion Destruction` (*belongs to: Combat Calculations*) - Battalion destruction detection and cleanup system
    - `Destruction Detection` (*belongs to: Battalion Destruction*) - checkDestruction() and battalion destruction detection
    - `Destruction Broadcasting` (*belongs to: Battalion Destruction*) - Destruction event broadcasting and battle cleanup orchestration
    - `Destruction Animation` (*belongs to: Battalion Destruction*) - Battalion destruction animations
    - `Destruction State Management` (*belongs to: Battalion Destruction*) - Battle phase transitions and destruction state management
  - `Victory Determination` (*belongs to: Combat Calculations*) - Victory condition monitoring and battle end system
    - `Victory Calculations` (*belongs to: Victory Determination*) - Victory condition calculations and point calculations
    - `Victory Monitoring` (*belongs to: Victory Determination*) - Victory condition monitoring and battle end orchestration
    - `Victory State Management` (*belongs to: Victory Determination*) - Battle phase transitions and victory state management
    - `Victory Configuration` (*belongs to: Victory Determination*) - Victory conditions, timer settings, and bot mark values
    - `Reward Calculations` (*belongs to: Victory Determination*) - Reward calculations and determination
  - `Node Capture` (*belongs to: Combat Calculations*) - Tug-of-war capture system (-100% to +100%)
    - `Tug-of-War Algorithm` (*belongs to: Node Capture*) - Damage/health ratio calculations and capture threshold detection
    - `Combat Orchestration` (*belongs to: Node Capture*) - Progress updates and node ownership management
    - `Combat Parameters` (*belongs to: Node Capture*) - Bot stats and node health calculation (75% of total army strength)
    - `Capture Completion` (*belongs to: Node Capture*) - Capture logic and threshold detection
    - `Capture Events` (*belongs to: Node Capture*) - Event logging and audit/replay functionality
    - `Capture Visualization` (*belongs to: Node Capture*) - Node color changes and progress bar lock
    - `Capture Configuration` (*belongs to: Node Capture*) - Capture threshold values (±100%)
    - `Capture Storage` (*belongs to: Node Capture*) - Permanent transfer of node control to capturing side
  - `Victory Conditions` (*belongs to: Combat Calculations*) - Elimination and time-based victory logic

### **Battle System Hierarchy**
- `[Battalions]` - Main battle entity orchestration
  - `[Movement]` (*belongs to: Battalions*) - Battalion movement execution
    - `Movement Logic` (*belongs to: Movement*) - Initial movement calculations and network path validation
    - `Movement Configuration` (*belongs to: Movement*) - Bot movement speed stats and network topology
    - `Movement State` (*belongs to: Movement*) - Real-time battalion position updates
    - `Movement Visualization` (*belongs to: Movement*) - Battalion movement animation along network lines
    - `Network Constraints` (*belongs to: Movement*) - Network path validation and constraint enforcement
    - `Attack Range Positioning` (*belongs to: Movement*) - Network-constrained stopping position calculation
    - `Movement Completion` (*belongs to: Movement*) - Movement completion and final positioning
    - `Dynamic Movement` (*belongs to: Movement*) - Dynamic pathfinding and target tracking
      - `Dynamic Pathfinding` (*belongs to: Dynamic Movement*) - Dynamic pathfinding and target tracking
      - `Dynamic Position Updates` (*belongs to: Dynamic Movement*) - Real-time position updates and target validation
      - `Dynamic Attack Range` (*belongs to: Dynamic Movement*) - Attack range calculations and positioning
      - `Dynamic Visualization` (*belongs to: Dynamic Movement*) - Real-time movement visualization
      - `Dynamic Path Rendering` (*belongs to: Dynamic Movement*) - Dynamic movement path rendering
      - `Dynamic Configuration` (*belongs to: Dynamic Movement*) - Network connections and bot movement speeds
    - `Movement Interpolation` (*belongs to: Movement*) - Planned smooth movement animation
    - `Movement Effects` (*belongs to: Movement*) - Planned visual movement indicators
  - `[Targeting]` (*belongs to: Battalions*) - Battalion target selection
    - `Target Selection` (*belongs to: Targeting*) - Core targeting algorithm and validation
    - `Target Range` (*belongs to: Targeting*) - Attack range and behavior parameters
    - `Target UI` (*belongs to: Targeting*) - Node state management and targeting visualization
    - `Retargeting` (*belongs to: Targeting*) - Dynamic target switching logic
      - `Retargeting Logic` (*belongs to: Retargeting*) - findClosestTarget() and retargeting logic
      - `Retargeting Orchestration` (*belongs to: Retargeting*) - Retargeting orchestration and state management
      - `Retargeting Pathfinding` (*belongs to: Retargeting*) - Pathfinding calculations and target validation
      - `Retargeting Visualization` (*belongs to: Retargeting*) - Battalion retargeting visual updates
      - `Retargeting Animation` (*belongs to: Retargeting*) - Retargeting movement animations
      - `Retargeting Configuration` (*belongs to: Retargeting*) - Network connections and bot movement speeds

---

## Migration Path

### **Phase 1: Consolidate Timer System**
- Move all timer functionality to independent Timer System
- Remove timer references from Battle State Management
- Establish clear borrowing patterns

### **Phase 2: Organize Overlay System**
- Move overlays to child of Battle State
- Establish borrowing relationships with Timer System
- Remove duplicate overlay references

### **Phase 3: Clean Up Dependencies**
- Remove circular dependencies
- Establish linear dependency flow
- Document all borrowing relationships

### **Phase 4: Finalize Structure**
- Update all documentation
- Ensure consistency across files
- Establish clear ownership patterns
