/**
 * Single abstraction over map cells: embedded (map.cells) vs mapcells collection.
 * When map.gridSize === 500 we use the MapCell collection; otherwise we use the map document's cells array.
 * Bugbot: Default when gridSize is missing must match route/migration (500) to avoid split-brain: cell access vs viewport/grid construction.
 */
import mongoose from 'mongoose';
import { Map as MapModel } from '../models/Map';
import { MapCell } from '../models/MapCell';

const GRID_SIZE_USES_MAPCELLS = 500;

/** Default gridSize when document has none; must match server/src/routes/map.ts (migration gridSizeVal and viewport gridSize). */
const DEFAULT_GRID_SIZE_WHEN_MISSING = 500;

export function usesMapCells(mapDoc: any): boolean {
  const gridSize = mapDoc?.gridSize ?? DEFAULT_GRID_SIZE_WHEN_MISSING;
  return gridSize === GRID_SIZE_USES_MAPCELLS;
}

export type Viewport = { x1: number; y1: number; x2: number; y2: number };

/** Get cells for a map, optionally restricted to viewport. For mapcells + no viewport, returns all (avoid for 500×500 in one request). */
export async function getCellsForMap(
  mapDoc: any,
  viewport?: Viewport
): Promise<any[]> {
  const mapId = mapDoc._id;
  if (!mapId) throw new Error('Map doc has no _id');

  if (usesMapCells(mapDoc)) {
    const filter: any = { mapId };
    if (viewport != null) {
      const minX = Math.min(viewport.x1, viewport.x2);
      const maxX = Math.max(viewport.x1, viewport.x2);
      const minY = Math.min(viewport.y1, viewport.y2);
      const maxY = Math.max(viewport.y1, viewport.y2);
      filter.x = { $gte: minX, $lte: maxX };
      filter.y = { $gte: minY, $lte: maxY };
    }
    const docs = await MapCell.find(filter).lean();
    return docs.map((d: any) => ({
      x: d.x,
      y: d.y,
      terrain: d.terrain,
      isActive: d.isActive,
      isOccupied: d.isOccupied,
      canBeOccupied: d.canBeOccupied,
      occupiedBy: d.occupiedBy,
      entityName: d.entityName,
      npcSlug: d.npcSlug,
      npcInstanceId: d.npcInstanceId,
      userId: d.userId,
    }));
  }

  const cells: any[] = Array.isArray(mapDoc.cells) ? [...mapDoc.cells] : [];
  if (viewport == null) return cells;
  const minX = Math.min(viewport.x1, viewport.x2);
  const maxX = Math.max(viewport.x1, viewport.x2);
  const minY = Math.min(viewport.y1, viewport.y2);
  const maxY = Math.max(viewport.y1, viewport.y2);
  return cells.filter(
    (c: any) =>
      c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY
  );
}

/** Get one cell by coordinates. */
export async function getCell(
  mapDoc: any,
  x: number,
  y: number
): Promise<any | null> {
  const mapId = mapDoc._id;
  if (!mapId) return null;

  if (usesMapCells(mapDoc)) {
    const doc = await MapCell.findOne({ mapId, x, y }).lean();
    if (!doc) return null;
    return {
      x: doc.x,
      y: doc.y,
      terrain: doc.terrain,
      isActive: doc.isActive,
      isOccupied: doc.isOccupied,
      canBeOccupied: doc.canBeOccupied,
      occupiedBy: doc.occupiedBy,
      entityName: doc.entityName,
      npcSlug: doc.npcSlug,
      npcInstanceId: doc.npcInstanceId,
      userId: doc.userId,
    };
  }

  const cells: any[] = mapDoc.cells || [];
  return cells.find((c: any) => c.x === x && c.y === y) ?? null;
}

/** Update one cell in mapcells (e.g. set npcInstanceId). No-op for embedded; caller mutates and saves map doc. */
export async function updateCell(
  mapId: mongoose.Types.ObjectId,
  x: number,
  y: number,
  update: Record<string, any>
): Promise<void> {
  await MapCell.updateOne(
    { mapId, x, y },
    { $set: update }
  );
}

