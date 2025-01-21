const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Army = require('../models/Army');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check for army record and create if doesn't exist
    let army = await Army.findOne({ userId: user._id });
    if (!army) {
      army = new Army({
        userId: user._id,
        bots: {
          breacher: 0,
          guardian: 0,
          phreak: 0
        }
      });
      await army.save();
    }

    // Attach both user and army to request
    req.user = {
      _id: user._id,
      userId: user._id, // For backward compatibility
      handle: user.handle,
      level: user.level
    };
    req.army = army;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ 
      error: 'Please authenticate',
      details: error.message 
    });
  }
};

module.exports = auth; 