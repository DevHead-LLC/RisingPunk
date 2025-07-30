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
- **Only battalions attacking or targeting the captured node stop attacking or moving and retarget**
- Other battalions continue attacking their current targets until those nodes are captured
- Retargeting finds the NEAREST target using network pathfinding:
  - **Targets:** EITHER uncaptured neutral nodes OR enemy battalions
  - **Selection:** Whichever is closer to the battalion's current position
  - **No priority system:** Pure proximity-based selection
- Distance measured along network paths, not straight lines
- **For equidistant targets:** Random selection
- **Retargeting queuing:** Multiple simultaneous captures are processed in sequence to avoid race conditions

## 5. Sequential Movement Phase
- Battalions cannot retarget during attacking phase until node capture or battalion destruction, depending on target respectively
- Battalions who retarget immediately begin movement upon finding a new target
- Move node-by-node along calculated network paths
- Move to node centers for intermediate nodes to access new network connections
- Stop at attack range for the final target (closest network position with line-of-sight)
- Movement respects network topology - no shortcuts or jumps
- **🚨 CRITICAL: If movement is interrupted by current target capture, battalion MUST:**
  - **Stop immediately at its current position** (not jump to destination)
  - **Record exact interruption coordinates** (e.g., 248.0, 326.4) 
  - **Calculate nearest node** based on movement progress (>50% = closer to target node, <50% = closer to start node)
  - **NO instant position jumping** - battalion stays at interruption coordinates until natural movement begins

## 5.1. Natural Recovery Movement After Interruption
- **🎯 DESIRED FLOW FOR INTERRUPTED BATTALIONS:**
  1. **Node capture at current node** (triggers interruption process)
  2. **Retarget to new node and begin moving along path** (normal retargeting)
  3. **Targeted node is captured (while moving)** (interruption trigger)
  4. **Stop movement pattern record position** - battalion stops at exact coordinates on the spot
  5. **Retarget from recorded position IF NEEDED** - using nearest node calculation:
  6. **Move to nearest node and use retargeted path** - following normal speed movement for battalion/bot type stats

- **Natural Recovery Process:**
  - **Initiate recovery movement** from interruption coordinates to nearest node at normal battalion speed
  - **No instant teleportation** - battalion moves naturally from (x, y) coordinates to node center
  - **Deferred retargeting** - retargeting happens AFTER battalion reaches nearest node, not immediately
  - **Recovery completion trigger** - when battalion arrives at nearest node, automatically queue retargeting
  - **Resume normal flow** - after retargeting, battalion proceeds with normal movement to new objectives

- **Movement Type Progression:**
  - `initial` → `retargeting` → `interrupted_recovery` → `retargeting` (normal flow resumes)
  - Recovery movements are **non-interruptible** to prevent cascading interruptions
  - Recovery movements use **normal battalion speed stats** for realistic animation

## 6. Ongoing Combat
- Battalions continue attacking and retargeting until battle ends or until all opposing battalions are defeated
- Process repeats: attack → capture → retarget → move → attack
- Battalion-to-battalion combat with health/destruction

## 7. Battalion-to-Battalion Combat System

### **Combat Damage Calculation:**
- **Base Attack Damage** = `attacker.stats.offense * attacker.quantity`
- **Defense Percentage Reduction** = `base_damage * (defender.stats.defense / 100)`
- **Final Damage** = `base_damage - defense_reduction`
- **Example:** User guardian (offense=10, quantity=10) attacks enemy guardian (defense=25%)
  - Base damage: 10 × 10 = 100
  - Defense reduction: 100 × (25/100) = 25
  - Final damage: 100 - 25 = **75 damage dealt**

### **Health and Unit Management:**
- **Total Health** = `battalion.stats.health * battalion.quantity`
- **Example:** Enemy guardian with health=100, quantity=10 = **1000 total health**
- **Health reduces with each attack:** 1000 → 925 → 850...
- **Unit count calculation:** Uses specific rounding rules (see below)
- **Attack power adjusts:** New attack = `stats.offense * current_quantity`

