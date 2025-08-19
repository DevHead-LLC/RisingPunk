import express from 'express';
import { User } from '../models/User';
import auth from '../middleware/auth';
import { Request, Response } from 'express';
import { FinanceTier } from '../models/Finance';
import { FinanceTemplate } from '../models/FinanceTemplate';

const router = express.Router();

router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('handle email level experience unlockedFeatures');
    
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
      }
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
      email: user.email,
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