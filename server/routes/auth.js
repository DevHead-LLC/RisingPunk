const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Register new user
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    const { email, handle, accessKey } = req.body;
    
    // Check for existing user
    const existingUser = await User.findOne({ 
      $or: [{ email }, { handle }] 
    });
    
    if (existingUser) {
      console.log('User already exists:', existingUser.handle);
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already exists' : 'Handle already exists'
      });
    }

    // Create user
    const user = new User({
      email,
      handle,
      hashedAccessKey: accessKey
    });

    await user.save();
    console.log('New user created:', user.handle);

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        handle: user.handle,
        email: user.email,
        level: user.level
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt in database:', mongoose.connection.name);
    const { handle, accessKey } = req.body;
    
    const user = await User.findOne({ handle });
    console.log('User search result:', user ? 'Found' : 'Not found');
    if (!user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const isValid = await user.verifyAccessKey(accessKey);
    if (!isValid) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        handle: user.handle,
        email: user.email,
        level: user.level
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 