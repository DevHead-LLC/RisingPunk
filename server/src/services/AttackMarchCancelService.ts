import { AttackMarch } from '../models/AttackMarch';
import type { AttackMarchArmySnapshot } from '../types/attackMarch';
import { clearMarchArrivalTimer } from './MarchArrivalSchedulerService';
import {
  defenderQueueKeyFromMarchDoc,
  reconcileDefenderQueue,
  runDefenderQueueSerialized,
} from './MarchDefenderQueueService';
import { consumedRowsMatchArmySnapshot } from './AttackMarchLaunchService';
import { systemRefundAttackMarchInState } from './AttackMarchSystemRefundService';

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

/**
 * Outbound-only cancel: restore `Bot.bots`, merge `consumedBattalionAssignments` back, set march `cancelled`.
 */
export async function cancelOutboundAttackMarch(attackerId: string, marchId: string): Promise<void> {
  if (!marchId || typeof marchId !== 'string' || marchId.trim() === '') {
    throw new AttackMarchCancelError(400, 'marchId is required');
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

  const consumed = march.consumedBattalionAssignments as BattalionAssignmentRow[] | undefined;
  if (!Array.isArray(consumed) || consumed.length === 0) {
    throw new AttackMarchCancelError(
      409,
      'March is missing consumed assignment data; cannot restore barracks safely'
    );
  }

  const armySnap = march.armySnapshot as AttackMarchArmySnapshot;
  if (!armySnap?.battalions || !Array.isArray(armySnap.battalions)) {
    throw new AttackMarchCancelError(500, 'March army snapshot is invalid');
  }

  if (!consumedRowsMatchArmySnapshot(consumed, armySnap)) {
    throw new AttackMarchCancelError(500, 'March data integrity error (assignments vs army snapshot)');
  }

  const result = await systemRefundAttackMarchInState(marchId.trim(), String(attackerId), 'outbound');
  if (!result.refunded) {
    if (result.reason === 'state_mismatch') {
      throw new AttackMarchCancelError(409, 'March is no longer outbound (cancel failed)');
    }
    if (result.reason === 'integrity') {
      throw new AttackMarchCancelError(500, 'March data integrity error (assignments vs army snapshot)');
    }
    if (result.reason === 'bot_missing') {
      throw new AttackMarchCancelError(500, 'Bot document missing');
    }
    throw new AttackMarchCancelError(500, 'Failed to cancel march');
  }

  clearMarchArrivalTimer(marchId.trim());
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
