import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { SwarmSession, type ISwarmSessionDocument } from '../models/SwarmSession';
import { AttackMarch } from '../models/AttackMarch';
import { User } from '../models/User';
import { Map as MapModel } from '../models/Map';
import { CrewStatus } from '../models/CrewStatus';
import { Battle } from '../models/Battle';
import { getInventoryKey } from '../utils/botInventoryKeys';
import { isSwarmLeadResearchUnlocked } from '../utils/researchFeatureUtils';
import type { IBattleDocument } from '../models/Battle';
import { NodeOwner } from '../types/battle';
import {
  distanceDuTileUnits,
  secondsPerDuFromArmySnapshot,
  totalTravelSeconds,
} from './MarchTimingService';
import { clearMarchArrivalTimer, scheduleMarchArrival } from './MarchArrivalSchedulerService';
import { cancelOutboundAttackMarch } from './AttackMarchCancelService';
import {
  defenderQueueKeyFromMarchDoc,
  reconcileDefenderQueue,
  runDefenderQueueSerialized,
} from './MarchDefenderQueueService';
import { LevelingService } from './LevelingService';
import { computePvpXpFromOpponentLosses } from './PvPBattleExperienceService';
import { defenderHasSurvivingTroops } from './PvPBattleMoneyService';
import { formatHackLocationDisplay } from '../utils/battleHackLocation';
import { PrivateMessage } from '../models/PrivateMessage';
import { applyRetentionAfterInsert } from './PrivateMessageRetentionService';
import { BATTLE_REPORT_SENDER_ID, BATTLE_REPORT_SENDER_USERNAME } from '../constants/systemSenders';
import { findHouseForUser, placeUserHouse } from './CellAccessorService';
import {
  battleReportBotsLost,
  sumBattalionBotsByOwnerForReport,
} from '../utils/battleReportBotCounts';
import { serializeBattleReportMessage } from './BattleNotificationService';

const Bot = require('../models/Bot');

const SWARM_PREP_WINDOW_MS = 15 * 60 * 1000;
const SWARM_SWEEP_INTERVAL_MS = 5000;
type BotFamily = 'guardian' | 'breacher' | 'phreak';
type MarkLevel = 1 | 2;

type SwarmContributionByUser = Record<string, Partial<Record<'guardian' | 'breacher' | 'phreak' | 'guardianM2' | 'breacherM2' | 'phreakM2', number>>>;

export class SwarmError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 404 | 409 | 500,
    message: string
  ) {
    super(message);
    this.name = 'SwarmError';
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function isShieldActive(user: any): boolean {
  const shield = user?.antivirusShield;
  if (!shield?.active) return false;
  if (!shield?.completesAt) return false;
  return new Date(shield.completesAt).getTime() > Date.now();
}

function ensureSlotForUser(isLeader: boolean, slotIndex: number): void {
  if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > 18) {
    throw new SwarmError(400, 'slotIndex must be an integer between 1 and 18');
  }
  if (isLeader && slotIndex > 6) {
    throw new SwarmError(400, 'Lead can only use slots 1-6');
  }
  if (!isLeader && slotIndex <= 6) {
    throw new SwarmError(400, 'Crew joiners can only use slots 7-18');
  }
}

function buildParticipants(session: ISwarmSessionDocument): string[] {
  const userIds = new Set<string>();
  for (const c of session.commitments) {
    userIds.add(String(c.userId));
  }
  return [...userIds];
}

async function ensureUserBotInventory(userId: string): Promise<any> {
  const bot = await Bot.findOne({ userId });
  if (!bot) {
    throw new SwarmError(400, 'Bot inventory not found');
  }
  return bot;
}

