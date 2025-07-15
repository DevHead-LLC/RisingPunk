# Battalion and Bot Type Behaviors

## Battalion Structure

### Composition
<!-- 
SERVER: 
- server/src/types/battle.ts - IBattalion interface ✅ EXISTS
- server/src/models/Battle.ts - Battalion schema ✅ EXISTS  
- server/src/config/battleConfig.ts - BOT_STATS configuration ✅ EXISTS
CLIENT:
- mobile/src/types/battle.ts - Battalion interface ✅ EXISTS
- mobile/src/hooks/useBots.ts - BotType definitions ✅ EXISTS
-->
- **Bot Type**: Determines base stats and abilities
- **Quantity**: Number of bots in the battalion
- **Equipment**: Bonuses from items and gear
- **Position**: Current location on network nodes

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 1: Setup -> Battalion Placement*
- *Referenced in battle-intentions.md -> Victory Conditions -> Bot mark values for points calculation*

### Battalion States
<!-- 
SERVER:
- server/src/services/BattleUpdater.ts - State transitions ✅ EXISTS
- server/src/services/BattleMovement.ts - Movement state handling ✅ EXISTS
- server/src/types/battle.ts - State enums and interfaces ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBattleBattalions.ts - State display ✅ EXISTS (deprecated, shows server state)
-->
- **Active**: Participating in battle
- **Moving**: Traveling along network lines
- **Attacking**: Engaging targets (nodes or other battalions)
- **Destroyed**: All units lost, removed from battle

## Combat Mechanics

### Attack Power Calculation
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - calculateDamage() method ✅ EXISTS
- server/src/config/battleConfig.ts - BOT_STATS for base values ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBattalionData.ts - ✅ EXISTS (marked for deprecation)
-->
```
Attack Power = (Bot Type Strength + Equipment Bonuses) × Quantity
```

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 3: Node Combat (Tug-of-War) -> Attack calculations for tug-of-war system*
- *Referenced in battle-intentions.md -> Phase 5: Battalion Combat -> Damage calculation formula*

### Defense Calculation
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - calculateDamage() method ✅ EXISTS
- server/src/config/battleConfig.ts - BOT_STATS for base values ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBattalionData.ts - ✅ EXISTS (marked for deprecation)
-->
```
Defense % = Bot Type Defense + Equipment Bonuses
```

### Damage Calculation
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - calculateDamage() method ✅ EXISTS
CLIENT:
- Calculations handled server-side, client displays results only
-->
```
Damage = Attack Power / (Defense % * 100)
```

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 5: Battalion Combat -> Damage calculation formula*

### Unit Loss System
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - applyDamage() method ✅ EXISTS
- server/src/services/BattleCalculator.ts - checkDestruction() method ✅ EXISTS
CLIENT:
- Visual representation in mobile/src/components/battle/ components ✅ EXISTS
-->
- **Damage Application**: Damage reduces bot quantity
- **Health Reduction**: Each bot lost reduces total battalion health
- **Power Reduction**: Fewer bots = less attack power
- **Destruction**: When quantity reaches 0, battalion is destroyed

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 5: Battalion Combat -> Unit loss mechanics and battalion destruction*
- *Referenced in battle-intentions.md -> Phase 6: Victory -> Side with fewer losses wins*

## Bot Type Stats

### Base Characteristics
<!-- 
SERVER:
- server/src/config/battleConfig.ts - BOT_STATS & ENEMY_BOT_STATS ✅ EXISTS
- server/src/services/BattleService.ts - Bot instantiation with stats ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBots.ts - BOT_CATEGORIES & ENEMY_BOT_CATEGORIES ✅ EXISTS
-->
- **Strength**: Base attack power per bot
- **Defense**: Percentage damage reduction
- **Health**: Base health per bot
- **Speed**: Movement speed along network lines
- **Range**: Attack range from current position

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 2: Initial Targeting -> Stop at exact attack range distance*
- *Referenced in battle-intentions.md -> Phase 5: Battalion Combat -> Bot type strength in damage calculations*

### Bot Categories

