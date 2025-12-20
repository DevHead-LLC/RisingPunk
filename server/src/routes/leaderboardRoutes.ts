import express from 'express';
import { Request, Response } from 'express';
import { User } from '../models/User';
import auth from '../middleware/auth';

const router = express.Router();

interface LeaderboardCache {
  data: any;
  timestamp: Date;
}

const cache: Map<string, LeaderboardCache> = new Map();
const CACHE_DURATION = 15 * 60 * 1000;

const getCacheKey = (type: string, metric: string): string => {
  return `leaderboard:${type}:${metric}`;
};

const getNextQuarterHour = (): Date => {
  const now = new Date();
  const minutes = now.getMinutes();
  const nextQuarter = Math.ceil(minutes / 15) * 15;
  const nextTime = new Date(now);
  nextTime.setMinutes(nextQuarter, 0, 0);
  if (nextQuarter >= 60) {
    nextTime.setHours(nextTime.getHours() + 1);
    nextTime.setMinutes(0, 0, 0);
  }
  return nextTime;
};

const shouldInvalidateCache = (cacheTime: Date): boolean => {
  const now = new Date();
  const cacheMinutes = cacheTime.getMinutes();
  const cacheQuarter = Math.floor(cacheMinutes / 15);
  const nowMinutes = now.getMinutes();
  const nowQuarter = Math.floor(nowMinutes / 15);
  
  if (nowQuarter !== cacheQuarter) {
    return true;
  }
  
  if (now.getHours() !== cacheTime.getHours()) {
    return true;
  }
  
  if (now.getDate() !== cacheTime.getDate() || 
      now.getMonth() !== cacheTime.getMonth() || 
      now.getFullYear() !== cacheTime.getFullYear()) {
    return true;
  }
  
  return false;
};

router.get('/individual/bots-destroyed', auth, async (req: Request, res: Response) => {
  try {
    const cacheKey = getCacheKey('individual', 'botsDestroyed');
    const cached = cache.get(cacheKey);
    
    if (cached && !shouldInvalidateCache(cached.timestamp)) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < CACHE_DURATION) {
        res.json(cached.data);
        return;
      }
    }

    const users = await User.find({
      'battleStats.botsDestroyed': { $exists: true, $gt: 0 }
    })
      .select('handle level battleStats.botsDestroyed')
      .sort({ 'battleStats.botsDestroyed': -1 })
      .limit(10)
      .lean();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      handle: user.handle,
      level: user.level || 1,
      botsDestroyed: user.battleStats?.botsDestroyed || 0,
    }));

    const response = {
      users: leaderboard,
      lastUpdated: new Date(),
    };

    cache.set(cacheKey, {
      data: response,
      timestamp: new Date(),
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching bots destroyed leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

router.get('/individual/net-worth', auth, async (req: Request, res: Response) => {
  try {
    const cacheKey = getCacheKey('individual', 'netWorth');
    const cached = cache.get(cacheKey);
    
    if (cached && !shouldInvalidateCache(cached.timestamp)) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < CACHE_DURATION) {
        res.json(cached.data);
        return;
      }
    }

    const users = await User.find({
      'balance.total': { $exists: true, $gt: 0 }
    })
      .select('handle level balance.total')
      .sort({ 'balance.total': -1 })
      .limit(10)
      .lean();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      handle: user.handle,
      level: user.level || 1,
      netWorth: user.balance?.total || 0,
    }));

    const response = {
      users: leaderboard,
      lastUpdated: new Date(),
    };

    cache.set(cacheKey, {
      data: response,
      timestamp: new Date(),
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching net worth leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

export default router;

