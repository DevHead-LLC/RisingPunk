# CURRENT TASK: Hack Map Tile-Based Screen & Persistence

## AI DIRECTIVES
- Follow intended.md and keep the server as the single authority for map data.
- Reuse existing services before adding new ones; avoid duplication.
- Keep edits focused and minimal; no code comments.

## OBJECTIVE
Implement a deterministic 2D tile map for `HackMapScreen` with terrain (lakes/rivers/mountains/forests/roads) and exactly 6 houses (1 user, 5 computers). Map persists in DB and loads the same each session. Scroll/drag to explore. No legend for now. House tiles show overlays: green (user), burnt orange (computers).

## SCOPE (THIS BATCH)
- Server: deterministic map generation + persistence via existing `Map` model/service.
- Server: GET `/api/map/:name` returns `{ grid: CellData[][] }` for client.
- Server: POST `/api/map/player-position` placeholder for future relocation (validates and places user house).
- Client: Update `HackMapScreen` to render grid from server with scrollable grid; remove legend.

## DONE
- Added `road` terrain to `server/src/models/Map.ts`.
- Enhanced `server/src/services/MapService.ts` to generate forests, mountains, rivers, roads; added open spaces (grass/dirt); grid size 50x50; place 6 houses (YOU + 5 computers). Player home fixed at a non-(0,0) stable coordinate (with fallback if blocked).
- Implemented map endpoints in `server/server.ts`:
  - GET `/api/map/:name` -> returns grid shape for client.
  - POST `/api/map/player-position` -> validates and sets user house.
- Updated `mobile/src/store/api/mapApi.ts` to use `/api/map/...` paths.
- Updated `mobile/src/screens/HackMapScreen.tsx` to support `road`, `grass`, `dirt`; remove legend; render house overlays; keep drag-scroll grid; handle dynamic 50x50 sizing; adjust cell size for usability.
- Updated `mobile/src/store/slices/mapSlice.ts` to include `road`, `grass`, `dirt` in `TerrainType` and set grid to 50x50.

## VALIDATION
- Map loads and shows terrain features and 6 houses.
- User house tile is green; computer houses burnt orange.
- Map is deterministic and persists across loads.
- No client fallbacks; server is the authority.

## NEXT (FUTURE BATCHES)
- Destroy/computer respawn: POST endpoint with 15-minute timer and relocation.
- Paid relocation for user: POST endpoint using balance service; UI to select empty tile.
- Minimal interaction UI on tile select.
