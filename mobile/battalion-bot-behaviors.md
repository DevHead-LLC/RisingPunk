# Battalion and Bot Type Behaviors

## Battalion Structure

### Composition
- **Bot Type**: Determines base stats and abilities
- **Quantity**: Number of bots in the battalion
- **Equipment**: Bonuses from items and gear
- **Position**: Current location on network nodes

### Battalion States
- **Active**: Participating in battle
- **Moving**: Traveling along network lines
- **Attacking**: Engaging targets (nodes or other battalions)
- **Destroyed**: All units lost, removed from battle

## Combat Mechanics

### Attack Power Calculation
```
Attack Power = (Bot Type Strength + Equipment Bonuses) × Quantity
```

### Defense Calculation
```
Defense % = Bot Type Defense + Equipment Bonuses
```

### Damage Calculation
```
Damage = Attack Power / (Defense % * 100)
```

### Unit Loss System
- **Damage Application**: Damage reduces bot quantity
- **Health Reduction**: Each bot lost reduces total battalion health
- **Power Reduction**: Fewer bots = less attack power
- **Destruction**: When quantity reaches 0, battalion is destroyed

## Bot Type Stats

### Base Characteristics
- **Strength**: Base attack power per bot
- **Defense**: Percentage damage reduction
- **Health**: Base health per bot
- **Speed**: Movement speed along network lines
- **Range**: Attack range from current position

### Bot Categories

#### Guardian (Cavalry)
- **Role**: Cavalry
- **Stats**:
  - Health: 14
  - Speed: 9
  - Range: 4
  - Offense: 8
  - Defense: 6
- **Advantage**: Strong vs. Infantry, Weak vs. Ranged
- **Lore**: "IRL: Inspired by 'packet guardian' programs from the 1990s that network administrators used to monitor and filter suspicious traffic."

#### Breacher (Infantry)
- **Role**: Infantry
- **Stats**:
  - Health: 18
  - Speed: 5
  - Range: 5
  - Offense: 7
  - Defense: 8
- **Advantage**: Strong vs. Ranged, Weak vs. Cavalry
- **Lore**: "IRL: Named after 'breach and clear' tactics used in early penetration testing, where security teams would methodically break through firewall layers."

#### Phreak (Ranged)
- **Role**: Ranged
- **Stats**:
  - Health: 12
  - Speed: 7
  - Range: 9
  - Offense: 6
  - Defense: 5
- **Advantage**: Strong vs. Cavalry, Weak vs. Infantry
- **Lore**: "IRL: Based on 'phone phreakers' from the 1970s who used blue boxes to manipulate telephone systems and make free long-distance calls."

### Enemy Bot Stats (Temporary for testing)
- **Multiplier**: Enemy bots have 4x higher attack power for quicker battle results
- **Health Boost**: 2x higher health for testing purposes
- **Note**: These are temporary testing values and will be rebalanced

### Stat Relationships
- **Rock-Paper-Scissors**: Guardian > Breacher > Phreak > Guardian
- **Speed vs Range**: Higher speed = lower range, lower speed = higher range
- **Health vs Defense**: Higher health = higher defense, lower health = lower defense
- **Offense Balance**: All types have similar offense values (6-8)

## Battalion Movement

### Movement Rules
- **Network Constraint**: Must follow predefined network connections
- **Speed Factor**: Bot type determines movement speed

### Pathfinding
- **Target Selection**: Always pick closest available target
- **Route Calculation**: Find shortest path through network
- **Retargeting**: Recalculate path when target changes position or is destroyed/captured

## Targeting Behavior

### Target Priority
3. **Distance**: Always prefer closest available target

### Target Selection Process
1. **Scan Available Targets**: Check connected nodes and battalions
2. **Calculate Distances**: Find shortest path to each target
3. **Select Closest**: Pick target with shortest travel distance
4. **Move Toward Target**: Follow calculated path
5. **Attack Range**: Stop at exact attack range from target (where attack range edge intersects center of target)

## Combat Phases

### Node Combat
- **Target**: Neutral nodes (3, 4, 5)
- **Mechanic**: Tug-of-war capture system
- **Duration**: Until node is captured
- **Retargeting**: When node is captured, find new target

### Battalion Combat
- **Target**: Enemy battalions
- **Mechanic**: Direct damage system
- **Duration**: Until target is destroyed or moves out of range of attack
- **Retargeting**: When target is destroyed, find new target OR when target moves out of range retarget

## Health and Damage System

### Health Calculation
```
Total Health = (Bot Type Health + equipment or item bonuses) × Quantity
```

### Damage Application
- **Quantity Reduction**: Damage reduces bot count
- **Health Update**: Recalculate total health based on new quantity
- **Power Update**: Recalculate attack power based on new quantity
- **Destruction Check**: If quantity = 0, destroy battalion

### Equipment Effects
- **Attack Bonuses**: Increase attack power
- **Defense Bonuses**: Increase damage reduction
- **Health Bonuses**: Increase total health
- **Speed Bonuses**: Increase movement speed

## Battalion Lifecycle

### Creation
- **Setup Phase**: Battalions placed on user nodes (enemy battalions placed on enemy nodes)
- **Initial State**: Full health and quantity
- **Starting Position**: User battalions assigned to user nodes (0, 1, 2) && enemy battalions assigned to enemy nodes (6, 7, 8)

### Active Battle
- **Movement**: Travel along network lines and to nodes to switch between lines
- **Combat**: Attack nodes and enemy battalions
- **Damage**: Take damage from enemy attacks
- **Retargeting**: Find new targets when needed

### Destruction
- **Trigger**: Quantity reaches 0
- **Removal**: Battalion removed from battle
- **Impact**: Enemy gains victory points

## Strategic Considerations

### Battalion Management
- **Health Monitoring**: Track battalion health and quantity
- **Positioning**: Strategic placement for optimal attacks

### Combat Tactics
- **Focus Fire**: Multiple battalions attack same target

### Type-Specific Strategies
- **Guardian**: Use speed advantage for quick positioning and flanking
- **Breacher**: Leverage high health and defense for sustained combat
- **Phreak**: Utilize long range to attack from safe distances