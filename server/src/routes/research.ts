import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { ResearchUnlockService } from '../services/ResearchUnlockService';
import { ResearchFeatureService } from '../services/ResearchFeatureService';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import { getResearchFeatures } from '../config/researchFeatures';
import { User } from '../models/User';
import mongoose from 'mongoose';

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
    
    // Merge base features with user's unlock status and research state
    const featuresWithStatus = baseFeatures.map(feature => {
      const userFeature = userResearch?.features?.find((f: any) => f.id === feature.id);
      return {
        ...feature,
        // If user has explicitly unlocked it, use that status
        // Otherwise, use the server config's isUnlocked value
        isUnlocked: userFeature?.isUnlocked !== undefined ? userFeature.isUnlocked : feature.isUnlocked,
        unlockedAt: userFeature?.unlockedAt || null,
        // Add research state from database
        isResearching: userFeature?.isResearching || false,
        researchStartedAt: userFeature?.researchStartedAt || null,
        researchCompletesAt: userFeature?.researchCompletesAt || null,
        researchTimeHours: feature.researchTimeHours || 4 // Default to 4 hours
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

// Check if a specific research feature is unlocked
router.get('/feature-status/:featureId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { featureId } = req.params;
    
    // Find the research feature in the database
    if (!mongoose.connection.db) {
      res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
      return;
    }
    
    const researchFeature = await mongoose.connection.db.collection('researchFeatures').findOne({ featureId });
    
    if (!researchFeature) {
      res.status(404).json({
        success: false,
        message: 'Research feature not found'
      });
      return;
    }
    
    // Check if the user has unlocked this feature
    const userResearch = await ResearchUser.findOne({ 
      userId, 
      researchId: researchFeature.categoryObjectId 
    });
    
    const isUnlocked = userResearch?.features?.some((f: any) => f.id === featureId && f.isUnlocked) || false;
    
    res.json({
      success: true,
      data: {
        featureId: researchFeature.featureId,
        name: researchFeature.name,
        isUnlocked,
        unlockCost: researchFeature.unlockCost,
        levelRequirement: researchFeature.levelRequirement,
        researchTimeHours: researchFeature.researchTimeHours
      }
    });
  } catch (error) {
    console.error('Error checking research feature status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking research feature status'
    });
  }
});

// Start research for a specific feature
router.post('/start-research/:featureId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { featureId } = req.params;
    
    // Find the research feature in the database
    if (!mongoose.connection.db) {
      res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
      return;
    }
    
    const researchFeature = await mongoose.connection.db.collection('researchFeatures').findOne({ featureId });
    
    if (!researchFeature) {
      res.status(404).json({
        success: false,
        message: 'Research feature not found'
      });
      return;
    }
    
    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    // Check if user meets requirements
    if (user.level < researchFeature.levelRequirement) {
      res.status(400).json({
        success: false,
        message: 'Level requirement not met'
      });
      return;
    }
    
    if (user.balance.total < researchFeature.unlockCost) {
      res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
      return;
    }
    
    // Check if already researching or unlocked
    const userResearch = await ResearchUser.findOne({ 
      userId, 
      researchId: researchFeature.categoryObjectId 
    });
    
    const existingFeature = userResearch?.features?.find((f: any) => f.id === featureId);
    if (existingFeature?.isUnlocked) {
      res.status(400).json({
        success: false,
        message: 'Feature already unlocked'
      });
      return;
    }
    
    if (existingFeature?.isResearching) {
      res.status(400).json({
        success: false,
        message: 'Research already in progress'
      });
      return;
    }
    
    // Calculate research completion time
    const researchStartedAt = new Date();
    const researchCompletesAt = new Date(researchStartedAt.getTime() + (researchFeature.researchTimeHours * 60 * 60 * 1000));
    
    // Deduct cost from user balance
    await User.findByIdAndUpdate(
      userId,
      {
        'balance.total': user.balance.total - researchFeature.unlockCost,
        'balance.lastUpdated': new Date()
      }
    );
    
    // Update research feature to show as researching
    await ResearchUser.findOneAndUpdate(
      { userId, researchId: researchFeature.categoryObjectId },
      {
        $set: {
          'updatedAt': new Date()
        },
        $addToSet: {
          features: {
            id: featureId,
            isUnlocked: false,
            isResearching: true,
            researchStartedAt: researchStartedAt,
            researchCompletesAt: researchCompletesAt,
            unlockedAt: null
          }
        }
      },
      { 
        upsert: true,
        new: true 
      }
    );
    
    res.json({
      success: true,
      message: 'Research started successfully',
      data: {
        researchStartedAt,
        researchCompletesAt,
        researchTimeHours: researchFeature.researchTimeHours
      }
    });
  } catch (error) {
    console.error('Error starting research:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting research'
    });
  }
});

