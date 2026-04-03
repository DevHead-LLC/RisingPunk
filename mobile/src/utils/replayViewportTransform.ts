import type { BattleState, BattleWireMovementState, LineProperties } from '../../../shared/battleReplay';

export function computeReplayLetterbox(
  recordedW: number,
  recordedH: number,
  viewportW: number,
  viewportH: number
): { scale: number; offsetX: number; offsetY: number } {
  if (!Number.isFinite(recordedW) || recordedW <= 0) {
    throw new Error('computeReplayLetterbox: recordedW must be a positive finite number');
  }
  if (!Number.isFinite(recordedH) || recordedH <= 0) {
    throw new Error('computeReplayLetterbox: recordedH must be a positive finite number');
  }
  if (!Number.isFinite(viewportW) || viewportW <= 0) {
    throw new Error('computeReplayLetterbox: viewportW must be a positive finite number');
  }
  if (!Number.isFinite(viewportH) || viewportH <= 0) {
    throw new Error('computeReplayLetterbox: viewportH must be a positive finite number');
  }
  const scale = Math.min(viewportW / recordedW, viewportH / recordedH);
  const offsetX = (viewportW - recordedW * scale) / 2;
  const offsetY = (viewportH - recordedH * scale) / 2;
  return { scale, offsetX, offsetY };
}

/**
 * Remaps movement geometry into the letterboxed viewport.
 * Bugbot: `startTime` / `estimatedDuration` stay on the **virtual** battle timeline (same clock as replay frame `t`);
 * {@link BattleBattalion} uses `replayVirtualNowMs` for moving progress — do not rewrite `startTime` with `Date.now()` here (would go stale on the next ms).
 */
function mapMovementState(
  ms: BattleWireMovementState,
  scale: number,
  ox: number,
  oy: number
): BattleWireMovementState {
  const mapNodePt = (p: { x: number; y: number; nodeIndex: number }) => ({
    ...p,
    x: p.x * scale + ox,
    y: p.y * scale + oy,
  });
  return {
    ...ms,
    startPosition: mapNodePt(ms.startPosition),
    targetPosition: mapNodePt(ms.targetPosition),
    attackRangePosition: ms.attackRangePosition
      ? {
          x: ms.attackRangePosition.x * scale + ox,
          y: ms.attackRangePosition.y * scale + oy,
        }
      : undefined,
    interruptionPosition: ms.interruptionPosition ? mapNodePt(ms.interruptionPosition) : undefined,
    originalInterruptionPosition: ms.originalInterruptionPosition
      ? mapNodePt(ms.originalInterruptionPosition)
      : undefined,
  };
}

/**
 * Map recorded-space {@link BattleState} into current viewport using uniform scale + letterbox.
 */
export function mapBattleStateToViewport(
  state: BattleState,
  recordedW: number,
  recordedH: number,
  viewportW: number,
  viewportH: number
): BattleState {
  const { scale, offsetX, offsetY } = computeReplayLetterbox(recordedW, recordedH, viewportW, viewportH);
  const m = (p: { x: number; y: number }) => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
  });

  const lineProperties: LineProperties[] = state.lineProperties.map((lp) => ({
    ...lp,
    length: lp.length * scale,
    left: lp.left * scale + offsetX,
    top: lp.top * scale + offsetY,
  }));

  return {
    ...state,
    battalions: state.battalions.map((b) => ({
      ...b,
      position: m(b.position),
      movementState: b.movementState
        ? mapMovementState(b.movementState, scale, offsetX, offsetY)
        : undefined,
    })),
    nodes: state.nodes.map((n) => ({
      ...n,
      position: m(n.position),
    })),
    networkConnections: [...state.networkConnections],
    lineProperties,
    movementStates: state.movementStates?.map((ms) =>
      mapMovementState(ms, scale, offsetX, offsetY)
    ),
  };
}