/** Find a user's house (entityName !== 'YOU' preferred). */
export async function findHouseForUser(
  mapDoc: any,
  userId: mongoose.Types.ObjectId
): Promise<{ x: number; y: number } | null> {
  const idStr = String(userId);
  if (usesMapCells(mapDoc)) {
    let cell = await MapCell.findOne({
      mapId: mapDoc._id,
      userId,
      occupiedBy: 'player',
      entityName: { $ne: 'YOU' },
    })
      .lean()
      .select('x y');
    if (!cell) {
      cell = await MapCell.findOne({
        mapId: mapDoc._id,
        userId,
        occupiedBy: 'player',
      })
        .lean()
        .select('x y');
    }
    return cell ? { x: (cell as any).x, y: (cell as any).y } : null;
  }

  const cells: any[] = mapDoc.cells || [];
  let house = cells.find(
    (c: any) =>
      c.occupiedBy === 'player' &&
      c.userId &&
      String(c.userId) === idStr &&
      c.entityName !== 'YOU'
  );
  if (!house) {
    house = cells.find(
      (c: any) =>
        c.occupiedBy === 'player' && c.userId && String(c.userId) === idStr
    );
  }
  return house ? { x: house.x, y: house.y } : null;
}

/** Clear ephemeral YOU markers for a user (mapcells: updateMany; embedded: mutate and caller saves). Optional session for atomicity with setPlayerPosition (Bugbot: concurrent position updates). */
export async function clearYouMarkersForUser(
  mapDoc: any,
  userId: mongoose.Types.ObjectId,
  session?: mongoose.mongo.ClientSession
): Promise<void> {
  if (usesMapCells(mapDoc)) {
    await MapCell.updateMany(
      {
        mapId: mapDoc._id,
        occupiedBy: 'player',
        entityName: 'YOU',
        $or: [{ userId: null }, { userId }],
      },
      {
        $set: {
          isOccupied: false,
          occupiedBy: 'none',
          entityName: '',
          userId: null,
        },
      },
      session ? { session } : undefined
    );
    return;
  }

  const cells: any[] = (mapDoc as any).cells || [];
  for (const c of cells) {
    if (
      c.isOccupied &&
      c.occupiedBy === 'player' &&
      c.entityName === 'YOU' &&
      (c.userId == null || String(c.userId) === String(userId))
    ) {
      c.isOccupied = false;
      c.occupiedBy = 'none';
      c.entityName = '';
      c.userId = null;
    }
  }
}

/** Place a user's house on a random valid empty cell. Returns position or null if map full.
 * For 500×500 (mapcells): samples from entire map (no x,y bounds) so new users spread across 0..499.
 * Existing users are unaffected (findHouseForUser returns their house; placement only when none).
 * Bugbot: MapCells path uses a transaction so we atomically (1) clear any existing house for this user,
 * (2) pick a random empty cell, (3) updateOne only if cell still empty (guards against duplicate house + double-place). */
