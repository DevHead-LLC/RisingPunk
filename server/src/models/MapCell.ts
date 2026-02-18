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
// Sparse index for general mapId+userId lookups (e.g. findHouseForUser). Explicit name so it doesn't conflict with one_house_per_user index.
MapCellSchema.index({ mapId: 1, userId: 1 }, { sparse: true, name: 'mapId_userId_sparse' });
// Bugbot: At most one house per user per map (exclude YOU marker so setPlayerPosition can set occupiedBy: 'player' on a second cell). Explicit name so MongoDB doesn't reuse mapId_1_userId_1 (IndexOptionsConflict).
MapCellSchema.index(
  { mapId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { occupiedBy: 'player', entityName: { $ne: 'YOU' } }, name: 'mapId_userId_one_house_per_user' }
);
// Bugbot: Index for clearUserFromMapCells and updatePlayerHandleInMapCells (query by userId only); sparse since many cells have userId null.
MapCellSchema.index({ userId: 1 }, { sparse: true });
// Bugbot: Index for findCellByNpcInstanceId and clearNpcInstanceFromMapCell (query by mapId + npcInstanceId); avoids collection scan on 250K docs.
MapCellSchema.index({ mapId: 1, npcInstanceId: 1 });

export const MapCell = mongoose.model('MapCell', MapCellSchema);
