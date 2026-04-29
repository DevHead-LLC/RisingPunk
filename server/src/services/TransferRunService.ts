import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { TransferRun, type ITransferRunDocument, type TransferRunItemPayloadRow } from '../models/TransferRun';
import { User } from '../models/User';
import { CrewStatus } from '../models/CrewStatus';
import { Map as MapModel } from '../models/Map';
import { MapCell } from '../models/MapCell';
import { UserBugHuntState, type IUserBugHuntStateDocument } from '../models/UserBugHuntState';
import { BUG_HUNT_STORAGE_ITEM_DEFINITIONS } from '../constants/bugHuntStorageItems';
import { distanceDuTileUnits } from './MarchTimingService';
import { resolveEffectiveBugHuntTokenConfig } from './BugHuntTokenService';
import { accrueBalanceFromTo } from '../utils/balanceAccrual';

const TRANSFER_SECONDS_PER_DU = 3;
const TRANSFER_MIN_WALLET_AMOUNT = 10_000;
const TRANSFER_MAX_VALUE = 5_000_000;
const TRANSFER_MAX_ACTIVE_PER_SENDER = 3;
const TRANSFER_FEE_RATE = 0.1;
const TRANSFER_SWEEP_INTERVAL_MS = 5_000;
const TRANSFER_RESOLVING_RECOVERY_MS = 60_000;

const STORAGE_VALUE_BY_ITEM_KEY = new Map(
  BUG_HUNT_STORAGE_ITEM_DEFINITIONS.map((row) => {
    const shopPrice = Math.floor(Number(row.shopPrice ?? 0));
    const cashAmount = Math.floor(Number(row.cashAmount ?? 0));
    // Cash wallet drops are transferable and their authoritative unit value is the cash amount itself.
    const resolvedUnitValue = shopPrice > 0 ? shopPrice : cashAmount;
    return [row.itemKey, resolvedUnitValue];
  })
);

let transferRunSweepTimer: NodeJS.Timeout | null = null;
let transferRunSweepInFlight = false;

type RequestedTransferItem = {
  itemKey: string;
  quantity: number;
};

export type TransferRunQuote = {
  walletAmount: number;
  itemValueTotal: number;
  totalTransferValue: number;
  feeAmount: number;
  totalSenderCashDebit: number;
  itemPayload: TransferRunItemPayloadRow[];
};

export type LaunchTransferRunParams = {
  senderId: string;
  recipientUserId: string;
  recipientTargetX: number;
  recipientTargetY: number;
  walletAmount: number;
  items: RequestedTransferItem[];
};

export class TransferRunError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 404 | 409 | 500,
    message: string
  ) {
    super(message);
    this.name = 'TransferRunError';
  }
}

function normalizeRequestedItems(items: RequestedTransferItem[]): RequestedTransferItem[] {
  const quantityByKey = new Map<string, number>();
  for (const row of items) {
    const itemKey = String(row.itemKey ?? '').trim();
    const quantity = Math.floor(Number(row.quantity ?? 0));
    if (itemKey === '' || quantity <= 0) {
      throw new TransferRunError(400, 'Each transfer item must include a valid itemKey and positive quantity');
    }
    quantityByKey.set(itemKey, (quantityByKey.get(itemKey) ?? 0) + quantity);
  }
  return [...quantityByKey.entries()].map(([itemKey, quantity]) => ({ itemKey, quantity }));
}

export function buildTransferRunQuote(params: {
  walletAmountRaw: unknown;
  requestedItemsRaw: RequestedTransferItem[];
}): TransferRunQuote {
  const walletAmount = Math.max(0, Math.floor(Number(params.walletAmountRaw ?? 0)));
  const requestedItems = normalizeRequestedItems(params.requestedItemsRaw ?? []);
  const itemPayload: TransferRunItemPayloadRow[] = [];
  let itemValueTotal = 0;
  for (const row of requestedItems) {
    const unitValue = Math.floor(Number(STORAGE_VALUE_BY_ITEM_KEY.get(row.itemKey) ?? 0));
    if (!Number.isFinite(unitValue) || unitValue <= 0) {
      throw new TransferRunError(
        500,
        `Transfer item '${row.itemKey}' is missing an authoritative per-unit value`
      );
    }
    const totalValue = unitValue * row.quantity;
    itemValueTotal += totalValue;
    itemPayload.push({
      itemKey: row.itemKey,
      quantity: row.quantity,
      unitValue,
      totalValue,
    });
  }

  const hasAnyPayload = walletAmount > 0 || itemPayload.length > 0;
  if (!hasAnyPayload) {
    throw new TransferRunError(400, 'Transfer payload cannot be empty');
  }
  if (walletAmount > 0 && walletAmount < TRANSFER_MIN_WALLET_AMOUNT) {
    throw new TransferRunError(
      400,
      `Wallet transfer must be at least $${TRANSFER_MIN_WALLET_AMOUNT.toLocaleString()}`
    );
  }

  const totalTransferValue = walletAmount + itemValueTotal;
  if (totalTransferValue > TRANSFER_MAX_VALUE) {
    throw new TransferRunError(
      400,
      `Transfer value exceeds limit ($${TRANSFER_MAX_VALUE.toLocaleString()} max per transfer)`
    );
  }
  const feeAmount = Math.round(totalTransferValue * TRANSFER_FEE_RATE);
  if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
    throw new TransferRunError(500, 'Transfer fee calculation failed');
  }

  return {
    walletAmount,
    itemValueTotal,
    totalTransferValue,
    feeAmount,
    totalSenderCashDebit: walletAmount + feeAmount,
    itemPayload,
  };
}

