/**
 * @file PvPBattleMoneyService.ts
 * @description Transfers wallet funds from defender to attacker when attacker wins a user-vs-user battle.
 */

import mongoose from 'mongoose';
import { Battle } from '../models/Battle';
import { User } from '../models/User';
import { IBattalion, NodeOwner } from '../types/battle';
import { accrueBalanceFromTo } from '../utils/balanceAccrual';
import { LifetimeHighNetWorthService } from './LifetimeHighNetWorthService';

/** Defender wallet below this with zero survivors → attacker takes 100% (not 15%). */
export const PVP_WALLET_LOW_THRESHOLD = 50_000;

export function defenderHasSurvivingTroops(battalions: IBattalion[]): boolean {
  for (const b of battalions) {
    if (b.owner !== NodeOwner.ENEMY) continue;
    if (b.isDestroyed) continue;
    if ((b.quantity ?? 0) > 0) return true;
  }
  return false;
}

/**
 * Compute dollars taken from defender wallet (integer). Uses post-accrual defender total.
 */
export function computePvPTransferAmount(defenderWalletTotal: number, hasSurvivors: boolean): number {
  if (defenderWalletTotal <= 0) return 0;
  if (hasSurvivors) {
    return Math.floor(defenderWalletTotal * 0.1);
  }
  if (defenderWalletTotal < PVP_WALLET_LOW_THRESHOLD) {
    return defenderWalletTotal;
  }
  return Math.floor(defenderWalletTotal * 0.15);
}

export interface PvPBattleMoneyResult {
  transferredAmount: number;
}

/**
 * Apply PvP wallet transfer once per battle. Idempotent via battle.pvpMoneyTransfer.processedAt.
 * Only when isUserDefender, attacker won (winner === USER), and amount > 0 after rules.
 */
export async function processPvPBattleMoneyTransfer(battleId: string): Promise<PvPBattleMoneyResult> {
  const existing = await Battle.findOne({ battleId }).select('pvpMoneyTransfer isUserDefender winner').lean();
  if (!existing) {
    return { transferredAmount: 0 };
  }
  if (!existing.isUserDefender) {
    return { transferredAmount: 0 };
  }
  if ((existing as any).pvpMoneyTransfer?.processedAt != null) {
    const amt = (existing as any).pvpMoneyTransfer?.amount;
    return { transferredAmount: typeof amt === 'number' ? amt : 0 };
  }
  if (existing.winner !== NodeOwner.USER) {
    await markPvPProcessedZero(battleId);
    return { transferredAmount: 0 };
  }

  const battle = await Battle.findOne({ battleId });
  if (!battle) {
    return { transferredAmount: 0 };
  }

  const hasSurvivors = defenderHasSurvivingTroops(battle.battalions ?? []);

  const attackerId = battle.attackerId;
  const defenderId = battle.defenderId;
  if (!attackerId || !defenderId || String(attackerId) === String(defenderId)) {
    await markPvPProcessedZero(battleId);
    return { transferredAmount: 0 };
  }

  const session = await mongoose.startSession();

  try {
    let transferredAmount = 0;

    await session.withTransaction(async () => {
      const battleInTxn = await Battle.findOne({ battleId }).session(session);
      if (!battleInTxn) {
        throw new Error('Battle not found in transaction');
      }
      if ((battleInTxn as any).pvpMoneyTransfer?.processedAt != null) {
        transferredAmount = (battleInTxn as any).pvpMoneyTransfer?.amount ?? 0;
        return;
      }

      const defender = await User.findById(defenderId).session(session);
      const attacker = await User.findById(attackerId).session(session);
      if (!defender || !attacker) {
        throw new Error('Attacker or defender user missing');
      }

      const now = new Date();

      const defAcc = accrueBalanceFromTo({
        lastUpdatedMs: defender.balance.lastUpdated.getTime(),
        toTimeMs: now.getTime(),
        ratePerSecond: defender.balance.ratePerSecond,
        fractionalRemainder: defender.balance.fractionalRemainder ?? 0,
      });
      const defenderTotal = defender.balance.total + defAcc.wholeDollarsToAdd;

      const amount = computePvPTransferAmount(defenderTotal, hasSurvivors);

      if (amount <= 0) {
        (battleInTxn as any).pvpMoneyTransfer = { amount: 0, processedAt: now };
        await battleInTxn.save({ session });
        transferredAmount = 0;
        return;
      }

      const newDefenderTotal = Math.max(0, defenderTotal - amount);
      defender.balance.total = newDefenderTotal;
      defender.balance.fractionalRemainder = defAcc.newFractionalRemainder;
      defender.balance.lastUpdated = new Date(
        defender.balance.lastUpdated.getTime() + defAcc.roundedSecondsElapsed * 1000
      );
      LifetimeHighNetWorthService.checkAndUpdateLifetimeHigh(defender);

      const atkAcc = accrueBalanceFromTo({
        lastUpdatedMs: attacker.balance.lastUpdated.getTime(),
        toTimeMs: now.getTime(),
        ratePerSecond: attacker.balance.ratePerSecond,
        fractionalRemainder: attacker.balance.fractionalRemainder ?? 0,
      });
      const attackerTotal = attacker.balance.total + atkAcc.wholeDollarsToAdd;
      attacker.balance.total = attackerTotal + amount;
      attacker.balance.fractionalRemainder = atkAcc.newFractionalRemainder;
      attacker.balance.lastUpdated = new Date(
        attacker.balance.lastUpdated.getTime() + atkAcc.roundedSecondsElapsed * 1000
      );
      LifetimeHighNetWorthService.checkAndUpdateLifetimeHigh(attacker);

      await defender.save({ session });
      await attacker.save({ session });

      (battleInTxn as any).pvpMoneyTransfer = { amount, processedAt: now };
      await battleInTxn.save({ session });

      transferredAmount = amount;
    });

    return { transferredAmount };
  } catch (e) {
    console.error('PvPBattleMoneyService.processPvPBattleMoneyTransfer', battleId, e);
    return { transferredAmount: 0 };
  } finally {
    session.endSession();
  }
}

async function markPvPProcessedZero(battleId: string): Promise<void> {
  try {
    await Battle.updateOne(
      { battleId, isUserDefender: true, 'pvpMoneyTransfer.processedAt': { $exists: false } },
      { $set: { pvpMoneyTransfer: { amount: 0, processedAt: new Date() } } }
    );
  } catch (e) {
    console.error('PvPBattleMoneyService.markPvPProcessedZero', battleId, e);
  }
}
