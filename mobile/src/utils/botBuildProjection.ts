import type { BuildQueue } from '../store/slices/botsSlice';

type BuildQueueProjection = {
  markLevel: 1 | 2;
  type: BuildQueue['type'];
  queueQuantity: number;
  serverBuilt: number;
  projectedBuilt: number;
  projectedDelta: number;
};

/**
 * Shared source of truth for projected build progress shown in bot assembly UI.
 * Keeps wall-clock projection aligned with server-authoritative botsBuilt.
 */
export function projectBuildQueueProgress(
  buildQueue: BuildQueue | null | undefined,
  timeRemainingMs: number
): BuildQueueProjection | null {
  if (!buildQueue?.type) {
    return null;
  }

  const queueQuantity = Math.max(0, Math.floor(Number(buildQueue.quantity ?? 0)));
  const serverBuilt = Math.max(0, Math.floor(Number(buildQueue.botsBuilt ?? 0)));
  const markLevel: 1 | 2 = Number(buildQueue.markLevel ?? 1) >= 2 ? 2 : 1;

  if (queueQuantity <= 0) {
    return {
      markLevel,
      type: buildQueue.type,
      queueQuantity,
      serverBuilt,
      projectedBuilt: 0,
      projectedDelta: 0,
    };
  }

  const msPerUnit = markLevel >= 2 ? 4000 : 1000;
  const expectedBuiltFromClock = Math.max(0, queueQuantity - Math.ceil(timeRemainingMs / msPerUnit));
  const projectedBuilt = Math.max(0, Math.min(queueQuantity, Math.max(serverBuilt, expectedBuiltFromClock)));
  const projectedDelta = Math.max(0, projectedBuilt - serverBuilt);

  return {
    markLevel,
    type: buildQueue.type,
    queueQuantity,
    serverBuilt,
    projectedBuilt,
    projectedDelta,
  };
}