#### Guardian (Cavalry)
<!-- 
SERVER:
- server/src/config/battleConfig.ts - BOT_STATS.guardian ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBots.ts - BOT_CATEGORIES.guardian ✅ EXISTS
-->
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
<!-- 
SERVER:
- server/src/config/battleConfig.ts - BOT_STATS.breacher ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBots.ts - BOT_CATEGORIES.breacher ✅ EXISTS
-->
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
<!-- 
SERVER:
- server/src/config/battleConfig.ts - BOT_STATS.phreak ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBots.ts - BOT_CATEGORIES.phreak ✅ EXISTS
-->
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
<!-- 
SERVER:
- server/src/config/battleConfig.ts - ENEMY_BOT_STATS ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBots.ts - ENEMY_BOT_CATEGORIES ✅ EXISTS
-->
- **Multiplier**: Enemy bots have 4x higher attack power for quicker battle results
- **Health Boost**: 2x higher health for testing purposes
- **Note**: These are temporary testing values and will be rebalanced

### Stat Relationships
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - 🔄 NEEDS ENHANCEMENT for type advantage calculations
- server/src/config/battleConfig.ts - Base stats ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBots.ts - Advantage descriptions ✅ EXISTS
-->
- **Rock-Paper-Scissors**: Guardian > Breacher > Phreak > Guardian
- **Speed vs Range**: Higher speed = lower range, lower speed = higher range
- **Health vs Defense**: Higher health = higher defense, lower health = lower defense
- **Offense Balance**: All types have similar offense values (6-8)

## Battalion Movement

### Movement Rules
<!-- 
SERVER:
- server/src/services/BattleMovement.ts - validatePath() method ✅ EXISTS
- server/src/services/BattleMovement.ts - moveAlongPath() method ✅ EXISTS
- server/src/config/battleConfig.ts - NETWORK_CONNECTIONS ✅ EXISTS
CLIENT:
- mobile/src/utils/networkConstants.ts - ✅ EXISTS (for display only)
- mobile/src/utils/pathfinding.ts - ✅ EXISTS (deprecated, server handles)
-->
- **Network Constraint**: Must follow predefined network connections
- **Speed Factor**: Bot type determines movement speed
- **Initial Movement**: Move to randomly selected neutral nodes at battle start
- **Retargeting Movement**: Move to closest available targets after initial phase

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 2: Initial Targeting -> Battalion movement along network lines*
- *Referenced in battle-intentions.md -> Phase 4: Retargeting and Movement -> Movement follows same rules along network lines*

