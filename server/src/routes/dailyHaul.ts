import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { User } from '../models/User';
import {
  DAILY_HAUL_REWARDS,
  type DailyHaulDay,
  getWeekStartUtc,
  getNextResetUtc,
  getDayOfWeekUtc,
} from '../config/dailyHaulConfig';
import { accrueBalanceToTime } from '../utils/balanceAccrual';

const router = express.Router();

/** Start of the given date in UTC (00:00:00.000). */
function getStartOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

/**
 * Claim sequence is always 1 → 2 → … → 7. Next day = claimedLength + 1.
 * Cap: maxClaimable = 7 - missedOpportunities, where missedOpportunities = calendar days
 * that passed without a claim (so users who claim every day can reach day 7).
 */
function getNextClaimDayNum(claimedLength: number, todayDayNum: number): number | null {
  const calendarDaysPassed = todayDayNum - 1;
  const missedOpportunities = Math.max(0, calendarDaysPassed - claimedLength);
  const maxClaimable = 7 - missedOpportunities;
  const next = claimedLength + 1;
  return next <= maxClaimable ? next : null;
}

/** Display only: red X count = calendar days that have passed. Never reduced when you claim — red X's once placed stay until Monday 00:00 UTC reset. Marks top N from 7 down (7, 6, 5, …). So Saturday = 5 X's on 7–3; after claiming Day 1, still 5 X's, Day 3 keeps its X. */
function getMarkedOffDays(todayDayNum: number): number[] {
  const calendarDaysPassed = Math.min(7, Math.max(0, todayDayNum - 1));
  const marked: number[] = [];
  for (let i = 0; i < calendarDaysPassed; i++) {
    marked.push(7 - i);
  }
  return marked;
}

/** User can only claim once per UTC calendar day. */
function canClaimToday(lastClaimedDateUtc: Date | undefined, todayStartUtc: Date): boolean {
  if (lastClaimedDateUtc == null) return true;
  return todayStartUtc.getTime() > new Date(lastClaimedDateUtc).getTime();
}

function getRewardForDay(day: DailyHaulDay): { min?: number; max?: number; flat?: number } {
  const key = `day${day}` as keyof typeof DAILY_HAUL_REWARDS;
  const config = DAILY_HAUL_REWARDS[key];
  if ('flat' in config) return { flat: config.flat };
  return { min: config.min, max: config.max };
}

