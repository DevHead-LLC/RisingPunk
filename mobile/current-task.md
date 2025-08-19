# NPC LEVEL VISIBILITY IMPROVEMENT - CURRENT PRIORITY

## AI Directives
- Check existing files and logic first before creating new code
- Use authorities in coordination with use-existing-first.mdc rules
- Keep under 150 lines for effectiveness
- Update this file after every task

## CURRENT GOAL
Improve NPC visibility on HackMapScreen by adding level indicators (1, 5, 10, 15, 20) to both the map grid and modal popup.

## STATUS: Complete - NPC Level Display Implemented

### COMPLETED ✅
1. **Research Center Build Functionality**: Complete and production ready
2. **NPC Level Analysis**: Identified NPC structure with userLevelAssociation field
3. **Map Seeding Analysis**: Confirmed NPC levels 1, 5, 10, 15, 20 distribution
4. **Server-Side Implementation**: Added NPC level extraction and inclusion in map API
5. **Client-Side Types**: Created map types with NPC level support
6. **Grid Display**: Added level indicator in top-right corner of NPC squares
7. **Modal Enhancement**: Included level information in NPC attack modal
8. **UI Styling**: Professional level indicator with matrix-style colors

### IMPLEMENTATION DETAILS
**Server-Side Changes**:
- Added `getNPCLevelFromSlug()` function to extract level from NPC slug
- Modified map API response to include `npcLevel` field
- Level mapping based on seeding script distribution (1, 5, 10, 15, 20)

**Client-Side Changes**:
- Created `mobile/src/types/map.ts` with proper TypeScript interfaces
- Updated `mapApi.ts` to use new types
- Added NPC level indicator to both `Tile` and `PoolTile` components
- Enhanced modal popup to display NPC level prominently
- Added professional styling for level indicators

**UI Features**:
- **Grid Display**: Small black badge with green text in top-right corner of NPC squares
- **Modal Display**: Orange "LEVEL: X" text below entity name
- **Positioning**: Top-right corner for grid, below entity name for modal
- **Styling**: Matrix-style colors (#00ff41 for grid, #ff6b35 for modal)

### NPC LEVEL STRUCTURE
- **Level 1**: 20 NPCs (npc-neon-shiv, npc-chrome-havoc, npc-zero-grain, npc-ash-circuit, npc-vanta-razor)
- **Level 5**: 17 NPCs (npc-pulse-hex, npc-iris-vex, npc-rust-specter, npc-lume-strike, npc-cipher-ash)
- **Level 10**: 13 NPCs (npc-hollow-syn, npc-rift-breaker, npc-echo-shard, npc-grim-vector, npc-nova-skorn)
- **Level 15**: 5 NPCs (npc-talon-flux, npc-oblivion-byte, npc-drift-reaver, npc-static-venom, npc-wraith-node)
- **Level 20**: 2 NPCs (npc-shard-viper, npc-kryo-jackal, npc-spectra-void, npc-iron-phage, npc-neuro-scythe)

### FILES MODIFIED
- ✅ `server/src/routes/map.ts` - Added NPC level extraction and inclusion
- ✅ `mobile/src/types/map.ts` - Created new map types with NPC level support
- ✅ `mobile/src/store/api/mapApi.ts` - Updated to use new types
- ✅ `mobile/src/screens/HackMapScreen.tsx` - Added level display to grid and modal

### NEXT ACTION
Test the NPC level visibility implementation:
1. Start server and mobile app
2. Navigate to HackMapScreen
3. Verify NPC squares show level indicators in top-right corner
4. Click on NPC to verify modal shows level information
5. Confirm level display matches expected values (1, 5, 10, 15, 20)

## NOTES
- NPCs are stored in database with userLevelAssociation field
- Map seeding script already distributes NPCs by level
- Level extraction based on NPC slug patterns from seeding script
- Level display is subtle but visible in corner of NPC squares
- Modal shows level prominently for attack decision making
- Matrix-style color scheme maintains game aesthetic
- Ready for testing and user feedback
