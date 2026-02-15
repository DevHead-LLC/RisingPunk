import mongoose from 'mongoose';
import { Map } from '../models/Map';
import { dedupCellsByCoord } from '../utils/mapCellUtils';
import { User } from '../models/User';
import seedrandom from 'seedrandom';
import { NPCService, NPCDocument } from './NPCService';

export class MapService {
  private rng: seedrandom.PRNG;
  private readonly GRID_SIZE = 50;

  constructor(seed: string = 'risingpunk-v1') {
    this.rng = seedrandom(seed);
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  async generateMap(name: string = 'main'): Promise<any> {
    const cells = [];
    
    // Initialize with plains
    for (let y = 0; y < this.GRID_SIZE; y++) {
      for (let x = 0; x < this.GRID_SIZE; x++) {
        cells.push({
          x,
          y,
          terrain: 'plain',
          isActive: true,
          isOccupied: false,
          canBeOccupied: true,
          occupiedBy: 'none'
        });
      }
    }

    // Generate forests (using similar logic from HackMapScreen)
    this.generateForests(cells);
    
    // Generate mountains
    this.generateMountains(cells);
    
    // Generate rivers
    this.generateRivers(cells);

    // Generate roads
    this.generateRoads(cells);

    // Add open space variety (grass/dirt)
    this.addOpenSpaces(cells);

    // Add houses (entities)
    await this.addHouses(cells);

    // Ensure no duplicate (x,y) so E11000 unique index is satisfied; shared dedupe (mapCellUtils) prefers occupied, stronger when both (Bugbot).
    const deduped = dedupCellsByCoord(cells);
    if (deduped.length !== cells.length) {
      console.warn('[MapService.generateMap] deduped cells before save', cells.length, '->', deduped.length);
    }

    // Use native insertOne with plain objects to avoid Mongoose insert path that can trigger E11000.
    // Mirror CellSchema.pre('save') invariant: canBeOccupied = false for mountain, water, road (Bugbot).
    const plainCells = deduped.map((c: any) => {
      const terrain = c.terrain || 'plain';
      const impassable = terrain === 'mountain' || terrain === 'water' || terrain === 'road';
      return {
        x: c.x,
        y: c.y,
        terrain,
        isActive: c.isActive !== false,
        isOccupied: !!c.isOccupied,
        canBeOccupied: impassable ? false : (c.canBeOccupied !== false),
        occupiedBy: c.occupiedBy || 'none',
        entityName: c.entityName || '',
        npcSlug: c.npcSlug || '',
        npcInstanceId: c.npcInstanceId || '',
        userId: c.userId || null,
      };
    });
    console.log('[MapService.generateMap] inserting map', name, 'with', plainCells.length, 'cells');
    await Map.collection.insertOne({
      name,
      gridSize: this.GRID_SIZE,
      cells: plainCells,
      version: 2,
      lastUpdated: new Date(),
    });
    return Map.findOne({ name });
  }

  private generateForests(cells: any[]): void {
    for (let i = 0; i < 5; i++) {
      const centerX = this.randomInt(0, this.GRID_SIZE - 1);
      const centerY = this.randomInt(0, this.GRID_SIZE - 1);
      const size = this.randomInt(3, 6);

      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;
          if (x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE) {
            const idx = y * this.GRID_SIZE + x;
            if (this.rng() < 0.7 && (dx * dx + dy * dy <= size * size)) {
              cells[idx].terrain = 'forest';
            }
          }
        }
      }
    }
  }

  private generateMountains(cells: any[]): void {
    for (let i = 0; i < 3; i++) {
      let x = this.randomInt(0, this.GRID_SIZE - 1);
      let y = this.randomInt(0, this.GRID_SIZE - 1);
      const length = this.randomInt(5, 12);

      for (let j = 0; j < length; j++) {
        if (x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE) {
          const idx = y * this.GRID_SIZE + x;
          cells[idx].terrain = 'mountain';
          
          if (this.rng() < 0.4) {
            const adjY = y + (this.rng() < 0.5 ? 1 : -1);
            if (adjY >= 0 && adjY < this.GRID_SIZE) {
              const adjIdx = adjY * this.GRID_SIZE + x;
              cells[adjIdx].terrain = 'mountain';
            }
          }
        }
        x += this.randomInt(-1, 1);
        y += this.randomInt(-1, 1);
      }
    }
  }

  private generateRivers(cells: any[]): void {
    for (let i = 0; i < 2; i++) {
      let x = this.randomInt(0, this.GRID_SIZE - 1);
      let y = 0;
      while (y < this.GRID_SIZE) {
        if (x >= 0 && x < this.GRID_SIZE) {
          const idx = y * this.GRID_SIZE + x;
          cells[idx].terrain = 'water';
        }
        x += this.randomInt(-1, 1);
        x = Math.max(0, Math.min(x, this.GRID_SIZE - 1));
        y++;
      }
    }
  }

  private generateRoads(cells: any[]): void {
    // Create a couple of winding roads horizontally and vertically
    // Horizontal road
    let y = this.randomInt(3, this.GRID_SIZE - 4);
    for (let x = 0; x < this.GRID_SIZE; x++) {
      const idx = y * this.GRID_SIZE + x;
      if (cells[idx].terrain !== 'water' && cells[idx].terrain !== 'mountain') {
        cells[idx].terrain = 'road';
      }
      if (this.rng() < 0.35) {
        y += this.randomInt(-1, 1);
        y = Math.max(1, Math.min(this.GRID_SIZE - 2, y));
      }
    }
    // Vertical road
    let x = this.randomInt(3, this.GRID_SIZE - 4);
    for (let yy = 0; yy < this.GRID_SIZE; yy++) {
      const idx = yy * this.GRID_SIZE + x;
      if (cells[idx].terrain !== 'water' && cells[idx].terrain !== 'mountain') {
        cells[idx].terrain = 'road';
      }
      if (this.rng() < 0.35) {
        x += this.randomInt(-1, 1);
        x = Math.max(1, Math.min(this.GRID_SIZE - 2, x));
      }
    }
  }

  private async addHouses(cells: any[]): Promise<void> {
    const pickValidCellIndex = (): number => {
      let tries = 0;
      while (tries < 10000) {
        const idx = this.randomInt(0, cells.length - 1);
        const c = cells[idx];
        if (!c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road') {
          return idx;
        }
        tries++;
      }
      return -1;
    };
    
    const users = await User.find({}, { _id: 1, handle: 1 }).lean();
    for (const user of users) {
      const idx = pickValidCellIndex();
      if (idx === -1) { break; }
      const cell = cells[idx];
      cell.isOccupied = true;
      cell.occupiedBy = 'player';
      cell.entityName = user.handle;
      (cell as any).userId = (user as any)._id;
    }

    await this.placeNPCsOnCells(cells);
  }

  private async placeNPCsOnCells(cells: any[]): Promise<void> {
    const distribution: { [key: number]: number } = {
      1: 20,
      5: 15,
      10: 15,
      15: 15,
      20: 10,
      25: 10,
      30: 5,
      35: 5,
    };

    const allNPCs = await NPCService.getAllNPCs();
    const npcsByLevel: { [key: number]: NPCDocument[] } = {};
    
    for (const npc of allNPCs) {
      const level = npc.userLevelAssociation;
      if (!npcsByLevel[level]) {
        npcsByLevel[level] = [];
      }
      npcsByLevel[level].push(npc);
    }

    const pickValidCellIndex = (): number => {
      let tries = 0;
      while (tries < 10000) {
        const idx = this.randomInt(0, cells.length - 1);
        const c = cells[idx];
        if (!c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road') {
          return idx;
        }
        tries++;
      }
      return -1;
    };

    const levels = [1, 5, 10, 15, 20, 25, 30, 35];
    for (const level of levels) {
      let npcs = npcsByLevel[level] || [];
      if (npcs.length === 0) continue;

      const targetCount = distribution[level] || 0;
      if (targetCount === 0) continue;

      const shuffled = [...npcs].sort(() => this.rng() - 0.5);
      const npcsToPlace: NPCDocument[] = [];
      
      for (let i = 0; i < Math.min(5, shuffled.length); i++) {
        npcsToPlace.push(shuffled[i]);
      }

      const remaining = targetCount - npcsToPlace.length;
      for (let i = 0; i < remaining; i++) {
        const randomNPC = shuffled[Math.floor(this.rng() * shuffled.length)];
        npcsToPlace.push(randomNPC);
      }

      for (const npc of npcsToPlace) {
        const idx = pickValidCellIndex();
        if (idx === -1) break;
        const cell = cells[idx];
        cell.isOccupied = true;
        cell.occupiedBy = 'npc';
        cell.entityName = npc.name || npc.title || 'NPC';
        (cell as any).npcSlug = npc.slug;
        (cell as any).npcInstanceId = `${npc.slug}-${cell.x}-${cell.y}-${Math.floor(this.rng() * 1e6)}`;
      }
    }
  }

  static async updateNPCsOnMap(mapName: string = 'main'): Promise<void> {
    const mapDoc = await Map.findOne({ name: mapName });
    if (!mapDoc) {
      throw new Error(`Map '${mapName}' not found`);
    }

    const cells: any[] = (mapDoc as any).cells || [];
    let changed = false;

    for (const cell of cells) {
      if (cell.isOccupied && cell.occupiedBy === 'npc') {
        cell.isOccupied = false;
        cell.occupiedBy = 'none';
        cell.entityName = '';
        (cell as any).npcSlug = '';
        (cell as any).npcInstanceId = '';
        changed = true;
      }
    }

    if (changed) {
      (mapDoc as any).markModified('cells');
      await (mapDoc as any).save();
    }

    const distribution: { [key: number]: number } = {
      1: 20,
      5: 15,
      10: 15,
      15: 15,
      20: 10,
      25: 10,
      30: 5,
      35: 5,
    };

    const allNPCs = await NPCService.getAllNPCs();
    const npcsByLevel: { [key: number]: NPCDocument[] } = {};
    
    for (const npc of allNPCs) {
      const level = npc.userLevelAssociation;
      if (!npcsByLevel[level]) {
        npcsByLevel[level] = [];
      }
      
      if (typeof npc.mapRecoverySeconds !== 'number' || npc.mapRecoverySeconds <= 0) {
        const npcCollection = mongoose.connection.collection('npcs');
        await npcCollection.updateOne(
          { _id: npc._id },
          { $set: { mapRecoverySeconds: 300 } }
        );
        npc.mapRecoverySeconds = 300;
      }
      
      npcsByLevel[level].push(npc);
    }

    const pickValidCell = (): { x: number; y: number; index: number } | null => {
      let tries = 0;
      while (tries < 10000) {
        const idx = Math.floor(Math.random() * cells.length);
        const c = cells[idx];
        if (!c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain' && c.terrain !== 'road' && c.occupiedBy !== 'player') {
          return { x: c.x, y: c.y, index: idx };
        }
        tries++;
      }
      return null;
    };

    const levels = [1, 5, 10, 15, 20, 25, 30, 35];
    for (const level of levels) {
      let npcs = npcsByLevel[level] || [];
      if (npcs.length === 0) continue;

      const targetCount = distribution[level] || 5;
      const minCount = Math.max(5, targetCount);

      const shuffled = [...npcs].sort(() => Math.random() - 0.5);
      const npcsToPlace: NPCDocument[] = [];
      const npcTypesPlaced = new Set<string>();
      
      for (const npc of shuffled) {
        if (!npcTypesPlaced.has(npc.slug)) {
          npcsToPlace.push(npc);
          npcTypesPlaced.add(npc.slug);
        }
      }

      const remaining = Math.max(0, minCount - npcsToPlace.length);
      for (let i = 0; i < remaining; i++) {
        const randomNPC = shuffled[Math.floor(Math.random() * shuffled.length)];
        npcsToPlace.push(randomNPC);
      }

      for (const npc of npcsToPlace) {
        const validCell = pickValidCell();
        if (!validCell) break;
        const cell = cells[validCell.index];
        cell.isOccupied = true;
        cell.occupiedBy = 'npc';
        cell.entityName = npc.name || npc.title || 'NPC';
        (cell as any).npcSlug = npc.slug;
        (cell as any).npcInstanceId = `${npc.slug}-${validCell.x}-${validCell.y}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      }
    }

    (mapDoc as any).markModified('cells');
    await (mapDoc as any).save();
  }

  private addOpenSpaces(cells: any[]): void {
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.terrain === 'plain') {
        const r = this.rng();
        if (r < 0.5) {
          c.terrain = 'grass';
        } else if (r < 0.7) {
          c.terrain = 'dirt';
        }
      }
    }
  }

  /**
   * Updates entityName (display handle) for all map cells occupied by the given user.
   * Call this when a user changes their handle so the map shows the new name without
   * extra work on every map load. Uses indexed cells.userId for efficient update.
   * @param session - Optional MongoDB session for use in a transaction (ensures atomicity with user save).
   */
  async updatePlayerHandleInMapCells(
    userId: mongoose.Types.ObjectId,
    newHandle: string,
    session?: mongoose.mongo.ClientSession
  ): Promise<void> {
    const options: mongoose.mongo.UpdateOptions & { arrayFilters?: any[] } = {
      arrayFilters: [{ 'elem.userId': userId }],
    };
    if (session) options.session = session;
    await Map.updateMany(
      { 'cells.userId': userId },
      { $set: { 'cells.$[elem].entityName': newHandle } },
      options
    );
  }
} 