### Pathfinding
<!-- 
SERVER:
- server/src/services/BattleMovement.ts - calculatePath() method (Dijkstra's algorithm) ✅ EXISTS
- server/src/services/BattleMovement.ts - findClosestTarget() method ✅ EXISTS
- server/src/services/BattleMovement.ts - checkRetargetingNeeded() method ✅ EXISTS
- server/src/services/BattleMovement.ts - assignInitialTargets() method ✅ EXISTS
CLIENT:
- mobile/src/utils/pathfinding.ts - ✅ EXISTS (deprecated, server handles)
-->
- **Initial Target Selection**: At battle start, battalions pick random neutral nodes connected to their current position (see battle-intentions.md Phase 2)
- **Retargeting**: After initial phase, always pick closest available target via network lines (see battle-intentions.md Phase 4)
- **Route Calculation**: Find shortest path through network using Dijkstra's algorithm
- **Path Recalculation**: Recalculate path when target changes position or is destroyed/captured

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 2: Initial Targeting -> Random target selection process*
- *Referenced in battle-intentions.md -> Phase 4: Retargeting and Movement -> Proximity-based pathfinding algorithm*

## Targeting Behavior

### Target Priority
<!-- 
SERVER:
- server/src/services/BattleMovement.ts - findClosestTarget() method ✅ EXISTS
- server/src/services/BattleMovement.ts - assignInitialTargets() method ✅ EXISTS
CLIENT:
- Visual representation only through mobile/src/components/battle/ components
-->
1. **Initial Targeting**: Random neutral node selection at battle start (connected to current position)
2. **Retargeting**: Always prefer closest available target via network lines proximity
3. **Target Types**: Neutral nodes (3, 4, 5) and enemy battalions

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 4: Retargeting and Movement -> Closest available target selection*
- *Referenced in battle-intentions.md -> Phase 4: Retargeting and Movement -> Target types (neutral nodes and enemy battalions)*

### Target Selection Process
<!-- 
SERVER:
- server/src/services/BattleMovement.ts - findClosestTarget() method ✅ EXISTS
- server/src/services/BattleMovement.ts - executeBattalionMovement() method ✅ EXISTS
- server/src/services/BattleMovement.ts - checkRetargetingNeeded() method ✅ EXISTS
- server/src/services/BattleMovement.ts - assignInitialTargets() method ✅ EXISTS
CLIENT:
- Visual feedback in mobile/src/components/battle/BattleBattalion.tsx ✅ EXISTS
-->

#### Phase 1: Initial Targeting (Battle Start)
1. **Random Selection**: Each battalion picks a neutral node at random from connected options
2. **Connection Constraint**: Can only target neutral nodes connected to current position
3. **Multiple Targeting**: Multiple battalions can target the same node
4. **Single Target Rule**: Each battalion can only attack one target at a time

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 2: Initial Targeting -> Random selection, connection constraints, multiple targeting rules*

#### Phase 2: Retargeting (After Initial Phase)
1. **Scan Available Targets**: Check connected nodes and enemy battalions
2. **Calculate Distances**: Find shortest path to each target via network lines
3. **Select Closest**: Pick target with shortest travel distance using pathfinding algorithm
4. **Dynamic Updates**: Monitor target position changes and destruction events
5. **Move Toward Target**: Follow calculated path along network lines
6. **Attack Range**: Stop at exact attack range from target (where attack range edge intersects center of target)

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 2: Initial Targeting -> Stop at exact attack range distance*
- *Referenced in battle-intentions.md -> Phase 4: Retargeting and Movement -> Dynamic target updates for destroyed/moved targets*
- *Referenced in battle-intentions.md -> Phase 4: Retargeting and Movement -> Attack range positioning*

## Combat Phases

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 1: Setup -> 3-second countdown begins*
- *Referenced in battle-intentions.md -> Phase 6: Victory -> 20-second battle timer and victory conditions*

### Node Combat
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - calculateNodeCapture() method ✅ EXISTS
- server/src/services/BattleCalculator.ts - checkNodeCapture() method ✅ EXISTS
- server/src/services/BattleUpdater.ts - orchestrates node combat ✅ EXISTS
CLIENT:
- mobile/src/components/battle/BattleNetworkGrid.tsx - visual representation ✅ EXISTS
-->
- **Target**: Neutral nodes (3, 4, 5)
- **Mechanic**: Tug-of-war capture system
- **Duration**: Until node is captured
- **Retargeting**: When node is captured, find new target

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 3: Node Combat (Tug-of-War) -> Continuous battalion attacks on neutral nodes*
- *Referenced in battle-intentions.md -> Phase 4: Retargeting and Movement -> When neutral node is captured, need new targets*

### Battalion Combat
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - calculateDamage() method ✅ EXISTS
- server/src/services/BattleCalculator.ts - applyDamage() method ✅ EXISTS
- server/src/services/BattleUpdater.ts - orchestrates battalion combat ✅ EXISTS
CLIENT:
- mobile/src/components/battle/BattleBattalion.tsx - visual representation ✅ EXISTS
-->
- **Target**: Enemy battalions
- **Mechanic**: Direct damage system
- **Duration**: Until target is destroyed or moves out of range of attack
- **Retargeting**: When target is destroyed, find new target OR when target moves out of range retarget

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 5: Battalion Combat -> Direct battalion vs battalion attacks*

## Health and Damage System

**Cross-Reference**: *Referenced in battle-intentions.md -> Victory Conditions -> Unit loss tracking for victory points*

### Health Calculation
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - health calculations in createBattalion methods ✅ EXISTS
- server/src/services/BattleService.ts - initial health setup ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBattalionData.ts - ✅ EXISTS (marked for deprecation)
-->
```
Total Health = (Bot Type Health + equipment or item bonuses) × Quantity
```

### Damage Application
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - applyDamage() method ✅ EXISTS
- server/src/services/BattleCalculator.ts - checkDestruction() method ✅ EXISTS
CLIENT:
- Visual feedback in mobile/src/components/battle/ components ✅ EXISTS
-->
- **Quantity Reduction**: Damage reduces bot count
- **Health Update**: Recalculate total health based on new quantity
- **Power Update**: Recalculate attack power based on new quantity
- **Destruction Check**: If quantity = 0, destroy battalion

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 5: Battalion Combat -> Damage application and quantity reduction*

### Equipment Effects
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - getAttackBonuses() & getDefenseBonuses() methods ✅ EXISTS (stubs)
- server/src/config/battleConfig.ts - 🔄 NEEDS ENHANCEMENT for equipment configurations
CLIENT:
- Equipment UI in mobile/src/components/botAssembly/ ✅ EXISTS
-->
- **Attack Bonuses**: Increase attack power
- **Defense Bonuses**: Increase damage reduction
- **Health Bonuses**: Increase total health
- **Speed Bonuses**: Increase movement speed

## Battalion Lifecycle

### Creation
<!-- 
SERVER:
- server/src/services/BattleService.ts - createBattle() method ✅ EXISTS
- server/src/services/BattleService.ts - initializeBattle() method ✅ EXISTS
- server/src/models/Battle.ts - Battalion schema ✅ EXISTS
CLIENT:
- mobile/src/components/battle/BattleBattalionManager.tsx - visual creation ✅ EXISTS
-->
- **Setup Phase**: Battalions placed on user nodes (enemy battalions placed on enemy nodes)
- **Initial State**: Full health and quantity
- **Starting Position**: User battalions assigned to user nodes (0, 1, 2) && enemy battalions assigned to enemy nodes (6, 7, 8)

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 1: Setup -> Battalion appearance on left/right sides*

### Active Battle
<!-- 
SERVER:
- server/src/services/BattleUpdater.ts - main battle loop ✅ EXISTS
- server/src/services/BattleMovement.ts - movement execution ✅ EXISTS
- server/src/services/BattleCalculator.ts - combat calculations ✅ EXISTS
- server/src/services/BattleTimer.ts - phase management ✅ EXISTS
CLIENT:
- mobile/src/components/battle/ - visual representation ✅ EXISTS
-->
- **Movement**: Travel along network lines and to nodes to switch between lines
- **Combat**: Attack nodes and enemy battalions
- **Damage**: Take damage from enemy attacks
- **Retargeting**: Find new targets when needed

### Destruction
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - checkDestruction() method ✅ EXISTS
- server/src/services/BattleUpdater.ts - destruction handling ✅ EXISTS
- server/src/models/BattleEvent.ts - destruction event logging ✅ EXISTS
CLIENT:
- mobile/src/components/battle/BattleBattalion.tsx - destruction animation ✅ EXISTS
-->
- **Trigger**: Quantity reaches 0
- **Removal**: Battalion removed from battle
- **Impact**: Enemy gains victory points

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 5: Battalion Combat -> Battalion destruction and removal*
- *Referenced in battle-intentions.md -> Phase 6: Victory -> Victory points calculation based on units lost*

## Strategic Considerations

**Cross-Reference**: *Referenced in battle-intentions.md -> Victory Conditions -> Defender advantage in tie situations*

### Battalion Management
<!-- 
SERVER:
- server/src/services/BattleUpdater.ts - health monitoring ✅ EXISTS
- server/src/services/BattleMovement.ts - positioning logic ✅ EXISTS
CLIENT:
- mobile/src/components/battle/BattleBattalionManager.tsx - visual management ✅ EXISTS
-->
- **Health Monitoring**: Track battalion health and quantity
- **Positioning**: Strategic placement for optimal attacks

### Combat Tactics
<!-- 
SERVER:
- server/src/services/BattleMovement.ts - targeting logic allows multiple battalions on same target ✅ EXISTS
- server/src/services/BattleCalculator.ts - damage calculations support focus fire ✅ EXISTS
CLIENT:
- Visual representation in mobile/src/components/battle/ components ✅ EXISTS
-->
- **Focus Fire**: Multiple battalions attack same target

### Type-Specific Strategies
<!-- 
SERVER:
- server/src/services/BattleCalculator.ts - 🔄 NEEDS ENHANCEMENT for type advantage calculations
- server/src/config/battleConfig.ts - base stats support strategies ✅ EXISTS
CLIENT:
- mobile/src/hooks/useBots.ts - advantage descriptions ✅ EXISTS
-->
- **Guardian**: Use speed advantage for quick positioning and flanking
- **Breacher**: Leverage high health and defense for sustained combat
- **Phreak**: Utilize long range to attack from safe distances