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
import battleRoutes from './src/routes/battle';

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

const mapService = new MapService();

// Get map data
app.get('/api/map/:name', async (req: Request, res: Response) => {
  try {
    const name = req.params.name;
    let mapDoc = await Map.findOne({ name });
    if (!mapDoc) {
      const created = await mapService.generateMap(name);
      mapDoc = (created as any) || await Map.findOne({ name });
    }

    if (!mapDoc) {
      res.status(500).json({ error: 'Failed to load map' });
      return;
    }

    // Migrate old maps: enforce version >=2 and gridSize 50, friendly cleanup, and placement rules
    let didChange = false;
    const docAny = mapDoc as any;
    if (!docAny.version || docAny.version < 2 || docAny.gridSize !== 50) {
      await Map.deleteOne({ _id: docAny._id });
      const recreated = await mapService.generateMap(name);
      mapDoc = (recreated as any) || await Map.findOne({ name });
      if (!mapDoc) {
        res.status(500).json({ error: 'Failed to build map' });
        return;
      }
    } else {
      // Sanitize: only one player house (entityName === 'YOU'), others are NPC; no houses on water/mountain; exactly 6 houses total
      const cells: any[] = (mapDoc as any).cells;
      const isBlocked = (c: any) => c.terrain === 'water' || c.terrain === 'mountain';
      let playerCells = cells.filter(c => c.isOccupied && c.occupiedBy === 'player');
      // Fix invalid player cells (not named YOU)
      for (const c of playerCells) {
        if (c.entityName !== 'YOU') {
          c.occupiedBy = 'npc';
          c.entityName = `COMP_FIX`;
          didChange = true;
        }
      }
      playerCells = cells.filter(c => c.isOccupied && c.occupiedBy === 'player' && c.entityName === 'YOU');
      if (playerCells.length === 0) {
        // Place YOU at deterministic location similar to MapService
        const desired = { x: 8, y: 11 };
        const indexFor = (x: number, y: number) => y * 50 + x;
        const isValid = (cc: any) => !cc.isOccupied && !isBlocked(cc);
        let px = desired.x; let py = desired.y;
        const clamp = (v: number) => Math.min(Math.max(v, 0), 49);
        const at = (x: number, y: number) => cells[indexFor(x, y)];
        if (!isValid(at(px, py))) {
          let found = false;
          for (let radius = 1; radius < 50 && !found; radius++) {
            for (let dy = -radius; dy <= radius && !found; dy++) {
              for (let dx = -radius; dx <= radius && !found; dx++) {
                const nx = clamp(px + dx); const ny = clamp(py + dy);
                const cc = at(nx, ny);
                if (isValid(cc)) { px = nx; py = ny; found = true; }
              }
            }
          }
        }
        const you = at(px, py);
        you.isOccupied = true; you.occupiedBy = 'player'; you.entityName = 'YOU';
        didChange = true;
      } else if (playerCells.length > 1) {
        // Keep first, convert others to npc
        for (let i = 1; i < playerCells.length; i++) {
          playerCells[i].occupiedBy = 'npc';
          playerCells[i].entityName = 'COMP_FIX';
          didChange = true;
        }
      }
      // Remove houses on blocked terrain
      for (const c of cells) {
        if (c.isOccupied && isBlocked(c)) {
          c.isOccupied = false; c.occupiedBy = 'none'; c.entityName = '';
          didChange = true;
        }
      }
      // Ensure exactly 6 houses total (1 YOU + 5 NPC)
      const freshPlayer = cells.filter(c => c.isOccupied && c.occupiedBy === 'player' && c.entityName === 'YOU');
      const npcHouses = cells.filter(c => c.isOccupied && c.occupiedBy === 'npc');
      const targetNpc = 5;
      // Remove excess NPC houses
      if (npcHouses.length > targetNpc) {
        for (let i = targetNpc; i < npcHouses.length; i++) {
          npcHouses[i].isOccupied = false; npcHouses[i].occupiedBy = 'none'; npcHouses[i].entityName = '';
          didChange = true;
        }
      }
      // Add missing NPC houses
      if (npcHouses.length < targetNpc) {
        const needed = targetNpc - npcHouses.length;
        let placed = 0;
        const you = freshPlayer[0];
        while (placed < needed) {
          const idx = Math.floor(Math.random() * cells.length);
          const c = cells[idx];
          if (!c.isOccupied && !isBlocked(c) && !(you && c.x === you.x && c.y === you.y)) {
            c.isOccupied = true; c.occupiedBy = 'npc'; c.entityName = `COMP${placed + 1}`;
            placed++; didChange = true;
          }
        }
      }
      if (didChange) {
        await (mapDoc as any).save();
      }
    }

    const gridSize = (mapDoc as any).gridSize || 50;
    const emptyGrid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ({ terrain: 'plain', entity: 'empty' }))
    );

    for (const c of (mapDoc as any).cells as any[]) {
      const y = c.y;
      const x = c.x;
      const entity = c.isOccupied ? 'house' : 'empty';
      const owner = c.isOccupied ? (c.occupiedBy === 'player' ? 'player' : 'enemy') : undefined;
      const name = c.entityName || undefined;
      emptyGrid[y][x] = {
        terrain: c.terrain,
        entity,
        owner,
        name,
      } as any;
    }

    res.json({ grid: emptyGrid });
  } catch (error: any) {
    console.error('Map fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/map/player-position', auth, async (req: Request, res: Response) => {
  try {
    const { x, y } = req.body as { x: number; y: number };
    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }

    let mapDoc = await Map.findOne({ name: 'main' });
    if (!mapDoc) {
      const created = await mapService.generateMap('main');
      mapDoc = await Map.findOne({ name: 'main' });
      if (!mapDoc && created) {
        mapDoc = created as any;
      }
    }

    if (!mapDoc) {
      res.status(500).json({ error: 'Failed to load map' });
      return;
    }

    // Clear previous player position
    for (const c of (mapDoc as any).cells as any[]) {
      if (c.entityName === 'YOU') {
        c.isOccupied = false;
        c.occupiedBy = 'none';
        c.entityName = '';
      }
    }

    const target = (mapDoc.cells as any[]).find((c) => c.x === x && c.y === y);
    if (!target) {
      res.status(404).json({ error: 'Target cell not found' });
      return;
    }
    if (!target.canBeOccupied || target.terrain === 'mountain' || target.terrain === 'water') {
      res.status(400).json({ error: 'Cell cannot be occupied' });
      return;
    }
    if (target.isOccupied) {
      res.status(400).json({ error: 'Cell already occupied' });
      return;
    }

    target.isOccupied = true;
    target.occupiedBy = 'player';
    target.entityName = 'YOU';

    await mapDoc.save();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Player position update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/users', userRoutes);
app.use('/api/battle', battleRoutes);

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

// Dynamic port selection - will try 5000 first, then increment if busy
const startServer = (port = 5000, maxAttempts = 10) => {
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