function clampFinite(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function aggregateForBattle(commitments: ISwarmSessionDocument['commitments']): Array<{ type: BotFamily; quantity: number; markLevel: MarkLevel }> {
  const byKey = new Map<string, { type: BotFamily; markLevel: MarkLevel; quantity: number }>();
  for (const c of commitments) {
    const key = `${c.botType}:${c.markLevel}`;
    const prev = byKey.get(key);
    if (prev) {
      prev.quantity += c.quantity;
    } else {
      byKey.set(key, {
        type: c.botType,
        markLevel: c.markLevel,
        quantity: c.quantity,
      });
    }
  }
  const out = [...byKey.values()];
  out.sort((a, b) => String(a.type).localeCompare(String(b.type)) || a.markLevel - b.markLevel);
  return out;
}

function hasNonLeaderParticipant(session: ISwarmSessionDocument): boolean {
  return session.commitments.some((c) => String(c.userId) !== String(session.leaderUserId));
}

function hasLeaderParticipant(session: ISwarmSessionDocument): boolean {
  return session.commitments.some((c) => String(c.userId) === String(session.leaderUserId));
}

function buildContributionByUser(session: ISwarmSessionDocument): SwarmContributionByUser {
  const out: SwarmContributionByUser = {};
  for (const c of session.commitments) {
    const uid = String(c.userId);
    const key = getInventoryKey(c.botType, c.markLevel) as keyof SwarmContributionByUser[string];
    out[uid] = out[uid] || {};
    out[uid][key] = (out[uid][key] || 0) + c.quantity;
  }
  return out;
}

async function addInventory(userId: string, botType: BotFamily, markLevel: MarkLevel, quantity: number, session?: mongoose.ClientSession): Promise<void> {
  if (quantity <= 0) return;
  const key = getInventoryKey(botType, markLevel);
  const upd = await Bot.findOneAndUpdate(
    { userId },
    { $inc: { [`bots.${key}`]: quantity } },
    { new: true, ...(session ? { session } : {}) }
  );
  if (!upd) {
    throw new SwarmError(500, `Unable to restore bots for user ${userId}`);
  }
}

async function removeInventory(userId: string, botType: BotFamily, markLevel: MarkLevel, quantity: number, session?: mongoose.ClientSession): Promise<void> {
  if (quantity <= 0) return;
  const key = getInventoryKey(botType, markLevel);
  const bot = await ensureUserBotInventory(userId);
  const owned = Number((bot.bots as Record<string, number>)[key] ?? 0);
  if (owned < quantity) {
    throw new SwarmError(400, 'Insufficient Bots Available');
  }
  await Bot.findOneAndUpdate(
    { userId },
    { $inc: { [`bots.${key}`]: -quantity } },
    { new: true, ...(session ? { session } : {}) }
  );
}

async function restoreAllCommitments(sessionDoc: ISwarmSessionDocument, session?: mongoose.ClientSession): Promise<void> {
  for (const c of sessionDoc.commitments) {
    await addInventory(String(c.userId), c.botType, c.markLevel, c.quantity, session);
  }
}

/**
 * Called when a Swarm outbound march finishes its cancel return leg (`returningAfterCancel`).
 * Inventory was held via `SwarmSession.commitments`, not `consumedBattalionAssignments`.
 */
export async function restoreSwarmCommitmentsOnMarchCancelReturn(params: {
  marchId: string;
  swarmSessionId: string;
  session: mongoose.ClientSession;
}): Promise<void> {
  const { marchId, swarmSessionId, session } = params;
  const sessionDoc = await SwarmSession.findOne({ swarmId: String(swarmSessionId).trim() })
    .session(session);
  if (!sessionDoc) {
    throw new Error('SWARM_SESSION_MISSING_FOR_CANCEL_RETURN');
  }
  if (!sessionDoc.marchId || String(sessionDoc.marchId) !== String(marchId)) {
    throw new Error('SWARM_SESSION_MARCH_MISMATCH_FOR_CANCEL_RETURN');
  }
  const st = sessionDoc.state;
  const reason = sessionDoc.cancelReason;
  const canRestore =
    st === 'marching' || (st === 'cancelled' && reason === 'lead-abort-outbound');
  if (!canRestore) {
    throw new Error('SWARM_CANCEL_RETURN_UNEXPECTED_SESSION_STATE');
  }
  await restoreAllCommitments(sessionDoc, session);
  if (st === 'marching') {
    sessionDoc.state = 'cancelled';
    sessionDoc.cancelReason = 'outbound-cancel-return-complete';
    await sessionDoc.save({ session });
  }
}

async function ensureCrewMembership(userId: string): Promise<{ crewId: string }> {
  const crewStatus = await CrewStatus.findOne({ userId }).select('isInCrew crewId').lean();
  if (!crewStatus?.isInCrew || !crewStatus.crewId) {
    throw new SwarmError(403, 'You must be in a crew to use Swarm');
  }
  return { crewId: String(crewStatus.crewId) };
}

export async function createSwarmSession(params: {
  leaderUserId: string;
  targetUserId: string;
  targetX: number;
  targetY: number;
}): Promise<ISwarmSessionDocument> {
  const { leaderUserId, targetUserId, targetX, targetY } = params;

  if (!await isSwarmLeadResearchUnlocked(leaderUserId)) {
    throw new SwarmError(403, 'Swarm Lead research is required');
  }
  const { crewId } = await ensureCrewMembership(leaderUserId);
  if (String(leaderUserId) === String(targetUserId)) {
    throw new SwarmError(400, 'Cannot target yourself');
  }

  const [targetUser, targetCrewStatus] = await Promise.all([
    User.findById(targetUserId).select('_id antivirusShield').lean(),
    CrewStatus.findOne({ userId: targetUserId }).select('isInCrew crewId').lean(),
  ]);
  if (!targetUser) {
    throw new SwarmError(404, 'Target user not found');
  }
  if (isShieldActive(targetUser)) {
    throw new SwarmError(409, 'Target is currently shielded');
  }
  if (targetCrewStatus?.isInCrew && targetCrewStatus.crewId && String(targetCrewStatus.crewId) === crewId) {
    throw new SwarmError(409, 'Cannot target a player in your crew');
  }

  const existing = await SwarmSession.findOne({
    leaderUserId: String(leaderUserId),
    state: { $in: ['preparing', 'marching'] },
  }).lean();
  if (existing) {
    throw new SwarmError(409, 'You already have an active Swarm');
  }

  const now = new Date();
  const doc = await SwarmSession.create({
    swarmId: `swarm-${randomUUID()}`,
    leaderUserId: String(leaderUserId),
    crewId,
    targetUserId: String(targetUserId),
    targetX: Math.floor(targetX),
    targetY: Math.floor(targetY),
    state: 'preparing',
    deadlineAt: new Date(now.getTime() + SWARM_PREP_WINDOW_MS),
    commitments: [],
    participants: [],
  });
  return doc;
}

export async function getSwarmSessionForUser(userId: string): Promise<ISwarmSessionDocument | null> {
  const direct = await SwarmSession.findOne({
    $or: [
      { leaderUserId: String(userId), state: { $in: ['preparing', 'marching'] } },
      { commitments: { $elemMatch: { userId: String(userId) } }, state: { $in: ['preparing', 'marching'] } },
    ],
  }).sort({ createdAt: -1 });
  if (direct) return direct;

  const crewStatus = await CrewStatus.findOne({ userId: String(userId) })
    .select('isInCrew crewId')
    .lean();
  if (!crewStatus?.isInCrew || !crewStatus.crewId) {
    return null;
  }

  return SwarmSession.findOne({
    crewId: String(crewStatus.crewId),
    state: { $in: ['preparing', 'marching'] },
  }).sort({ createdAt: -1 });
}

export async function commitSwarmSlot(params: {
  requesterUserId: string;
  swarmId: string;
  slotIndex: number;
  botType: BotFamily;
  markLevel: MarkLevel;
  quantity: number;
}): Promise<ISwarmSessionDocument> {
  const { requesterUserId, swarmId, slotIndex, botType, markLevel, quantity } = params;
  if (!['guardian', 'breacher', 'phreak'].includes(botType)) {
    throw new SwarmError(400, 'Invalid botType');
  }
  if (markLevel !== 1 && markLevel !== 2) {
    throw new SwarmError(400, 'markLevel must be 1 or 2');
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) {
    throw new SwarmError(400, 'quantity must be an integer between 1 and 5000');
  }

  const sessionDoc = await SwarmSession.findOne({ swarmId: String(swarmId).trim() });
  if (!sessionDoc) throw new SwarmError(404, 'Swarm session not found');
  if (sessionDoc.state !== 'preparing') throw new SwarmError(409, 'Swarm is no longer in preparation');

  const isLeader = String(sessionDoc.leaderUserId) === String(requesterUserId);
  ensureSlotForUser(isLeader, slotIndex);

  if (!isLeader) {
    const requesterCrew = await ensureCrewMembership(requesterUserId);
    if (requesterCrew.crewId !== String(sessionDoc.crewId)) {
      throw new SwarmError(403, 'Only crew members can join this Swarm');
    }
  }

  if (sessionDoc.commitments.some((c) => c.slotIndex === slotIndex)) {
    throw new SwarmError(409, `Slot ${slotIndex} is already committed`);
  }

  const requester = await User.findById(requesterUserId).select('handle').lean();
  if (!requester?.handle) {
    throw new SwarmError(400, 'User handle is required to commit a Swarm slot');
  }

  await removeInventory(requesterUserId, botType, markLevel, quantity);

  sessionDoc.commitments.push({
    slotIndex,
    userId: String(requesterUserId),
    userHandle: String(requester.handle),
    botType,
    markLevel,
    quantity,
    committedAt: new Date(),
  });
  sessionDoc.participants = buildParticipants(sessionDoc);
  await sessionDoc.save();
  return sessionDoc;
}

export async function dismissSwarmSlot(params: {
  requesterUserId: string;
  swarmId: string;
  slotIndex: number;
}): Promise<ISwarmSessionDocument> {
  const { requesterUserId, swarmId, slotIndex } = params;
  const sessionDoc = await SwarmSession.findOne({ swarmId: String(swarmId).trim() });
  if (!sessionDoc) throw new SwarmError(404, 'Swarm session not found');
  if (sessionDoc.state !== 'preparing') throw new SwarmError(409, 'Only preparing Swarms can dismiss slots');
  if (String(sessionDoc.leaderUserId) !== String(requesterUserId)) {
    throw new SwarmError(403, 'Only the Swarm lead can dismiss committed slots');
  }
  if (!Number.isInteger(slotIndex) || slotIndex < 7 || slotIndex > 18) {
    throw new SwarmError(400, 'Lead can only dismiss joiner slots (7-18)');
  }
  const idx = sessionDoc.commitments.findIndex((c) => c.slotIndex === slotIndex);
  if (idx === -1) throw new SwarmError(404, 'Slot not committed');
  const commitment = sessionDoc.commitments[idx];
  sessionDoc.commitments.splice(idx, 1);
  sessionDoc.participants = buildParticipants(sessionDoc);
  await sessionDoc.save();
  await addInventory(String(commitment.userId), commitment.botType, commitment.markLevel, commitment.quantity);
  return sessionDoc;
}

async function launchSwarmMarch(sessionDoc: ISwarmSessionDocument): Promise<{ marchId: string; arriveAt: Date }> {
  const battalions = aggregateForBattle(sessionDoc.commitments);
  if (battalions.length === 0) {
    throw new SwarmError(409, 'No committed battalions to deploy');
  }
  const armySnapshot = {
    screenWidth: 844,
    screenHeight: 390,
    battalions: battalions.map((b) => ({
      type: b.type,
      quantity: b.quantity,
      markLevel: b.markLevel,
    })),
  };

  const { originX, originY } = await resolveLeadOriginPosition(String(sessionDoc.leaderUserId));
  if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
    throw new SwarmError(400, 'Lead map position is invalid');
  }

  const distanceDu = distanceDuTileUnits(originX, originY, sessionDoc.targetX, sessionDoc.targetY);
  const secondsPerDu = secondsPerDuFromArmySnapshot(armySnapshot as any);
  const travelSec = totalTravelSeconds(distanceDu, secondsPerDu);
  const departAt = new Date();
  const arriveAt = new Date(departAt.getTime() + Math.ceil(travelSec * 1000));
  const marchId = `swarm-march-${randomUUID()}`;

  await AttackMarch.create({
    marchId,
    attackerId: String(sessionDoc.leaderUserId),
    defenderId: String(sessionDoc.targetUserId),
    originX,
    originY,
    targetX: sessionDoc.targetX,
    targetY: sessionDoc.targetY,
    distanceDu,
    secondsPerDu,
    totalTravelSeconds: travelSec,
    armySnapshot,
    consumedBattalionAssignments: [],
    defenderQueueKey: `pvp:${String(sessionDoc.targetUserId)}`,
    state: 'outbound',
    departAt,
    arriveAt,
    hackMapCellX: sessionDoc.targetX,
    hackMapCellY: sessionDoc.targetY,
    createdAt: new Date(),
    swarmSessionId: String(sessionDoc.swarmId),
    attackType: 'swarm',
  });

  scheduleMarchArrival(marchId, arriveAt);
  return { marchId, arriveAt };
}

