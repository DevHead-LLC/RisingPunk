import express, { type Response } from 'express';
const Bot = require('../models/Bot');
import auth from '../middleware/auth';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { getMaxBattalionSize, isBattalionSlotUnlocked } from '../utils/researchFeatureUtils';

const router = express.Router();

const battalionAssignmentAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000;
/** Single-slot /assign uses this. Preset apply uses POST /assign-preset (one request) to stay under the limit when switching presets quickly. */
const MAX_BATTALION_ASSIGNMENT_ATTEMPTS = 20;

const PRESET_VALID_BATTALION_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const PRESET_VALID_BOT_TYPES = ['breacher', 'guardian', 'phreak'] as const;

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

// Get bot stats from server (single source of truth). Used by Digital Barracks and elsewhere.
// Range bot type (Phreaks) get Binary Bank Crack tier bonus (Attack/Health/Defense/Speed) applied here, in battle, and in stats-breakdown.
router.get('/stats', auth, async (req, res) => {
  try {
    const { BotService } = require('../services/BotService');
    const user = await User.findById(req.user._id).select('level armyBonus guardianBonus phreakBonus');
    const userLevel = user?.level || 1;
    const armyBonus = user?.armyBonus;
    const guardianBonus = user?.guardianBonus;
    const phreakBonus = user?.phreakBonus;
    const botStats: Record<string, any> = {};
    for (const botType of ['guardian', 'breacher', 'phreak']) {
      const config = await BotService.getUserBotStats(botType, userLevel, armyBonus, guardianBonus, phreakBonus);
      botStats[botType] = config;
    }
    res.json({ botStats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Stat row shape for breakdown (health, offense, defense, speed, range). */
interface StatRow {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
}

const { computePacketBreachArmyBonus } = require('../config/packetBreachConfig');
const { computeRaceConditionHeistGuardianBonus } = require('../config/raceConditionHeistConfig');
const { computeBinaryBankCrackPhreakBonus } = require('../config/binaryBankCrackConfig');
// Get bot stats breakdown for profile charts (base, +level, +programming, total)
// Total row comes from BotService.getUserBotStats (same as /stats and battles) so one source of truth.
// Range bot type (Phreaks): programming bonus from Binary Bank Crack (Attack/Health/Defense/Speed), same pattern as PB → Infantry (breacher), RCH → Cavalry (guardian).
router.get('/stats-breakdown', auth, async (req, res) => {
  try {
    const { BotService } = require('../services/BotService');
    const BotStatsService = require('../services/BotStatsService').BotStatsService;
    await BotStatsService.loadConfigs();
    const user = await User.findById(req.user._id).select('level packetBreach raceConditionHeist binaryBankCrack armyBonus guardianBonus phreakBonus');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const userLevel = user.level || 1;
    const packetBreachLevels: string[] = Array.isArray(user.packetBreach?.levelsCompleted) ? user.packetBreach!.levelsCompleted : [];
    const programmingFromLevels = computePacketBreachArmyBonus(packetBreachLevels);
    const storedArmyBonus = user.armyBonus || { strength: 0, defense: 0, speed: 0, health: 0 };
    const armyBonusMatches =
      storedArmyBonus.strength === programmingFromLevels.strength &&
      storedArmyBonus.defense === programmingFromLevels.defense &&
      storedArmyBonus.speed === programmingFromLevels.speed &&
      storedArmyBonus.health === programmingFromLevels.health;
    if (!armyBonusMatches) {
      await User.updateOne({ _id: user._id }, { $set: { armyBonus: programmingFromLevels } });
    }
    const armyBonusForStats = armyBonusMatches ? storedArmyBonus : programmingFromLevels;
    const rchLevels: string[] = Array.isArray(user.raceConditionHeist?.levelsCompleted) ? user.raceConditionHeist!.levelsCompleted : [];
    const programmingGuardianFromLevels = computeRaceConditionHeistGuardianBonus(rchLevels);
    const storedGuardianBonus = user.guardianBonus || { strength: 0, defense: 0, speed: 0, health: 0 };
    const guardianBonusMatches =
      storedGuardianBonus.strength === programmingGuardianFromLevels.strength &&
      storedGuardianBonus.defense === programmingGuardianFromLevels.defense &&
      storedGuardianBonus.speed === programmingGuardianFromLevels.speed &&
      storedGuardianBonus.health === programmingGuardianFromLevels.health;
    if (!guardianBonusMatches) {
      await User.updateOne({ _id: user._id }, { $set: { guardianBonus: programmingGuardianFromLevels } });
    }
    const guardianBonusForStats = guardianBonusMatches ? storedGuardianBonus : programmingGuardianFromLevels;
    const bbcLevels: string[] = Array.isArray(user.binaryBankCrack?.levelsCompleted) ? user.binaryBankCrack!.levelsCompleted : [];
    const programmingPhreakFromLevels = computeBinaryBankCrackPhreakBonus(bbcLevels);
    const storedPhreakBonus = user.phreakBonus ?? { strength: 0, defense: 0, speed: 0, health: 0 };
    const phreakBonusMatches =
      storedPhreakBonus.strength === programmingPhreakFromLevels.strength &&
      storedPhreakBonus.defense === programmingPhreakFromLevels.defense &&
      storedPhreakBonus.speed === programmingPhreakFromLevels.speed &&
      storedPhreakBonus.health === programmingPhreakFromLevels.health;
    if (!phreakBonusMatches) {
      await User.updateOne({ _id: user._id }, { $set: { phreakBonus: programmingPhreakFromLevels } });
    }
    const phreakBonusForStats = phreakBonusMatches ? storedPhreakBonus : programmingPhreakFromLevels;

    const zeroRow = (): StatRow => ({ health: 0, offense: 0, defense: 0, speed: 0, range: 0 });
    const breakdown: Record<string, { base: StatRow; levelBonus: StatRow; programmingBonus: StatRow; researchBonus: StatRow; total: StatRow }> = {};

    for (const botType of ['guardian', 'breacher', 'phreak']) {
      const base = BotStatsService.getBaseStats(botType);
      const effective = BotStatsService.computeEffectiveBotStats(botType, userLevel);
      const levelBonus: StatRow = {
        health: Math.round((effective.health - base.health) * 100) / 100,
        offense: Math.round((effective.offense - base.offense) * 100) / 100,
        defense: Math.round((effective.defense - base.defense) * 1000) / 1000,
        speed: effective.speed - base.speed,
        range: effective.range - base.range,
      };
      const programmingBonus: StatRow =
        botType === 'breacher'
          ? {
              health: programmingFromLevels.health,
              offense: programmingFromLevels.strength,
              defense: programmingFromLevels.defense,
              speed: programmingFromLevels.speed,
              range: 0,
            }
          : botType === 'guardian'
            ? {
                health: programmingGuardianFromLevels.health,
                offense: programmingGuardianFromLevels.strength,
                defense: programmingGuardianFromLevels.defense,
                speed: programmingGuardianFromLevels.speed,
                range: 0,
              }
            : botType === 'phreak'
              ? {
                  health: (phreakBonusForStats as any).health ?? 0,
                  offense: (phreakBonusForStats as any).strength ?? 0,
                  defense: (phreakBonusForStats as any).defense ?? 0,
                  speed: (phreakBonusForStats as any).speed ?? 0,
                  range: (phreakBonusForStats as any).range ?? 0,
                }
              : zeroRow();
      const researchBonus = zeroRow(); // Placeholder for future research bonuses
      const finalConfig = await BotService.getUserBotStats(botType, userLevel, armyBonusForStats, guardianBonusForStats, phreakBonusForStats);
      const s = finalConfig.stats;
      const total: StatRow = {
        health: Math.round(s.health * 100) / 100,
        offense: Math.round(s.offense * 100) / 100,
        defense: Math.round(s.defense * 1000) / 1000,
        speed: Math.round(s.speed),
        range: Math.round(s.range * 100) / 100,
      };
      breakdown[botType] = { base, levelBonus, programmingBonus, researchBonus, total };
    }

    res.json({ userLevel, breakdown });
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
      // Use transaction to ensure atomicity: counter increment and buildQueue clearing must both succeed
      // This prevents double-counting if bot.save() fails after counter increment
      // Re-fetch bot inside transaction to prevent race conditions from concurrent requests
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Re-fetch bot within transaction to get latest state
          // If another concurrent request already cleared buildQueue, this will be null
          const botInTransaction = await Bot.findOne({ userId: req.user._id }).session(session);
          
          if (!botInTransaction || !botInTransaction.buildQueue) {
            // Build queue was already cleared by another concurrent request, skip increment
            return;
          }
          
          // Use values from botInTransaction (not stale bot object) to ensure correctness
          const finalTypeInTransaction = botInTransaction.buildQueue.type;
          const fullQuantityBuilt = botInTransaction.buildQueue.quantity;
          const remainingBotsInTransaction = botInTransaction.buildQueue.quantity - botInTransaction.buildQueue.botsBuilt;
          
          // Add remaining bots to inventory (if any)
          if (remainingBotsInTransaction > 0) {
            botInTransaction.bots[finalTypeInTransaction] += remainingBotsInTransaction;
          }
          
          // Increment user counters with FULL quantity built (not just remaining)
          // By the time progress reaches 100%, botsBuilt equals quantity due to incremental updates,
          // so remainingBots would be 0. We need to count the full quantity to match speedup behavior.
          if (fullQuantityBuilt > 0) {
            // Use atomic $inc operator to prevent race conditions when concurrent builds complete
            // This ensures that if multiple builds complete simultaneously, all increments are applied
            const updateField = finalTypeInTransaction === 'guardian' ? 'totalGuardiansBuilt' : 
                               finalTypeInTransaction === 'phreak' ? 'totalPhreaksBuilt' : 'totalBreachersBuilt';
            
            // First, increment the counter (atomic operation)
            await User.updateOne(
              { _id: req.user._id },
              { $inc: { [updateField]: fullQuantityBuilt } },
              { session }
            );
            
            // Then, cap it at 1,000,000 if needed (within same transaction)
            await User.updateOne(
              { _id: req.user._id, [updateField]: { $gt: 1000000 } },
              { $set: { [updateField]: 1000000 } },
              { session }
            );
          }
          
          // Clear build queue within transaction - if this fails, counter increment is rolled back
          botInTransaction.buildQueue = null;
          await botInTransaction.save({ session });
        });
      } finally {
        await session.endSession();
      }

      // Re-fetch bot to get updated state after transaction
      const updatedBot = await Bot.findOne({ userId: req.user._id });
      res.json({
        buildQueue: null,
        bots: updatedBot?.bots || bot.bots
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
          
          // Use atomic $inc operator within transaction to prevent race conditions
          // This ensures that if multiple builds complete simultaneously, all increments are applied
          await User.updateOne(
            { _id: req.user._id },
            { $inc: { [updateField]: fullQuantityBuilt } },
            { session }
          );
          
          // Then, cap it at 1,000,000 if needed (within same transaction)
          await User.updateOne(
            { _id: req.user._id, [updateField]: { $gt: 1000000 } },
            { $set: { [updateField]: 1000000 } },
            { session }
          );
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

function consumeBattalionRateLimit(userId: string, now: number, res: Response): boolean {
  const userAttempts = battalionAssignmentAttempts.get(userId);
  if (userAttempts) {
    if (userAttempts.resetAt <= now) {
      battalionAssignmentAttempts.delete(userId);
      battalionAssignmentAttempts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    } else {
      if (userAttempts.count >= MAX_BATTALION_ASSIGNMENT_ATTEMPTS) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return false;
      }
      userAttempts.count++;
    }
  } else {
    battalionAssignmentAttempts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }
  if (battalionAssignmentAttempts.size > 1000) {
    for (const [key, value] of battalionAssignmentAttempts.entries()) {
      if (value.resetAt <= now) {
        battalionAssignmentAttempts.delete(key);
      }
    }
  }
  return true;
}

/**
 * Replace all battalion assignments in one atomic write (used by battle preset apply).
 * Counts as one rate-limit hit instead of N× /assign (avoids 429 when switching presets quickly).
 */
router.post('/assign-preset', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const now = Date.now();
    const { assignments: raw } = req.body;

    if (!Array.isArray(raw)) {
      res.status(400).json({ error: 'assignments must be an array of { battalionId, botType, quantity }.' });
      return;
    }

    if (!consumeBattalionRateLimit(userId, now, res)) {
      return;
    }

    const maxLimit = await getMaxBattalionSize(userId, new Date(now));

    const seenBattalions = new Set<string>();
    const normalized: Array<{ battalionId: string; botType: string; quantity: number; markLevel: number }> = [];

    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') {
        res.status(400).json({ error: 'Each assignment must be an object.' });
        return;
      }
      const { battalionId, botType, quantity } = entry as Record<string, unknown>;
      if (typeof battalionId !== 'string' || !PRESET_VALID_BATTALION_IDS.includes(battalionId as any)) {
        res.status(400).json({ error: 'Invalid battalionId. Must be A–F.' });
        return;
      }
      if (seenBattalions.has(battalionId)) {
        res.status(400).json({ error: `Duplicate battalionId: ${battalionId}` });
        return;
      }
      seenBattalions.add(battalionId);

      if (typeof botType !== 'string' || !PRESET_VALID_BOT_TYPES.includes(botType as any)) {
        res.status(400).json({ error: 'Invalid botType. Must be breacher, guardian, or phreak.' });
        return;
      }

      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || !Number.isInteger(quantity)) {
        res.status(400).json({ error: 'Quantity must be a valid integer' });
        return;
      }
      if (quantity < 0) {
        res.status(400).json({ error: 'Quantity must be non-negative' });
        return;
      }
      if (quantity > maxLimit) {
        res.status(400).json({ error: `Maximum troops per battalion is ${maxLimit.toLocaleString()}.` });
        return;
      }

      if (battalionId === 'C' || battalionId === 'D' || battalionId === 'E' || battalionId === 'F') {
        const unlocked = await isBattalionSlotUnlocked(userId, battalionId as 'C' | 'D' | 'E' | 'F');
        if (!unlocked) {
          res.status(403).json({
            error: `Battalion ${battalionId} is locked. Complete the "Add Battalion ${battalionId}" research feature to unlock it.`,
          });
          return;
        }
      }

      const markLevel =
        typeof (entry as any).markLevel === 'number' && Number.isInteger((entry as any).markLevel) && (entry as any).markLevel > 0
          ? (entry as any).markLevel
          : 1;

      if (quantity > 0) {
        normalized.push({ battalionId, botType, quantity, markLevel });
      }
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const bot = await Bot.findOne({ userId: req.user._id });
        if (!bot) {
          const newBot = new Bot({
            userId: req.user._id,
            bots: { breacher: 0, guardian: 0, phreak: 0 },
            battalionAssignments: [],
          });
          await newBot.save();
          continue;
        }

        const sumByType: Record<string, number> = { breacher: 0, guardian: 0, phreak: 0 };
        for (const a of normalized) {
          sumByType[a.botType] = (sumByType[a.botType] || 0) + a.quantity;
        }

        for (const t of PRESET_VALID_BOT_TYPES) {
          const owned = bot.bots[t] || 0;
          if (sumByType[t] > owned) {
            res.status(400).json({ error: 'Insufficient Bots Available' });
            return;
          }
        }

        const newAssignments = normalized.map((a) => ({
          battalionId: a.battalionId,
          botType: a.botType,
          quantity: a.quantity,
          markLevel: a.markLevel,
        }));

        const updatedBot = await Bot.findOneAndUpdate(
          {
            userId: req.user._id,
            $or: [{ __v: bot.__v }, { __v: { $exists: false } }],
          },
          {
            battalionAssignments: newAssignments,
            $inc: { __v: 1 },
          },
          { new: true, upsert: false }
        );

        if (!updatedBot) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 50 * retryCount));
          continue;
        }

        res.json({
          success: true,
          bots: updatedBot.bots,
          battalionAssignments: updatedBot.battalionAssignments,
        });
        return;
      } catch (updateError: any) {
        if (updateError.code === 11000) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 50 * retryCount));
          continue;
        }
        throw updateError;
      }
    }

    res.status(500).json({ error: 'Assignment failed due to concurrency conflicts' });
  } catch (error: any) {
    console.error('assign-preset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign bots to battalion
router.post('/assign', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { botType, quantity, battalionId } = req.body;
    
    if (!battalionId || typeof battalionId !== 'string' || !/^[A-Z]$/.test(battalionId)) {
      res.status(400).json({ error: 'Battalion ID must be a single uppercase letter (A-Z)' });
      return;
    }

    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || !Number.isInteger(quantity)) {
      res.status(400).json({ error: 'Quantity must be a valid integer' });
      return;
    }

    if (quantity < 0) {
      res.status(400).json({ error: 'Quantity must be greater than or equal to 0' });
      return;
    }

    const now = Date.now();
    const maxLimit = await getMaxBattalionSize(userId, new Date(now));

    if (quantity > maxLimit) {
      const nextStep =
        maxLimit === 250
          ? 'Complete "Battalion Size +250" research to increase to 500.'
          : maxLimit === 500
            ? 'Complete "Battalion Size +500" research to increase to 1,000.'
            : maxLimit === 1000
              ? 'Complete "Battalion Size +1,000" research to increase to 2,000.'
              : maxLimit === 2000
                ? 'Complete "Battalion Size +2,000" research to increase to 4,000.'
                : maxLimit === 4000
                  ? 'Complete "Battalion Size +4,500" research to increase to 8,500.'
                  : maxLimit === 8500
                    ? 'Complete "Battalion Size +6,500" research to increase to 15,000.'
                    : null;
      const errorMessage = nextStep
        ? `Maximum troops per battalion is ${maxLimit.toLocaleString()}. ${nextStep}`
        : `Maximum troops per battalion is ${maxLimit.toLocaleString()}.`;
      res.status(400).json({ error: errorMessage });
      return;
    }
    
    if (battalionId === 'C' || battalionId === 'D' || battalionId === 'E' || battalionId === 'F') {
      const unlocked = await isBattalionSlotUnlocked(userId, battalionId as 'C' | 'D' | 'E' | 'F');
      if (!unlocked) {
        res.status(403).json({
          error: `Battalion ${battalionId} is locked. Complete the "Add Battalion ${battalionId}" research feature to unlock it.`
        });
        return;
      }
    }
    if (!consumeBattalionRateLimit(userId, now, res)) {
      return;
    }

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
