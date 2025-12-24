import express from 'express';
import { Request, Response } from 'express';
import { User } from '../models/User';
import { Crew } from '../models/Crew';
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
      handle: user.handle || '',
      level: user.level || 1,
      botsDestroyed: user.battleStats?.botsDestroyed || 0,
    }));

    const response = {
      users: leaderboard || [],
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
      handle: user.handle || '',
      level: user.level || 1,
      netWorth: user.balance?.total || 0,
    }));

    const response = {
      users: leaderboard || [],
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

router.get('/crew/bots-destroyed', auth, async (req: Request, res: Response) => {
  try {
    const cacheKey = getCacheKey('crew', 'botsDestroyed');
    const cached = cache.get(cacheKey);
    
    if (cached && !shouldInvalidateCache(cached.timestamp)) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < CACHE_DURATION) {
        res.json(cached.data);
        return;
      }
    }

    const crews = await Crew.find({})
      .populate('presidentId', 'battleStats')
      .populate('members', 'battleStats')
      .populate('executives', 'battleStats');

    const crewStats = crews.map((crew) => {
      let totalBotsDestroyed = 0;
      const memberIds: any[] = [];

      if (crew.presidentId && typeof crew.presidentId === 'object' && crew.presidentId !== null) {
        memberIds.push(crew.presidentId);
        const president = crew.presidentId as any;
        if (president.battleStats && typeof president.battleStats === 'object') {
          totalBotsDestroyed += president.battleStats.botsDestroyed || 0;
        }
      }
      
      if (crew.members && Array.isArray(crew.members)) {
        crew.members.forEach((member: any) => {
          if (member && typeof member === 'object' && member !== null) {
            memberIds.push(member);
            if (member.battleStats && typeof member.battleStats === 'object') {
              totalBotsDestroyed += member.battleStats.botsDestroyed || 0;
            }
          }
        });
      }
      
      if (crew.executives && Array.isArray(crew.executives)) {
        crew.executives.forEach((executive: any) => {
          if (executive && typeof executive === 'object' && executive !== null) {
            memberIds.push(executive);
            if (executive.battleStats && typeof executive.battleStats === 'object') {
              totalBotsDestroyed += executive.battleStats.botsDestroyed || 0;
            }
          }
        });
      }

      return {
        crewId: (crew._id as any).toString(),
        crewName: crew.crewName,
        crewIdentifier: crew.crewIdentifier,
        totalBotsDestroyed,
        memberCount: memberIds.length,
      };
    }).filter(crew => crew.totalBotsDestroyed > 0)
      .sort((a, b) => b.totalBotsDestroyed - a.totalBotsDestroyed)
      .slice(0, 10);

    const leaderboard = crewStats.map((crew, index) => ({
      rank: index + 1,
      crewName: crew.crewName || '',
      crewIdentifier: crew.crewIdentifier || '',
      botsDestroyed: crew.totalBotsDestroyed || 0,
      memberCount: crew.memberCount || 0,
    }));

    const response = {
      crews: leaderboard || [],
      lastUpdated: new Date(),
    };

    cache.set(cacheKey, {
      data: response,
      timestamp: new Date(),
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching crew bots destroyed leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

router.get('/crew/net-worth', auth, async (req: Request, res: Response) => {
  try {
    const cacheKey = getCacheKey('crew', 'netWorth');
    const cached = cache.get(cacheKey);
    
    if (cached && !shouldInvalidateCache(cached.timestamp)) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < CACHE_DURATION) {
        res.json(cached.data);
        return;
      }
    }

    const crews = await Crew.find({})
      .populate('presidentId', 'balance.total')
      .populate('members', 'balance.total')
      .populate('executives', 'balance.total');

    const crewStats = crews.map((crew) => {
      let totalNetWorth = 0;
      const memberIds: any[] = [];

      if (crew.presidentId && typeof crew.presidentId === 'object' && crew.presidentId !== null) {
        memberIds.push(crew.presidentId);
        if ('balance' in crew.presidentId) {
          totalNetWorth += (crew.presidentId as any).balance?.total || 0;
        }
      }
      
      if (crew.members && Array.isArray(crew.members)) {
        crew.members.forEach((member: any) => {
          if (member && typeof member === 'object' && member !== null) {
            memberIds.push(member);
            if ('balance' in member) {
              totalNetWorth += member.balance?.total || 0;
            }
          }
        });
      }
      
      if (crew.executives && Array.isArray(crew.executives)) {
        crew.executives.forEach((executive: any) => {
          if (executive && typeof executive === 'object' && executive !== null) {
            memberIds.push(executive);
            if ('balance' in executive) {
              totalNetWorth += executive.balance?.total || 0;
            }
          }
        });
      }

      return {
        crewId: (crew._id as any).toString(),
        crewName: crew.crewName,
        crewIdentifier: crew.crewIdentifier,
        totalNetWorth,
        memberCount: memberIds.length,
      };
    }).filter(crew => crew.totalNetWorth > 0)
      .sort((a, b) => b.totalNetWorth - a.totalNetWorth)
      .slice(0, 10);

    const leaderboard = crewStats.map((crew, index) => ({
      rank: index + 1,
      crewName: crew.crewName || '',
      crewIdentifier: crew.crewIdentifier || '',
      netWorth: crew.totalNetWorth || 0,
      memberCount: crew.memberCount || 0,
    }));

    const response = {
      crews: leaderboard || [],
      lastUpdated: new Date(),
    };

    cache.set(cacheKey, {
      data: response,
      timestamp: new Date(),
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching crew net worth leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

export default router;

