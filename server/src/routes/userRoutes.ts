import express from 'express';
import { User } from '../models/User';
import auth from '../middleware/auth';
import { Request, Response } from 'express';
import { FinanceTier } from '../models/Finance';
import { FinanceTemplate } from '../models/FinanceTemplate';

interface UpdatePreferencesRequest extends Request {
  body: {
    profileGender?: 'male' | 'female';
  }
}

const router = express.Router();

router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('handle email level experience unlockedFeatures profileGender');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      handle: user.handle,
      email: user.email,
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
      profileGender: user.profileGender || 'male'
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
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
    const user = await User.findById(req.user._id);
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