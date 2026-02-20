import mongoose from 'mongoose';
import { Map as MapModel } from '../models/Map';
import { PendingNpcRespawn } from '../models/PendingNpcRespawn';
import {
  usesMapCells,
  clearNpcBySlugFromMap,
  clearNpcInstanceFromMapCell,
  placeNpcOnRandomCell,
} from './CellAccessorService';

export class NPCRespawnService {
  private static scheduled: globalThis.Map<string, NodeJS.Timeout> = new globalThis.Map();

  static async clearNpcFromMap(npcSlug: string, mapName: string = 'main'): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) return;
    if (usesMapCells(doc)) {
      await clearNpcBySlugFromMap(doc, npcSlug);
      return;
    }
    const cells: any[] = doc.cells || [];
    let changed = false;
    for (const c of cells) {
      if (c.isOccupied && c.occupiedBy === 'npc' && (c as any).npcSlug === npcSlug) {
        c.isOccupied = false;
        c.occupiedBy = 'none';
        c.entityName = '';
        (c as any).npcSlug = '';
        (c as any).npcInstanceId = '';
        changed = true;
      }
    }
    if (changed) {
      doc.markModified('cells');
      await doc.save();
    }
  }

  static async clearNpcInstanceFromMap(npcInstanceId: string, mapName: string = 'main'): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) return;
    if (usesMapCells(doc)) {
      await clearNpcInstanceFromMapCell(doc, npcInstanceId);
      return;
    }
    const cells: any[] = doc.cells || [];
    let changed = false;
    for (const c of cells) {
      if (c.isOccupied && c.occupiedBy === 'npc' && (c as any).npcInstanceId === npcInstanceId) {
        c.isOccupied = false;
        c.occupiedBy = 'none';
        c.entityName = '';
        (c as any).npcSlug = '';
        (c as any).npcInstanceId = '';
        changed = true;
      }
    }
    if (changed) {
      doc.markModified('cells');
      await doc.save();
    }
  }

  static scheduleRespawn(npcSlug: string, delaySeconds: number, mapName: string = 'main'): void {
    const key = `${mapName}:${npcSlug}:${Date.now()}`;
    const actualDelay = Math.max(1, delaySeconds) * 1000;
    const timeout = setTimeout(async () => {
      this.scheduled.delete(key);
      await this.respawnNpc(npcSlug, mapName);
    }, actualDelay);
    this.scheduled.set(key, timeout);
  }

  static async scheduleRespawnForInstance(npcSlug: string, npcInstanceId: string, delaySeconds: number, mapName: string = 'main'): Promise<void> {
    const key = `${mapName}:${npcInstanceId}`;
    if (this.scheduled.has(key)) return;
    const delayMs = Math.max(1, delaySeconds) * 1000;
    const respawnAt = new Date(Date.now() + delayMs);
    // Bugbot: Set timer before DB create so a transient create failure doesn't prevent in-memory respawn (NPC already cleared from map).
    const timeout = setTimeout(async () => {
      this.scheduled.delete(key);
      try {
        await this.clearNpcInstanceFromMap(npcInstanceId, mapName);
        await this.respawnNpcInstance(npcSlug, npcInstanceId, mapName);
        await PendingNpcRespawn.deleteOne({ mapName, npcInstanceId });
      } catch (err) {
        console.warn('[NPCRespawnService.scheduleRespawnForInstance] timer respawn failed', { mapName, npcInstanceId }, err);
        // Bugbot: Do not delete on failure so the record is retried on next startup.
      }
    }, delayMs);
    this.scheduled.set(key, timeout);
    try {
      await PendingNpcRespawn.create({ mapName, npcSlug, npcInstanceId, respawnAt });
    } catch (err) {
      console.warn('[NPCRespawnService.scheduleRespawnForInstance] failed to persist pending respawn (timer still set)', { mapName, npcInstanceId }, err);
    }
  }

  /**
   * Run on server startup: respawn all overdue pending NPCs and re-schedule future ones.
   * Ensures bots are not permanently lost after a server reset.
   * Bugbot: We clear by npcInstanceId before each respawn so a crash after respawn but before deleteOne doesn't leave a duplicate on next restart.
   */
  static async runRespawnCatchUp(): Promise<void> {
    const now = new Date();
    const overdue = await PendingNpcRespawn.find({ respawnAt: { $lte: now } }).lean();
    for (const doc of overdue) {
      try {
        await this.clearNpcInstanceFromMap(doc.npcInstanceId, doc.mapName);
        await this.respawnNpcInstance(doc.npcSlug, doc.npcInstanceId, doc.mapName);
        await PendingNpcRespawn.deleteOne({ mapName: doc.mapName, npcInstanceId: doc.npcInstanceId });
      } catch (err) {
        console.warn('[NPCRespawnService.runRespawnCatchUp] respawn failed for overdue', doc, err);
        // Bugbot: Do not delete on failure so the record is retried on next startup.
      }
    }
    const future = await PendingNpcRespawn.find({ respawnAt: { $gt: now } }).lean();
    for (const doc of future) {
      const key = `${doc.mapName}:${doc.npcInstanceId}`;
      if (this.scheduled.has(key)) continue;
      // Bugbot: Recompute remainingMs per doc so we don't drop docs that became overdue while processing the overdue list.
      const remainingMs = doc.respawnAt.getTime() - Date.now();
      if (remainingMs <= 0) {
        try {
          await this.clearNpcInstanceFromMap(doc.npcInstanceId, doc.mapName);
          await this.respawnNpcInstance(doc.npcSlug, doc.npcInstanceId, doc.mapName);
          await PendingNpcRespawn.deleteOne({ mapName: doc.mapName, npcInstanceId: doc.npcInstanceId });
        } catch (err) {
          console.warn('[NPCRespawnService.runRespawnCatchUp] respawn failed for became-overdue', doc, err);
          // Bugbot: Do not delete on failure so the record is retried on next startup.
        }
        continue;
      }
      const timeout = setTimeout(async () => {
        this.scheduled.delete(key);
        try {
          await this.clearNpcInstanceFromMap(doc.npcInstanceId, doc.mapName);
          await this.respawnNpcInstance(doc.npcSlug, doc.npcInstanceId, doc.mapName);
          await PendingNpcRespawn.deleteOne({ mapName: doc.mapName, npcInstanceId: doc.npcInstanceId });
        } catch (err) {
          console.warn('[NPCRespawnService.runRespawnCatchUp] timer respawn failed for future', doc, err);
          // Bugbot: Do not delete on failure so the record is retried on next startup.
        }
      }, remainingMs);
      this.scheduled.set(key, timeout);
    }
  }

  private static async respawnNpc(npcSlug: string, mapName: string = 'main', npcInstanceId?: string): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) return;
    const title = this.titleForSlug(npcSlug);
    const instanceId = npcInstanceId || `${npcSlug}-${Date.now()}`;
    if (usesMapCells(doc)) {
      // Full map (e.g. 500×500): placeNpcOnRandomCell samples from all valid empty cells, no bounds (retries inside on collision).
      const placed = await placeNpcOnRandomCell(doc, npcSlug, instanceId, title);
      if (!placed) {
        console.warn('[NPCRespawnService.respawnNpc] placement failed after retries', { npcSlug, mapName });
      }
      return;
    }
    const cells: any[] = doc.cells || [];
    const valid: any[] = cells.filter((c: any) => !c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road');
    if (valid.length === 0) return;
    const cell = valid[Math.floor(Math.random() * valid.length)];
    cell.isOccupied = true;
    cell.occupiedBy = 'npc';
    cell.entityName = title;
    (cell as any).npcSlug = npcSlug;
    (cell as any).npcInstanceId = instanceId;
    doc.markModified('cells');
    await doc.save();
  }

  private static async respawnNpcInstance(npcSlug: string, npcInstanceId: string, mapName: string = 'main'): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) {
      throw new Error(`[NPCRespawnService.respawnNpcInstance] map not found: ${mapName}`);
    }
    const title = this.titleForSlug(npcSlug);
    if (usesMapCells(doc)) {
      // Full map (e.g. 500×500): placeNpcOnRandomCell samples from all valid empty cells, no bounds (retries inside on collision).
      const placed = await placeNpcOnRandomCell(doc, npcSlug, npcInstanceId, title);
      if (!placed) {
        console.warn('[NPCRespawnService.respawnNpcInstance] placement failed after retries', { npcSlug, npcInstanceId, mapName });
        throw new Error('[NPCRespawnService.respawnNpcInstance] placement failed after retries');
      }
      return;
    }
    const cells: any[] = doc.cells || [];
    const valid: any[] = cells.filter((c: any) => !c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road');
    if (valid.length === 0) {
      throw new Error('[NPCRespawnService.respawnNpcInstance] no valid cells for placement');
    }
    const cell = valid[Math.floor(Math.random() * valid.length)];
    cell.isOccupied = true;
    cell.occupiedBy = 'npc';
    cell.entityName = title;
    (cell as any).npcSlug = npcSlug;
    (cell as any).npcInstanceId = npcInstanceId;
    doc.markModified('cells');
    await doc.save();
  }

  private static titleForSlug(slug: string): string {
    // Handle legacy NPC types
    if (slug === 'npc-small-corporation') return 'Small Corporation';
    if (slug === 'npc-small-bank') return 'Small Bank';
    if (slug === 'npc-large-corporation') return 'Large Corporation';
    
    // Handle new NPC types by converting slug to title
    if (slug.startsWith('npc-')) {
      const namePart = slug.replace('npc-', '');
      return namePart.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    
    // Fallback for any unrecognized slugs
    return 'NPC';
  }
}


