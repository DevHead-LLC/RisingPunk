# Current Task: Battalion Attacking System for Neutral Node Capture

## 🎯 **USER'S EXACT REQUIREMENTS**

### **Core Principles:**
1. **Simple** - Only what's required, 0 extras, no test-writing
2. **Well thought** - Explore codebase for reusability, keep DRY, no hard-coded duplication
3. **File size control** - Files >250 lines get split into new files with imports
4. **BattleGridScreen.tsx focus** - Connect attacking logic to existing connected pieces
5. **Use existing code where possible** - Leverage existing patterns and utilities

### **Current State:**
- ✅ Battalions move to attack range and stop
- ✅ Neutral nodes have health bars (tug-of-war system)
- ✅ Nodes can receive damage (verified working)
- ❌ One-time damage on arrival (NEEDS REMOVAL)
- ❌ No periodic attacking (NEEDS IMPLEMENTATION)

### **Goal:**
- Battalions attack periodically based on bot type speed stat
- Continuous attacking until node captured (±100%)
- Captured nodes turn winner's color and become untargetable
- Attacking battalions notified when node is captured

---

## 🔍 **WHAT NEEDS TO BE REMOVED**

### **Remove One-Time Damage on Arrival:**
**File:** `server/src/services/BattleService.ts`
**Lines:** 172-188
```typescript
// REMOVE THIS BLOCK:
if (updatedMovementState.movementStatus === 'arrived') {
  // Apply tug-of-war damage when battalion arrives at target
  const targetNode = battle.nodes.find(n => n.index === updatedMovementState.targetPosition.nodeIndex);
  if (targetNode && CombatService.canTargetNode(targetNode)) {
    const damage = CombatService.calculateTugOfWarDamage(battalion);
    CombatService.applyTugOfWarDamage(targetNode, damage, battalion.owner);
    await battle.save();
    console.log(`⚔️ TUG-OF-WAR: ...`);
    if (CombatService.isNodeCaptured(targetNode)) {
      console.log(`🏆 NODE CAPTURED: ...`);
    }
  }
}
```

---

## 🏗️ **IMPLEMENTATION PLAN**

### **PHASE 1: Server-Side Attack System**

#### **1.1 Create Attack State Management**
**NEW FILE:** `server/src/services/AttackService.ts` (~150 lines)
```typescript
interface AttackState {
  battalionId: string;
  targetNodeIndex: number;
  lastAttackTime: number;
  attackInterval: number; // Based on speed stat
  isAttacking: boolean;
}

export class AttackService {
  private static attackStates = new Map<string, AttackState>();
  
  // Calculate attack interval from speed stat (reuse existing stats)
  static calculateAttackInterval(speedStat: number): number {
    // Speed 1-10, where 10 is fastest
    // Example: speed 10 = 1000ms, speed 5 = 2000ms
    return 3000 - (speedStat * 200); // 1000ms to 2800ms range
  }
  
  // Start periodic attacking
  static startAttacking(battalion: IBattalion, targetNodeIndex: number): void
  
  // Stop attacking (called when node captured)
  static stopAttacking(battalionId: string): void
  
  // Process single attack (reuse CombatService)
  static processAttack(battalion: IBattalion, node: INode): boolean // returns true if captured
  
  // Get all battalions attacking a specific node
  static getBattalionsAttackingNode(nodeIndex: number): string[]
}
```

#### **1.2 Integrate with Movement Arrival**
**UPDATE:** `server/src/services/BattleService.ts`
```typescript
// Replace removed damage code with:
if (updatedMovementState.movementStatus === 'arrived') {
  const targetNode = battle.nodes.find(n => n.index === updatedMovementState.targetPosition.nodeIndex);
  if (targetNode && CombatService.canTargetNode(targetNode)) {
    // Start periodic attacking instead of one-time damage
    AttackService.startAttacking(battalion, targetNode.index);
  }
}
```

