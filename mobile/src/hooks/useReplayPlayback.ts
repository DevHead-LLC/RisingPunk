import { useEffect, useMemo, useState } from 'react';
import { useGetBattleReplayQuery } from '../store/api/battleApi';
import {
  REPLAY_SNAPSHOT_INTERVAL_MS,
  type BattleReplaySnapshotFrame,
  type BattleState,
} from '../../../shared/battleReplay';

/**
 * Loads replay document and advances one frame every {@link REPLAY_SNAPSHOT_INTERVAL_MS} (R4 v1).
 */
export function useReplayPlayback(battleId: string | null) {
  const { data, isLoading, error, isError } = useGetBattleReplayQuery(battleId ?? '', {
    skip: !battleId,
  });

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [battleId, data?.battleId]);

  const snapshots = data?.snapshots ?? [];

  useEffect(() => {
    if (!data || snapshots.length === 0) return;
    const t = setInterval(() => {
      setIndex((i) => (i >= snapshots.length - 1 ? i : i + 1));
    }, REPLAY_SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(t);
  }, [data, snapshots.length]);

  const rawFrame = snapshots[index] as BattleReplaySnapshotFrame | undefined;

  const battleState = useMemo((): BattleState | null => {
    if (!rawFrame) return null;
    const { t: _t, ...rest } = rawFrame;
    return rest;
  }, [rawFrame]);

  return {
    replayDoc: data,
    frameIndex: index,
    battleState,
    isLoading,
    error,
    isError,
    totalFrames: snapshots.length,
    isAtEnd: snapshots.length > 0 && index >= snapshots.length - 1,
  };
}