async function resolveLeadOriginPosition(leaderUserId: string): Promise<{ originX: number; originY: number }> {
  const mapDoc = await MapModel.findOne({ name: 'main' });
  if (!mapDoc) {
    throw new SwarmError(400, 'Lead map position is unavailable');
  }

  const leaderUserObjectId = mongoose.Types.ObjectId.isValid(leaderUserId)
    ? new mongoose.Types.ObjectId(leaderUserId)
    : null;
  if (!leaderUserObjectId) {
    throw new SwarmError(400, 'Lead map position is unavailable');
  }

  let house = await findHouseForUser(mapDoc, leaderUserObjectId);
  if (!house) {
    const leader = await User.findById(leaderUserId).select('handle').lean();
    if (!leader?.handle) {
      throw new SwarmError(400, 'Lead map position is unavailable');
    }
    const placed = await placeUserHouse(mapDoc, leaderUserObjectId, String(leader.handle));
    if (placed) {
      house = placed;
    }
  }

  if (!house) {
    throw new SwarmError(400, 'Lead map position is unavailable');
  }
  return { originX: Number(house.x), originY: Number(house.y) };
}

export async function deploySwarmSession(params: {
  requesterUserId?: string;
  swarmId: string;
  auto?: boolean;
}): Promise<ISwarmSessionDocument> {
  const { requesterUserId, swarmId, auto = false } = params;
  const sessionDoc = await SwarmSession.findOne({ swarmId: String(swarmId).trim() });
  if (!sessionDoc) throw new SwarmError(404, 'Swarm session not found');
  if (sessionDoc.state !== 'preparing') throw new SwarmError(409, 'Swarm is not in preparation');
  if (!auto && String(sessionDoc.leaderUserId) !== String(requesterUserId)) {
    throw new SwarmError(403, 'Only the Swarm lead can deploy');
  }
  if (!hasLeaderParticipant(sessionDoc)) {
    throw new SwarmError(409, 'Lead battalions must be committed before deploy');
  }
  if (!hasNonLeaderParticipant(sessionDoc)) {
    throw new SwarmError(409, 'At least one other crew participant is required to deploy');
  }

  const { marchId } = await launchSwarmMarch(sessionDoc);
  sessionDoc.state = 'marching';
  sessionDoc.marchId = marchId;
  sessionDoc.deployedAt = new Date();
  sessionDoc.participants = buildParticipants(sessionDoc);
  await sessionDoc.save();
  return sessionDoc;
}

