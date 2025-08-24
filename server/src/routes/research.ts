import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { ResearchUnlockService } from '../services/ResearchUnlockService';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';

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
