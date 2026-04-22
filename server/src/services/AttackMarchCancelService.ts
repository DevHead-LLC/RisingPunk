import { AttackMarch } from '../models/AttackMarch';
import type { AttackMarchArmySnapshot } from '../types/attackMarch';
import {
  clearMarchArrivalTimer,
  scheduleReturnMarchComplete,
} from './MarchArrivalSchedulerService';
import {
  defenderQueueKeyFromMarchDoc,
  reconcileDefenderQueue,
  runDefenderQueueSerialized,
} from './MarchDefenderQueueService';
import { ATTACK_MARCH_RETURN_LEG_MAX_MS } from '../config/env';
import { consumedRowsMatchArmySnapshot } from './AttackMarchLaunchService';

type BattalionAssignmentRow = {
  battalionId: string;
  botType: string;
  quantity: number;
  markLevel?: number;
};

export class AttackMarchCancelError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 404 | 409 | 500,
    message: string
  ) {
    super(message);
    this.name = 'AttackMarchCancelError';
  }
}

const MAX_CLIENT_TIME_SKEW_MS = 10 * 60 * 1000;

/**
 * Outbound-only cancel: march → `returning` from the current interpolated position toward home at the
 * same pace as the outbound leg: distance back = progress × D (same as distance already traveled), so
 * return duration = progress × full leg duration (matches probe cancel: `progress * durationSec`; not (1−progress)×T,
 * which is time to finish forward to the target). Inventory
 * is restored when the return leg completes (`processReturnMarchComplete` + `returningAfterCancel`).
 *
 * `outboundProgressT` must match the map (0 = at origin, 1 = at target). If the server used a smaller
 * progress than the client (e.g. recomputing from wall clocks that disagree), the return would start
 * near home but keep almost the full duration — short path, long time — and look much too slow.
 *
 * @param clientNowMs — Device time when cancelling; anchors `resolvedAt` / `returnArriveAt` on the client timeline.
 * @param outboundProgressT — Client-computed progress along the outbound leg, same formula as the map overlay.
 */
export async function cancelOutboundAttackMarch(
  attackerId: string,
  marchId: string,
  clientNowMs: number,
  outboundProgressT: number
): Promise<void> {
  if (!marchId || typeof marchId !== 'string' || marchId.trim() === '') {
    throw new AttackMarchCancelError(400, 'marchId is required');
  }
  if (typeof clientNowMs !== 'number' || !Number.isFinite(clientNowMs)) {
    throw new AttackMarchCancelError(400, 'clientNowMs must be a finite number');
  }
  if (typeof outboundProgressT !== 'number' || !Number.isFinite(outboundProgressT)) {
    throw new AttackMarchCancelError(400, 'outboundProgressT must be a finite number');
  }
  const serverNow = Date.now();
  if (Math.abs(clientNowMs - serverNow) > MAX_CLIENT_TIME_SKEW_MS) {
    throw new AttackMarchCancelError(400, 'clientNowMs is too far from server time; check device clock');
  }

  const march = await AttackMarch.findOne({ marchId: marchId.trim() }).lean();
  if (!march) {
    throw new AttackMarchCancelError(404, 'March not found');
  }
  if (String(march.attackerId) !== String(attackerId)) {
    throw new AttackMarchCancelError(403, 'Not your march');
  }
  if (march.state !== 'outbound') {
    throw new AttackMarchCancelError(400, 'Only outbound marches can be cancelled');
  }

  const armySnap = march.armySnapshot as AttackMarchArmySnapshot;
  if (!armySnap?.battalions || !Array.isArray(armySnap.battalions)) {
    throw new AttackMarchCancelError(500, 'March army snapshot is invalid');
  }

  const consumed = march.consumedBattalionAssignments as BattalionAssignmentRow[] | undefined;
  /** Swarm deploy uses session commitments (not digital barracks consumed rows). */
  const isSwarmMarch =
    march.attackType === 'swarm' ||
    (typeof march.swarmSessionId === 'string' && march.swarmSessionId.trim() !== '');

  if (isSwarmMarch) {
    if (!march.swarmSessionId || String(march.swarmSessionId).trim() === '') {
      throw new AttackMarchCancelError(500, 'Swarm march is missing swarmSessionId');
    }
    if (Array.isArray(consumed) && consumed.length > 0) {
      if (!consumedRowsMatchArmySnapshot(consumed, armySnap)) {
        throw new AttackMarchCancelError(500, 'March data integrity error (assignments vs army snapshot)');
      }
    }
  } else {
    if (!Array.isArray(consumed) || consumed.length === 0) {
      throw new AttackMarchCancelError(
        409,
        'March is missing consumed assignment data; cannot restore barracks safely'
      );
    }
    if (!consumedRowsMatchArmySnapshot(consumed, armySnap)) {
      throw new AttackMarchCancelError(500, 'March data integrity error (assignments vs army snapshot)');
    }
  }

  const mid = marchId.trim();
  const aid = String(attackerId);
  const departMs = new Date(march.departAt).getTime();
  const arriveMs = new Date(march.arriveAt).getTime();
  if (!Number.isFinite(departMs) || !Number.isFinite(arriveMs)) {
    throw new AttackMarchCancelError(500, 'March has invalid depart/arrive timestamps');
  }
  const outboundDurMs = Math.max(1, arriveMs - departMs);
  const t = Math.min(1, Math.max(0, outboundProgressT));
  /** Time to retrace to home at same speed = (distance back) / speed = (t×D)/(D/T) = t×T. */
  const returnLegMs = Math.min(
    ATTACK_MARCH_RETURN_LEG_MAX_MS,
    Math.max(0, Math.ceil(t * outboundDurMs))
  );
  // Fractional **tile indices** (same space as origin/target); client uses margin + (x+0.5)*cell — affine in x,y,
  // so this matches pixel lerp between tile centers (Bugbot: not wrong to pass into marchTileCenter).
  const returnLegStartX = march.originX + (march.targetX - march.originX) * t;
  const returnLegStartY = march.originY + (march.targetY - march.originY) * t;
  const resolvedAt = new Date(clientNowMs);
  const returnArriveAt = new Date(clientNowMs + returnLegMs);

  const upd = await AttackMarch.updateOne(
    { marchId: mid, attackerId: aid, state: 'outbound' },
    {
      $set: {
        state: 'returning',
        resolvedAt,
        returnArriveAt,
        returnLegStartX,
        returnLegStartY,
        returningAfterCancel: true,
      },
    }
  );
  if (upd.modifiedCount === 0) {
    throw new AttackMarchCancelError(409, 'March is no longer outbound (cancel failed)');
  }

  clearMarchArrivalTimer(mid);
  scheduleReturnMarchComplete(mid, returnArriveAt);
  try {
    const qk = defenderQueueKeyFromMarchDoc(
      march as { defenderQueueKey?: string; defenderId: string; defenderNpcInstanceId?: string }
    );
    void runDefenderQueueSerialized(qk, async () => {
      await reconcileDefenderQueue(qk);
      const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
      await tryStartNextMarchResolutionForQueueKey(qk);
    });
  } catch {
    // Legacy march missing queue key data — skip promotion of siblings
  }
}

