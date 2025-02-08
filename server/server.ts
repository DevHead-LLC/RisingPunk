console.log('Loading environment variables...');
require('dotenv').config();
console.log('Environment loaded. Connecting to MongoDB...');

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
import { MapService } from './src/services/MapService';
import { Map } from './src/models/Map';
import userRoutes from './src/routes/userRoutes';

declare global {
  namespace Express {
    interface Request {
      user: { _id: string }
    }
  }
}

const app = express();

// Middleware
app.use(cors());
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
    res.json(bot?.bots || { breacher: 0, guardian: 0, phreak: 0 });
  } catch (error: any) {
    console.error('Bot fetch error:', error);
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

const mapService = new MapService();

// Get map data
app.get('/api/map/:name', async (req: Request, res: Response) => {
  try {
    let map = await Map.findOne({ name: req.params.name });
    
    if (!map) {
      map = await mapService.generateMap(req.params.name);
    }
    
    res.json(map);
  } catch (error: any) {
    console.error('Map fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/users', userRoutes);

app.post('/api/battalions/assign', auth, async (req: Request, res: Response) => {
  try {
    const { botType, quantity, battalionId } = req.body;
    
    const bot = await Bot.findOne({ userId: req.user._id });
    if (!bot) {
      return res.status(404).json({ error: 'Bot document not found' });
    }

    // Verify sufficient bots available
    if (bot.bots[botType] < quantity) {
      return res.status(400).json({ error: 'Insufficient bots available' });
    }

    // Update bot counts and add battalion assignment
    bot.bots[botType] -= quantity;
    
    bot.battalionAssignments.push({
      battalionId,
      botType,
      quantity,
      markLevel: 1
    });

    await bot.save();

    res.json({ 
      success: true,
      updatedBotCount: bot.bots[botType]
    });

  } catch (error: any) {
    console.error('Battalion assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});