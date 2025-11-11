import { createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { balanceApi } from '../api/balanceApi';
import { botsApi } from '../api/botsApi';
import { mapApi } from '../api/mapApi';

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    
    dispatch(authApi.util.resetApiState());
    dispatch(balanceApi.util.resetApiState());
    dispatch(botsApi.util.resetApiState());
    dispatch(mapApi.util.resetApiState());
  }
);


