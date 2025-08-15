import helmet from 'helmet';
import { CORS_ORIGINS, PORT } from './src/config/env';
console.log('Environment loaded via dotenv-flow. Connecting to MongoDB...');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// MongoDB connection - simplified to match mongosh
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'RisingPunk',
  appName: 'mongosh+2.2.12'  // matching the working mongosh connection
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📦 Database:', mongoose.connection.db.databaseName);
  console.log('🔗 Connected to:', mongoose.connection.host);
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

// Add this route to verify database connection
app.get('/api/dbcheck', async (req: Request, res: Response) => {
  try {
    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();
    const users = await mongoose.connection.db.collection('users').countDocuments();
    
    res.json({
      database: dbName,
      collections: collections.map((c: any) => c.name),
      userCount: users
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update the balance endpoint
app.get('/api/balance', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const now = new Date();
    const secondsElapsed = (now.getTime() - user.balance.lastUpdated.getTime()) / 1000;
    const accumulatedAmount = Math.floor(secondsElapsed * user.balance.ratePerSecond);
    
    user.balance.total += accumulatedAmount;
    user.balance.lastUpdated = now;
    await user.save();

    res.json(user.balance);
  } catch (error: any) {
    console.error('Balance fetch error:', error);
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
      return res.json({ 
        bots: { breacher: 0, guardian: 0, phreak: 0 },
        battalionAssignments: []
      });
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
    const { BOT_CONFIG } = await import('./src/services/BotService');
    res.json({ botStats: BOT_CONFIG.USER_BOT_STATS });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add this POST endpoint for starting builds
app.post('/api/bots/build', auth, async (req: Request, res: Response) => {
  try {
    const { type, quantity, totalCost } = req.body;
    
    if (!type || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid build parameters' });
    }

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
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance.total < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    user.balance.total -= amount;
    await user.save();

    res.json(user.balance);
  } catch (error: any) {
    console.error('Balance deduction error:', error);
    res.status(500).json({ error: error.message });
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
      return res.json({ 
        buildQueue: null,
        bots: bot?.bots || { breacher: 0, guardian: 0, phreak: 0 }
      });
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

      return res.json({
        buildQueue: null,
        bots: bot.bots
      });
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

app.use('/api/map', mapRoutes);

app.use('/api/users', userRoutes);
app.use('/api/battle', battleRoutes);
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
      return res.status(400).json({ error: 'Insufficient bots available' });
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
          console.error('❌ Failed: to find an available port');
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