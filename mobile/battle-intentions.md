# Battle System Intentions Document

## Overview
A strategic battle system where bot battalions compete to destroy the opposing army entirely. Think chess with bots moving along network lines to gain tactical advantages and eliminate enemy forces. The attacker aims to destroy the defender's army, steal money, and gain other benefits. Node control provides advantages during movement and combat phases.

## Core Rules
- **User nodes (0,1,2)**: Permanently yours, can't be captured
- **Enemy nodes (6,7,8)**: Permanently theirs, can't be captured  
- **Neutral nodes (3,4,5)**: Provide tactical advantages - can be captured by either side && once captured, cannot be recaptured
- **Movement**: Battalions must follow network lines between nodes
- **Combat**: Health-based system where stronger battalions win by attack strength - defense which will result in health and quantity losses for each side until a victor emerges

## Battle Flow

### Phase 1: Setup (3 seconds)
- Battle screen loads showing the network *(see node-behaviors.md -> Network Topology -> Node Positions)*
- Your battalions appear on the left side *(see battalion-bot-behaviors.md -> Battalion Lifecycle -> Creation -> Starting Position)*
- Enemy battalions appear on the right side *(see battalion-bot-behaviors.md -> Battalion Lifecycle -> Creation -> Starting Position)*
- Neutral nodes in center get health equal to 75% of total army strength *(see node-behaviors.md -> Node Health System -> Health Assignment)*
- 3-second countdown begins *(see battalion-bot-behaviors.md -> Combat Phases, node-behaviors.md -> Node Types -> Neutral Nodes)*

**Cross-References:**
- **Battalion Placement**: battalion-bot-behaviors.md -> Battalion Structure -> Composition
- **Node Types**: node-behaviors.md -> Node Types -> Permanent Nodes & Neutral Nodes  
- **Network Layout**: node-behaviors.md -> Network Topology -> Network Connections
- **Health Calculation**: node-behaviors.md -> Node Health System -> Health Assignment -> Formula

### Phase 2: Initial Targeting
- Each battalion picks a neutral node to attack at random *(see battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 1: Initial Targeting -> Random Selection)*
- Can only target neutral nodes connected to their current position *(see battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 1: Initial Targeting -> Connection Constraint, node-behaviors.md -> Network Topology -> Network Connections)*
- Battalions move along network lines toward their targets *(see battalion-bot-behaviors.md -> Battalion Movement -> Movement Rules -> Initial Movement)*
- Stop at exact attack range distance from target *(see battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 2: Retargeting -> Attack Range)*
- Multiple battalions can target the same node, however battalions can only target and attack a single target (not multiple targets) *(see battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 1: Initial Targeting -> Multiple Targeting & Single Target Rule)*

**Cross-References:**
- **Random Target Selection**: battalion-bot-behaviors.md -> Battalion Movement -> Pathfinding -> Initial Target Selection
- **Connection Constraints**: node-behaviors.md -> Network Topology -> Network Connections
- **Neutral Node Targeting**: node-behaviors.md -> Node Types -> Neutral Nodes
- **Attack Range**: battalion-bot-behaviors.md -> Bot Type Stats -> Base Characteristics -> Range
- **Movement Rules**: battalion-bot-behaviors.md -> Battalion Movement -> Movement Rules

### Phase 3: Node Combat (Tug-of-War)
- Battalions attack neutral nodes continuously *(see battalion-bot-behaviors.md -> Combat Phases -> Node Combat -> Target & Mechanic)*
- Each attack pushes the node toward your side or enemy side *(see node-behaviors.md -> Neutral Node Capture System -> Tug-of-War Mechanics -> Attack Impact)*
- Progress bar goes from -100% (enemy control) to +100% (your control) *(see node-behaviors.md -> Neutral Node Capture System -> Tug-of-War Mechanics -> Progress Range)*
- When progress reaches ±100%, the node is captured *(see node-behaviors.md -> Neutral Node Capture System -> Tug-of-War Mechanics -> Capture Threshold)*
- Captured nodes change color to appropriate controlling party color and can't be attacked anymore *(see node-behaviors.md -> Node Visual States -> Ownership Colors, node-behaviors.md -> Node Types -> Neutral Nodes -> Behavior)*

