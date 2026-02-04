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

interface UpdatePreferencesRequest extends Request {
  body: {
    profileGender?: 'male' | 'female';
  }
}

const router = express.Router();

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
    const user = await User.findById(req.user._id).select('handle email level experience unlockedFeatures profileGender battleStats totalGuardiansBuilt isGuest');
    
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
        researchCenter: user.unlockedFeatures?.researchCenter || false
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
      totalGuardiansBuilt: user.totalGuardiansBuilt || 0,
      isGuest: user.isGuest || false
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

    const user = await User.findById(userId).select('handle level profileGender battleStats');
    
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
      }
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
        researchCenter: user.unlockedFeatures?.researchCenter || false
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error unlocking hack rig' });
  }
});

router.get('/research-center-status', auth, async (req: Request, res: Response) => {
  try {
    const user: IUser | null = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const now = new Date();
    let buildStatus = null;
    let isUnlocked = user.unlockedFeatures?.researchCenter || false;

    // Check if build is in progress and should be completed
    if (user.researchCenterBuild?.startedAt && user.researchCenterBuild?.completesAt) {
      if (now >= user.researchCenterBuild.completesAt) {
        // Build is complete, unlock the feature
        user.unlockedFeatures.researchCenter = true;
        user.researchCenterBuild = {
          startedAt: null,
          completesAt: null
        };
        await user.save();
        isUnlocked = true;
        
        // Mark the build-research-center task as completed
        await markResearchCenterTaskCompleted(String(user._id));
      } else {
        // Build is still in progress
        buildStatus = {
          startedAt: user.researchCenterBuild.startedAt.toISOString(),
          completesAt: user.researchCenterBuild.completesAt.toISOString(),
          timeRemaining: Math.max(0, user.researchCenterBuild.completesAt.getTime() - now.getTime())
        };
      }
    }

    res.json({
      isUnlocked,
      buildStatus
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error checking research center status' });
  }
});

router.post('/unlock-research-center', auth, async (req: Request, res: Response) => {
  try {
    const RESEARCH_CENTER_COST = 50000;
    const BUILD_TIME_MINUTES = 60; // 1 hour build time
    
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user has sufficient balance
    if (user.balance.total < RESEARCH_CENTER_COST) {
      res.status(400).json({ message: 'Insufficient balance. Research Center costs $50,000.' });
      return;
    }

    // Check if build is already in progress
    if (user.researchCenterBuild?.startedAt && user.researchCenterBuild?.completesAt) {
      const now = new Date();
      if (now < user.researchCenterBuild.completesAt) {
        res.status(400).json({ message: 'Research Center build already in progress.' });
        return;
      }
    }

    // Deduct balance and start build timer
    user.balance.total -= RESEARCH_CENTER_COST;
    const now = new Date();
    const buildTimeMs = BUILD_TIME_MINUTES * 60 * 1000;
    user.researchCenterBuild = {
      startedAt: now,
      completesAt: new Date(now.getTime() + buildTimeMs)
    };
    await user.save();

    res.json({
      success: true,
      balance: {
        total: user.balance.total,
        ratePerSecond: user.balance.ratePerSecond,
        lastUpdated: user.balance.lastUpdated.toISOString()
      },
      researchCenterBuild: {
        startedAt: user.researchCenterBuild!.startedAt!.toISOString(),
        completesAt: user.researchCenterBuild!.completesAt!.toISOString()
      },
      unlockedFeatures: {
        hackRig: user.unlockedFeatures?.hackRig || false,
        researchCenter: user.unlockedFeatures?.researchCenter || false
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

      // Mark research center as unlocked and clear build status, deduct balance atomically
      userInTransaction.unlockedFeatures.researchCenter = true;
      userInTransaction.researchCenterBuild = {
        startedAt: null,
        completesAt: null
      };
      userInTransaction.balance.total -= cost;

      await userInTransaction.save({ session });
    });
    
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
      researchCenter: true
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

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const propertyKey = `property${propertyId}` as keyof typeof user.rentalHousingBuilds;
    const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof user.unlockedFeatures;
    
    const isUnlocked = user.unlockedFeatures[rentalHousingKey] || false;
    const buildStatus = user.rentalHousingBuilds?.[propertyKey] || { startedAt: null, completesAt: null };
    
    const isBuilding = buildStatus.startedAt && buildStatus.completesAt && new Date() < new Date(buildStatus.completesAt);
    
    res.json({
      propertyId,
      isUnlocked,
      isBuilding,
      buildStatus,
      canBuild: !isUnlocked && !isBuilding
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

    const propertyKey = `property${propertyId}` as keyof typeof user.rentalHousingBuilds;
    const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof user.unlockedFeatures;
    
    const isUnlocked = user.unlockedFeatures[rentalHousingKey] || false;
    const buildStatus = user.rentalHousingBuilds?.[propertyKey] || { startedAt: null, completesAt: null };
    
    if (isUnlocked) {
      res.status(400).json({ error: 'Property already unlocked' });
      return;
    }
    
    if (buildStatus.startedAt && buildStatus.completesAt && new Date() < new Date(buildStatus.completesAt)) {
      res.status(400).json({ error: 'Property already under construction' });
      return;
    }

    const RENTAL_HOUSING_COST = 100000;
    if (user.balance.total < RENTAL_HOUSING_COST) {
      res.status(400).json({ error: 'Insufficient funds' });
      return;
    }

    // Check if any other property is currently building
    const hasActiveBuild = Object.values(user.rentalHousingBuilds || {}).some(
      build => build.startedAt && build.completesAt && new Date() < new Date(build.completesAt)
    );
    
    if (hasActiveBuild) {
      res.status(400).json({ error: 'Only one property can be built at a time' });
      return;
    }

    // Start build process
    const now = new Date();
    const buildTimeMinutes = 120; // 2 hours build time
    const completesAt = new Date(now.getTime() + buildTimeMinutes * 60 * 1000);

    // Update user
    const updateData: any = {
      [`unlockedFeatures.${rentalHousingKey}`]: false, // Will be true when build completes
      [`rentalHousingBuilds.${propertyKey}`]: {
        startedAt: now,
        completesAt: completesAt
      },
      'balance.total': user.balance.total - RENTAL_HOUSING_COST
    };

    await User.findByIdAndUpdate(userId, { $set: updateData });

    res.json({
      success: true,
      message: 'Rental housing build started',
      buildStatus: {
        startedAt: now,
        completesAt: completesAt
      },
      newBalance: user.balance.total - RENTAL_HOUSING_COST
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
    
    const buildStatus = user.rentalHousingBuilds?.[propertyKey] as { startedAt: Date | null; completesAt: Date | null } | undefined;
    
    if (!buildStatus?.startedAt || !buildStatus?.completesAt) {
      res.status(400).json({ error: 'No active build found for this property' });
      return;
    }

    // Check if build time has actually completed
    const now = new Date();
    if (now < new Date(buildStatus.completesAt)) {
      res.status(400).json({ error: 'Build time has not completed yet' });
      return;
    }

    // Mark property as unlocked and clear build status
    const updateData: any = {
      [`unlockedFeatures.${rentalHousingKey}`]: true,
      [`rentalHousingBuilds.${propertyKey}`]: {
        startedAt: null,
        completesAt: null
      }
    };

    await User.findByIdAndUpdate(userId, { $set: updateData });

    // Mark the build-investment-property task as completed after transaction (only for property 1)
    if (propertyId === 1) {
      await markInvestmentPropertyTaskCompleted(userId);
    }

    // Trigger a sync to ensure rental housing income is properly calculated
    const updatedUser = await User.findById(userId);
    if (updatedUser) {
      const { RentalHousingSyncService } = await import('../services/RentalHousingSyncService');
      await RentalHousingSyncService.performSync(updatedUser);
    }

    res.json({
      success: true,
      message: 'Rental housing build completed',
      propertyId,
      isUnlocked: true
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

      // Mark property as unlocked and clear build status, deduct balance atomically
      (userInTransaction.unlockedFeatures as any)[rentalHousingKey] = true;
      (userInTransaction.rentalHousingBuilds as any)[propertyKey] = {
        startedAt: null,
        completesAt: null
      };
      userInTransaction.balance.total -= cost;

      await userInTransaction.save({ session });
    });
    
    // Mark the build-investment-property task as completed after transaction (only for property 1)
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

  res.json({
    success: true,
    message: 'Property construction completed',
    propertyId,
    isUnlocked: true,
    newBalance: updatedUser.balance.total
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