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
- Battle screen loads showing the network
- Your battalions appear on the left side
- Enemy battalions appear on the right side
- Neutral nodes in center get health equal to 75% of total army strength
- 3-second countdown begins

### Phase 2: Initial Targeting
- Each battalion picks a neutral node to attack at random
- Can only target neutral nodes connected to their current position
- Battalions move along network lines toward their targets
- Stop at exact attack range distance from target
- Multiple battalions can target the same node, however battalions can only target and attack a single target (not multiple targets)

### Phase 3: Node Combat (Tug-of-War)
- Battalions attack neutral nodes continuously
- Each attack pushes the node toward your side or enemy side
- Progress bar goes from -100% (enemy control) to +100% (your control)
- When progress reaches ±100%, the node is captured
- Captured nodes change color to appropriate controlling party color and can't be attacked anymore

### Phase 4: Retargeting and Movement
- When a neutral node is captured, attacking battalions need new targets
- They pick the closest available target (neutral nodes or enemy battalions)
- Movement follows the same rules - along network lines to attack range
- Retareting is based on proximity using the network lines and a pathfinding algorithm which sets up their movement path
- If targeting battalions, a connection is made to notify the 'attacking' battalion if their the 'defending' target is destroyed or moves from the anticipated position to keep target destination position up to date
- Attacking battalions movement stop to begin attack sequence when target center and attack range intersect (or target is within attack range)

### Phase 5: Battalion Combat
- Battalions can attack each other directly
- Damage calculation: (Bot type strength + bonuses) * number of bots = total damage per attack
- When a battalion takes damage, bot quantity is reduced in coordination with health
- Reduced quantity = less health and attack power
- When all units are lost, the battalion is destroyed
- Destroyed battalions are removed from the battle

### Phase 6: Victory
- Battle ends after 20 seconds OR when one side is completely eliminated
- Victory points are calculated based on units lost
- Side with fewer losses wins
- If tied, enemy wins (defender advantage)
- Victor gains benefits (money, items, etc.) to be determined later

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
- **Timer**: 20-second time limit
- **Elimination**: Destroy all enemy battalions completely
- **Points**: Fewer losses wins (based on bot mark values)
- **Tie**: Enemy wins automatically && a single unit is 'saved' (lowest mark brought to battle)
- **Rewards**: Victor gains money, items, and other benefits tbd at a later time