**Cross-References:**
- **Node Combat System**: battalion-bot-behaviors.md -> Combat Phases -> Node Combat
- **Tug-of-War Mechanics**: node-behaviors.md -> Neutral Node Capture System -> Tug-of-War Mechanics
- **Capture Process**: node-behaviors.md -> Neutral Node Capture System -> Capture Process
- **Visual Feedback**: node-behaviors.md -> Node Visual States -> Progress Indicators
- **Attack Calculations**: battalion-bot-behaviors.md -> Combat Mechanics -> Attack Power Calculation

### Phase 4: Retargeting and Movement
- When a neutral node is captured, attacking battalions need new targets *(see battalion-bot-behaviors.md -> Combat Phases -> Node Combat -> Retargeting)*
- They pick the closest available target (neutral nodes or enemy battalions) *(see battalion-bot-behaviors.md -> Targeting Behavior -> Target Priority -> Retargeting, battalion-bot-behaviors.md -> Battalion Movement -> Pathfinding -> Retargeting)*
- Movement follows the same rules - along network lines to attack range *(see battalion-bot-behaviors.md -> Battalion Movement -> Movement Rules -> Retargeting Movement)*
- Retargeting is based on proximity using the network lines and a pathfinding algorithm which sets up their movement path *(see battalion-bot-behaviors.md -> Battalion Movement -> Pathfinding -> Route Calculation)*
- If targeting battalions, a connection is made to notify the 'attacking' battalion if their the 'defending' target is destroyed or moves from the anticipated position to keep target destination position up to date *(see battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 2: Retargeting -> Dynamic Updates)*
- Attacking battalions movement stop to begin attack sequence when target center and attack range intersect (or target is within attack range) *(see battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 2: Retargeting -> Attack Range)*

**Cross-References:**
- **Retargeting Logic**: battalion-bot-behaviors.md -> Targeting Behavior -> Target Priority -> Retargeting
- **Pathfinding Algorithm**: battalion-bot-behaviors.md -> Battalion Movement -> Pathfinding -> Route Calculation
- **Movement Rules**: battalion-bot-behaviors.md -> Battalion Movement -> Movement Rules -> Retargeting Movement
- **Dynamic Target Updates**: battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 2: Retargeting -> Dynamic Updates
- **Attack Range Positioning**: battalion-bot-behaviors.md -> Targeting Behavior -> Target Selection Process -> Phase 2: Retargeting -> Attack Range
- **Target Types**: battalion-bot-behaviors.md -> Targeting Behavior -> Target Priority -> Target Types

### Phase 5: Battalion Combat
- Battalions can attack each other directly *(see battalion-bot-behaviors.md -> Combat Phases -> Battalion Combat -> Target & Mechanic)*
- Damage calculation: (Bot type strength + bonuses) * number of bots = total damage per attack *(see battalion-bot-behaviors.md -> Combat Mechanics -> Attack Power Calculation, battalion-bot-behaviors.md -> Combat Mechanics -> Damage Calculation)*
- When a battalion takes damage, bot quantity is reduced in coordination with health *(see battalion-bot-behaviors.md -> Health and Damage System -> Damage Application -> Quantity Reduction)*
- Reduced quantity = less health and attack power *(see battalion-bot-behaviors.md -> Combat Mechanics -> Unit Loss System -> Health Reduction & Power Reduction)*
- When all units are lost, the battalion is destroyed *(see battalion-bot-behaviors.md -> Combat Mechanics -> Unit Loss System -> Destruction, battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction)*
- Destroyed battalions are removed from the battle *(see battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction -> Removal)*

**Cross-References:**
- **Battalion vs Battalion Combat**: battalion-bot-behaviors.md -> Combat Phases -> Battalion Combat
- **Damage Calculations**: battalion-bot-behaviors.md -> Combat Mechanics -> Attack Power Calculation & Damage Calculation
- **Unit Loss System**: battalion-bot-behaviors.md -> Combat Mechanics -> Unit Loss System
- **Health and Damage**: battalion-bot-behaviors.md -> Health and Damage System -> Damage Application
- **Battalion Destruction**: battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction
- **Bot Type Stats**: battalion-bot-behaviors.md -> Bot Type Stats -> Base Characteristics

