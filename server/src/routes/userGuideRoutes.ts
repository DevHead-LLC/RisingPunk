import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { UserTaskProgress } from '../models/UserTaskProgress';
import { User } from '../models/User';
import { getTaskList } from '../config/taskListData';
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
    ).select('completedTasks collectedTasks skippedTasks showTaskGuide profileVisitedAt themeChangedToDarkAt themeChangedToLightAt').lean();

    if (!progress) {
      res.status(500).json({ error: 'Failed to initialize task progress' });
      return;
    }

    const taskList = getTaskList();
    const completedTaskIdsArray = progress.completedTasks.map(t => t.taskId);
    const collectedTaskIdsArray = progress.collectedTasks || [];
    const completedTaskIds = new Set(completedTaskIdsArray);
    const collectedTaskIds = new Set(collectedTaskIdsArray);
    const skippedTaskIds = new Set(progress.skippedTasks);

    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let currentTask = null;
    const sortedTasks = [...taskList].sort((a, b) => a.order - b.order);

    for (const task of sortedTasks) {
      // Skip tasks that have been collected (reward given) or skipped
      if (collectedTaskIds.has(task.id) || skippedTaskIds.has(task.id)) {
        continue;
      }

      if (task.autoCompleteConditions) {
        const shouldAutoComplete = task.autoCompleteConditions(user as any, progress);
        if (shouldAutoComplete) {
          // Check if task is already completed to avoid duplicate key errors
          if (!completedTaskIds.has(task.id)) {
            // Use atomic operation to prevent race conditions - only add if taskId doesn't exist
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
          }
          continue;
        }
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
      taskList: taskList.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        order: task.order,
        reward: task.reward
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

    // Use transaction to ensure atomicity and prevent race conditions
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if already collected INSIDE transaction to prevent race conditions
      let progress = await UserTaskProgress.findOne({ userId }).session(session);
      const alreadyCollected = progress?.collectedTasks?.includes(trimmedTaskId);

      if (alreadyCollected) {
        await session.abortTransaction();
        session.endSession();
        // Task already collected, return success
        res.json({
          success: true,
          message: 'Task already collected',
          rewardAmount: 0
        });
        return;
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
      let updateResult;
      try {
        updateResult = await UserTaskProgress.findOneAndUpdate(
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
      } catch (error: any) {
        // Handle race condition: if another request already collected the task,
        // MongoDB may throw E11000 duplicate key error when trying to upsert
        // because the query condition no longer matches and upsert tries to create duplicate userId
        if (error.code === 11000 || error.codeName === 'DuplicateKey') {
          await session.abortTransaction();
          session.endSession();
          res.json({
            success: true,
            message: 'Task already collected',
            rewardAmount: 0
          });
          return;
        }
        throw error;
      }

      // If updateResult is null, task was already collected by another request
      // (This shouldn't happen due to the $ne condition, but handle it defensively)
      if (!updateResult) {
        await session.abortTransaction();
        session.endSession();
        res.json({
          success: true,
          message: 'Task already collected',
          rewardAmount: 0
        });
        return;
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
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

    const progress = await UserTaskProgress.findOneAndUpdate(
      { userId },
      {
        $set: { showTaskGuide },
        $setOnInsert: {
          completedTasks: [],
          collectedTasks: [],
          skippedTasks: []
        }
      },
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

