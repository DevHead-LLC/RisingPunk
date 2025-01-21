const express = require('express');
const router = express.Router();
const Army = require('../models/Army');
const auth = require('../middleware/auth');

// Update bot count
router.post('/update-bots', auth, async (req, res) => {
  try {
    const { botType, quantity } = req.body;
    console.log('Update bots request:', { userId: req.user.userId, botType, quantity });
    
    // Use the army from auth middleware
    const army = req.army;
    
    // Increment the specific bot type
    army.bots[botType] += quantity;
    await army.save();
    
    console.log('Updated army:', army.bots);
    res.status(200).json(army.bots);
  } catch (error) {
    console.error('Army update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update army' });
  }
});

// Get army status
router.get('/status', auth, async (req, res) => {
  try {
    console.log('Fetching army status for user:', req.user.userId);
    
    // Use the army from auth middleware
    const botCounts = req.army.bots;
    
    console.log('Returning army status:', botCounts);
    res.status(200).json(botCounts);
  } catch (error) {
    console.error('Army status error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch army status' });
  }
});

module.exports = router; 