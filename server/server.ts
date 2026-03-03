import helmet from 'helmet';
import { CORS_ORIGINS, PORT } from './src/config/env';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { User } from './src/models/User';
import { UserTaskProgress } from './src/models/UserTaskProgress';
import { ShieldService } from './src/services/ShieldService';
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
import { deleteAccountHandler } from './src/routes/documents';
import type { PerformSyncResult } from './src/services/RentalHousingSyncService';
import testRoutes from './src/routes/test';
import botsRoutes from './src/routes/bots';
import crewRoutes from './src/routes/crew';
import reportsRoutes from './src/routes/reports';
import privateMessagesRoutes from './src/routes/privateMessages';
import probeRoutes from './src/routes/probe';
import leaderboardRoutes from './src/routes/leaderboardRoutes';
import userGuideRoutes from './src/routes/userGuideRoutes';
import marketingRoutes from './src/routes/marketing';

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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'X-App-Version'],
}));
app.use(express.json());

// Activity logging middleware for privacy policy compliance
import { activityLogging } from './src/middleware/activityLogging';

// MongoDB connection - simplified to match mongosh
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Determine database name based on environment
const getDatabaseName = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  switch (nodeEnv) {
    case 'production':
      return 'RisingPunkProd';
    case 'staging':
    case 'development':
    default:
      return 'RisingPunk';
  }
};

