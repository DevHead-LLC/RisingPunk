import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  // Map UI state
  map: {
    legendExpanded: boolean;
  };
  // Modal states (for future use)
  modals: {
    hackRigAlert: boolean;
    battleResults: boolean;
    botSelector: boolean;
  };
  // Screen navigation state (for future use)
  screens: {
    currentTurfScreen: string;
  };
}

const initialState: UIState = {
  map: {
    legendExpanded: false,
  },
  modals: {
    hackRigAlert: false,
    battleResults: false,
    botSelector: false,
  },
  screens: {
    currentTurfScreen: 'home',
  },
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Map actions
    toggleLegend: (state) => {
      state.map.legendExpanded = !state.map.legendExpanded;
    },
    setLegendExpanded: (state, action: PayloadAction<boolean>) => {
      state.map.legendExpanded = action.payload;
    },
    
    // Modal actions (for future use)
    setHackRigAlert: (state, action: PayloadAction<boolean>) => {
      state.modals.hackRigAlert = action.payload;
    },
    setBattleResults: (state, action: PayloadAction<boolean>) => {
      state.modals.battleResults = action.payload;
    },
    setBotSelector: (state, action: PayloadAction<boolean>) => {
      state.modals.botSelector = action.payload;
    },
    
    // Screen navigation actions (for future use)
    setCurrentTurfScreen: (state, action: PayloadAction<string>) => {
      state.screens.currentTurfScreen = action.payload;
    },
  },
});

export const { 
  toggleLegend, 
  setLegendExpanded,
  setHackRigAlert,
  setBattleResults,
  setBotSelector,
  setCurrentTurfScreen,
} = uiSlice.actions;

export default uiSlice.reducer; 