export type TerrainType = 'plain' | 'mountain' | 'water' | 'forest' | 'road' | 'grass' | 'dirt';
export type EntityType = 'empty' | 'player' | 'npc' | 'house';

export interface CellData {
  terrain: TerrainType;
  entity: EntityType;
  owner?: 'player' | 'enemy';
  name?: string;
  npcSlug?: string;
  npcInstanceId?: string;
  userId?: string;
  npcLevel?: number;
  isShielded?: boolean;
}

export interface MapResponse {
  grid: CellData[][];
  /** Full map grid size (e.g. 50 or 500). Use for pan bounds and viewport clamping. */
  gridSize?: number;
  viewport?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}
