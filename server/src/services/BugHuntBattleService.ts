import mongoose from 'mongoose';
import { AttackMarch } from '../models/AttackMarch';
import { BugInstance } from '../models/BugInstance';
import { User } from '../models/User';
import { UserHunter } from '../models/UserHunter';
import { PrivateMessage } from '../models/PrivateMessage';
import { BATTLE_REPORT_SENDER_ID, BATTLE_REPORT_SENDER_USERNAME } from '../constants/systemSenders';
import { applyRetentionAfterInsert } from './PrivateMessageRetentionService';
import { publishBugHpUpdate } from './BugHuntPushService';
import { computeNextUtcGridInstant } from './BugHuntWorldService';
import { HunterProgressionService } from './HunterProgressionService';
import { BotStatsService } from './BotStatsService';
import { HUNTER_ROSTER_KAITO_GLITCH } from '../types/bugHunt';
import { ATTACK_MARCH_RETURN_LEG_MAX_MS } from '../config/env';
import { scheduleReturnMarchComplete } from './MarchArrivalSchedulerService';
import { serializeBattleReportMessage } from './BattleNotificationService';
import { reconcileDefenderQueue, runDefenderQueueSerialized } from './MarchDefenderQueueService';
import { grantAntBugDefeatRewards } from './BugHuntRewardService';
import { recordBugHuntBattleResolved, recordBugHuntRewardGranted } from './BugHuntTelemetryService';
import { createBugHuntReplayForResolvedEncounter } from './BugHuntReplayService';
import { formatHackLocationDisplay } from '../utils/battleHackLocation';

type BugHuntEndReason = 'bug-death' | 'hunter-death' | 'timeout' | 'canceled';

const BUG_HUNT_BATTLE_DURATION_SECONDS = 45;
const ANT_BASE_STATS = {
  maxHp: 3_256_000,
  offense: 2_720,
  defense: 0.12,
};
const TYPE_ADVANTAGE_MULTIPLIER_HUNTER_TO_ANT = 1.25;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toHpPercent(currentHp: number, maxHp: number): number {
  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    throw new Error('maxHp must be a positive finite number');
  }
  return Math.round(clamp((currentHp / maxHp) * 100, 0, 100) * 100) / 100;
}

function computeReseedGateCutoffUtc(departAt: Date): Date {
  return computeNextUtcGridInstant(new Date(departAt));
}

function buildZeroBotCounts() {
  return {
    guardian: 0,
    breacher: 0,
    phreak: 0,
    guardianM2: 0,
    breacherM2: 0,
    phreakM2: 0,
  };
}

async function sendBugHuntBattleReport(params: {
  attackerId: string;
  attackerHandle: string;
  bugInstanceId: string;
  bugRemainingHpPercent: number;
  hunterSurvived: boolean;
  endReason: BugHuntEndReason;
  hunterRosterId: string;
  mapX: number;
  mapY: number;
  battleId?: string;
  itemDrops?: string[];
  hunterXpGranted?: number;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    br: 1,
    bugHunt: 1,
    attackerId: params.attackerId,
    defenderId: 'bug',
    attackerHandle: params.attackerHandle,
    defenderHandle: 'Ant Bug',
    attackerStart: buildZeroBotCounts(),
    defenderStart: buildZeroBotCounts(),
    attackerLost: buildZeroBotCounts(),
    defenderLost: buildZeroBotCounts(),
    winner: params.endReason === 'bug-death' ? 'user' : 'enemy',
    bugInstanceId: params.bugInstanceId,
    bugRemainingHpPercent: params.bugRemainingHpPercent,
    hunterSurvived: params.hunterSurvived ? 1 : 0,
    bugHuntEndReason: params.endReason,
    hunterRosterId: params.hunterRosterId,
    mapName: 'main',
    x: Math.floor(params.mapX),
    y: Math.floor(params.mapY),
    ...(params.battleId ? { battleId: params.battleId } : {}),
  };
  try {
    payload.hl = formatHackLocationDisplay(Math.floor(params.mapX), Math.floor(params.mapY));
  } catch {
    // Keep report delivery resilient if location formatting ever fails.
  }
  if ((params.itemDrops ?? []).length > 0) {
    payload.bugHuntItemDrops = params.itemDrops;
  }
  if (Number.isFinite(params.hunterXpGranted) && (params.hunterXpGranted ?? 0) > 0) {
    payload.bugHuntHunterXpGranted = Math.floor(params.hunterXpGranted ?? 0);
  }

  const messageBody = serializeBattleReportMessage(
    payload,
    `bughunt:${params.bugInstanceId}:${params.endReason}`
  );

  await PrivateMessage.insertMany([
    {
      senderId: BATTLE_REPORT_SENDER_ID,
      recipientId: params.attackerId,
      senderUsername: BATTLE_REPORT_SENDER_USERNAME,
      message: messageBody,
      readAt: null,
      isFromAdmin: false,
    },
  ]);
  await applyRetentionAfterInsert({
    senderId: BATTLE_REPORT_SENDER_ID,
    recipientId: params.attackerId,
  });
}

