# **BATTALION COMBAT SYSTEM IMPLEMENTATION**

## **🎯 CURRENT FOCUS: Battalion Combat System Implementation**

**PROGRESS UPDATE:**
- ✅ **PHASE 1 COMPLETED** - Combat Infrastructure Setup
- ✅ **PHASE 2 COMPLETED** - Attack System Integration  
- ✅ **PHASE 3 COMPLETED** - Destruction and Retargeting
- ✅ **PHASE 4 COMPLETED** - Targeting Data Flow
- ✅ **PHASE 5 COMPLETED** - Client-Side Updates

**🎉 ALL PHASES COMPLETED SUCCESSFULLY** 

**🚨 CRITICAL BUG FIX APPLIED:**
- **Issue:** Destroyed battalions (0 health, 0 units) were continuing to attack
- **Root Cause:** `isDestroyed` flag was `undefined` instead of `true`, and stale battalion references were being used
- **Fix:** Enhanced `AttackService.processActiveAttacks()` with fresh battalion state checks and comprehensive destruction validation
- **Validation:** Now checks `isDestroyed`, `quantity <= 0`, and `currentHealth <= 0` before allowing attacks

**🚨 CRITICAL PERSISTENCE FIX APPLIED:**
- **Issue:** Battalions reaching 0 health are marked as destroyed but `isDestroyed` flag shows as `undefined` in subsequent operations
- **Root Cause:** Database save operation not occurring immediately after destruction, causing race conditions in retargeting
- **Fix:** Added immediate `battle.save()` after battalion destruction to persist `isDestroyed = true` flag
- **Debug Enhancement:** Added detailed battalion status logging to track destruction state and filter effectiveness

**🚨 CRITICAL DATABASE SCHEMA FIX APPLIED:**
- **Issue:** `isDestroyed`, `baseHealthPerUnit`, and `destroyedAt` fields showing as `undefined` because they weren't in the database schema
- **Root Cause:** MongoDB schema in `Battle.ts` was missing the new battalion combat fields added in Phase 1
- **Fix:** Updated `battalionSchema` to include all Phase 1 combat fields with proper types and constraints
- **Transition Handling:** Added logic to treat battalions with `currentHealth <= 0` or `quantity <= 0` as destroyed for legacy compatibility

**Goal:** Extend existing services with battalion combat capabilities

## **📋 IMPLEMENTATION PHASES:**

### **PHASE 1: Combat Infrastructure Setup**
**Goal:** Extend existing services with battalion combat capabilities

#### **Step 1.1: Extend CombatService for Battalion Combat**
- **File:** `server/src/services/CombatService.ts` (Currently 97 lines)
- **Add Battalion Combat Methods:**
  ```typescript
  // Calculate battalion damage with defense reduction
  static calculateBattalionDamage(attacker: IBattalion, defender: IBattalion): number {
    const baseDamage = attacker.stats.offense * attacker.quantity;
    const defenseReduction = baseDamage * (defender.stats.defense / 100);
    return Math.floor(baseDamage - defenseReduction);
  }
  
  // Apply damage and update health/units
  static applyBattalionDamage(defender: IBattalion, damage: number): boolean {
    defender.currentHealth = Math.max(0, defender.currentHealth - damage);
    
    // Recalculate unit count based on health
    if (defender.currentHealth > 0 && defender.baseHealthPerUnit) {
      const newQuantity = Math.round(defender.currentHealth / defender.baseHealthPerUnit);
      defender.quantity = Math.max(1, newQuantity); // At least 1 unit if alive
    }
    
    // Check if destroyed
    if (defender.currentHealth <= 0) {
      defender.isDestroyed = true;
      defender.destroyedAt = Date.now();
      defender.quantity = 0;
      return true; // Battalion destroyed
    }
    
    return false; // Battalion still alive
  }
  
  // Check if battalion can be targeted
  static canTargetBattalion(battalion: IBattalion): boolean {
    return !battalion.isDestroyed;
  }
  ```

#### **Step 1.2: Extend IBattalion Interface**
- **Files:** `server/src/types/battle.ts` and `mobile/src/types/battleTypes.ts`
- **Add Properties:**
  ```typescript
  interface IBattalion {
    // ... existing properties including currentHealth, maxHealth
    baseHealthPerUnit: number;  // Original health per unit for unit count calculations
    isDestroyed: boolean;       // Whether battalion has been eliminated
    destroyedAt?: number;       // Timestamp when destroyed (for cleanup/animations)
  }
  ```
- **Initialize in BattalionService:**
  ```typescript
  // In createUserBattalions and createEnemyBattalions
  baseHealthPerUnit: stats.health,
  isDestroyed: false,
  ```

### **PHASE 2: Attack System Integration**
**Goal:** Extend existing attack system to handle battalion targets seamlessly

