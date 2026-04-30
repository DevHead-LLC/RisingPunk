/**
 * System / shared refund path: restore `Bot.bots` + `battalionAssignments` from march snapshot,
 * set march `cancelled`. Used by NPC knockout sweep, stale resolving recovery, and the atomic
 * branch inside `systemRefundAttackMarchInState`. User outbound cancel uses a return leg first;
 * inventory is restored when that leg completes via `restoreCommittedMarchArmyToUserBots`.
 */

import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';
import { AttackMarch } from '../models/AttackMarch';
import type { AttackMarchArmySnapshot } from '../types/attackMarch';
import {
  sumRequiredByInventoryKeyFromArmySnapshot,
  consumedRowsMatchArmySnapshot,
} from './AttackMarchLaunchService';
import { refundAntBugHuntTokensForFailedMarch } from './BugHuntTokenService';

const Bot = require('../models/Bot');

export type RefundableMarchState = 'outbound' | 'arrived' | 'queued' | 'resolving';

type BattalionAssignmentRow = {
  battalionId: string;
  botType: string;
  quantity: number;
  markLevel?: number;
};

export function mergeConsumedAssignmentsInto(
  current: BattalionAssignmentRow[],
  consumed: BattalionAssignmentRow[]
): BattalionAssignmentRow[] {
  const merged: BattalionAssignmentRow[] = current.map((r) => ({
    battalionId: r.battalionId,
    botType: String(r.botType),
    quantity: r.quantity,
    markLevel: r.markLevel ?? 1,
  }));
  for (const c of consumed) {
    const ml = c.markLevel ?? 1;
    const idx = merged.findIndex(
      (r) =>
        r.battalionId === c.battalionId &&
        r.botType === c.botType &&
        (r.markLevel ?? 1) === ml
    );
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + c.quantity };
    } else {
      merged.push({
        battalionId: c.battalionId,
        botType: String(c.botType),
        quantity: c.quantity,
        markLevel: ml,
      });
    }
  }
  return merged.sort((a, b) => String(a.battalionId).localeCompare(String(b.battalionId)));
}

/**
 * Restore launch-time bot deductions + assignment rows (must run inside an open transaction).
 * Throws `BOT_VERSION_CONFLICT` for caller retry, `BOT_DOC_MISSING` if no Bot row.
 */
export async function restoreCommittedMarchArmyToUserBots(args: {
  attackerId: string;
  armySnap: AttackMarchArmySnapshot;
  consumed: BattalionAssignmentRow[];
  session: ClientSession;
}): Promise<void> {
  const { attackerId, armySnap, consumed, session } = args;
  const aid = String(attackerId);
  const sumByInv = sumRequiredByInventoryKeyFromArmySnapshot(armySnap);

  const bot = await Bot.findOne({ userId: aid }).session(session);
  if (!bot) {
    throw new Error('BOT_DOC_MISSING');
  }

  const merged = mergeConsumedAssignmentsInto((bot.battalionAssignments || []) as BattalionAssignmentRow[], consumed);

  const $inc: Record<string, number> = { __v: 1 };
  for (const [key, qty] of Object.entries(sumByInv)) {
    if (qty > 0) {
      $inc[`bots.${key}`] = qty;
    }
  }

  const updated = await Bot.findOneAndUpdate(
    {
      userId: aid,
      $or: [{ __v: bot.__v }, { __v: { $exists: false } }],
    },
    {
      $inc,
      battalionAssignments: merged,
    },
    { new: true, session }
  );

  if (!updated) {
    throw new Error('BOT_VERSION_CONFLICT');
  }
}

export type SystemRefundResult =
  | { refunded: true; previousState: RefundableMarchState }
  | { refunded: false; reason: 'not_found' | 'state_mismatch' | 'integrity' | 'bot_missing' | 'conflict' };

/**
 * Atomically refund inventory for a march in `outbound` | `arrived` | `queued` | `resolving` → `cancelled`.
 */
export async function systemRefundAttackMarchInState(
  marchId: string,
  attackerId: string,
  expectedState: RefundableMarchState,
  cancelReason: string = 'system-refund'
): Promise<SystemRefundResult> {
  const mid = marchId.trim();
  const aid = String(attackerId);

  const march = await AttackMarch.findOne({ marchId: mid, attackerId: aid }).lean();
  if (!march) {
    return { refunded: false, reason: 'not_found' };
  }
  if (march.state !== expectedState) {
    return { refunded: false, reason: 'state_mismatch' };
  }

  const isBugHuntMarch = march.attackType === 'bug_hunt' || String(march.defenderId ?? '') === 'bug';
  const consumed = march.consumedBattalionAssignments as BattalionAssignmentRow[] | undefined;
  if (!isBugHuntMarch && (!Array.isArray(consumed) || consumed.length === 0)) {
    return { refunded: false, reason: 'integrity' };
  }

  const armySnap = march.armySnapshot as AttackMarchArmySnapshot;
  if (!isBugHuntMarch && (!armySnap?.battalions || !Array.isArray(armySnap.battalions))) {
    return { refunded: false, reason: 'integrity' };
  }

  if (
    !isBugHuntMarch &&
    !consumedRowsMatchArmySnapshot(consumed as BattalionAssignmentRow[], armySnap)
  ) {
    return { refunded: false, reason: 'integrity' };
  }

  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await mongoose.startSession();
    try {
      let refundedState: RefundableMarchState | null = null;
      await session.withTransaction(async () => {
        const cancelled = await AttackMarch.findOneAndUpdate(
          { marchId: mid, attackerId: aid, state: expectedState },
          { $set: { state: 'cancelled', cancelReason, resolvedAt: new Date() } },
          { new: true, session }
        );
        if (!cancelled) {
          return;
        }
        refundedState = expectedState;

        if (isBugHuntMarch) {
          if (!(cancelled.bugHuntTokenRefundedAt instanceof Date)) {
            await refundAntBugHuntTokensForFailedMarch({ userId: aid, session });
            cancelled.bugHuntTokenRefundedAt = new Date();
            await cancelled.save({ session });
          }
        } else {
          await restoreCommittedMarchArmyToUserBots({
            attackerId: aid,
            armySnap,
            consumed: consumed as BattalionAssignmentRow[],
            session,
          });
        }
      });

      if (refundedState) {
        return { refunded: true, previousState: refundedState };
      }
      return { refunded: false, reason: 'state_mismatch' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'BOT_VERSION_CONFLICT') {
        continue;
      }
      if (msg === 'BOT_DOC_MISSING') {
        return { refunded: false, reason: 'bot_missing' };
      }
      console.error('systemRefundAttackMarchInState transaction error:', mid, e);
      return { refunded: false, reason: 'conflict' };
    } finally {
      session.endSession();
    }
  }

  return { refunded: false, reason: 'conflict' };
}
