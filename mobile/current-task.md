# Current Task: DEBUG BROKEN NETWORK DISPLAY - URGENT

## **AI DIRECTIVES**
1. Fix issues systematically one by one
2. Update this file after each fix with status
3. Don't run server/app - user handles that
4. Test each fix before moving to next

## **🚨 CURRENT BROKEN STATE**

### **❌ Issue 1: React Key Props Error**
- **Error**: "Each child in a list should have a unique 'key' prop"
- **Location**: TurfScreen component (from error stack)
- **Status**: BROKEN
- **Action**: Find and fix missing keys in TurfScreen

### **❌ Issue 2: Network Lines Missing**
- **Problem**: No network lines visible, only gray nodes
- **Possible Causes**:
  - Server not sending networkConnections/lineProperties
  - Client not receiving/processing network data
  - CSS/styling issues preventing line visibility
- **Status**: BROKEN
- **Action**: Debug server→client data flow

### **❌ Issue 3: Node Styling Lost**
- **Problem**: Nodes are gray, no colors, no labels
- **Expected**: Blue (user), red (enemy), gray (neutral) with index labels
- **Status**: BROKEN  
- **Action**: Check BattleNetworkGrid node rendering

### **❌ Issue 4: Battalions Missing**
- **Problem**: No battalions visible on nodes
- **Expected**: Starting battalions on nodes 0,1,2 (user) and 6,7,8 (enemy)
- **Status**: BROKEN
- **Action**: Check BattleBattalionManager rendering

## **🎯 SYSTEMATIC DEBUG PLAN**

### **Phase 1: Fix React Key Props (Highest Priority)**
- [ ] Find TurfScreen component causing key error
- [ ] Add missing keys to any .map() calls
- [ ] Test: Error should disappear from logs

### **Phase 2: Debug Network Data Flow** 
- [x] Add temporary console.logs to verify server sends data
- [x] Add temporary console.logs to verify client receives data  
- [x] Check networkConnections and lineProperties arrays
- [x] **IDENTIFIED CRITICAL ISSUE**: Server sending Mongoose docs instead of plain objects
- [x] **FIXED**: Server now extracts plain node data (index, owner, health, position)

### **Phase 3: Fix Network Line Rendering**
- [ ] Verify line styles are applied correctly
- [ ] Check line positioning (left, top, angle, length)
- [ ] Ensure lines are visible (z-index, color, width)
- [ ] Test: Network lines should appear

### **Phase 4: Fix Node Colors and Labels**
- [ ] Check getNodeColor() and getNodeBorderColor() functions
- [ ] Verify node owner values ('user', 'enemy', 'neutral')
- [ ] Check node label rendering (showNodeLabels prop)
- [ ] Test: Nodes should have correct colors and show numbers

### **Phase 5: Fix Battalion Rendering**
- [ ] Verify battalion data has correct nodeIndex values
- [ ] Check BattleBattalionManager receives proper data
- [ ] Verify battalion positioning on nodes
- [ ] Test: Battalions should appear on starting nodes

## **📋 CURRENT STATUS**
- **Overall**: DEBUGGING - identified root cause
- **Current**: Phase 2 COMPLETE - Fixed server data corruption 
- **Next**: Test if nodes now show colors and lines appear
- **Key Findings**: 
  - ❌ **ROOT CAUSE**: Server was sending Mongoose documents with metadata
  - ✅ **FIXED**: Server now sends clean node objects with index/owner/position
  - ✅ **SHOULD FIX**: Node colors, line calculations, battalion positioning
