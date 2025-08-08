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

export interface MapState {
  grid: GridData;
  playerPosition: { x: number; y: number };
  fog: boolean[][];
  loading: boolean;
}

const GRID_SIZE = 50;

const initialFog = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(true));
const initialGrid: GridData = Array(GRID_SIZE).fill(null).map(() =>
  Array(GRID_SIZE).fill(null).map((): CellData => ({
    terrain: 'plain',
    entity: 'empty',
  }))
);

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
    setGrid: (state, action: PayloadAction<GridData>) => {
      state.grid = action.payload;
    },
    setPlayerPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.playerPosition = action.payload;
    },
    revealFog: (state, action: PayloadAction<{ x: number; y: number; radius: number }>) => {
      const { x, y, radius } = action.payload;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            state.fog[ny][nx] = false;
          }
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    resetMap: () => initialState,
  },
});

export const { setGrid, setPlayerPosition, revealFog, setLoading, resetMap } = mapSlice.actions;
export default mapSlice.reducer;
