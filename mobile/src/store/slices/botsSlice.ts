import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BotType } from '../../types/bots';
import { splitBotsFromApi } from '../../utils/botInventory';

export interface BuildQueue {
  type: BotType;
  /** 1 = Mark I, 2 = Mark II (server + build UI). */
  markLevel: 1 | 2;
  quantity: number;
  totalCost: number;
  progress: number;
  startedAt: string;
  completesAt: string;
  botsBuilt?: number;
}

export interface BotsState {
  botCounts: Record<BotType, number>;
  botCountsM2: Record<BotType, number>;
  deployedCounts: Record<BotType, number>;
  buildingProgress: number | null;
  selectedType: BotType | null;
  /** Selection in Bot Assembly (Mark column). */
  selectedMarkLevel: 1 | 2;
  buildStartTime: string | null;
  totalBuildQuantity: number;
  buildQueue: BuildQueue | null;
}

const initialState: BotsState = {
  botCounts: { breacher: 10, guardian: 10, phreak: 10 },
  botCountsM2: { breacher: 0, guardian: 0, phreak: 0 },
  deployedCounts: { breacher: 0, guardian: 0, phreak: 0 },
  buildingProgress: null,
  selectedType: null,
  selectedMarkLevel: 1,
  buildStartTime: null,
  totalBuildQuantity: 0,
  buildQueue: null,
};

function applyBotsPayload(state: BotsState, raw: Record<string, number>) {
  const { m1, m2 } = splitBotsFromApi(raw);
  state.botCounts = m1;
  state.botCountsM2 = m2;
}

export const botsSlice = createSlice({
  name: 'bots',
  initialState,
  reducers: {
    setBots: (state, action: PayloadAction<Record<string, number>>) => {
      applyBotsPayload(state, action.payload);
    },
    setDeployedCounts: (state, action: PayloadAction<Record<BotType, number>>) => {
      state.deployedCounts = action.payload;
    },
    setBuildState: (
      state,
      action: PayloadAction<{ buildQueue: BuildQueue | null; bots: Record<string, number> }>
    ) => {
      const { buildQueue: rawBq, bots } = action.payload;
      applyBotsPayload(state, bots);
      const buildQueue =
        rawBq == null
          ? null
          : (() => {
              const raw = rawBq as { botType?: BotType; type?: BotType; markLevel?: number };
              const family = raw.botType ?? raw.type;
              if (
                family !== 'breacher' &&
                family !== 'guardian' &&
                family !== 'phreak'
              ) {
                throw new Error(
                  `buildQueue missing bot family (expected botType or type): ${String(family)}`
                );
              }
              return {
                ...rawBq,
                type: family,
                markLevel: rawBq.markLevel === 2 ? 2 : 1,
              } as BuildQueue;
            })();
      state.buildQueue = buildQueue;
      if (buildQueue) {
        state.buildingProgress = buildQueue.progress;
        state.totalBuildQuantity = buildQueue.quantity;
        state.buildStartTime = buildQueue.startedAt;
        state.selectedType = buildQueue.type;
        state.selectedMarkLevel = buildQueue.markLevel;
      } else {
        state.buildingProgress = null;
        state.totalBuildQuantity = 0;
        state.buildStartTime = null;
        // Idle sync (poll) and post-build both send buildQueue: null — do not clear Bot Assembly
        // selection; that made BUILD a no-op (disabled + early return) seconds after selecting a bot.
      }
    },
    selectBotSlot: (state, action: PayloadAction<{ type: BotType; markLevel: 1 | 2 } | null>) => {
      if (action.payload == null) {
        state.selectedType = null;
        state.selectedMarkLevel = 1;
        return;
      }
      state.selectedType = action.payload.type;
      state.selectedMarkLevel = action.payload.markLevel;
    },
    clearBuildState: (state) => {
      state.buildingProgress = null;
      state.totalBuildQuantity = 0;
      state.buildStartTime = null;
      state.buildQueue = null;
      state.selectedType = null;
      state.selectedMarkLevel = 1;
    },
  },
});

export const { setBots, setDeployedCounts, setBuildState, selectBotSlot, clearBuildState } = botsSlice.actions;
export default botsSlice.reducer;
