import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { ResearchUnlockService } from '../services/ResearchUnlockService';
import { ResearchFeatureService } from '../services/ResearchFeatureService';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import { getResearchFeatures } from '../config/researchFeatures';
import { User } from '../models/User';
import { UserTaskProgress } from '../models/UserTaskProgress';
import { getTaskList } from '../config/taskListData';
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
      if (categoryId === 'home-defense') {
        try {
          const progress = await UserTaskProgress.findOne({ userId });
          const wasAlreadyUnlocked = progress?.homeDefenseUnlockedAt;
          
          if (!wasAlreadyUnlocked) {
            await UserTaskProgress.findOneAndUpdate(
              { userId },
              {
                $set: { homeDefenseUnlockedAt: new Date() },
                $setOnInsert: {
                  completedTasks: [],
                  collectedTasks: [],
                  skippedTasks: [],
                  showTaskGuide: true
                }
              },
              { upsert: true, new: true }
            );
            
            const taskList = getTaskList();
            const taskId = 'unlock-home-defense';
            const homeDefenseTask = taskList.find(t => t.id === taskId);
            
            if (homeDefenseTask && homeDefenseTask.autoCompleteConditions) {
              const user = await User.findById(userId).lean();
              if (user) {
                const updatedProgress = await UserTaskProgress.findOne({ userId });
                const shouldAutoComplete = homeDefenseTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
                
                if (shouldAutoComplete) {
                  const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
                    (task: any) => task.taskId === taskId
                  );
                  
                  if (!isAlreadyCompleted) {
                    await UserTaskProgress.findOneAndUpdate(
                      { userId },
                      {
                        $setOnInsert: {
                          completedTasks: [],
                          collectedTasks: [],
                          skippedTasks: [],
                          showTaskGuide: true
                        }
                      },
                      { upsert: true }
                    );
                    
                    await UserTaskProgress.findOneAndUpdate(
                      {
                        userId,
                        'completedTasks.taskId': { $ne: taskId }
                      },
                      {
                        $push: {
                          completedTasks: {
                            taskId: taskId,
                            completedAt: new Date()
                          }
                        },
                        $set: { lastCompletedTaskId: taskId }
                      },
                      { new: true }
                    );
                  }
                }
              }
            }
          }
        } catch (trackingError) {
          console.error('Error tracking home-defense unlock for task completion:', trackingError);
        }
      }
      
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
      if (categoryId === 'home-defense' && featureId === 'antivirus') {
        try {
          const { UserTaskProgress } = await import('../models/UserTaskProgress');
          const { getTaskList } = await import('../config/taskListData');
          const progress = await UserTaskProgress.findOne({ userId });
          const wasAlreadyUnlocked = progress?.antivirusUnlockedAt;
          
          if (!wasAlreadyUnlocked) {
            await UserTaskProgress.findOneAndUpdate(
              { userId },
              {
                $set: { antivirusUnlockedAt: result.unlockedAt || new Date() },
                $setOnInsert: {
                  completedTasks: [],
                  collectedTasks: [],
                  skippedTasks: [],
                  showTaskGuide: true
                }
              },
              { upsert: true, new: true }
            );
            
            const taskList = getTaskList();
            const taskId = 'unlock-antivirus';
            const antivirusTask = taskList.find(t => t.id === taskId);
            
            if (antivirusTask && antivirusTask.autoCompleteConditions) {
              const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
              const user = await User.findById(userId).lean();
              if (user && updatedProgress) {
                const completedTaskIds = new Set(updatedProgress.completedTasks.map(t => t.taskId));
                const collectedTaskIds = new Set(updatedProgress.collectedTasks || []);
                const skippedTaskIds = new Set(updatedProgress.skippedTasks || []);
                
                if (!collectedTaskIds.has(taskId) && !skippedTaskIds.has(taskId) && !completedTaskIds.has(taskId)) {
                  const shouldAutoComplete = antivirusTask.autoCompleteConditions(user as any, updatedProgress as any);
                  if (shouldAutoComplete) {
                    await UserTaskProgress.findOneAndUpdate(
                      {
                        userId,
                        'completedTasks.taskId': { $ne: taskId }
                      },
                      {
                        $push: {
                          completedTasks: {
                            taskId,
                            completedAt: new Date()
                          }
                        },
                        $set: { lastCompletedTaskId: taskId }
                      },
                      { new: true }
                    );
                  }
                }
              }
            }
          }
        } catch (trackingError) {
          console.error('Error tracking antivirus unlock for task completion:', trackingError);
        }
      }
      
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

