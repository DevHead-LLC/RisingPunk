import express from 'express';
const Bot = require('../models/Bot');
import auth from '../middleware/auth';
import { User } from '../models/User';

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
        totalCost: bot.buildQueue.totalCost  // Explicitly include totalCost
      },
      bots: bot.bots
    });
  } catch (error: any) {
    console.error('Build state check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign bots to battalion
router.post('/assign', auth, async (req, res) => {
  try {
    const { botType, quantity, battalionId } = req.body;
    
    console.log(`🔍 BATTALION ASSIGNMENT: Starting assignment - botType: ${botType}, quantity: ${quantity}, battalionId: ${battalionId}`);
    
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

        console.log(`🔍 BATTALION ASSIGNMENT: Initial bot counts - ${botType}: ${bot.bots[botType]}`);

        // Find existing assignment for this battalion
        const existingAssignment = bot.battalionAssignments.find(
          (assignment: { battalionId: string }) => assignment.battalionId === battalionId
        );

        // Calculate new bot counts and assignments
        const newBotCounts = { ...bot.bots };
        const newAssignments = bot.battalionAssignments.filter(
          (assignment: { battalionId: string }) => assignment.battalionId !== battalionId
        );

        // CRITICAL FIX: Handle cross-bot-type reassignments properly
        if (existingAssignment && existingAssignment.botType !== botType) {
          // Return bots to their original type's inventory
          newBotCounts[existingAssignment.botType] = (newBotCounts[existingAssignment.botType] || 0) + existingAssignment.quantity;
          console.log(`🔍 BATTALION ASSIGNMENT: Returning ${existingAssignment.quantity} ${existingAssignment.botType} bots to inventory`);
        }

        // Calculate available bots for the new type (after returning any existing assignment)
        let availableBots = newBotCounts[botType] || 0;
        
        // If there's an existing assignment for the SAME bot type, add those bots back to available pool
        if (existingAssignment && existingAssignment.botType === botType) {
          console.log(`🔍 BATTALION ASSIGNMENT: Found existing assignment - returning ${existingAssignment.quantity} ${existingAssignment.botType} bots`);
          availableBots += existingAssignment.quantity;
        }

        // Verify sufficient bots available
        if (availableBots < quantity) {
          console.log(`🔍 BATTALION ASSIGNMENT: Insufficient bots - need ${quantity}, have ${availableBots}`);
          res.status(400).json({ error: 'Insufficient Bots Available' });
          return;
        }

        // Update bot counts: subtract the new assignment quantity
        newBotCounts[botType] = availableBots - quantity;

        // Add new assignment if quantity > 0
        if (quantity > 0) {
          newAssignments.push({
            battalionId,
            botType,
            quantity,
            markLevel: 1
          });
        }

        console.log(`🔍 BATTALION ASSIGNMENT: New bot counts - ${botType}: ${newBotCounts[botType]}`);

        // Atomic update with version check to prevent race conditions
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
            bots: newBotCounts,
            battalionAssignments: newAssignments,
            $inc: { __v: 1 } // Increment version for optimistic locking
          },
          { new: true, upsert: false }
        );

        if (!updatedBot) {
          // Version mismatch - retry
          retryCount++;
          console.log(`🔍 BATTALION ASSIGNMENT: Version conflict, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 50 * retryCount)); // Exponential backoff
          continue;
        }

        console.log(`🔍 BATTALION ASSIGNMENT: Final result - ${botType}: ${updatedBot.bots[botType]}, assignments: ${updatedBot.battalionAssignments.length}`);

        res.json({ 
          success: true,
          updatedBotCount: updatedBot.bots[botType],
          previousAssignment: existingAssignment || null
        });
        return; // Success - exit retry loop

      } catch (updateError: any) {
        if (updateError.code === 11000) { // Duplicate key error
          retryCount++;
          console.log(`🔍 BATTALION ASSIGNMENT: Duplicate key error, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 50 * retryCount));
          continue;
        }
        throw updateError; // Re-throw non-retryable errors
      }
    }

    // If we get here, all retries failed
    console.error('🔍 BATTALION ASSIGNMENT: Max retries exceeded');
    res.status(500).json({ error: 'Assignment failed due to concurrency conflicts' });

  } catch (error: any) {
    console.error('Battalion assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
