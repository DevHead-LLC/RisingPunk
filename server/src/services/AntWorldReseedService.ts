import { randomUUID } from 'crypto';
import os from 'os';
import mongoose from 'mongoose';
import { AttackMarch } from '../models/AttackMarch';
import { BugInstance } from '../models/BugInstance';
import { Map as MapModel } from '../models/Map';
import { MapCell } from '../models/MapCell';
import { ANT_WORLD_CAP, BUG_TYPE_ANT } from '../types/bugHunt';
import {
  computeNextUtcGridInstant,
  markBugHuntReseedInProgress,
  setNextAntWorldReseedAtUtc,
} from './BugHuntWorldService';
import { ATTACK_MARCH_RETURN_LEG_MAX_MS } from '../config/env';
import { scheduleReturnMarchComplete } from './MarchArrivalSchedulerService';
import { reconcileDefenderQueue, runDefenderQueueSerialized } from './MarchDefenderQueueService';
import { tryStartNextMarchResolutionForQueueKey } from './MarchResolutionService';

const ANT_BASE_HP = 3_256_000;
const ANT_RESEED_JOB_KEY = 'antWorldReseedUtc';
const ANT_RESEED_LEASE_MS = 30 * 60 * 1000;
const SETTLEMENT_WAIT_TIMEOUT_MS = 60 * 1000;
const SETTLEMENT_WAIT_POLL_MS = 200;
const IMPASSABLE_TERRAINS = ['water', 'mountain', 'road'] as const;
const leaseHolderId = `${os.hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

type ReseedRunSource = 'scheduler' | 'manual-script';

function getLeaseCollection() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection is not ready');
  }
  return db.collection('scheduled_job_leases');
}

async function ensureLeaseIndex(): Promise<void> {
  await getLeaseCollection().createIndex({ jobKey: 1 }, { unique: true });
}

async function tryAcquireAntReseedLease(now: Date): Promise<boolean> {
  await ensureLeaseIndex();
  const leaseUntil = new Date(now.getTime() + ANT_RESEED_LEASE_MS);
  try {
    const result = await getLeaseCollection().findOneAndUpdate(
      {
        jobKey: ANT_RESEED_JOB_KEY,
        $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lt: now } }, { holderId: leaseHolderId }],
      },
      {
        $set: {
          jobKey: ANT_RESEED_JOB_KEY,
          holderId: leaseHolderId,
          leaseUntil,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    const holder = String(result?.holderId ?? '');
    return holder === leaseHolderId;
  } catch (error) {
    const asMongo = error as { code?: number };
    if (asMongo?.code === 11000) {
      return false;
    }
    throw error;
  }
}

async function releaseAntReseedLease(): Promise<void> {
  const now = new Date();
  await getLeaseCollection().updateOne(
    { jobKey: ANT_RESEED_JOB_KEY, holderId: leaseHolderId },
    {
      $set: { leaseUntil: new Date(now.getTime() - 1), updatedAt: now },
    }
  );
}

function getReturnArriveAt(totalTravelSeconds: number): Date {
  if (!Number.isFinite(totalTravelSeconds) || totalTravelSeconds < 0) {
    throw new Error('AttackMarch totalTravelSeconds must be a finite value >= 0');
  }
  const travelMs = Math.min(ATTACK_MARCH_RETURN_LEG_MAX_MS, Math.ceil(totalTravelSeconds * 1000));
  return new Date(Date.now() + travelMs);
}

async function cancelIneligibleBugHuntMarches(cutoffUtc: Date): Promise<void> {
  const rows = await AttackMarch.find({
    attackType: 'bug_hunt',
    state: { $in: ['outbound', 'arrived', 'queued'] },
  })
    .select('marchId state arriveAt totalTravelSeconds bugInstanceId')
    .lean();
  const queueKeys = new Set<string>();

  for (const row of rows) {
    const marchId = String(row.marchId ?? '').trim();
    if (marchId === '') {
      continue;
    }
    const state = String(row.state ?? '').trim();
    const arriveAt = new Date(row.arriveAt);
    const ineligible = state === 'outbound' || arriveAt.getTime() >= cutoffUtc.getTime();
    if (!ineligible) {
      continue;
    }

    const returnArriveAt = getReturnArriveAt(Number(row.totalTravelSeconds));
    const updated = await AttackMarch.updateOne(
      { marchId, state: { $in: ['outbound', 'arrived', 'queued'] } },
      {
        $set: {
          state: 'returning',
          resolvedAt: new Date(),
          returnArriveAt,
        },
        $unset: { resolvingSince: '' },
      }
    );
    if (updated.modifiedCount <= 0) {
      continue;
    }
    scheduleReturnMarchComplete(marchId, returnArriveAt);
    const bugInstanceId = String(row.bugInstanceId ?? '').trim();
    if (bugInstanceId !== '') {
      queueKeys.add(`bug:${bugInstanceId}`);
    }
  }

  for (const queueKey of queueKeys) {
    await runDefenderQueueSerialized(queueKey, async () => {
      await reconcileDefenderQueue(queueKey);
      await tryStartNextMarchResolutionForQueueKey(queueKey);
    });
  }
}

async function settleStartedBugHuntsBeforeDelete(cutoffUtc: Date): Promise<void> {
  const startedQueueKeys = new Set<string>();
  const startedRows = await AttackMarch.find({
    attackType: 'bug_hunt',
    state: { $in: ['arrived', 'queued', 'resolving'] },
    arriveAt: { $lt: cutoffUtc },
  })
    .select('bugInstanceId')
    .lean();
  for (const row of startedRows) {
    const bugInstanceId = String(row.bugInstanceId ?? '').trim();
    if (bugInstanceId !== '') {
      startedQueueKeys.add(`bug:${bugInstanceId}`);
    }
  }

  if (startedQueueKeys.size === 0) {
    return;
  }

  const deadline = Date.now() + SETTLEMENT_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    for (const queueKey of startedQueueKeys) {
      await runDefenderQueueSerialized(queueKey, async () => {
        await reconcileDefenderQueue(queueKey);
        await tryStartNextMarchResolutionForQueueKey(queueKey);
      });
    }
    const pendingCount = await AttackMarch.countDocuments({
      attackType: 'bug_hunt',
      state: { $in: ['arrived', 'queued', 'resolving'] },
      arriveAt: { $lt: cutoffUtc },
    });
    if (pendingCount === 0) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLEMENT_WAIT_POLL_MS));
  }

  console.warn('[AntWorldReseed] settlement wait timed out before delete step; proceeding with reseed');
}

async function pickSpawnCells(count: number): Promise<Array<{ x: number; y: number }>> {
  const mapDoc = await MapModel.findOne({ name: 'main' }).select('_id gridSize cells').lean();
  if (!mapDoc) {
    throw new Error("Map 'main' not found");
  }
  const gridSize = Number((mapDoc as { gridSize?: unknown }).gridSize);
  if (!Number.isFinite(gridSize) || gridSize <= 0) {
    throw new Error("Map 'main' has invalid gridSize");
  }

  if (gridSize === 500) {
    const sampled = await MapCell.aggregate([
      {
        $match: {
          mapId: (mapDoc as { _id: unknown })._id,
          isOccupied: false,
          occupiedBy: 'none',
          canBeOccupied: true,
          terrain: { $nin: IMPASSABLE_TERRAINS },
          userId: null,
        },
      },
      { $sample: { size: count } },
      { $project: { x: 1, y: 1 } },
    ]);
    if (sampled.length < count) {
      throw new Error(`Not enough available map cells for Ant reseed. Needed ${count}, got ${sampled.length}`);
    }
    return sampled.map((cell: { x: number; y: number }) => ({ x: cell.x, y: cell.y }));
  }

  const allCells = Array.isArray((mapDoc as { cells?: unknown[] }).cells)
    ? (mapDoc as { cells: Array<{ x: number; y: number; isOccupied: boolean; occupiedBy: string; canBeOccupied: boolean; terrain: string }> }).cells
    : null;
  if (!allCells) {
    throw new Error("Map 'main' is missing embedded cells");
  }
  const candidates = allCells.filter(
    (cell) =>
      cell.isOccupied === false &&
      cell.occupiedBy === 'none' &&
      cell.canBeOccupied === true &&
      !IMPASSABLE_TERRAINS.includes(cell.terrain as (typeof IMPASSABLE_TERRAINS)[number])
  );
  if (candidates.length < count) {
    throw new Error(`Not enough embedded map cells for Ant reseed. Needed ${count}, got ${candidates.length}`);
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  return candidates.slice(0, count).map((cell) => ({ x: cell.x, y: cell.y }));
}

async function reseedAntBugRows(cutoffUtc: Date): Promise<void> {
  await BugInstance.deleteMany({ bugType: BUG_TYPE_ANT });
  const spawnCells = await pickSpawnCells(ANT_WORLD_CAP);
  const now = new Date();
  const rows = spawnCells.map((cell, idx) => ({
    bugInstanceId: `ant-${cutoffUtc.getTime()}-${idx + 1}-${randomUUID().slice(0, 8)}`,
    bugType: BUG_TYPE_ANT,
    mapCellX: cell.x,
    mapCellY: cell.y,
    maxHp: ANT_BASE_HP,
    currentHp: ANT_BASE_HP,
    hpPercent: 100,
    seq: 0,
    lifecycleState: 'alive' as const,
    spawnedAt: now,
    createdAt: now,
    updatedAt: now,
  }));
  await BugInstance.insertMany(rows, { ordered: true });
}

export async function runAntWorldReseed(cutoffUtc: Date): Promise<void> {
  markBugHuntReseedInProgress(true);
  try {
    await cancelIneligibleBugHuntMarches(cutoffUtc);
    await settleStartedBugHuntsBeforeDelete(cutoffUtc);
    await reseedAntBugRows(cutoffUtc);
    setNextAntWorldReseedAtUtc(computeNextUtcGridInstant(cutoffUtc));
  } finally {
    markBugHuntReseedInProgress(false);
  }
}

export async function runAntWorldReseedWithLease(source: ReseedRunSource): Promise<{
  ran: boolean;
  skippedReason?: 'lease-not-acquired';
}> {
  const cutoffUtc = new Date();
  const acquired = await tryAcquireAntReseedLease(cutoffUtc);
  if (!acquired) {
    return { ran: false, skippedReason: 'lease-not-acquired' };
  }

  try {
    await runAntWorldReseed(cutoffUtc);
    console.log(`[AntWorldReseed] completed (${source}) at ${cutoffUtc.toISOString()}`);
    return { ran: true };
  } finally {
    await releaseAntReseedLease();
  }
}
