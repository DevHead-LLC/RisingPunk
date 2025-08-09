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
  npcSlug: { type: String, default: '' }
});

// Set canBeOccupied based on terrain type
CellSchema.pre('save', function(next) {
  if (this.terrain === 'mountain' || this.terrain === 'water') {
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

// Ensure x,y coordinates are unique within each map
MapSchema.index({ 'cells.x': 1, 'cells.y': 1 }, { unique: true });

export const Map = mongoose.model('Map', MapSchema); 