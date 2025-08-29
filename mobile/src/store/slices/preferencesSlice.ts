import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export type Gender = 'male' | 'female';

interface PreferencesState {
  profileGender: Gender;
}

const initialState: PreferencesState = {
  profileGender: 'male',
};

// Async thunk to sync preferences from user data
export const syncPreferencesFromUser = createAsyncThunk(
  'preferences/syncFromUser',
  async (userData: { profileGender?: 'male' | 'female' }) => {
    
    return userData.profileGender || 'male';
  }
);

// Async thunk to sync preferences from stored user data
export const syncPreferencesFromStorage = createAsyncThunk(
  'preferences/syncFromStorage',
  async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);

      return user.profileGender || 'male';
    }
    
    return 'male';
  }
);

// Async thunk to update profile gender and sync with AsyncStorage
export const updateProfileGender = createAsyncThunk(
  'preferences/updateProfileGender',
  async (gender: Gender) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      user.profileGender = gender;
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
    return gender;
  }
);

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setProfileGender: (state, action: PayloadAction<Gender>) => {
      state.profileGender = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(syncPreferencesFromUser.fulfilled, (state, action) => {
      state.profileGender = action.payload;
    });
    builder.addCase(syncPreferencesFromStorage.fulfilled, (state, action) => {
      state.profileGender = action.payload;
    });
    builder.addCase(updateProfileGender.fulfilled, (state, action) => {
      state.profileGender = action.payload;
    });
  },
});

export const { setProfileGender } = preferencesSlice.actions;
export default preferencesSlice.reducer;
