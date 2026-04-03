import { useEffect, useMemo, useRef, useState } from 'react';
import { useGetBattleReplayQuery } from '../store/api/battleApi';
import { ANIMATION_CONFIG } from '../config';
import {
  REPLAY_SNAPSHOT_INTERVAL_MS,
  type BattleReplaySnapshotFrame,
  type BattleState,
} from '../../../shared/battleReplay';

const EMPTY_REPLAY_SNAPSHOTS: BattleReplaySnapshotFrame[] = [];

export type UseReplayPlaybackOptions = {
  /** When true, replay document still loads but the frame index does not advance (e.g. portrait guard hides playback). */
  suspendPlayback?: boolean;
};

/**
 * Loads replay document and advances one frame every {@link REPLAY_SNAPSHOT_INTERVAL_MS} (R4 v1).
 */
export function useReplayPlayback(
  battleId: string | null,
  options?: UseReplayPlaybackOptions
) {
  const suspendPlayback = options?.suspendPlayback === true;
  const { data, isLoading, error, isError } = useGetBattleReplayQuery(battleId ?? '', {
    skip: !battleId,
  });

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [battleId, data?.battleId]);

  const snapshots = useMemo(
    () => data?.snapshots ?? EMPTY_REPLAY_SNAPSHOTS,
    [data?.snapshots],
  );

  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;

  useEffect(() => {
    if (!data || snapshots.length === 0 || suspendPlayback) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const len = snapshotsRef.current.length;
        return len === 0 || i >= len - 1 ? i : i + 1;
      });
    }, REPLAY_SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(t);
  }, [data, snapshots.length, suspendPlayback]);

  const rawFrame = snapshots[index] as BattleReplaySnapshotFrame | undefined;

  const frameTRef = useRef(0);
  frameTRef.current = rawFrame?.t ?? 0;

  const wallAtFrameRef = useRef(Date.now());
  const [replayVirtualNowMs, setReplayVirtualNowMs] = useState(0);

  useEffect(() => {
    if (!battleId || !data || snapshots.length === 0 || suspendPlayback) {
      return;
    }
    wallAtFrameRef.current = Date.now();
    const tick = () => {
      setReplayVirtualNowMs(frameTRef.current + (Date.now() - wallAtFrameRef.current));
    };
    tick();
    const id = setInterval(tick, ANIMATION_CONFIG.FPS_60_INTERVAL_MS);
    return () => clearInterval(id);
  }, [battleId, data, snapshots.length, suspendPlayback, index]);

  const battleState = useMemo((): BattleState | null => {
    if (!rawFrame) return null;
    const { t: _t, ...rest } = rawFrame;
    return rest;
  }, [rawFrame]);

  return {
    replayDoc: data,
    frameIndex: index,
    battleState,
    /** Virtual battle ms (aligned with snapshot `t` + movementState.startTime from headless recording). */
    replayVirtualNowMs,
    isLoading,
    error,
    isError,
    totalFrames: snapshots.length,
    isAtEnd: snapshots.length > 0 && index >= snapshots.length - 1,
  };
}
