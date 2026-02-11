import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { UserTaskProgress } from '../models/UserTaskProgress';
import { User } from '../models/User';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import { CrewStatus } from '../models/CrewStatus';
import { CrewChatMessage } from '../models/CrewChatMessage';
import { getTaskList } from '../config/taskListData';
import { ResearchFeatureService } from '../services/ResearchFeatureService';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/current-task', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    let progress = await UserTaskProgress.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          completedTasks: [],
          collectedTasks: [],
          skippedTasks: [],
          showTaskGuide: true
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).select('completedTasks collectedTasks skippedTasks showTaskGuide taskGuidePillTappedOnce profileVisitedAt themeChangedToDarkAt themeChangedToLightAt avatarChangedAt taskGuideShownAt homeVisitedAt hackmapVisitedAt digitalBarracksVisitedAt walletViewedAt attackedLevel1NpcAt attackedLevel5NpcAt attackedLevel6NpcAt visitedAnotherUserProfileAt homeDefenseUnlockedAt antivirusUnlockedAt hackAbilityUnlockedAt addBattalionCResearchUnlockedAt battalionSizePlus250ResearchUnlockedAt hackCrewUnlockedAt crewSystemResearchUnlockedAt crewJoinedAt firstCrewChatMessageSentAt shieldActivatedAt financialStatementViewedAt usernameChangeSettingViewedAt').lean();

    if (!progress) {
      res.status(500).json({ error: 'Failed to initialize task progress' });
      return;
    }

    // Backfill: ensure taskGuidePillTappedOnce exists for all accounts (new and old)
    if (progress.taskGuidePillTappedOnce === undefined) {
      await UserTaskProgress.updateOne(
        { userId },
        { $set: { taskGuidePillTappedOnce: false } }
      );
      (progress as { taskGuidePillTappedOnce?: boolean }).taskGuidePillTappedOnce = false;
    }

    const taskList = getTaskList();
    let completedTaskIdsArray = progress.completedTasks.map(t => t.taskId);
    let collectedTaskIdsArray = progress.collectedTasks || [];
    let completedTaskIds = new Set(completedTaskIdsArray);
    let collectedTaskIds = new Set(collectedTaskIdsArray);
    let skippedTaskIds = new Set(progress.skippedTasks);

    // Fetch user with bot build counters and unlocked features to check auto-completion conditions
    // This ensures tasks like 'build-100-guardians' are auto-completed if user has already built 100+ guardians
    // This ensures tasks like 'free-hack-rig' are auto-completed if user has already unlocked Hack Rig
    // This ensures tasks like 'build-research-center' are auto-completed if user has already unlocked Research Center
    // This ensures tasks like 'reach-level-2' are auto-completed if user has already reached level 2
    // Note: Using .lean() to get plain JavaScript object, and explicitly selecting fields
    // If fields don't exist in database, they will be undefined (not default value)
    const user = await User.findById(userId).select('totalGuardiansBuilt totalPhreaksBuilt totalBreachersBuilt unlockedFeatures.hackRig unlockedFeatures.researchCenter unlockedFeatures.rentalHousing1 unlockedFeatures.rentalHousing2 level').lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!progress.homeDefenseUnlockedAt) {
      const homeDefenseResearch = await Research.findOne({ categoryId: 'home-defense' });
      if (homeDefenseResearch) {
        const userResearch = await ResearchUser.findOne({
          userId,
          researchId: homeDefenseResearch._id
        });
        
        if (userResearch && userResearch.isUnlocked) {
          await UserTaskProgress.findOneAndUpdate(
            { userId },
            {
              $set: { homeDefenseUnlockedAt: userResearch.unlockedAt || new Date() },
              $setOnInsert: {
                completedTasks: [],
                collectedTasks: [],
                skippedTasks: [],
                showTaskGuide: true
              }
            },
            { upsert: true, new: true }
          );
          
          const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
          if (updatedProgress) {
            progress = updatedProgress as any;
          }
        }
      }
    }

    if (!progress.antivirusUnlockedAt) {
      const { UserResearchFeature } = await import('../models/UserResearchFeature');
      const antivirusFeature = await UserResearchFeature.findOne({
        userId,
        categoryId: 'home-defense',
        featureId: 'antivirus'
      });
      
      if (antivirusFeature && antivirusFeature.isUnlocked) {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $set: { antivirusUnlockedAt: antivirusFeature.unlockedAt || new Date() },
            $setOnInsert: {
              completedTasks: [],
              collectedTasks: [],
              skippedTasks: [],
              showTaskGuide: true
            }
          },
          { upsert: true, new: true }
        );
        
        const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
        if (updatedProgress) {
          progress = updatedProgress as any;
        }
      }
    }

    if (!progress.hackAbilityUnlockedAt) {
      const hackAbilityResearch = await Research.findOne({ categoryId: 'hack-ability' });
      if (hackAbilityResearch) {
        const userResearch = await ResearchUser.findOne({
          userId,
          researchId: hackAbilityResearch._id
        });

        if (userResearch && userResearch.isUnlocked) {
          await UserTaskProgress.findOneAndUpdate(
            { userId },
            {
              $set: { hackAbilityUnlockedAt: userResearch.unlockedAt || new Date() },
              $setOnInsert: {
                completedTasks: [],
                collectedTasks: [],
                skippedTasks: [],
                showTaskGuide: true
              }
            },
            { upsert: true, new: true }
          );

          const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
          if (updatedProgress) {
            progress = updatedProgress as any;
          }
        }
      }
    }

    if (!progress.hackCrewUnlockedAt) {
      const hackCrewResearch = await Research.findOne({ categoryId: 'hack-crew' });
      if (hackCrewResearch) {
        const userResearch = await ResearchUser.findOne({
          userId,
          researchId: hackCrewResearch._id
        });

        if (userResearch && userResearch.isUnlocked) {
          await UserTaskProgress.findOneAndUpdate(
            { userId },
            {
              $set: { hackCrewUnlockedAt: userResearch.unlockedAt || new Date() },
              $setOnInsert: {
                completedTasks: [],
                collectedTasks: [],
                skippedTasks: [],
                showTaskGuide: true
              }
            },
            { upsert: true, new: true }
          );

          const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
          if (updatedProgress) {
            progress = updatedProgress as any;
          }
        }
      }
    }

    if (!progress.addBattalionCResearchUnlockedAt) {
      const { UserResearchFeature } = await import('../models/UserResearchFeature');
      const addBattalionCFeature = await UserResearchFeature.findOne({
        userId,
        ...ResearchFeatureService.getFeatureIdFindFilter('hack-ability', 'add-battalion-c')
      });

      if (addBattalionCFeature && addBattalionCFeature.isUnlocked) {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $set: { addBattalionCResearchUnlockedAt: addBattalionCFeature.unlockedAt || new Date() },
            $setOnInsert: {
              completedTasks: [],
              collectedTasks: [],
              skippedTasks: [],
              showTaskGuide: true
            }
          },
          { upsert: true, new: true }
        );

        const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
        if (updatedProgress) {
          progress = updatedProgress as any;
        }
      }
    }

    if (!progress.battalionSizePlus250ResearchUnlockedAt) {
      const { UserResearchFeature } = await import('../models/UserResearchFeature');
      const battalionSizeFeature = await UserResearchFeature.findOne({
        userId,
        ...ResearchFeatureService.getFeatureIdFindFilter('hack-ability', 'battalion-size-250')
      });

      if (battalionSizeFeature && battalionSizeFeature.isUnlocked) {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $set: { battalionSizePlus250ResearchUnlockedAt: battalionSizeFeature.unlockedAt || new Date() },
            $setOnInsert: {
              completedTasks: [],
              collectedTasks: [],
              skippedTasks: [],
              showTaskGuide: true
            }
          },
          { upsert: true, new: true }
        );

        const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
        if (updatedProgress) {
          progress = updatedProgress as any;
        }
      }
    }

    if (!progress.crewSystemResearchUnlockedAt) {
      const { UserResearchFeature } = await import('../models/UserResearchFeature');
      const crewSystemFeature = await UserResearchFeature.findOne({
        userId,
        categoryId: 'hack-crew',
        featureId: 'crew-system-unlock'
      });

      if (crewSystemFeature && crewSystemFeature.isUnlocked) {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $set: { crewSystemResearchUnlockedAt: crewSystemFeature.unlockedAt || new Date() },
            $setOnInsert: {
              completedTasks: [],
              collectedTasks: [],
              skippedTasks: [],
              showTaskGuide: true
            }
          },
          { upsert: true, new: true }
        );

        const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
        if (updatedProgress) {
          progress = updatedProgress as any;
        }
      }
    }

    if (!progress.crewJoinedAt) {
      const crewStatus = await CrewStatus.findOne({ userId }).lean();
      if (crewStatus && crewStatus.isInCrew) {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $set: { crewJoinedAt: (crewStatus as any).updatedAt || new Date() },
            $setOnInsert: {
              completedTasks: [],
              collectedTasks: [],
              skippedTasks: [],
              showTaskGuide: true
            }
          },
          { upsert: true, new: true }
        );

        const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
        if (updatedProgress) {
          progress = updatedProgress as any;
        }
      }
    }

    if (!progress.firstCrewChatMessageSentAt) {
      const firstMessage = await CrewChatMessage.findOne({ userId })
        .sort({ createdAt: 1 })
        .select('createdAt')
        .lean();
      if (firstMessage && firstMessage.createdAt) {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $set: { firstCrewChatMessageSentAt: firstMessage.createdAt },
            $setOnInsert: {
              completedTasks: [],
              collectedTasks: [],
              skippedTasks: [],
              showTaskGuide: true
            }
          },
          { upsert: true, new: true }
        );

        const updatedProgress = await UserTaskProgress.findOne({ userId }).lean();
        if (updatedProgress) {
          progress = updatedProgress as any;
        }
      }
    }

    let currentTask = null;
    const sortedTasks = [...taskList].sort((a, b) => a.order - b.order);
    let anyTaskAutoCompleted = false;

    // FIRST PASS: Check ALL tasks for auto-completion conditions
    // This runs on every task list fetch, so tasks are immediately marked as completed
    // if their conditions are met (e.g., build-100-guardians if totalGuardiansBuilt >= 100)
    for (const task of sortedTasks) {
      // Skip tasks that have been collected (reward given), skipped, or already completed
      if (collectedTaskIds.has(task.id) || skippedTaskIds.has(task.id) || completedTaskIds.has(task.id)) {
        continue;
      }

      // Check auto-completion conditions (e.g., build-100-guardians checks totalGuardiansBuilt >= 100)
      if (task.autoCompleteConditions) {
        const shouldAutoComplete = task.autoCompleteConditions(user as any, progress);
        if (shouldAutoComplete) {
          // Check if task is already completed to avoid duplicate key errors
          if (!completedTaskIds.has(task.id)) {
            // Use atomic operation to prevent race conditions - only add if taskId doesn't exist
            // This immediately marks the task as completed, allowing user to collect reward
            // Note: Document already exists (ensured at start of function), so no upsert needed
            // Without upsert, if task is already completed, this is a silent no-op (prevents duplicate key errors)
            await UserTaskProgress.findOneAndUpdate(
              {
                userId,
                'completedTasks.taskId': { $ne: task.id }
              },
              {
                $push: {
                  completedTasks: {
                    taskId: task.id,
                    completedAt: new Date()
                  }
                },
                $set: { lastCompletedTaskId: task.id }
              },
              { new: true }
            );
            anyTaskAutoCompleted = true;
          }
        }
      }
    }

    // SECOND PASS: After auto-completing tasks, refresh progress and find the current task
    if (anyTaskAutoCompleted) {
      const updatedProgress = await UserTaskProgress.findOne({ userId })
        .select('completedTasks collectedTasks skippedTasks showTaskGuide taskGuidePillTappedOnce profileVisitedAt themeChangedToDarkAt themeChangedToLightAt avatarChangedAt taskGuideShownAt homeVisitedAt hackmapVisitedAt digitalBarracksVisitedAt walletViewedAt attackedLevel1NpcAt attackedLevel5NpcAt attackedLevel6NpcAt visitedAnotherUserProfileAt homeDefenseUnlockedAt antivirusUnlockedAt hackAbilityUnlockedAt addBattalionCResearchUnlockedAt battalionSizePlus250ResearchUnlockedAt hackCrewUnlockedAt crewSystemResearchUnlockedAt crewJoinedAt firstCrewChatMessageSentAt shieldActivatedAt financialStatementViewedAt usernameChangeSettingViewedAt')
        .lean();
      
      if (updatedProgress) {
        progress = updatedProgress;
        completedTaskIdsArray = progress.completedTasks.map(t => t.taskId);
        collectedTaskIdsArray = progress.collectedTasks || [];
        completedTaskIds = new Set(completedTaskIdsArray);
        collectedTaskIds = new Set(collectedTaskIdsArray);
        skippedTaskIds = new Set(progress.skippedTasks);
      }
    }

    // Now find the first incomplete task to show as currentTask
    for (const task of sortedTasks) {
      // Skip tasks that have been collected (reward given), skipped, or already completed
      if (collectedTaskIds.has(task.id) || skippedTaskIds.has(task.id) || completedTaskIds.has(task.id)) {
        continue;
      }

      currentTask = {
        id: task.id,
        title: task.title,
        description: task.description
      };
      break;
    }

    const totalTasks = taskList.length;
    const completedCount = progress.completedTasks.length;

    res.json({
      success: true,
      currentTask,
      progress: {
        completed: completedCount,
        total: totalTasks
      },
      showTaskGuide: progress.showTaskGuide,
      taskGuidePillTappedOnce: progress.taskGuidePillTappedOnce === true,
      taskList: taskList.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        order: task.order,
        reward: task.reward,
        howTo: task.howTo
      })),
      completedTaskIds: completedTaskIdsArray,
      collectedTaskIds: collectedTaskIdsArray
    });
  } catch (error) {
    console.error('Error fetching current task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete-task', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { taskId } = req.body;

    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      res.status(400).json({ error: 'Valid task ID is required' });
      return;
    }

    const trimmedTaskId = taskId.trim();
    const taskList = getTaskList();
    const taskExists = taskList.some(t => t.id === trimmedTaskId);

    if (!taskExists) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    // Find the task to get reward
    const task = taskList.find(t => t.id === trimmedTaskId);
    const rewardAmount = task?.reward?.value || 0;

    // Use transaction with retry logic to handle write conflicts
    // withTransaction has built-in retry for transient errors, but we add explicit handling
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Check if already collected INSIDE transaction to prevent race conditions
        let progress = await UserTaskProgress.findOne({ userId }).session(session);
        const alreadyCollected = progress?.collectedTasks?.includes(trimmedTaskId);

        if (alreadyCollected) {
          // Task already collected - abort transaction and return early
          throw new Error('TASK_ALREADY_COLLECTED');
        }

        // Ensure task is marked as completed (action done) before collecting reward
        const isCompleted = progress?.completedTasks.some(t => t.taskId === trimmedTaskId);
        if (!isCompleted) {
          // Mark as completed first (action done, but reward not collected yet) - atomic operation
          const updatedProgress = await UserTaskProgress.findOneAndUpdate(
            { userId },
            {
              $addToSet: {
                completedTasks: {
                  taskId: trimmedTaskId,
                  completedAt: new Date()
                }
              },
              $setOnInsert: {
                collectedTasks: [],
                skippedTasks: [],
                showTaskGuide: true
              }
            },
            { upsert: true, new: true, session }
          );
          // Reassign progress to reflect the updated state
          progress = updatedProgress;
        }

        // Update user balance with reward (atomic with collectedTasks update)
        if (rewardAmount > 0) {
          const user = await User.findById(userId).session(session);
          if (user) {
            user.balance.total += rewardAmount;
            user.balance.lastUpdated = new Date();
            await user.save({ session });
          }
        }

        // Mark task as collected (reward given) - atomic operation
        // Use findOneAndUpdate with condition to atomically check and update
        const updateResult = await UserTaskProgress.findOneAndUpdate(
          { 
            userId,
            collectedTasks: { $ne: trimmedTaskId } // Only update if not already collected
          },
          {
            $addToSet: { collectedTasks: trimmedTaskId },
            $set: { lastCompletedTaskId: trimmedTaskId },
            $setOnInsert: {
              completedTasks: progress?.completedTasks || [{
                taskId: trimmedTaskId,
                completedAt: new Date()
              }],
              skippedTasks: [],
              showTaskGuide: true
            }
          },
          { upsert: true, new: true, session }
        );

        // If updateResult is null, task was already collected by another request
        if (!updateResult) {
          throw new Error('TASK_ALREADY_COLLECTED');
        }
      });
    } catch (error: any) {
      // Handle specific error cases
      if (error.message === 'TASK_ALREADY_COLLECTED') {
        res.json({
          success: true,
          message: 'Task already collected',
          rewardAmount: 0
        });
        return;
      }

      // Handle duplicate key error (race condition where task was already collected)
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        res.json({
          success: true,
          message: 'Task already collected',
          rewardAmount: 0
        });
        return;
      }

      // Check if it's a transient transaction error (WriteConflict)
      // withTransaction should retry these automatically, but if it still fails, we handle it
      const isTransientError = 
        error.code === 112 || // WriteConflict
        error.codeName === 'WriteConflict' ||
        (error.errorLabels && error.errorLabels.includes('TransientTransactionError'));

      if (isTransientError) {
        // Log the error but return a user-friendly message
        // The transaction was retried by withTransaction, so if we get here, it failed after retries
        console.error('Write conflict after retries in task completion:', error);
        res.status(500).json({ 
          error: 'Task completion failed due to concurrent operation. Please try again.',
          retryable: true
        });
        return;
      }

      // Re-throw other errors to be handled by outer catch
      throw error;
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: 'Task completed successfully',
      rewardAmount
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/skip-task', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { taskId } = req.body;

    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      res.status(400).json({ error: 'Valid task ID is required' });
      return;
    }

    const trimmedTaskId = taskId.trim();
    const taskList = getTaskList();
    const task = taskList.find(t => t.id === trimmedTaskId);

    if (!task) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    if (!task.skipable) {
      res.status(400).json({ error: 'This task cannot be skipped' });
      return;
    }

    // Use atomic findOneAndUpdate with upsert to prevent race conditions
    await UserTaskProgress.findOneAndUpdate(
      { userId },
      {
        $addToSet: { skippedTasks: trimmedTaskId },
        $setOnInsert: {
          completedTasks: [],
          collectedTasks: [],
          showTaskGuide: true
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Task skipped successfully'
    });
  } catch (error) {
    console.error('Error skipping task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-profile-visit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Check if profile was already visited
    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyVisited = existingProgress?.profileVisitedAt;

    // Update profileVisitedAt if not already set (forward compatible - only track new visits)
    if (!wasAlreadyVisited) {
      // Only update if profileVisitedAt doesn't exist
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { profileVisitedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    // If this is a new visit (not already visited), check if view-profile task should be auto-completed
    if (!wasAlreadyVisited) {
      const taskList = getTaskList();
      const viewProfileTask = taskList.find(t => t.id === 'view-profile');
      
        if (viewProfileTask && viewProfileTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = viewProfileTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            // Check if task is already completed to avoid duplicate key errors
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'view-profile'
            );
            
            if (!isAlreadyCompleted) {
              // Ensure document exists first
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
                    collectedTasks: [],
                    skippedTasks: [],
                    showTaskGuide: true
                  }
                },
                { upsert: true }
              );
              
              // Use atomic operation to prevent race conditions - only add if taskId doesn't exist
              await UserTaskProgress.findOneAndUpdate(
                {
                  userId,
                  'completedTasks.taskId': { $ne: 'view-profile' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'view-profile',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'view-profile' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Profile visit tracked' });
  } catch (error) {
    console.error('Error tracking profile visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-another-user-profile-visit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { visitedUserId } = req.body;
    
    if (!visitedUserId) {
      res.status(400).json({ error: 'Visited user ID is required' });
      return;
    }

    const currentUserIdStr = String(userId);
    const visitedUserIdStr = String(visitedUserId);

    if (currentUserIdStr === visitedUserIdStr) {
      res.json({ success: true, message: 'Cannot track visit to own profile' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyVisited = existingProgress?.visitedAnotherUserProfileAt;

    if (!wasAlreadyVisited) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { visitedAnotherUserProfileAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyVisited) {
      const taskList = getTaskList();
      const taskId = 'view-member-profile';
      const memberProfileTask = taskList.find(t => t.id === taskId);
      
      if (memberProfileTask && memberProfileTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = memberProfileTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === taskId
            );
            
            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
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

    res.json({ success: true, message: 'Another user profile visit tracked' });
  } catch (error) {
    console.error('Error tracking another user profile visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-theme-change', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { theme } = req.body;

    if (!theme || (theme !== 'dark' && theme !== 'light')) {
      res.status(400).json({ error: 'Valid theme is required (dark or light)' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyChanged = theme === 'dark' 
      ? existingProgress?.themeChangedToDarkAt 
      : existingProgress?.themeChangedToLightAt;

    const fieldToUpdate = theme === 'dark' ? 'themeChangedToDarkAt' : 'themeChangedToLightAt';
    const taskId = theme === 'dark' ? 'use-hacker-mode' : 'use-business-mode';

    if (!wasAlreadyChanged) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { [fieldToUpdate]: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyChanged) {
      const taskList = getTaskList();
      const themeTask = taskList.find(t => t.id === taskId);
      
      if (themeTask && themeTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = themeTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            // Check if task is already completed to avoid duplicate key errors
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === taskId
            );
            
            if (!isAlreadyCompleted) {
              // Ensure document exists first
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
                    collectedTasks: [],
                    skippedTasks: [],
                    showTaskGuide: true
                  }
                },
                { upsert: true }
              );
              
              // Use atomic operation to prevent race conditions - only add if taskId doesn't exist
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

    res.json({ success: true, message: 'Theme change tracked' });
  } catch (error) {
    console.error('Error tracking theme change:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-avatar-change', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyChanged = existingProgress?.avatarChangedAt;

    if (!wasAlreadyChanged) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { avatarChangedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyChanged) {
      const taskList = getTaskList();
      const avatarTask = taskList.find(t => t.id === 'change-avatar');
      
      if (avatarTask && avatarTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = avatarTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'change-avatar'
            );
            
            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
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
                  'completedTasks.taskId': { $ne: 'change-avatar' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'change-avatar',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'change-avatar' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Avatar change tracked' });
  } catch (error) {
    console.error('Error tracking avatar change:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-home-visit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyVisited = existingProgress?.homeVisitedAt;

    if (!wasAlreadyVisited) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { homeVisitedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyVisited) {
      const taskList = getTaskList();
      const homeTask = taskList.find(t => t.id === 'visit-home');
      
      if (homeTask && homeTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = homeTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'visit-home'
            );
            
            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
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
                  'completedTasks.taskId': { $ne: 'visit-home' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'visit-home',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'visit-home' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Home visit tracked' });
  } catch (error) {
    console.error('Error tracking home visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-hackmap-visit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyVisited = existingProgress?.hackmapVisitedAt;

    if (!wasAlreadyVisited) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { hackmapVisitedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyVisited) {
      const taskList = getTaskList();
      const hackmapTask = taskList.find(t => t.id === 'visit-hackmap');
      
      if (hackmapTask && hackmapTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = hackmapTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'visit-hackmap'
            );
            
            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
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
                  'completedTasks.taskId': { $ne: 'visit-hackmap' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'visit-hackmap',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'visit-hackmap' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Hackmap visit tracked' });
  } catch (error) {
    console.error('Error tracking hackmap visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-digital-barracks-visit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyVisited = existingProgress?.digitalBarracksVisitedAt;

    if (!wasAlreadyVisited) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { digitalBarracksVisitedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyVisited) {
      const taskList = getTaskList();
      const digitalBarracksTask = taskList.find(t => t.id === 'visit-digital-barracks');
      
      if (digitalBarracksTask && digitalBarracksTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = digitalBarracksTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'visit-digital-barracks'
            );
            
            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
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
                  'completedTasks.taskId': { $ne: 'visit-digital-barracks' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'visit-digital-barracks',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'visit-digital-barracks' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Digital Barracks visit tracked' });
  } catch (error) {
    console.error('Error tracking digital barracks visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-wallet-view', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyViewed = existingProgress?.walletViewedAt;

    if (!wasAlreadyViewed) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { walletViewedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyViewed) {
      const taskList = getTaskList();
      const walletTask = taskList.find(t => t.id === 'view-wallet');
      
      if (walletTask && walletTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = walletTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);
          
          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'view-wallet'
            );
            
            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $setOnInsert: {
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
                  'completedTasks.taskId': { $ne: 'view-wallet' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'view-wallet',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'view-wallet' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Wallet view tracked' });
  } catch (error) {
    console.error('Error tracking wallet view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-financial-statement-view', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyViewed = existingProgress?.financialStatementViewedAt;

    if (!wasAlreadyViewed) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { financialStatementViewedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyViewed) {
      const taskList = getTaskList();
      const financialStatementTask = taskList.find(t => t.id === 'view-financial-statement');

      if (financialStatementTask && financialStatementTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = financialStatementTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);

          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'view-financial-statement'
            );

            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                {
                  userId,
                  'completedTasks.taskId': { $ne: 'view-financial-statement' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'view-financial-statement',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'view-financial-statement' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Financial statement view tracked' });
  } catch (error) {
    console.error('Error tracking financial statement view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-username-change-setting-view', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasAlreadyViewed = existingProgress?.usernameChangeSettingViewedAt;

    if (!wasAlreadyViewed) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { usernameChangeSettingViewedAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true
          }
        },
        { upsert: true, new: true }
      );
    }

    if (!wasAlreadyViewed) {
      const taskList = getTaskList();
      const usernameChangeTask = taskList.find(t => t.id === 'view-username-change-setting');

      if (usernameChangeTask && usernameChangeTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = usernameChangeTask.autoCompleteConditions(user as any, updatedProgress ?? undefined);

          if (shouldAutoComplete) {
            const isAlreadyCompleted = updatedProgress?.completedTasks?.some(
              (task: any) => task.taskId === 'view-username-change-setting'
            );

            if (!isAlreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                {
                  userId,
                  'completedTasks.taskId': { $ne: 'view-username-change-setting' }
                },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'view-username-change-setting',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'view-username-change-setting' }
                },
                { new: true }
              );
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Username change setting view tracked' });
  } catch (error) {
    console.error('Error tracking username change setting view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track-task-guide-pill-tap', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId }).select('taskGuidePillTappedOnce').lean();
    if (existingProgress?.taskGuidePillTappedOnce === true) {
      res.json({ success: true, taskGuidePillTappedOnce: true });
      return;
    }

    await UserTaskProgress.findOneAndUpdate(
      { userId },
      { $set: { taskGuidePillTappedOnce: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, taskGuidePillTappedOnce: true });
  } catch (error) {
    console.error('Error tracking task guide pill tap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/visibility', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { showTaskGuide } = req.body;

    if (typeof showTaskGuide !== 'boolean') {
      res.status(400).json({ error: 'showTaskGuide must be a boolean' });
      return;
    }

    const existingProgress = await UserTaskProgress.findOne({ userId });
    const wasPreviouslyHidden = existingProgress?.showTaskGuide === false;
    const shouldTrackShow = showTaskGuide === true && wasPreviouslyHidden && !existingProgress?.taskGuideShownAt;

    const updateData: any = {
      $set: { showTaskGuide },
      $setOnInsert: {
        completedTasks: [],
        collectedTasks: [],
        skippedTasks: []
      }
    };

    if (shouldTrackShow) {
      updateData.$set.taskGuideShownAt = new Date();
    }

    const progress = await UserTaskProgress.findOneAndUpdate(
      { userId },
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      showTaskGuide: progress.showTaskGuide
    });
  } catch (error) {
    console.error('Error updating task guide visibility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

