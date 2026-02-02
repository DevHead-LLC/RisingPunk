#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';
import type { Cell, MapDoc, TerrainType } from './scriptMapTypes';
import { getCellAt, getNeighbors } from './scriptMapTypes';
import { Map as MapModel } from '../src/models/Map';

type Direction = 'north' | 'south' | 'east' | 'west';

function isOnEdge(x: number, y: number, gridSize: number): boolean {
  return x === 0 || x === gridSize - 1 || y === 0 || y === gridSize - 1;
}

function getOppositeEdge(startX: number, startY: number, gridSize: number): { x: number; y: number } {
  if (startX === 0) return { x: gridSize - 1, y: startY };
  if (startX === gridSize - 1) return { x: 0, y: startY };
  if (startY === 0) return { x: startX, y: gridSize - 1 };
  if (startY === gridSize - 1) return { x: startX, y: 0 };
  return { x: startX, y: startY };
}

function findClusters(
  cellMap: Map<string, Cell>,
  gridSize: number,
  terrainType: 'water' | 'road'
): Set<string>[] {
  const clusters: Set<string>[] = [];
  const visited = new Set<string>();

  for (const cell of cellMap.values()) {
    if (cell.terrain !== terrainType) continue;
    
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key)) continue;
    
    const cluster = new Set<string>();
    const queue: { x: number; y: number }[] = [{ x: cell.x, y: cell.y }];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = `${current.x},${current.y}`;
      
      if (visited.has(currentKey)) continue;
      visited.add(currentKey);
      
      const currentCell = getCellAt(cellMap, current.x, current.y, gridSize);
      if (!currentCell || currentCell.terrain !== terrainType) continue;
      
      cluster.add(currentKey);
      
      for (const neighbor of getNeighbors(current.x, current.y)) {
        if (neighbor.x < 0 || neighbor.x >= gridSize || neighbor.y < 0 || neighbor.y >= gridSize) {
          continue;
        }
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (visited.has(neighborKey)) continue;
        
        const neighborCell = getCellAt(cellMap, neighbor.x, neighbor.y, gridSize);
        if (neighborCell && neighborCell.terrain === terrainType) {
          queue.push(neighbor);
        }
      }
    }
    
    if (cluster.size > 0) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

function findClosestEdgePoint(
  cluster: Set<string>,
  gridSize: number
): { x: number; y: number } | null {
  let closest: { x: number; y: number; dist: number } | null = null;
  
  for (const key of cluster) {
    const [x, y] = key.split(',').map(Number);
    const distToTop = y;
    const distToBottom = gridSize - 1 - y;
    const distToLeft = x;
    const distToRight = gridSize - 1 - x;
    
    const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);
    
    if (!closest || minDist < closest.dist) {
      let edgePoint: { x: number; y: number };
      if (minDist === distToTop) {
        edgePoint = { x, y: 0 };
      } else if (minDist === distToBottom) {
        edgePoint = { x, y: gridSize - 1 };
      } else if (minDist === distToLeft) {
        edgePoint = { x: 0, y };
      } else {
        edgePoint = { x: gridSize - 1, y };
      }
      closest = { ...edgePoint, dist: minDist };
    }
  }
  
  return closest ? { x: closest.x, y: closest.y } : null;
}

function createRiverPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cellMap: Map<string, Cell>,
  gridSize: number,
  occupiedCells: Set<string>
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let currentX = startX;
  let currentY = startY;
  const visited = new Set<string>();
  let lastDirection: { dx: number; dy: number } | null = null;
  let stepsInSameDirection = 0;
  let hasMovedNorthSouth = false;
  let hasMovedEastWest = false;
  
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };
  
  const isOnTargetEdge = (x: number, y: number, targetX: number, targetY: number) => {
    if (targetX === 0) return x === 0;
    if (targetX === gridSize - 1) return x === gridSize - 1;
    if (targetY === 0) return y === 0;
    if (targetY === gridSize - 1) return y === gridSize - 1;
    return false;
  };
  
  while (!isOnTargetEdge(currentX, currentY, endX, endY)) {
    const key = `${currentX},${currentY}`;
    if (visited.has(key)) {
      break;
    }
    visited.add(key);
    path.push({ x: currentX, y: currentY });
    
    const currentDist = getDistance(currentX, currentY, endX, endY);
    const candidates: { x: number; y: number; dist: number; dx: number; dy: number }[] = [];
    
    const directions = [
      { x: currentX + 1, y: currentY, dx: 1, dy: 0 },
      { x: currentX - 1, y: currentY, dx: -1, dy: 0 },
      { x: currentX, y: currentY + 1, dx: 0, dy: 1 },
      { x: currentX, y: currentY - 1, dx: 0, dy: -1 }
    ];
    
    for (const dir of directions) {
      if (dir.x < 0 || dir.x >= gridSize || dir.y < 0 || dir.y >= gridSize) {
        continue;
      }
      const dirKey = `${dir.x},${dir.y}`;
      if (visited.has(dirKey) || occupiedCells.has(dirKey)) {
        continue;
      }
      const cell = getCellAt(cellMap, dir.x, dir.y, gridSize);
      if (cell && (cell.terrain === 'water' || cell.terrain === 'mountain')) {
        continue;
      }
      const dist = getDistance(dir.x, dir.y, endX, endY);
      if (dist <= currentDist) {
        candidates.push({ x: dir.x, y: dir.y, dist, dx: dir.dx, dy: dir.dy });
      }
    }
    
    if (candidates.length === 0) {
      const validDirs = directions.filter(dir => {
        if (dir.x < 0 || dir.x >= gridSize || dir.y < 0 || dir.y >= gridSize) {
          return false;
        }
        const dirKey = `${dir.x},${dir.y}`;
        if (visited.has(dirKey) || occupiedCells.has(dirKey)) {
          return false;
        }
        const cell = getCellAt(cellMap, dir.x, dir.y, gridSize);
        return !cell || (cell.terrain !== 'water' && cell.terrain !== 'mountain');
      });
      if (validDirs.length > 0) {
        const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
        currentX = randomDir.x;
        currentY = randomDir.y;
        lastDirection = { dx: randomDir.dx, dy: randomDir.dy };
        stepsInSameDirection = 1;
        if (randomDir.dx === 0) hasMovedNorthSouth = true;
        else hasMovedEastWest = true;
      } else {
        break;
      }
    } else {
      candidates.sort((a, b) => {
        let scoreA = a.dist;
        let scoreB = b.dist;
        
        if (lastDirection) {
          const sameDir = a.dx === lastDirection.dx && a.dy === lastDirection.dy;
          const oppositeDir = a.dx === -lastDirection.dx && a.dy === -lastDirection.dy;
          if (sameDir && stepsInSameDirection > 3) {
            scoreA += 5;
          }
          if (oppositeDir) {
            scoreA += 3;
          }
        }
        
        if (a.dx === 0 && !hasMovedNorthSouth) scoreA -= 2;
        if (a.dx !== 0 && !hasMovedEastWest) scoreA -= 2;
        
        if (lastDirection) {
          const sameDir = b.dx === lastDirection.dx && b.dy === lastDirection.dy;
          const oppositeDir = b.dx === -lastDirection.dx && b.dy === -lastDirection.dy;
          if (sameDir && stepsInSameDirection > 3) {
            scoreB += 5;
          }
          if (oppositeDir) {
            scoreB += 3;
          }
        }
        
        if (b.dx === 0 && !hasMovedNorthSouth) scoreB -= 2;
        if (b.dx !== 0 && !hasMovedEastWest) scoreB -= 2;
        
        return scoreA - scoreB;
      });
      
      const best = candidates[0];
      const shouldTurn = Math.random() < 0.4 || (lastDirection && stepsInSameDirection > 4);
      
      let chosen: { x: number; y: number; dx: number; dy: number };
      if (shouldTurn && candidates.length > 1) {
        const turnCandidates = candidates.filter(c => 
          !lastDirection || (c.dx !== lastDirection.dx || c.dy !== lastDirection.dy)
        );
        if (turnCandidates.length > 0) {
          chosen = turnCandidates[Math.floor(Math.random() * turnCandidates.length)];
        } else {
          chosen = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
        }
      } else {
        chosen = best;
      }
      
      currentX = chosen.x;
      currentY = chosen.y;
      
      if (lastDirection && chosen.dx === lastDirection.dx && chosen.dy === lastDirection.dy) {
        stepsInSameDirection++;
      } else {
        stepsInSameDirection = 1;
        lastDirection = { dx: chosen.dx, dy: chosen.dy };
      }
      
      if (chosen.dx === 0) hasMovedNorthSouth = true;
      else hasMovedEastWest = true;
    }
    
    if (path.length > gridSize * 3) {
      break;
    }
  }
  
  if (isOnTargetEdge(currentX, currentY, endX, endY)) {
    path.push({ x: currentX, y: currentY });
  }
  return path;
}

