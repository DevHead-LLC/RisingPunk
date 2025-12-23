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
          skippedTasks: [],
          showTaskGuide: true
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).select('completedTasks skippedTasks showTaskGuide').lean();

    if (!progress) {
      res.status(500).json({ error: 'Failed to initialize task progress' });
      return;
    }

    const taskList = getTaskList();
    const completedTaskIdsArray = progress.completedTasks.map(t => t.taskId);
    const completedTaskIds = new Set(completedTaskIdsArray);
    const skippedTaskIds = new Set(progress.skippedTasks);

    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let currentTask = null;
    const sortedTasks = [...taskList].sort((a, b) => a.order - b.order);

    for (const task of sortedTasks) {
      if (completedTaskIds.has(task.id) || skippedTaskIds.has(task.id)) {
        continue;
      }

      if (task.autoCompleteConditions) {
        const shouldAutoComplete = task.autoCompleteConditions(user as any);
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
      completedTaskIds: completedTaskIdsArray
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
    const alreadyCompleted = progress?.completedTasks.some(t => t.taskId === trimmedTaskId);

    if (alreadyCompleted) {
      // Task already collected, return success
      res.json({
        success: true,
        message: 'Task already collected',
        rewardAmount: 0
      });
      return;
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

      // Mark task as completed
      if (!progress) {
        await UserTaskProgress.create([{
          userId,
          completedTasks: [{
            taskId: trimmedTaskId,
            completedAt: new Date()
          }],
          skippedTasks: [],
          lastCompletedTaskId: trimmedTaskId,
          showTaskGuide: true
        }], { session });
      } else {
        await UserTaskProgress.findOneAndUpdate(
          { userId },
          {
            $push: {
              completedTasks: {
                taskId: trimmedTaskId,
                completedAt: new Date()
              }
            },
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

