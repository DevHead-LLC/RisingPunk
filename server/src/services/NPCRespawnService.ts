import mongoose from 'mongoose';
import { Map as MapModel } from '../models/Map';

type RespawnTask = {
  npcSlug: string;
  runAt: number;
  mapName: string;
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
        changed = true;
      }
    }
    if (changed) {
      doc.markModified('cells');
      await doc.save();
    }
  }

  static scheduleRespawn(npcSlug: string, delaySeconds: number, mapName: string = 'main'): void {
    if (this.scheduled.has(npcSlug)) { return; }
    const timeout = setTimeout(async () => {
      this.scheduled.delete(npcSlug);
      await this.respawnNpc(npcSlug, mapName);
    }, Math.max(1, delaySeconds) * 1000);
    this.scheduled.set(npcSlug, timeout);
  }

  private static async respawnNpc(npcSlug: string, mapName: string = 'main'): Promise<void> {
    const doc: any = await MapModel.findOne({ name: mapName });
    if (!doc) return;
    const cells: any[] = doc.cells || [];
    const valid: any[] = cells.filter((c: any) => !c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain');
    if (valid.length === 0) return;
    const idx = Math.floor(Math.random() * valid.length);
    const cell = valid[idx];
    cell.isOccupied = true;
    cell.occupiedBy = 'npc';
    cell.entityName = this.titleForSlug(npcSlug);
    (cell as any).npcSlug = npcSlug;
    doc.markModified('cells');
    await doc.save();
  }

  private static titleForSlug(slug: string): string {
    if (slug === 'npc-small-corporation') return 'Small Corporation';
    if (slug === 'npc-small-bank') return 'Small Bank';
    if (slug === 'npc-large-corporation') return 'Large Corporation';
    return 'NPC';
  }
}


