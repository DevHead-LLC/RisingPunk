import express from 'express';
import { User, IUser } from '../models/User';
import { ShieldService } from '../services/ShieldService';
import auth from '../middleware/auth';
import { Request, Response } from 'express';
import { FinanceTier } from '../models/Finance';
import { FinanceTemplate } from '../models/FinanceTemplate';
import mongoose from 'mongoose';
import { UserTaskProgress } from '../models/UserTaskProgress';
import { getTaskList } from '../config/taskListData';
import {
  getPropertyBuildLevelConfig,
  getPropertyMaxLevel,
  getRentalPropertyConfig,
  getRoomRemodelLevelConfig,
} from '../services/RentalPropertyConfigService';
import { getResearchCenterLevelConfig, getResearchCenterMaxLevel, type ResearchCenterLevel } from '../config/researchCenterConfig';
import { RentalHousingIncomeService } from '../services/RentalHousingIncomeService';
import { RentalHousingSyncService } from '../services/RentalHousingSyncService';
import { accrueBalanceToTime } from '../utils/balanceAccrual';
import { removeCrewBackupRequestForJob } from '../services/CrewBackupService';

interface UpdatePreferencesRequest extends Request {
  body: {
    profileGender?: 'male' | 'female';
  }
}

const router = express.Router();

/**
 * Look up a user by handle (exact match, case-insensitive).
 * Used by the app for "search user" to open a profile from any screen.
 * Returns 404 if no user found.
 */
router.get('/lookup', auth, async (req: Request, res: Response) => {
  try {
    const handleParam = req.query.handle;
    if (typeof handleParam !== 'string' || !handleParam.trim()) {
      res.status(400).json({ error: 'Handle is required' });
      return;
    }
    const trimmed = handleParam.trim();
    const user = await User.findOne({
      handle: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })
      .select('_id handle')
      .lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      userId: String(user._id),
      handle: (user as any).handle,
    });
  } catch (error) {
    console.error('Server error in user lookup:', error);
    res.status(500).json({ error: 'Error looking up user' });
  }
});

const markResearchCenterTaskCompleted = async (userId: string | mongoose.Types.ObjectId) => {
  try {
    const taskList = getTaskList();
    const buildResearchCenterTask = taskList.find(task => task.id === 'build-research-center');
    
    if (!buildResearchCenterTask) {
      return;
    }

    const userIdObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const progress = await UserTaskProgress.findOne({ userId: userIdObjectId });
    if (!progress) {
      return;
    }

    const completedTaskIds = new Set(progress.completedTasks.map(t => t.taskId));
    const collectedTaskIds = new Set(progress.collectedTasks || []);
    const skippedTaskIds = new Set(progress.skippedTasks || []);

    if (collectedTaskIds.has('build-research-center') || skippedTaskIds.has('build-research-center') || completedTaskIds.has('build-research-center')) {
      return;
    }

    await UserTaskProgress.findOneAndUpdate(
      {
        userId: userIdObjectId,
        'completedTasks.taskId': { $ne: 'build-research-center' }
      },
      {
        $push: {
          completedTasks: {
            taskId: 'build-research-center',
            completedAt: new Date()
          }
        },
        $set: { lastCompletedTaskId: 'build-research-center' }
      },
      { new: true }
    );
  } catch (error) {
    console.error('Error marking research center task as completed:', error);
  }
};

const markInvestmentPropertyTaskCompleted = async (userId: string | mongoose.Types.ObjectId) => {
  try {
    const taskList = getTaskList();
    const buildInvestmentPropertyTask = taskList.find(task => task.id === 'build-investment-property');
    
    if (!buildInvestmentPropertyTask) {
      return;
    }

    const userIdObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const progress = await UserTaskProgress.findOne({ userId: userIdObjectId });
    if (!progress) {
      return;
    }

    const completedTaskIds = new Set(progress.completedTasks.map(t => t.taskId));
    const collectedTaskIds = new Set(progress.collectedTasks || []);
    const skippedTaskIds = new Set(progress.skippedTasks || []);

    if (collectedTaskIds.has('build-investment-property') || skippedTaskIds.has('build-investment-property') || completedTaskIds.has('build-investment-property')) {
      return;
    }

    await UserTaskProgress.findOneAndUpdate(
      {
        userId: userIdObjectId,
        'completedTasks.taskId': { $ne: 'build-investment-property' }
      },
      {
        $push: {
          completedTasks: {
            taskId: 'build-investment-property',
            completedAt: new Date()
          }
        },
        $set: { lastCompletedTaskId: 'build-investment-property' }
      },
      { new: true }
    );
  } catch (error) {
    console.error('Error marking investment property task as completed:', error);
  }
};

router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('handle email level experience unlockedFeatures profileGender battleStats totalGuardiansBuilt crewBackupHelpCount isGuest hashedAccessKey');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      handle: user.handle,
      email: user.getDecryptedEmail(),
      level: user.level,
      experience: {
        current: user.experience?.current || 0,
        nextLevel: user.experience?.nextLevel || 1000,
        total: user.experience?.total || 0
      },
      unlockedFeatures: {
        hackRig: user.unlockedFeatures?.hackRig || false,
        researchCenter: user.unlockedFeatures?.researchCenter || false,
        programmingFacility: user.unlockedFeatures?.programmingFacility || false
      },
      profileGender: user.profileGender || 'male',
      emailVerified: user.emailVerified || false,
      emailVerificationToken: user.emailVerificationToken || null,
      emailVerificationPrompted: user.emailVerificationPrompted || false,
      battleStats: {
        botsDestroyed: user.battleStats?.botsDestroyed || 0,
        botsLost: user.battleStats?.botsLost || 0,
        successfulAttacks: user.battleStats?.successfulAttacks || 0,
        failedAttacks: user.battleStats?.failedAttacks || 0,
        successfulDefenses: user.battleStats?.successfulDefenses || 0,
        failedDefenses: user.battleStats?.failedDefenses || 0
      },
      crewBackupHelpCount: user.crewBackupHelpCount ?? 0,
      totalGuardiansBuilt: user.totalGuardiansBuilt || 0,
      isGuest: user.isGuest || false,
      hasPassword: !!(user as any).hashedAccessKey
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

