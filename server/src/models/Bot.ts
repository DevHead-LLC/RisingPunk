const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bots: {
    breacher: {
      type: Number,
      default: 0,
      min: 0
    },
    guardian: {
      type: Number,
      default: 0,
      min: 0
    },
    phreak: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  battalionAssignments: [{
    battalionId: String,
    botType: {
      type: String,
      enum: ['breacher', 'guardian', 'phreak']
    },
    quantity: {
      type: Number,
      min: 0
    },
    markLevel: {
      type: Number,
      default: 1
    }
  }],
  buildQueue: {
    type: {
      type: String,
      enum: ['breacher', 'guardian', 'phreak']
    },
    quantity: {
      type: Number,
      min: 0
    },
    totalCost: {
      type: Number,
      min: 0
    },
    startedAt: Date,
    completesAt: Date,
    botsBuilt: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Keep only this unique index
botSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Bot', botSchema); 