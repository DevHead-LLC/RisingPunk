import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { ResearchUnlockService } from '../services/ResearchUnlockService';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import { getResearchFeatures } from '../config/researchFeatures';
import { User } from '../models/User';

const router = express.Router();

router.get('/status', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const researchStatus = await ResearchUnlockService.getUserResearchStatus(userId);
    
    res.json({
      success: true,
      data: researchStatus
    });
  } catch (error) {
    console.error('Error fetching research status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching research status'
    });
  }
});

router.post('/unlock/:categoryId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { categoryId } = req.params;
    
    const result = await ResearchUnlockService.unlockResearch(userId, categoryId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        newBalance: result.newBalance
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error unlocking research:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking research'
    });
  }
});

router.get('/unlock-requirements/:categoryId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { categoryId } = req.params;
    
    const validation = await ResearchUnlockService.validateUnlockRequirements(userId, categoryId);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating unlock requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating unlock requirements'
    });
  }
});

router.get('/features/:categoryId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { categoryId } = req.params;
    
    // Get the base features for this category
    const baseFeatures = getResearchFeatures(categoryId);
    
    // Get the research document to get the correct ObjectId
    const research = await Research.findOne({ categoryId });
    if (!research) {
      res.status(404).json({
        success: false,
        message: 'Research category not found'
      });
      return;
    }
    
    // Get user's unlock status for these features using the correct researchId
    const userResearch = await ResearchUser.findOne({ 
      userId, 
      researchId: research._id 
    });
    
    // Merge base features with user's unlock status
    const featuresWithStatus = baseFeatures.map(feature => {
      const userFeature = userResearch?.features?.find((f: any) => f.id === feature.id);
      return {
        ...feature,
        isUnlocked: userFeature?.isUnlocked || false,
        unlockedAt: userFeature?.unlockedAt || null
      };
    });
    
    res.json({
      success: true,
      data: featuresWithStatus
    });
  } catch (error) {
    console.error('Error fetching research features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching research features'
    });
  }
});

router.post('/unlock-feature', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { categoryId, featureId, cost } = req.body;
    
    // Validate the feature exists
    const baseFeatures = getResearchFeatures(categoryId);
    const feature = baseFeatures.find(f => f.id === featureId);
    
    if (!feature) {
      res.status(400).json({
        success: false,
        message: 'Feature not found'
      });
      return;
    }
    
    // Get the research document to get the correct ObjectId
    const research = await Research.findOne({ categoryId });
    if (!research) {
      res.status(404).json({
        success: false,
        message: 'Research category not found'
      });
      return;
    }
    
    // Check if user can unlock this feature
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    if (user.balance.total < cost) {
      res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
      return;
    }
    
    if (user.level < feature.levelRequirement) {
      res.status(400).json({
        success: false,
        message: 'Level requirement not met'
      });
      return;
    }
    
    // Deduct cost and unlock feature
    const newBalance = user.balance.total - cost;
    
    // Update user balance
    await User.findByIdAndUpdate(userId, {
      'balance.total': newBalance,
      'balance.lastUpdated': new Date()
    });
    
    // Update research feature unlock status using the correct researchId
    await ResearchUser.findOneAndUpdate(
      { userId, researchId: research._id },
      {
        $set: {
          [`features.${featureId}.isUnlocked`]: true,
          [`features.${featureId}.unlockedAt`]: new Date()
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Feature unlocked successfully',
      newBalance
    });
  } catch (error) {
    console.error('Error unlocking research feature:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking research feature'
    });
  }
});

// Temporary endpoint to fix missing research data for existing users
router.post('/fix-user-research', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    
    // Check if user already has research data
    const existingCount = await ResearchUser.countDocuments({ userId });
    if (existingCount > 0) {
      res.json({
        success: true,
        message: `User already has ${existingCount} research entries`
      });
      return;
    }
    
    // Get all research categories
    const researchCategories = await Research.find();
    
    // Create ResearchUser entries for all research categories
    const researchUserEntries = researchCategories.map((research: any) => ({
      userId,
      researchId: research._id,
      isUnlocked: false,
      unlockedAt: null,
      unlockCost: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await ResearchUser.insertMany(researchUserEntries);
    
    res.json({
      success: true,
      message: `Created ${researchUserEntries.length} research entries for user`
    });
  } catch (error) {
    console.error('Error fixing user research:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing user research'
    });
  }
});

export default router;
