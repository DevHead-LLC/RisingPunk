console.log('Loading environment variables...');
require('dotenv').config();
console.log('Environment loaded. Connecting to MongoDB...');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');

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
  dbName: 'test',
  appName: 'mongosh+2.2.12'  // matching the working mongosh connection
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📦 Database:', mongoose.connection.name);
  console.log('🔗 Connected to:', mongoose.connection.host);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
  // Log the connection string (with password hidden)
  const sanitizedUri = process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
  console.log('🔍 Attempting connection to:', sanitizedUri);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 