export async function abortSwarmSession(params: {
  requesterUserId: string;
  swarmId: string;
}): Promise<ISwarmSessionDocument> {
  const { requesterUserId, swarmId } = params;
  const sessionDoc = await SwarmSession.findOne({ swarmId: String(swarmId).trim() });
  if (!sessionDoc) throw new SwarmError(404, 'Swarm session not found');
  if (String(sessionDoc.leaderUserId) !== String(requesterUserId)) {
    throw new SwarmError(403, 'Only the Swarm lead can abort');
  }

  if (sessionDoc.state === 'preparing') {
    await restoreAllCommitments(sessionDoc);
    sessionDoc.state = 'cancelled';
    sessionDoc.cancelReason = 'lead-abort-prep';
    await sessionDoc.save();
    return sessionDoc;
  }

  if (sessionDoc.state !== 'marching') {
    throw new SwarmError(409, 'Swarm cannot be aborted in its current state');
  }
  if (!sessionDoc.marchId) {
    throw new SwarmError(500, 'Swarm march id is missing');
  }
  const march = await AttackMarch.findOne({ marchId: sessionDoc.marchId }).lean();
  if (!march) throw new SwarmError(404, 'Swarm march not found');
  if (march.state !== 'outbound') {
    throw new SwarmError(409, 'Swarm cannot be aborted after arriving at target');
  }
  const nowMs = Date.now();
  const departMs = new Date(march.departAt).getTime();
  const arriveMs = new Date(march.arriveAt).getTime();
  const t = clampFinite((nowMs - departMs) / Math.max(1, arriveMs - departMs), 0, 1);
  // Bugbot: Swarm launches with `consumedBattalionAssignments: []` by design; solo-only empty guard is in `AttackMarchCancelService` (`isSwarmMarch`). Return-leg refund: `restoreSwarmCommitmentsOnMarchCancelReturn`.
  await cancelOutboundAttackMarch(String(requesterUserId), String(march.marchId), nowMs, t);
  // Commitments restore when the return leg completes (`restoreSwarmCommitmentsOnMarchCancelReturn`), same as map cancel.
  sessionDoc.state = 'cancelled';
  sessionDoc.cancelReason = 'lead-abort-outbound';
  await sessionDoc.save();
  return sessionDoc;
}

