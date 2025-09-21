import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BalanceState {
  total: number | null;
  ratePerSecond: number;
  lastUpdated: number | null; // timestamp (ms)
  fractionalRemainder: number;
  updateTrigger: number; // Add this to force selector recalculation
}

const initialState: BalanceState = {
  total: null,
  ratePerSecond: 1,
  lastUpdated: Date.now(), // Start with current time instead of null
  fractionalRemainder: 0,
  updateTrigger: 0,
};

export const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    updateBalance: (state, action: PayloadAction<{ total: number; ratePerSecond: number; lastUpdated: string | Date | null; fractionalRemainder?: number }>) => {
      state.total = action.payload.total;
      state.ratePerSecond = action.payload.ratePerSecond;
      state.fractionalRemainder = action.payload.fractionalRemainder || 0;
      
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
      } else {
        // Log when subtraction fails for debugging
        console.warn(`⚠️ BALANCE WARNING: Cannot subtract ${action.payload} from balance ${state.total} - insufficient funds`);
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

// Selector to get the current balance (server-calculated with fractional remainder)
// Server handles all calculations, mobile just displays the result
export const getCurrentBalance = (state: { balance: BalanceState }) => {
  const { total, fractionalRemainder } = state.balance;
  if (total === null) return 0;
  
  // Server already calculated the balance with fractional remainder
  // Just return the floor-rounded value for display
  return Math.floor(total + (fractionalRemainder || 0));
};