### Phase 6: Victory
- Battle ends after 20 seconds OR when one side is completely eliminated *(see battalion-bot-behaviors.md -> Combat Phases -> Combat phase management, victory conditions section below)*
- Victory points are calculated based on units lost *(see battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction -> Impact)*
- Side with fewer losses wins *(see battalion-bot-behaviors.md -> Combat Mechanics -> Unit Loss System)*
- If tied, enemy wins (defender advantage) *(see victory conditions section below)*
- Victor gains benefits (money, items, etc.) to be determined later *(see victory conditions section below)*

**Cross-References:**
- **Battle Timer**: battalion-bot-behaviors.md -> Combat Phases -> 20-second battle duration
- **Complete Elimination**: battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction -> Removal
- **Unit Loss Calculations**: battalion-bot-behaviors.md -> Combat Mechanics -> Unit Loss System
- **Victory Points**: battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction -> Impact
- **Tie-Breaker Rules**: Victory Conditions section below

## Key Behaviors

### Movement
- Battalions always stay on network lines
- Can't move off the network
- Must move onto nodes to reach different network lines
- Stop at exact attack range distance from targets (or if target is 'within' attack range distance)

### Targeting
- Always pick the closest available target
- No preference between neutral nodes and enemy battalions
- Multiple battalions can attack the same target
- Retarget immediately when current target is captured/destroyed
- Battalions can only pick a single target and attack a single target at a time

### Combat
- **Attack Power**: (Bot type strength + bonuses) * number of bots = total damage per attack
- **Defense**: Percentage reduction based on bot type + bonuses
- **Damage**: Attack power reduced by defender's defense %
- **Unit Loss**: Damage reduces bot quantity, weakening the battalion; calculated by damage caused minus health which takes the total health of the battalion and divides by the health per unit for bot type, rounded, to determine and adjust remaining quantity of bots in battalion and subsequent remaining attack power
- Neutral nodes use tug-of-war progress system
- Battalion combat reduces health until units are lost

### Strategy
- Destroy opposing army completely

## Network Layout
- **Left side**: Your nodes (0,1,2) - permanent control
- **Center**: Neutral nodes (3,4,5) - open to target intially, permanent after control is taken
- **Right side**: Enemy nodes (6,7,8) - permanent enemy control
- **Connections**: Lines between nodes that battalions must follow

### Network Connections
- **Node 0 (top-left)**: Connects to nodes 3, 4
- **Node 1 (middle-left)**: Connects to nodes 3, 4, 5
- **Node 2 (bottom-left)**: Connects to nodes 4, 5
- **Node 6 (top-right)**: Connects to nodes 3, 4
- **Node 7 (middle-right)**: Connects to nodes 3, 4, 5
- **Node 8 (bottom-right)**: Connects to nodes 4, 5
- **Neutral nodes (3, 4, 5)**: Serve as connection hubs between user and enemy zones

## Bot Types
- **Guardian (Cavalry)**: High speed (9), medium health (14), strong vs Infantry
- **Breacher (Infantry)**: High health (18), high defense (8), strong vs Ranged
- **Phreak (Ranged)**: High range (9), low health (12), strong vs Cavalry

## Victory Conditions
- **Timer**: 20-second time limit *(see battalion-bot-behaviors.md -> Combat Phases -> Battle duration)*
- **Elimination**: Destroy all enemy battalions completely *(see battalion-bot-behaviors.md -> Combat Mechanics -> Unit Loss System -> Destruction, battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction)*
- **Points**: Fewer losses wins (based on bot mark values) *(see battalion-bot-behaviors.md -> Battalion Lifecycle -> Destruction -> Impact)*
- **Tie**: Enemy wins automatically && a single unit is 'saved' (lowest mark brought to battle) *(see battalion-bot-behaviors.md -> Strategic Considerations -> defender advantage)*
- **Rewards**: Victor gains money, items, and other benefits tbd at a later time

**Cross-References:**
- **20-Second Timer**: battalion-bot-behaviors.md -> Combat Phases -> Battle phase timing
- **Battalion Elimination**: battalion-bot-behaviors.md -> Combat Mechanics -> Unit Loss System -> Destruction
- **Loss Calculations**: battalion-bot-behaviors.md -> Health and Damage System -> Unit loss tracking
- **Mark Values**: battalion-bot-behaviors.md -> Battalion Structure -> Composition -> Bot marks
- **Defender Advantage**: battalion-bot-behaviors.md -> Strategic Considerations