export async function cancelCrewSwarmsForDisband(crewId: string): Promise<void> {
  const active = await SwarmSession.find({ crewId: String(crewId), state: { $in: ['preparing', 'marching'] } });
  for (const s of active) {
    try {
      if (s.state === 'preparing') {
        await restoreAllCommitments(s);
        s.state = 'cancelled';
        s.cancelReason = 'crew-disbanded';
        await s.save();
        continue;
      }

      // marching — must not mark session cancelled while an outbound march is still flying: battle
      // would still run and settleSwarmBattleIfNeeded would skip a cancelled session (no XP/bots/reports).
      const mid = s.marchId ? String(s.marchId).trim() : '';
      if (!mid) {
        s.state = 'cancelled';
        s.cancelReason = 'crew-disbanded';
        await s.save();
        continue;
      }

      clearMarchArrivalTimer(mid);
      const cancelledOutbound = await AttackMarch.findOneAndUpdate(
        { marchId: mid, state: 'outbound' },
        { $set: { state: 'cancelled', resolvedAt: new Date() } },
        { new: true, lean: true }
      );
      if (cancelledOutbound) {
        // Swarm launches with empty consumedBattalionAssignments; restore from session commitments (same as prep cancel).
        await restoreAllCommitments(s);
        try {
          const qk = defenderQueueKeyFromMarchDoc(
            cancelledOutbound as { defenderQueueKey?: string; defenderId: string; defenderNpcInstanceId?: string }
          );
          void runDefenderQueueSerialized(qk, async () => {
            await reconcileDefenderQueue(qk);
            const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
            await tryStartNextMarchResolutionForQueueKey(qk);
          });
        } catch (queueErr) {
          console.error('[SwarmService] defender queue reconcile after crew disband march cancel', mid, queueErr);
        }
      }
      // If the march was already past outbound (arrived / queued / resolving), commitments stay in the battle
      // pipeline; cancelReason crew-disbanded lets settleSwarmBattleIfNeeded run when the battle ends.

      s.state = 'cancelled';
      s.cancelReason = 'crew-disbanded';
      await s.save();
    } catch (e) {
      console.error('[SwarmService] cancelCrewSwarmsForDisband failed', s.swarmId, e);
    }
  }
}

