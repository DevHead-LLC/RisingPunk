import express, { Request, Response, Router } from 'express';
import auth from '../middleware/auth';
import { MapService } from '../services/MapService';
import { Map } from '../models/Map';

const router: Router = express.Router();
const mapService = new MapService();

router.get('/:name', async (req: Request, res: Response) => {
  try {
    const name = req.params.name;
    let mapDoc = await Map.findOne({ name });
    if (!mapDoc) {
      const created = await mapService.generateMap(name);
      mapDoc = (created as any) || await Map.findOne({ name });
    }

    if (!mapDoc) {
      res.status(500).json({ error: 'Failed to load map' });
      return;
    }

    // Migrate old maps: enforce version >=2 and gridSize 50, friendly cleanup, and placement rules
    const docAny = mapDoc as any;
    if (!docAny.version || docAny.version < 2 || docAny.gridSize !== 50) {
      await Map.deleteOne({ _id: docAny._id });
      const recreated = await mapService.generateMap(name);
      mapDoc = (recreated as any) || await Map.findOne({ name });
      if (!mapDoc) {
        res.status(500).json({ error: 'Failed to build map' });
        return;
      }
    } else {
      // Validate map and, if invalid, rebuild deterministically via MapService to avoid randomness
      const cells: any[] = (mapDoc as any).cells;
      const isBlocked = (c: any) => c.terrain === 'water' || c.terrain === 'mountain';
      const playerYou = cells.filter(c => c.isOccupied && c.occupiedBy === 'player' && c.entityName === 'YOU');
      const npcHouses = cells.filter(c => c.isOccupied && c.occupiedBy === 'npc');
      const blockedHouse = cells.some(c => c.isOccupied && isBlocked(c));
      // Allow dynamic NPC counts (defeat/respawn). Only enforce player house presence.
      const invalidCounts = playerYou.length !== 1;

      if (blockedHouse || invalidCounts) {
        await Map.deleteOne({ _id: (mapDoc as any)._id });
        const recreated = await mapService.generateMap(name);
        mapDoc = (recreated as any) || await Map.findOne({ name });
        if (!mapDoc) {
          res.status(500).json({ error: 'Failed to build map' });
          return;
        }
      }
    }

    const gridSize = (mapDoc as any).gridSize || 50;
    const emptyGrid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ({ terrain: 'plain', entity: 'empty' }))
    );

    for (const c of (mapDoc as any).cells as any[]) {
      const y = c.y;
      const x = c.x;
      const entity = c.isOccupied ? 'house' : 'empty';
      const owner = c.isOccupied ? (c.occupiedBy === 'player' ? 'player' : 'enemy') : undefined;
      const name = c.entityName || undefined;
      const npcSlug = c.occupiedBy === 'npc' ? (c.npcSlug || undefined) : undefined;
      emptyGrid[y][x] = {
        terrain: c.terrain,
        entity,
        owner,
        name,
        npcSlug,
      } as any;
    }

    res.json({ grid: emptyGrid });
  } catch (error: any) {
    console.error('Map fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/player-position', auth, async (req: Request, res: Response) => {
  try {
    const { x, y } = req.body as { x: number; y: number };
    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }

    let mapDoc = await Map.findOne({ name: 'main' });
    if (!mapDoc) {
      const created = await mapService.generateMap('main');
      mapDoc = await Map.findOne({ name: 'main' });
      if (!mapDoc && created) {
        mapDoc = created as any;
      }
    }

    if (!mapDoc) {
      res.status(500).json({ error: 'Failed to load map' });
      return;
    }

    // Clear previous player position
    for (const c of (mapDoc as any).cells as any[]) {
      if (c.entityName === 'YOU') {
        c.isOccupied = false;
        c.occupiedBy = 'none';
        c.entityName = '';
      }
    }

    const target = (mapDoc.cells as any[]).find((c) => c.x === x && c.y === y);
    if (!target) {
      res.status(404).json({ error: 'Target cell not found' });
      return;
    }
    if (!target.canBeOccupied || target.terrain === 'mountain' || target.terrain === 'water') {
      res.status(400).json({ error: 'Cell cannot be occupied' });
      return;
    }
    if (target.isOccupied) {
      res.status(400).json({ error: 'Cell already occupied' });
      return;
    }

    target.isOccupied = true;
    target.occupiedBy = 'player';
    target.entityName = 'YOU';

    await mapDoc.save();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Player position update error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