async function getMapOccupantAtTile(params: {
  x: number;
  y: number;
  session?: mongoose.ClientSession;
}): Promise<{ occupiedBy: 'none' | 'player' | 'npc'; userId: string | null } | null> {
  const mapQuery = MapModel.findOne({ name: 'main' });
  if (params.session) {
    mapQuery.session(params.session);
  }
  const mapDoc = await mapQuery.lean();
  if (!mapDoc) {
    return null;
  }
  if ((mapDoc as { gridSize?: number }).gridSize === 500) {
    const rowQuery = MapCell.findOne({
      mapId: (mapDoc as { _id: mongoose.Types.ObjectId })._id,
      x: params.x,
      y: params.y,
    });
    if (params.session) {
      rowQuery.session(params.session);
    }
    const row = await rowQuery.lean();
    if (!row) return null;
    return {
      occupiedBy: row.occupiedBy ?? 'none',
      userId: row.userId ? String(row.userId) : null,
    };
  }
  const cells = Array.isArray((mapDoc as any).cells) ? ((mapDoc as any).cells as any[]) : [];
  const cell = cells.find((c) => Number(c.x) === params.x && Number(c.y) === params.y);
  if (!cell) return null;
  return {
    occupiedBy: (cell.occupiedBy as 'none' | 'player' | 'npc') ?? 'none',
    userId: cell.userId ? String(cell.userId) : null,
  };
}

async function getOrCreateUserBugHuntState(params: {
  userId: string;
  session: mongoose.ClientSession;
}): Promise<IUserBugHuntStateDocument> {
  const existing = await UserBugHuntState.findOne({ userId: params.userId }).session(params.session);
  if (existing) {
    if (!Array.isArray(existing.storageItems)) {
      existing.storageItems = [];
    }
    return existing;
  }
  const effectiveTokenConfig = await resolveEffectiveBugHuntTokenConfig({
    userId: params.userId,
    session: params.session,
  });
  const created = await UserBugHuntState.create(
    [
      {
        userId: params.userId,
        currentTokens: effectiveTokenConfig.maxTokens,
        maxTokens: effectiveTokenConfig.maxTokens,
        regenPerMinute: effectiveTokenConfig.regenPerMinute,
        lastRegenAt: new Date(),
        storageItems: [],
      },
    ],
    { session: params.session }
  );
  return created[0];
}

function upsertStorageItems(params: {
  stateDoc: IUserBugHuntStateDocument;
  rows: Array<{ itemKey: string; quantityDelta: number }>;
  mode: 'debit' | 'credit';
}): void {
  const inventoryMap = new Map<string, number>();
  for (const row of params.stateDoc.storageItems ?? []) {
    inventoryMap.set(String(row.itemKey), Math.max(0, Math.floor(Number(row.quantity ?? 0))));
  }
  for (const row of params.rows) {
    const key = String(row.itemKey);
    const current = inventoryMap.get(key) ?? 0;
    if (params.mode === 'debit') {
      if (current < row.quantityDelta) {
        throw new TransferRunError(400, `Insufficient '${key}' quantity for transfer`);
      }
      const next = current - row.quantityDelta;
      if (next > 0) inventoryMap.set(key, next);
      else inventoryMap.delete(key);
    } else {
      inventoryMap.set(key, current + row.quantityDelta);
    }
  }
  params.stateDoc.storageItems = [...inventoryMap.entries()]
    .map(([itemKey, quantity]) => ({ itemKey, quantity }))
    .sort((a, b) => a.itemKey.localeCompare(b.itemKey));
}

