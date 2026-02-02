#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';
import type { Cell, MapDoc, TerrainType } from './scriptMapTypes';
import { Map as MapModel } from '../src/models/Map';

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

function createMountainCluster(
  startX: number,
  startY: number,
  targetSize: number,
  cellMap: Map<string, Cell>,
  gridSize: number,
  existingMountains: Set<string>
): Set<string> {
  const cluster = new Set<string>();
  const queue: { x: number; y: number }[] = [];
  const processed = new Set<string>();
  
  const canPlaceMountain = (x: number, y: number): boolean => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
      return false;
    }
    const key = `${x},${y}`;
    if (existingMountains.has(key) || cluster.has(key)) {
      return false;
    }
    const cell = getCellAt(cellMap, x, y, gridSize);
    if (!cell) return false;
    
    if (cell.terrain === 'water' || cell.terrain === 'road' || cell.terrain === 'mountain' || cell.terrain === 'forest') {
      return false;
    }
    
    if (cell.isOccupied) {
      return false;
    }
    
    return true;
  };
  
  const startCell = getCellAt(cellMap, startX, startY, gridSize);
  if (!startCell) {
    return cluster;
  }
  
  if (canPlaceMountain(startX, startY)) {
    queue.push({ x: startX, y: startY });
  } else {
    return cluster;
  }
  
  while (queue.length > 0 && cluster.size < targetSize) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    
    if (processed.has(key)) continue;
    processed.add(key);
    
    if (!canPlaceMountain(current.x, current.y)) continue;
    
    cluster.add(key);
    
    if (cluster.size >= targetSize) break;
    
    const neighbors = getNeighbors(current.x, current.y);
    const shuffledNeighbors = [...neighbors].sort(() => Math.random() - 0.5);
    
    for (const neighbor of shuffledNeighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (!processed.has(neighborKey) && canPlaceMountain(neighbor.x, neighbor.y)) {
        queue.push(neighbor);
      }
    }
  }
  
  return cluster;
}

async function replaceMountains() {
  try {
    console.log('🔄 Starting mountain replacement...\n');

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
      appName: 'replaceMountains-script'
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

      console.log('   Step 1: Replacing existing mountain tiles...');
      let mountainsReplaced = 0;
      let grassCreated = 0;
      let dirtCreated = 0;
      
      for (const cell of map.cells) {
        if (cell.terrain === 'mountain') {
          const newTerrain = Math.random() < 0.15 ? 'dirt' : 'grass';
          await MapModel.updateOne(
            { _id: map._id, cells: { $elemMatch: { x: cell.x, y: cell.y } } },
            { $set: { 'cells.$.terrain': newTerrain, 'cells.$.canBeOccupied': true } }
          );
          cell.terrain = newTerrain;
          cell.canBeOccupied = true;
          const cellKey = `${cell.x},${cell.y}`;
          const cellInMap = cellMap.get(cellKey);
          if (cellInMap) {
            cellInMap.terrain = newTerrain;
            cellInMap.canBeOccupied = true;
          }
          mountainsReplaced++;
          if (newTerrain === 'dirt') {
            dirtCreated++;
          } else {
            grassCreated++;
          }
        }
      }
      console.log(`   ✅ Replaced ${mountainsReplaced} mountain tiles (${grassCreated} grass, ${dirtCreated} dirt)`);

      console.log('   Step 2: Creating 5 new mountain clusters...');
      
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
      const allMountainCells = new Set<string>();
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
        
        const cluster = createMountainCluster(
          startPos.x,
          startPos.y,
          targetSize,
          cellMap,
          map.gridSize,
          allMountainCells
        );
        
        if (cluster.size >= 30) {
          clustersCreated.push(cluster);
          for (const cellKey of cluster) {
            allMountainCells.add(cellKey);
          }
          console.log(`      Created cluster ${clustersCreated.length}: ${cluster.size} tiles starting at (${startPos.x}, ${startPos.y})`);
        } else {
          console.log(`      Cluster too small: ${cluster.size} tiles (target: ${targetSize}) at (${startPos.x}, ${startPos.y})`);
        }
        attempts++;
      }
      
      let mountainsPlaced = 0;
      for (const cellKey of allMountainCells) {
        const [x, y] = cellKey.split(',').map(Number);
        const cell = getCellAt(cellMap, x, y, map.gridSize);
        if (cell) {
          const updateFields: any = { 'cells.$.terrain': 'mountain', 'cells.$.canBeOccupied': false };
          await MapModel.updateOne(
            { _id: map._id, cells: { $elemMatch: { x, y } } },
            { $set: updateFields }
          );
          cell.terrain = 'mountain';
          cell.canBeOccupied = false;
          const cellInMap = cellMap.get(cellKey);
          if (cellInMap) {
            cellInMap.terrain = 'mountain';
            cellInMap.canBeOccupied = false;
          }
          mountainsPlaced++;
        }
      }
      
      console.log(`   ✅ Created ${clustersCreated.length} mountain clusters with ${mountainsPlaced} total mountain tiles`);
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
    console.error('❌ Error replacing mountains:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  replaceMountains();
}