router.get('/profile/:userId', auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const user = await User.findById(userId).select('handle level profileGender battleStats crewBackupHelpCount');
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      userId: String(user._id),
      handle: user.handle,
      level: user.level,
      profileGender: user.profileGender || 'male',
      battleStats: {
        botsDestroyed: user.battleStats?.botsDestroyed || 0,
        botsLost: user.battleStats?.botsLost || 0,
        successfulAttacks: user.battleStats?.successfulAttacks || 0,
        failedAttacks: user.battleStats?.failedAttacks || 0,
        successfulDefenses: user.battleStats?.successfulDefenses || 0,
        failedDefenses: user.battleStats?.failedDefenses || 0
      },
      crewBackupHelpCount: user.crewBackupHelpCount ?? 0
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

router.get('/shield-status/:userId', auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    const user = await User.findById(userId).select('handle antivirusShield');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Use ShieldService to check and update shield status
    const isActive = await ShieldService.checkAndUpdateShieldStatus(user);

    res.json({
      userId: user._id,
      handle: user.handle,
      antivirusShield: {
        active: isActive,
        startedAt: isActive ? user.antivirusShield?.startedAt || null : null,
        completesAt: isActive ? user.antivirusShield?.completesAt || null : null,
        cooldownUntil: user.antivirusShield?.cooldownUntil || null
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error fetching user shield status' });
  }
});

router.post('/unlock-hack-rig', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'unlockedFeatures.hackRig': true },
      { new: true, select: 'handle email level unlockedFeatures' }
    );
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      handle: user.handle,
      email: user.getDecryptedEmail(),
      level: user.level,
      unlockedFeatures: {
        hackRig: user.unlockedFeatures?.hackRig || false,
        researchCenter: user.unlockedFeatures?.researchCenter || false,
        programmingFacility: user.unlockedFeatures?.programmingFacility || false
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error unlocking hack rig' });
  }
});

const PROGRAMMING_FACILITY_UNLOCK_COST = 1_000_000;

router.post('/unlock-programming-facility', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    if (user.level < 20) {
      res.status(403).json({ message: 'Programming Facility unlocks at level 20.' });
      return;
    }
    if (user.unlockedFeatures?.programmingFacility) {
      res.status(400).json({ message: 'Programming Facility is already unlocked.' });
      return;
    }
    const now = new Date();
    const bal = user.balance;
    const accrued = accrueBalanceToTime(
      bal?.total ?? 0,
      bal?.ratePerSecond ?? 0,
      bal?.lastUpdated ?? now,
      bal?.fractionalRemainder ?? 0,
      now
    );
    if (accrued.total < PROGRAMMING_FACILITY_UNLOCK_COST) {
      res.status(402).json({
        message: `Insufficient balance. Unlock costs $${PROGRAMMING_FACILITY_UNLOCK_COST.toLocaleString()}.`
      });
      return;
    }
    const newTotal = accrued.total - PROGRAMMING_FACILITY_UNLOCK_COST;
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'balance.total': newTotal,
          'balance.lastUpdated': accrued.lastUpdated,
          'balance.fractionalRemainder': accrued.fractionalRemainder,
          'unlockedFeatures.programmingFacility': true,
        },
      }
    );

    res.json({
      success: true,
      balance: {
        total: newTotal,
        ratePerSecond: bal?.ratePerSecond ?? 0,
        lastUpdated: accrued.lastUpdated.toISOString()
      },
      unlockedFeatures: {
        hackRig: user.unlockedFeatures?.hackRig || false,
        researchCenter: user.unlockedFeatures?.researchCenter || false,
        programmingFacility: true
      }
    });
  } catch (error) {
    console.error('Server error unlocking programming facility:', error);
    res.status(500).json({ message: 'Error unlocking Programming Facility' });
  }
});

router.get('/research-center-status', auth, async (req: Request, res: Response) => {
  try {
    const user: IUser | null = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const maxLevel = await getResearchCenterMaxLevel();
    const now = new Date();
    let buildStatus: { startedAt: string; completesAt: string; timeRemaining: number; targetLevel?: number } | null = null;
    let isUnlocked = user.unlockedFeatures?.researchCenter || false;
    let level: number = user.researchCenterLevel ?? 0;

    // Migration: existing users who already have Research Center get level 3 (legacy cap)
    if (isUnlocked && (!level || level < 1)) {
      level = 3;
      user.researchCenterLevel = 3;
      await user.save();
    }

    // Check if build is in progress and should be completed (timer finished)
    if (user.researchCenterBuild?.startedAt && user.researchCenterBuild?.completesAt) {
      if (now >= user.researchCenterBuild.completesAt) {
        // Legacy in-progress builds (no targetLevel) completed under old $50k system → grant level 3
        const targetLevel = (user.researchCenterBuild.targetLevel ?? 3) as ResearchCenterLevel;
        user.unlockedFeatures.researchCenter = true;
        user.researchCenterLevel = targetLevel;
        user.researchCenterBuild = {
          startedAt: null,
          completesAt: null,
          targetLevel: null
        };
        await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(user._id)), 'researchCenterBuild');
        await user.save();
        isUnlocked = true;
        level = targetLevel;
        await markResearchCenterTaskCompleted(String(user._id));
      } else {
        buildStatus = {
          startedAt: user.researchCenterBuild.startedAt.toISOString(),
          completesAt: user.researchCenterBuild.completesAt.toISOString(),
          timeRemaining: Math.max(0, user.researchCenterBuild.completesAt.getTime() - now.getTime()),
          targetLevel: user.researchCenterBuild.targetLevel ?? 3
        };
      }
    }

    // After migration/timer completion, level may have been updated
    if (isUnlocked && (!level || level < 1)) {
      level = user.researchCenterLevel ?? 3;
    }

    const nextLevel = level < maxLevel ? (level + 1) as ResearchCenterLevel : null;
    let nextBuildCost: number | null = null;
    let nextBuildTimeMinutes: number | null = null;
    if (nextLevel) {
      const config = await getResearchCenterLevelConfig(nextLevel);
      nextBuildCost = config.cost;
      nextBuildTimeMinutes = config.constructionTimeMinutes;
    }
    const isBuilding = Boolean(user.researchCenterBuild?.startedAt && user.researchCenterBuild?.completesAt && now < user.researchCenterBuild.completesAt);
    const canBuild = isUnlocked && level < maxLevel && !isBuilding;

    res.json({
      isUnlocked,
      level,
      maxLevel,
      canBuild,
      nextBuildCost,
      nextBuildTimeMinutes,
      buildStatus
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error checking research center status' });
  }
});

