import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Battalion {
  id: string;
  type: 'guardian' | 'phreak' | 'breacher';
  position: { x: number; y: number };
  health: number;
  quantity: number;
  targetId: string | null;
  nodeId: number | null;
}

export interface BattleNode {
  id: number;
  position: { x: number; y: number };
  controllingTeam: 'red' | 'blue' | null;
  controlProgress: number;
}

export interface BattleState {
  phase: 'deployment' | 'active' | 'complete';
  timeRemaining: number;
  battalions: { [key: string]: Battalion };
  nodes: { [key: number]: BattleNode };
  winner: 'red' | 'blue' | null;
}

const initialState: BattleState = {
  phase: 'deployment',
  timeRemaining: 20,
  battalions: {},
  nodes: {
    0: { id: 0, position: { x: 100, y: 100 }, controllingTeam: 'red', controlProgress: 100 },
    1: { id: 1, position: { x: 300, y: 100 }, controllingTeam: 'red', controlProgress: 100 },
    2: { id: 2, position: { x: 500, y: 100 }, controllingTeam: 'red', controlProgress: 100 },
    3: { id: 3, position: { x: 200, y: 300 }, controllingTeam: null, controlProgress: 0 },
    4: { id: 4, position: { x: 300, y: 300 }, controllingTeam: null, controlProgress: 0 },
    5: { id: 5, position: { x: 400, y: 300 }, controllingTeam: null, controlProgress: 0 },
  },
  winner: null,
};

export const battleSlice = createSlice({
  name: 'battle',
  initialState,
  reducers: {
    deployBattalion: (state, action: PayloadAction<Battalion>) => {
      state.battalions[action.payload.id] = { ...action.payload };
    },
    updateBattalionPosition: (state, action: PayloadAction<{ id: string; position: { x: number; y: number } }>) => {
      if (state.battalions[action.payload.id]) {
        state.battalions[action.payload.id].position = { ...action.payload.position };
      }
    },
    updateBattalionTarget: (state, action: PayloadAction<{ id: string; targetId: string | null }>) => {
      if (state.battalions[action.payload.id]) {
        state.battalions[action.payload.id].targetId = action.payload.targetId;
      }
    },
    updateBattalionHealth: (state, action: PayloadAction<{ id: string; health: number }>) => {
      if (state.battalions[action.payload.id]) {
        state.battalions[action.payload.id].health = action.payload.health;
      }
    },
    updateNodeControl: (state, action: PayloadAction<{ id: number; team: 'red' | 'blue' | null; progress: number }>) => {
      if (state.nodes[action.payload.id]) {
        state.nodes[action.payload.id].controllingTeam = action.payload.team;
        state.nodes[action.payload.id].controlProgress = action.payload.progress;
      }
    },
    startBattle: (state) => {
      state.phase = 'active';
    },
    endBattle: (state, action: PayloadAction<'red' | 'blue'>) => {
      state.phase = 'complete';
      state.winner = action.payload;
    },
    resetBattle: () => initialState,
  },
});

export const {
  deployBattalion,
  updateBattalionPosition,
  updateBattalionTarget,
  updateBattalionHealth,
  updateNodeControl,
  startBattle,
  endBattle,
  resetBattle,
} = battleSlice.actions;

export default battleSlice.reducer;