export async function resolveBugHuntMarch(marchId: string): Promise<void> {
  if (!BotStatsService.isConfigLoaded()) {
    await BotStatsService.loadConfigs();
  }
  const march = await AttackMarch.findOne({ marchId, state: 'resolving', attackType: 'bug_hunt' })
    .select(
      'marchId attackerId bugInstanceId hunterRosterId totalTravelSeconds departAt hackMapCellX hackMapCellY'
    )
    .lean();
  if (!march) {
    return;
  }

  const bugInstanceId = String(march.bugInstanceId ?? '').trim();
  if (!bugInstanceId) {
    throw new Error(`Bug-hunt march ${marchId} missing bugInstanceId`);
  }

  const attackerId = String(march.attackerId);
  const rosterId = String(march.hunterRosterId ?? '').trim();
  if (rosterId !== HUNTER_ROSTER_KAITO_GLITCH) {
    throw new Error(`Bug-hunt march ${marchId} has unsupported hunterRosterId '${rosterId}'`);
  }

  const now = new Date();
  const reseedCutoff = computeReseedGateCutoffUtc(new Date(march.departAt));
  const failedReseedGate = now.getTime() >= reseedCutoff.getTime();

  const hunter = await UserHunter.findOne({
    userId: attackerId,
    hunterRosterId: HUNTER_ROSTER_KAITO_GLITCH,
  })
    .select('level')
    .lean();
  if (!hunter || !Number.isInteger(hunter.level)) {
    throw new Error(`Bug-hunt march ${marchId} could not load owned hunter progression`);
  }

  const user = await User.findById(attackerId).select('handle').lean();
  const attackerHandle = (user as { handle?: string } | null)?.handle?.trim() || 'Unknown';

  const travelMs = Math.min(
    ATTACK_MARCH_RETURN_LEG_MAX_MS,
    Math.max(0, Math.ceil(Number(march.totalTravelSeconds) * 1000))
  );
  const returnArriveAt = new Date(Date.now() + travelMs);
  const syntheticBattleId = `bughunt-${marchId}-${Date.now()}`;

  const session = await mongoose.startSession();
  let resultForAfterCommit: {
    bugInstanceId: string;
    hpPercent: number;
    seq: number;
    endReason: BugHuntEndReason;
    hunterSurvived: boolean;
    shouldPublishHp: boolean;
    itemDrops: string[];
    hunterXpGranted: number;
    battleDurationSeconds: number;
    replaySeed: null | {
      initialBugHp: number;
      finalBugHp: number;
      bugMaxHp: number;
      hunterMaxHp: number;
      finalHunterHp: number;
      hunterDps: number;
      bugDps: number;
      hunterStats: { offense: number; defense: number; speed: number; range: number };
      bugStats: { offense: number; defense: number; speed: number; range: number };
    };
  } | null = null;
  try {
    await session.withTransaction(async () => {
      const resolvingMarch = await AttackMarch.findOne({
        marchId,
        state: 'resolving',
        attackType: 'bug_hunt',
      }).session(session);
      if (!resolvingMarch) {
        return;
      }

      const bug = await BugInstance.findOne({ bugInstanceId }).session(session);
      let endReason: BugHuntEndReason = 'timeout';
      let hunterSurvived = true;
      let shouldPublishHp = false;
      let finalHpPercent = 0;
      let finalSeq = 0;
      let itemDrops: string[] = [];
      let hunterXpGranted = 0;
      let battleDurationSeconds = 0;
      let replaySeed: null | {
        initialBugHp: number;
        finalBugHp: number;
        bugMaxHp: number;
        hunterMaxHp: number;
        finalHunterHp: number;
        hunterDps: number;
        bugDps: number;
        hunterStats: { offense: number; defense: number; speed: number; range: number };
        bugStats: { offense: number; defense: number; speed: number; range: number };
      } = null;

      if (failedReseedGate || !bug || bug.lifecycleState === 'removed') {
        endReason = 'canceled';
        hunterSurvived = true;
        finalHpPercent = bug ? bug.hpPercent : 0;
        finalSeq = bug ? bug.seq : 0;
      } else if (bug.currentHp <= 0 || bug.lifecycleState === 'defeated') {
        endReason = 'canceled';
        hunterSurvived = true;
        finalHpPercent = bug.hpPercent;
        finalSeq = bug.seq;
      } else {
        const hunterStats = HunterProgressionService.computeEffectiveHunterStats(
          HUNTER_ROSTER_KAITO_GLITCH,
          hunter.level
        );
        const hunterHp = Math.max(1, hunterStats.health);
        const hunterDps = Math.max(
          1,
          hunterStats.offense * TYPE_ADVANTAGE_MULTIPLIER_HUNTER_TO_ANT * (1 - ANT_BASE_STATS.defense)
        );
        const bugDps = Math.max(1, ANT_BASE_STATS.offense * (1 - clamp(hunterStats.defense, 0, 0.95)));
        const bugHpBefore = bug.currentHp;
        const timeToKillBug = bug.currentHp / hunterDps;
        const timeToKillHunter = hunterHp / bugDps;
        const elapsedSeconds = Math.min(
          BUG_HUNT_BATTLE_DURATION_SECONDS,
          timeToKillBug,
          timeToKillHunter
        );
        battleDurationSeconds = Math.round(elapsedSeconds * 100) / 100;

        const bugHpAfter = Math.max(0, bug.currentHp - hunterDps * elapsedSeconds);
        const hunterHpAfter = Math.max(0, hunterHp - bugDps * elapsedSeconds);
        const finalHunterHpRounded = Math.max(0, Math.round(hunterHpAfter));
        hunterSurvived = finalHunterHpRounded > 0;

        if (timeToKillBug <= BUG_HUNT_BATTLE_DURATION_SECONDS && timeToKillBug <= timeToKillHunter) {
          endReason = 'bug-death';
        } else if (
          timeToKillHunter <= BUG_HUNT_BATTLE_DURATION_SECONDS &&
          timeToKillHunter < timeToKillBug
        ) {
          endReason = 'hunter-death';
        } else {
          endReason = 'timeout';
        }
        if (!hunterSurvived && endReason === 'timeout') {
          // Keep report/replay outcomes consistent with visible zero-health result.
          endReason = 'hunter-death';
        }

        bug.currentHp = Math.round(bugHpAfter);
        bug.hpPercent = toHpPercent(bug.currentHp, bug.maxHp || ANT_BASE_STATS.maxHp);
        bug.seq = bug.seq + 1;
        if (bug.currentHp <= 0) {
          bug.lifecycleState = 'defeated';
          if (!bug.defeatedAt) {
            bug.defeatedAt = new Date();
          }
        } else {
          bug.lifecycleState = 'alive';
        }
        await bug.save({ session });
        shouldPublishHp = true;
        finalHpPercent = bug.hpPercent;
        finalSeq = bug.seq;
        replaySeed = {
          initialBugHp: bugHpBefore,
          finalBugHp: bug.currentHp,
          bugMaxHp: bug.maxHp || ANT_BASE_STATS.maxHp,
          hunterMaxHp: hunterHp,
          finalHunterHp: finalHunterHpRounded,
          hunterDps,
          bugDps,
          hunterStats: {
            offense: hunterStats.offense,
            defense: hunterStats.defense,
            speed: hunterStats.speed,
            range: hunterStats.range,
          },
          bugStats: {
            offense: ANT_BASE_STATS.offense,
            defense: ANT_BASE_STATS.defense,
            speed: 10,
            range: 5,
          },
        };
        if (endReason === 'bug-death') {
          const rewardResult = await grantAntBugDefeatRewards({
            userId: attackerId,
            hunterRosterIds: [rosterId],
            session,
          });
          itemDrops = rewardResult.itemKeysGranted;
          hunterXpGranted = rewardResult.hunterXpTotalGranted;
        }
      }

      const transition = await AttackMarch.updateOne(
        { _id: resolvingMarch._id, state: 'resolving' },
        {
          $set: {
            state: 'returning',
            battleId: syntheticBattleId,
            resolvedAt: new Date(),
            returnArriveAt,
            bugHuntEndReason: endReason,
            bugHuntRemainingHpPercent: finalHpPercent,
            bugHuntBattleDurationSeconds: battleDurationSeconds,
            bugHuntItemDrops: itemDrops,
            bugHuntHunterXpGranted: hunterXpGranted,
          },
          $unset: { resolvingSince: '' },
        },
        { session }
      );
      if (transition.modifiedCount === 0) {
        throw new Error(`Bug-hunt march ${marchId} failed to transition from resolving to returning`);
      }

      resultForAfterCommit = {
        bugInstanceId,
        hpPercent: finalHpPercent,
        seq: finalSeq,
        endReason,
        hunterSurvived,
        shouldPublishHp,
        itemDrops,
        hunterXpGranted,
        battleDurationSeconds,
        replaySeed,
      };
    });
  } catch (err) {
    console.error('[BugHuntBattle] resolve transaction failed:', marchId, err);
    throw err;
  } finally {
    session.endSession();
  }

  if (!resultForAfterCommit) {
    return;
  }
  const committedResult = resultForAfterCommit as {
    bugInstanceId: string;
    hpPercent: number;
    seq: number;
    endReason: BugHuntEndReason;
    hunterSurvived: boolean;
    shouldPublishHp: boolean;
    itemDrops: string[];
    hunterXpGranted: number;
    battleDurationSeconds: number;
    replaySeed: null | {
      initialBugHp: number;
      finalBugHp: number;
      bugMaxHp: number;
      hunterMaxHp: number;
      finalHunterHp: number;
      hunterDps: number;
      bugDps: number;
      hunterStats: { offense: number; defense: number; speed: number; range: number };
      bugStats: { offense: number; defense: number; speed: number; range: number };
    };
  };
  let replayCreated = false;
  if (committedResult.replaySeed && committedResult.endReason !== 'canceled') {
    try {
      replayCreated = await createBugHuntReplayForResolvedEncounter({
        battleId: syntheticBattleId,
        attackerId,
        bugInstanceId,
        endReason: committedResult.endReason,
        battleDurationSeconds: committedResult.battleDurationSeconds,
        initialBugHp: committedResult.replaySeed.initialBugHp,
        finalBugHp: committedResult.replaySeed.finalBugHp,
        bugMaxHp: committedResult.replaySeed.bugMaxHp,
        hunterMaxHp: committedResult.replaySeed.hunterMaxHp,
        finalHunterHp: committedResult.replaySeed.finalHunterHp,
        hunterDps: committedResult.replaySeed.hunterDps,
        bugDps: committedResult.replaySeed.bugDps,
        hunterStats: committedResult.replaySeed.hunterStats,
        bugStats: committedResult.replaySeed.bugStats,
      });
    } catch (replayError) {
      console.error('[BugHuntBattle] failed to persist replay:', marchId, replayError);
    }
  }

  if (committedResult.shouldPublishHp) {
    publishBugHpUpdate({
      bugInstanceId: committedResult.bugInstanceId,
      hpPercent: committedResult.hpPercent,
      seq: committedResult.seq,
    });
  }
  void recordBugHuntBattleResolved({
    userId: attackerId,
    marchId,
    bugInstanceId,
    endReason: committedResult.endReason,
    hunterSurvived: committedResult.hunterSurvived,
    bugRemainingHpPercent: committedResult.hpPercent,
    battleDurationSeconds: committedResult.battleDurationSeconds,
  });
  if (committedResult.endReason === 'bug-death') {
    void recordBugHuntRewardGranted({
      userId: attackerId,
      marchId,
      bugInstanceId,
      itemKeys: committedResult.itemDrops,
      hunterXpGranted: committedResult.hunterXpGranted,
    });
  }

  try {
    await sendBugHuntBattleReport({
      attackerId,
      attackerHandle,
      bugInstanceId,
      bugRemainingHpPercent: committedResult.hpPercent,
      hunterSurvived: committedResult.hunterSurvived,
      endReason: committedResult.endReason,
      hunterRosterId: rosterId,
      mapX: Number(march.hackMapCellX),
      mapY: Number(march.hackMapCellY),
      battleId: replayCreated ? syntheticBattleId : undefined,
      itemDrops: committedResult.itemDrops,
      hunterXpGranted: committedResult.hunterXpGranted,
    });
  } catch (reportErr) {
    console.error('[BugHuntBattle] failed to send bug-hunt BTL report:', marchId, reportErr);
  }

  scheduleReturnMarchComplete(marchId, returnArriveAt);

  const queueKey = `bug:${bugInstanceId}`;
  // IMPORTANT: resolveBugHuntMarch is normally called from tryStartNextMarchResolutionForQueueKey,
  // which itself runs inside the per-queue serialized task. Re-entering runDefenderQueueSerialized
  // here for the same key can deadlock the queue tail and stall follow-up hunts at "arrived".
  await reconcileDefenderQueue(queueKey);
  const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
  await tryStartNextMarchResolutionForQueueKey(queueKey);
}