router.post('/unlock-research-center', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const maxLevel = await getResearchCenterMaxLevel();
    const now = new Date();

    // Auto-complete expired builds before charging (same as research-center-status)
    if (user.researchCenterBuild?.startedAt && user.researchCenterBuild?.completesAt && now >= user.researchCenterBuild.completesAt) {
      // Legacy in-progress builds (no targetLevel) completed under old $50k system → grant level 3
      const targetLevel = (user.researchCenterBuild.targetLevel ?? 3) as ResearchCenterLevel;
      user.unlockedFeatures.researchCenter = true;
      user.researchCenterLevel = targetLevel;
      user.researchCenterBuild = {
        startedAt: null,
        completesAt: null,
        targetLevel: null
      };
      await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(user._id)), 'researchCenterBuild');
      await user.save();
      await markResearchCenterTaskCompleted(String(user._id));
    }

    // Effective level: 0 if not unlocked; else researchCenterLevel or 3 for legacy
    const isUnlocked = user.unlockedFeatures?.researchCenter || false;
    let currentLevel: number = user.researchCenterLevel ?? (isUnlocked ? 3 : 0);
    if (currentLevel >= maxLevel) {
      res.status(400).json({ message: 'Research Center is already at max level.' });
      return;
    }

    // Reject if a build is still in progress (timer not yet expired)
    if (user.researchCenterBuild?.startedAt && user.researchCenterBuild?.completesAt && now < user.researchCenterBuild.completesAt) {
      res.status(400).json({ message: 'Research Center build already in progress.' });
      return;
    }
    // One build at a time globally: reject if any investment property build is in progress
    const hasRentalBuild = Object.entries(user.rentalHousingBuilds || {}).some(([, b]) => {
      const build = b as { startedAt: Date | null; completesAt: Date | null };
      return build?.startedAt && build?.completesAt && now < new Date(build.completesAt);
    });
    if (hasRentalBuild) {
      res.status(400).json({ message: 'Another build is already in progress (research center or investment property). Finish it first.' });
      return;
    }

    const nextLevel = (currentLevel + 1) as ResearchCenterLevel;
    const config = await getResearchCenterLevelConfig(nextLevel);
    const buildCost = config.cost;
    const buildTimeMinutes = config.constructionTimeMinutes;

    if (user.balance.total < buildCost) {
      res.status(400).json({
        message: `Insufficient balance. ${nextLevel === 1 ? 'Research Center build' : `Upgrade to level ${nextLevel}`} costs $${buildCost.toLocaleString()}.`
      });
      return;
    }

    user.balance.total -= buildCost;
    const buildStartedAt = new Date();
    const buildTimeMs = buildTimeMinutes * 60 * 1000;
    const originalTotalSeconds = buildTimeMinutes * 60;
    user.researchCenterBuild = {
      startedAt: buildStartedAt,
      completesAt: new Date(buildStartedAt.getTime() + buildTimeMs),
      targetLevel: nextLevel,
      originalTotalSeconds
    };
    await user.save();
    // Clear any stale backup request from a previous research center build so "Request back-up" shows fresh
    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(req.user._id)), 'researchCenterBuild');

    res.json({
      success: true,
      balance: {
        total: user.balance.total,
        ratePerSecond: user.balance.ratePerSecond,
        lastUpdated: user.balance.lastUpdated.toISOString()
      },
      researchCenterBuild: {
        startedAt: user.researchCenterBuild!.startedAt!.toISOString(),
        completesAt: user.researchCenterBuild!.completesAt!.toISOString(),
        targetLevel: nextLevel
      },
      unlockedFeatures: {
        hackRig: user.unlockedFeatures?.hackRig || false,
        researchCenter: user.unlockedFeatures?.researchCenter || false,
        programmingFacility: user.unlockedFeatures?.programmingFacility || false
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error starting research center build' });
  }
});

router.post('/speedup-research-center-construction', auth, async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Reload user within transaction to ensure we have latest state
      const userInTransaction = await User.findById(req.user._id).session(session);
      if (!userInTransaction) {
        throw new Error('User not found');
      }

      const buildStatus = userInTransaction.researchCenterBuild;
      
      if (!buildStatus?.startedAt || !buildStatus?.completesAt) {
        throw new Error('No active build found for research center');
      }

      // Calculate cost inside transaction based on current time to prevent overcharging
      const now = new Date();
      const completesAt = new Date(buildStatus.completesAt);
      const remainingMs = Math.max(0, completesAt.getTime() - now.getTime());
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      
      if (remainingSeconds <= 0) {
        throw new Error('Build is already complete');
      }

      // Calculate cost based on actual remaining time at transaction execution
      const cost = remainingSeconds * 5;

      // Verify sufficient balance inside transaction to prevent race conditions
      if (userInTransaction.balance.total < cost) {
        throw new Error('Insufficient funds');
      }

      // Legacy in-progress builds (no targetLevel) completed under old $50k system → grant level 3
      const targetLevel = (buildStatus.targetLevel ?? 3) as ResearchCenterLevel;
      userInTransaction.unlockedFeatures.researchCenter = true;
      userInTransaction.researchCenterLevel = targetLevel;
      userInTransaction.researchCenterBuild = {
        startedAt: null,
        completesAt: null,
        targetLevel: null
      };
      userInTransaction.balance.total -= cost;

      await userInTransaction.save({ session });
    });
    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(req.user._id)), 'researchCenterBuild');
    
    // Mark the build-research-center task as completed after transaction
    await markResearchCenterTaskCompleted(req.user._id);
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (error.message === 'No active build found for research center') {
      res.status(400).json({ error: 'No active build found for research center' });
      return;
    }
    if (error.message === 'Build is already complete') {
      res.status(400).json({ error: 'Build is already complete' });
      return;
    }
    if (error.message === 'Insufficient funds') {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }
    
    console.error('Error speeding up research center construction:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  } finally {
    await session.endSession();
  }

  // Reload user to get updated balance after transaction
  const updatedUser = await User.findById(req.user._id);
  if (!updatedUser) {
    res.status(500).json({ error: 'Error retrieving updated user data' });
    return;
  }

  res.json({
    success: true,
    message: 'Research center construction completed',
    balance: {
      total: updatedUser.balance.total,
      ratePerSecond: updatedUser.balance.ratePerSecond,
      lastUpdated: updatedUser.balance.lastUpdated.toISOString()
    },
    unlockedFeatures: {
      hackRig: updatedUser.unlockedFeatures?.hackRig || false,
      researchCenter: true,
      programmingFacility: updatedUser.unlockedFeatures?.programmingFacility || false
    }
  });
});

