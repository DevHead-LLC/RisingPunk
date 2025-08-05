# G. Architecture & Infrastructure

## Table of Contents

### [A. Battle Initialization & Setup](A-battle-initialization-setup.md)
1. [Battle Start](A-battle-initialization-setup.md#1-battle-start)

### [B. Movement System (Consistent Throughout Battle)](B-movement-system.md)
2. [Movement Behavior](B-movement-system.md#2-movement-behavior)
3. [Movement Interruption Handling](B-movement-system.md#3-movement-interruption-handling)
4. [Natural Recovery Movement After Interruption](B-movement-system.md#4-natural-recovery-movement-after-interruption)

### [C. Targeting System (Two Distinct Behaviors)](C-targeting-system.md)
5. [Initial Targeting (Battle Start)](C-targeting-system.md#5-initial-targeting-battle-start)
6. [Retargeting (During Battle)](C-targeting-system.md#6-retargeting-during-battle)

### [D. Attack System (Consistent Throughout Battle)](D-attack-system.md)
7. [Attack Behavior](D-attack-system.md#7-attack-behavior)
8. [Node Combat (Tug-of-War System)](D-attack-system.md#8-node-combat-tug-of-war-system)
9. [Battalion-to-Battalion Combat System](D-attack-system.md#9-battalion-to-battalion-combat-system)

### [E. Event Handling & Retargeting](E-event-handling-retargeting.md)
10. [Node Capture Events](E-event-handling-retargeting.md#10-node-capture-events)
11. [Battalion Destruction Events](E-event-handling-retargeting.md#11-battalion-destruction-events)
12. [Battalion Movement Events](E-event-handling-retargeting.md#12-battalion-movement-events)
13. [Sequential Movement Phase](E-event-handling-retargeting.md#13-sequential-movement-phase)
14. [Immediate Response Events (Priority Queue Processing)](E-event-handling-retargeting.md#14-immediate-response-events-priority-queue-processing)
15. [Combat Queue System](E-event-handling-retargeting.md#15-combat-queue-system)
16. [Ongoing Combat](E-event-handling-retargeting.md#16-ongoing-combat)

### [F. Battle End & Point Tracking System](F-battle-end-point-tracking.md)
17. [Battle Duration & End Conditions](F-battle-end-point-tracking.md#17-battle-duration--end-conditions)
18. [Point Tracking System (Loss-Based Scoring)](F-battle-end-point-tracking.md#18-point-tracking-system-loss-based-scoring)
19. [Battle End Overlay Screen](F-battle-end-point-tracking.md#19-battle-end-overlay-screen)
20. [Battle End Data Structure](F-battle-end-point-tracking.md#20-battle-end-data-structure)

### [G. Architecture & Infrastructure](G-architecture-infrastructure.md)
21. [Key Rules & Network Lock-in](G-architecture-infrastructure.md#21-key-rules--network-lock-in)
22. [Attack Service Architecture Improvements](G-architecture-infrastructure.md#22-attack-service-architecture-improvements)

---

## 21. Key Rules & Network Lock-in
- **Battalions NEVER leave the network lines** (movement, targeting, attacking)
- Movement is always node-to-node following NETWORK_CONNECTIONS
- **Attack range positioning:** Move to closest network node with line-of-sight to target
- **Cross-network targeting is valid:** Battalion at 0-3 line can target enemy at 5-8 line by moving: 0→3→7→5→(attack range toward 8)
- **Example pathfinding:** Node 0 → Node 3 (new connections available) → Node 7 (new connections) → Attack range of Node 5
- Only neutral nodes can be attacked (owned nodes become un-attackable)
- Retargeting only triggered by node capture of the specific node being attacked
- **Server authority:** All movement, targeting, and positioning calculated server-side and sent to client

#### **Associated Files:**
- `server/src/config/networkConfig.ts` - `NETWORK_CONNECTIONS` defines all valid network paths and connections
- `server/src/services/PathfindingService.ts` - `findNetworkPath()` ensures all movement follows NETWORK_CONNECTIONS
- `server/src/services/TargetingService.ts` - `isValidNetworkPath()` validates targeting follows network topology
- `server/src/services/MovementCalculationService.ts` - `calculateAttackRangePosition()` ensures attack positioning stays on network lines
- `server/src/services/BattalionPositionService.ts` - `createTargetPosition()` enforces network line adherence
- `server/src/controllers/BattleController.ts` - Sends network data to client (server authority)
- `mobile/src/types/battleState.ts` - Client-side types for server-authoritative data
- `server/__tests__/battalionNetworkLineAdherence.test.ts` - Tests that battalions stay on network lines during movement
- `mobile/__tests__/components/battle/battalionNetworkLineAdherence.test.tsx` - Tests visual network line adherence
- `server/__tests__/testUtils.ts` - `TEST_NETWORK_CONNECTIONS` for testing network topology
- `mobile/__tests__/testUtils.ts` - Client-side network connection test data

##### **Discrepancies:**
- **Network Connections Definition**: intended.md states "NETWORK_CONNECTIONS defines all valid network paths and connections" and networkConfig.ts correctly defines all network connections ✅ **CORRECT**
- **Pathfinding Network Adherence**: intended.md states "findNetworkPath() ensures all movement follows NETWORK_CONNECTIONS" and PathfindingService.ts correctly implements BFS pathfinding using network connections ✅ **CORRECT**
- **Targeting Network Validation**: intended.md states "isValidNetworkPath() validates targeting follows network topology" but TargetingService.ts doesn't have `isValidNetworkPath()` method - it has `isReachableViaNetwork()` ❌ **MISSING**
- **Attack Range Positioning**: intended.md states "calculateAttackRangePosition() ensures attack positioning stays on network lines" and MovementCalculationService.ts correctly implements this ✅ **CORRECT**
- **Network Line Adherence**: intended.md states "createTargetPosition() enforces network line adherence" and BattalionPositionService.ts correctly implements this ✅ **CORRECT**
- **Server Authority Network Data**: intended.md states "Sends network data to client (server authority)" and BattleController.ts correctly sends network connections and line properties ✅ **CORRECT**
- **Client Server-Authoritative Types**: intended.md states "Client-side types for server-authoritative data" but battleState.ts is deprecated and doesn't define network types ❌ **MISSING**
- **Network Line Adherence Tests**: intended.md states "Tests that battalions stay on network lines during movement" and battalionNetworkLineAdherence.test.ts correctly tests this ✅ **CORRECT**
- **Visual Network Line Adherence**: intended.md states "Tests visual network line adherence" and battalionNetworkLineAdherence.test.tsx correctly tests this ✅ **CORRECT**
- **Network Topology Test Data**: intended.md states "TEST_NETWORK_CONNECTIONS for testing network topology" and testUtils.ts correctly defines this ✅ **CORRECT**
- **Client Network Test Data**: intended.md states "Client-side network connection test data" and mobile testUtils.ts correctly defines this ✅ **CORRECT**
- **❌ MISSING: Cross-Network Targeting Validation**: intended.md states "Cross-network targeting is valid: Battalion at 0-3 line can target enemy at 5-8 line by moving: 0→3→7→5→(attack range toward 8)" but there's no explicit validation of cross-network targeting paths
- **❌ MISSING: Example Pathfinding Validation**: intended.md states "Example pathfinding: Node 0 → Node 3 (new connections available) → Node 7 (new connections) → Attack range of Node 5" but there's no explicit validation of this specific pathfinding example
- **❌ MISSING: Neutral Node Attack Restriction**: intended.md states "Only neutral nodes can be attacked (owned nodes become un-attackable)" but while CombatService.canTargetNode() checks this, there's no explicit validation that owned nodes are un-attackable
- **❌ MISSING: Specific Node Capture Retargeting**: intended.md states "Retargeting only triggered by node capture of the specific node being attacked" but while this logic exists, there's no explicit validation that only specific node capture triggers retargeting

## 22. Attack Service Architecture Improvements

#### **Waterfall Authority Structure:**
- **Attack flow should follow a clear waterfall pattern:**
  1. **Determine Target** - Identify if target is node or battalion
  2. **Start Attack** - Initialize attack state with correct intervals
  3. **Process Attack** - Handle attack timing and damage calculation
  4. **Process Damage** - Apply damage to target (node control or battalion health)
  5. **Process Capture/Destruction** - Handle node capture or battalion destruction
  6. **Alert Affected Battalions** - Notify all battalions affected by the event

#### **Targeting Array System:**
- **Each node and battalion should maintain targeting arrays:**
  - **Nodes:** `targetingBattalions: string[]` - List of battalion IDs targeting this node
  - **Battalions:** `targetingBattalions: string[]` - List of battalion IDs targeting this battalion
- **Benefits of targeting arrays:**
  - **O(1) lookups** instead of O(n) scans through all attack states
  - **Direct relationships** - Each target knows exactly who's targeting it
  - **Efficient retargeting** - Just iterate through targeting arrays
  - **Simplified event handling** - Easy to notify affected battalions
- **Current inefficiency:** `getBattalionsAttackingSpecificNode()` scans all attack states
- **Improved approach:** Direct access to targeting arrays for immediate notification

#### **Associated Files:**
- `server/src/services/AttackService.ts` - `startAttack()` implements step 2 (Start Attack) of waterfall authority
- `server/src/services/AttackService.ts` - `processActiveAttacks()` implements step 3 (Process Attack) of waterfall authority
- `server/src/services/AttackService.ts` - `processUnifiedAttack()` implements step 4 (Process Damage) of waterfall authority
- `server/src/services/AttackService.ts` - `getBattalionsAttackingSpecificNode()` represents current O(n) inefficiency to be replaced
- `server/src/services/CombatService.ts` - `applyTugOfWarDamage()`, `applyBattalionDamage()` implement step 5 (Process Capture/Destruction)
- `server/src/services/AttackService.ts` - `queueRetargetingTask()` implements step 6 (Alert Affected Battalions)
- `server/src/services/BattalionService.ts` - `updateTargetingResults()` manages targeting relationships
- `server/src/types/battle.ts` - Defines interfaces for future targeting array implementation
- `server/__tests__/attackService.test.ts` - Tests current waterfall authority implementation
- `server/__tests__/selectiveRetargeting.test.ts` - Tests current O(n) scanning behavior

##### **Discrepancies:**
- **Waterfall Step 2 Implementation**: intended.md states "startAttack() implements step 2 (Start Attack) of waterfall authority" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Waterfall Step 3 Implementation**: intended.md states "processActiveAttacks() implements step 3 (Process Attack) of waterfall authority" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Waterfall Step 4 Implementation**: intended.md states "processUnifiedAttack() implements step 4 (Process Damage) of waterfall authority" and AttackService.ts correctly implements this ✅ **CORRECT**
- **O(n) Inefficiency Identification**: intended.md states "getBattalionsAttackingSpecificNode() represents current O(n) inefficiency to be replaced" and AttackService.ts correctly shows this O(n) scanning behavior ✅ **CORRECT**
- **Waterfall Step 5 Implementation**: intended.md states "applyTugOfWarDamage(), applyBattalionDamage() implement step 5 (Process Capture/Destruction)" and CombatService.ts correctly implements both methods ✅ **CORRECT**
- **Waterfall Step 6 Implementation**: intended.md states "queueRetargetingTask() implements step 6 (Alert Affected Battalions)" and AttackService.ts correctly implements this ✅ **CORRECT**
- **Targeting Relationships Management**: intended.md states "updateTargetingResults() manages targeting relationships" and BattalionService.ts correctly implements this ✅ **CORRECT**
- **Future Targeting Array Interfaces**: intended.md states "Defines interfaces for future targeting array implementation" but battle.ts doesn't define targeting array interfaces - only existing IBattalion and INode interfaces ❌ **MISSING**
- **Waterfall Authority Tests**: intended.md states "Tests current waterfall authority implementation" but attackService.test.ts only tests attack intervals, not the waterfall authority pattern ❌ **MISSING**
- **O(n) Scanning Tests**: intended.md states "Tests current O(n) scanning behavior" and selectiveRetargeting.test.ts correctly tests this ✅ **CORRECT**
- **❌ MISSING: Step 1 Implementation**: intended.md states "Determine Target - Identify if target is node or battalion" but there's no explicit step 1 implementation in the waterfall authority
- **❌ MISSING: Targeting Array System**: intended.md describes a complete targeting array system with `targetingBattalions: string[]` arrays on nodes and battalions, but this system is not implemented
- **❌ MISSING: O(1) Lookup Benefits**: intended.md states "O(1) lookups instead of O(n) scans" but the targeting array system for O(1) lookups is not implemented
- **❌ MISSING: Direct Relationships**: intended.md states "Direct relationships - Each target knows exactly who's targeting it" but the targeting array system for direct relationships is not implemented
- **❌ MISSING: Efficient Retargeting**: intended.md states "Efficient retargeting - Just iterate through targeting arrays" but the targeting array system for efficient retargeting is not implemented
- **❌ MISSING: Simplified Event Handling**: intended.md states "Simplified event handling - Easy to notify affected battalions" but the targeting array system for simplified event handling is not implemented 