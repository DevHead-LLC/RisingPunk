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

/** Wall wait between frames when snapshot `t` does not advance (defensive). */
const REPLAY_FRAME_FALLBACK_MS = REPLAY_SNAPSHOT_INTERVAL_MS;
const REPLAY_FRAME_STEP_MIN_MS = 16;
const REPLAY_FRAME_STEP_MAX_MS = 120_000;

/**
 * Loads replay document and advances frames by snapshot **`t`** deltas (countdown ≈ **1s** / step; ACTIVE often **~250ms**).
 * Fixed **250ms** per step was wrong for countdown (Bugbot: 3‑2‑1 flashed in **~750ms** wall time).
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
    if (!data || suspendPlayback) return;
    const list = snapshotsRef.current;
    if (list.length === 0 || index >= list.length - 1) return;

    const cur = list[index] as BattleReplaySnapshotFrame | undefined;
    const nxt = list[index + 1] as BattleReplaySnapshotFrame | undefined;
    if (!cur || !nxt) return;

    const rawDt = nxt.t - cur.t;
    const delayMs =
      Number.isFinite(rawDt) && rawDt > 0
        ? Math.min(Math.max(rawDt, REPLAY_FRAME_STEP_MIN_MS), REPLAY_FRAME_STEP_MAX_MS)
        : REPLAY_FRAME_FALLBACK_MS;

    const id = setTimeout(() => {
      setIndex((i) => {
        const len = snapshotsRef.current.length;
        if (len === 0 || i >= len - 1) return i;
        return i + 1;
      });
    }, delayMs);
    return () => clearTimeout(id);
  }, [battleId, data, index, suspendPlayback, snapshots.length]);

  const rawFrame = snapshots[index] as BattleReplaySnapshotFrame | undefined;

  /** Wall clock at the moment we anchor to this snapshot (Bugbot: avoid initial replayVirtualNowMs=0 before first effect — battalion elapsed used 0 − startTime → flash). */
  const wallAtFrameRef = useRef(Date.now());
  const replayWallSigRef = useRef('');
  const playbackActive = Boolean(
    battleId && data && snapshots.length > 0 && !suspendPlayback
  );
  const wallSig = `${battleId ?? ''}:${index}:${suspendPlayback}`;
  if (playbackActive && rawFrame && wallSig !== replayWallSigRef.current) {
    replayWallSigRef.current = wallSig;
    wallAtFrameRef.current = Date.now();
  }

  const [, setReplayPump] = useState(0);
  useEffect(() => {
    if (!playbackActive) return;
    const id = setInterval(() => {
      setReplayPump((n) => n + 1);
    }, ANIMATION_CONFIG.FPS_60_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playbackActive]);

  // Bugbot: do not memoize virtual now — any parent re-render without a replayPump tick would reuse a stale
  // cached ms and freeze/jump interpolation until the next pump; Date.now() must reflect wall time every render.
  // Bugbot: inactive → undefined (not 0) so BattleBattalion `!== undefined` does not treat 0 as replay clock.
  const replayVirtualNowMs: number | undefined =
    playbackActive && rawFrame
      ? rawFrame.t + (Date.now() - wallAtFrameRef.current)
      : undefined;

  // Bugbot: `battleState` must not track `rawFrame` reference — RTK refetch replaces `snapshots` with a new array
  // and new per-frame object identities even when payload is unchanged, which would recompute viewport state every
  // refetch and every pump-driven render. Only re-stringify when slot (battle + snapshots ref + index) changes.
  const battleStateStableRef = useRef<{
    battleId: string | null;
    snapshots: BattleReplaySnapshotFrame[] | typeof EMPTY_REPLAY_SNAPSHOTS;
    index: number;
    serialized: string;
    state: BattleState | null;
  }>({
    battleId: null,
    snapshots: EMPTY_REPLAY_SNAPSHOTS,
    index: -1,
    serialized: '',
    state: null,
  });

  let battleState: BattleState | null = null;
  if (!rawFrame) {
    battleState = null;
    battleStateStableRef.current = {
      battleId,
      snapshots,
      index,
      serialized: '',
      state: null,
    };
  } else {
    const c = battleStateStableRef.current;
    const sameSlot =
      (battleId ?? null) === (c.battleId ?? null) &&
      c.snapshots === snapshots &&
      c.index === index;
    if (sameSlot) {
      battleState = c.state;
    } else {
      const { t: _t, ...rest } = rawFrame;
      const serialized = JSON.stringify(rest);
      const reuseByContent =
        (battleId ?? null) === (c.battleId ?? null) &&
        c.state != null &&
        c.index === index &&
        serialized === c.serialized;
      battleState = reuseByContent ? c.state : (rest as BattleState);
      battleStateStableRef.current = {
        battleId,
        snapshots,
        index,
        serialized,
        state: battleState,
      };
    }
  }

  return {
    replayDoc: data,
    frameIndex: index,
    battleState,
    /** Virtual battle ms while playing; `undefined` when replay is not active (no sentinel `0`). */
    replayVirtualNowMs,
    isLoading,
    error,
    isError,
    totalFrames: snapshots.length,
    isAtEnd: snapshots.length > 0 && index >= snapshots.length - 1,
  };
}