function accrueUserBalanceInPlace(user: InstanceType<typeof User>, now: Date): number {
  const result = accrueBalanceFromTo({
    lastUpdatedMs: user.balance.lastUpdated.getTime(),
    toTimeMs: now.getTime(),
    ratePerSecond: user.balance.ratePerSecond,
    fractionalRemainder: user.balance.fractionalRemainder ?? 0,
  });
  const current = user.balance.total + result.wholeDollarsToAdd;
  user.balance.total = current;
  user.balance.fractionalRemainder = result.newFractionalRemainder;
  user.balance.lastUpdated = new Date(
    user.balance.lastUpdated.getTime() + result.roundedSecondsElapsed * 1000
  );
  return current;
}

export async function launchTransferRun(
  params: LaunchTransferRunParams
): Promise<{
  transferRunId: string;
  departAt: string;
  arriveAt: string;
  distanceDu: number;
  secondsPerDu: number;
  totalTravelSeconds: number;
  feeAmount: number;
  totalTransferValue: number;
  totalSenderCashDebit: number;
}> {
  const senderId = String(params.senderId ?? '').trim();
  const recipientId = String(params.recipientUserId ?? '').trim();
  if (senderId === '' || recipientId === '') {
    throw new TransferRunError(400, 'sender and recipient are required');
  }
  if (senderId === recipientId) {
    throw new TransferRunError(400, 'Cannot transfer to your own account');
  }

  const recipientTargetX = Number(params.recipientTargetX);
  const recipientTargetY = Number(params.recipientTargetY);
  if (!Number.isInteger(recipientTargetX) || !Number.isInteger(recipientTargetY)) {
    throw new TransferRunError(400, 'recipient target coordinates must be integer tile values');
  }

  const quote = buildTransferRunQuote({
    walletAmountRaw: params.walletAmount,
    requestedItemsRaw: params.items,
  });

  const senderCrewStatus = await CrewStatus.findOne({ userId: senderId }).lean();
  const recipientCrewStatus = await CrewStatus.findOne({ userId: recipientId }).lean();
  if (
    !senderCrewStatus?.isInCrew ||
    !recipientCrewStatus?.isInCrew ||
    !senderCrewStatus.crewId ||
    !recipientCrewStatus.crewId ||
    String(senderCrewStatus.crewId) !== String(recipientCrewStatus.crewId)
  ) {
    throw new TransferRunError(403, 'Sender and recipient must be in the same crew at launch');
  }

  const recipientTile = await getMapOccupantAtTile({ x: recipientTargetX, y: recipientTargetY });
  if (!recipientTile || recipientTile.occupiedBy !== 'player' || recipientTile.userId !== recipientId) {
    throw new TransferRunError(409, 'Recipient is no longer at the selected location');
  }

  const mapDoc = await MapModel.findOne({ name: 'main' }).lean();
  if (!mapDoc) {
    throw new TransferRunError(404, 'Main map not found');
  }

  const senderHouse = await (async () => {
    if ((mapDoc as { gridSize?: number }).gridSize === 500) {
      const row = await MapCell.findOne({
        mapId: (mapDoc as { _id: mongoose.Types.ObjectId })._id,
        userId: senderId,
        occupiedBy: 'player',
        entityName: { $ne: 'YOU' },
      })
        .lean()
        .select('x y');
      if (row) return { x: Number(row.x), y: Number(row.y) };
      const fallback = await MapCell.findOne({
        mapId: (mapDoc as { _id: mongoose.Types.ObjectId })._id,
        userId: senderId,
        occupiedBy: 'player',
      })
        .lean()
        .select('x y');
      return fallback ? { x: Number(fallback.x), y: Number(fallback.y) } : null;
    }
    const cells = Array.isArray((mapDoc as any).cells) ? ((mapDoc as any).cells as any[]) : [];
    const row =
      cells.find(
        (cell) =>
          String(cell.userId ?? '') === senderId &&
          cell.occupiedBy === 'player' &&
          String(cell.entityName ?? '') !== 'YOU'
      ) ??
      cells.find((cell) => String(cell.userId ?? '') === senderId && cell.occupiedBy === 'player');
    if (!row) return null;
    return { x: Number(row.x), y: Number(row.y) };
  })();

  if (!senderHouse) {
    throw new TransferRunError(404, 'Sender does not have a valid home location on map');
  }

  const distanceDu = distanceDuTileUnits(senderHouse.x, senderHouse.y, recipientTargetX, recipientTargetY);
  const totalTravelSeconds = Math.max(1, distanceDu * TRANSFER_SECONDS_PER_DU);
  const now = new Date();
  const arriveAt = new Date(now.getTime() + Math.ceil(totalTravelSeconds * 1000));
  const transferRunId = `transfer-${randomUUID()}`;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const activeCount = await TransferRun.countDocuments({
        senderId,
        state: 'outbound',
      }).session(session);
      if (activeCount >= TRANSFER_MAX_ACTIVE_PER_SENDER) {
        throw new TransferRunError(
          409,
          `Maximum ${TRANSFER_MAX_ACTIVE_PER_SENDER} active transfer runs per sender`
        );
      }

      const senderUser = await User.findById(senderId).session(session);
      const recipientUser = await User.findById(recipientId).session(session);
      if (!senderUser || !recipientUser) {
        throw new TransferRunError(404, 'Sender or recipient account not found');
      }

      const senderBalance = accrueUserBalanceInPlace(senderUser, now);
      if (senderBalance < quote.totalSenderCashDebit) {
        throw new TransferRunError(
          400,
          `Insufficient balance. Required $${quote.totalSenderCashDebit.toLocaleString()}`
        );
      }
      senderUser.balance.total = senderBalance - quote.totalSenderCashDebit;
      await senderUser.save({ session });

      const senderState = await getOrCreateUserBugHuntState({ userId: senderId, session });
      upsertStorageItems({
        stateDoc: senderState,
        rows: quote.itemPayload.map((row) => ({ itemKey: row.itemKey, quantityDelta: row.quantity })),
        mode: 'debit',
      });
      await senderState.save({ session });

      await TransferRun.create(
        [
          {
            transferRunId,
            senderId,
            recipientId,
            originX: senderHouse.x,
            originY: senderHouse.y,
            targetX: recipientTargetX,
            targetY: recipientTargetY,
            recipientTargetX,
            recipientTargetY,
            distanceDu,
            secondsPerDu: TRANSFER_SECONDS_PER_DU,
            totalTravelSeconds,
            walletAmount: quote.walletAmount,
            itemValueTotal: quote.itemValueTotal,
            totalTransferValue: quote.totalTransferValue,
            feeAmount: quote.feeAmount,
            itemPayload: quote.itemPayload,
            state: 'outbound',
            departAt: now,
            arriveAt,
          },
        ],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  return {
    transferRunId,
    departAt: now.toISOString(),
    arriveAt: arriveAt.toISOString(),
    distanceDu,
    secondsPerDu: TRANSFER_SECONDS_PER_DU,
    totalTravelSeconds,
    feeAmount: quote.feeAmount,
    totalTransferValue: quote.totalTransferValue,
    totalSenderCashDebit: quote.totalSenderCashDebit,
  };
}

async function settleTransferRunAsFailedOrCancelled(params: {
  session: mongoose.ClientSession;
  run: ITransferRunDocument;
  outcomeState: 'failed' | 'cancelled';
  failureReason?: string;
  cancelledByUserId?: string;
}): Promise<void> {
  const now = new Date();
  const senderUser = await User.findById(params.run.senderId).session(params.session);
  if (!senderUser) {
    throw new TransferRunError(500, 'Sender account missing during transfer settlement');
  }
  const senderBalance = accrueUserBalanceInPlace(senderUser, now);
  senderUser.balance.total = senderBalance + params.run.walletAmount;
  await senderUser.save({ session: params.session });

  if ((params.run.itemPayload ?? []).length > 0) {
    const senderState = await getOrCreateUserBugHuntState({
      userId: params.run.senderId,
      session: params.session,
    });
    upsertStorageItems({
      stateDoc: senderState,
      rows: params.run.itemPayload.map((row) => ({
        itemKey: row.itemKey,
        quantityDelta: row.quantity,
      })),
      mode: 'credit',
    });
    await senderState.save({ session: params.session });
  }

  params.run.state = params.outcomeState;
  params.run.resolvedAt = now;
  params.run.failureReason = params.failureReason;
  params.run.cancelledByUserId = params.cancelledByUserId;
  await params.run.save({ session: params.session });
}

async function settleTransferRunAsDelivered(params: {
  session: mongoose.ClientSession;
  run: ITransferRunDocument;
}): Promise<void> {
  const now = new Date();
  const recipientUser = await User.findById(params.run.recipientId).session(params.session);
  if (!recipientUser) {
    throw new TransferRunError(500, 'Recipient account missing during transfer settlement');
  }
  const recipientBalance = accrueUserBalanceInPlace(recipientUser, now);
  recipientUser.balance.total = recipientBalance + params.run.walletAmount;
  await recipientUser.save({ session: params.session });

  if ((params.run.itemPayload ?? []).length > 0) {
    const recipientState = await getOrCreateUserBugHuntState({
      userId: params.run.recipientId,
      session: params.session,
    });
    upsertStorageItems({
      stateDoc: recipientState,
      rows: params.run.itemPayload.map((row) => ({
        itemKey: row.itemKey,
        quantityDelta: row.quantity,
      })),
      mode: 'credit',
    });
    await recipientState.save({ session: params.session });
  }

  params.run.state = 'delivered';
  params.run.resolvedAt = now;
  params.run.failureReason = undefined;
  await params.run.save({ session: params.session });
}

export async function settleTransferRunArrival(transferRunId: string): Promise<void> {
  const run = await TransferRun.findOneAndUpdate(
    { transferRunId, state: 'outbound' },
    { $set: { state: 'resolving' } },
    { new: true }
  );
  if (!run) {
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const resolvingRun = await TransferRun.findOne({
        transferRunId,
        state: 'resolving',
      }).session(session);
      if (!resolvingRun) {
        return;
      }

      const recipientTile = await getMapOccupantAtTile({
        x: resolvingRun.recipientTargetX,
        y: resolvingRun.recipientTargetY,
      });
      const recipientStillValid =
        recipientTile != null &&
        recipientTile.occupiedBy === 'player' &&
        recipientTile.userId === String(resolvingRun.recipientId);

      if (!recipientStillValid) {
        await settleTransferRunAsFailedOrCancelled({
          session,
          run: resolvingRun,
          outcomeState: 'failed',
          failureReason: 'recipient-not-at-launch-tile',
        });
        return;
      }

      const recipientExists = await User.exists({ _id: resolvingRun.recipientId }).session(session);
      if (!recipientExists) {
        await settleTransferRunAsFailedOrCancelled({
          session,
          run: resolvingRun,
          outcomeState: 'failed',
          failureReason: 'recipient-invalid',
        });
        return;
      }

      await settleTransferRunAsDelivered({ session, run: resolvingRun });
    });
  } finally {
    session.endSession();
  }
}