// Check and complete research for a specific feature
router.post('/complete-research/:featureId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { featureId } = req.params;
    
    // Find the research feature in the database
    if (!mongoose.connection.db) {
      res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
      return;
    }
    
    const researchFeature = await mongoose.connection.db.collection('researchFeatures').findOne({ featureId });
    
    if (!researchFeature) {
      res.status(404).json({
        success: false,
        message: 'Research feature not found'
      });
      return;
    }
    
    // Get user research data
    const userResearch = await ResearchUser.findOne({ 
      userId, 
      researchId: researchFeature.categoryObjectId 
    });
    
    if (!userResearch) {
      res.status(404).json({
        success: false,
        message: 'User research data not found'
      });
      return;
    }
    
    // Find the specific feature
    const featureIndex = userResearch.features.findIndex((f: any) => f.id === featureId);
    
    if (featureIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Feature not found in user research'
      });
      return;
    }
    
    const feature = userResearch.features[featureIndex];
    
    // Check if research is complete
    if (!feature.isResearching) {
      res.status(400).json({
        success: false,
        message: 'No research in progress for this feature'
      });
      return;
    }
    
    const now = new Date();
    const researchCompletesAt = new Date(feature.researchCompletesAt!);
    
    if (now < researchCompletesAt) {
      res.status(400).json({
        success: false,
        message: 'Research not yet complete',
        data: {
          researchCompletesAt: feature.researchCompletesAt,
          timeRemaining: researchCompletesAt.getTime() - now.getTime()
        }
      });
      return;
    }
    
    // Complete the research
    const updatedFeatures = [...userResearch.features];
    updatedFeatures[featureIndex] = {
      ...feature,
      isResearching: false,
      isUnlocked: true,
      unlockedAt: now
    };
    
    await ResearchUser.findByIdAndUpdate(
      userResearch._id,
      {
        $set: {
          features: updatedFeatures,
          updatedAt: now
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Research completed successfully',
      data: {
        featureId,
        isUnlocked: true,
        unlockedAt: now
      }
    });
  } catch (error) {
    console.error('Error completing research:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing research'
    });
  }
});

router.post('/unlock-feature', auth, async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  
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
    
    // Use transaction to ensure both operations succeed or fail together
    await session.withTransaction(async () => {
      // Deduct cost from user balance
      await User.findByIdAndUpdate(
        userId,
        {
          'balance.total': user.balance.total - cost,
          'balance.lastUpdated': new Date()
        },
        { session }
      );
      
      // Update research feature unlock status using proper array update operators
      await ResearchUser.findOneAndUpdate(
        { userId, researchId: research._id },
        {
          $set: {
            'updatedAt': new Date()
          },
          $addToSet: {
            features: {
              id: featureId,
              isUnlocked: true,
              unlockedAt: new Date()
            }
          }
        },
        { 
          session, 
          upsert: true,
          new: true 
        }
      );
    });
    
    res.json({
      success: true,
      message: 'Feature unlocked successfully',
      newBalance: user.balance.total - cost
    });
  } catch (error) {
    console.error('Error unlocking research feature:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking research feature'
    });
  } finally {
    await session.endSession();
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

// NEW ENDPOINTS FOR INDIVIDUAL FEATURE MANAGEMENT
// These use the new UserResearchFeature collection and don't interfere with category unlocking

// Get user's individual feature status for a category
router.get('/user-features/:categoryId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { categoryId } = req.params;
    
    const featuresWithStatus = await ResearchFeatureService.getUserFeatures(userId, categoryId);
    
    res.json({
      success: true,
      data: featuresWithStatus
    });
  } catch (error) {
    console.error('Error fetching user research features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user research features'
    });
  }
});

// Start research for an individual feature
router.post('/start-feature-research', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { categoryId, featureId } = req.body;
    
    if (!categoryId || !featureId) {
      res.status(400).json({
        success: false,
        message: 'Category ID and Feature ID are required'
      });
      return;
    }
    
    const result = await ResearchFeatureService.startResearch(userId, categoryId, featureId);
    
    if (result.success) {
              res.json({
                success: true,
                message: result.message,
                data: {
                  researchStartedAt: result.researchStartedAt?.toISOString(),
                  researchCompletesAt: result.researchCompletesAt?.toISOString(),
                  researchTimeHours: result.researchTimeHours
                },
                newBalance: result.newBalance
              });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error starting feature research:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting feature research'
    });
  }
});

// Complete research for an individual feature
router.post('/complete-feature-research', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { categoryId, featureId } = req.body;
    
    if (!categoryId || !featureId) {
      res.status(400).json({
        success: false,
        message: 'Category ID and Feature ID are required'
      });
      return;
    }
    
    const result = await ResearchFeatureService.completeResearch(userId, categoryId, featureId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          featureId,
          isUnlocked: result.isUnlocked,
          unlockedAt: result.unlockedAt?.toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error completing feature research:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing feature research'
    });
  }
});

// Get individual feature status
router.get('/user-feature-status/:categoryId/:featureId', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { categoryId, featureId } = req.params;
    
    const featureStatus = await ResearchFeatureService.getUserFeatureStatus(userId, categoryId, featureId);
    
    if (!featureStatus) {
      res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: featureStatus
    });
  } catch (error) {
    console.error('Error fetching feature status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feature status'
    });
  }
});

export default router;