#### **1.3 Create Attack Processing Loop**
**UPDATE:** `server/src/services/BattleService.ts` - `updateBattleMovement()`
```typescript
// Add after movement updates:
// Process all active attacks
for (const [battalionId, attackState] of AttackService.getActiveAttacks()) {
  if (Date.now() - attackState.lastAttackTime >= attackState.attackInterval) {
    const battalion = battle.battalions.find(b => b.id === battalionId);
    const node = battle.nodes.find(n => n.index === attackState.targetNodeIndex);
    
    if (battalion && node && CombatService.canTargetNode(node)) {
      const captured = AttackService.processAttack(battalion, node);
      if (captured) {
        // Notify all attacking battalions to stop
        const attackers = AttackService.getBattalionsAttackingNode(node.index);
        attackers.forEach(id => AttackService.stopAttacking(id));
      }
    }
  }
}
```

### **PHASE 2: Node Capture Completion**

#### **2.1 Update Node Capture Logic**
**EXISTING:** `server/src/services/CombatService.ts`
- ✅ Already handles ±100% capture
- ✅ Already sets node owner
- ✅ Already has `canTargetNode()` check

**ADD:** Capture notification system
```typescript
// Add to applyTugOfWarDamage() when capture happens:
if (Math.abs(node.tugOfWarProgress) >= 100) {
  node.owner = node.tugOfWarProgress > 0 ? NodeOwner.USER : NodeOwner.ENEMY;
  return true; // Indicate capture occurred
}
return false;
```

### **PHASE 3: Client-Side Updates**

#### **3.1 Real-time Attack Visualization**
**No changes needed** - Existing health bars will update automatically when server sends new `tugOfWarProgress` values

#### **3.2 Node Color Change on Capture**
**EXISTING:** `BattleNetworkGrid.tsx` already has `getNodeColor(node.owner)`
- When node.owner changes from 'neutral' to 'user'/'enemy', color updates automatically

---

## 🔒 **SERVER vs CLIENT SEPARATION**

### **Server-Side (Security Critical):**
- Attack interval calculation (based on speed stat)
- Attack damage calculation (offense × quantity)
- Tug-of-war progress updates
- Node capture detection (±100%)
- Node ownership changes
- Attack state management (who's attacking what)
- Stopping attacks when node captured

### **Client-Side (Visual Only):**
- Health bar updates (already implemented)
- Node color changes (already implemented)
- Attack animations (future, not now)

---

## 📊 **REUSABLE CODE IDENTIFIED**

### **Existing to Reuse:**
1. **Bot Stats:** `BATTLE_CONFIG.BOT_STATS[type].stats.speed`
2. **Combat Calculations:** `CombatService.calculateTugOfWarDamage()`
3. **Node Targeting:** `CombatService.canTargetNode()`
4. **Movement State:** Existing arrival detection
5. **Battle State Updates:** Existing save patterns

### **New Minimal Additions:**
1. **AttackService.ts** - Attack state management
2. **Attack interval formula** - Based on speed stat
3. **Attack processing loop** - In updateBattleMovement()

---

## 📝 **IMPLEMENTATION STEPS**

1. ✅ **Remove** one-time damage code from BattleService.ts
2. ✅ **Create** AttackService.ts with periodic attack management
3. ✅ **Update** CombatService to return capture status
4. ✅ **Integrate** attack start on battalion arrival
5. ✅ **Add** attack processing to movement update loop
6. ✅ **Add** battle cleanup for attack states
7. 🔄 **Test** that battalions attack periodically until capture

**Current Status**: Phase 1 complete - Server-side attack system implemented

---

## ✅ **ALIGNMENT CHECK**

- ✅ **Simple** - Minimal new code, reusing existing systems
- ✅ **DRY** - No duplication, single attack calculation
- ✅ **File Control** - New AttackService.ts keeps files <250 lines
- ✅ **Existing Code** - Reuses bot stats, combat math, movement system
- ✅ **Server Security** - All game logic server-side
- ✅ **Future Ready** - Attack system can be reused for battalion combat later
