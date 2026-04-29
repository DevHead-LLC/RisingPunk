import { ClientSession } from 'mongoose';
import { UserBugHuntState, type IUserBugHuntStateDocument } from '../models/UserBugHuntState';
import { UserResearchFeature } from '../models/UserResearchFeature';

export const ANT_BUG_HUNT_TOKEN_COST = 900;
export const BUG_HUNT_TOKEN_MAX = 5400;
export const BUG_HUNT_TOKEN_REGEN_PER_MINUTE = 5;
const HUNTING_TOKEN_MAX_FEATURE_ID = 'token-max-900';
const HUNTING_TOKEN_REGEN_FEATURE_ID = 'token-regen-1';

export class BugHuntTokenSpendError extends Error {
  constructor(
    public readonly statusCode: 409 | 500,
    message: string
  ) {
    super(message);
    this.name = 'BugHuntTokenSpendError';
  }
}

type TokenSnapshot = {
  currentTokens: number;
  maxTokens: number;
  regenPerMinute: number;
  lastRegenAt: Date;
};

type RegeneratedTokenState = TokenSnapshot & {
  stateDoc: IUserBugHuntStateDocument;
};

export async function resolveEffectiveBugHuntTokenConfig(params: {
  userId: string;
  session: ClientSession;
}): Promise<{ maxTokens: number; regenPerMinute: number }> {
  const { userId, session } = params;
  const unlockedRows = await UserResearchFeature.find({
    userId,
    categoryId: 'hunting',
    featureId: { $in: [HUNTING_TOKEN_MAX_FEATURE_ID, HUNTING_TOKEN_REGEN_FEATURE_ID] },
    isUnlocked: true,
  })
    .select('featureId')
    .session(session)
    .lean();
  const unlocked = new Set(unlockedRows.map((row) => String(row.featureId)));
  const maxTokens = BUG_HUNT_TOKEN_MAX + (unlocked.has(HUNTING_TOKEN_MAX_FEATURE_ID) ? 900 : 0);
  const regenPerMinute =
    BUG_HUNT_TOKEN_REGEN_PER_MINUTE + (unlocked.has(HUNTING_TOKEN_REGEN_FEATURE_ID) ? 1 : 0);
  return { maxTokens, regenPerMinute };
}