#### **Step 2.1: Update Movement → Attack Transition**
- **File:** `server/src/services/MovementService.ts`
- **Current Issue:** System always tries to attack the node at arrival
- **Fix in `updateBattleMovement()` arrival handling:**
  ```typescript
  // After battalion arrives (line ~115)
  if (!AttackService.isAttacking(battalion.id)) {
    // Check the targeting result to determine what to attack
    const targetingResult = BattalionService.getTargetingResultForBattalion(battalion.id);
    
    if (targetingResult && targetingResult.targetType === 'enemy_battalion') {
      // Find the enemy battalion at this node
      const enemyBattalion = battle.battalions.find((b: IBattalion) => 
        b.owner !== battalion.owner && 
        b.position.nodeIndex === updatedMovementState.targetPosition.nodeIndex &&
        !b.isDestroyed
      );
      
      if (enemyBattalion) {
        console.log(`⚔️ BATTALION COMBAT: ${battalion.owner} ${battalion.type} starting to attack ${enemyBattalion.owner} ${enemyBattalion.type}`);
        AttackService.startBattalionAttack(battalion.id, enemyBattalion.id);
      }
    } else {
      // Original node attack logic
      const targetNode = battle.nodes.find((n: any) => n.index === updatedMovementState.targetPosition.nodeIndex);
      if (targetNode && CombatService.canTargetNode(targetNode)) {
        AttackService.startAttacking(battalion, targetNode.index);
      }
    }
  }
  ```

#### **Step 2.2: Extend AttackService for Battalion Combat**
- **File:** `server/src/services/AttackService.ts`
- **Add Battalion Attack Methods:**
  ```typescript
  // Start attacking a battalion (similar to startAttacking for nodes)
  static startBattalionAttack(attackerId: string, targetId: string): void {
    const attackInterval = this.calculateAttackInterval(/* get attacker's speed */);
    
    const attackState: AttackState = {
      battalionId: attackerId,
      targetType: 'battalion',
      targetId: targetId,
      targetNodeIndex: -1, // Not used for battalion attacks
      lastAttackTime: Date.now(),
      attackInterval,
      isAttacking: true
    };
    
    this.attackStates.set(attackerId, attackState);
    console.log(`⚔️ Battalion attack started: ${attackerId} → ${targetId}`);
  }
  
  // Process battalion attack (called from processActiveAttacks)
  static processBattalionAttack(attacker: IBattalion, defender: IBattalion): boolean {
    if (!CombatService.canTargetBattalion(defender)) {
      return true; // Target destroyed, stop attacking
    }
    
    const damage = CombatService.calculateBattalionDamage(attacker, defender);
    const destroyed = CombatService.applyBattalionDamage(defender, damage);
    
    console.log(`⚔️ BATTALION ATTACK: ${attacker.owner} ${attacker.type} deals ${damage} damage to ${defender.owner} ${defender.type} (${defender.currentHealth} health remaining)`);
    
    if (defender.quantity !== Math.round(defender.currentHealth / defender.baseHealthPerUnit)) {
      const oldQuantity = defender.quantity;
      defender.quantity = Math.round(defender.currentHealth / defender.baseHealthPerUnit);
      console.log(`📊 UNIT REDUCTION: ${defender.owner} ${defender.type} units: ${oldQuantity} → ${defender.quantity}`);
    }
    
    return destroyed;
  }
  ```

#### **Step 2.3: Update Attack Processing Loop**
- **File:** `server/src/services/AttackService.ts`
- **Modify `processActiveAttacks()` to handle both types:**
  ```typescript
  // In processActiveAttacks() around line 305
  if (attackState.targetType === 'battalion') {
    // Battalion attack
    const attacker = battle.battalions.find((b: IBattalion) => b.id === battalionId);
    const defender = battle.battalions.find((b: IBattalion) => b.id === attackState.targetId);
    
    if (attacker && defender && !attacker.isDestroyed) {
      const destroyed = this.processBattalionAttack(attacker, defender);
      
      if (destroyed) {
        console.log(`💀 BATTALION DESTROYED: ${defender.owner} ${defender.type} eliminated`);
        this.stopAttacking(battalionId);
        
        // Queue retargeting for battalions that were targeting the destroyed battalion
        this.queueBattalionDestructionRetargeting(battle.battleId, defender.id);
      }
    }
  } else {
    // Existing node attack logic
    const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
    if (battalion && node && CombatService.canTargetNode(node)) {
      const captured = this.processAttack(battalion, node);
      // ... existing capture handling
    }
  }
  ```

### **PHASE 3: Destruction and Retargeting**
**Goal:** Handle battalion destruction events and trigger appropriate retargeting

