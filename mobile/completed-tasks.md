## Batch 1A: Core Types and Constants (Foundation)
**Goal**: Create the foundational types and network constants

### NEW FILES TO CREATE:
1. **`src/types/battleTypes.ts`** (30 lines) - Core type definitions
2. **`src/utils/battleNetworkConstants.ts`** (20 lines) - Network topology constants

### FILES TO REFERENCE (READ ONLY):
- `src/types/battle.ts` (existing - for reference only)
- `src/utils/networkConstants.ts` (existing - for reference only)

### What This Achieves:
- ✅ Core type definitions for nodes, battalions, battle state
- ✅ Network topology with fixed node connections
- ✅ Foundation for all future development

### Test Criteria:
- Types compile correctly
- Network constants are properly defined
- No TypeScript errors

---

## Batch 1B: Basic Network Visualization
**Goal**: Create the basic network visualization components

### NEW FILES CREATED:
1. **`src/components/battle/BattleNetworkLines.tsx`** (40 lines) - Connection lines component
2. **`src/components/battle/BattleNetworkNode.tsx`** (60 lines) - Individual node component
3. **`src/components/battle/BattleNetworkGrid.tsx`** (80 lines) - Combined network visualization

### FILES REFERENCED (READ ONLY):
- `src/components/battle/NetworkLines.tsx` (existing - for reference only)
- `src/components/battle/NetworkNode.tsx` (existing - for reference only)
- `src/components/battle/BattleNetwork.tsx` (existing - for reference only)

### What This Achieves:
- ✅ Static network grid with 9 nodes
- ✅ Network lines connecting nodes
- ✅ Proper positioning and sizing
- ✅ Visual foundation for all future work

### Test Criteria:
- Network renders correctly
- All 9 nodes visible
- All connections drawn
- Proper screen positioning

---
