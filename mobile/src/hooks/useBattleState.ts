import { useGetBattleStateQuery } from '../store/api/battleApi';
import { Dimensions } from 'react-native';
import type { BattleState } from '../../../shared/battleReplay';

interface UseBattleStateOptions {
  battleId: string;
  pollingInterval?: number;
  skip?: boolean;
  /**
   * When set (including `null` while loading), skips GET /state and uses this snapshot (replay playback).
   * Omit entirely for live polling.
   */
  overrideState?: BattleState | null;
}

export const useBattleState = ({
  battleId,
  pollingInterval = 1000,
  skip = false,
  overrideState,
}: UseBattleStateOptions) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const useNetwork = overrideState === undefined;
  const query = useGetBattleStateQuery(
    { battleId, screenWidth, screenHeight },
    {
      pollingInterval,
      skip: !battleId || skip || !useNetwork,
    }
  );

  if (overrideState !== undefined) {
    return {
      ...query,
      data: overrideState ?? undefined,
      isLoading: overrideState === null,
      isFetching: false,
      isSuccess: overrideState != null,
      isError: false,
      error: undefined,
    };
  }

  return query;
};
