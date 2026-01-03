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

function getCellAt(cellMap: Map<string, Cell>, x: number, y: number, gridSize: number): Cell | null {
  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
    return null;
  }
  return cellMap.get(`${x},${y}`) || null;
}

function getNeighbors(x: number, y: number): { x: number; y: number }[] {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
}

function isNearTerrain(
  x: number,
  y: number,
  cellMap: Map<string, Cell>,
  gridSize: number,
  terrainTypes: TerrainType[],
  radius: number = 3
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) {
        continue;
      }
      const cell = getCellAt(cellMap, nx, ny, gridSize);
      if (cell && terrainTypes.includes(cell.terrain)) {
        return true;
      }
    }
  }
  return false;
}

function createForestCluster(
  startX: number,
  startY: number,
  targetSize: number,
  cellMap: Map<string, Cell>,
  gridSize: number,
  existingForests: Set<string>
): Set<string> {
  const cluster = new Set<string>();
  const queue: { x: number; y: number }[] = [];
  const processed = new Set<string>();
  
  const canPlaceForest = (x: number, y: number): boolean => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
      return false;
    }
    const key = `${x},${y}`;
    if (existingForests.has(key) || cluster.has(key)) {
      return false;
    }
    const cell = getCellAt(cellMap, x, y, gridSize);
    if (!cell) return false;
    
    if (cell.terrain === 'water' || cell.terrain === 'road' || cell.terrain === 'mountain' || cell.terrain === 'forest') {
      return false;
    }
    
    return true;
  };
  
  const startCell = getCellAt(cellMap, startX, startY, gridSize);
  if (!startCell) {
    return cluster;
  }
  
  if (canPlaceForest(startX, startY)) {
    queue.push({ x: startX, y: startY });
  } else {
    return cluster;
  }
  
  while (queue.length > 0 && cluster.size < targetSize) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    
    if (processed.has(key)) continue;
    processed.add(key);
    
    if (!canPlaceForest(current.x, current.y)) continue;
    
    cluster.add(key);
    
    if (cluster.size >= targetSize) break;
    
    const neighbors = getNeighbors(current.x, current.y);
    const shuffledNeighbors = [...neighbors].sort(() => Math.random() - 0.5);
    
    for (const neighbor of shuffledNeighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (!processed.has(neighborKey) && canPlaceForest(neighbor.x, neighbor.y)) {
        queue.push(neighbor);
      }
    }
  }
  
  return cluster;
}

