import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  // Placeholder state for testing
  testValue: string;
}

const initialState: UIState = {
  testValue: 'Redux is working!',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTestValue: (state, action: PayloadAction<string>) => {
      state.testValue = action.payload;
    },
  },
});

export const { setTestValue } = uiSlice.actions;
export default uiSlice.reducer; 