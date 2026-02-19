import mongoose from 'mongoose';

/**
 * Pending NPC respawns: one doc per NPC instance waiting to respawn after being defeated.
 * Persisted so that after a server restart we can respawn overdue instances and re-schedule future ones.
 * Doc is deleted when the respawn runs (timer fires or startup catch-up).
 */
const PendingNpcRespawnSchema = new mongoose.Schema({
  mapName: { type: String, required: true, default: 'main' },
  npcSlug: { type: String, required: true },
  npcInstanceId: { type: String, required: true },
  respawnAt: { type: Date, required: true },
});

PendingNpcRespawnSchema.index({ respawnAt: 1 });
PendingNpcRespawnSchema.index({ mapName: 1, npcInstanceId: 1 }, { unique: true });

export const PendingNpcRespawn = mongoose.model('PendingNpcRespawn', PendingNpcRespawnSchema);
