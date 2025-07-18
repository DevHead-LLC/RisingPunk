# Current Task: BattleGridScreen Refactoring - Remove Demo Mode

## **BIG PICTURE GOAL**
Transform BattleGridScreen into a pure orchestrator by removing ALL demo fallback logic and making everything work with proper server/client relationship.

## **CURRENT STATUS**

### **✅ WORKING (Server-Driven)**
- **Timer System**: Server controls countdown and battle phases
- **Network Layout**: 9 nodes in 3-column layout working
- **Battle Creation**: Server creates battles with proper IDs
- **Authentication**: Temporarily removed for user vs computer testing

### **❌ BROKEN (Still Using Demo Fallbacks)**
- **Battalion Data**: Client receives undefined IDs/types, falls back to demo data
- **React Keys**: No unique keys because battalion data is undefined
- **Battalion Display**: Not showing on correct nodes due to undefined data

## **CRITICAL ISSUE: Battalion Data Serialization**

### **Problem**
- Server creates battalions correctly: `user-battalion-0:guardian:0, user-battalion-1:breacher:1, etc.`
- BattleController shows proper data: `6 battalions - OK/OK/0, OK/OK/1, OK/OK/2, OK/OK/6, OK/OK/7, OK/OK/8`
- Client receives: `{"id": undefined, "nodeIndex": 0, "type": undefined}` for all 6 battalions
- Result: React key prop warning and fallback to demo data

### **Root Cause Identified**
- Battalion objects are Mongoose subdocuments with `__parentArray` and `__index` properties
- Direct property access doesn't work on Mongoose subdocuments
- Need manual property extraction in BattleController

### **Solution Applied**
- Extract battalion properties manually: `id: b.id, type: b.type, position: b.position, etc.`
- Avoid Mongoose methods that break TypeScript compilation
- Preserve all battalion data for proper client serialization

## **FAILED ATTEMPTS (DO NOT REPEAT)**
1. **toObject() on IBattalion** ❌ - TypeScript compilation error
2. **Spread operator { ...b }** ❌ - Produces undefined values  
3. **Object.assign({}, b)** ❌ - Still undefined in route transformation
4. **Repeated toObject() mistake** ❌ - Same TypeScript error

## **IMMEDIATE PRIORITIES**

### **1. Fix Battalion Data Serialization** ✅ COMPLETED
- **Status**: Manual property extraction implemented in BattleController
- **Result**: Battalions appearing, timer working, no React key warnings
- **Goal**: ✅ ACHIEVED - Server data working properly

### **2. BattleGridScreen Refactor - Batch 1** ✅ COMPLETED
- **Goal**: Complete Batch 1 of refactoring plan - Data Orchestration Logic
- **Status**: ✅ COMPLETED - Application verified working
- **Batch 1 Checklist**:
  - ✅ Extend useBattleSync.ts with data orchestration logic
  - ✅ Move displayBattalions logic to useBattleSync
  - ✅ Move displayNodes logic to useBattleSync
  - ✅ Update BattleGridScreen to use useBattleSync
  - ✅ Test server data display
  - ✅ Test local data display
  - ✅ Document in TOC
- **Result**: Data orchestration moved to useBattleSync, BattleGridScreen simplified

### **3. BattleGridScreen Refactor - Batch 2** 🔄 CURRENT
- **Goal**: Move Error State Logic to useBattleState.ts
- **Target**: Loading/error state management
- **Plan**: Extend useBattleState.ts with error handling, remove from BattleGridScreen

### **4. Remove Demo Fallback Logic** 🔄 NEXT
- **Location**: BattleGridScreen and related components
- **Action**: Remove all demo data fallbacks
- **Requirement**: Server data must work first (✅ COMPLETED)

## **ARCHITECTURE TARGET**
```
BattleGridScreen (Pure Orchestrator)
├── useBattleSync (Server Data Source)
├── BattleNetworkGrid (Network Display)
├── BattleBattalionManager (Battalion Display)
└── BattleOverlayManager (Timer/Overlays)
```

## **SERVER/CLIENT RESPONSIBILITIES**

### **Server (Authoritative)**
- Battle creation and management
- Timer control and phase transitions
- Battalion data and positioning
- Node ownership and capture progress

### **Client (Display/UI)**
- Network layout and positioning
- Battalion visualization
- Timer display and overlays
- User interactions and feedback

## **LOGGING STRATEGY**
- **Minimal**: Only log warnings for data issues
- **Clean**: Remove verbose debug logs
- **Focused**: Log only what helps solve current problems