export async function placeUserHouse(
  mapDoc: any,
  userId: mongoose.Types.ObjectId,
  handle: string
): Promise<{ x: number; y: number } | null> {
  const mapId = mapDoc._id;
  const gridSize = mapDoc.gridSize ?? 50;
  if (!mapId) return null;

  if (usesMapCells(mapDoc)) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async (): Promise<{ x: number; y: number } | null> => {
        // (1) Atomic guard: ensure user has at most one house (clear any existing)
        await MapCell.updateMany(
          { mapId, userId, occupiedBy: 'player' },
          {
            $set: {
              isOccupied: false,
              occupiedBy: 'none',
              entityName: '',
              userId: null,
            },
          },
          { session }
        );
        const terrainFilter = { $nin: ['water', 'mountain', 'road'] as const };
        const emptyCellFilter = {
          mapId,
          isOccupied: false,
          canBeOccupied: true,
          terrain: terrainFilter,
        };
        const maxTries = 5;
        for (let tryCount = 0; tryCount < maxTries; tryCount++) {
          // (2) Sample one valid empty cell (within transaction; Bugbot: session must be passed so aggregate sees transaction context).
          const valid = await MapCell.aggregate([
            { $match: emptyCellFilter },
            { $sample: { size: 1 } },
            { $project: { x: 1, y: 1 } },
          ])
            .session(session)
            .exec();
          if (valid.length === 0) return null;
          const { x, y } = valid[0];
          // (3) Update only if cell still empty (atomic; prevents overwriting another placement)
          const res = await MapCell.updateOne(
            {
              mapId,
              x,
              y,
              isOccupied: false,
              canBeOccupied: true,
              terrain: terrainFilter,
            },
            {
              $set: {
                isOccupied: true,
                occupiedBy: 'player',
                entityName: handle,
                userId,
              },
            },
            { session }
          );
          if (res.modifiedCount === 1) return { x, y };
          // Cell was taken by a concurrent request; retry with new sample
        }
        return null;
      });
    } finally {
      await session.endSession();
    }
  }

  const cells: any[] = (mapDoc as any).cells || [];
  let tries = 0;
  while (tries < 500) {
    const candidateX = Math.floor(Math.random() * gridSize);
    const candidateY = Math.floor(Math.random() * gridSize);
    const updated = await MapModel.findOneAndUpdate(
      {
        _id: mapId,
        $and: [
          {
            cells: {
              $not: {
                $elemMatch: {
                  userId,
                  occupiedBy: 'player',
                  entityName: { $ne: 'YOU' },
                },
              },
            },
          },
          {
            cells: {
              $elemMatch: {
                x: candidateX,
                y: candidateY,
                isOccupied: false,
                canBeOccupied: true,
                terrain: { $nin: ['water', 'mountain', 'road'] },
              },
            },
          },
        ],
      },
      {
        $set: {
          'cells.$.isOccupied': true,
          'cells.$.occupiedBy': 'player',
          'cells.$.entityName': handle,
          'cells.$.userId': userId,
        },
      },
      { new: true }
    );
    if (updated) return { x: candidateX, y: candidateY };
    tries++;
  }
  return null;
}

/** Set a specific cell to player occupancy (e.g. POST player-position). Returns true if updated. Optional session for atomicity with clearYouMarkersForUser (Bugbot: concurrent position updates). */
export async function setPlayerPosition(
  mapDoc: any,
  x: number,
  y: number,
  userId: mongoose.Types.ObjectId,
  entityName: string,
  session?: mongoose.mongo.ClientSession
): Promise<boolean> {
  const mapId = mapDoc._id;
  if (!mapId) return false;

  if (usesMapCells(mapDoc)) {
    // Bugbot: Only update if cell still empty (same guard as placeUserHouse/placeNpcOnRandomCell; prevents overwriting concurrent placement).
    const res = await MapCell.updateOne(
      {
        mapId,
        x,
        y,
        isOccupied: false,
        canBeOccupied: true,
        terrain: { $nin: ['water', 'mountain', 'road'] },
      },
      {
        $set: {
          isOccupied: true,
          occupiedBy: 'player',
          entityName,
          userId,
        },
      },
      session ? { session } : undefined
    );
    return res.modifiedCount > 0;
  }

  const cells: any[] = (mapDoc as any).cells || [];
  const target = cells.find((c: any) => c.x === x && c.y === y);
  if (!target) return false;
  target.isOccupied = true;
  target.occupiedBy = 'player';
  target.entityName = entityName;
  target.userId = userId;
  return true;
}

/** Clear all NPC occupancy from a map. */
export async function clearNpcsFromMap(mapDoc: any): Promise<void> {
  if (!usesMapCells(mapDoc)) return;
  await MapCell.updateMany(
    { mapId: mapDoc._id, occupiedBy: 'npc' },
    {
      $set: {
        isOccupied: false,
        occupiedBy: 'none',
        entityName: '',
        npcSlug: '',
        npcInstanceId: '',
      },
    }
  );
}

/** Clear one NPC type (by slug) from map. */
export async function clearNpcBySlugFromMap(mapDoc: any, npcSlug: string): Promise<void> {
  if (!usesMapCells(mapDoc)) return;
  await MapCell.updateMany(
    { mapId: mapDoc._id, occupiedBy: 'npc', npcSlug },
    {
      $set: {
        isOccupied: false,
        occupiedBy: 'none',
        entityName: '',
        npcSlug: '',
        npcInstanceId: '',
      },
    }
  );
}