async function replaceForests() {
  try {
    console.log('🔄 Starting forest replacement...\n');

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    const dbName = getDatabaseName();
    if (dbName !== 'RisingPunkProd') {
      console.error('❌ This script should only be run in production environment');
      console.error(`   Current database: ${dbName}`);
      console.error('   Set NODE_ENV=production to run this script');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: dbName,
      appName: 'replaceForests-script'
    });

    console.log('✅ Connected to database:', dbName);

    const maps = await MapModel.find({}).lean() as unknown as MapDoc[];
    console.log(`📊 Found ${maps.length} map(s) to process\n`);

    for (const map of maps) {
      console.log(`🗺️  Processing map: ${map.name}`);

      const cellMap = new Map<string, Cell>();
      for (const cell of map.cells) {
        cellMap.set(`${cell.x},${cell.y}`, cell);
      }

      const waterCells = new Set<string>();
      const roadCells = new Set<string>();
      const mountainCells = new Set<string>();
      
      for (const cell of map.cells) {
        if (cell.terrain === 'water') {
          waterCells.add(`${cell.x},${cell.y}`);
        }
        if (cell.terrain === 'road') {
          roadCells.add(`${cell.x},${cell.y}`);
        }
        if (cell.terrain === 'mountain') {
          mountainCells.add(`${cell.x},${cell.y}`);
        }
      }

      console.log('   Step 1: Replacing existing forest tiles...');
      let forestsReplaced = 0;
      let grassCreated = 0;
      let dirtCreated = 0;
      
      for (const cell of map.cells) {
        if (cell.terrain === 'forest') {
          const newTerrain = Math.random() < 0.15 ? 'dirt' : 'grass';
          await MapModel.updateOne(
            { _id: map._id, cells: { $elemMatch: { x: cell.x, y: cell.y } } },
            { $set: { 'cells.$.terrain': newTerrain } }
          );
          cell.terrain = newTerrain;
          const cellKey = `${cell.x},${cell.y}`;
          const cellInMap = cellMap.get(cellKey);
          if (cellInMap) {
            cellInMap.terrain = newTerrain;
          }
          forestsReplaced++;
          if (newTerrain === 'dirt') {
            dirtCreated++;
          } else {
            grassCreated++;
          }
        }
      }
      console.log(`   ✅ Replaced ${forestsReplaced} forest tiles (${grassCreated} grass, ${dirtCreated} dirt)`);

      console.log('   Step 2: Creating 5 new forest clusters...');
      
      const grassTiles: { x: number; y: number }[] = [];
      for (let x = 0; x < map.gridSize; x++) {
        for (let y = 0; y < map.gridSize; y++) {
          const cell = getCellAt(cellMap, x, y, map.gridSize);
          if (!cell) continue;
          if (cell.terrain === 'grass') {
            grassTiles.push({ x, y });
          }
        }
      }
      
      console.log(`   Found ${grassTiles.length} grass tiles as potential starting points`);
      
      const shuffledGrass = [...grassTiles].sort(() => Math.random() - 0.5);
      const clustersCreated: Set<string>[] = [];
      const allForestCells = new Set<string>();
      let attempts = 0;
      const maxAttempts = 100;
      
      while (clustersCreated.length < 5 && attempts < maxAttempts && shuffledGrass.length > 0) {
        const startPos = shuffledGrass[attempts % shuffledGrass.length];
        const targetSize = Math.floor(Math.random() * 31) + 30;
        
        const startCell = getCellAt(cellMap, startPos.x, startPos.y, map.gridSize);
        if (!startCell || startCell.terrain !== 'grass') {
          console.log(`      Skipped: starting position (${startPos.x}, ${startPos.y}) is ${startCell?.terrain || 'invalid'}`);
          attempts++;
          continue;
        }
        
        const cluster = createForestCluster(
          startPos.x,
          startPos.y,
          targetSize,
          cellMap,
          map.gridSize,
          allForestCells
        );
        
        if (cluster.size >= 30) {
          clustersCreated.push(cluster);
          for (const cellKey of cluster) {
            allForestCells.add(cellKey);
          }
          console.log(`      Created cluster ${clustersCreated.length}: ${cluster.size} tiles starting at (${startPos.x}, ${startPos.y})`);
        } else {
          console.log(`      Cluster too small: ${cluster.size} tiles (target: ${targetSize}) at (${startPos.x}, ${startPos.y})`);
        }
        attempts++;
      }
      
      let forestsPlaced = 0;
      for (const cellKey of allForestCells) {
        const [x, y] = cellKey.split(',').map(Number);
        const cell = getCellAt(cellMap, x, y, map.gridSize);
        if (cell) {
          await MapModel.updateOne(
            { _id: map._id, cells: { $elemMatch: { x, y } } },
            { $set: { 'cells.$.terrain': 'forest' } }
          );
          cell.terrain = 'forest';
          const cellInMap = cellMap.get(cellKey);
          if (cellInMap) {
            cellInMap.terrain = 'forest';
          }
          forestsPlaced++;
        }
      }
      
      console.log(`   ✅ Created ${clustersCreated.length} forest clusters with ${forestsPlaced} total forest tiles`);
      for (let i = 0; i < clustersCreated.length; i++) {
        console.log(`      Cluster ${i + 1}: ${clustersCreated[i].size} tiles`);
      }

      const terrainBreakdown: Record<string, number> = {};
      for (const cell of map.cells) {
        terrainBreakdown[cell.terrain] = (terrainBreakdown[cell.terrain] || 0) + 1;
      }
      console.log('\n   Final terrain breakdown:');
      for (const [terrain, count] of Object.entries(terrainBreakdown)) {
        console.log(`     - ${terrain}: ${count}`);
      }
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error replacing forests:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  replaceForests();
}

