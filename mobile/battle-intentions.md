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
- Enemy battalions appear on the right side (bigger numbers)
- Neutral nodes in center get health equal to 75% of total army strength
- 3-second countdown begins

### Phase 2: Initial Targeting
- Each battalion picks a neutral node to attack
- Can only target neutral nodes connected to their current position
- Battalions move along network lines toward their targets
- Stop at exact attack range distance from target

### Phase 3: Node Combat (Tug-of-War)
- Battalions attack neutral nodes continuously
- Each attack pushes the node toward your side or enemy side
- Progress bar goes from -100% (enemy control) to +100% (your control)
- When progress reaches ±100%, the node is captured
- Captured nodes change color and can't be attacked anymore
- Captured nodes provide advantages to controlling army

### Phase 4: Retargeting
- When a neutral node is captured, attacking battalions need new targets
- They pick the closest available target (neutral nodes or enemy battalions)
- If targeting enemy battalions, they use complex pathfinding through the network
- Movement follows the same rules - along network lines to attack range

### Phase 5: Battalion Combat
- Battalions can attack each other directly
- Damage calculation: (Bot type strength + bonuses) * number of bots = total damage per attack
- When a battalion takes damage, bot quantity is reduced
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
- Can't move diagonally or off the network
- Must move through nodes to reach different network lines
- Stop at exact attack range distance from targets

### Targeting
- Always pick the closest available target
- No preference between neutral nodes and enemy battalions
- Multiple battalions can attack the same target
- Retarget immediately when current target is captured/destroyed

### Combat
- **Attack Power**: (Bot type strength + bonuses) * number of bots = total damage per attack
- **Defense**: Percentage reduction based on bot type + bonuses
- **Damage**: Attack power reduced by defender's defense %
- **Unit Loss**: Damage reduces bot quantity, weakening the battalion
- Neutral nodes use tug-of-war progress system
- Battalion combat reduces health until units are lost

### Strategy
- Control neutral nodes for tactical advantages
- Block enemy access to neutral nodes
- Use network topology to your advantage
- Manage battalion health and positioning
- Destroy opposing army completely

## Network Layout
- **Left side**: Your nodes (0,1,2) - permanent control
- **Center**: Neutral nodes (3,4,5) - provide advantages when controlled
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
- **Tie**: Enemy wins automatically
- **Rewards**: Victor gains money, items, and other benefits 