router.post('/experience/add', auth, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ message: 'Valid experience amount required' });
      return;
    }

    try {
      const { LevelingService } = require('../services/LevelingService');
      const result = await LevelingService.applyExperience(req.user._id, amount);
      res.json(result);
    } catch (error) {
      console.error('Error applying experience:', error);
      res.status(500).json({ error: 'Failed to apply experience' });
    }
  } catch (error) {
    console.error('Experience add error:', error);
    res.status(500).json({ message: 'Error adding experience' });
  }
});

export default router; 
 
// Finance endpoints
router.get('/finance/tiers', auth, async (req: Request, res: Response) => {
  try {
    const docs = await FinanceTier.find({ userId: req.user._id }).lean();
    res.json({ tiers: docs });
  } catch (error) {
    console.error('Finance tiers fetch error:', error);
    res.status(500).json({ error: 'Failed to load finance tiers' });
  }
});

router.get('/finance/tiers/:tierKey', auth, async (req: Request, res: Response) => {
  try {
    const { tierKey } = req.params as { tierKey: 'barista' | 'graphic_designer' | 'corporate_lawyer' };
    const doc = await FinanceTier.findOne({ userId: req.user._id, tierKey }).lean();
    if (!doc) {
      res.status(404).json({ error: 'Tier not found' });
      return;
    }
    res.json(doc);
  } catch (error) {
    console.error('Finance tier fetch error:', error);
    res.status(500).json({ error: 'Failed to load finance tier' });
  }
});

// Optional: Fetch global templates (for research center, future upgrades)
router.get('/finance/templates', auth, async (_req: Request, res: Response) => {
  try {
    const templates = await FinanceTemplate.find({}).lean();
    res.json({ templates });
  } catch (error) {
    console.error('Finance templates fetch error:', error);
    res.status(500).json({ error: 'Failed to load finance templates' });
  }
});

