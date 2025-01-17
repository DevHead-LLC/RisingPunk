const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Add this line for debugging
console.log('Creating User model in database:', mongoose.connection.name);

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  handle: {
    type: String,
    required: true,
    unique: true
  },
  hashedAccessKey: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    current: {
      type: Number,
      default: 1000
    },
    nextLevel: {
      type: Number,
      default: 1000
    }
  },
  armyBonus: {
    strength: {
      type: Number,
      default: 0
    },
    defense: {
      type: Number,
      default: 0
    },
    speed: {
      type: Number,
      default: 0
    },
    health: {
      type: Number,
      default: 0
    }
  },
  balance: {
    total: {
      type: Number,
      default: 1000
    },
    ratePerSecond: {
      type: Number,
      default: 1
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, { 
  collection: 'users',  // Explicitly name the collection
  timestamps: true      // Add created/updated timestamps
});

// Add password hashing middleware
userSchema.pre('save', async function(next) {
  if (this.isModified('hashedAccessKey')) {
    const salt = await bcrypt.genSalt(12);
    this.hashedAccessKey = await bcrypt.hash(this.hashedAccessKey, salt);
  }
  next();
});

// Add method to verify password
userSchema.methods.verifyAccessKey = async function(accessKey) {
  return bcrypt.compare(accessKey, this.hashedAccessKey);
};

module.exports = mongoose.model('User', userSchema); 