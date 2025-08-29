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
    console.log('Preferences sync from user:', userData.profileGender || 'male');
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
      console.log('Preferences sync from storage:', user.profileGender || 'male');
      return user.profileGender || 'male';
    }
    console.log('Preferences sync from storage: no stored user, defaulting to male');
    return 'male';
  }
);

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setProfileGender: (state, action: PayloadAction<Gender>) => {
      state.profileGender = action.payload;
      // Also update AsyncStorage to keep it in sync
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.getItem('user').then((storedUser: string | null) => {
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.profileGender = action.payload;
          AsyncStorage.setItem('user', JSON.stringify(user));
          console.log('Preferences: Updated AsyncStorage with new gender:', action.payload);
        }
      }).catch(console.error);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(syncPreferencesFromUser.fulfilled, (state, action) => {
      state.profileGender = action.payload;
    });
    builder.addCase(syncPreferencesFromStorage.fulfilled, (state, action) => {
      state.profileGender = action.payload;
    });
  },
});

export const { setProfileGender } = preferencesSlice.actions;
export default preferencesSlice.reducer;