// Speedup research for an individual feature
router.post('/speedup-feature-research', auth, async (req: Request, res: Response) => {
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

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get the research feature to check if research is in progress
    const { UserResearchFeature } = await import('../models/UserResearchFeature');
    const userResearchFeature = await UserResearchFeature.findOne({
      userId,
      categoryId,
      featureId
    });

    if (!userResearchFeature) {
      res.status(400).json({
        success: false,
        message: 'Research feature not found'
      });
      return;
    }

    if (!userResearchFeature.isResearching) {
      res.status(400).json({
        success: false,
        message: 'No research in progress for this feature'
      });
      return;
    }

    if (userResearchFeature.isUnlocked) {
      res.status(400).json({
        success: false,
        message: 'Feature already unlocked'
      });
      return;
    }

    // Complete research immediately (bypass time check for speedup)
    // Use transaction to ensure atomicity and prevent race conditions with auto-completion
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // First, verify the research is still in progress (double-check to prevent race conditions)
        const currentResearch = await UserResearchFeature.findOne({
          userId,
          categoryId,
          featureId
        }).session(session);

        if (!currentResearch) {
          throw new Error('Research feature not found');
        }

        if (!currentResearch.isResearching) {
          throw new Error('No research in progress for this feature');
        }

        if (currentResearch.isUnlocked) {
          throw new Error('Feature already unlocked');
        }

        if (!currentResearch.researchCompletesAt) {
          throw new Error('Research completion time not found');
        }

        // Calculate cost inside transaction based on current time to prevent overcharging
        const now = new Date();
        const completesAt = currentResearch.researchCompletesAt;
        const remainingMs = Math.max(0, completesAt.getTime() - now.getTime());
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        
        if (remainingSeconds <= 0) {
          throw new Error('Research is already complete');
        }

        // Calculate cost based on actual remaining time at transaction execution
        const cost = remainingSeconds * 5;

        // Reload user within transaction to ensure we have latest balance
        const userInTransaction = await User.findById(userId).session(session);
        if (!userInTransaction) {
          throw new Error('User not found');
        }

        // Verify sufficient balance
        if (userInTransaction.balance.total < cost) {
          throw new Error('Insufficient funds');
        }

        // Mark as unlocked and clear research status atomically
        const unlockedAt = new Date();
        await UserResearchFeature.findByIdAndUpdate(
          currentResearch._id,
          {
            isUnlocked: true,
            unlockedAt,
            isResearching: false,  // This prevents client-side auto-completion from running
            researchStartedAt: null,
            researchCompletesAt: null
          },
          { session }
        );

        // Deduct balance atomically
        userInTransaction.balance.total -= cost;
        await userInTransaction.save({ session });
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      if (error.message === 'Research feature not found') {
        res.status(400).json({
          success: false,
          message: 'Research feature not found'
        });
        return;
      }
      if (error.message === 'No research in progress for this feature') {
        res.status(400).json({
          success: false,
          message: 'No research in progress for this feature'
        });
        return;
      }
      if (error.message === 'Feature already unlocked') {
        res.status(400).json({
          success: false,
          message: 'Feature already unlocked'
        });
        return;
      }
      if (error.message === 'Research completion time not found') {
        res.status(400).json({
          success: false,
          message: 'Research completion time not found'
        });
        return;
      }
      if (error.message === 'Research is already complete') {
        res.status(400).json({
          success: false,
          message: 'Research is already complete'
        });
        return;
      }
      if (error.message === 'Insufficient funds') {
        res.status(400).json({
          success: false,
          message: 'Insufficient funds'
        });
        return;
      }
      
      // Re-throw unexpected errors to be caught by outer catch
      throw error;
    } finally {
      await session.endSession();
    }

    // Reload user to get updated balance
    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving updated user data'
      });
      return;
    }

    if (categoryId === 'home-defense' && featureId === 'antivirus') {
      try {
        const { UserTaskProgress } = await import('../models/UserTaskProgress');
        const { getTaskList } = await import('../config/taskListData');
        const progress = await UserTaskProgress.findOne({ userId });
        const wasAlreadyUnlocked = progress?.antivirusUnlockedAt;
        
        if (!wasAlreadyUnlocked) {
          await UserTaskProgress.findOneAndUpdate(
            { userId },
            {
              $set: { antivirusUnlockedAt: new Date() },
              $setOnInsert: {
                completedTasks: [],
                collectedTasks: [],
                skippedTasks: [],
                showTaskGuide: true
              }
            },
            { upsert: true, new: true }
          );
          
          const taskList = getTaskList();
          const taskId = 'unlock-antivirus';
          const antivirusTask = taskList.find(t => t.id === taskId);
          
          if (antivirusTask && antivirusTask.autoCompleteConditions) {
            const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
            if (updatedProgress) {
              const completedTaskIds = new Set(updatedProgress.completedTasks.map(t => t.taskId));
              const collectedTaskIds = new Set(updatedProgress.collectedTasks || []);
              const skippedTaskIds = new Set(updatedProgress.skippedTasks || []);
              
              if (!collectedTaskIds.has(taskId) && !skippedTaskIds.has(taskId) && !completedTaskIds.has(taskId)) {
                const shouldAutoComplete = antivirusTask.autoCompleteConditions(updatedUser as any, updatedProgress as any);
                if (shouldAutoComplete) {
                  await UserTaskProgress.findOneAndUpdate(
                    {
                      userId,
                      'completedTasks.taskId': { $ne: taskId }
                    },
                    {
                      $push: {
                        completedTasks: {
                          taskId,
                          completedAt: new Date()
                        }
                      },
                      $set: { lastCompletedTaskId: taskId }
                    },
                    { new: true }
                  );
                }
              }
            }
          }
        }
      } catch (trackingError) {
        console.error('Error tracking antivirus unlock for task completion:', trackingError);
      }
    }

    res.json({
      success: true,
      message: 'Research completed successfully',
      newBalance: updatedUser.balance.total
    });
  } catch (error) {
    console.error('Error speeding up feature research:', error);
    res.status(500).json({
      success: false,
      message: 'Error speeding up feature research'
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
