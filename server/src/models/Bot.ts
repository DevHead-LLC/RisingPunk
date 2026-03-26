const mongoose = require('mongoose');

/**
 * `strict: false` so legacy MongoDB docs that stored the family as `buildQueue.type` still hydrate
 * that field. With default strict mode, unknown keys are stripped — both `botType` and `type` then
 * look undefined and `/build-state` cannot resolve the family.
 */
const buildQueueSchema = new mongoose.Schema(
  {
    botType: {
      type: String,
      enum: ['breacher', 'guardian', 'phreak'],
    },
    quantity: {
      type: Number,
      min: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    startedAt: Date,
    completesAt: Date,
    botsBuilt: {
      type: Number,
      default: 0,
      min: 0,
    },
    markLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 2,
    },
  },
  { _id: false, strict: false }
);

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
    },
    breacherM2: {
      type: Number,
      default: 0,
      min: 0
    },
    guardianM2: {
      type: Number,
      default: 0,
      min: 0
    },
    phreakM2: {
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
  buildQueue: buildQueueSchema
}, {
  timestamps: true
});

// Keep only this unique index
botSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Bot', botSchema); 