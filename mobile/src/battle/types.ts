export interface Position {
  x: number;
  y: number;
}

export enum BattlePhase {
  SETUP = 'SETUP',
  COMBAT = 'COMBAT',
  RESULTS = 'RESULTS'
}

export enum BattalionType {
  GUARDIAN = 'GUARDIAN',
  WARRIOR = 'WARRIOR',
  ARCHER = 'ARCHER'
}

export interface Battalion {
  id: string;
  position: Position;
  team: string;
  type: BattalionType;
  health: number;
  quantity: number;
  targetId: string | null;
}

export interface Node {
  id: string;
  position: Position;
  controllingTeam: string | null;
  controlProgress: number;
  health: number;
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

export interface AnimationConfig {
  startTime: number;
  duration: number;
  startPos: Position;
  endPos: Position;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
} 