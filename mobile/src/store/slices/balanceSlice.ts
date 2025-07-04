import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

export interface BalanceState {
  total: number | null;
  ratePerSecond: number;
  lastUpdated: number | null; // timestamp (ms)
  updateTrigger: number; // Add this to force selector recalculation
}

const initialState: BalanceState = {
  total: null,
  ratePerSecond: 1,
  lastUpdated: null,
  updateTrigger: 0,
};

export const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    updateBalance: (state, action: PayloadAction<{ total: number; ratePerSecond: number }>) => {
      state.total = action.payload.total;
      state.ratePerSecond = action.payload.ratePerSecond;
      state.lastUpdated = Date.now();
    },
    addToBalance: (state, action: PayloadAction<number>) => {
      if (state.total !== null) {
        state.total += action.payload;
        state.lastUpdated = Date.now();
      }
    },
    subtractFromBalance: (state, action: PayloadAction<number>) => {
      if (state.total !== null && state.total >= action.payload) {
        state.total -= action.payload;
        state.lastUpdated = Date.now();
      }
    },
    triggerUpdate: (state) => {
      // This action forces the selector to recalculate
      state.updateTrigger += 1;
    },
  },
});

export const { updateBalance, addToBalance, subtractFromBalance, triggerUpdate } = balanceSlice.actions;
export default balanceSlice.reducer;

// Selector to get the current balance (with time-based accrual)
// Updates every 10 seconds to match API polling interval
export const getCurrentBalance = (state: { balance: BalanceState }) => {
  // Safety check for undefined state
  if (!state || !state.balance) return 0;
  
  const { total, ratePerSecond, lastUpdated, updateTrigger } = state.balance;
  if (total === null || lastUpdated === null) return 0;
  
  // Calculate elapsed time since last update
  const elapsed = (Date.now() - lastUpdated) / 1000;
  const calculatedBalance = Math.floor(total + ratePerSecond * elapsed);
  
  // Return calculated balance (updateTrigger ensures re-evaluation)
  return calculatedBalance + (updateTrigger * 0);
}; 