export async function runSwarmPrepSweepOnce(): Promise<void> {
  const now = new Date();
  const expired = await SwarmSession.find({
    state: 'preparing',
    deadlineAt: { $lte: now },
  });
  for (const s of expired) {
    try {
      // Bugbot / deploySwarmSession: requires both lead + non-lead commits; joiners-only must not attempt auto-deploy.
      if (hasNonLeaderParticipant(s) && hasLeaderParticipant(s)) {
        await deploySwarmSession({ swarmId: String(s.swarmId), auto: true });
      } else if (hasNonLeaderParticipant(s) && !hasLeaderParticipant(s)) {
        await restoreAllCommitments(s);
        s.state = 'cancelled';
        s.cancelReason = 'deadline-no-lead-commit';
        await s.save();
      } else {
        await restoreAllCommitments(s);
        s.state = 'cancelled';
        s.cancelReason = 'deadline-no-joiners';
        await s.save();
      }
    } catch (e) {
      console.error('[SwarmService] runSwarmPrepSweepOnce failed', s.swarmId, e);
      try {
        const fresh = await SwarmSession.findOne({ swarmId: String(s.swarmId), state: 'preparing' });
        if (!fresh) {
          continue;
        }
        await restoreAllCommitments(fresh);
        fresh.state = 'cancelled';
        fresh.cancelReason = 'deadline-auto-deploy-failed';
        await fresh.save();
      } catch (recoveryErr) {
        console.error('[SwarmService] runSwarmPrepSweepOnce recovery failed', s.swarmId, recoveryErr);
      }
    }
  }
}

let swarmSweepTimer: NodeJS.Timeout | null = null;

export function startSwarmPrepSweepWatchdog(): void {
  if (swarmSweepTimer) return;
  swarmSweepTimer = setInterval(() => {
    void runSwarmPrepSweepOnce();
  }, SWARM_SWEEP_INTERVAL_MS);
}

/** Split `total` across participants as evenly as possible; remainder distributed +1 to first sorted IDs. */
function splitTotalEvenlyAmongParticipants(total: number, participantIds: string[]): Map<string, number> {
  const out = new Map<string, number>();
  const ids = [...new Set(participantIds.map((id) => String(id)))].sort((a, b) => a.localeCompare(b));
  if (ids.length === 0) return out;
  if (total <= 0) {
    for (const id of ids) out.set(id, 0);
    return out;
  }
  const n = ids.length;
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  for (let i = 0; i < ids.length; i++) {
    out.set(ids[i], base + (i < remainder ? 1 : 0));
  }
  return out;
}

function collectSurvivorsByKey(battle: IBattleDocument): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of battle.battalions ?? []) {
    if (b.owner !== NodeOwner.USER || (b.quantity ?? 0) <= 0) continue;
    const mark = (b.mark ?? 1) >= 2 ? 2 : 1;
    const key = getInventoryKey(String(b.type) as BotFamily, mark as MarkLevel);
    out[key] = (out[key] || 0) + b.quantity;
  }
  return out;
}

function distributeSurvivors(
  contributions: SwarmContributionByUser,
  survivorsByKey: Record<string, number>
): SwarmContributionByUser {
  const allocations: SwarmContributionByUser = {};
  for (const [key, survivors] of Object.entries(survivorsByKey)) {
    const contributors = Object.entries(contributions)
      .map(([userId, byKey]) => ({ userId, contribution: Number(byKey[key as keyof typeof byKey] ?? 0) }))
      .filter((r) => r.contribution > 0);
    if (contributors.length === 0 || survivors <= 0) continue;
    const total = contributors.reduce((s, r) => s + r.contribution, 0);
    let assigned = 0;
    const base = contributors.map((r) => {
      const exact = (survivors * r.contribution) / total;
      const floor = Math.floor(exact);
      assigned += floor;
      return { ...r, exact, floor, frac: exact - floor };
    });
    let remainder = survivors - assigned;
    base.sort((a, b) => b.frac - a.frac || a.userId.localeCompare(b.userId));
    for (const row of base) {
      let qty = row.floor;
      if (remainder > 0) {
        qty += 1;
        remainder -= 1;
      }
      if (qty <= 0) continue;
      allocations[row.userId] = allocations[row.userId] || {};
      allocations[row.userId][key as keyof SwarmContributionByUser[string]] =
        (allocations[row.userId][key as keyof SwarmContributionByUser[string]] || 0) + qty;
    }
  }
  return allocations;
}

