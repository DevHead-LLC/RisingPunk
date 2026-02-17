import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TerrainType = 'plain' | 'mountain' | 'water' | 'forest' | 'road' | 'grass' | 'dirt';
export type EntityType = 'empty' | 'player' | 'npc' | 'house';

export type CellData = {
  terrain: TerrainType;
  entity: EntityType;
  owner?: 'player' | 'enemy';
  name?: string;
};

export type GridData = CellData[][];

/** Sparse grid: rows may be null until loaded (avoids 250K cells at startup; Bugbot: 500×500 memory bloat). */
export type SparseGridData = (CellData[] | null)[];

/** Sparse fog: rows may be null until revealed. */
export type SparseFogData = (boolean[] | null)[];

export interface MapState {
  grid: GridData | SparseGridData;
  playerPosition: { x: number; y: number };
  fog: boolean[][] | SparseFogData;
  loading: boolean;
}

/** Default grid size when map is expanded (500×500). Client uses this until API returns grid/gridSize. */
const DEFAULT_GRID_SIZE = 500;

// Bugbot: Avoid 250K CellData + 250K booleans at module load; use sparse arrays, allocate rows on demand (merge/reveal).
const initialFog: SparseFogData = Array(DEFAULT_GRID_SIZE).fill(null);
const initialGrid: SparseGridData = Array(DEFAULT_GRID_SIZE).fill(null);

const initialState: MapState = {
  grid: initialGrid,
  playerPosition: { x: 0, y: 0 },
  fog: initialFog,
  loading: false,
};

export const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setGrid: (state, action: PayloadAction<GridData | SparseGridData>) => {
      state.grid = action.payload;
    },
    setPlayerPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.playerPosition = action.payload;
    },
    revealFog: (state, action: PayloadAction<{ x: number; y: number; radius: number }>) => {
      const { x, y, radius } = action.payload;
      const size = state.grid?.length ?? DEFAULT_GRID_SIZE;
      const fog = state.fog as SparseFogData;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            if (!fog[ny]) fog[ny] = Array(size).fill(true);
            fog[ny]![nx] = false;
          }
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    /** Clear player cells whose userId is in the list (e.g. deleted accounts). Keeps terrain, sets entity to empty. */
    clearPlayerCellsByUserIds: (state, action: PayloadAction<string[]>) => {
      const userIdsToRemove = new Set(action.payload.map((id) => String(id ?? '').trim()).filter(Boolean));
      if (userIdsToRemove.size === 0) return;
      const grid = state.grid as SparseGridData;
      for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        if (!row) continue;
        for (let x = 0; x < row.length; x++) {
          const cell = row[x] as CellData & { userId?: unknown };
          const cellUserId = cell?.userId != null ? String(cell.userId).trim() : '';
          if (cellUserId && userIdsToRemove.has(cellUserId)) {
            row[x] = {
              terrain: cell.terrain,
              entity: 'empty',
            };
          }
        }
      }
    },
    resetMap: () => initialState,
  },
});

export const { setGrid, setPlayerPosition, revealFog, setLoading, clearPlayerCellsByUserIds, resetMap } = mapSlice.actions;
export default mapSlice.reducer;
