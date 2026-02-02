/**
 * Shared Map/Cell types for server scripts that work with the Map model.
 * Single source of truth to avoid duplicating Cell and MapDoc across scripts.
 */
import mongoose from 'mongoose';

export type TerrainType = 'plain' | 'mountain' | 'water' | 'forest' | 'road' | 'grass' | 'dirt';

export interface Cell {
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

export interface MapDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  gridSize: number;
  cells: Cell[];
  version: number;
  lastUpdated: Date;
}

/** Get cell at (x, y) from a keyed map; returns null if out of bounds. */
export function getCellAt(
  cellMap: Map<string, Cell>,
  x: number,
  y: number,
  gridSize: number
): Cell | null {
  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
    return null;
  }
  return cellMap.get(`${x},${y}`) || null;
}

/** Orthogonal neighbors (up, down, left, right) for (x, y). */
export function getNeighbors(x: number, y: number): { x: number; y: number }[] {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}
