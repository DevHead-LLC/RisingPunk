# Appendix A: Implementation Reference Data

## Bot Type Complete Specifications

### Guardian (Cavalry)
- **Role**: Cavalry
- **Stats**:
  - Health: 14
  - Speed: 9
  - Range: 4
  - Offense: 8
  - Defense: 6
- **Advantage**: Strong vs. Infantry (Breacher), Weak vs. Ranged (Phreak)
- **Lore**: "IRL: Inspired by 'packet guardian' programs from the 1990s that network administrators used to monitor and filter suspicious traffic."

### Breacher (Infantry)
- **Role**: Infantry
- **Stats**:
  - Health: 18
  - Speed: 5
  - Range: 5
  - Offense: 7
  - Defense: 8
- **Advantage**: Strong vs. Ranged (Phreak), Weak vs. Cavalry (Guardian)
- **Lore**: "IRL: Named after 'breach and clear' tactics used in early penetration testing, where security teams would methodically break through firewall layers."

### Phreak (Ranged)
- **Role**: Ranged
- **Stats**:
  - Health: 12
  - Speed: 7
  - Range: 9
  - Offense: 6
  - Defense: 5
- **Advantage**: Strong vs. Cavalry (Guardian), Weak vs. Infantry (Breacher)
- **Lore**: "IRL: Based on 'phone phreakers' from the 1970s who used blue boxes to manipulate telephone systems and make free long-distance calls."

## Mathematical Formulas

### Node Health Calculation
```
Node Health = Math.floor(total_army_health * 0.75)
```
Where `total_army_health` = (user army health + enemy army health)

### Unit Loss Calculation
```
Units Lost = Math.round((damage - remaining_health) ÷ health_per_bot_type)
```

### Attack Power Calculation
```
Attack Power = (Bot Type Offense + Equipment Bonuses) × Battalion Quantity
```

### Defense Calculation
```
Defense % = Bot Type Defense + Equipment Bonuses
```

### Final Damage Calculation
```
Final Damage = (Attack Power × Type Advantage Multiplier) ÷ (Defense % ÷ 100)
```

## Network Topology Mapping

### User Nodes (Permanent)
- **Node 0 (top-left)**: Connects to nodes 3, 4
- **Node 1 (middle-left)**: Connects to nodes 3, 4, 5
- **Node 2 (bottom-left)**: Connects to nodes 4, 5

### Enemy Nodes (Permanent)
- **Node 6 (top-right)**: Connects to nodes 3, 4
- **Node 7 (middle-right)**: Connects to nodes 3, 4, 5
- **Node 8 (bottom-right)**: Connects to nodes 4, 5

### Neutral Nodes (Capturable)
- **Node 3 (top-center)**: Connection hub between user/enemy zones
- **Node 4 (middle-center)**: Connection hub between user/enemy zones
- **Node 5 (bottom-center)**: Connection hub between user/enemy zones

## Visual Design Specifications

### Node Colors
- **User Controlled**: Blue (#4717F6)
- **Enemy Controlled**: Red (#FF4141)
- **Neutral**: Secondary color (gray #666666)

### Progress Bar Colors
- **User Progress**: Blue gradient toward +100%
- **Enemy Progress**: Red gradient toward -100%
- **Neutral State**: Gray at 0%

## Testing Configuration (Temporary)

### Enemy Bot Multipliers
- **Attack Multiplier**: 4x higher attack power for quicker battle results
- **Health Boost**: 2x higher health for testing purposes
- **Note**: These are temporary testing values and will be rebalanced

### Battle Timer
- **Countdown Phase**: 3 seconds
- **Battle Phase**: 20 seconds total
- **Victory Condition**: Timer expiration OR complete army elimination

## Type Advantage System

### Rock-Paper-Scissors Rules
- **Guardian** beats **Breacher** (Cavalry beats Infantry)
- **Breacher** beats **Phreak** (Infantry beats Ranged)
- **Phreak** beats **Guardian** (Ranged beats Cavalry)

### Damage Multipliers (Implementation TBD)
- **Type Advantage**: ~1.5x damage multiplier (needs configuration)
- **Type Disadvantage**: ~0.75x damage multiplier (needs configuration)
- **Neutral Matchup**: 1.0x damage multiplier

## Equipment System (Implementation TBD)

### Bonus Types
- **Attack Bonuses**: Increase attack power
- **Defense Bonuses**: Increase damage reduction percentage
- **Health Bonuses**: Increase total health per bot
- **Speed Bonuses**: Increase movement speed along network lines

### Application Order
1. **Base Stats** (from bot type)
2. **Equipment Bonuses** (added to base)
3. **Type Advantages** (multiplier applied)
4. **Final Calculation** (damage resolution)

## Victory Conditions Detail

### Victory Point Calculation
- **Basis**: Bot mark values (cost to build) × units lost
- **Winner**: Side with fewer total losses
- **Tie-Breaker**: Enemy wins automatically (defender advantage)
- **Saved Unit**: User's single lowest-mark unit survives tie scenario

### Rewards System (TBD)
- **Victor Benefits**: Money, items, experience, achievements
- **Implementation**: To be determined in future phases
- **Placeholder**: Victory overlay should include rewards section

## Performance Specifications

### Server Update Timing
- **Battle Update Loop**: Every 100ms per battle
- **Movement Execution**: Every 100ms server-side
- **State Calculation**: Every 100ms server-side
- **Target Performance**: <50ms per 100ms interval

### Client Synchronization
- **Client Polling**: Every 1 second (1000ms)
- **Visual Interpolation**: 60fps (16.67ms intervals)
- **Coordination**: 100ms server updates, 1s client polling, 60fps interpolation

## Pathfinding Algorithm

### Algorithm Specification
- **Algorithm**: Dijkstra's algorithm for shortest paths
- **Implementation**: Server-side in `BattleMovement.ts`
- **Purpose**: Calculate shortest network paths for targeting and movement
- **Constraint**: Must follow network topology connections only

### Bot Mark Values (TBD)

### Mark Value System
- **Purpose**: Calculate victory points based on units lost
- **Calculation**: Bot mark values (cost to build) × units lost for each side
- **Implementation**: Values need to be defined in `battleConfig.ts`
- **Usage**: Victory point calculation, tie-breaker for saved unit (lowest mark) 