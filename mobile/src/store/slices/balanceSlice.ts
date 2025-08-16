import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BalanceState {
  total: number | null;
  ratePerSecond: number;
  lastUpdated: number | null; // timestamp (ms)
  updateTrigger: number; // Add this to force selector recalculation
}

const initialState: BalanceState = {
  total: null,
  ratePerSecond: 1,
  lastUpdated: Date.now(), // Start with current time instead of null
  updateTrigger: 0,
};

export const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    updateBalance: (state, action: PayloadAction<{ total: number; ratePerSecond: number; lastUpdated: string | Date | null }>) => {
      state.total = action.payload.total;
      state.ratePerSecond = action.payload.ratePerSecond;
      
      // Handle lastUpdated more robustly
      if (action.payload.lastUpdated) {
        try {
          const timestamp = new Date(action.payload.lastUpdated).getTime();
          if (!isNaN(timestamp)) {
            state.lastUpdated = timestamp;
          } else {
            // Fallback to current time if parsing fails
            state.lastUpdated = Date.now();
          }
        } catch (error) {
          // Fallback to current time if parsing fails
          state.lastUpdated = Date.now();
        }
      } else {
        // If no lastUpdated provided, use current time
        state.lastUpdated = Date.now();
      }
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
  if (!state || !state.balance) {
    return 0;
  }

  const { total, ratePerSecond, lastUpdated } = state.balance;
  
  // Handle null or invalid values
  if (total === null || total === undefined || isNaN(total)) {
    return 0;
  }
  
  // If lastUpdated is invalid, just return the total without time calculation
  if (lastUpdated === null || lastUpdated === undefined || isNaN(lastUpdated)) {
    return total;
  }

  // Calculate elapsed time since last update
  const elapsed = (Date.now() - lastUpdated) / 1000;
  
  // Ensure elapsed is not negative or NaN
  if (elapsed < 0 || isNaN(elapsed)) {
    return total;
  }
  
  const calculatedBalance = Math.floor(total + ratePerSecond * elapsed);
  
  // Ensure calculated balance is not NaN
  if (isNaN(calculatedBalance)) {
    return total;
  }

  // Return calculated balance
  return calculatedBalance;
};