#### **Step 3.1: Add Destruction Retargeting Queue**
- **File:** `server/src/services/AttackService.ts`
- **Add method similar to `queueRetargetingTask()`:**
  ```typescript
  static queueBattalionDestructionRetargeting(battleId: string, destroyedBattalionId: string): void {
    // Find all battalions targeting the destroyed battalion
    const affectedBattalions: string[] = [];
    
    for (const [battalionId, attackState] of this.attackStates) {
      if (attackState.targetType === 'battalion' && attackState.targetId === destroyedBattalionId) {
        affectedBattalions.push(battalionId);
        this.stopAttacking(battalionId); // Stop attacking destroyed target
      }
    }
    
    if (affectedBattalions.length > 0) {
      console.log(`📋 DESTRUCTION RETARGETING: ${affectedBattalions.length} battalions need new targets`);
      this.retargetingQueue.push({
        battleId,
        triggerType: 'battalion_destruction',
        destroyedBattalionId,
        affectedBattalionIds: affectedBattalions
      });
    }
  }
  ```

#### **Step 3.2: Update RetargetingService**
- **File:** `server/src/services/RetargetingService.ts`
- **Modify `findClosestTarget()` to exclude destroyed battalions:**
  ```typescript
  // In the enemy battalions loop (around line 140)
  for (const enemyBattalion of enemyBattalions) {
    // Skip destroyed battalions
    if (enemyBattalion.isDestroyed) {
      continue;
    }
    
    // ... existing distance calculation logic
  }
  ```

#### **Step 3.3: Process Destruction Retargeting**
- **File:** `server/src/services/AttackService.ts`
- **Update `processRetargetingQueue()` to handle destruction events:**
  ```typescript
  // In processRetargetingQueue()
  if (task.triggerType === 'battalion_destruction') {
    // Same logic as node capture but for battalion destruction
    await this.executeBattalionDestructionRetargeting(battle, task);
  } else {
    // Existing node capture retargeting
    await this.executeRetargetingTask(battle, task.capturedNodeIndex!, task.affectedBattalionIds);
  }
  ```

### **PHASE 4: Targeting Data Flow**
**Goal:** Ensure targeting results properly flow through the system

#### **Step 4.1: Extend BattalionTargetingResult**
- **File:** `server/src/types/battle.ts`
- **Current Interface:**
  ```typescript
  interface BattalionTargetingResult {
    battalionId: string;
    targetNode: number;
  }
  ```
- **Extended Interface:**
  ```typescript
  interface BattalionTargetingResult {
    battalionId: string;
    targetNode: number;
    targetType: 'neutral_node' | 'enemy_battalion'; // What we're targeting
    targetBattalionId?: string; // If targeting a battalion
  }
  ```

#### **Step 4.2: Update BattalionService Storage**
- **File:** `server/src/services/BattalionService.ts`
- **Update `updateTargetingResults()` to store target type:**
  ```typescript
  // When updating from retargeting results
  currentResults[existingIndex].targetNode = retargetResult.newTargetNodeIndex;
  currentResults[existingIndex].targetType = retargetResult.targetType;
  currentResults[existingIndex].targetBattalionId = retargetResult.targetBattalionId;
  ```

### **PHASE 5: Client-Side Updates**
**Goal:** Ensure client properly displays health changes and hides destroyed battalions

#### **Step 5.1: Update Battalion Mapping**
- **File:** `server/src/services/BattalionMappingService.ts`
- **Ensure `isDestroyed` is passed to client:**
  ```typescript
  // In mapBattalionsForClient()
  return battalions
    .filter(battalion => !battalion.isDestroyed) // Don't send destroyed battalions
    .map(battalion => ({
      // ... existing mapping
      currentHealth: battalion.currentHealth,
      quantity: battalion.quantity, // Will update with damage
    }));
  ```

#### **Step 5.2: Client Health Updates**
- **Status:** Health bars already implemented and working
- **Verification:** Ensure `currentHealth` updates reach client through WebSocket/polling

## **🔧 IMPLEMENTATION SUMMARY:**

### **Key Insights:**
1. **Target type is already determined during targeting/retargeting** - RetargetingResult has `targetType`
2. **No ambiguity at arrival** - Battalion knows exactly what to attack based on stored targeting result
3. **Maximum code reuse** - Extend existing methods instead of creating new ones
4. **Minimal breaking changes** - Add optional properties and new branches to existing logic

### **Authority Service Updates:**
- **CombatService:** +5 methods for battalion combat (~150 lines total)
- **AttackService:** +3 methods and modified processActiveAttacks (~400 lines total)
- **RetargetingService:** +1 filter for destroyed battalions (~185 lines total)
- **BattalionService:** +2 properties in initialization (~250 lines total)

### **Critical Success Factors:**
1. **Targeting determines attack type** - No guessing at arrival
2. **Unified attack processing** - Single loop handles both node and battalion attacks
3. **Queue-based retargeting** - Prevents race conditions for destruction events
4. **Server authority maintained** - All combat calculations server-side

## **📝 CURRENT STATUS:**
**READY TO BEGIN PHASE 1** - Extending CombatService with battalion combat methods