function wouldCreateRoadCluster(
  x: number,
  y: number,
  path: { x: number; y: number }[],
  existingRoads: Set<string>,
  gridSize: number
): boolean {
  const pathSet = new Set(path.map(p => `${p.x},${p.y}`));
  const isRoad = (px: number, py: number): boolean => {
    if (px < 0 || px >= gridSize || py < 0 || py >= gridSize) return false;
    const key = `${px},${py}`;
    return pathSet.has(key) || existingRoads.has(key);
  };
  
  if (x + 1 < gridSize && y + 1 < gridSize) {
    if (isRoad(x + 1, y) && isRoad(x, y + 1) && isRoad(x + 1, y + 1)) return true;
  }
  if (x - 1 >= 0 && y + 1 < gridSize) {
    if (isRoad(x - 1, y) && isRoad(x, y + 1) && isRoad(x - 1, y + 1)) return true;
  }
  if (x + 1 < gridSize && y - 1 >= 0) {
    if (isRoad(x + 1, y) && isRoad(x, y - 1) && isRoad(x + 1, y - 1)) return true;
  }
  if (x - 1 >= 0 && y - 1 >= 0) {
    if (isRoad(x - 1, y) && isRoad(x, y - 1) && isRoad(x - 1, y - 1)) return true;
  }
  
  return false;
}

function createRoadPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cellMap: Map<string, Cell>,
  gridSize: number,
  waterCells: Set<string>,
  occupiedCells: Set<string>,
  existingRoads: Set<string>
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let currentX = startX;
  let currentY = startY;
  const visited = new Set<string>();
  
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };
  
  const isOnTargetEdge = (x: number, y: number, targetX: number, targetY: number) => {
    if (targetX === 0) return x === 0;
    if (targetX === gridSize - 1) return x === gridSize - 1;
    if (targetY === 0) return y === 0;
    if (targetY === gridSize - 1) return y === gridSize - 1;
    return false;
  };
  
  let lastDirection: { dx: number; dy: number } | null = null;
  let stepsInSameDirection = 0;
  let consecutiveWaterTiles = 0;
  let hasMovedNorthSouth = false;
  let hasMovedEastWest = false;
  
  while (!isOnTargetEdge(currentX, currentY, endX, endY)) {
    const key = `${currentX},${currentY}`;
    if (visited.has(key)) {
      break;
    }
    visited.add(key);
    path.push({ x: currentX, y: currentY });
    
    const isOnWater = waterCells.has(key);
    if (isOnWater) {
      consecutiveWaterTiles++;
    } else {
      consecutiveWaterTiles = 0;
    }
    
    const currentDist = getDistance(currentX, currentY, endX, endY);
    const candidates: { x: number; y: number; dist: number; dx: number; dy: number; isWater: boolean }[] = [];
    
    const directions = [
      { x: currentX + 1, y: currentY, dx: 1, dy: 0 },
      { x: currentX - 1, y: currentY, dx: -1, dy: 0 },
      { x: currentX, y: currentY + 1, dx: 0, dy: 1 },
      { x: currentX, y: currentY - 1, dx: 0, dy: -1 }
    ];
    
    for (const dir of directions) {
      if (dir.x < 0 || dir.x >= gridSize || dir.y < 0 || dir.y >= gridSize) {
        continue;
      }
      const dirKey = `${dir.x},${dir.y}`;
      if (visited.has(dirKey) || occupiedCells.has(dirKey)) {
        continue;
      }
      const cell = getCellAt(cellMap, dir.x, dir.y, gridSize);
      if (cell && cell.terrain === 'mountain') {
        continue;
      }
      
      const dirIsWater = waterCells.has(dirKey);
      if (consecutiveWaterTiles > 0 && dirIsWater && lastDirection) {
        const sameDirAsLast = dir.dx === lastDirection.dx && dir.dy === lastDirection.dy;
        if (sameDirAsLast && consecutiveWaterTiles >= 1) {
          continue;
        }
      }
      
      if (wouldCreateRoadCluster(dir.x, dir.y, path, existingRoads, gridSize)) {
        continue;
      }
      
      const dist = getDistance(dir.x, dir.y, endX, endY);
      if (dist <= currentDist) {
        candidates.push({ x: dir.x, y: dir.y, dist, dx: dir.dx, dy: dir.dy, isWater: dirIsWater });
      }
    }
    
    if (candidates.length === 0) {
      const validDirs = directions.filter(dir => {
        if (dir.x < 0 || dir.x >= gridSize || dir.y < 0 || dir.y >= gridSize) {
          return false;
        }
        const dirKey = `${dir.x},${dir.y}`;
        if (visited.has(dirKey) || occupiedCells.has(dirKey)) {
          return false;
        }
        const cell = getCellAt(cellMap, dir.x, dir.y, gridSize);
        if (cell && cell.terrain === 'mountain') {
          return false;
        }
        if (wouldCreateRoadCluster(dir.x, dir.y, path, existingRoads, gridSize)) {
          return false;
        }
        const dirIsWater = waterCells.has(dirKey);
        if (consecutiveWaterTiles > 0 && dirIsWater && lastDirection) {
          const sameDirAsLast = dir.dx === lastDirection.dx && dir.dy === lastDirection.dy;
          if (sameDirAsLast && consecutiveWaterTiles >= 1) {
            return false;
          }
        }
        return true;
      });
      if (validDirs.length > 0) {
        const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
        currentX = randomDir.x;
        currentY = randomDir.y;
        lastDirection = { dx: randomDir.dx, dy: randomDir.dy };
        stepsInSameDirection = 1;
        if (waterCells.has(`${currentX},${currentY}`)) {
          consecutiveWaterTiles++;
        } else {
          consecutiveWaterTiles = 0;
        }
        if (randomDir.dx === 0) hasMovedNorthSouth = true;
        else hasMovedEastWest = true;
      } else {
        break;
      }
    } else {
      candidates.sort((a, b) => {
        let scoreA = a.dist;
        let scoreB = b.dist;
        
        if (a.isWater && consecutiveWaterTiles > 0) {
          scoreA += 3;
        }
        if (b.isWater && consecutiveWaterTiles > 0) {
          scoreB += 3;
        }
        
        if (lastDirection) {
          const sameDir = a.dx === lastDirection.dx && a.dy === lastDirection.dy;
          const oppositeDir = a.dx === -lastDirection.dx && a.dy === -lastDirection.dy;
          if (sameDir && stepsInSameDirection > 3) {
            scoreA += 5;
          }
          if (oppositeDir) {
            scoreA += 3;
          }
        }
        
        if (a.dx === 0 && !hasMovedNorthSouth) scoreA -= 2;
        if (a.dx !== 0 && !hasMovedEastWest) scoreA -= 2;
        
        if (lastDirection) {
          const sameDir = b.dx === lastDirection.dx && b.dy === lastDirection.dy;
          const oppositeDir = b.dx === -lastDirection.dx && b.dy === -lastDirection.dy;
          if (sameDir && stepsInSameDirection > 3) {
            scoreB += 5;
          }
          if (oppositeDir) {
            scoreB += 3;
          }
        }
        
        if (b.dx === 0 && !hasMovedNorthSouth) scoreB -= 2;
        if (b.dx !== 0 && !hasMovedEastWest) scoreB -= 2;
        
        return scoreA - scoreB;
      });
      
      const best = candidates[0];
      const shouldTurn = Math.random() < 0.4 || (lastDirection && stepsInSameDirection > 4);
      
      let chosen: { x: number; y: number; dx: number; dy: number; isWater: boolean };
      if (shouldTurn && candidates.length > 1) {
        const turnCandidates = candidates.filter(c => 
          !lastDirection || (c.dx !== lastDirection.dx || c.dy !== lastDirection.dy)
        );
        if (turnCandidates.length > 0) {
          chosen = turnCandidates[Math.floor(Math.random() * turnCandidates.length)];
        } else {
          chosen = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
        }
      } else {
        chosen = best;
      }
      
      currentX = chosen.x;
      currentY = chosen.y;
      
      if (chosen.isWater) {
        consecutiveWaterTiles++;
      } else {
        consecutiveWaterTiles = 0;
      }
      
      if (lastDirection && chosen.dx === lastDirection.dx && chosen.dy === lastDirection.dy) {
        stepsInSameDirection++;
      } else {
        stepsInSameDirection = 1;
        lastDirection = { dx: chosen.dx, dy: chosen.dy };
      }
      
      if (chosen.dx === 0) hasMovedNorthSouth = true;
      else hasMovedEastWest = true;
    }
    
    if (path.length > gridSize * 3) {
      break;
    }
  }
  
  if (isOnTargetEdge(currentX, currentY, endX, endY)) {
    path.push({ x: currentX, y: currentY });
  }
  return path;
}

