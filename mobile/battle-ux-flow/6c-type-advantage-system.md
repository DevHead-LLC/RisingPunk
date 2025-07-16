# Step 6c: Type Advantage System Activation

**⚠️ POSSIBLE TODO CONSIDERATION ⚠️**

The type advantages are currently built into the bot stats. This documentation describes a potential future enhancement where type advantages could be calculated separately from base stats. For now, the advantages are inherent in the bot type specifications.

## User Experience Behavior
- **Type advantage calculation**: Rock-Paper-Scissors system affects all combat damage calculations
- **Guardian advantage**: Guardian bots deal bonus damage to Breacher (Infantry) and receive reduced damage from Phreak (Ranged)
- **Breacher advantage**: Breacher bots deal bonus damage to Phreak (Ranged) and receive reduced damage from Guardian (Cavalry)
- **Phreak advantage**: Phreak bots deal bonus damage to Guardian (Cavalry) and receive reduced damage from Breacher (Infantry)
- **Visual indicators**: Combat animations show enhanced effects when type advantage is applied
- **Damage calculation integration**: Type bonuses/penalties are applied to base attack power before final damage calculation
- **Equipment bonuses**: Attack, defense, health, and speed bonuses from equipment are added to base stats before combat

## Feature Description
**Combat Type Advantage System**: Rock-Paper-Scissors mechanics where Guardian beats Breacher, Breacher beats Phreak, and Phreak beats Guardian. Type advantages provide damage bonuses when attacking and damage reduction when defending against weak types. Equipment bonuses modify base stats before type advantages are calculated, creating a layered combat system.

## Source of Truth Files
- **Server**: `src/services/BattleCalculator.ts` - Type advantage calculations and equipment bonus application
- **Server**: `src/config/battleConfig.ts` - Type advantage multipliers and equipment bonus values
- **Client**: `src/hooks/useBots.ts` - Bot type definitions and advantage descriptions
- **Reference**: `battalion-bot-behaviors.md` - Type advantage specifications and equipment system

## Implementation Analysis

**Existing Files & Connection Status:**
- ✅ **[BattleCalculator.ts](../../../server/src/services/BattleCalculator.ts)** - Combat calculations
  - **Server Responsibility**: Calculate type advantage bonuses/penalties, apply equipment bonuses to base stats, integrate advantages into damage calculations
  - **Type Advantage Formula**: Should implement Guardian > Breacher > Phreak > Guardian with specific multipliers
  - **Code Status**: NEEDS ENHANCEMENT - type advantage calculations not yet implemented
  - **Equipment Integration**: Must apply equipment bonuses before calculating type advantages
- ✅ **[battleConfig.ts](../../../server/src/config/battleConfig.ts)** - Configuration management
  - **Server Responsibility**: Define type advantage multipliers, equipment bonus values, advantage calculation rules
  - **Code Status**: NEEDS ENHANCEMENT - should include TYPE_ADVANTAGES and EQUIPMENT_BONUSES configuration
  - **Configuration**: Damage multipliers for advantages (e.g., 1.5x damage, 0.75x damage received)
- ✅ **[useBots.ts](../../src/hooks/useBots.ts)** - Bot type definitions
  - **Client Responsibility**: Display advantage descriptions, show equipment effects, visual combat feedback
  - **Code Status**: EXISTS - advantage descriptions already present ("Strong vs Infantry", etc.)
  - **Visual Integration**: Should show type advantage effects in combat animations
- ✅ **[battalion-bot-behaviors.md](../../battalion-bot-behaviors.md)** - Specification reference
  - **Reference Document**: "Rock-Paper-Scissors: Guardian > Breacher > Phreak > Guardian"
  - **Equipment System**: Attack/Defense/Health/Speed bonuses from items and gear
  - **Code Status**: SPECIFICATION EXISTS - implementation needed

**Missing Implementation:**
1. **Create**: `src/services/TypeAdvantageService.ts` - Dedicated service for type advantage calculations
   - **Purpose**: Calculate damage multipliers based on attacker vs defender bot types
   - **Methods**: `getTypeAdvantage()`, `calculateAdvantageMultiplier()`, `applyEquipmentBonuses()`
2. **Update**: `src/config/battleConfig.ts` - Add TYPE_ADVANTAGES and EQUIPMENT_BONUSES configuration
   - **Type Multipliers**: Damage bonuses/penalties for each type matchup
   - **Equipment Bonuses**: Attack, defense, health, speed bonus values
3. **Update**: `src/services/BattleCalculator.ts` - Integrate type advantages into combat calculations
   - **Integration Order**: Base stats → Equipment bonuses → Type advantages → Final damage
4. **Update**: `src/hooks/useBots.ts` - Enhance advantage display with equipment effects
   - **Visual Effects**: Show advantage indicators and equipment bonuses in UI

**Recommended File Structure:**
- Type advantages should be calculated server-side to prevent cheating
- Equipment bonuses should be applied before type advantage calculations
- Client should display visual feedback for advantages and equipment effects
- All combat calculations must include both equipment and type advantage modifiers

**Complete Specifications:**
See: [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md) for complete type advantage rules, damage multipliers, and bot specifications. 