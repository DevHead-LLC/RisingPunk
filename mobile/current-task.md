# Current Task: Initial Targeting & Movement Implementation

## **🎯 CONTEXT: BATTLE FLOW PROGRESSION**

**Current State**: 
- ✅ 3-second countdown overlay working
- ✅ 20-second battle timer working  
- ✅ Mock battalions appear on nodes (0,1,2 for user, 6,7,8 for enemy)
- ✅ Server authority established (no local fallbacks)
- ✅ Self-contained components with direct API calls

**Next Step**: Initial targeting and movement for mock battalions

## **📋 TASK: IMPLEMENT INITIAL TARGETING & MOVEMENT**

### **Phase 1: Initial Targeting Logic**
**Goal**: Mock battalions automatically select random neutral node targets when countdown reaches 1

**Requirements**:
- **Network Constraint**: Battalions can only target nodes reachable via network connections
- **Random Selection**: Each battalion picks one random neutral node from valid targets
- **Single Target Rule**: Each battalion targets only ONE node at a time
- **Multiple Attackers**: Multiple battalions can target the same node
- **Server Authority**: All targeting logic on server, client only visualizes

**Implementation Plan**:
1. **Server**: Create `TargetingService.ts` for random target selection (NEW FILE - keep under 250 lines)
2. **Server**: Import and use in `BattleService.ts` (existing authority)
3. **Server**: Update `BattleController.ts` to include targeting data in API response
4. **Client**: Update `BattleBattalionManager.tsx` to display targeting indicators
5. **Client**: Add visual feedback showing which node each battalion is targeting

### **Phase 2: Movement Initiation**
**Goal**: Battalions move along network lines toward their assigned targets

**Requirements**:
- **Network Constraint**: Movement strictly follows network connections
- **Bot Speed**: Movement speed based on bot type (Guardian=9, Breacher=5, Phreak=7)
- **Continuous Movement**: Smooth movement along network path
- **No Off-Network**: No diagonal or off-network movement allowed

**Implementation Plan**:
1. **Server**: Create `MovementService.ts` for movement calculations (NEW FILE - keep under 250 lines)
2. **Server**: Add movement logic to `BattleService.ts`
3. **Server**: Update API to include battalion positions during movement
4. **Client**: Update `BattleBattalion.tsx` to animate movement along network lines
5. **Client**: Ensure movement visualization follows network topology

### **Phase 3: Attack Range Positioning**
**Goal**: Battalions stop at attack range distance from target along network path

**Requirements**:
- **Network-Constrained Range**: Attack range only extends along network lines
- **Bot-Specific Range**: Guardian=4, Breacher=5, Phreak=9
- **Precise Positioning**: Stop when range intersects target center along network path
- **No Circular Range**: Range projection follows network topology only

## **🏗️ ARCHITECTURE APPROACH**

### **Server-Side Implementation**
- **`TargetingService.ts`**: Random target selection with network validation (NEW - under 250 lines)
- **`MovementService.ts`**: Movement calculations with network constraints (NEW - under 250 lines)
- **`BattleService.ts`**: Orchestrates targeting → movement → positioning sequence (existing)
- **`BattleController.ts`**: Sends targeting and movement data to clients (existing)

### **Client-Side Implementation**
- **`BattleBattalionManager.tsx`**: Displays targeting indicators and movement
- **`BattleBattalion.tsx`**: Animates movement along network lines
- **Network visualization**: Shows targeting lines and movement paths

### **Data Flow**
```
1. Countdown reaches 1 → Server triggers initial targeting
2. Server: Random target selection for each battalion
3. Server: Movement calculations along network paths
4. Server: Attack range positioning calculations
5. Server: Sends targeting + movement + positioning data via API
6. Client: Displays targeting indicators and animates movement
```

## **🎯 SUCCESS CRITERIA**

- [ ] Mock battalions automatically select random neutral node targets
- [ ] Targeting follows network topology (no invalid targets)
- [ ] Visual feedback shows which node each battalion is targeting
- [ ] Battalions move smoothly along network lines toward targets
- [ ] Movement speed varies by bot type
- [ ] Battalions stop at correct attack range distance
- [ ] Attack range is network-constrained (no circular projection)
- [ ] All logic runs on server, client only visualizes

## **⚠️ CONSTRAINTS**

- **Single Step**: Implement one phase at a time
- **Network Authority**: All calculations must respect network topology
- **Server Control**: No client-side targeting or movement logic
- **Mock Data**: Use existing mock battalion system for now
- **File Size**: Keep new service files under 250 lines each
- **Existing Files**: BattleService.ts (321 lines) and BattleController.ts (324 lines) already exceed 250 lines

## **📁 FILES TO CREATE/MODIFY**

**New Files**:
- `server/src/services/TargetingService.ts` (NEW - under 250 lines)
- `server/src/services/MovementService.ts` (NEW - under 250 lines)

**Modify Files**:
- `server/src/services/BattleService.ts` - Import and use targeting service (existing)
- `server/src/controllers/BattleController.ts` - Include targeting/movement data (existing)
- `mobile/src/components/battle/BattleBattalionManager.tsx` - Display targeting
- `mobile/src/components/battle/BattleBattalion.tsx` - Animate movement

**Start with**: Phase 1 (Initial Targeting Logic) - Create `TargetingService.ts` with random target selection

## **📝 CONVERSATION NOTES**

**User Feedback**: 
- Previous implementation was "fucking stupid and wrong"
- Created circular dependency between BattleTimerService and BattleService
- Touched timer logic unnecessarily when it should only handle timing
- BattleService.ts (321 lines) and BattleController.ts (324 lines) already exceed 250-line limit
- Need focused, separate services for targeting and movement logic
- Server authority is essential for targeting to prevent client-side manipulation
- Keep file sizes under 250 lines, create new focused services where needed
