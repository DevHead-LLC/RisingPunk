import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { AttackMarch } from '../models/AttackMarch';
import { UserResearchFeature } from '../models/UserResearchFeature';
import { getInventoryKey } from '../utils/botInventoryKeys';
import type { NormalizedBattleBattalion } from '../utils/normalizeUserBattalionsForBattleStart';
import type { AttackMarchArmySnapshot } from '../types/attackMarch';
import {
  distanceDuTileUnits,
  secondsPerDuFromArmySnapshot,
  totalTravelSeconds,
} from './MarchTimingService';
import {
  ANT_BUG_HUNT_TOKEN_COST,
  spendAntBugHuntTokensAtLaunch,
  BugHuntTokenSpendError,
} from './BugHuntTokenService';
import type { ResolvedMarchLaunchTarget } from './MarchTargetValidationService';
import { defenderQueueKeyForLaunchTarget } from './MarchDefenderQueueService';
import { recordNpcAttackProgressForGuidedTasks } from './GuidedTaskNpcAttackService';
import type { AttackMarchType } from '../types/attackMarch';
import { recordBugHuntLaunchConfirmed } from './BugHuntTelemetryService';

const Bot = require('../models/Bot');
const HUNTER_TRAVEL_SPEED_FEATURE_ID = 'hunter-travel-speed-05';

type BattalionAssignmentRow = {
  battalionId: string;
  botType: string;
  quantity: number;
  markLevel?: number;
};

export class AttackMarchLaunchError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 404 | 409 | 500,
    message: string
  ) {
    super(message);
    this.name = 'AttackMarchLaunchError';
  }
}

function sumRequiredByInventoryKey(normalized: NormalizedBattleBattalion[]): Record<string, number> {
  const sumByInv: Record<string, number> = {};
  for (const b of normalized) {
    const key = getInventoryKey(b.type, b.markLevel);
    sumByInv[key] = (sumByInv[key] || 0) + b.quantity;
  }
  return sumByInv;
}

function assignedSumByKey(assignments: BattalionAssignmentRow[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const a of assignments) {
    const ml = a.markLevel ?? 1;
    const k = getInventoryKey(String(a.botType), ml);
    acc[k] = (acc[k] || 0) + a.quantity;
  }
  return acc;
}

/**
 * Remove deployed quantities from `battalionAssignments` (deterministic: sort by battalionId).
 * Records each taken slice so outbound cancel can restore the same slot rows.
 */
function consumeAssignmentsForDeploy(
  assignments: BattalionAssignmentRow[],
  toTake: Record<string, number>
): { newAssignments: BattalionAssignmentRow[]; consumedRows: BattalionAssignmentRow[] } {
  const remaining: Record<string, number> = { ...toTake };
  const consumedRows: BattalionAssignmentRow[] = [];
  const sorted = [...assignments].sort((a, b) => String(a.battalionId).localeCompare(String(b.battalionId)));
  const out: BattalionAssignmentRow[] = [];
  for (const a of sorted) {
    const ml = a.markLevel ?? 1;
    const k = getInventoryKey(String(a.botType), ml);
    const need = remaining[k] ?? 0;
    if (need <= 0) {
      out.push(a);
      continue;
    }
    const take = Math.min(a.quantity, need);
    remaining[k] = need - take;
    if (take > 0) {
      consumedRows.push({
        battalionId: a.battalionId,
        botType: String(a.botType),
        quantity: take,
        markLevel: ml,
      });
    }
    const left = a.quantity - take;
    if (left > 0) {
      out.push({ ...a, markLevel: ml, quantity: left });
    }
  }
  for (const v of Object.values(remaining)) {
    if (v > 0) {
      throw new AttackMarchLaunchError(
        400,
        'Deployed army must match current battalion assignments (insufficient assigned bots for this launch payload)'
      );
    }
  }
  return { newAssignments: out, consumedRows };
}

/** Sum `Bot.bots` inventory keys from a persisted army snapshot (cancel / validation). */
export function sumRequiredByInventoryKeyFromArmySnapshot(armySnapshot: AttackMarchArmySnapshot): Record<string, number> {
  const sumByInv: Record<string, number> = {};
  for (const b of armySnapshot.battalions) {
    if (!b.quantity || b.quantity <= 0) {
      continue;
    }
    const ml = b.markLevel === 2 ? 2 : 1;
    const key = getInventoryKey(b.type, ml);
    sumByInv[key] = (sumByInv[key] || 0) + b.quantity;
  }
  return sumByInv;
}

export function consumedRowsMatchArmySnapshot(
  consumedRows: BattalionAssignmentRow[],
  armySnapshot: AttackMarchArmySnapshot
): boolean {
  const fromArmy = sumRequiredByInventoryKeyFromArmySnapshot(armySnapshot);
  const fromConsumed = assignedSumByKey(consumedRows);
  const keys = new Set([...Object.keys(fromArmy), ...Object.keys(fromConsumed)]);
  for (const k of keys) {
    if ((fromArmy[k] || 0) !== (fromConsumed[k] || 0)) {
      return false;
    }
  }
  return true;
}

