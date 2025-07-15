# Step 6b: Node Advantages Activation

## User Experience Behavior
- **Initial advantage activation**: After battle setup, controlled nodes immediately begin providing stat bonuses to friendly battalions
- **User nodes advantage**: Nodes 0, 1, 2 provide small stat bonuses to user battalions attacking along connected network lines
- **Enemy nodes advantage**: Nodes 6, 7, 8 provide small stat bonuses to enemy battalions attacking along connected network lines
- **Bonus calculation**: Small stat bonuses are calculated and applied to battalions based on network connectivity to owned nodes
- **Visual indicators**: Controlled nodes show subtle visual effects indicating active bonuses
- **Dynamic updates**: When neutral nodes are captured later, they immediately begin providing bonuses to battalions attacking along their connected network lines
- **Network-based distribution**: Bonuses only affect battalions attacking along network lines connected to controlled nodes
- **Implementation Note**: Node advantage details are not fully defined yet - controlling neutral nodes provides small stat advantages to battalions attacking on connected network lines

## Feature Description
**Node Strategic Advantage System**: Controlled nodes provide combat bonuses to friendly battalions through network connections. This creates strategic value for node control beyond just positioning, as controlling more nodes provides cumulative advantages in combat effectiveness. The system activates immediately after battle setup and updates dynamically as neutral nodes are captured.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - Bonus calculation and application to battalion stats
- **Server**: `src/config/battleConfig.ts` - Node advantage configuration and bonus values
- **Client**: `src/components/battle/BattleNetworkGrid.tsx` - Visual representation of node advantages
- **Client**: `src/hooks/useBattleNodes.ts` - Node state management and advantage tracking
- **Reference**: `node-behaviors.md` - Node advantages specification

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Combat calculations
  - **Server Responsibility**: Calculate and apply node-based stat bonuses to attack power, defense, and other combat stats
  - **Integration**: Should integrate with existing damage calculation methods to include node bonuses
  - **Code Status**: NEEDS IMPLEMENTATION - node advantage calculations not yet implemented
  - **Bonus Types**: Attack power bonuses, defense bonuses, speed bonuses based on controlled nodes
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** - Configuration management
  - **Server Responsibility**: Define node advantage values, bonus percentages, and network connectivity rules
  - **Code Status**: NEEDS ENHANCEMENT - should include NODE_ADVANTAGES configuration
  - **Configuration**: Bonus percentages per node type, maximum bonus caps, network range limits
- ✅ **[BattleNetworkGrid.tsx](../../src/components/battle/BattleNetworkGrid.tsx)** - Network visualization
  - **Client Responsibility**: Display visual indicators for active node advantages, show network connections with bonus effects
  - **Visual Effects**: Subtle glow or color enhancement for nodes providing bonuses
  - **Code Status**: NEEDS UPDATE - should include advantage visualization
- ✅ **[useBattleNodes.ts](../../src/hooks/useBattleNodes.ts)** - Node state management
  - **Client Responsibility**: Track node ownership changes, manage advantage state, display bonus effects
  - **State Management**: Monitor node capture events and update advantage distributions
  - **Code Status**: NEEDS UPDATE - should include advantage state tracking
- ✅ **[node-behaviors.md](../../node-behaviors.md)** - Specification reference
  - **Reference Document**: "Controlled Nodes: Provide stat bonuses to friendly battalions via connected network lines"
  - **Design Intent**: Node control provides tactical advantages beyond positioning
  - **Code Status**: SPECIFICATION EXISTS - implementation needed

**Missing Implementation:**
1. **Create**: `src/services/NodeAdvantageService.ts` - Dedicated service for node advantage calculations
   - **Purpose**: Calculate bonuses based on controlled nodes and network connectivity
   - **Methods**: `calculateBonuses()`, `applyNodeAdvantages()`, `updateAdvantageDistribution()`
2. **Update**: `src/config/battleConfig.ts` - Add NODE_ADVANTAGES configuration
   - **Configuration**: Bonus percentages, maximum caps, network range rules
3. **Update**: `src/services/BattleCalculator.ts` - Integrate node bonuses into combat calculations
   - **Integration**: Include node bonuses in attack power and defense calculations
4. **Update**: `src/components/battle/BattleNetworkGrid.tsx` - Add advantage visualization
   - **Visual Effects**: Show active bonuses and network connections
5. **Update**: `src/hooks/useBattleNodes.ts` - Add advantage state management
   - **State Tracking**: Monitor advantage changes and updates

**Recommended File Structure:**
- Node advantages should be calculated server-side to prevent cheating
- Client should display visual feedback for active bonuses
- Advantages should update immediately when nodes are captured
- Network connectivity determines bonus distribution range 