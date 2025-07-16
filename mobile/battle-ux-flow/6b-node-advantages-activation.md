# Step 6b: Node Advantages Activation

**⚠️ FUTURE TODO ITEM - NOT CURRENTLY IMPLEMENTED ⚠️**

This feature is planned for future implementation. Currently, no node advantages are provided to battalions. When implemented, neutral nodes that are captured will provide small stat bonuses to battalions attacking along connected network lines.

## User Experience Behavior
- **Current behavior**: No node advantages are currently active - all battalions fight with base stats only
- **Future implementation**: When neutral nodes are captured, they will provide small stat bonuses to battalions attacking along connected network lines
- **No starting advantages**: User-owned nodes (0, 1, 2) and enemy-owned nodes (6, 7, 8) do not provide any bonuses to their respective battalions
- **Future visual indicators**: When implemented, controlled nodes will show subtle visual effects indicating active bonuses
- **Future dynamic updates**: When neutral nodes are captured later, they will immediately begin providing bonuses to battalions attacking along their connected network lines
- **Future network-based distribution**: Bonuses will only affect battalions attacking along network lines connected to controlled nodes

## Feature Description
**Node Strategic Advantage System (Future Feature)**: When implemented, controlled neutral nodes will provide combat bonuses to friendly battalions through network connections. This will create strategic value for node control beyond just positioning, as controlling more nodes will provide cumulative advantages in combat effectiveness. The system will activate when neutral nodes are captured and update dynamically as more nodes are captured.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - Future: Bonus calculation and application to battalion stats
- **Server**: `src/config/battleConfig.ts` - Future: Node advantage configuration and bonus values
- **Client**: `src/components/battle/BattleNetworkGrid.tsx` - Future: Visual representation of node advantages
- **Client**: `src/hooks/useBattleNodes.ts` - Future: Node state management and advantage tracking
- **Reference**: `node-behaviors.md` - Future: Node advantages specification

## Implementation Analysis

**Current Status:**
- ❌ **NOT IMPLEMENTED** - Node advantages are a future feature
- ❌ **NO CURRENT BONUSES** - All battalions fight with base stats only
- ❌ **NO VISUAL INDICATORS** - No advantage effects are displayed

**Future Implementation Files:**
- **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Combat calculations
  - **Future Server Responsibility**: Calculate and apply node-based stat bonuses to attack power, defense, and other combat stats
  - **Future Integration**: Will integrate with existing damage calculation methods to include node bonuses
  - **Code Status**: FUTURE IMPLEMENTATION - node advantage calculations not yet implemented
  - **Future Bonus Types**: Attack power bonuses, defense bonuses, speed bonuses based on controlled neutral nodes
- **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** - Configuration management
  - **Future Server Responsibility**: Define node advantage values, bonus percentages, and network connectivity rules
  - **Code Status**: FUTURE ENHANCEMENT - will include NODE_ADVANTAGES configuration
  - **Future Configuration**: Bonus percentages per node type, maximum bonus caps, network range limits
- **[BattleNetworkGrid.tsx](../../src/components/battle/BattleNetworkGrid.tsx)** - Network visualization
  - **Future Client Responsibility**: Display visual indicators for active node advantages, show network connections with bonus effects
  - **Future Visual Effects**: Subtle glow or color enhancement for nodes providing bonuses
  - **Code Status**: FUTURE UPDATE - will include advantage visualization
- **[useBattleNodes.ts](../../src/hooks/useBattleNodes.ts)** - Node state management
  - **Future Client Responsibility**: Track node ownership changes, manage advantage state, display bonus effects
  - **Future State Management**: Monitor node capture events and update advantage distributions
  - **Code Status**: FUTURE UPDATE - will include advantage state tracking

**Future Implementation Requirements:**
1. **Create**: `src/services/NodeAdvantageService.ts` - Dedicated service for node advantage calculations
   - **Purpose**: Calculate bonuses based on controlled neutral nodes and network connectivity
   - **Methods**: `calculateBonuses()`, `applyNodeAdvantages()`, `updateAdvantageDistribution()`
2. **Update**: `src/config/battleConfig.ts` - Add NODE_ADVANTAGES configuration
   - **Configuration**: Bonus percentages, maximum caps, network range rules
3. **Update**: `src/services/BattleCalculator.ts` - Integrate node bonuses into combat calculations
   - **Integration**: Include node bonuses in attack power and defense calculations
4. **Update**: `src/components/battle/BattleNetworkGrid.tsx` - Add advantage visualization
   - **Visual Effects**: Show active bonuses and network connections
5. **Update**: `src/hooks/useBattleNodes.ts` - Add advantage state management
   - **State Tracking**: Monitor advantage changes and updates

**Future File Structure:**
- Node advantages will be calculated server-side to prevent cheating
- Client will display visual feedback for active bonuses
- Advantages will update immediately when neutral nodes are captured
- Network connectivity will determine bonus distribution range 