export async function cancelOutboundTransferRun(params: {
  senderId: string;
  transferRunId: string;
}): Promise<void> {
  const senderId = String(params.senderId);
  const transferRunId = String(params.transferRunId);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const run = await TransferRun.findOne({
        transferRunId,
        senderId,
      }).session(session);
      if (!run) {
        throw new TransferRunError(404, 'Transfer run not found');
      }
      if (run.state !== 'outbound') {
        throw new TransferRunError(409, 'Only outbound transfer runs can be cancelled');
      }
      await settleTransferRunAsFailedOrCancelled({
        session,
        run,
        outcomeState: 'cancelled',
        cancelledByUserId: senderId,
      });
    });
  } finally {
    session.endSession();
  }
}

export async function settleDueTransferRunsOnce(): Promise<void> {
  if (transferRunSweepInFlight) {
    return;
  }
  transferRunSweepInFlight = true;
  try {
    const now = new Date();
    const due = await TransferRun.find({
      state: 'outbound',
      arriveAt: { $lte: now },
    })
      .select('transferRunId')
      .lean();
    for (const row of due) {
      await settleTransferRunArrival(String(row.transferRunId));
    }

    const staleResolvingCutoff = new Date(Date.now() - TRANSFER_RESOLVING_RECOVERY_MS);
    const staleResolvingRuns = await TransferRun.find({
      state: 'resolving',
      resolvedAt: { $exists: false },
      updatedAt: { $lte: staleResolvingCutoff },
    })
      .select('transferRunId')
      .lean();
    for (const row of staleResolvingRuns) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const run = await TransferRun.findOne({
            transferRunId: String(row.transferRunId),
            state: 'resolving',
          }).session(session);
          if (!run) {
            return;
          }
          await settleTransferRunAsFailedOrCancelled({
            session,
            run,
            outcomeState: 'failed',
            failureReason: 'resolving-recovery-timeout',
          });
        });
      } finally {
        session.endSession();
      }
    }
  } finally {
    transferRunSweepInFlight = false;
  }
}

export function startTransferRunDueSweepWatchdog(): void {
  if (transferRunSweepTimer != null) {
    return;
  }
  transferRunSweepTimer = setInterval(() => {
    void settleDueTransferRunsOnce().catch((error) => {
      console.error('Transfer run due sweep failed:', error);
    });
  }, TRANSFER_SWEEP_INTERVAL_MS);
}

