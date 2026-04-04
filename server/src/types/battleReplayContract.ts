/**
 * R1 replay capture contract — re-export shared types so server R2+ recorders import one place.
 * Implementation must produce {@link BattleReplaySnapshotFrame} matching GET /state `data` + `t`.
 */
export type {
  BattleReplayDocument,
  BattleReplaySnapshotFrame,
  BattleReplayWinner,
  BattleState,
} from '../../../shared/battleReplay';

export {
  BATTLE_REPLAY_SCHEMA_VERSION,
  REPLAY_HEADLESS_CANONICAL_HEIGHT,
  REPLAY_HEADLESS_CANONICAL_WIDTH,
  REPLAY_RAW_SIZE_PRUNE_THRESHOLD_BYTES,
  REPLAY_SNAPSHOT_INTERVAL_MS,
  shouldPruneReplayNetworkDecorations,
  stripReplayFrameNetworkDecorations,
} from '../../../shared/battleReplay';
