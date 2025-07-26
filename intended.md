# Intended Battle Flow

## 1. Battle Start
- User clicks "Deploy Purge" in BattlePreparationScreen
- 3-second countdown timer starts
- Battalions spawn at their home nodes (0,1,2 for user, 6,7,8 for enemy)

## 2. Initial Movement Phase
- When countdown ends, battalions randomly pick neutral nodes (3,4,5) to attack
- Battalions move along network lines to attack range of their target node
- They stop at attack range distance, NOT on the node center
- Movement follows their speed stats and takes time

## 3. Initial Combat Phase
- Battalions attack their target nodes with tug-of-war damage
- Multiple battalions can attack the same node
- **Tug-of-War System:**
  - Total army health is calculated for damage scaling
  - Node control starts at 0% (neutral)
  - **+100% = User control** (attacker wins the node)
  - **-100% = Enemy control** (defender wins the node)
  - Damage from user battalions pushes control toward +100%
  - Damage from enemy battalions pushes control toward -100%
  - First side to reach ±100% permanently captures the node
- **Battalions must stop to attack - cannot attack while moving**

## 4. Node Capture & Retargeting
- When a node is captured, it becomes owned by the capturing party and un-attackable
- **Only battalions attacking the captured node stop attacking and retarget**
- Other battalions continue attacking their current targets until those nodes are captured
- Retargeting finds the NEAREST target using network pathfinding:
  - **Targets:** EITHER uncaptured neutral nodes OR enemy battalions
  - **Selection:** Whichever is closer to the battalion's current position
  - **No priority system:** Pure proximity-based selection
- Distance measured along network paths, not straight lines
- **For equidistant targets:** Random selection
- **Retargeting queuing:** Multiple simultaneous captures are processed in sequence to avoid race conditions

## 5. Sequential Movement Phase
- Retargeted battalions **immediately stop current attacks** and begin movement
- Move node-by-node along calculated network paths
- Move to node centers for intermediate nodes to access new network connections
- Stop at attack range for the final target (closest network position with line-of-sight)
- Movement respects network topology - no shortcuts or jumps
- **If movement is interrupted by another capture, stop immediately and retarget**

## 6. Ongoing Combat (Future Phases)
- Battalions continue attacking until battle ends
- Process repeats: attack → capture → retarget → move → attack
- **Future:** Battalion-to-battalion combat with health/destruction
- **Future:** Multiple retargeting triggers (battalion destruction, multiple captures)

## Key Rules & Network Lock-in
- **Battalions NEVER leave the network lines** (movement, targeting, attacking)
- Movement is always node-to-node following NETWORK_CONNECTIONS
- **Attack range positioning:** Move to closest network node with line-of-sight to target
- **Cross-network targeting is valid:** Battalion at 0-3 line can target enemy at 5-8 line by moving: 0→3→7→5→(attack range toward 8)
- **Example pathfinding:** Node 0 → Node 3 (new connections available) → Node 7 (new connections) → Attack range of Node 5
- Only neutral nodes can be attacked (owned nodes become un-attackable)
- Retargeting only triggered by node capture of the specific node being attacked
- **Server authority:** All movement, targeting, and positioning calculated server-side and sent to client