mongoose.connect(process.env.MONGODB_URI, {
  dbName: getDatabaseName(),
  appName: 'mongosh+2.2.12'  // matching the working mongosh connection
})
.then(async () => {
  
  // Wait for connection to be fully ready before proceeding
  await new Promise<void>((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      // Connection is already ready
      resolve();
    } else if (mongoose.connection.readyState === 2) {
      // Connection is in progress, wait for it to complete
      mongoose.connection.once('open', () => {
        resolve();
      });
      mongoose.connection.once('error', (err) => {
        reject(err);
      });
    } else {
      // Connection is in an unexpected state (0: disconnected, 3: disconnecting)
      reject(new Error(`Unexpected connection state: ${mongoose.connection.readyState}`));
    }
  });
  
  
  // Verify database object is available after full connection
  if (!mongoose.connection.db) {
    console.error('Database object not available after connection');
    process.exit(1);
  }

  // Ensure multiple guest users (email: null) are allowed. Schema defines email as unique + sparse.
  // If production DB has a non-sparse unique index on email, only one null is allowed and guest creation fails.
  try {
    const usersCollection = mongoose.connection.db.collection('users');
    const indexes = await usersCollection.indexes();
    const emailIndex = indexes.find((i: { name?: string }) => i.name === 'email_1') as { name?: string; sparse?: boolean } | undefined;
    if (emailIndex && !emailIndex.sparse) {
      await usersCollection.dropIndex('email_1');
      await User.syncIndexes();
      console.log('Dropped non-sparse email_1 index and re-synced; guest accounts can now be created.');
    }
  } catch (indexErr: unknown) {
    const err = indexErr as { codeName?: string; message?: string };
    if (err.codeName === 'IndexNotFound') {
      await User.syncIndexes().catch(() => {});
    } else {
      console.warn('Email index check/fix failed (non-fatal):', err.message ?? indexErr);
    }
  }

  // Restore NPC respawn timers after server reset (defeated bots respawn or re-schedule)
  try {
    const { NPCRespawnService } = require('./src/services/NPCRespawnService');
    await NPCRespawnService.runRespawnCatchUp();
  } catch (respawnErr: unknown) {
    console.warn('NPC respawn catch-up failed (non-fatal):', respawnErr);
  }

  // Ensure rental_property construction config exists so rental endpoints don't 500 (bootstrap if missing)
  try {
    const { ensureRentalPropertyConfig } = require('./src/services/RentalPropertyConfigService');
    await ensureRentalPropertyConfig();
  } catch (bootstrapErr: unknown) {
    console.error('Rental property config bootstrap failed:', bootstrapErr);
    process.exit(1);
  }

  // Initialize Google Auth Service
  try {
    const { GoogleAuthService } = require('./src/services/GoogleAuthService');
    GoogleAuthService.initialize();
  } catch (error) {
    console.error('Google Auth Service not available:', error);
  }
  
  // Initialize Apple Auth Service
  try {
    const { AppleAuthService } = require('./src/services/AppleAuthService');
    AppleAuthService.initialize();
  } catch (error) {
    console.error('Apple Auth Service not available:', error);
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
    
  } catch (error) {
    console.error('Failed to initialize game services:', error);
    process.exit(1);
  }
})
.catch((err: Error) => {
  console.error('MongoDB connection error:', err);
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

// Marketing routes (smart redirects for YouTube promotion)
// Register early to skip unnecessary middleware (activity logging, etc.)
app.use('/', marketingRoutes);

// Activity logging middleware for privacy policy compliance
// This runs AFTER auth routes so req.user is available
app.use(activityLogging);

import { requireMinAppVersion } from './src/middleware/requireMinAppVersion';
app.use('/api', requireMinAppVersion);

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

    // Calculate and update accumulated balance with fractional remainder tracking
    const now = new Date();
    const secondsElapsed = (now.getTime() - user.balance.lastUpdated.getTime()) / 1000;
    
    // Round down to 10-second intervals to prevent over-crediting
    const roundedSecondsElapsed = Math.floor(secondsElapsed / 10) * 10;
    
    // Calculate full precision income (includes fractional cents)
    const fullPrecisionIncome = roundedSecondsElapsed * user.balance.ratePerSecond;
    
    // Add to existing fractional remainder
    const totalWithRemainder = (user.balance.fractionalRemainder || 0) + fullPrecisionIncome;
    
    // Calculate whole dollars to add (floor of total amount)
    const wholeDollarsToAdd = Math.floor(totalWithRemainder);
    
    // Calculate new fractional remainder (decimal part after adding whole dollars)
    const finalFractionalRemainder = totalWithRemainder - wholeDollarsToAdd;
    
    // Only update if there's accumulated amount to add or fractional remainder changed
    if (wholeDollarsToAdd > 0 || finalFractionalRemainder !== (user.balance.fractionalRemainder || 0)) {
      user.balance.total += wholeDollarsToAdd;
      user.balance.fractionalRemainder = finalFractionalRemainder;
      // Only advance lastUpdated by the credited time to prevent time loss
      user.balance.lastUpdated = new Date(user.balance.lastUpdated.getTime() + (roundedSecondsElapsed * 1000));
      await user.save();
    }

    // THEN check and sync rental housing income if needed (returns expense modifiers to avoid duplicate DB queries)
    const { RentalHousingSyncService } = await import('./src/services/RentalHousingSyncService');
    const syncResult: PerformSyncResult = await RentalHousingSyncService.performSync(user);

    // Check and update lifetime high net worth
    const { LifetimeHighNetWorthService } = await import('./src/services/LifetimeHighNetWorthService');
    const lifetimeHighUpdated = LifetimeHighNetWorthService.checkAndUpdateLifetimeHigh(user);
    
    // Save user if lifetime high was updated (balance was already saved earlier if it changed)
    if (lifetimeHighUpdated) {
      await user.save();
    }

    // Expense modifiers from performSync (single source of truth for Financial Statements screen; no duplicate queries)
    const insuranceReduction = syncResult.insuranceReduction;
    const taxReduction = syncResult.taxReduction;

    // Return updated balance (ratePerSecond already includes rental housing income)
    const currentBalance = {
      total: user.balance.total,
      ratePerSecond: user.balance.ratePerSecond,
      lastUpdated: user.balance.lastUpdated,
      fractionalRemainder: user.balance.fractionalRemainder || 0,
      lifetimeHighNetWorth: user.lifetimeHighNetWorth || 0,
      lifetimeHighUpdated: lifetimeHighUpdated,
      insuranceReduction,
      taxReduction
    };

    res.json(currentBalance);
  } catch (error: any) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Removed duplicate /api/balance/update endpoint - GET /api/balance already handles updates

// Removed unused /api/balance/deduct endpoint - not used by mobile app

// Get rental housing income data (ensure legacy level migration so legacy users get level-5 rates)
app.get('/api/rental-housing/income', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { RentalHousingSyncService } = await import('./src/services/RentalHousingSyncService');
    const { RentalHousingIncomeService } = await import('./src/services/RentalHousingIncomeService');
    const { getRentalPropertyConfig } = await import('./src/services/RentalPropertyConfigService');
    await RentalHousingSyncService.ensureLegacyRentalLevels(user);
    const rentalIncome = await RentalHousingIncomeService.calculateRentalHousingIncome(user);
    const config = await getRentalPropertyConfig();
    const cumulativeBuildValueByLevel: number[] = [0];
    for (let i = 0; i < config.propertyLevels.length; i++) {
      const prev = cumulativeBuildValueByLevel[cumulativeBuildValueByLevel.length - 1];
      cumulativeBuildValueByLevel.push(prev + config.propertyLevels[i].cost);
    }

    res.json({ ...rentalIncome, cumulativeBuildValueByLevel });
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

    // Use ShieldService to check and update shield status
    isActive = await ShieldService.checkAndUpdateShieldStatus(user);

    // If shield is active, get status details
    if (isActive && user.antivirusShield?.startedAt && user.antivirusShield?.completesAt) {
      shieldStatus = {
        startedAt: user.antivirusShield.startedAt.toISOString(),
        completesAt: user.antivirusShield.completesAt.toISOString(),
        timeRemaining: Math.max(0, user.antivirusShield.completesAt.getTime() - now.getTime())
      };
    }

    // Check cooldown status
    let needsCooldownUpdate = false;
    if (user.antivirusShield?.cooldownUntil) {
      if (now >= user.antivirusShield.cooldownUntil) {
        // Cooldown has expired, clear it
        user.antivirusShield.cooldownUntil = null;
        needsCooldownUpdate = true;
      } else {
        // Still in cooldown
        cooldownStatus = {
          cooldownUntil: user.antivirusShield.cooldownUntil.toISOString(),
          timeRemaining: Math.max(0, user.antivirusShield.cooldownUntil.getTime() - now.getTime())
        };
      }
    }

    // Only save if we need to update cooldown (avoid overwriting shield updates)
    if (needsCooldownUpdate) {
      await user.save();
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

    // Mark "Use a shield" guided task progress (any shield duration completes the task)
    try {
      await UserTaskProgress.findOneAndUpdate(
        { userId: user._id },
        {
          $set: { shieldActivatedAt: now },
          $setOnInsert: { completedTasks: [], collectedTasks: [], skippedTasks: [], showTaskGuide: true }
        },
        { upsert: true }
      );
    } catch (taskTrackingError) {
      console.error('Error tracking shield activation for task guide:', taskTrackingError);
    }

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
app.use('/api/users/user-guide', userGuideRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/crew', crewRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/private-messages', privateMessagesRoutes);
app.use('/api/probe', probeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/documents', documentsRoutes);

// Test routes for privacy policy compliance verification
app.use('/api/test', testRoutes);
app.use('/api/bots', botsRoutes);

// Admin routes for privacy policy compliance and data management
import adminRoutes from './src/routes/admin';
app.use('/api/admin', adminRoutes);

app.get('/delete-account', deleteAccountHandler);

app.use('/', healthRoute);


// Listen strictly on the configured PORT from env.ts
const startServer = (port = PORT, maxAttempts = 0) => {
  try {
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
    
    // Setup server error handler
    server.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        if (maxAttempts > 0) {
          startServer(port + 1, maxAttempts - 1);
        } else {
          console.error('Failed to find an available port');
          process.exit(1);
        }
      } else {
        console.error('Server error:', e);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start the server with dynamic port selection
startServer();