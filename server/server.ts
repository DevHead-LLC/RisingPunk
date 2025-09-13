import helmet from 'helmet';
import { CORS_ORIGINS, PORT } from './src/config/env';
console.log('Environment loaded via dotenv-flow. Connecting to MongoDB...');

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { User } from './src/models/User';
import authRoutes from './src/routes/auth';
import auth from './src/middleware/auth';
const Bot = require('./src/models/Bot');
import { Request, Response, NextFunction } from 'express';
import { Error } from 'mongoose';
import mapRoutes from './src/routes/map';
import userRoutes from './src/routes/userRoutes';
import battleRoutes from './src/routes/battle';
import healthRoute from './src/routes/health';
import researchRoutes from './src/routes/research';
import documentsRoutes from './src/routes/documents';
import testRoutes from './src/routes/test';

declare global {
  namespace Express {
    interface Request {
      user: { _id: string }
      battle?: any
    }
  }
}

const app = express();

// Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGINS.length ? CORS_ORIGINS : true,
  credentials: true,
}));
app.use(express.json());

// Activity logging middleware for privacy policy compliance
import { activityLogging } from './src/middleware/activityLogging';

// MongoDB connection - simplified to match mongosh
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  appName: 'mongosh+2.2.12'  // matching the working mongosh connection
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  console.log('📦 Database:', mongoose.connection.db?.databaseName || 'Unknown');
  console.log('🔗 Connected to:', mongoose.connection.host);
  
  // Wait for the connection to be fully ready
  await new Promise(resolve => {
    if (mongoose.connection.readyState === 1) {
      resolve(undefined);
    } else {
      mongoose.connection.once('open', resolve);
    }
  });
  
  // Initialize Google Auth Service
  try {
    const { GoogleAuthService } = require('./src/services/GoogleAuthService');
    GoogleAuthService.initialize();
    console.log('✅ Google Auth Service initialized');
  } catch (error) {
    console.warn('⚠️  Google Auth Service not available:', error);
  }
  
  // Initialize leveling and bot stats services
  try {
          const { LevelingService } = require('./src/services/LevelingService');
      const { BotStatsService } = require('./src/services/BotStatsService');
      const { DataCleanupService } = require('./src/services/DataCleanupService');
      
      await LevelingService.loadConfig();
    await BotStatsService.loadConfigs();
    
    // Start data cleanup service for privacy policy compliance
    DataCleanupService.startScheduledCleanup();
    
    // Start activity aggregation service for privacy compliance
    const { ActivityAggregationService } = require('./src/services/ActivityAggregationService');
    ActivityAggregationService.startAggregationService();
    
    console.log('✅ Game services initialized successfully');
    console.log('✅ Data cleanup service started for privacy compliance');
    console.log('✅ Activity aggregation service started for privacy compliance');
  } catch (error) {
    console.error('❌ Failed to initialize game services:', error);
    process.exit(1);
  }
})
.catch((err: Error) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Basic test route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'Server is running' });
});

// Add test route with database status
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const dbState = mongoose.connection.readyState === 1;
    const status = {
      server: '✅ Running',
      database: dbState ? '✅ Connected' : '❌ Disconnected',
      timestamp: new Date()
    };
    res.json(status);
  } catch (error: any) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update or add this route
