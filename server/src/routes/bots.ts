import express from 'express';
const Bot = require('../models/Bot');
import auth from '../middleware/auth';
import { User } from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Test bot creation
router.post('/test', auth, async (req, res) => {
  try {
    const bot = await Bot.findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { bots: { breacher: 0, guardian: 0, phreak: 0 } } },
      { upsert: true, new: true }
    );
    res.json(bot);
  } catch (error: any) {
    console.error('Bot test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's bot inventory
router.get('/', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ userId: req.user._id });
    if (!bot) {
      res.json({ 
        bots: { breacher: 0, guardian: 0, phreak: 0 },
        battalionAssignments: []
      });
      return;
    }
    res.json({ 
      bots: bot.bots,
      battalionAssignments: bot.battalionAssignments
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get bot stats from server (single source of truth)
router.get('/stats', auth, async (req, res) => {
  try {
    const { BotService } = require('../services/BotService');
    const user = await User.findById(req.user._id);
    const userLevel = user?.level || 1;
    
    const botStats: Record<string, any> = {};
    for (const botType of ['guardian', 'breacher', 'phreak']) {
      const config = await BotService.getUserBotStats(botType, userLevel);
      botStats[botType] = config;
    }
    
    res.json({ botStats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot build
router.post('/build', auth, async (req, res) => {
  try {
    const { type, quantity, totalCost } = req.body;
    
    if (!type || quantity <= 0) {
      res.status(400).json({ error: 'Invalid build parameters' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.balance.total < totalCost) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    // Deduct balance FIRST to ensure we have sufficient funds
    user.balance.total -= totalCost;
    await user.save();

    const buildTimePerUnit = 1000;
    const totalBuildTime = quantity * buildTimePerUnit;
    const startedAt = new Date().toISOString();
    const completesAt = new Date(Date.now() + totalBuildTime).toISOString();

    let bot = await Bot.findOne({ userId: req.user._id });
    
    if (!bot) {
      bot = new Bot({
        userId: req.user._id,
        bots: { breacher: 0, guardian: 0, phreak: 0 }
      });
    }

    bot.buildQueue = {
      type,
      quantity,
      totalCost,
      startedAt,
      completesAt,
      botsBuilt: 0
    };

    // Save build queue AFTER successful balance deduction
    await bot.save();

    res.json({ buildQueue: bot.buildQueue, bots: bot.bots });

  } catch (error: any) {
    console.error('Build error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test build queue endpoint
router.post('/test-build-queue', auth, async (req, res) => {
  try {
    let bot = await Bot.findOne({ userId: req.user._id });
    if (!bot) {
      bot = new Bot({ userId: req.user._id });
    }

    // Set up a test build queue
    bot.buildQueue = {
      type: 'breacher',
      quantity: 5,
      startedAt: new Date(),
      completesAt: new Date(Date.now() + (5 * 1000)), // 5 seconds total
      botsBuilt: 0
    };

    await bot.save();
    res.json(bot);
  } catch (error: any) {
    console.error('Test build queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get build state
router.get('/build-state', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ userId: req.user._id });
    
    if (!bot?.buildQueue) {
      res.json({ 
        buildQueue: null,
        bots: bot?.bots || { breacher: 0, guardian: 0, phreak: 0 }
      });
      return;
    }

    const now = new Date();
    const startedAt = new Date(bot.buildQueue.startedAt);
    const completesAt = new Date(bot.buildQueue.completesAt);
    const totalTime = completesAt.getTime() - startedAt.getTime();
    const elapsedTime = now.getTime() - startedAt.getTime();
    const progress = Math.min((elapsedTime / totalTime) * 100, 100);

    // Calculate how many bots should be built based on progress
    const expectedBotsBuilt = Math.floor((progress / 100) * bot.buildQueue.quantity);
    
    // Update botsBuilt if needed and save to database
    if (expectedBotsBuilt > bot.buildQueue.botsBuilt) {
      bot.bots[bot.buildQueue.type] += (expectedBotsBuilt - bot.buildQueue.botsBuilt);
      bot.buildQueue.botsBuilt = expectedBotsBuilt;
      await bot.save();
    }

    // If build is complete
    if (progress >= 100) {
      const finalType = bot.buildQueue.type;
      const remainingBots = bot.buildQueue.quantity - bot.buildQueue.botsBuilt;
      if (remainingBots > 0) {
        bot.bots[finalType] += remainingBots;
      }
      
      // Only increment user counters if there are actually remaining bots to add
      // This prevents incorrectly setting counters when build queue is stale or already processed
      if (remainingBots > 0) {
        const user = await User.findById(req.user._id).lean();
        if (user) {
          // Use updateOne to only update the specific field without fetching full document
          // This prevents Mongoose from applying schema defaults to other fields
          const updateField = finalType === 'guardian' ? 'totalGuardiansBuilt' : 
                             finalType === 'phreak' ? 'totalPhreaksBuilt' : 'totalBreachersBuilt';
          const currentValue = user[updateField as keyof typeof user] as number | undefined;
          const current = (currentValue !== undefined && currentValue !== null) ? currentValue : 0;
          const newValue = Math.min(1000000, current + remainingBots);
          
          await User.updateOne(
            { _id: req.user._id },
            { $set: { [updateField]: newValue } }
          );
        }
      }
      
      bot.buildQueue = null;
      await bot.save();

      res.json({
        buildQueue: null,
        bots: bot.bots
      });
      return;
    }

    // Return current state with all buildQueue properties
    res.json({
      buildQueue: {
        ...bot.buildQueue.toObject(),
        progress,
        type: bot.buildQueue.type,
        totalCost: bot.buildQueue.totalCost,  // Explicitly include totalCost
        botsBuilt: bot.buildQueue.botsBuilt  // Include botsBuilt
      },
      bots: bot.bots
    });
  } catch (error: any) {
    console.error('Build state check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Speedup bot build
router.post('/speedup-build', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const bot = await Bot.findOne({ userId: req.user._id });
    if (!bot || !bot.buildQueue) {
      res.status(400).json({ error: 'No active build found' });
      return;
    }

    // Use transaction to ensure atomicity
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Reload bot and user within transaction to ensure we have latest state
        const botInTransaction = await Bot.findOne({ userId: req.user._id }).session(session);
        const userInTransaction = await User.findById(req.user._id).session(session);
        
        if (!botInTransaction || !botInTransaction.buildQueue) {
          throw new Error('No active build found');
        }

        if (!userInTransaction) {
          throw new Error('User not found');
        }

        // Calculate cost inside transaction based on current time to prevent overcharging
        const now = new Date();
        const completesAt = new Date(botInTransaction.buildQueue.completesAt);
        const remainingMs = Math.max(0, completesAt.getTime() - now.getTime());
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        
        if (remainingSeconds <= 0) {
          throw new Error('Build is already complete');
        }

        // Calculate cost based on actual remaining time at transaction execution
        const cost = remainingSeconds * 5;

        // Verify sufficient balance
        if (userInTransaction.balance.total < cost) {
          throw new Error('Insufficient funds');
        }

        // Calculate remaining bots to add to inventory
        const remainingBotsToAdd = botInTransaction.buildQueue.quantity - (botInTransaction.buildQueue.botsBuilt || 0);
        
        // Add remaining bots to inventory
        botInTransaction.bots[botInTransaction.buildQueue.type] += remainingBotsToAdd;
        
        // Increment lifetime bot build counters (capped at 1,000,000)
        // When speedup is used, we count the FULL quantity built, not just remaining
        // This ensures all bots are counted even if some were already built naturally
        const fullQuantityBuilt = botInTransaction.buildQueue.quantity;
        if (fullQuantityBuilt > 0) {
          const botType = botInTransaction.buildQueue.type;
          const updateField = botType === 'guardian' ? 'totalGuardiansBuilt' : 
                             botType === 'phreak' ? 'totalPhreaksBuilt' : 'totalBreachersBuilt';
          const currentValue = userInTransaction[updateField as keyof typeof userInTransaction] as number | undefined;
          const current = (currentValue !== undefined && currentValue !== null) ? currentValue : 0;
          const newValue = Math.min(1000000, current + fullQuantityBuilt);
          
          // Set the field directly on the document (will be saved with userInTransaction.save())
          (userInTransaction as any)[updateField] = newValue;
        }
        
        // Clear build queue
        botInTransaction.buildQueue = null;
        
        // Deduct balance
        userInTransaction.balance.total -= cost;
        
        // Save both atomically
        await botInTransaction.save({ session });
        await userInTransaction.save({ session });
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (error.message === 'No active build found') {
        res.status(400).json({ error: 'No active build found' });
        return;
      }
      if (error.message === 'Build is already complete') {
        res.status(400).json({ error: 'Build is already complete' });
        return;
      }
      if (error.message === 'Insufficient funds') {
        res.status(400).json({ error: 'Insufficient funds' });
        return;
      }
      
      // Re-throw unexpected errors to be caught by outer catch
      throw error;
    } finally {
      await session.endSession();
    }

    // Reload bot and user to get updated values
    const updatedBot = await Bot.findOne({ userId: req.user._id });
    const updatedUser = await User.findById(req.user._id);

    if (!updatedBot || !updatedUser) {
      res.status(500).json({ error: 'Error retrieving updated data' });
      return;
    }

    res.json({
      success: true,
      message: 'Bot build completed successfully',
      newBalance: updatedUser.balance.total,
      bots: updatedBot.bots
    });
  } catch (error: any) {
    console.error('Error speeding up bot build:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign bots to battalion
router.post('/assign', auth, async (req, res) => {
  try {
    const { botType, quantity, battalionId } = req.body;
    
    
    // Use atomic operation with retry logic to handle race conditions
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Get current bot state with optimistic locking
        const bot = await Bot.findOne({ userId: req.user._id });
        if (!bot) {
          // Create new bot if none exists
          const newBot = new Bot({
            userId: req.user._id,
            bots: { breacher: 0, guardian: 0, phreak: 0 },
            battalionAssignments: []
          });
          await newBot.save();
          continue; // Retry with the new bot
        }


        // Find existing assignment for this battalion
        const existingAssignment = bot.battalionAssignments.find(
          (assignment: { battalionId: string }) => assignment.battalionId === battalionId
        );

        // CRITICAL FIX: Never modify total bot inventory - only track assignments
        // The total bot inventory should remain constant, assignments are tracked separately
        const newAssignments = bot.battalionAssignments.filter(
          (assignment: { battalionId: string }) => assignment.battalionId !== battalionId
        );

        // Calculate truly available (unassigned) bots for the new type
        const totalBotsOfType = bot.bots[botType] || 0;
        
        // Calculate how many bots of this type are already assigned to other battalions
        const otherAssignments = newAssignments.filter(
          (assignment: any) => assignment.botType === botType
        );
        const alreadyAssignedToOtherBattalions = otherAssignments.reduce(
          (sum: number, assignment: any) => sum + assignment.quantity, 0
        );
        
        // Calculate truly available bots (total - already assigned to other battalions)
        let trulyAvailableBots = totalBotsOfType - alreadyAssignedToOtherBattalions;
        
        // Handle existing assignment logic
        if (existingAssignment) {
          if (existingAssignment.botType === botType) {
            // Same bot type: add back the existing assignment quantity to available pool
            trulyAvailableBots += existingAssignment.quantity;
          } else {
            // Different bot type: the bots are already "returned" to their original type
            // because we filtered out the existing assignment, so they're no longer assigned
            // and are available in their original type's inventory
          }
        }
        

        // Verify sufficient truly available bots
        if (trulyAvailableBots < quantity) {
          res.status(400).json({ error: 'Insufficient Bots Available' });
          return;
        }

        // CRITICAL: Do NOT modify total bot inventory - it should remain constant
        // The assignment system works by tracking assignments, not by modifying inventory

        // Add new assignment if quantity > 0
        if (quantity > 0) {
          newAssignments.push({
            battalionId,
            botType,
            quantity,
            markLevel: 1
          });
        }


        // Atomic update with version check to prevent race conditions
        // CRITICAL: Only update assignments, never modify total bot inventory
        const updatedBot = await Bot.findOneAndUpdate(
          { 
            userId: req.user._id,
            // Add version check to prevent stale updates
            $or: [
              { __v: bot.__v },
              { __v: { $exists: false } }
            ]
          },
          { 
            battalionAssignments: newAssignments,
            $inc: { __v: 1 } // Increment version for optimistic locking
          },
          { new: true, upsert: false }
        );

        if (!updatedBot) {
          // Version mismatch - retry
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 50 * retryCount)); // Exponential backoff
          continue;
        }


        // Calculate final available count for response
        const finalAvailableCount = (updatedBot.bots[botType] || 0) - 
          updatedBot.battalionAssignments
            .filter((assignment: any) => assignment.botType === botType)
            .reduce((sum: number, assignment: any) => sum + assignment.quantity, 0);

        res.json({ 
          success: true,
          availableBotCount: finalAvailableCount,
          totalBotCount: updatedBot.bots[botType],
          previousAssignment: existingAssignment || null
        });
        return; // Success - exit retry loop

      } catch (updateError: any) {
        if (updateError.code === 11000) { // Duplicate key error
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 50 * retryCount));
          continue;
        }
        throw updateError; // Re-throw non-retryable errors
      }
    }

    // If we get here, all retries failed
    console.error('Max retries exceeded');
    res.status(500).json({ error: 'Assignment failed due to concurrency conflicts' });

  } catch (error: any) {
    console.error('Battalion assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
