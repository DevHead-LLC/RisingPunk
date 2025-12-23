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
    ).select('completedTasks collectedTasks skippedTasks showTaskGuide profileVisitedAt').lean();

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
          await UserTaskProgress.findOneAndUpdate(
            { userId },
            {
              $push: {
                completedTasks: {
                  taskId: task.id,
                  completedAt: new Date()
                }
              },
              $setOnInsert: {
                collectedTasks: [],
                skippedTasks: [],
                showTaskGuide: true
              },
              $set: { lastCompletedTaskId: task.id }
            },
            { upsert: true, new: true }
          );
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

    const progress = await UserTaskProgress.findOne({ userId });
    const alreadyCollected = progress?.collectedTasks?.includes(trimmedTaskId);

    if (alreadyCollected) {
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
      // Mark as completed first (action done, but reward not collected yet)
      if (!progress) {
        await UserTaskProgress.create({
          userId,
          completedTasks: [{
            taskId: trimmedTaskId,
            completedAt: new Date()
          }],
          collectedTasks: [],
          skippedTasks: [],
          showTaskGuide: true
        });
      } else {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $addToSet: {
              completedTasks: {
                taskId: trimmedTaskId,
                completedAt: new Date()
              }
            }
          },
          { new: true }
        );
      }
    }

    // Use transaction to ensure atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update user balance with reward
      if (rewardAmount > 0) {
        const user = await User.findById(userId).session(session);
        if (user) {
          user.balance.total += rewardAmount;
          user.balance.lastUpdated = new Date();
          await user.save({ session });
        }
      }

      // Mark task as collected (reward given)
      if (!progress) {
        await UserTaskProgress.create([{
          userId,
          completedTasks: [{
            taskId: trimmedTaskId,
            completedAt: new Date()
          }],
          collectedTasks: [trimmedTaskId],
          skippedTasks: [],
          lastCompletedTaskId: trimmedTaskId,
          showTaskGuide: true
        }], { session });
      } else {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $addToSet: { collectedTasks: trimmedTaskId },
            $set: { lastCompletedTaskId: trimmedTaskId }
          },
          { new: true, session }
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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

    const progress = await UserTaskProgress.findOne({ userId });
    if (!progress) {
      await UserTaskProgress.create({
        userId,
        completedTasks: [],
        skippedTasks: [trimmedTaskId],
        showTaskGuide: true
      });
    } else {
      if (!progress.skippedTasks.includes(trimmedTaskId)) {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $addToSet: { skippedTasks: trimmedTaskId }
          },
          { new: true }
        );
      }
    }

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
    await UserTaskProgress.findOneAndUpdate(
      { userId, profileVisitedAt: { $exists: false } },
      { $set: { profileVisitedAt: new Date() } },
      { upsert: true, new: true }
    );

    // If this is a new visit (not already visited), check if view-profile task should be auto-completed
    if (!wasAlreadyVisited) {
      const taskList = getTaskList();
      const viewProfileTask = taskList.find(t => t.id === 'view-profile');
      
      if (viewProfileTask && viewProfileTask.autoCompleteConditions) {
        const user = await User.findById(userId).lean();
        if (user) {
          const updatedProgress = await UserTaskProgress.findOne({ userId });
          const shouldAutoComplete = viewProfileTask.autoCompleteConditions(user as any, updatedProgress);
          
          if (shouldAutoComplete) {
            // Mark task as completed (without reward - reward is collected separately via /complete-task)
            const alreadyCompleted = updatedProgress?.completedTasks.some(t => t.taskId === 'view-profile');
            if (!alreadyCompleted) {
              await UserTaskProgress.findOneAndUpdate(
                { userId },
                {
                  $push: {
                    completedTasks: {
                      taskId: 'view-profile',
                      completedAt: new Date()
                    }
                  },
                  $set: { lastCompletedTaskId: 'view-profile' }
                },
                { upsert: true, new: true }
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
      { $set: { showTaskGuide } },
      { upsert: true, new: true }
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

