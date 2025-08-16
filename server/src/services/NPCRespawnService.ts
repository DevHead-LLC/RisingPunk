import mongoose from 'mongoose';
import { Map as MapModel } from '../models/Map';

type RespawnTask = {
  npcSlug: string;
  runAt: number;
  mapName: string;
  npcInstanceId?: string;
};

export class NPCRespawnService {
  private static scheduled: globalThis.Map<string, NodeJS.Timeout> = new globalThis.Map();

  static async clearNpcFromMap(npcSlug: string, mapName: string = 'main'): Promise<void> {
    console.warn('[NPCRespawn] WARNING: clearNpcFromMap called - this will clear ALL NPCs of type', npcSlug);
    console.warn('[NPCRespawn] This method should only be used for emergency cleanup, not normal battle resolution');
    console.warn('[NPCRespawn] Use clearNpcInstanceFromMap with specific npcInstanceId instead');
    
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) return;
    const cells: any[] = doc.cells || [];
    let changed = false;
    for (const c of cells) {
      if (c.isOccupied && c.occupiedBy === 'npc' && (c as any).npcSlug === npcSlug) {
        console.log(`[NPCRespawn] Clearing NPC ${npcSlug} from cell (${c.x}, ${c.y})`);
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
      console.log(`[NPCRespawn] Cleared ${changed} NPC instances of type ${npcSlug} from map ${mapName}`);
    } else {
      console.log(`[NPCRespawn] No NPC instances of type ${npcSlug} found on map ${mapName}`);
    }
  }

  static async clearNpcInstanceFromMap(npcInstanceId: string, mapName: string = 'main'): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) return;
    const cells: any[] = doc.cells || [];
    let changed = false;
    for (const c of cells) {
      if (c.isOccupied && c.occupiedBy === 'npc' && (c as any).npcInstanceId === npcInstanceId) {
        console.log(`[NPCRespawn] Clearing NPC instance ${npcInstanceId} (${c.npcSlug}) from cell (${c.x}, ${c.y})`);
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
      console.log(`[NPCRespawn] Successfully cleared NPC instance ${npcInstanceId} from map ${mapName}`);
    } else {
      console.log(`[NPCRespawn] NPC instance ${npcInstanceId} not found on map ${mapName}`);
    }
  }

  static scheduleRespawn(npcSlug: string, delaySeconds: number, mapName: string = 'main'): void {
    const key = `${mapName}:${npcSlug}:${Date.now()}`;
    const actualDelay = Math.max(1, delaySeconds) * 1000;
    console.log('[NPCRespawn] Scheduling respawn for', npcSlug, 'with delay', actualDelay, 'ms');
    const timeout = setTimeout(async () => {
      console.log('[NPCRespawn] Timeout fired for', npcSlug);
      this.scheduled.delete(key);
      await this.respawnNpc(npcSlug, mapName);
    }, actualDelay);
    this.scheduled.set(key, timeout);
  }

  static scheduleRespawnForInstance(npcSlug: string, npcInstanceId: string, delaySeconds: number, mapName: string = 'main'): void {
    const key = `${mapName}:${npcInstanceId}`;
    if (this.scheduled.has(key)) { return; }
    const timeout = setTimeout(async () => {
      this.scheduled.delete(key);
      await this.respawnNpc(npcSlug, mapName, npcInstanceId);
    }, Math.max(1, delaySeconds) * 1000);
    this.scheduled.set(key, timeout);
  }

  private static async respawnNpc(npcSlug: string, mapName: string = 'main', npcInstanceId?: string): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) {
      console.log('[NPCRespawn] No map document found for', mapName);
      return;
    }
    const cells: any[] = doc.cells || [];
    const valid: any[] = cells.filter((c: any) => !c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road');
    if (valid.length === 0) {
      console.log('[NPCRespawn] No valid cells found for respawn. Total cells:', cells.length, 'Valid cells:', valid.length);
      return;
    }
    const idx = Math.floor(Math.random() * valid.length);
    const cell = valid[idx];
    cell.isOccupied = true;
    cell.occupiedBy = 'npc';
    cell.entityName = this.titleForSlug(npcSlug);
    (cell as any).npcSlug = npcSlug;
    if (npcInstanceId) {
      (cell as any).npcInstanceId = npcInstanceId;
    } else {
      (cell as any).npcInstanceId = `${npcSlug}-${cell.x}-${cell.y}-${Math.floor(Math.random()*1e6)}`;
    }
    doc.markModified('cells');
    await doc.save();
    console.log('[NPCRespawn] Successfully respawned', npcSlug, 'at', cell.x, cell.y);
  }

  private static titleForSlug(slug: string): string {
    if (slug === 'npc-small-corporation') return 'Small Corporation';
    if (slug === 'npc-small-bank') return 'Small Bank';
    if (slug === 'npc-large-corporation') return 'Large Corporation';
    return 'NPC';
  }
}