async function improveMapTerrain() {
  try {
    console.log('🔄 Starting map terrain improvement...\n');

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
      appName: 'improveMapTerrain-script'
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

      const occupiedCells = new Set<string>();
      
      for (const cell of map.cells) {
        if (cell.isOccupied) {
          occupiedCells.add(`${cell.x},${cell.y}`);
        }
      }

      console.log('   Step 1: Finding and fixing water clusters into edge-to-edge rivers...');
      
      const waterClusters = findClusters(cellMap, map.gridSize, 'water');
      console.log(`   Found ${waterClusters.length} water cluster(s)`);
      
      let waterCleared = 0;
      for (const cell of map.cells) {
        if (cell.terrain === 'water' && !cell.isOccupied) {
          await MapModel.updateOne(
            { _id: map._id, cells: { $elemMatch: { x: cell.x, y: cell.y } } },
            { $set: { 'cells.$.terrain': 'grass', 'cells.$.canBeOccupied': true } }
          );
          cell.terrain = 'grass';
          cell.canBeOccupied = true;
          waterCleared++;
        }
      }
      console.log(`   ✅ Cleared ${waterCleared} existing water cells`);

      const waterCells = new Set<string>();

      const existingWater = new Set<string>();
      let riversCreated = 0;
      const maxRivers = Math.max(2, waterClusters.length);

      for (let i = 0; i < waterClusters.length && riversCreated < maxRivers; i++) {
        const cluster = waterClusters[i];
        const startPoint = findClosestEdgePoint(cluster, map.gridSize);
        
        if (!startPoint) continue;
        
        const endPoint = getOppositeEdge(startPoint.x, startPoint.y, map.gridSize);
        const startKey = `${startPoint.x},${startPoint.y}`;
        const endKey = `${endPoint.x},${endPoint.y}`;
        
        if (existingWater.has(startKey) || existingWater.has(endKey)) {
          continue;
        }

        const path = createRiverPath(startPoint.x, startPoint.y, endPoint.x, endPoint.y, cellMap, map.gridSize, occupiedCells);
        
        if (path.length > 5) {
          for (const point of path) {
            const key = `${point.x},${point.y}`;
            if (!existingWater.has(key)) {
              const cell = getCellAt(cellMap, point.x, point.y, map.gridSize);
              if (cell && !cell.isOccupied) {
                await MapModel.updateOne(
                  { _id: map._id, cells: { $elemMatch: { x: point.x, y: point.y } } },
                  { $set: { 'cells.$.terrain': 'water', 'cells.$.canBeOccupied': false } }
                );
                cell.terrain = 'water';
                cell.canBeOccupied = false;
                existingWater.add(key);
                waterCells.add(key);
              }
            }
          }
          riversCreated++;
        }
      }

      if (riversCreated < 2) {
        const edgeCells: { x: number; y: number }[] = [];
        for (let x = 0; x < map.gridSize; x++) {
          edgeCells.push({ x, y: 0 });
          edgeCells.push({ x, y: map.gridSize - 1 });
        }
        for (let y = 1; y < map.gridSize - 1; y++) {
          edgeCells.push({ x: 0, y });
          edgeCells.push({ x: map.gridSize - 1, y });
        }

        const shuffledEdges = [...edgeCells].sort(() => Math.random() - 0.5);

        for (let i = 0; i < shuffledEdges.length && riversCreated < 2; i++) {
          const start = shuffledEdges[i];
          const end = getOppositeEdge(start.x, start.y, map.gridSize);
          
          const startKey = `${start.x},${start.y}`;
          const endKey = `${end.x},${end.y}`;
          
          if (existingWater.has(startKey) || existingWater.has(endKey)) {
            continue;
          }

          const path = createRiverPath(start.x, start.y, end.x, end.y, cellMap, map.gridSize, occupiedCells);
          
          if (path.length > 5) {
            for (const point of path) {
              const key = `${point.x},${point.y}`;
              if (!existingWater.has(key)) {
                const cell = getCellAt(cellMap, point.x, point.y, map.gridSize);
                if (cell && !cell.isOccupied) {
                  await MapModel.updateOne(
                    { _id: map._id, cells: { $elemMatch: { x: point.x, y: point.y } } },
                    { $set: { 'cells.$.terrain': 'water', 'cells.$.canBeOccupied': false } }
                  );
                  cell.terrain = 'water';
                  cell.canBeOccupied = false;
                  existingWater.add(key);
                  waterCells.add(key);
                }
              }
            }
            riversCreated++;
          }
        }
      }

      console.log(`   ✅ Created ${riversCreated} rivers`);

      console.log('   Step 2: Finding and fixing road clusters into edge-to-edge roads (can cross rivers)...');
      
      const roadClusters = findClusters(cellMap, map.gridSize, 'road');
      console.log(`   Found ${roadClusters.length} road cluster(s)`);
      
      let roadsCleared = 0;
      for (const cell of map.cells) {
        if (cell.terrain === 'road' && !cell.isOccupied) {
          await MapModel.updateOne(
            { _id: map._id, cells: { $elemMatch: { x: cell.x, y: cell.y } } },
            { $set: { 'cells.$.terrain': 'grass', 'cells.$.canBeOccupied': true } }
          );
          cell.terrain = 'grass';
          cell.canBeOccupied = true;
          roadsCleared++;
        }
      }
      console.log(`   ✅ Cleared ${roadsCleared} existing road cells`);

      const existingRoads = new Set<string>();
      let roadsCreated = 0;
      const maxRoads = Math.max(2, roadClusters.length);

      for (let i = 0; i < roadClusters.length && roadsCreated < maxRoads; i++) {
        const cluster = roadClusters[i];
        const startPoint = findClosestEdgePoint(cluster, map.gridSize);
        
        if (!startPoint) continue;
        
        const endPoint = getOppositeEdge(startPoint.x, startPoint.y, map.gridSize);
        const startKey = `${startPoint.x},${startPoint.y}`;
        const endKey = `${endPoint.x},${endPoint.y}`;
        
        if (waterCells.has(startKey) || waterCells.has(endKey) || 
            existingRoads.has(startKey) || existingRoads.has(endKey)) {
          continue;
        }

        const path = createRoadPath(startPoint.x, startPoint.y, endPoint.x, endPoint.y, cellMap, map.gridSize, waterCells, occupiedCells, existingRoads);
        
        if (path.length > 5) {
          for (const point of path) {
            const key = `${point.x},${point.y}`;
            if (!existingRoads.has(key)) {
              const cell = getCellAt(cellMap, point.x, point.y, map.gridSize);
              if (cell && !cell.isOccupied) {
                await MapModel.updateOne(
                  { _id: map._id, cells: { $elemMatch: { x: point.x, y: point.y } } },
                  { $set: { 'cells.$.terrain': 'road', 'cells.$.canBeOccupied': false } }
                );
                cell.terrain = 'road';
                cell.canBeOccupied = false;
                existingRoads.add(key);
              }
            }
          }
          roadsCreated++;
        }
      }

      if (roadsCreated < 2) {
        const edgeCells: { x: number; y: number }[] = [];
        for (let x = 0; x < map.gridSize; x++) {
          edgeCells.push({ x, y: 0 });
          edgeCells.push({ x, y: map.gridSize - 1 });
        }
        for (let y = 1; y < map.gridSize - 1; y++) {
          edgeCells.push({ x: 0, y });
          edgeCells.push({ x: map.gridSize - 1, y });
        }

        const shuffledEdges = [...edgeCells].sort(() => Math.random() - 0.5);

        for (let i = 0; i < shuffledEdges.length && roadsCreated < 2; i++) {
          const start = shuffledEdges[i];
          const end = getOppositeEdge(start.x, start.y, map.gridSize);
          
          const startKey = `${start.x},${start.y}`;
          const endKey = `${end.x},${end.y}`;
          
          if (waterCells.has(startKey) || waterCells.has(endKey) || 
              existingRoads.has(startKey) || existingRoads.has(endKey)) {
            continue;
          }

          const path = createRoadPath(start.x, start.y, end.x, end.y, cellMap, map.gridSize, waterCells, occupiedCells, existingRoads);
          
          if (path.length > 5) {
            for (const point of path) {
              const key = `${point.x},${point.y}`;
              if (!existingRoads.has(key)) {
                const cell = getCellAt(cellMap, point.x, point.y, map.gridSize);
                if (cell && !cell.isOccupied) {
                  await MapModel.updateOne(
                    { _id: map._id, cells: { $elemMatch: { x: point.x, y: point.y } } },
                    { $set: { 'cells.$.terrain': 'road', 'cells.$.canBeOccupied': false } }
                  );
                  cell.terrain = 'road';
                  cell.canBeOccupied = false;
                  existingRoads.add(key);
                }
              }
            }
            roadsCreated++;
          }
        }
      }

      console.log(`   ✅ Created ${roadsCreated} roads`);

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
    console.error('❌ Error improving map terrain:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  improveMapTerrain();
}

