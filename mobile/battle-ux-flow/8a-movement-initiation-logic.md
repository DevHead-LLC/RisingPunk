# Step 8a: Movement Initiation Logic

## User Experience Behavior
- Battalions immediately begin moving along network lines after random target assignment from Step 7
- Movement is constrained to network connections - battalions cannot move off-network
- Movement speed is determined by bot type stats (Guardian=9, Breacher=5, Phreak=7)
- See [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for complete bot specifications
- Visual feedback shows battalions moving along network lines toward their randomly assigned targets
- Movement is continuous and smooth along the network path
- No diagonal or off-network movement allowed - strict network topology adherence

## Feature Description
**Movement Initiation Logic**: After random target assignment, battalions immediately begin moving along network connections toward their assigned targets. This is the one-time initial movement phase - all subsequent targeting and movement will use proximity-based pathfinding. Movement is strictly constrained to the network topology and varies by bot type speed.

## Source of Truth Files
- **Server**: `src/services/BattleMovement.ts` - Initial movement calculations and network path validation
- **Config**: `src/config/battleConfig.ts` - Bot movement speed stats and network topology
- **Client**: `src/hooks/useBattleBattalions.ts` - Real-time battalion position updates
- **Visual**: `src/components/battle/BattleBattalion.tsx` - Battalion movement animation along network lines

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleMovement.ts](../../../server/src/services/BattleMovement.ts)** (453 lines) - Initial movement calculations exist but need network constraint enforcement
  - **Server Responsibility**: Initial movement calculations based on bot type speed stats, network path validation to ensure movement stays on network
  - **Anti-Cheat**: Server controls all initial movement logic, client only visualizes
  - **Code Status**: NEEDS REFACTORING - Initial movement logic should validate against network connections
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Bot movement speed stats, properly connected
- ✅ **[useBattleBattalions.ts](../../src/hooks/useBattleBattalions.ts)** (85 lines) - Battalion position management, properly connected
- ✅ **[BattleBattalion.tsx](../../src/components/battle/BattleBattalion.tsx)** (138 lines) - Movement visualization, needs network constraint updates
- ✅ **[networkConstants.ts](../../src/utils/networkConstants.ts)** (31 lines) - Network topology for movement validation, properly connected

**File Size Check:**
- **BattleMovement.ts** (453 lines) - **OVER 250 LINES** - Should be split

**Recommended File Structure:**
1. **Create**: `src/services/InitialMovementService.ts` - Extract initial movement logic from BattleMovement
2. **Create**: `src/services/MovementValidator.ts` - Extract movement validation from BattleMovement
3. **Update**: `src/components/battle/BattleBattalion.tsx` - Ensure movement visualization follows network lines
4. **Import Strategy**: 
   - Import `InitialMovementService` into `BattleMovement.ts`
   - Import `MovementValidator` into `BattleMovement.ts`
   - Update `BattleBattalion.tsx` to use network-constrained movement display
   - Keep `networkConstants.ts` as single source of truth (31 lines, under limit)

**Initial Movement Constraint Enforcement:**
- **Server**: All initial movement calculations must validate against network connections
- **Client**: Initial movement visualization must follow network lines, not direct paths
- **Validation**: Initial movement speed and path must respect network topology
- **Anti-Cheat**: Server controls all initial movement logic, client only displays network-constrained results 