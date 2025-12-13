import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type BotType = 'breacher' | 'guardian' | 'phreak';

export interface BuildQueue {
  type: BotType;
  quantity: number;
  totalCost: number;
  progress: number;
  startedAt: string;
  completesAt: string;
  botsBuilt?: number;
}

export interface BotsState {
  botCounts: Record<BotType, number>;
  deployedCounts: Record<BotType, number>;
  buildingProgress: number | null;
  selectedType: BotType | null;
  buildStartTime: string | null;
  totalBuildQuantity: number;
  buildQueue: BuildQueue | null;
}

const initialState: BotsState = {
  botCounts: { breacher: 10, guardian: 10, phreak: 10 },
  deployedCounts: { breacher: 0, guardian: 0, phreak: 0 },
  buildingProgress: null,
  selectedType: null,
  buildStartTime: null,
  totalBuildQuantity: 0,
  buildQueue: null,
};

export const botsSlice = createSlice({
  name: 'bots',
  initialState,
  reducers: {
    setBots: (state, action: PayloadAction<Record<BotType, number>>) => {
      state.botCounts = action.payload;
    },
    setDeployedCounts: (state, action: PayloadAction<Record<BotType, number>>) => {
      state.deployedCounts = action.payload;
    },
    setBuildState: (state, action: PayloadAction<{ buildQueue: BuildQueue | null; bots: Record<BotType, number> }>) => {
      const { buildQueue, bots } = action.payload;
      state.botCounts = bots;
      state.buildQueue = buildQueue;
      if (buildQueue) {
        state.buildingProgress = buildQueue.progress;
        state.totalBuildQuantity = buildQueue.quantity;
        state.buildStartTime = buildQueue.startedAt;
        state.selectedType = buildQueue.type;
      } else {
        state.buildingProgress = null;
        state.totalBuildQuantity = 0;
        state.buildStartTime = null;
        state.selectedType = null;
      }
    },
    selectBotType: (state, action: PayloadAction<BotType | null>) => {
      state.selectedType = action.payload;
    },
    clearBuildState: (state) => {
      state.buildingProgress = null;
      state.totalBuildQuantity = 0;
      state.buildStartTime = null;
      state.buildQueue = null;
      state.selectedType = null;
    },
  },
});

export const { setBots, setDeployedCounts, setBuildState, selectBotType, clearBuildState } = botsSlice.actions;
export default botsSlice.reducer;
