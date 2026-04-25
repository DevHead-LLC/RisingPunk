import { ClientSession } from 'mongoose';
import { UserBugHuntState, type IUserBugHuntStateDocument } from '../models/UserBugHuntState';

export const ANT_BUG_HUNT_TOKEN_COST = 900;
export const BUG_HUNT_TOKEN_MAX = 5400;
export const BUG_HUNT_TOKEN_REGEN_PER_MINUTE = 5;

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

async function getOrCreateRegeneratedTokenState(params: {
  userId: string;
  session: ClientSession;
}): Promise<RegeneratedTokenState> {
  const { userId, session } = params;
  const now = new Date();
  const nowMs = now.getTime();
  const existing = await UserBugHuntState.findOne({ userId }).session(session);

  if (!existing) {
    const createdRows = await UserBugHuntState.create(
      [
        {
          userId,
          currentTokens: BUG_HUNT_TOKEN_MAX,
          maxTokens: BUG_HUNT_TOKEN_MAX,
          regenPerMinute: BUG_HUNT_TOKEN_REGEN_PER_MINUTE,
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

  const regenerated = applyMinuteRegen(
    {
      currentTokens: existing.currentTokens,
      maxTokens: existing.maxTokens,
      regenPerMinute: existing.regenPerMinute,
      lastRegenAt: existing.lastRegenAt,
    },
    nowMs
  );

  const shouldPersistRegen =
    regenerated.currentTokens !== existing.currentTokens ||
    regenerated.lastRegenAt.getTime() !== existing.lastRegenAt.getTime();

  if (shouldPersistRegen) {
    existing.currentTokens = regenerated.currentTokens;
    existing.lastRegenAt = regenerated.lastRegenAt;
    await existing.save({ session });
  }

  return {
    stateDoc: existing,
    currentTokens: regenerated.currentTokens,
    maxTokens: regenerated.maxTokens,
    regenPerMinute: regenerated.regenPerMinute,
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

