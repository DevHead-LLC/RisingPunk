import { Map } from '../models/Map';
import seedrandom from 'seedrandom';

export class MapService {
  private rng: seedrandom.PRNG;
  private readonly GRID_SIZE = 25;

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

    // Add entities
    this.addEntities(cells);

    // Debug log before saving
    const entitiesBeforeSave = cells.filter(cell => cell.isOccupied);
    console.log('Entities before save:', entitiesBeforeSave.length);
    console.log('Sample entity before save:', entitiesBeforeSave[0]);

    // Create and save the map
    const map = new Map({
      name,
      gridSize: this.GRID_SIZE,
      cells,
      version: 1
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

  private addEntities(cells: any[]): void {
    // Add player at 0,0
    const startCell = cells[0];
    startCell.isOccupied = true;
    startCell.occupiedBy = 'player';
    startCell.entityName = 'YOU';

    // Add other entities
    const addEntities = (type: 'player' | 'npc', count: number) => {
      let placed = 0;
      while (placed < count) {
        const idx = this.randomInt(0, cells.length - 1);
        const cell = cells[idx];
        
        if (cell.isOccupied || cell.x === 0 && cell.y === 0 || !cell.canBeOccupied) {
          continue;
        }

        cell.isOccupied = true;
        cell.occupiedBy = type;
        cell.entityName = type === 'player' ? 
          `Player${placed + 1}` : `NPC${placed + 1}`;
        placed++;
      }
    };

    // Add 8 friendly entities and 4 NPCs
    addEntities('player', 8);
    addEntities('npc', 4);
  }
} 