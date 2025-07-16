# AI DIRECTIVE - Sources of Truth Formatting Rules

**See `000-AI-Directive.md` for complete architecture guidelines**

## File Structure Hierarchy
- `# [Main Concept] {#anchor-id}` - Main logic concept with clickable anchor
- `## **Server/Client Source of Truth** [file-path](link) - line count` - Source of truth files with double asterisks
- `### *Controller Category*` - Italicized controller categories
- `#### File Name [file-path](link) - line count` - Individual files with descriptions

## Controller Categories
- **Connected Controllers** - Files that impact the application AND are properly funneled through the source of truth
- **Rogue Controllers** - Files that impact the application but are NOT funneled through the source of truth (need integration)
- **Disconnected Controllers** - Files intended for future use that don't currently exist or impact the application
- **Deprecated Controllers** - Files that don't impact the application and are not intended for future use (safe to delete)

## Link Formatting
- Use `[filename](relative-path)` for clickable links
- Server files: `../../server/src/...`
- Client files: `../src/...`
- Include line counts for all files
- Use anchor links for relationships: `[Concept](#anchor-id)`

## Relationship Formatting
- Use `(*belongs to: [Source](#anchor)*)` for relationships
- Use `← **Borrowed from: [Source](#anchor)**` for borrowed items
- Use `← **Key relationship**` for important connections
- Use single asterisks for italic emphasis

## Description Format
- Comma-delineated descriptions for file behaviors
- Include connection status and impact information
- Note planned implementation status for future files
- Mark borrowing relationships clearly

================================================================================================================================================================

# [Battalions] {#battalions}

## **Server Source of Truth** [`../../server/src/services/BattleMovement.ts`](../../server/src/services/BattleMovement.ts) - 454 lines
Main battalion movement orchestration and state management

### *Connected Controllers*

#### Battle Updater [`../../server/src/services/BattleUpdater.ts`](../../server/src/services/BattleUpdater.ts) - 520+ lines
- Orchestrates battalion updates every 100ms, calls movement methods, manages battle state transitions

#### Battle Controller [`../../server/src/controllers/BattleController.ts`](../../server/src/controllers/BattleController.ts) - 150+ lines
- API endpoints for battalion data, movement operations, battle state retrieval

#### Battle Model [`../../server/src/models/Battle.ts`](../../server/src/models/Battle.ts) - 200+ lines
- Database schema with embedded battalion state, movement data, MongoDB persistence

## **Client Source of Truth** [`../src/hooks/useBattleBattalions.ts`](../src/hooks/useBattleBattalions.ts) - 161 lines
Battalion state management for visualization and UI

### *Connected Controllers*

#### Battle Grid Screen [`../src/screens/BattleGridScreen.tsx`](../src/screens/BattleGridScreen.tsx) - 200+ lines
- Main battle screen using battalion data, server integration, visual orchestration

#### Battalion Data Hook [`../src/hooks/useBattalionData.ts`](../src/hooks/useBattalionData.ts) - 61 lines
- Battalion creation, stats calculation, health management, bot type integration

#### Battalion Component [`../src/components/battle/BattleBattalion.tsx`](../src/components/battle/BattleBattalion.tsx) - 138 lines
- Visual component for battalion display, shape rendering, health bars, quantity display

#### Battle API [`../src/store/api/battleApi.ts`](../src/store/api/battleApi.ts) - 100+ lines
- RTK Query implementation, actively fetching server battle state, connected to source of truth

### *Rogue Controllers*

#### Battalion State [`../src/hooks/useBattleBattalions.ts`](../src/hooks/useBattleBattalions.ts) - 161 lines
- Battalion state management, impacts application but not connected to movement source of truth

### *Deprecated Controllers*

#### Client Pathfinding [`../src/utils/pathfinding.ts`](../src/utils/pathfinding.ts) - 50+ lines
- Client-side pathfinding utilities, not used in application, no future plans

# [Movement] (*belongs to: [Battalions](#battalions)*) ← **Key relationship**

## **Server Source of Truth** [`../../server/src/services/BattleMovement.ts`](../../server/src/services/BattleMovement.ts) - 454 lines
Movement execution, pathfinding, and network constraint validation

### *Connected Controllers*

#### Battle Updater [`../../server/src/services/BattleUpdater.ts`](../../server/src/services/BattleUpdater.ts) - 520+ lines
- Calls movement methods every 100ms, orchestrates movement execution, position updates

#### Battle Controller [`../../server/src/controllers/BattleController.ts`](../../server/src/controllers/BattleController.ts) - 150+ lines
- Movement API endpoints, state retrieval, movement data access

#### Battle Model [`../../server/src/models/Battle.ts`](../../server/src/models/Battle.ts) - 200+ lines
- Stores movement state, remainingPath, finalTarget, battalion position persistence

## **Client Source of Truth** [`../src/utils/networkConstants.ts`](../src/utils/networkConstants.ts) - 31 lines
Network topology definition and connection constants

### *Connected Controllers*

#### Battle Network Hook [`../src/hooks/useBattleNetwork.ts`](../src/hooks/useBattleNetwork.ts) - 60+ lines
- Network connections for movement validation, line calculations, topology management

#### Network Grid Component [`../src/components/battle/BattleNetworkGrid.tsx`](../src/components/battle/BattleNetworkGrid.tsx) - 140+ lines
- Network visualization, node rendering, connection line display

### *Disconnected Controllers*

#### Movement Visualization [`../src/hooks/useBattleMovementVisualization.ts`](../src/hooks/useBattleMovementVisualization.ts) - planned
- Movement visualization hook, Batch 6A implementation, intended for future use

#### Movement Interpolation [`../src/utils/movementInterpolation.ts`](../src/utils/movementInterpolation.ts) - planned
- Interpolation utilities for smooth movement, Batch 6A implementation, intended for future use

#### Movement Effects [`../src/components/battle/BattleMovementEffects.tsx`](../src/components/battle/BattleMovementEffects.tsx) - planned
- Visual effects for movement trails, targeting indicators, Batch 6A implementation, intended for future use

# [Targeting] / Retargeting (*belongs to: [Battalions](#battalions)*) ← **Key relationship**

## **Server Source of Truth** [`../../server/src/services/BattleMovement.ts`](../../server/src/services/BattleMovement.ts) - findClosestTarget method
Target selection and retargeting logic within BattleMovement service

### *Connected Controllers*

#### Battle Updater [`../../server/src/services/BattleUpdater.ts`](../../server/src/services/BattleUpdater.ts) - 520+ lines
- Triggers retargeting when targets captured, destroyed, manages target validation

### *Rogue Controllers*

#### Client Targeting [`../src/hooks/useBattleBattalions.ts`](../src/hooks/useBattleBattalions.ts) - 161 lines
- Client targeting display, impacts application but not connected to server targeting logic