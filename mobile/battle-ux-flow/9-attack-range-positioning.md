# Step 9: Attack Range Positioning System

## User Experience Behavior
- Battalions stop when their attack range intersects the target's center along the network path
- Attack range is determined by bot type stats (Guardian=4, Breacher=5, Phreak=9)
- See [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for complete bot specifications
- Attack range is network-constrained - only extends along network lines, not as a circular radius
- Battalions stop partway along network lines when attack range reaches target center
- Visual feedback shows network-constrained attack range and positioning
- No off-network attack range projection - everything stays on network lines

## Feature Description
**Network-Constrained Attack Range Calculation**: Battalions must stop when their attack range intersects the target's center along the network path. Attack range is strictly network-constrained - it only extends along network lines, not as a circular radius. This ensures battalions never attempt to move off-network and maintains the fundamental network topology constraint throughout all phases of battle.

## Source of Truth Files
- **Server**: `src/services/BattleMovement.ts` - calculateAttackPosition() determines network-constrained stopping position
- **Config**: `src/config/battleConfig.ts` - BOT_STATS defines attack range for each bot type
- **Network**: `src/utils/networkConstants.ts` - Network topology constrains attack range projection
- **Client**: `src/hooks/useBattleBattalions.ts` - Displays battalion positions and network-constrained attack ranges
- **Visual**: `src/components/battle/BattleBattalion.tsx` - Shows network-constrained attack range indicators

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleMovement.ts](../../../server/src/services/BattleMovement.ts)** (453 lines) - `calculateAttackPosition()` method exists but needs enhancement for network-constrained range
  - **Server Responsibility**: Determines network-constrained stopping coordinates, validates attack range, enforces network constraints
  - **Anti-Cheat**: Controls all positioning logic, client only displays results
  - **Code Status**: NEEDS REFACTORING - should only project range along network lines
  - **Network Constraint**: Must only project range along network paths, never off-network
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** (91 lines) - Bot type stats including attack range values, properly connected
  - **Code Status**: EXISTS - Bot type stats properly configured
- ✅ **[networkConstants.ts](../../src/utils/networkConstants.ts)** (31 lines) - Network topology for range projection, properly connected
  - **Code Status**: EXISTS - Network topology properly defined
  - **Network Constraint**: Single source of truth for network connections
- ✅ **[BattleBattalion.tsx](../../src/components/battle/BattleBattalion.tsx)** (138 lines) - Visual representation, needs update for network-constrained ranges
  - **Client Responsibility**: Visual display of network-constrained attack ranges, real-time positioning updates, no circular range visualization
  - **Code Status**: NEEDS UPDATE - should show network-constrained ranges, not circles
  - **Network Constraint**: Visual indicators must follow network lines, not circular patterns
- ✅ **[useBattleBattalions.ts](../../src/hooks/useBattleBattalions.ts)** (85 lines) - Battalion positioning, properly connected
  - **Client Responsibility**: Displays battalion positions and network-constrained attack ranges
  - **Code Status**: EXISTS - Battalion positioning properly implemented

**File Size Check:**
- **BattleMovement.ts** (453 lines) - **OVER 250 LINES** - Should be split
- **BattleBattalion.tsx** (138 lines) - Under limit, no split needed

**Recommended File Structure:**
1. **Create**: `src/services/NetworkAttackRangeService.ts` - Extract network-constrained attack range logic from BattleMovement
2. **Create**: `src/services/AttackPositionCalculator.ts` - Extract attack position calculation from BattleMovement
3. **Update**: `src/components/battle/BattleBattalion.tsx` - Change from circular to network-constrained range visualization
4. **Import Strategy**: 
   - Import `NetworkAttackRangeService` into `BattleMovement.ts`
   - Import `AttackPositionCalculator` into `BattleMovement.ts`
   - Update `BattleBattalion.tsx` to use network-constrained range display
   - Keep `networkConstants.ts` as single source of truth (31 lines, under limit) 