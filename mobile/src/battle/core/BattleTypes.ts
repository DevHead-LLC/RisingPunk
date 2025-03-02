export enum BattlePhase {
  PRE_BATTLE = 'PRE_BATTLE',
  DEPLOYMENT = 'DEPLOYMENT',
  COMBAT = 'COMBAT',
  RESULTS = 'RESULTS'
}

export enum BattalionType {
  GUARDIAN = 'Guardian',
  PHREAK = 'Phreak',
  BREACHER = 'Breacher'
}

export interface Position {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  position: Position;
  controllingTeam: string | null;
  controlProgress: number;
  health: number;
}

export interface Battalion {
  id: string;
  position: Position;
  type: BattalionType;
  team: string;
  health: number;
  quantity: number;
  targetId: string | null;
}

export interface BattleState {
  phase: BattlePhase;
  timeRemaining: number;
  nodes: Map<string, Node>;
  battalions: Map<string, Battalion>;
  updateId: number;
  lastUpdated: Date;
}

export interface BattleStateUpdate {
  phaseUpdate?: BattlePhase;
  timeUpdate?: number;
  nodeUpdates?: Map<string, Partial<Node>>;
  battalionUpdates?: Map<string, Partial<Battalion>>;
}

export interface BattlePerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  loadTime: number;
  networkLatency: number;
}

export interface BattleLog {
  type: string;
  timestamp: number;
  details: any;
} 