import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/** Payload for setForceUpdateRequired: sticky on failure; clear when updateRequired false and we have minAppVersion or success. */
export type ForceUpdatePayload = { updateRequired: boolean; minAppVersion?: string; success?: boolean };

interface UIState {
  /** Set when server requires min app version (health or 426). Show UpdateRequiredScreen until user updates. */
  forceUpdate: { updateRequired: boolean; minAppVersion?: string };
  // Map UI state
  map: {
    legendExpanded: boolean;
  };
  // Modal states (for future use)
  modals: {
    hackRigAlert: boolean;
    battleResults: boolean;
    botSelector: boolean;
    financialStatements: boolean;
    globalError: boolean;
    /** When globalError is true, variant controls modal copy: 'server_down' shows server-down message. */
    globalErrorVariant: 'generic' | 'server_down' | null;
  };
  // Screen navigation state (for future use)
  screens: {
    currentTurfScreen: string;
  };
}

const initialState: UIState = {
  forceUpdate: { updateRequired: false },
  map: {
    legendExpanded: false,
  },
  modals: {
    hackRigAlert: false,
    battleResults: false,
    botSelector: false,
    financialStatements: false,
    globalError: false,
    globalErrorVariant: null,
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

    setFinancialStatements: (state, action: PayloadAction<boolean>) => {
      state.modals.financialStatements = action.payload;
    },

    setGlobalErrorModal: (state, action: PayloadAction<boolean>) => {
      state.modals.globalError = action.payload;
      if (!action.payload) state.modals.globalErrorVariant = null;
    },
    setGlobalErrorVariant: (state, action: PayloadAction<'generic' | 'server_down' | null>) => {
      state.modals.globalErrorVariant = action.payload;
    },

    /** Sticky on failure: set updateRequired true when true; clear when updateRequired false and (minAppVersion set or success from health). */
    setForceUpdateRequired: (state, action: PayloadAction<ForceUpdatePayload>) => {
      const { updateRequired, minAppVersion, success } = action.payload;
      if (updateRequired) state.forceUpdate.updateRequired = true;
      else if (minAppVersion !== undefined || success) state.forceUpdate.updateRequired = false;
      if (minAppVersion !== undefined) state.forceUpdate.minAppVersion = minAppVersion;
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
  setFinancialStatements,
  setGlobalErrorModal,
  setGlobalErrorVariant,
  setForceUpdateRequired,
  setCurrentTurfScreen,
} = uiSlice.actions;

export default uiSlice.reducer;