export interface ExecuteAttackMarchLaunchParams {
  attackerId: string;
  normalizedBattalions: NormalizedBattleBattalion[];
  screenWidth: number;
  screenHeight: number;
  originX: number;
  originY: number;
  target: ResolvedMarchLaunchTarget;
  attackType?: AttackMarchType;
  bugHuntContract?: {
    bugInstanceId: string;
    hunterRosterId: string;
    hunterVisualKey: string;
  };
  hunterBattleContract?: {
    hunterRosterId: string;
    hunterVisualKey: string;
  };
}

export interface ExecuteAttackMarchLaunchResult {
  marchId: string;
  departAt: string;
  arriveAt: string;
  distanceDu: number;
  secondsPerDu: number;
  totalTravelSeconds: number;
}

export async function executeAttackMarchLaunch(
  params: ExecuteAttackMarchLaunchParams
): Promise<ExecuteAttackMarchLaunchResult> {
  const {
    attackerId,
    normalizedBattalions,
    screenWidth,
    screenHeight,
    originX,
    originY,
    target,
    attackType,
    bugHuntContract,
    hunterBattleContract,
  } = params;
  const isBugHuntLaunch = attackType === 'bug_hunt';

  if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
    throw new AttackMarchLaunchError(400, 'originX and originY must be finite numbers');
  }

  const armySnapshot: AttackMarchArmySnapshot = {
    screenWidth,
    screenHeight,
    battalions: normalizedBattalions.map((b) => ({
      type: b.type,
      quantity: b.quantity,
      markLevel: b.markLevel,
      ...(b.nodeIndex !== undefined ? { nodeIndex: b.nodeIndex } : {}),
    })),
  };

  const distanceDu = distanceDuTileUnits(originX, originY, target.hackMapCellX, target.hackMapCellY);
  const secondsPerDu = isBugHuntLaunch ? 2 : secondsPerDuFromArmySnapshot(armySnapshot);
  const baseTravelSec = isBugHuntLaunch ? Math.max(2, distanceDu * 2) : totalTravelSeconds(distanceDu, secondsPerDu);

  const sumByInv = sumRequiredByInventoryKey(normalizedBattalions);
  const marchId = `march-${randomUUID()}`;

  let defenderQueueKey: string;
  try {
    defenderQueueKey = defenderQueueKeyForLaunchTarget(target);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new AttackMarchLaunchError(400, msg);
  }

  const maxAttempts = 4;
  let lastVersionError = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await mongoose.startSession();
    try {
      let resultPayload: ExecuteAttackMarchLaunchResult | null = null;
      let bugHuntTelemetryPayload: {
        userId: string;
        marchId: string;
        bugInstanceId: string;
        tokensSpent: number;
        totalTravelSeconds: number;
      } | null = null;

      await session.withTransaction(async () => {
        const activeMarch = await AttackMarch.findOne({
          attackerId: String(attackerId),
          state: { $nin: ['done', 'cancelled'] },
        })
          .session(session)
          .lean();

        if (activeMarch) {
          const alreadyActiveMessage = isBugHuntLaunch
            ? 'You already have an active hunting expedition. Finish or cancel it before launching another.'
            : 'You already have an active hack expedition. Finish or cancel it before launching another.';
          throw new AttackMarchLaunchError(
            409,
            alreadyActiveMessage
          );
        }

        let consumedRows: BattalionAssignmentRow[] = [];
        let travelSec = baseTravelSec;
        if (isBugHuntLaunch) {
          const hasHunterTravelSpeedResearch = await UserResearchFeature.findOne({
            userId: String(attackerId),
            categoryId: 'hunting',
            featureId: HUNTER_TRAVEL_SPEED_FEATURE_ID,
            isUnlocked: true,
          })
            .select('_id')
            .session(session)
            .lean();
          if (hasHunterTravelSpeedResearch) {
            const reducedTravelSec = Math.ceil(baseTravelSec * 0.95);
            // Preserve the 2s floor while guaranteeing a tangible reduction
            // for short marches where ceil(5% off) can round back to base.
            travelSec =
              baseTravelSec > 2
                ? Math.max(2, Math.min(baseTravelSec - 1, reducedTravelSec))
                : 2;
          }
          try {
            await spendAntBugHuntTokensAtLaunch({
              userId: String(attackerId),
              session,
            });
            if (bugHuntContract) {
              bugHuntTelemetryPayload = {
                userId: String(attackerId),
                marchId,
                bugInstanceId: bugHuntContract.bugInstanceId,
                tokensSpent: ANT_BUG_HUNT_TOKEN_COST,
                totalTravelSeconds: travelSec,
              };
            }
          } catch (tokenError) {
            if (tokenError instanceof BugHuntTokenSpendError) {
              throw new AttackMarchLaunchError(tokenError.statusCode, tokenError.message);
            }
            throw tokenError;
          }
        } else {
          const bot = await Bot.findOne({ userId: attackerId }).session(session);
          if (!bot) {
            throw new AttackMarchLaunchError(400, 'No bot inventory found for user');
          }

          const botsMap = bot.bots as Record<string, number>;
          for (const key of Object.keys(sumByInv)) {
            const need = sumByInv[key] || 0;
            const owned = botsMap[key] ?? 0;
            if (need > owned) {
              throw new AttackMarchLaunchError(400, 'Insufficient Bots Available');
            }
          }

          const rawAssignments = (bot.battalionAssignments || []) as BattalionAssignmentRow[];
          const assignedTotals = assignedSumByKey(rawAssignments);
          for (const key of Object.keys(sumByInv)) {
            const need = sumByInv[key] || 0;
            const assigned = assignedTotals[key] ?? 0;
            if (need > assigned) {
              throw new AttackMarchLaunchError(
                400,
                'Deployed troops must be assigned in Digital Barracks (assign bots to battalion slots before deploy)'
              );
            }
          }

          const consumeResult = consumeAssignmentsForDeploy(rawAssignments, sumByInv);
          consumedRows = consumeResult.consumedRows;

          const $inc: Record<string, number> = { __v: 1 };
          for (const key of Object.keys(sumByInv)) {
            const need = sumByInv[key] || 0;
            if (need > 0) {
              $inc[`bots.${key}`] = -need;
            }
          }

          const updated = await Bot.findOneAndUpdate(
            {
              userId: attackerId,
              $or: [{ __v: bot.__v }, { __v: { $exists: false } }],
            },
            {
              $inc,
              battalionAssignments: consumeResult.newAssignments,
            },
            { new: true, session }
          );

          if (!updated) {
            lastVersionError = true;
            throw new Error('BOT_VERSION_CONFLICT');
          }
        }

        const departAt = new Date();
        const arriveAt = new Date(departAt.getTime() + Math.ceil(travelSec * 1000));

        await AttackMarch.create(
          [
            {
              marchId,
              attackerId: String(attackerId),
              defenderId: target.attackMarchDefenderId,
              ...(target.defenderNpcSlug ? { defenderNpcSlug: target.defenderNpcSlug } : {}),
              ...(target.defenderNpcInstanceId ? { defenderNpcInstanceId: target.defenderNpcInstanceId } : {}),
              originX,
              originY,
              targetX: target.hackMapCellX,
              targetY: target.hackMapCellY,
              distanceDu,
              secondsPerDu,
              totalTravelSeconds: travelSec,
              armySnapshot,
              consumedBattalionAssignments: consumedRows,
              defenderQueueKey,
              ...(isBugHuntLaunch ? { attackType: 'bug_hunt' as const } : {}),
              ...(bugHuntContract != null
                ? {
                    bugInstanceId: bugHuntContract.bugInstanceId,
                    hunterRosterId: bugHuntContract.hunterRosterId,
                    hunterVisualKey: bugHuntContract.hunterVisualKey,
                  }
                : hunterBattleContract != null
                  ? {
                      hunterRosterId: hunterBattleContract.hunterRosterId,
                      hunterVisualKey: hunterBattleContract.hunterVisualKey,
                    }
                : {}),
              state: 'outbound',
              departAt,
              arriveAt,
              hackMapCellX: target.hackMapCellX,
              hackMapCellY: target.hackMapCellY,
              createdAt: new Date(),
            },
          ],
          { session }
        );

        resultPayload = {
          marchId,
          departAt: departAt.toISOString(),
          arriveAt: arriveAt.toISOString(),
          distanceDu,
          secondsPerDu,
          totalTravelSeconds: travelSec,
        };
      });

      if (resultPayload) {
        const launchedPayload: ExecuteAttackMarchLaunchResult = resultPayload;
        // Match battle.ts: must not fail the launch response after the transaction committed.
        if (!isBugHuntLaunch) {
          try {
            await recordNpcAttackProgressForGuidedTasks(String(attackerId), target.defenderNpcSlug);
          } catch (taskTrackingError) {
            console.error('[AttackMarchLaunchService] guided task NPC attack tracking failed:', taskTrackingError);
          }
        } else if (bugHuntTelemetryPayload) {
          void recordBugHuntLaunchConfirmed(bugHuntTelemetryPayload);
        }
        return launchedPayload;
      }
    } catch (e: unknown) {
      if (e instanceof AttackMarchLaunchError) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'BOT_VERSION_CONFLICT') {
        lastVersionError = true;
        continue;
      }
      console.error('executeAttackMarchLaunch transaction error:', e);
      throw new AttackMarchLaunchError(500, 'Failed to create attack march');
    } finally {
      session.endSession();
    }
  }

  if (lastVersionError) {
    throw new AttackMarchLaunchError(500, 'Launch failed due to inventory update conflict; try again');
  }
  throw new AttackMarchLaunchError(500, 'Failed to create attack march');
}
