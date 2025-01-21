const mongoose = require('mongoose');

const armySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
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
  }
}, {
  timestamps: true
});

armySchema.index({ userId: 1 }, { unique: true });

const Army = mongoose.model('Army', armySchema);

module.exports = Army; 