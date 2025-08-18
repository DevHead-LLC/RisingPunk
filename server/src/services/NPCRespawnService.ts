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
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) return;
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

  static scheduleRespawnForInstance(npcSlug: string, npcInstanceId: string, delaySeconds: number, mapName: string = 'main'): void {
    const key = `${mapName}:${npcInstanceId}`;
    if (this.scheduled.has(key)) { return; }
    const timeout = setTimeout(async () => {
      this.scheduled.delete(key);
      await this.respawnNpcInstance(npcSlug, npcInstanceId, mapName);
    }, Math.max(1, delaySeconds) * 1000);
    this.scheduled.set(key, timeout);
  }

  private static async respawnNpc(npcSlug: string, mapName: string = 'main', npcInstanceId?: string): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) {
      return;
    }
    const cells: any[] = doc.cells || [];
    const valid: any[] = cells.filter((c: any) => !c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road');
    if (valid.length === 0) {
      return;
    }

    const cell = valid[Math.floor(Math.random() * valid.length)];
    const title = this.titleForSlug(npcSlug);

    cell.isOccupied = true;
    cell.occupiedBy = 'npc';
    cell.entityName = title;
    (cell as any).npcSlug = npcSlug;
    (cell as any).npcInstanceId = npcInstanceId || `${npcSlug}-${Date.now()}`;

    doc.markModified('cells');
    await doc.save();
  }

  private static async respawnNpcInstance(npcSlug: string, npcInstanceId: string, mapName: string = 'main'): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) {
      return;
    }
    const cells: any[] = doc.cells || [];
    const valid: any[] = cells.filter((c: any) => !c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road');
    if (valid.length === 0) {
      return;
    }

    const cell = valid[Math.floor(Math.random() * valid.length)];
    const title = this.titleForSlug(npcSlug);

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


