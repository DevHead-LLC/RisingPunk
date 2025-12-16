#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import dotenvFlow from 'dotenv-flow';
import { Map as MapModel } from '../src/models/Map';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFileMap: Record<string, string> = {
  'development': 'dev',
  'production': 'prod'
};
const mappedNodeEnv = envFileMap[nodeEnv] || nodeEnv;

dotenvFlow.config({ 
  node_env: mappedNodeEnv,
  silent: true 
});

if (process.env.NODE_ENV !== nodeEnv) {
  process.env.NODE_ENV = nodeEnv;
}

const getDatabaseName = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  switch (nodeEnv) {
    case 'production':
      return 'RisingPunkProd';
    case 'staging':
    case 'development':
    default:
      return 'RisingPunk';
  }
};

type TerrainType = 'plain' | 'mountain' | 'water' | 'forest' | 'road' | 'grass' | 'dirt';

interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  isActive: boolean;
  isOccupied: boolean;
  canBeOccupied: boolean;
  occupiedBy: string;
  entityName: string;
  npcSlug: string;
  npcInstanceId: string;
  userId: mongoose.Types.ObjectId | null;
}

interface MapDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  gridSize: number;
  cells: Cell[];
  version: number;
  lastUpdated: Date;
}

function getNeighborCoords(x: number, y: number): { x: number; y: number }[] {
  return [
    { x: x - 1, y: y - 1 }, { x, y: y - 1 }, { x: x + 1, y: y - 1 },
    { x: x - 1, y },                         { x: x + 1, y },
    { x: x - 1, y: y + 1 }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }
  ];
}

function getMostCommonNeighborTerrain(cell: Cell, cellMap: Map<string, Cell>): TerrainType {
  const neighborCoords = getNeighborCoords(cell.x, cell.y);
  const terrainCounts: Record<string, number> = {};

  for (const coord of neighborCoords) {
    const key = `${coord.x},${coord.y}`;
    const neighbor = cellMap.get(key);
    if (neighbor && neighbor.terrain !== 'plain') {
      terrainCounts[neighbor.terrain] = (terrainCounts[neighbor.terrain] || 0) + 1;
    }
  }

  const entries = Object.entries(terrainCounts);
  if (entries.length === 0) {
    return 'grass';
  }

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as TerrainType;
}

async function replacePlainTiles() {
  try {
    console.log('🔄 Starting plain tile replacement...\n');

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: getDatabaseName(),
      appName: 'replacePlainTiles-script'
    });

    console.log('✅ Connected to database:', getDatabaseName());

    const maps = await MapModel.find({}).lean() as unknown as MapDoc[];
    console.log(`📊 Found ${maps.length} map(s) to process\n`);

    let totalPlainTiles = 0;
    let totalReplaced = 0;

    for (const map of maps) {
      console.log(`🗺️  Processing map: ${map.name}`);

      const cellMap = new Map<string, Cell>();
      for (const cell of map.cells) {
        cellMap.set(`${cell.x},${cell.y}`, cell);
      }

      const plainCells = map.cells.filter(c => c.terrain === 'plain');
      console.log(`   Found ${plainCells.length} plain tiles`);
      totalPlainTiles += plainCells.length;

      if (plainCells.length === 0) {
        console.log('   No plain tiles to replace\n');
        continue;
      }

      const updates: { x: number; y: number; newTerrain: TerrainType }[] = [];

      for (const cell of plainCells) {
        const newTerrain = getMostCommonNeighborTerrain(cell, cellMap);
        updates.push({ x: cell.x, y: cell.y, newTerrain });
      }

      for (const update of updates) {
        await MapModel.updateOne(
          { _id: map._id, cells: { $elemMatch: { x: update.x, y: update.y } } },
          { $set: { 'cells.$.terrain': update.newTerrain } }
        );
      }

      totalReplaced += updates.length;
      console.log(`   ✅ Replaced ${updates.length} plain tiles\n`);

      const terrainBreakdown: Record<string, number> = {};
      for (const u of updates) {
        terrainBreakdown[u.newTerrain] = (terrainBreakdown[u.newTerrain] || 0) + 1;
      }
      console.log('   Replacement breakdown:');
      for (const [terrain, count] of Object.entries(terrainBreakdown)) {
        console.log(`     - ${terrain}: ${count}`);
      }
      console.log('');
    }

    console.log('📊 Summary:');
    console.log(`   Total plain tiles found: ${totalPlainTiles}`);
    console.log(`   Total tiles replaced: ${totalReplaced}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error replacing plain tiles:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  replacePlainTiles();
}

