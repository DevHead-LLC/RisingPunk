import mongoose from 'mongoose';

/**
 * One document per cell when the map uses the mapcells collection (e.g. gridSize 500).
 * Same field shape as Map.cells subdocuments, plus mapId.
 * Enables 500×500 maps without hitting MongoDB 16MB document limit.
 */
const MapCellSchema = new mongoose.Schema({
  mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  terrain: {
    type: String,
    enum: ['plain', 'mountain', 'water', 'forest', 'road', 'grass', 'dirt'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
  isOccupied: { type: Boolean, default: false },
  canBeOccupied: { type: Boolean, default: true },
  occupiedBy: {
    type: String,
    enum: ['none', 'player', 'npc'],
    default: 'none',
  },
  entityName: { type: String, default: '' },
  npcSlug: { type: String, default: '' },
  npcInstanceId: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

MapCellSchema.index({ mapId: 1, x: 1, y: 1 }, { unique: true });
MapCellSchema.index({ mapId: 1, userId: 1 }, { sparse: true });

export const MapCell = mongoose.model('MapCell', MapCellSchema);
