import { Map } from '../models/Map';
import seedrandom from 'seedrandom';

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
    this.addHouses(cells);

    // Create and save the map
    const map = new Map({
      name,
      gridSize: this.GRID_SIZE,
      cells,
      version: 2
    });

    return map.save();
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

  private addHouses(cells: any[]): void {
    // Place exactly 6 houses total: 1 player, 5 NPC
    const pickValidCellIndex = (): number => {
      let tries = 0;
      while (tries < 10000) {
        const idx = this.randomInt(0, cells.length - 1);
        const c = cells[idx];
        if (!c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain') {
          return idx;
        }
        tries++;
      }
      return -1;
    };

    // Player house at a fixed coordinate that's not (0,0) and valid; search outward if blocked
    const desired = { x: 8, y: 11 };
    const indexFor = (x: number, y: number) => y * this.GRID_SIZE + x;
    const isValid = (c: any) => !c.isOccupied && c.canBeOccupied && c.terrain !== 'water' && c.terrain !== 'mountain';
    let px = desired.x;
    let py = desired.y;
    if (!isValid(cells[indexFor(px, py)])) {
      let found = false;
      for (let radius = 1; radius < Math.max(this.GRID_SIZE, this.GRID_SIZE) && !found; radius++) {
        for (let dy = -radius; dy <= radius && !found; dy++) {
          for (let dx = -radius; dx <= radius && !found; dx++) {
            const nx = Math.min(Math.max(px + dx, 0), this.GRID_SIZE - 1);
            const ny = Math.min(Math.max(py + dy, 0), this.GRID_SIZE - 1);
            const c = cells[indexFor(nx, ny)];
            if (isValid(c)) {
              px = nx; py = ny; found = true;
            }
          }
        }
      }
    }
    const playerCell = cells[indexFor(px, py)];
    playerCell.isOccupied = true;
    playerCell.occupiedBy = 'player';
    playerCell.entityName = 'YOU';

    // Five NPC houses
    let placed = 0;
    while (placed < 5) {
      const idx = pickValidCellIndex();
      if (idx === -1) break;
      const cell = cells[idx];
      if ((cell.x === px && cell.y === py)) continue;
      cell.isOccupied = true;
      cell.occupiedBy = 'npc';
      cell.entityName = `COMP${placed + 1}`;
      placed++;
    }
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
} 