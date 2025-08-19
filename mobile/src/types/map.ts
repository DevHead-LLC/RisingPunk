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
}

export interface MapResponse {
  grid: CellData[][];
}