app.get('/api/profile', async (req: Request, res: Response) => {
  try {
    let user = await User.findOne({ username: 'Bert Toast' });
    
    if (!user) {
      // Create default user if none exists
      user = await User.create({
        username: 'Bert Toast',
        level: 1,
        experience: { current: 1000, nextLevel: 1000 },
        armyBonus: { strength: 0, defense: 0, speed: 0, health: 0 }
      });
    }
    
    res.json(user);
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.use('/api/auth', authRoutes);

// Activity logging middleware for privacy policy compliance
// This runs AFTER auth routes so req.user is available
app.use(activityLogging);

// Add this route to verify database connection
app.get('/api/dbcheck', async (req: Request, res: Response) => {
  try {
    const dbName = mongoose.connection.db?.databaseName || 'Unknown';
    const collections = await mongoose.connection.db?.listCollections().toArray() || [];
    const users = await mongoose.connection.db?.collection('users').countDocuments() || 0;
    
    res.json({
      database: dbName,
      collections: collections.map((c: any) => c.name),
      userCount: users
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current balance and automatically update it with accumulated time
app.get('/api/balance', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate and update accumulated balance FIRST (before sync)
    const now = new Date();
    const secondsElapsed = (now.getTime() - user.balance.lastUpdated.getTime()) / 1000;
    
    // Calculate income from total effective rate (includes rental housing income)
    const accumulatedAmount = Math.floor(secondsElapsed * user.balance.ratePerSecond);
    
    // Only update if there's accumulated amount to add
    if (accumulatedAmount > 0) {
      user.balance.total += accumulatedAmount;
      user.balance.lastUpdated = now;
      await user.save();
    }

    // THEN check and sync rental housing income if needed
    const { RentalHousingSyncService } = await import('./src/services/RentalHousingSyncService');
    await RentalHousingSyncService.performSync(user);

    // Return updated balance (ratePerSecond already includes rental housing income)
    const currentBalance = {
      total: user.balance.total,
      ratePerSecond: user.balance.ratePerSecond,
      lastUpdated: user.balance.lastUpdated
    };

    res.json(currentBalance);
  } catch (error: any) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update balance endpoint that accumulates and saves time
app.post('/api/balance/update', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate and update accumulated balance FIRST (before sync)
    const now = new Date();
    const secondsElapsed = (now.getTime() - user.balance.lastUpdated.getTime()) / 1000;
    
    // Calculate income from total effective rate (includes rental housing income)
    const accumulatedAmount = Math.floor(secondsElapsed * user.balance.ratePerSecond);
    
    user.balance.total += accumulatedAmount;
    user.balance.lastUpdated = now;
    await user.save();

    // THEN check and sync rental housing income if needed
    const { RentalHousingSyncService } = await import('./src/services/RentalHousingSyncService');
    await RentalHousingSyncService.performSync(user);

    res.json({
      total: user.balance.total,
      ratePerSecond: user.balance.ratePerSecond,
      lastUpdated: user.balance.lastUpdated
    });
  } catch (error: any) {
    console.error('Balance update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bot routes
app.post('/api/bots/test', auth, async (req: Request, res: Response) => {
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

app.get('/api/bots', auth, async (req: Request, res: Response) => {
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
app.get('/api/bots/stats', auth, async (req: Request, res: Response) => {
  try {
    const { BotService } = require('./src/services/BotService');
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

// Add this POST endpoint for starting builds
app.post('/api/bots/build', auth, async (req: Request, res: Response) => {
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

app.post('/api/balance/deduct', auth, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.balance.total < amount) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    user.balance.total -= amount;
    await user.save();

    res.json(user.balance);
  } catch (error: any) {
    console.error('Balance deduction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rental housing income data
app.get('/api/rental-housing/income', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { RentalHousingIncomeService } = await import('./src/services/RentalHousingIncomeService');
    const rentalIncome = RentalHousingIncomeService.calculateRentalHousingIncome(user);

    res.json(rentalIncome);
  } catch (error: any) {
    console.error('Rental housing income fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Manual sync endpoint for rental housing income
app.post('/api/rental-housing/sync', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { RentalHousingSyncService } = await import('./src/services/RentalHousingSyncService');
    const syncResult = await RentalHousingSyncService.performSync(user);

    res.json({
      success: syncResult.success,
      syncedAmount: syncResult.syncedAmount,
      newBalance: syncResult.newBalance,
      message: syncResult.syncedAmount > 0 
        ? `Synced $${syncResult.syncedAmount} in rental housing income`
        : 'No sync needed - rental housing income is up to date'
    });
  } catch (error: any) {
    console.error('Rental housing sync error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add this test endpoint
app.post('/api/bots/test-build-queue', auth, async (req: Request, res: Response) => {
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

// Update the build-state endpoint to properly handle completion
app.get('/api/bots/build-state', auth, async (req: Request, res: Response) => {
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

// Antivirus Shield endpoints
app.get('/api/antivirus-shield/status', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const now = new Date();
    let shieldStatus = null;
    let isActive = false;
    let cooldownStatus = null;

    // Check if shield is active and should be completed
    if (user.antivirusShield?.active && user.antivirusShield?.startedAt && user.antivirusShield?.completesAt) {
      if (now >= user.antivirusShield.completesAt) {
        // Shield has expired, deactivate it
        user.antivirusShield.active = false;
        user.antivirusShield.startedAt = null;
        user.antivirusShield.completesAt = null;
        await user.save();
        isActive = false;
      } else {
        // Shield is still active
        isActive = true;
        shieldStatus = {
          startedAt: user.antivirusShield.startedAt.toISOString(),
          completesAt: user.antivirusShield.completesAt.toISOString(),
          timeRemaining: Math.max(0, user.antivirusShield.completesAt.getTime() - now.getTime())
        };
      }
    }

    // Check cooldown status
    if (user.antivirusShield?.cooldownUntil) {
      if (now >= user.antivirusShield.cooldownUntil) {
        // Cooldown has expired, clear it
        user.antivirusShield.cooldownUntil = null;
        await user.save();
      } else {
        // Still in cooldown
        cooldownStatus = {
          cooldownUntil: user.antivirusShield.cooldownUntil.toISOString(),
          timeRemaining: Math.max(0, user.antivirusShield.cooldownUntil.getTime() - now.getTime())
        };
      }
    }

    res.json({
      isActive,
      shieldStatus,
      cooldownStatus
    });
  } catch (error: any) {
    console.error('Antivirus shield status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/antivirus-shield/activate', auth, async (req: Request, res: Response) => {
  try {
    const { optionId } = req.body;
    
    if (!optionId) {
      res.status(400).json({ error: 'Shield option ID is required' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if shield is already active
    if (user.antivirusShield?.active && user.antivirusShield?.completesAt) {
      const now = new Date();
      if (now < user.antivirusShield.completesAt) {
        res.status(400).json({ error: 'Antivirus shield is already active' });
        return;
      }
    }

    // Check if user is in cooldown period
    const now = new Date();
    if (user.antivirusShield?.cooldownUntil && now < user.antivirusShield.cooldownUntil) {
      res.status(400).json({ error: 'Shield is in cooldown period' });
      return;
    }

    // Define shield options with actual durations
    const shieldOptions: Record<string, { price: number; durationMs: number }> = {
      '4h': { price: 10000, durationMs: 4 * 60 * 60 * 1000 }, // 4 hours
      '8h': { price: 20000, durationMs: 8 * 60 * 60 * 1000 }, // 8 hours
      '12h': { price: 40000, durationMs: 12 * 60 * 60 * 1000 }, // 12 hours
      '24h': { price: 75000, durationMs: 24 * 60 * 60 * 1000 }, // 24 hours
      '1w': { price: 500000, durationMs: 7 * 24 * 60 * 60 * 1000 } // 1 week (7 days)
    };

    const option = shieldOptions[optionId];
    if (!option) {
      res.status(400).json({ error: 'Invalid shield option' });
      return;
    }

    // Check if user has sufficient balance
    if (user.balance.total < option.price) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    // Deduct balance and activate shield
    user.balance.total -= option.price;
    user.antivirusShield = {
      active: true,
      startedAt: now,
      completesAt: new Date(now.getTime() + option.durationMs),
      cooldownUntil: null
    };
    await user.save();

    res.json({
      success: true,
      balance: {
        total: user.balance.total,
        ratePerSecond: user.balance.ratePerSecond,
        lastUpdated: user.balance.lastUpdated.toISOString()
      },
      antivirusShield: {
        active: true,
        startedAt: user.antivirusShield!.startedAt!.toISOString(),
        completesAt: user.antivirusShield!.completesAt!.toISOString()
      }
    });
  } catch (error: any) {
    console.error('Antivirus shield activation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/antivirus-shield/deactivate', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if shield is active
    if (!user.antivirusShield?.active) {
      res.status(400).json({ error: 'No active shield to deactivate' });
      return;
    }

    const now = new Date();

    // Deactivate shield and set 15-minute cooldown
    const cooldownUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    user.antivirusShield = {
      active: false,
      startedAt: null,
      completesAt: null,
      cooldownUntil: cooldownUntil
    };
    await user.save();

    res.json({
      success: true,
      antivirusShield: {
        active: false,
        cooldownUntil: cooldownUntil.toISOString()
      }
    });
  } catch (error: any) {
    console.error('Antivirus shield deactivation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.use('/api/map', mapRoutes);

app.use('/api/users', userRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/research', researchRoutes);
app.use('/documents', documentsRoutes);

// Test routes for privacy policy compliance verification
app.use('/api/test', testRoutes);

// Admin routes for privacy policy compliance and data management
import adminRoutes from './src/routes/admin';
app.use('/api/admin', adminRoutes);

app.use('/', healthRoute);

app.post('/api/battalions/assign', auth, async (req: Request, res: Response) => {
  try {
    const { botType, quantity, battalionId } = req.body;
    
    // Use findOneAndUpdate instead of findOne to handle concurrent updates
    const bot = await Bot.findOneAndUpdate(
      { userId: req.user._id },
      {},
      { new: true, upsert: true }
    );

    // Find existing assignment for this battalion
    const existingAssignment = bot.battalionAssignments.find(
      (assignment: { battalionId: string }) => assignment.battalionId === battalionId
    );

    // If exists, return those bots to the available pool first
    if (existingAssignment) {
      bot.bots[existingAssignment.botType] += existingAssignment.quantity;
      bot.battalionAssignments = bot.battalionAssignments.filter(
        (assignment: { battalionId: string }) => assignment.battalionId !== battalionId
      );
    }

    // Now verify sufficient bots available
    if (bot.bots[botType] < quantity) {
      res.status(400).json({ error: 'Insufficient Bots Available' });
      return;
    }

    // Make the new assignment
    bot.bots[botType] -= quantity;
    if (quantity > 0) {
      bot.battalionAssignments.push({
        battalionId,
        botType,
        quantity,
        markLevel: 1
      });
    }

    await Bot.findOneAndUpdate(
      { userId: req.user._id },
      { 
        bots: bot.bots,
        battalionAssignments: bot.battalionAssignments
      },
      { new: true }
    );

    res.json({ 
      success: true,
      updatedBotCount: bot.bots[botType],
      previousAssignment: existingAssignment || null
    });

  } catch (error: any) {
    console.error('Battalion assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listen strictly on the configured PORT from env.ts
const startServer = (port = PORT, maxAttempts = 0) => {
  try {
    const server = app.listen(port, () => {
      console.log(`✅ Server running successfully on port ${port}`);
    });
    
    // Setup server error handler
    server.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} is busy, trying ${port + 1}...`);
        if (maxAttempts > 0) {
          startServer(port + 1, maxAttempts - 1);
        } else {
          console.error('❌ Failed to find an available port');
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', e);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Start the server with dynamic port selection
startServer();