async function sendSwarmBattleReports(
  battle: IBattleDocument,
  participants: string[],
  cashByUser: Map<string, number>,
  xpByUser: Map<string, number>
): Promise<void> {
  const handles = await User.find({ _id: { $in: [battle.attackerId, battle.defenderId, ...participants] } })
    .select('_id handle')
    .lean();
  const handleById = new Map(handles.map((h: any) => [String(h._id), h.handle || 'Unknown']));
  const startingBattalions = battle.startingBattalions ?? [];
  const endingBattalions = battle.battalions ?? [];
  const attackerStart = sumBattalionBotsByOwnerForReport(startingBattalions, NodeOwner.USER);
  const defenderStart = sumBattalionBotsByOwnerForReport(startingBattalions, NodeOwner.ENEMY);
  const attackerEnd = sumBattalionBotsByOwnerForReport(endingBattalions, NodeOwner.USER);
  const defenderEnd = sumBattalionBotsByOwnerForReport(endingBattalions, NodeOwner.ENEMY);
  const attackerLost = battleReportBotsLost(attackerStart, attackerEnd);
  const defenderLost = battleReportBotsLost(defenderStart, defenderEnd);
  const bx = (battle as { hackMapCellX?: number }).hackMapCellX;
  const by = (battle as { hackMapCellY?: number }).hackMapCellY;
  const hasMapCell =
    typeof bx === 'number' &&
    Number.isFinite(bx) &&
    typeof by === 'number' &&
    Number.isFinite(by);
  let hl: string | undefined;
  if (hasMapCell) {
    try {
      hl = formatHackLocationDisplay(bx, by);
    } catch (e) {
      console.error('[SwarmService] formatHackLocationDisplay failed (swarm battle report)', e);
    }
  }
  const docs = participants.flatMap((uid) => {
    // Swarm `BTL|` PMs go to crew participants (attacking side only). Align with PvP `BattleNotificationService`:
    // `xpAttacker` / `xpDefender` so BaseChatModal uses the PvP XP line, not legacy `xp`.
    const xa = Math.max(0, Math.floor(xpByUser.get(uid) ?? 0));
    const xd = 0;
    const payload: Record<string, unknown> = {
      br: 1,
      swarm: 1,
      battleId: battle.battleId,
      attackerId: String(battle.attackerId),
      defenderId: String(battle.defenderId),
      attackerHandle: handleById.get(String(battle.attackerId)) ?? 'Unknown',
      defenderHandle: handleById.get(String(battle.defenderId)) ?? 'Unknown',
      attackerStart,
      defenderStart,
      attackerLost,
      defenderLost,
      winner: battle.winner === NodeOwner.USER ? 'user' : 'enemy',
      cash: cashByUser.get(uid) ?? 0,
      ...(xa > 0 || xd > 0 ? { xpAttacker: xa, xpDefender: xd } : {}),
    };
    if (hl) payload.hl = hl;
    if (hasMapCell) {
      payload.mapName = 'main';
      payload.x = Math.floor(bx);
      payload.y = Math.floor(by);
    }
    const messageBody = serializeBattleReportMessage(
      payload,
      `swarm:${String(battle.battleId ?? '')}:${uid}`
    );
    return [
      {
        senderId: BATTLE_REPORT_SENDER_ID,
        recipientId: uid,
        senderUsername: BATTLE_REPORT_SENDER_USERNAME,
        message: messageBody,
        readAt: null,
        isFromAdmin: false,
      },
    ];
  });
  if (docs.length === 0) return;
  await PrivateMessage.insertMany(docs);
  for (const uid of participants) {
    try {
      await applyRetentionAfterInsert({ senderId: BATTLE_REPORT_SENDER_ID, recipientId: uid });
    } catch (e) {
      console.error('[SwarmService] PM retention failed', uid, e);
    }
  }
}