function rollReward(day: DailyHaulDay): number {
  const config = getRewardForDay(day);
  if (config.flat !== undefined) return config.flat;
  const min = config.min!;
  const max = config.max!;
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** GET /api/daily-haul/status — resets at, next claim day, can claim, reward info, marked off days */
router.get('/status', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const now = new Date();
    const weekStart = getWeekStartUtc(now);
    const resetsAt = getNextResetUtc(now);

    const stored = user.dailyHaul;
    const isSameWeek = stored?.weekStartUtc && new Date(stored.weekStartUtc).getTime() === weekStart.getTime();
    const claimedDays: number[] = isSameWeek && Array.isArray(stored!.claimedDays) ? stored!.claimedDays : [];

    // Lazy cleanup: only set new-week empty state when the document still has the old week (or no dailyHaul). Uses conditional findOneAndUpdate so we never overwrite a concurrent claim that already wrote new week data.
    if (!isSameWeek) {
      await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { dailyHaul: null },
            { dailyHaul: { $exists: false } },
            { 'dailyHaul.weekStartUtc': { $ne: weekStart } },
          ],
        },
        {
          $set: {
            dailyHaul: {
              weekStartUtc: weekStart,
              claimedDays: [],
              awardedAmounts: [],
            },
          },
        }
      );
    }

    const awardedAmounts: number[] = isSameWeek && Array.isArray(stored?.awardedAmounts) ? stored.awardedAmounts : [];
    const lastClaimedDateUtc = isSameWeek ? stored?.lastClaimedDateUtc : undefined;

    const todayDayNum = getDayOfWeekUtc(now);
    const todayStartUtc = getStartOfDayUtc(now);
    const markedOffDays = getMarkedOffDays(todayDayNum);
    const nextClaimDay = getNextClaimDayNum(claimedDays.length, todayDayNum);
    const allowedToClaimToday = canClaimToday(lastClaimedDateUtc, todayStartUtc);
    const canClaim = nextClaimDay !== null && allowedToClaimToday;

    let rewardLabel: string;
    let rewardMin: number | undefined;
    let rewardMax: number | undefined;
    let rewardFlat: number | undefined;
    if (nextClaimDay !== null) {
      const reward = getRewardForDay(nextClaimDay as DailyHaulDay);
      if (reward.flat !== undefined) {
        rewardLabel = `$${reward.flat.toLocaleString()}`;
        rewardFlat = reward.flat;
      } else {
        rewardLabel = `$${reward.min!.toLocaleString()} – $${reward.max!.toLocaleString()}`;
        rewardMin = reward.min;
        rewardMax = reward.max;
      }
    } else {
      rewardLabel = '';
    }

    res.json({
      resetsAt: resetsAt.toISOString(),
      nextClaimDay,
      canClaim,
      rewardLabel,
      rewardMin,
      rewardMax,
      rewardFlat,
      claimedDays,
      awardedAmounts,
      markedOffDays,
    });
  } catch (error: unknown) {
    console.error('Daily haul status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/daily-haul/claim — claim next day; credit balance; return amount, day, resetsAt, balance. Uses transaction + atomic findOneAndUpdate to prevent double reward on concurrent requests. */
router.post('/claim', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const now = new Date();
    const weekStart = getWeekStartUtc(now);
    const resetsAt = getNextResetUtc(now);
    const todayStartUtc = getStartOfDayUtc(now);
    const todayDayNum = getDayOfWeekUtc(now);

    const session = await mongoose.startSession();
    let updatedUser: InstanceType<typeof User> | null = null;
    let awardedAmount = 0;
    let claimedDay: DailyHaulDay = 1;

    try {
      await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error('User not found');
        }

        const stored = user.dailyHaul;
        const isSameWeek = stored?.weekStartUtc && new Date(stored.weekStartUtc).getTime() === weekStart.getTime();
        const claimedDays: number[] = isSameWeek && Array.isArray(stored!.claimedDays) ? stored!.claimedDays : [];
        const lastClaimedDateUtc = isSameWeek ? stored?.lastClaimedDateUtc : undefined;

        const nextClaimDay = getNextClaimDayNum(claimedDays.length, todayDayNum);
        const allowedToClaimToday = canClaimToday(lastClaimedDateUtc, todayStartUtc);

        if (nextClaimDay === null || !allowedToClaimToday) {
          throw new Error('No claim available this week');
        }

        const day = nextClaimDay as DailyHaulDay;
        const amount = rollReward(day);
        awardedAmount = amount;
        claimedDay = day;

        const accrued = accrueBalanceToTime(
          user.balance?.total ?? 0,
          user.balance?.ratePerSecond ?? 0,
          user.balance?.lastUpdated ?? now,
          user.balance?.fractionalRemainder ?? 0,
          now
        );
        const newBalanceTotal = accrued.total + amount;

        const lastClaimedFilter = {
          $or: [
            { 'dailyHaul.lastClaimedDateUtc': null },
            { 'dailyHaul.lastClaimedDateUtc': { $exists: false } },
            { 'dailyHaul.lastClaimedDateUtc': { $lt: todayStartUtc } },
          ],
        };

        let result: InstanceType<typeof User> | null = null;

        if (isSameWeek) {
          const sameWeekFilter: mongoose.FilterQuery<InstanceType<typeof User>> = {
            _id: userId,
            'dailyHaul.weekStartUtc': weekStart,
            $expr: { $eq: [{ $size: { $ifNull: ['$dailyHaul.claimedDays', []] } }, day - 1] },
            ...lastClaimedFilter,
          };
          result = await User.findOneAndUpdate(
            sameWeekFilter,
            {
              $set: {
                'dailyHaul.lastClaimedDateUtc': todayStartUtc,
                'balance.total': newBalanceTotal,
                'balance.lastUpdated': accrued.lastUpdated,
                'balance.fractionalRemainder': accrued.fractionalRemainder,
              },
              $push: {
                'dailyHaul.claimedDays': day,
                'dailyHaul.awardedAmounts': amount,
              },
            },
            { session, new: true }
          );
        }

        if (!result && day === 1) {
          // Match user in new week (or no dailyHaul) who can claim today. We $set dailyHaul to new week's data, so we do not require claimedDays length 0 — old week's claimedDays are overwritten.
          const newWeekFilter: mongoose.FilterQuery<InstanceType<typeof User>> = {
            _id: userId,
            $and: [
              {
                $or: [
                  { dailyHaul: null },
                  { dailyHaul: { $exists: false } },
                  { 'dailyHaul.weekStartUtc': { $ne: weekStart } },
                ],
              },
              lastClaimedFilter,
            ],
          };
          result = await User.findOneAndUpdate(
            newWeekFilter,
            {
              $set: {
                dailyHaul: {
                  weekStartUtc: weekStart,
                  claimedDays: [day],
                  awardedAmounts: [amount],
                  lastClaimedDateUtc: todayStartUtc,
                },
                'balance.total': newBalanceTotal,
                'balance.lastUpdated': accrued.lastUpdated,
                'balance.fractionalRemainder': accrued.fractionalRemainder,
              },
            },
            { session, new: true }
          );
        }

        if (!result) {
          throw new Error('Claim conflict');
        }
        updatedUser = result;
      });
    } finally {
      await session.endSession();
    }

    if (!updatedUser) {
      res.status(500).json({ error: 'Server error' });
      return;
    }

    const user = updatedUser as InstanceType<typeof User>;
    res.json({
      awardedAmount,
      day: claimedDay,
      resetsAt: resetsAt.toISOString(),
      balance: {
        total: user.balance.total,
        ratePerSecond: user.balance.ratePerSecond,
        lastUpdated: user.balance.lastUpdated.toISOString(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (error.message === 'No claim available this week' || error.message === 'Claim conflict') {
        res.status(400).json({ error: 'No claim available this week' });
        return;
      }
    }
    console.error('Daily haul claim error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