/** Clear one NPC instance from map. */
export async function clearNpcInstanceFromMapCell(mapDoc: any, npcInstanceId: string): Promise<void> {
  if (!usesMapCells(mapDoc)) return;
  await MapCell.updateOne(
    { mapId: mapDoc._id, npcInstanceId },
    {
      $set: {
        isOccupied: false,
        occupiedBy: 'none',
        entityName: '',
        npcSlug: '',
        npcInstanceId: '',
      },
    }
  );
}

/** Terrain types that are not placeable for NPCs or player houses. */
const IMPASSABLE_TERRAIN = ['water', 'mountain', 'road'] as const;

/** Max placement attempts when sample+update races with another writer (Bugbot: avoid respawn silently lost). */
const NPC_PLACEMENT_MAX_ATTEMPTS = 5;

/**
 * Place one NPC on a random valid empty cell. Returns true if placed.
 * For mapcells (500×500): samples from the full map (no x,y bounds), so placement and respawn
 * are uniformly random across 0..499×0..499. Never places on water, mountain, or road.
 * Bugbot: updateOne filter includes isOccupied: false (and canBeOccupied, terrain) so we never
 * overwrite player houses or already-occupied cells; retry up to NPC_PLACEMENT_MAX_ATTEMPTS on
 * modifiedCount 0 so respawn/updateNPCsOnMap don't silently lose NPCs.
 */
export async function placeNpcOnRandomCell(
  mapDoc: any,
  npcSlug: string,
  npcInstanceId: string,
  entityName: string
): Promise<boolean> {
  const mapId = mapDoc._id;
  if (!mapId) return false;

  if (usesMapCells(mapDoc)) {
    const emptyCellFilter = {
      mapId,
      isOccupied: false,
      canBeOccupied: true,
      terrain: { $nin: [...IMPASSABLE_TERRAIN] } as any,
    };
    for (let attempt = 0; attempt < NPC_PLACEMENT_MAX_ATTEMPTS; attempt++) {
      const valid = await MapCell.aggregate([
        { $match: emptyCellFilter },
        { $sample: { size: 1 } },
        { $project: { x: 1, y: 1 } },
      ]);
      if (valid.length === 0) return false;
      const { x, y } = valid[0];
      const res = await MapCell.updateOne(
        {
          mapId,
          x,
          y,
          isOccupied: false,
          canBeOccupied: true,
          terrain: { $nin: IMPASSABLE_TERRAIN },
        },
        {
          $set: {
            isOccupied: true,
            occupiedBy: 'npc',
            entityName,
            npcSlug,
            npcInstanceId,
          },
        }
      );
      if (res.modifiedCount === 1) return true;
    }
    return false;
  }
  return false;
}

/** Find cell by NPC instance id and slug (for battle setup validation). */
export async function findCellByNpcInstanceId(
  mapDoc: any,
  npcInstanceId: string,
  npcSlug: string
): Promise<{ x: number; y: number } | null> {
  if (usesMapCells(mapDoc)) {
    const doc = await MapCell.findOne({
      mapId: mapDoc._id,
      npcInstanceId,
      npcSlug,
      isOccupied: true,
      occupiedBy: 'npc',
    })
      .lean()
      .select('x y');
    return doc ? { x: (doc as any).x, y: (doc as any).y } : null;
  }
  const cells: any[] = (mapDoc as any).cells || [];
  const c = cells.find(
    (cell: any) =>
      cell.npcInstanceId === npcInstanceId &&
      cell.npcSlug === npcSlug &&
      cell.isOccupied &&
      cell.occupiedBy === 'npc'
  );
  return c ? { x: c.x, y: c.y } : null;
}

/** Clear all map cells occupied by this user (MapCell collection only). Returns count updated. */
export async function clearUserFromMapCells(
  userId: mongoose.Types.ObjectId
): Promise<number> {
  const res = await MapCell.updateMany(
    { userId },
    {
      $set: {
        isOccupied: false,
        occupiedBy: 'none',
        entityName: '',
        userId: null,
      },
    }
  );
  return res.modifiedCount;
}