### **Unit Reduction Example (Following Exact User Specification):**
1. **Initial:** Enemy guardian (health=100/unit, 10 units = 1000 health, attack=10×10=100)
2. **After 75 damage:** 925 health → `925 ÷ 100 = 9.25` → **Round down to 9 units** → attack=10×9=90
3. **After another 75 damage:** 850 health → `850 ÷ 100 = 8.5` → **Round up to 9 units** → attack=10×9=90
4. **After another 75 damage:** 775 health → `775 ÷ 100 = 7.75` → **Round down to 7 units** → attack=10×7=70

### **Unit Count Rounding Rules:**
Based on the user's example showing "round down" then "round up", two interpretations are possible:
1. **Alternating Pattern:** First damage rounds down, second rounds up, third rounds down, etc.
2. **Standard Rounding:** Use Math.round() consistently (9.25→9, 8.5→9, 7.75→8)

**Implementation Decision:** Use **Math.round()** for consistent, predictable behavior.
- This matches the mathematical results in the example (9.25→9, 8.5→9)
- Avoids complex state tracking for alternating patterns
- Provides fair rounding throughout the battle

### **Battalion Destruction:**
- **Health reaches 0:** Battalion is completely destroyed and removed from battle
- **Destroyed battalions:**
  - Cannot be targeted by enemy battalions
  - Cannot attack other battalions or nodes  
  - Are not visible on the battlefield
  - Trigger retargeting for any battalions currently targeting them

### **Movement and Destruction Triggers:**
- **When a battalion is destroyed:** Any enemy battalions targeting it must immediately retarget
- **Retargeting queue:** Battalion destruction events are processed sequentially to prevent race conditions
- **Destruction updates:** Battalions targeting destroyed battalions stop movement and find new targets
- **Movement updates:** Battalions targeting battalions who move should be triggered to find new location / target

### **Battalion Movement Dynamics:**
- **When a battalion moves:** All enemy battalions targeting it receive immediate notification
- **Dynamic pursuit:** Targeting battalions adjust their movement to meet the target at its new destination
- **Real-time coordination:** Both moving battalion and pursuing battalions update positions continuously
- **Priority notifications:** Movement updates are processed as high-priority queue events

### **Immediate Response Events (Priority Queue Processing):**
1. **Node Capture:** 
   - Immediately stop all attacks on captured node
   - Immediately interrupt all movements targeting captured node
   - Update battalion positions to interruption point
   - Trigger retargeting with updated positions
   
2. **Battalion Destruction:**
   - Immediately remove destroyed battalion from battle
   - Immediately stop all targeting/attacking of destroyed battalion
   - Immediately interrupt all movements targeting destroyed battalion
   - Trigger retargeting for all affected battalions
   
3. **Battalion Movement:**
   - Immediately notify all battalions targeting the moving battalion
   - Update pursuit paths to new destination
   - Recalculate movement timing and positioning

### **Combat Queue System:**
- **Attack queue:** All battalion attacks are queued to prevent race conditions
- **Damage processing:** Sequential damage application with health/unit recalculation
- **Destruction handling:** Immediate removal and retargeting trigger when health ≤ 0
- **Movement coordination:** Dynamic pursuit and interception calculations
- **Position updates:** Real-time battalion position tracking for accurate retargeting

## Key Rules & Network Lock-in
- **Battalions NEVER leave the network lines** (movement, targeting, attacking)
- Movement is always node-to-node following NETWORK_CONNECTIONS
- **Attack range positioning:** Move to closest network node with line-of-sight to target
- **Cross-network targeting is valid:** Battalion at 0-3 line can target enemy at 5-8 line by moving: 0→3→7→5→(attack range toward 8)
- **Example pathfinding:** Node 0 → Node 3 (new connections available) → Node 7 (new connections) → Attack range of Node 5
- Only neutral nodes can be attacked (owned nodes become un-attackable)
- Retargeting only triggered by node capture of the specific node being attacked
- **Server authority:** All movement, targeting, and positioning calculated server-side and sent to client
