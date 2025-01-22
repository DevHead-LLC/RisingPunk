const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
  buildQueue: {
    type: {
      type: String,
      enum: ['breacher', 'guardian', 'phreak']
    },
    quantity: {
      type: Number,
      min: 0
    },
    startedAt: Date,
    completesAt: Date
  }
}, {
  timestamps: true
});

// Index for quick lookups by userId
botSchema.index({ userId: 1 });

// Ensure one document per user
botSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Bot', botSchema); 