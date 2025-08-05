# **STEP 0: BATTLE PREPARATION - TEST-DRIVEN IMPLEMENTATION PLAN**

## **🎯 CURRENT FOCUS: Step 0 Battle Preparation**

**📋 GOAL:** Implement real user battalion assignments instead of mock data, with proper spawn node assignment and delayed spawning logic.

**🔍 ANALYSIS FROM A-battle-initialization-setup.md:**

### **✅ WORKING COMPONENTS:**
1. **Bot selection UI** - Battalion slot selection interface
2. **Bot type popup** - Shows Breacher, Guardian, Phreak options  
3. **Quantity input** - ±1/±25 buttons with max 250 limit
4. **"Assign Bots" functionality** - Assigns to battalion slots
5. **"DEPLOY PURGE" button** - Starts battle flow
6. **User bot inventory fetching** - Pulls available bots from user's built inventory
7. **Bot assignment to battalions** - Assigns quantity to battalion slots A/B
8. **Server-side battalion creation** - BattalionService handles real user assignments
9. **✅ REAL USER BATTALION ASSIGNMENTS** - Fixed mock data issue

### **❌ CRITICAL ISSUES TO FIX:**
1. **~~Mock data being sent~~** ✅ **FIXED** - BattlePreparationScreen now uses real assignments
2. **~~Fixed spawn nodes~~** ✅ **FIXED** - User battalions now use random spawn nodes (0, 1, 2)
3. **~~ENEMY RANDOM SPAWN~~** ✅ **FIXED** - Enemy battalions now use random spawn nodes (6, 7, 8)
4. **No delayed spawning** - Multiple battalions at same node don't have delayed spawn logic
5. **No retargeting for delayed spawns** - Missing 1-second delay with retargeting
6. **❌ BATTALION UI QUANTITY DISPLAY** - UI shows 10 instead of 100, 25 instead of 250 (display scaling issue)

## **🧪 TESTING STRATEGY:**

### **1. TestUtils.ts Foundation**
- **Purpose:** Centralize repetitive test data and utilities
- **Key Data:** Mock user bot inventory, battalion assignments, spawn nodes
- **Utilities:** Battle creation helpers, validation helpers, state comparison

### **2. Test Batch Philosophy**
- **Small batches:** 2-3 tests per batch maximum
- **Visual verification:** Each batch must be manually testable in application
- **Realistic scenarios:** Tests mirror actual user interactions
- **Server + Client:** Both sides tested for each behavior

### **3. Implementation Flow**
1. Write failing tests for specific behavior
2. Implement minimal code to pass tests
3. Manual verification in application
4. Move to next test batch

### **✅ Phase 2: Random Spawn Logic (COMPLETED)**
1. **Write Batch 2A tests** (random spawn assignment) ✅ **COMPLETED**
2. **Implement random spawn logic** in BattalionService ✅ **COMPLETED**
3. **Write Batch 2B tests** (enemy random spawn assignment) ✅ **COMPLETED**
4. **Implement enemy random spawn logic** in BattalionService ✅ **COMPLETED**
5. **Write Batch 2C tests** (spawn visualization) ✅ **COMPLETED**
6. **Update BattleGrid** to handle random spawns ✅ **COMPLETED**
7. **Manual verification** of spawn behavior ✅ **COMPLETED**

### **⏳ Phase 3: Delayed Spawning (NEXT)**
1. **Write Batch 3A tests** (delayed spawning logic)
2. **Implement delayed spawn system** in MovementService
3. **Write Batch 3B tests** (delayed spawn display)
4. **Update battle flow** to handle delayed spawns
5. **Manual verification** of timing and retargeting

## **📋 TEST BATCH 1: Real User Battalion Assignment**

### **Batch 1A: Server-Side Battalion Creation (PASSING)**
**Test:** `server/__tests__/battlePreparation/battalionAssignment.test.ts`
- **Test 1:** `should create battalions from real user selections` ✅ **PASSING**
- **Test 2:** `should validate bot types against user inventory` ✅ **PASSING**
- **Test 3:** `should reject invalid bot assignments` ✅ **PASSING**

**Status:** ✅ **ALREADY WORKING** - BattalionService correctly handles real user assignments

### **Batch 1B: Client-Side Assignment Integration (COMPLETED)**
**Test:** `mobile/__tests__/battlePreparation/battalionAssignment.test.tsx`
- **Test 1:** `should send real assignments to server` ✅ **FIXED**
- **Test 2:** `should display assigned bot quantities` ✅ **WORKING**
- **Test 3:** `should prevent over-assignment` ✅ **WORKING**

**Expected Behavior:**
- UI shows real bot assignments from user selections ✅ **WORKING**
- "DEPLOY PURGE" sends actual assignment data ✅ **FIXED**
- No mock data in API calls ✅ **FIXED**

**Manual Verification:**
- Assign bots to battalions in UI ✅ **WORKING**
- Check network tab shows real data in API calls ✅ **FIXED**
- Verify UI displays correct assignments ✅ **WORKING**

**✅ STATUS: COMPLETED** - Mock data issue resolved, real assignments now sent to server

## **📋 TEST BATCH 2: Random Spawn Node Assignment**

### **Batch 2A: Server-Side Spawn Logic (COMPLETED)**
**Test:** `server/__tests__/battlePreparation/spawnNodeAssignment.test.ts`
- **Test 1:** `should assign battalions to random available nodes` ✅ **FIXED**
- **Test 2:** `should handle multiple battalions at same node` ✅ **FIXED**
- **Test 3:** `should use nodes 0, 1, or 2 for user battalions` ✅ **FIXED**

**Status:** ✅ **COMPLETED** - User battalions now use random spawn nodes

### **Batch 2B: Enemy Random Spawn Logic (COMPLETED)**
**Test:** `server/__tests__/battlePreparation/enemySpawnNodeAssignment.test.ts`
- **Test 1:** `should assign enemy battalions to random available nodes` ✅ **FIXED**
- **Test 2:** `should handle multiple enemy battalions at same node` ✅ **FIXED**
- **Test 3:** `should use nodes 6, 7, or 8 for enemy battalions` ✅ **FIXED**

**Status:** ✅ **COMPLETED** - Enemy battalions now use random spawn nodes

**Expected Behavior:**
- Enemy battalions spawn at random nodes (6, 7, 8) ✅ **FIXED**
- Multiple enemy battalions can spawn at same node ✅ **FIXED**
- No fixed node assignment for enemies ✅ **FIXED**

**Manual Verification:**
- Start multiple battles
- Observe enemy battalions spawn at different nodes each time
- Verify enemy nodes are 6, 7, or 8

### **Batch 2B: Client-Side Spawn Visualization (NEEDS FIX)**
**Test:** `mobile/__tests__/battlePreparation/spawnVisualization.test.tsx`