export async function getOrCreateUserBugHuntStateDocument(params: {
  userId: string;
  session: ClientSession;
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
  const state = created[0];
  if (!state) {
    throw new BugHuntTokenSpendError(500, 'Failed to initialize user bug-hunt state');
  }
  return state;
}

function applyMinuteRegen(snapshot: TokenSnapshot, nowMs: number): TokenSnapshot {
  const lastMs = snapshot.lastRegenAt.getTime();
  if (!Number.isFinite(lastMs) || lastMs <= 0) {
    throw new BugHuntTokenSpendError(500, 'Bug-hunt token state has invalid lastRegenAt');
  }
  if (nowMs <= lastMs) {
    return snapshot;
  }
  const elapsedMinutes = Math.floor((nowMs - lastMs) / 60_000);
  if (elapsedMinutes <= 0) {
    return snapshot;
  }

  const regained = elapsedMinutes * snapshot.regenPerMinute;
  const nextTokens = Math.min(snapshot.maxTokens, snapshot.currentTokens + regained);
  const nextLastRegenAt =
    nextTokens >= snapshot.maxTokens
      ? new Date(nowMs)
      : new Date(lastMs + elapsedMinutes * 60_000);

  return {
    ...snapshot,
    currentTokens: nextTokens,
    lastRegenAt: nextLastRegenAt,
  };
}

export function resolveRegeneratedTokenSnapshotFromPersistedState(params: {
  currentTokensRaw: unknown;
  maxTokensRaw: unknown;
  regenPerMinuteRaw: unknown;
  lastRegenAt: Date | null | undefined;
  syncedMaxTokens: number;
  syncedRegenPerMinute: number;
  now: Date;
}): TokenSnapshot {
  const persistedSnapshot: TokenSnapshot = {
    currentTokens: Math.max(0, Math.floor(Number(params.currentTokensRaw ?? 0))),
    maxTokens: Math.max(1, Math.floor(Number(params.maxTokensRaw ?? 0))),
    regenPerMinute: Math.max(0, Math.floor(Number(params.regenPerMinuteRaw ?? 0))),
    lastRegenAt: params.lastRegenAt instanceof Date ? params.lastRegenAt : new Date(NaN),
  };
  const regenerated = applyMinuteRegen(persistedSnapshot, params.now.getTime());
  const syncedMaxTokens = Math.max(1, Math.floor(Number(params.syncedMaxTokens)));
  const syncedRegenPerMinute = Math.max(0, Math.floor(Number(params.syncedRegenPerMinute)));
  const syncedCurrentTokens = Math.min(syncedMaxTokens, Math.max(0, Math.floor(regenerated.currentTokens)));
  return {
    currentTokens: syncedCurrentTokens,
    maxTokens: syncedMaxTokens,
    regenPerMinute: syncedRegenPerMinute,
    lastRegenAt: regenerated.lastRegenAt,
  };
}

async function getOrCreateRegeneratedTokenState(params: {
  userId: string;
  session: ClientSession;
}): Promise<RegeneratedTokenState> {
  const { userId, session } = params;
  const now = new Date();
  const nowMs = now.getTime();
  const effectiveConfig = await resolveEffectiveBugHuntTokenConfig({ userId, session });
  const existing = await UserBugHuntState.findOne({ userId }).session(session);

  if (!existing) {
    const createdRows = await UserBugHuntState.create(
      [
        {
          userId,
          currentTokens: effectiveConfig.maxTokens,
          maxTokens: effectiveConfig.maxTokens,
          regenPerMinute: effectiveConfig.regenPerMinute,
          lastRegenAt: now,
        },
      ],
      { session }
    );
    const created = createdRows[0];
    if (!created) {
      throw new BugHuntTokenSpendError(500, 'Failed to initialize bug-hunt token state');
    }
    return {
      stateDoc: created,
      currentTokens: created.currentTokens,
      maxTokens: created.maxTokens,
      regenPerMinute: created.regenPerMinute,
      lastRegenAt: created.lastRegenAt,
    };
  }

  // Regen elapsed time using the persisted historical config to avoid
  // retroactively applying newly unlocked research to minutes before unlock.
  const regenerated = applyMinuteRegen(
    {
      currentTokens: existing.currentTokens,
      maxTokens: existing.maxTokens,
      regenPerMinute: existing.regenPerMinute,
      lastRegenAt: existing.lastRegenAt,
    },
    nowMs
  );
  const syncedMaxTokens = effectiveConfig.maxTokens;
  const syncedRegenPerMinute = effectiveConfig.regenPerMinute;
  const syncedCurrentTokens = Math.min(syncedMaxTokens, regenerated.currentTokens);

  const shouldPersistRegen =
    syncedCurrentTokens !== existing.currentTokens ||
    regenerated.lastRegenAt.getTime() !== existing.lastRegenAt.getTime() ||
    syncedMaxTokens !== existing.maxTokens ||
    syncedRegenPerMinute !== existing.regenPerMinute;

  if (shouldPersistRegen) {
    existing.currentTokens = syncedCurrentTokens;
    existing.maxTokens = syncedMaxTokens;
    existing.regenPerMinute = syncedRegenPerMinute;
    existing.lastRegenAt = regenerated.lastRegenAt;
    await existing.save({ session });
  }

  return {
    stateDoc: existing,
    currentTokens: syncedCurrentTokens,
    maxTokens: syncedMaxTokens,
    regenPerMinute: syncedRegenPerMinute,
    lastRegenAt: regenerated.lastRegenAt,
  };
}

export async function readBugHuntTokens(params: {
  userId: string;
  session: ClientSession;
}): Promise<{
  currentTokens: number;
  maxTokens: number;
  regenPerMinute: number;
  lastRegenAt: Date;
}> {
  const state = await getOrCreateRegeneratedTokenState(params);
  return {
    currentTokens: state.currentTokens,
    maxTokens: state.maxTokens,
    regenPerMinute: state.regenPerMinute,
    lastRegenAt: state.lastRegenAt,
  };
}

export async function spendAntBugHuntTokensAtLaunch(params: {
  userId: string;
  session: ClientSession;
}): Promise<{ tokensRemaining: number }> {
  const { userId, session } = params;
  const regenerated = await getOrCreateRegeneratedTokenState({ userId, session });
  if (regenerated.currentTokens < ANT_BUG_HUNT_TOKEN_COST) {
    throw new BugHuntTokenSpendError(
      409,
      `Insufficient hunt tokens (${regenerated.currentTokens}/${ANT_BUG_HUNT_TOKEN_COST} required)`
    );
  }
  const nextTokens = regenerated.currentTokens - ANT_BUG_HUNT_TOKEN_COST;
  regenerated.stateDoc.currentTokens = nextTokens;
  regenerated.stateDoc.maxTokens = regenerated.maxTokens;
  regenerated.stateDoc.regenPerMinute = regenerated.regenPerMinute;
  regenerated.stateDoc.lastRegenAt = regenerated.lastRegenAt;
  await regenerated.stateDoc.save({ session });

  return { tokensRemaining: nextTokens };
}

export async function refundAntBugHuntTokensForFailedMarch(params: {
  userId: string;
  session: ClientSession;
}): Promise<{ tokensAfterRefund: number; refundedAmount: number }> {
  const { userId, session } = params;
  const regenerated = await getOrCreateRegeneratedTokenState({ userId, session });
  const refundableCapacity = regenerated.maxTokens - regenerated.currentTokens;
  if (refundableCapacity <= 0) {
    return { tokensAfterRefund: regenerated.currentTokens, refundedAmount: 0 };
  }

  const refundedAmount = Math.min(ANT_BUG_HUNT_TOKEN_COST, refundableCapacity);
  const tokensAfterRefund = regenerated.currentTokens + refundedAmount;
  regenerated.stateDoc.currentTokens = tokensAfterRefund;
  regenerated.stateDoc.maxTokens = regenerated.maxTokens;
  regenerated.stateDoc.regenPerMinute = regenerated.regenPerMinute;
  regenerated.stateDoc.lastRegenAt = regenerated.lastRegenAt;
  await regenerated.stateDoc.save({ session });

  return { tokensAfterRefund, refundedAmount };
}

