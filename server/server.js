console.log('Loading environment variables...');
require('dotenv').config();
console.log('Environment loaded. Connecting to MongoDB...');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');
const Bot = require('./models/Bot');

// Debug .env loading
const envPath = path.resolve(process.cwd(), '.env');
console.log('📂 Current directory:', process.cwd());
console.log('📂 .env path:', envPath);

// Read and log .env file contents
try {
  const envContents = fs.readFileSync(envPath, 'utf8');
  console.log('📄 .env file contents:', envContents);
} catch (err) {
  console.error('❌ Error reading .env file:', err);
}

// Debug environment variables
console.log('🔑 MONGODB_URI:', process.env.MONGODB_URI?.replace(/:([^@]+)@/, ':****@'));

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
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Add test route with database status
app.get('/api/status', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState === 1;
    const status = {
      server: '✅ Running',
      database: dbState ? '✅ Connected' : '❌ Disconnected',
      timestamp: new Date()
    };
    console.log('📊 Status check:', status);
    res.json(status);
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update or add this route
app.get('/api/profile', async (req, res) => {
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
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.use('/api/auth', authRoutes);

// Add this route to verify database connection
app.get('/api/dbcheck', async (req, res) => {
  try {
    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();
    const users = await mongoose.connection.db.collection('users').countDocuments();
    
    res.json({
      database: dbName,
      collections: collections.map(c => c.name),
      userCount: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add balance endpoint to existing routes
app.get('/api/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const secondsElapsed = (now - user.balance.lastUpdated) / 1000;
    const accumulatedAmount = Math.floor(secondsElapsed * user.balance.ratePerSecond);
    
    user.balance.total += accumulatedAmount;
    user.balance.lastUpdated = now;
    await user.save();

    res.json(user.balance);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bot routes
app.post('/api/bots/test', auth, async (req, res) => {
  try {
    const bot = await Bot.findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { bots: { breacher: 0, guardian: 0, phreak: 0 } } },
      { upsert: true, new: true }
    );
    res.json(bot);
  } catch (error) {
    console.error('Bot test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bots', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ userId: req.user._id });
    res.json(bot?.bots || { breacher: 0, guardian: 0, phreak: 0 });
  } catch (error) {
    console.error('Bot fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Build bots endpoint
app.post('/api/bots/build', auth, async (req, res) => {
  try {
    const { type, quantity } = req.body;
    
    // Validate input
    if (!['breacher', 'guardian', 'phreak'].includes(type)) {
      return res.status(400).json({ error: 'Invalid bot type' });
    }
    
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    // First, ensure document exists
    let bot = await Bot.findOne({ userId: req.user._id });
    
    if (!bot) {
      bot = await Bot.create({
        userId: req.user._id,
        bots: { breacher: 0, guardian: 0, phreak: 0 }
      });
    }

    // Then update the specific bot count
    bot.bots[type] += quantity;
    await bot.save();

    res.json(bot.bots);
  } catch (error) {
    console.error('Bot build error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/balance/deduct', auth, async (req, res) => {
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
  } catch (error) {
    console.error('Balance deduction error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 