// Rental Housing endpoints
router.get('/rental-housing-status/:propertyId', auth, async (req, res): Promise<void> => {
  try {
    const userId = req.user?._id;
    const propertyId = parseInt(req.params.propertyId);
    
    if (!userId || propertyId < 1 || propertyId > 4) {
      res.status(400).json({ error: 'Invalid property ID' });
      return;
    }

    let user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await RentalHousingSyncService.ensureLegacyRentalLevels(user);

    // Room remodel auto-complete: when timer has ended, apply completion so client never needs to tap "Complete"
    const now = new Date();
    const ar = user.activeRemodel;
    if (ar?.completesAt && now >= new Date(ar.completesAt)) {
      const propId = ar.propertyId;
      const room = ar.room;
      const targetRoomLevel = ar.targetRoomLevel;
      const rooms = user.rentalHousingRooms || {} as any;
      const propRooms = rooms[`property${propId}`] || { bathroom: 1, kitchen: 1, bedroom: 1, livingRoom: 1, garage: 1 };
      propRooms[room] = targetRoomLevel;
      rooms[`property${propId}`] = propRooms;
      await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(userId)), 'remodel');
      await User.findByIdAndUpdate(userId, {
        $set: { rentalHousingRooms: rooms },
        $unset: { activeRemodel: 1 }
      });
      user = await User.findById(userId) || user;
      if (user) {
        try {
          await RentalHousingSyncService.performSync(user);
        } catch (syncError) {
          console.error('Error syncing rental housing after remodel auto-complete:', syncError);
        }
      }
    }

    const config = await getRentalPropertyConfig();
    const maxPropertyLevel = config.maxPropertyLevel;
    const maxRoomLevel = config.maxRoomLevel;
    const maxGarageRoomLevel = config.maxGarageRoomLevel;
    const propertyLevel = RentalHousingIncomeService.getPropertyLevel(user, propertyId, maxPropertyLevel);
    const isUnlocked = propertyLevel >= 1;
    const propertyKey = `property${propertyId}` as keyof typeof user.rentalHousingBuilds;
    const buildStatusRaw = user.rentalHousingBuilds?.[propertyKey] as { startedAt: Date | null; completesAt: Date | null; targetLevel?: number } | undefined;
    const buildStatus = buildStatusRaw
      ? { startedAt: buildStatusRaw.startedAt, completesAt: buildStatusRaw.completesAt, targetLevel: buildStatusRaw.targetLevel ?? 1 }
      : { startedAt: null, completesAt: null, targetLevel: 1 };
    
    const isBuilding = Boolean(buildStatus.startedAt && buildStatus.completesAt && new Date() < new Date(buildStatus.completesAt));
    const nextBuildLevel = propertyLevel < maxPropertyLevel ? propertyLevel + 1 : null;
    let nextBuildCost: number | null = null;
    let nextBuildTimeMinutes: number | null = null;
    if (nextBuildLevel != null) {
      const levelConfig = await getPropertyBuildLevelConfig(nextBuildLevel);
      nextBuildCost = levelConfig.cost;
      nextBuildTimeMinutes = levelConfig.constructionTimeMinutes;
    }
    const roomLevels = RentalHousingIncomeService.getRoomLevels(user, propertyId, maxRoomLevel);
    const activeRemodel = user.activeRemodel?.propertyId === propertyId ? user.activeRemodel : null;
    const roomRemodelLevels = config.roomRemodelLevels.map((r) => ({
      roomLevel: r.roomLevel,
      cost: r.cost,
      constructionTimeMinutes: r.constructionTimeMinutes,
      minPropertyLevel: r.minPropertyLevel,
    }));

    res.json({
      propertyId,
      isUnlocked,
      propertyLevel,
      nextBuildLevel,
      nextBuildCost,
      nextBuildTimeMinutes,
      isBuilding,
      buildStatus,
      canBuild: propertyLevel < maxPropertyLevel && !isBuilding,
      roomLevels,
      activeRemodel,
      maxPropertyLevel,
      maxRoomLevel,
      maxGarageRoomLevel,
      roomRemodelLevels,
    });
  } catch (error) {
    console.error('Error fetching rental housing status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/unlock-rental-housing/:propertyId', auth, async (req, res): Promise<void> => {
  try {
    const userId = req.user?._id;
    const propertyId = parseInt(req.params.propertyId);
    
    if (!userId || propertyId < 1 || propertyId > 4) {
      res.status(400).json({ error: 'Invalid property ID' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await RentalHousingSyncService.ensureLegacyRentalLevels(user);

    const maxPropertyLevel = await getPropertyMaxLevel();
    const propertyLevel = RentalHousingIncomeService.getPropertyLevel(user, propertyId, maxPropertyLevel);
    if (propertyLevel >= maxPropertyLevel) {
      res.status(400).json({ error: 'Property already at max level' });
      return;
    }

    const propertyKey = `property${propertyId}` as keyof typeof user.rentalHousingBuilds;
    const buildStatus = user.rentalHousingBuilds?.[propertyKey] as { startedAt: Date | null; completesAt: Date | null; targetLevel?: number } | undefined;
    
    if (buildStatus?.startedAt && buildStatus?.completesAt && new Date() < new Date(buildStatus.completesAt)) {
      res.status(400).json({ error: 'Property already under construction' });
      return;
    }
    // One build at a time globally: reject if research center build is in progress
    const researchCenterBuilding = user.researchCenterBuild?.startedAt && user.researchCenterBuild?.completesAt && new Date() < new Date(user.researchCenterBuild.completesAt);
    if (researchCenterBuilding) {
      res.status(400).json({ error: 'Another build is already in progress (research center or investment property). Finish it first.' });
      return;
    }

    const nextBuildLevel = propertyLevel + 1;
    const config = await getPropertyBuildLevelConfig(nextBuildLevel);
    const buildCost = config.cost;
    const buildTimeMinutes = config.constructionTimeMinutes;

    if (user.balance.total < buildCost) {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }

    const hasActiveBuild = Object.entries(user.rentalHousingBuilds || {}).some(([, build]) => {
      const b = build as { startedAt: Date | null; completesAt: Date | null };
      return b.startedAt && b.completesAt && new Date() < new Date(b.completesAt);
    });
    if (hasActiveBuild) {
      res.status(400).json({ error: 'Only one property can be built at a time' });
      return;
    }

    const now = new Date();
    const completesAt = new Date(now.getTime() + buildTimeMinutes * 60 * 1000);
    const originalTotalSeconds = buildTimeMinutes * 60;

    const updateData: any = {
      [`rentalHousingBuilds.${propertyKey}`]: {
        startedAt: now,
        completesAt: completesAt,
        targetLevel: nextBuildLevel,
        originalTotalSeconds
      },
      'balance.total': user.balance.total - buildCost
    };

    // Clear previous backup request (both legacy fields and crewBackupRequests array entry)
    // so "Request back-up" shows fresh for this new build/upgrade
    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(userId)), 'rentalBuild', propertyKey);
    await User.findByIdAndUpdate(userId, {
      $set: updateData,
      $unset: {
        crewBackupRequestedAt: 1,
        crewBackupHelpApplied: 1,
        crewBackupResearchCategoryId: 1,
        crewBackupResearchFeatureId: 1,
        crewBackupRequestedJobType: 1
      }
    });

    res.json({
      success: true,
      message: 'Build started',
      buildStatus: {
        startedAt: now,
        completesAt: completesAt,
        targetLevel: nextBuildLevel
      },
      newBalance: user.balance.total - buildCost
    });
  } catch (error) {
    console.error('Error starting rental housing build:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete-rental-housing/:propertyId', auth, async (req, res): Promise<void> => {
  try {
    const userId = req.user?._id;
    const propertyId = parseInt(req.params.propertyId);
    
    if (!userId || propertyId < 1 || propertyId > 4) {
      res.status(400).json({ error: 'Invalid property ID' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const propertyKey = `property${propertyId}` as keyof typeof user.rentalHousingBuilds;
    const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof user.unlockedFeatures;
    const buildStatus = user.rentalHousingBuilds?.[propertyKey] as { startedAt: Date | null; completesAt: Date | null; targetLevel?: number } | undefined;
    
    if (!buildStatus?.startedAt || !buildStatus?.completesAt) {
      res.status(400).json({ error: 'No active build found for this property' });
      return;
    }

    const now = new Date();
    if (now < new Date(buildStatus.completesAt)) {
      res.status(400).json({ error: 'Build time has not completed yet' });
      return;
    }

    const maxPropertyLevel = await getPropertyMaxLevel();
    const rawTargetLevel = buildStatus.targetLevel;
    const isLegacyBuild = rawTargetLevel === undefined || rawTargetLevel === null;
    const targetLevel = isLegacyBuild ? Math.min(5, maxPropertyLevel) : Math.min(maxPropertyLevel, Math.max(1, rawTargetLevel));

    const updateData: any = {
      [`rentalHousingLevels.${propertyKey}`]: targetLevel,
      [`unlockedFeatures.${rentalHousingKey}`]: true,
      [`rentalHousingBuilds.${propertyKey}`]: {
        startedAt: null,
        completesAt: null,
        targetLevel: 1
      }
    };
    if (!isLegacyBuild) {
      updateData[`rentalHousingLevelSetByBuild.${propertyKey}`] = true;
    }

    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(userId)), 'rentalBuild', propertyKey);
    await User.findByIdAndUpdate(userId, {
      $set: updateData,
    });

    if (propertyId === 1) {
      await markInvestmentPropertyTaskCompleted(userId);
    }

    let updatedUser = await User.findById(userId);
    if (updatedUser) {
      const { RentalHousingSyncService } = await import('../services/RentalHousingSyncService');
      await RentalHousingSyncService.performSync(updatedUser);
      updatedUser = await User.findById(userId);
    }

    res.json({
      success: true,
      message: 'Build completed',
      propertyId,
      propertyLevel: targetLevel,
      isUnlocked: true,
      newBalance: updatedUser?.balance?.total,
      ratePerSecond: updatedUser?.balance?.ratePerSecond
    });
  } catch (error) {
    console.error('Error completing rental housing build:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/speedup-property-construction/:propertyId', auth, async (req, res): Promise<void> => {
  const userId = req.user?._id;
  const propertyId = parseInt(req.params.propertyId);
  
  if (!userId || propertyId < 1 || propertyId > 4) {
    res.status(400).json({ error: 'Invalid property ID' });
    return;
  }

  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Reload user within transaction to ensure we have latest state
      const userInTransaction = await User.findById(userId).session(session);
      if (!userInTransaction) {
        throw new Error('User not found');
      }

      const propertyKey = `property${propertyId}` as keyof typeof userInTransaction.rentalHousingBuilds;
      const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof userInTransaction.unlockedFeatures;
      
      const buildStatus = userInTransaction.rentalHousingBuilds?.[propertyKey] as { startedAt: Date | null; completesAt: Date | null } | undefined;
      
      if (!buildStatus?.startedAt || !buildStatus?.completesAt) {
        throw new Error('No active build found for this property');
      }

      // Calculate cost inside transaction based on current time to prevent overcharging
      const now = new Date();
      const completesAt = new Date(buildStatus.completesAt);
      const remainingMs = Math.max(0, completesAt.getTime() - now.getTime());
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      
      if (remainingSeconds <= 0) {
        throw new Error('Build is already complete');
      }

      // Calculate cost based on actual remaining time at transaction execution
      const cost = remainingSeconds * 5;

      // Verify sufficient balance inside transaction to prevent race conditions
      if (userInTransaction.balance.total < cost) {
        throw new Error('Insufficient funds');
      }

      const maxPropertyLevel = await getPropertyMaxLevel();
      const buildStatusWithTarget = userInTransaction.rentalHousingBuilds?.[propertyKey] as { startedAt: Date; completesAt: Date; targetLevel?: number } | undefined;
      const rawTargetLevel = buildStatusWithTarget?.targetLevel;
      const isLegacyBuild = rawTargetLevel === undefined || rawTargetLevel === null;
      const targetLevel = isLegacyBuild ? Math.min(5, maxPropertyLevel) : Math.min(maxPropertyLevel, Math.max(1, rawTargetLevel));

      (userInTransaction.rentalHousingLevels as any) = userInTransaction.rentalHousingLevels || {};
      (userInTransaction.rentalHousingLevels as any)[propertyKey] = targetLevel;
      if (!isLegacyBuild) {
        (userInTransaction.rentalHousingLevelSetByBuild as any) = userInTransaction.rentalHousingLevelSetByBuild || {};
        (userInTransaction.rentalHousingLevelSetByBuild as any)[propertyKey] = true;
      }
      (userInTransaction.unlockedFeatures as any)[rentalHousingKey] = true;
      (userInTransaction.rentalHousingBuilds as any)[propertyKey] = {
        startedAt: null,
        completesAt: null,
        targetLevel: 1
      };
      userInTransaction.balance.total -= cost;

      await userInTransaction.save({ session });
    });

    const propertyKey = `property${propertyId}`;
    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(userId)), 'rentalBuild', propertyKey);

    if (propertyId === 1) {
      await markInvestmentPropertyTaskCompleted(userId);
    }
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (error.message === 'No active build found for this property') {
      res.status(400).json({ error: 'No active build found for this property' });
      return;
    }
    if (error.message === 'Build is already complete') {
      res.status(400).json({ error: 'Build is already complete' });
      return;
    }
    if (error.message === 'Insufficient funds') {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }
    
    console.error('Error speeding up property construction:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  } finally {
    await session.endSession();
  }

  // Reload user to get updated balance after transaction
  const updatedUser = await User.findById(userId);
  if (!updatedUser) {
    res.status(500).json({ error: 'Error retrieving updated user data' });
    return;
  }

  // Trigger a sync to ensure rental housing income is properly calculated
  try {
    const { RentalHousingSyncService } = await import('../services/RentalHousingSyncService');
    await RentalHousingSyncService.performSync(updatedUser);
  } catch (syncError) {
    console.error('Error syncing rental housing:', syncError);
    // Don't fail the request if sync fails, but log it
  }

  // Re-fetch so response uses persisted balance and ratePerSecond (post-sync or transaction state)
  const userForResponse = await User.findById(userId);
  if (!userForResponse) {
    res.status(500).json({ error: 'Error retrieving updated user data' });
    return;
  }

  res.json({
    success: true,
    message: 'Property construction completed',
    propertyId,
    isUnlocked: true,
    newBalance: userForResponse.balance.total,
    ratePerSecond: userForResponse.balance.ratePerSecond
  });
});

// --- Remodel endpoints (room upgrades, one at a time) ---
const ROOM_TYPES = ['bathroom', 'kitchen', 'bedroom', 'livingRoom', 'garage'] as const;

router.post('/start-remodel/:propertyId', auth, async (req, res): Promise<void> => {
  const userId = req.user?._id;
  const propertyId = parseInt(req.params.propertyId);
  const room = req.body?.room as string | undefined;
  if (!userId || propertyId < 1 || propertyId > 4 || !ROOM_TYPES.includes(room as any)) {
    res.status(400).json({ error: 'Invalid property ID or room' });
    return;
  }
  const preUser = await User.findById(userId);
  if (!preUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  await RentalHousingSyncService.ensureLegacyRentalLevels(preUser);

  const session = await mongoose.startSession();
  try {
    let newBalance = 0;
    let activeRemodelPayload: { propertyId: number; room: string; startedAt: Date; completesAt: Date; targetRoomLevel: number } | null = null;
    const rentalConfig = await getRentalPropertyConfig();
    const { maxPropertyLevel, maxRoomLevel, maxGarageRoomLevel } = rentalConfig;
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error('User not found');
      const propertyLevel = RentalHousingIncomeService.getPropertyLevel(user, propertyId, maxPropertyLevel);
      if (propertyLevel < 3) throw new Error('Property must be level 3 or higher to remodel rooms');
      if (room === 'garage' && propertyLevel < 7) throw new Error('Property must be level 7 or higher to remodel garage');
      if (user.activeRemodel && (user.activeRemodel as any).propertyId != null) {
        throw new Error('Another remodel is already in progress');
      }
      const roomLevels = RentalHousingIncomeService.getRoomLevels(user, propertyId, maxRoomLevel);
      const currentRoomLevel = roomLevels[room as keyof typeof roomLevels] ?? 1;
      const maxForRoom = room === 'garage' ? maxGarageRoomLevel : maxRoomLevel;
      if (currentRoomLevel >= maxForRoom) throw new Error('Room is already at max remodel level');
      const nextRoomLevel = currentRoomLevel + 1;
      const tierConfig = await getRoomRemodelLevelConfig(nextRoomLevel);
      const minPropForRoom = room === 'garage'
        ? (nextRoomLevel === 2 ? 7 : nextRoomLevel === 3 ? 8 : nextRoomLevel === 4 ? 9 : 999)
        : tierConfig.minPropertyLevel;
      if (propertyLevel < minPropForRoom) {
        throw new Error(`Property must be level ${minPropForRoom} to remodel this room to level ${nextRoomLevel}`);
      }
      if (user.balance.total < tierConfig.cost) throw new Error('Insufficient funds');
      const now = new Date();
      const completesAt = new Date(now.getTime() + tierConfig.constructionTimeMinutes * 60 * 1000);
      const originalTotalSeconds = tierConfig.constructionTimeMinutes * 60;
      newBalance = user.balance.total - tierConfig.cost;
      user.balance.total = newBalance;
      (user as any).activeRemodel = {
        propertyId,
        room,
        startedAt: now,
        completesAt,
        targetRoomLevel: nextRoomLevel,
        originalTotalSeconds
      };
      // Clear legacy backup fields so "Request back-up" shows fresh for this new remodel
      (user as any).crewBackupRequestedAt = null;
      (user as any).crewBackupHelpApplied = null;
      (user as any).crewBackupResearchCategoryId = null;
      (user as any).crewBackupResearchFeatureId = null;
      (user as any).crewBackupRequestedJobType = null;
      activeRemodelPayload = { propertyId, room: room as string, startedAt: now, completesAt, targetRoomLevel: nextRoomLevel };
      await user.save({ session });
    });
    // Clear any stale crewBackupRequests entry from a previous remodel
    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(userId)), 'remodel');
    res.json({
      success: true,
      message: 'Remodel started',
      activeRemodel: activeRemodelPayload,
      newBalance
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (['Another remodel is already in progress', 'Room is already at max remodel level', 'Insufficient funds', 'Property must be level 3 or higher to remodel rooms'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.message?.startsWith('Property must be level')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error starting remodel:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.endSession();
  }
});

router.post('/complete-remodel/:propertyId', auth, async (req, res): Promise<void> => {
  const userId = req.user?._id;
  const propertyId = parseInt(req.params.propertyId);
  const room = req.body?.room as string | undefined;
  if (!userId || propertyId < 1 || propertyId > 4 || !ROOM_TYPES.includes(room as any)) {
    res.status(400).json({ error: 'Invalid property ID or room' });
    return;
  }

  let roomLevel: number | undefined;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const userInTransaction = await User.findById(userId).session(session);
      if (!userInTransaction) throw new Error('User not found');
      const ar = userInTransaction.activeRemodel;
      if (!ar || ar.propertyId !== propertyId || ar.room !== room) {
        throw new Error('No active remodel found for this property and room');
      }
      if (!ar.completesAt) {
        throw new Error('No active remodel found for this property and room');
      }
      const now = new Date();
      if (now < new Date(ar.completesAt)) {
        throw new Error('Remodel time has not completed yet');
      }
      roomLevel = ar.targetRoomLevel;
      const rooms = userInTransaction.rentalHousingRooms || {} as any;
      const propRooms = rooms[`property${propertyId}`] || { bathroom: 1, kitchen: 1, bedroom: 1, livingRoom: 1, garage: 1 };
      propRooms[room] = ar.targetRoomLevel;
      rooms[`property${propertyId}`] = propRooms;
      userInTransaction.rentalHousingRooms = rooms;
      await userInTransaction.save({ session });
      await User.updateOne({ _id: userId }, { $unset: { activeRemodel: 1 } }, { session });
    });
    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(userId)), 'remodel');
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (['No active remodel found for this property and room', 'Remodel time has not completed yet'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error completing remodel:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  } finally {
    await session.endSession();
  }

  try {
    const updatedUser = await User.findById(userId);
    if (updatedUser) {
      try {
        const { RentalHousingSyncService } = await import('../services/RentalHousingSyncService');
        await RentalHousingSyncService.performSync(updatedUser);
      } catch (syncError) {
        console.error('Error syncing rental housing after complete-remodel:', syncError);
      }
    }

    const userForResponse = await User.findById(userId);
    if (!userForResponse) {
      res.status(500).json({ error: 'Error retrieving updated user data' });
      return;
    }

    res.json({
      success: true,
      message: 'Remodel completed',
      propertyId,
      room,
      roomLevel: roomLevel ?? 1,
      newBalance: userForResponse.balance.total,
      ratePerSecond: userForResponse.balance.ratePerSecond
    });
  } catch (error: any) {
    console.error('Error after complete-remodel transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/speedup-remodel/:propertyId', auth, async (req, res): Promise<void> => {
  const userId = req.user?._id;
  const propertyId = parseInt(req.params.propertyId);
  const room = req.body?.room as string | undefined;
  if (!userId || propertyId < 1 || propertyId > 4 || !ROOM_TYPES.includes(room as any)) {
    res.status(400).json({ error: 'Invalid property ID or room' });
    return;
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const userInTransaction = await User.findById(userId).session(session);
      if (!userInTransaction) throw new Error('User not found');
      const ar = userInTransaction.activeRemodel;
      if (!ar || ar.propertyId !== propertyId || ar.room !== room) {
        throw new Error('No active remodel found for this property and room');
      }
      if (!ar.completesAt) {
        throw new Error('No active remodel found for this property and room');
      }
      const now = new Date();
      const completesAt = new Date(ar.completesAt);
      const remainingMs = Math.max(0, completesAt.getTime() - now.getTime());
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      if (remainingSeconds <= 0) throw new Error('Remodel is already complete');
      const cost = remainingSeconds * 5;
      if (userInTransaction.balance.total < cost) throw new Error('Insufficient funds');
      const rooms = userInTransaction.rentalHousingRooms || {} as any;
      const propRooms = rooms[`property${propertyId}`] || { bathroom: 1, kitchen: 1, bedroom: 1, livingRoom: 1, garage: 1 };
      propRooms[room] = ar.targetRoomLevel;
      rooms[`property${propertyId}`] = propRooms;
      userInTransaction.rentalHousingRooms = rooms;
      userInTransaction.balance.total -= cost;
      await userInTransaction.save({ session });
      await User.updateOne({ _id: userId }, { $unset: { activeRemodel: 1 } }, { session });
    });
    await removeCrewBackupRequestForJob(new mongoose.Types.ObjectId(String(userId)), 'remodel');
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (['No active remodel found for this property and room', 'Remodel is already complete', 'Insufficient funds'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error speeding up remodel:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  } finally {
    await session.endSession();
  }

  const updatedUser = await User.findById(userId);
  if (!updatedUser) {
    res.status(500).json({ error: 'Error retrieving updated user data' });
    return;
  }

  try {
    const { RentalHousingSyncService } = await import('../services/RentalHousingSyncService');
    await RentalHousingSyncService.performSync(updatedUser);
  } catch (syncError) {
    console.error('Error syncing rental housing after speedup-remodel:', syncError);
    // Don't fail the request if sync fails; transaction already succeeded
  }

  // Re-fetch so response uses persisted balance and ratePerSecond (post-sync or transaction state)
  const userForResponse = await User.findById(userId);
  if (!userForResponse) {
    res.status(500).json({ error: 'Error retrieving updated user data' });
    return;
  }

  res.json({
    success: true,
    message: 'Remodel completed',
    propertyId,
    room,
    newBalance: userForResponse.balance.total,
    ratePerSecond: userForResponse.balance.ratePerSecond
  });
});

// Update user preferences
router.put<{}, { success: boolean; message: string; profileGender: 'male' | 'female' } | { error: string }, UpdatePreferencesRequest['body']>(
  '/preferences',
  auth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const { profileGender } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (profileGender && !['male', 'female'].includes(profileGender)) {
        res.status(400).json({ error: 'Invalid profile gender value' });
        return;
      }

      const updateData: any = {};
      if (profileGender) {
        updateData.profileGender = profileGender;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No valid preferences to update' });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, select: 'profileGender' }
      );

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        profileGender: user.profileGender
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete user account
const deletionAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000;
const MAX_DELETION_ATTEMPTS = 3;

router.delete('/account', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { handle } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(userId.toString())) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    if (!handle) {
      res.status(400).json({ error: 'Handle is required for account deletion' });
      return;
    }

    const userIdString = userId.toString();
    const now = Date.now();
    const userAttempts = deletionAttempts.get(userIdString);
    
    if (userAttempts) {
      if (userAttempts.resetAt <= now) {
        deletionAttempts.delete(userIdString);
        deletionAttempts.set(userIdString, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      } else {
        if (userAttempts.count >= MAX_DELETION_ATTEMPTS) {
          res.status(429).json({ error: 'Too many deletion attempts. Please try again later.' });
          return;
        }
        userAttempts.count++;
      }
    } else {
      deletionAttempts.set(userIdString, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    if (deletionAttempts.size > 1000) {
      for (const [key, value] of deletionAttempts.entries()) {
        if (value.resetAt <= now) {
          deletionAttempts.delete(key);
        }
      }
    }

    const user = await User.findById(userId).select('handle').lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.handle !== handle) {
      res.status(400).json({ error: 'Handle verification failed' });
      return;
    }

    const { AccountDeletionService } = await import('../services/AccountDeletionService');
    const deletionResult = await AccountDeletionService.deleteAccount(userIdString);
    
    if (deletionResult.success && deletionResult.errors.length === 0) {
      res.json({
        success: true,
        message: deletionResult.message,
        deletedRecords: deletionResult.deletedRecords
      });
    } else {
      console.error('Account deletion completed with errors:', {
        userId: userIdString,
        errors: deletionResult.errors,
        deletedRecords: deletionResult.deletedRecords
      });
      res.status(500).json({
        success: false,
        message: deletionResult.message || 'Account deletion completed with errors',
        errors: deletionResult.errors,
        deletedRecords: deletionResult.deletedRecords
      });
    }
  } catch (error: any) {
    console.error('Error deleting user account:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred during account deletion'
    });
  }
});