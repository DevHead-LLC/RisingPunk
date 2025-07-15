# Step 8b: Network Constraint Validation

## User Experience Behavior
- Movement is strictly constrained to network connections - battalions cannot move off-network
- No diagonal or off-network movement allowed - strict network topology adherence
- Visual feedback shows battalions moving along network lines toward their randomly assigned targets
- Movement is continuous and smooth along the network path
- Network topology enforcement prevents any movement outside the defined node connections

## Feature Description
**Network Constraint Validation**: All battalion movement must follow the predefined network topology. Movement is strictly constrained to network connections, preventing any diagonal or off-network movement. This ensures battalions follow realistic network paths and maintains game balance through controlled movement patterns.

## Source of Truth Files
- **Server**: `src/services/BattleMovement.ts` - Network path validation and constraint enforcement
- **Client**: `src/utils/networkConstants.ts` - Network topology definition and connection validation
- **Client**: `src/components/battle/BattleBattalion.tsx` - Network-constrained movement visualization
- **Config**: `src/config/battleConfig.ts` - Network topology configuration

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleMovement.ts](../../../server/src/services/BattleMovement.ts)** (453 lines) - Network path validation exists but needs enhancement
  - **Server Responsibility**: Network path validation to ensure movement stays on network, constraint enforcement for all movement calculations
  - **Anti-Cheat**: Server validates all movement paths against network topology
  - **Code Status**: NEEDS ENHANCEMENT - Network constraint validation should be more robust
- ✅ **[networkConstants.ts](../../src/utils/networkConstants.ts)** (31 lines) - Network topology definition, properly connected
  - **Client Responsibility**: Defines node positions and connections for movement validation
  - **Code Status**: EXISTS - Network layout properly defined
- ✅ **[BattleBattalion.tsx](../../src/components/battle/BattleBattalion.tsx)** (138 lines) - Movement visualization, needs network constraint updates
  - **Client Responsibility**: Network-constrained movement visualization, path following along network lines
  - **Code Status**: NEEDS UPDATE - Should show network-constrained movement only
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Network topology configuration
  - **Code Status**: NEEDS UPDATE - Should include network constraint validation rules

**File Size Check:**
- **BattleMovement.ts** (453 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/NetworkPathValidator.ts` - Extract network validation logic from BattleMovement
2. **Create**: `src/services/MovementConstraintService.ts` - Extract constraint enforcement from BattleMovement
3. **Update**: `src/components/battle/BattleBattalion.tsx` - Ensure movement visualization follows network lines
4. **Import Strategy**: 
   - Import `NetworkPathValidator` into `BattleMovement.ts`
   - Import `MovementConstraintService` into `BattleMovement.ts`
   - Update `BattleBattalion.tsx` to use network-constrained movement display
   - Keep `networkConstants.ts` as single source of truth (31 lines, under limit)

**Network Constraint Enforcement:**
- **Server**: All movement calculations must validate against network connections
- **Client**: Movement visualization must follow network lines, not direct paths
- **Validation**: Movement speed and path must respect network topology
- **Anti-Cheat**: Server controls all movement logic, client only displays network-constrained results 