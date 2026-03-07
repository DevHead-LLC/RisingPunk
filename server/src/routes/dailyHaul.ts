import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { User } from '../models/User';
import {
  DAILY_HAUL_REWARDS,
  type DailyHaulDay,
  getWeekStartUtc,
  getNextResetUtc,
  getDayOfWeekUtc,
} from '../config/dailyHaulConfig';

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

/** Claim sequence is always 1 → 2 → … → 7. Next day = claimedLength + 1, capped by missed slots (7 - missedCount). */
function getNextClaimDayNum(claimedLength: number, missedCount: number): number | null {
  const next = claimedLength + 1;
  const maxClaimable = 7 - missedCount;
  return next <= maxClaimable ? next : null;
}

/** Missed tiers = calendar days that passed before today (never reduced by claiming). Mark off from 7 down: 7, 6, 5, … */
function getMarkedOffDays(todayDayNum: number): number[] {
  const calendarDaysPassed = todayDayNum - 1;
  const missedCount = Math.min(7, Math.max(0, calendarDaysPassed));
  const marked: number[] = [];
  for (let i = 0; i < missedCount; i++) {
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

    // Lazy cleanup: if we're in a new week, overwrite stored dailyHaul so we don't keep last week's data in the DB.
    if (!isSameWeek && user.dailyHaul) {
      user.dailyHaul = { weekStartUtc: weekStart, claimedDays: [], awardedAmounts: [] };
      await user.save();
    }

    const awardedAmounts: number[] = isSameWeek && Array.isArray(stored?.awardedAmounts) ? stored.awardedAmounts : [];
    const lastClaimedDateUtc = isSameWeek ? stored?.lastClaimedDateUtc : undefined;

    const todayDayNum = getDayOfWeekUtc(now);
    const todayStartUtc = getStartOfDayUtc(now);
    const markedOffDays = getMarkedOffDays(todayDayNum);
    const missedCount = markedOffDays.length;
    const nextClaimDay = getNextClaimDayNum(claimedDays.length, missedCount);
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

/** POST /api/daily-haul/claim — claim next day; credit balance; return amount, day, resetsAt, balance */
router.post('/claim', auth, async (req: Request, res: Response) => {
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
    const claimedDays: number[] = isSameWeek && Array.isArray(stored!.claimedDays) ? [...stored!.claimedDays] : [];
    const lastClaimedDateUtc = isSameWeek ? stored?.lastClaimedDateUtc : undefined;

    const todayDayNum = getDayOfWeekUtc(now);
    const todayStartUtc = getStartOfDayUtc(now);
    const markedOffDays = getMarkedOffDays(todayDayNum);
    const missedCount = markedOffDays.length;
    const nextClaimDay = getNextClaimDayNum(claimedDays.length, missedCount);
    const allowedToClaimToday = canClaimToday(lastClaimedDateUtc, todayStartUtc);

    if (nextClaimDay === null || !allowedToClaimToday) {
      res.status(400).json({ error: 'No claim available this week' });
      return;
    }

    const day = nextClaimDay as DailyHaulDay;
    const amount = rollReward(day);

    const existingAwarded = isSameWeek && Array.isArray(stored?.awardedAmounts) ? stored.awardedAmounts : [];
    if (!user.dailyHaul) {
      user.dailyHaul = { weekStartUtc: weekStart, claimedDays: [], awardedAmounts: [], lastClaimedDateUtc: todayStartUtc };
    }
    user.dailyHaul.weekStartUtc = weekStart;
    user.dailyHaul.claimedDays = [...claimedDays, day];
    user.dailyHaul.awardedAmounts = [...existingAwarded, amount];
    user.dailyHaul.lastClaimedDateUtc = todayStartUtc;

    user.balance.total += amount;
    user.balance.lastUpdated = new Date();
    await user.save();

    res.json({
      awardedAmount: amount,
      day,
      resetsAt: resetsAt.toISOString(),
      balance: {
        total: user.balance.total,
        ratePerSecond: user.balance.ratePerSecond,
        lastUpdated: user.balance.lastUpdated.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Daily haul claim error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
