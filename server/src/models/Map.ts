import mongoose from 'mongoose';

const CellSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  terrain: {
    type: String,
    enum: ['plain', 'mountain', 'water', 'forest', 'road', 'grass', 'dirt'],
    required: true
  },
  isActive: { type: Boolean, default: true },
  isOccupied: { type: Boolean, default: false },
  canBeOccupied: { type: Boolean, default: true },
  occupiedBy: {
    type: String,
    enum: ['none', 'player', 'npc'],
    default: 'none'
  },
  entityName: { type: String, default: '' },
  npcSlug: { type: String, default: '' },
  npcInstanceId: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

// Set canBeOccupied based on terrain type
CellSchema.pre('save', function(next) {
  if (this.terrain === 'mountain' || this.terrain === 'water' || this.terrain === 'road') {
    this.canBeOccupied = false;
  }
  next();
});

const MapSchema = new mongoose.Schema({
  name: { type: String, default: 'main' },
  gridSize: { type: Number, default: 50 },
  cells: [CellSchema],
  version: { type: Number, default: 1 },
  lastUpdated: { type: Date, default: Date.now }
});

// Index for lookups by cell coordinates (non-unique: uniqueness within a map is enforced in app code to avoid E11000 on insert)
MapSchema.index({ 'cells.x': 1, 'cells.y': 1 });

// Index for efficient updates by userId (e.g. handle change, orphan cleanup)
MapSchema.index({ 'cells.userId': 1 }, { sparse: true });

export const Map = mongoose.model('Map', MapSchema); 