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
