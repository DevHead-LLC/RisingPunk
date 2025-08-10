import express from 'express';
import { User } from '../models/User';
import auth from '../middleware/auth';
import { Request, Response } from 'express';
import { FinanceTier } from '../models/Finance';
import { FinanceTemplate } from '../models/FinanceTemplate';

const router = express.Router();

router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('handle email level unlockedFeatures');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      handle: user.handle,
      email: user.email,
      level: user.level,
      unlockedFeatures: {
        hackRig: user.unlockedFeatures?.hackRig || false
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
        hackRig: user.unlockedFeatures?.hackRig || false
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error unlocking hack rig' });
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