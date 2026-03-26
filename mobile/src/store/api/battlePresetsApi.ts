import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { balanceApi } from './balanceApi';

export interface PresetBattalionConfig {
  botType: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  /** Defaults to 1 when omitted (legacy presets). */
  markLevel?: 1 | 2;
}

export interface PresetData {
  id: string;
  levelRequired: number;
  cost: number;
  unlocked: boolean;
  unlockedAt: string | null;
  battalions: Record<string, PresetBattalionConfig> | null;
}

export interface BattlePresetsResponse {
  presets: Record<string, PresetData>;
  userLevel: number;
}

export interface UnlockPresetResponse {
  success: boolean;
  presets: Record<string, PresetData>;
  newBalance: number;
}

export interface SavePresetResponse {
  success: boolean;
  presets: Record<string, PresetData>;
}

const battlePresetsBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    timeout: 5000,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) { headers.set('Authorization', `Bearer ${token}`); }
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    if (handle426IfNeeded(result, api)) return result;
    if ((result.error as any)?.status === 401 && (result.error as any)?.data?.error === 'ACCOUNT_SWITCHED') {
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      resetAllApiCaches(api);
      return result;
    } else if ((result.error as any)?.status === 401 && (result.error as any)?.data?.error === 'Token expired') {
      api.dispatch({ type: 'auth/logout' });
      return result;
    } else {
      globalErrorHandler.handleDatabaseError(result.error);
    }
  } else {
    globalErrorHandler.markServerReachable();
  }

  return result;
};

export const battlePresetsApi = createApi({
  reducerPath: 'battlePresetsApi',
  baseQuery: battlePresetsBaseQuery,
  tagTypes: ['BattlePresets'],
  endpoints: (builder) => ({
    getBattlePresets: builder.query<BattlePresetsResponse, void>({
      query: () => '/api/battle-presets',
      providesTags: ['BattlePresets'],
    }),
    unlockPreset: builder.mutation<UnlockPresetResponse, { presetId: string }>({
      query: ({ presetId }) => ({
        url: `/api/battle-presets/${presetId}/unlock`,
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        } catch {
          // handled by mutation caller
        }
      },
      invalidatesTags: ['BattlePresets'],
    }),
    saveBattlePreset: builder.mutation<SavePresetResponse, { presetId: string; battalions: Record<string, PresetBattalionConfig> }>({
      query: ({ presetId, battalions }) => ({
        url: `/api/battle-presets/${presetId}`,
        method: 'PUT',
        body: { battalions },
      }),
      invalidatesTags: ['BattlePresets'],
    }),
  }),
});

export const {
  useGetBattlePresetsQuery,
  useUnlockPresetMutation,
  useSaveBattlePresetMutation,
} = battlePresetsApi;
