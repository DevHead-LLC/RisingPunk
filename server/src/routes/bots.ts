import express, { type Response } from 'express';
const Bot = require('../models/Bot');
import auth from '../middleware/auth';
import { User } from '../models/User';
import mongoose from 'mongoose';
import {
  getMaxBattalionSize,
  getNextBattalionSizeResearchHint,
  isBattalionSlotUnlocked,
  getCrewArmyBonusTotalsForUser,
  getCrewArmyBonusPartsForUser,
  mergeCrewArmyIntoArmyBonus,
} from '../utils/researchFeatureUtils';
import {
  normalizeBotsObject,
  getInventoryKey,
  buildCostPerUnit,
  buildMillisecondsPerUnit,
  BOT_FAMILY_TYPES,
  getBuildQueueFamily,
  parseBuildQueueFamily,
} from '../utils/botInventoryKeys';
import { BotStatsService } from '../services/BotStatsService';
import { syncAndResolveUserBotProgrammingBonuses } from '../utils/syncUserBotProgrammingBonuses';
import { roundEffectiveStatsToStatRow } from '../utils/botStatDisplayRounding';
import { userHasMark2BotsUnlocked } from '../utils/userHasMark2BotsUnlocked';

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
      { $setOnInsert: { bots: normalizeBotsObject({}) } },
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
        bots: normalizeBotsObject({}),
        battalionAssignments: [],
      });
      return;
    }
    res.json({
      bots: normalizeBotsObject(bot.bots as Record<string, unknown>),
      battalionAssignments: bot.battalionAssignments,
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
    const { userLevel, armyBonusForStats, guardianBonusForStats, phreakBonusForStats } =
      await syncAndResolveUserBotProgrammingBonuses(req.user._id);
    const crewArmy = await getCrewArmyBonusTotalsForUser(req.user._id);
    const armyMerged = mergeCrewArmyIntoArmyBonus(armyBonusForStats, crewArmy);
    const guardianMerged = mergeCrewArmyIntoArmyBonus(guardianBonusForStats, crewArmy);
    const phreakMerged = mergeCrewArmyIntoArmyBonus(phreakBonusForStats, crewArmy);
    const botStats: Record<string, any> = {};
    const botStatsM2: Record<string, any> = {};
    for (const botType of BOT_FAMILY_TYPES) {
      const config = await BotService.getUserBotStats(
        botType,
        userLevel,
        armyMerged,
        guardianMerged,
        phreakMerged,
        1
      );
      botStats[botType] = { ...config, stats: roundEffectiveStatsToStatRow(config.stats) };
    }
    for (const botType of BOT_FAMILY_TYPES) {
      const statsKey = getInventoryKey(botType, 2);
      if (!BotStatsService.hasBotTypeKey(statsKey)) {
        continue;
      }
      const config = await BotService.getUserBotStats(
        botType,
        userLevel,
        armyMerged,
        guardianMerged,
        phreakMerged,
        2
      );
      botStatsM2[botType] = { ...config, stats: roundEffectiveStatsToStatRow(config.stats) };
    }
    res.json({ botStats, botStatsM2 });
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

// Get bot stats breakdown for profile charts (base, +level, +programming, +crew research, +crew level, total)
// Total row comes from BotService.getUserBotStats (same as /stats and battles) so one source of truth.
// Crew level table vs Hack Crew research army bonuses are split for UI; sum matches battle merge.
// Range bot type (Phreaks): programming bonus from Binary Bank Crack (Attack/Health/Defense/Speed), same pattern as PB → Infantry (breacher), RCH → Cavalry (guardian).
router.get('/stats-breakdown', auth, async (req, res) => {
  try {
    const { BotService } = require('../services/BotService');
    const BotStatsService = require('../services/BotStatsService').BotStatsService;
    await BotStatsService.loadConfigs();
    const { userLevel, armyBonusForStats, guardianBonusForStats, phreakBonusForStats } =
      await syncAndResolveUserBotProgrammingBonuses(req.user._id);
    const crewParts = await getCrewArmyBonusPartsForUser(req.user._id);
    const crewArmy = {
      atk: crewParts.levelTable.atk + crewParts.hackCrewResearch.atk,
      def: crewParts.levelTable.def + crewParts.hackCrewResearch.def,
      hp: crewParts.levelTable.hp + crewParts.hackCrewResearch.hp,
    };
    const armyMerged = mergeCrewArmyIntoArmyBonus(armyBonusForStats, crewArmy);
    const guardianMerged = mergeCrewArmyIntoArmyBonus(guardianBonusForStats, crewArmy);
    const phreakMerged = mergeCrewArmyIntoArmyBonus(phreakBonusForStats, crewArmy);

    const crewPartToStatRow = (c: { atk: number; def: number; hp: number }): StatRow => ({
      health: c.hp,
      offense: c.atk,
      defense: c.def,
      speed: 0,
      range: 0,
    });
    const crewLevelBonusGlobal = crewPartToStatRow(crewParts.levelTable);
    const crewResearchBonusGlobal = crewPartToStatRow(crewParts.hackCrewResearch);

    const zeroRow = (): StatRow => ({ health: 0, offense: 0, defense: 0, speed: 0, range: 0 });
    const breakdown: Record<
      string,
      {
        base: StatRow;
        levelBonus: StatRow;
        programmingBonus: StatRow;
        /** Hack Crew research unlocks (category hack-crew army chain), not crew level. */
        crewResearchBonus: StatRow;
        /** Crew level member bonus table (army Str/Def/Health totals). */
        crewLevelBonus: StatRow;
        total: StatRow;
        mark2: { base: StatRow; levelBonus: StatRow; total: StatRow };
      }
    > = {};

    for (const botType of BOT_FAMILY_TYPES) {
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
              health: armyBonusForStats.health,
              offense: armyBonusForStats.strength,
              defense: armyBonusForStats.defense,
              speed: armyBonusForStats.speed,
              range: 0,
            }
          : botType === 'guardian'
            ? {
                health: guardianBonusForStats.health,
                offense: guardianBonusForStats.strength,
                defense: guardianBonusForStats.defense,
                speed: guardianBonusForStats.speed,
                range: 0,
              }
            : botType === 'phreak'
              ? {
                  health: phreakBonusForStats.health ?? 0,
                  offense: phreakBonusForStats.strength ?? 0,
                  defense: phreakBonusForStats.defense ?? 0,
                  speed: phreakBonusForStats.speed ?? 0,
                  range: (phreakBonusForStats as { range?: number }).range ?? 0,
                }
              : zeroRow();
      const crewResearchBonus: StatRow = { ...crewResearchBonusGlobal };
      const crewLevelBonus: StatRow = { ...crewLevelBonusGlobal };
      const finalConfig = await BotService.getUserBotStats(
        botType,
        userLevel,
        armyMerged,
        guardianMerged,
        phreakMerged,
        1
      );
      const s = finalConfig.stats;
      const total: StatRow = roundEffectiveStatsToStatRow(s);

      const m2Key = getInventoryKey(botType, 2);
      const baseM2 = BotStatsService.getBaseStats(m2Key);
      /** Same absolute +User Level deltas as Mark I — not recomputed on the Mark II base. */
      const levelBonusM2: StatRow = { ...levelBonus };
      const finalM2 = await BotService.getUserBotStats(
        botType,
        userLevel,
        armyMerged,
        guardianMerged,
        phreakMerged,
        2
      );
      const totalM2 = roundEffectiveStatsToStatRow(finalM2.stats);

      breakdown[botType] = {
        base,
        levelBonus,
        programmingBonus,
        crewResearchBonus,
        crewLevelBonus,
        total,
        mark2: {
          base: baseM2,
          levelBonus: levelBonusM2,
          total: totalM2,
        },
      };
    }

    res.json({ userLevel, breakdown });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start bot build
router.post('/build', auth, async (req, res) => {
  try {
    const { type, quantity: rawQty, totalCost: rawTotalCost, markLevel: rawMark } = req.body;
    const markLevel = rawMark === 2 || rawMark === '2' ? 2 : 1;

    const qty = Number.parseInt(String(rawQty ?? ''), 10);
    if (!['breacher', 'guardian', 'phreak'].includes(String(type)) || !Number.isInteger(qty) || qty < 1) {
      res.status(400).json({ error: 'Invalid build parameters' });
      return;
    }

    if (markLevel === 2) {
      const unlocked = await userHasMark2BotsUnlocked(req.user._id);
      if (!unlocked) {
        res.status(403).json({
          error: 'Complete Mark 2 Bots research in Hack Ability to build Mark II units.',
        });
        return;
      }
    }

    const costPerUnit = buildCostPerUnit(markLevel);
    const expectedTotalCost = qty * costPerUnit;
    const declaredTotal =
      rawTotalCost === undefined || rawTotalCost === null || rawTotalCost === ''
        ? expectedTotalCost
        : Number(rawTotalCost);
    if (!Number.isFinite(declaredTotal) || declaredTotal !== expectedTotalCost) {
      res.status(400).json({
        error: `Total cost must be $${expectedTotalCost} for this build (${qty} × $${costPerUnit}).`,
      });
      return;
    }

    let bot = await Bot.findOne({ userId: req.user._id });
    if (bot?.buildQueue) {
      res.status(400).json({ error: 'A build is already in progress' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.balance.total < expectedTotalCost) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    user.balance.total -= expectedTotalCost;
    await user.save();

    const msPerUnit = buildMillisecondsPerUnit(markLevel);
    const totalBuildTime = qty * msPerUnit;
    const startedAt = new Date().toISOString();
    const completesAt = new Date(Date.now() + totalBuildTime).toISOString();

    if (!bot) {
      bot = new Bot({
        userId: req.user._id,
        bots: normalizeBotsObject({}),
      });
    }

    bot.buildQueue = {
      botType: type,
      quantity: qty,
      totalCost: expectedTotalCost,
      startedAt,
      completesAt,
      botsBuilt: 0,
      markLevel,
    };

    await bot.save();

    res.json({ buildQueue: bot.buildQueue, bots: normalizeBotsObject(bot.bots as Record<string, unknown>) });
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
      botType: 'breacher',
      quantity: 5,
      startedAt: new Date(),
      completesAt: new Date(Date.now() + (5 * 1000)), // 5 seconds total
      botsBuilt: 0,
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
        bots: normalizeBotsObject(bot?.bots as Record<string, unknown>),
      });
      return;
    }

    if (!parseBuildQueueFamily(bot.buildQueue as { botType?: string; type?: string })) {
      console.warn('[bots/build-state] Clearing buildQueue with missing family (botType/type)', {
        userId: String(req.user._id),
        snapshot:
          typeof (bot.buildQueue as { toObject?: () => object }).toObject === 'function'
            ? (bot.buildQueue as { toObject: () => object }).toObject()
            : bot.buildQueue,
      });
      bot.buildQueue = null;
      await bot.save();
      res.json({
        buildQueue: null,
        bots: normalizeBotsObject(bot.bots as Record<string, unknown>),
      });
      return;
    }

    const now = new Date();
    const startedAt = new Date(bot.buildQueue.startedAt);
    const completesAt = new Date(bot.buildQueue.completesAt);
    const totalTime = completesAt.getTime() - startedAt.getTime();
    const elapsedTime = now.getTime() - startedAt.getTime();
    const progress = Math.min((elapsedTime / totalTime) * 100, 100);

    const queueMarkLevel = (bot.buildQueue as { markLevel?: number }).markLevel ?? 1;
    const invKey = getInventoryKey(getBuildQueueFamily(bot.buildQueue as any), queueMarkLevel);

    // Calculate how many bots should be built based on progress
    const expectedBotsBuilt = Math.floor((progress / 100) * bot.buildQueue.quantity);

    // Update botsBuilt if needed and save to database
    if (expectedBotsBuilt > bot.buildQueue.botsBuilt) {
      const prev = (bot.bots as Record<string, number>)[invKey] ?? 0;
      (bot.bots as Record<string, number>)[invKey] = prev + (expectedBotsBuilt - bot.buildQueue.botsBuilt);
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
          const finalTypeInTransaction = getBuildQueueFamily(botInTransaction.buildQueue as any);
          const fullQuantityBuilt = botInTransaction.buildQueue.quantity;
          const remainingBotsInTransaction = botInTransaction.buildQueue.quantity - botInTransaction.buildQueue.botsBuilt;
          const txMarkLevel = (botInTransaction.buildQueue as { markLevel?: number }).markLevel ?? 1;
          const txInvKey = getInventoryKey(finalTypeInTransaction, txMarkLevel);

          // Add remaining bots to inventory (if any)
          if (remainingBotsInTransaction > 0) {
            const botsMap = botInTransaction.bots as Record<string, number>;
            botsMap[txInvKey] = (botsMap[txInvKey] ?? 0) + remainingBotsInTransaction;
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
        bots: normalizeBotsObject((updatedBot?.bots ?? bot.bots) as Record<string, unknown>),
      });
      return;
    }

    // Return current state with all buildQueue properties
    const family = getBuildQueueFamily(bot.buildQueue as any);
    res.json({
      buildQueue: {
        ...bot.buildQueue.toObject(),
        progress,
        type: family,
        botType: family,
        totalCost: bot.buildQueue.totalCost, // Explicitly include totalCost
        botsBuilt: bot.buildQueue.botsBuilt, // Include botsBuilt
        markLevel: (bot.buildQueue as { markLevel?: number }).markLevel ?? 1,
      },
      bots: normalizeBotsObject(bot.bots as Record<string, unknown>),
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

    if (!parseBuildQueueFamily(bot.buildQueue as { botType?: string; type?: string })) {
      console.warn('[bots/speedup-build] Clearing buildQueue with missing family (botType/type)', {
        userId: String(req.user._id),
      });
      bot.buildQueue = null;
      await bot.save();
      res.status(400).json({
        error: 'Build data was invalid and has been cleared. Start a new build.',
      });
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

        const spMarkLevel = (botInTransaction.buildQueue as { markLevel?: number }).markLevel ?? 1;
        const spInvKey = getInventoryKey(getBuildQueueFamily(botInTransaction.buildQueue as any), spMarkLevel);
        const spBotsMap = botInTransaction.bots as Record<string, number>;
        spBotsMap[spInvKey] = (spBotsMap[spInvKey] ?? 0) + remainingBotsToAdd;
        
        // Increment lifetime bot build counters (capped at 1,000,000)
        // When speedup is used, we count the FULL quantity built, not just remaining
        // This ensures all bots are counted even if some were already built naturally
        const fullQuantityBuilt = botInTransaction.buildQueue.quantity;
        if (fullQuantityBuilt > 0) {
          const botType = getBuildQueueFamily(botInTransaction.buildQueue as any);
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
      bots: normalizeBotsObject(updatedBot.bots as Record<string, unknown>),
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
        const nextStep = getNextBattalionSizeResearchHint(maxLimit);
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
            error: `Battalion ${battalionId} is locked. Complete the "Add Battalion ${battalionId}" research feature to unlock it.`,
          });
          return;
        }
      }

      const rawMark = (entry as any).markLevel;
      const markLevel: number =
        typeof rawMark === 'number' && Number.isInteger(rawMark) && rawMark >= 2 ? 2 : 1;

      if (markLevel >= 2) {
        const unlocked = await userHasMark2BotsUnlocked(req.user._id);
        if (!unlocked) {
          res.status(403).json({
            error: 'Complete Mark 2 Bots research in Hack Ability to assign Mark II units.',
          });
          return;
        }
      }

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
            bots: normalizeBotsObject({}),
            battalionAssignments: [],
          });
          await newBot.save();
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 50 * retryCount));
          continue;
        }

        const sumByInv: Record<string, number> = {};
        for (const a of normalized) {
          const key = getInventoryKey(a.botType, a.markLevel);
          sumByInv[key] = (sumByInv[key] || 0) + a.quantity;
        }

        // Bugbot: compare to total bot.bots (not “available after other battalions”) — preset replaces battalionAssignments atomically, so prior deployments are cleared in the same write. Concurrent bot.bots / assignment changes on this doc bump __v; findOneAndUpdate below retries.
        const botsMapPreset = bot.bots as Record<string, number>;
        for (const key of Object.keys(sumByInv)) {
          const need = sumByInv[key] || 0;
          const owned = botsMapPreset[key] ?? 0;
          if (need > owned) {
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
          bots: normalizeBotsObject(updatedBot.bots as Record<string, unknown>),
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
    const { botType, quantity, battalionId, markLevel: rawMark } = req.body;
    const markLevel = rawMark === 2 || rawMark === '2' ? 2 : 1;

    if (!botType || !['breacher', 'guardian', 'phreak'].includes(String(botType))) {
      res.status(400).json({ error: 'Invalid bot type' });
      return;
    }

    if (markLevel === 2) {
      const unlocked = await userHasMark2BotsUnlocked(req.user._id);
      if (!unlocked) {
        res.status(403).json({
          error: 'Complete Mark 2 Bots research in Hack Ability to assign Mark II units.',
        });
        return;
      }
    }

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
      const nextStep = getNextBattalionSizeResearchHint(maxLimit);
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
            bots: normalizeBotsObject({}),
            battalionAssignments: [],
          });
          await newBot.save();
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 50 * retryCount));
          continue; // Retry with the new bot
        }

        const invKey = getInventoryKey(String(botType), markLevel);

        // Find existing assignment for this battalion
        const existingAssignment = bot.battalionAssignments.find(
          (assignment: { battalionId: string }) => assignment.battalionId === battalionId
        );

        // CRITICAL FIX: Never modify total bot inventory - only track assignments
        // The total bot inventory should remain constant, assignments are tracked separately
        const newAssignments = bot.battalionAssignments.filter(
          (assignment: { battalionId: string }) => assignment.battalionId !== battalionId
        );

        const botsMap = bot.bots as Record<string, number>;
        const totalBotsOfType = botsMap[invKey] || 0;

        const otherAssignments = newAssignments.filter(
          (assignment: any) =>
            assignment.botType === botType && (assignment.markLevel ?? 1) === markLevel
        );
        const alreadyAssignedToOtherBattalions = otherAssignments.reduce(
          (sum: number, assignment: any) => sum + assignment.quantity,
          0
        );

        let trulyAvailableBots = totalBotsOfType - alreadyAssignedToOtherBattalions;

        if (existingAssignment) {
          const sameFamilyAndMark =
            existingAssignment.botType === botType &&
            (existingAssignment.markLevel ?? 1) === markLevel;
          if (sameFamilyAndMark) {
            trulyAvailableBots += existingAssignment.quantity;
          }
        }

        if (trulyAvailableBots < quantity) {
          res.status(400).json({ error: 'Insufficient Bots Available' });
          return;
        }

        if (quantity > 0) {
          newAssignments.push({
            battalionId,
            botType,
            quantity,
            markLevel,
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


        const ub = updatedBot.bots as Record<string, number>;
        const finalAvailableCount =
          (ub[invKey] || 0) -
          updatedBot.battalionAssignments
            .filter(
              (assignment: any) =>
                assignment.botType === botType && (assignment.markLevel ?? 1) === markLevel
            )
            .reduce((sum: number, assignment: any) => sum + assignment.quantity, 0);

        res.json({
          success: true,
          availableBotCount: finalAvailableCount,
          totalBotCount: ub[invKey] || 0,
          previousAssignment: existingAssignment || null,
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