export async function settleSwarmBattleIfNeeded(
  battle: IBattleDocument,
  pvpCashTransferred: number,
  /** When provided (e.g. from `BattleService.handleBattleEnd`), avoids recomputing the same `computePvpXpFromOpponentLosses` totals. */
  precomputedPvpXp?: { attackerTotal: number; defenderTotal: number }
): Promise<void> {
  const marchSourced = (battle as any).marchSourcedAttack === true;
  if (!marchSourced || !battle.sourceMarchId) return;
  const sourceMarch = await AttackMarch.findOne({ marchId: String(battle.sourceMarchId) })
    .select('swarmSessionId')
    .lean();
  const swarmSessionId = sourceMarch?.swarmSessionId;
  if (!swarmSessionId) return;

  const sessionDoc = await SwarmSession.findOne({ swarmId: String(swarmSessionId) });
  if (!sessionDoc) return;
  if (sessionDoc.state === 'resolved') return;
  // Crew disband can cancel the session while a march is already at target; settlement must still run.
  if (sessionDoc.state === 'cancelled' && sessionDoc.cancelReason !== 'crew-disbanded') return;

  const participants = [...new Set(sessionDoc.commitments.map((c) => String(c.userId)))];
  if (participants.length === 0) return;

  const xpAttackerTotal =
    precomputedPvpXp != null
      ? precomputedPvpXp.attackerTotal
      : computePvpXpFromOpponentLosses(
          battle.startingBattalions ?? [],
          battle.battalions ?? [],
          NodeOwner.ENEMY
        );
  const xpDefenderTotal =
    precomputedPvpXp != null
      ? precomputedPvpXp.defenderTotal
      : computePvpXpFromOpponentLosses(
          battle.startingBattalions ?? [],
          battle.battalions ?? [],
          NodeOwner.USER
        );

  // `processPvPBattleMoneyTransfer` already credited the full steal to the march attacker (lead). Atomically:
  // claw back from leader, pay participants, XP, survivor bots, and mark session resolved — or roll back on failure
  // so the leader does not keep the full pool if redistribution throws (Bugbot: race with non-atomic prior flow).
  const clientSession = await mongoose.startSession();
  try {
    await clientSession.withTransaction(async () => {
      const locked = await SwarmSession.findOne({ swarmId: String(swarmSessionId) }).session(clientSession);
      if (!locked) {
        throw new Error('SWARM_SETTLE_SESSION_MISSING');
      }
      if (locked.state === 'resolved') {
        return;
      }
      if (locked.state === 'cancelled' && locked.cancelReason !== 'crew-disbanded') {
        return;
      }

      const innerParticipants = [...new Set(locked.commitments.map((c) => String(c.userId)))];
      if (innerParticipants.length === 0) {
        return;
      }

      const cashSharesInner = splitTotalEvenlyAmongParticipants(pvpCashTransferred, innerParticipants);
      const xpSharesInner = splitTotalEvenlyAmongParticipants(xpAttackerTotal, innerParticipants);

      if (pvpCashTransferred > 0) {
        const leader = await User.findById(locked.leaderUserId).session(clientSession);
        if (leader) {
          leader.balance.total = Math.max(0, leader.balance.total - pvpCashTransferred);
          leader.balance.lastUpdated = new Date();
          await leader.save({ session: clientSession });
        }
      }

      for (const userId of innerParticipants) {
        const cashShare = cashSharesInner.get(userId) ?? 0;
        const xpShare = xpSharesInner.get(userId) ?? 0;
        if (cashShare > 0) {
          const u = await User.findById(userId).session(clientSession);
          if (u) {
            u.balance.total += cashShare;
            u.balance.lastUpdated = new Date();
            await u.save({ session: clientSession });
          }
        }
        if (xpShare > 0) {
          await LevelingService.applyExperience(userId, xpShare, { session: clientSession });
        }
      }

      if (xpDefenderTotal > 0) {
        await LevelingService.applyExperience(String(battle.defenderId), xpDefenderTotal, {
          session: clientSession,
        });
      }

      const contributions = buildContributionByUser(locked);
      const survivorsByKey = collectSurvivorsByKey(battle);
      const survivorsAlloc = distributeSurvivors(contributions, survivorsByKey);
      for (const [uid, byKey] of Object.entries(survivorsAlloc)) {
        const inc: Record<string, number> = {};
        for (const [k, v] of Object.entries(byKey)) {
          if (v > 0) {
            inc[`bots.${k}`] = v;
          }
        }
        if (Object.keys(inc).length > 0) {
          await Bot.findOneAndUpdate({ userId: uid }, { $inc: inc }, { new: true, session: clientSession });
        }
      }

      locked.state = 'resolved';
      locked.resolvedAt = new Date();
      locked.battleId = String(battle.battleId);
      locked.participants = innerParticipants;
      locked.rewardShares = innerParticipants.map((uid) => ({
        userId: uid,
        cashShare: cashSharesInner.get(uid) ?? 0,
        xpShare: xpSharesInner.get(uid) ?? 0,
      }));
      await locked.save({ session: clientSession });
    });
  } finally {
    await clientSession.endSession();
  }

  // Only send DMs after a successful commit (verified from DB — avoids DMs if txn rolled back).
  const settled = await SwarmSession.findOne({
    swarmId: String(swarmSessionId),
    state: 'resolved',
    battleId: String(battle.battleId),
  })
    .select('participants rewardShares')
    .lean();
  if (
    settled?.participants &&
    settled.participants.length > 0 &&
    settled.rewardShares &&
    settled.rewardShares.length > 0
  ) {
    const p = settled.participants.map((id) => String(id));
    const cashMap = new Map<string, number>();
    const xpMap = new Map<string, number>();
    for (const r of settled.rewardShares) {
      cashMap.set(String(r.userId), r.cashShare);
      xpMap.set(String(r.userId), r.xpShare);
    }
    try {
      await sendSwarmBattleReports(battle, p, cashMap, xpMap);
    } catch (dmErr) {
      console.error('[SwarmService] sendSwarmBattleReports failed after swarm settlement', battle.battleId, dmErr);
    }
  }
}

export async function attachSwarmBattleIdIfNeeded(battleId: string): Promise<void> {
  const battle = await Battle.findOne({ battleId });
  if (!battle?.sourceMarchId) return;
  const march = await AttackMarch.findOne({ marchId: String(battle.sourceMarchId) }).select('swarmSessionId').lean();
  if (!march?.swarmSessionId) return;
  await SwarmSession.updateOne(
    { swarmId: String(march.swarmSessionId) },
    { $set: { battleId: String(battleId) } }
  );
}

