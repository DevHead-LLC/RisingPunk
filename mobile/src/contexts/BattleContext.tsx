import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Types
export interface Battalion {
  id: string;
  type: 'guardian' | 'phreak' | 'breacher';
  position: { x: number; y: number };
  health: number;
  quantity: number;
  targetId: string | null;
  nodeId: number | null;
}

export interface BattleNode {
  id: number;
  position: { x: number; y: number };
  controllingTeam: 'red' | 'blue' | null;
  controlProgress: number;
}

interface BattleState {
  phase: 'deployment' | 'active' | 'complete';
  timeRemaining: number;
  battalions: { [key: string]: Battalion };
  nodes: { [key: number]: BattleNode };
  winner: 'red' | 'blue' | null;
}

// Actions
type BattleAction =
  | { type: 'DEPLOY_BATTALION'; battalion: Battalion }
  | { type: 'UPDATE_BATTALION_POSITION'; id: string; position: { x: number; y: number } }
  | { type: 'UPDATE_BATTALION_TARGET'; id: string; targetId: string | null }
  | { type: 'UPDATE_BATTALION_HEALTH'; id: string; health: number }
  | { type: 'UPDATE_NODE_CONTROL'; id: number; team: 'red' | 'blue' | null; progress: number }
  | { type: 'START_BATTLE' }
  | { type: 'END_BATTLE'; winner: 'red' | 'blue' };

// Initial state
const initialState: BattleState = {
  phase: 'deployment',
  timeRemaining: 20, // 20 seconds battle duration
  battalions: {},
  nodes: {
    0: { id: 0, position: { x: 100, y: 100 }, controllingTeam: 'red', controlProgress: 100 },
    1: { id: 1, position: { x: 300, y: 100 }, controllingTeam: 'red', controlProgress: 100 },
    2: { id: 2, position: { x: 500, y: 100 }, controllingTeam: 'red', controlProgress: 100 },
    3: { id: 3, position: { x: 200, y: 300 }, controllingTeam: null, controlProgress: 0 },
    4: { id: 4, position: { x: 300, y: 300 }, controllingTeam: null, controlProgress: 0 },
    5: { id: 5, position: { x: 400, y: 300 }, controllingTeam: null, controlProgress: 0 },
  },
  winner: null,
};

// Reducer
function battleReducer(state: BattleState, action: BattleAction): BattleState {
  console.log('Action:', action.type, action);
  console.log('Current state:', state);

  let newState: BattleState;

  switch (action.type) {
    case 'DEPLOY_BATTALION': {
      const newBattalions = { ...state.battalions };
      newBattalions[action.battalion.id] = { ...action.battalion };
      newState = {
        ...state,
        battalions: newBattalions,
      };
      break;
    }

    case 'UPDATE_BATTALION_POSITION': {
      if (!state.battalions[action.id]) {
        console.log('Battalion not found for UPDATE_BATTALION_POSITION:', action.id);
        return state;
      }
      const newBattalions = { ...state.battalions };
      newBattalions[action.id] = {
        ...newBattalions[action.id],
        position: { ...action.position },
      };
      newState = {
        ...state,
        battalions: newBattalions,
      };
      break;
    }

    case 'UPDATE_BATTALION_TARGET': {
      if (!state.battalions[action.id]) {
        console.log('Battalion not found for UPDATE_BATTALION_TARGET:', action.id);
        return state;
      }
      const newBattalions = { ...state.battalions };
      newBattalions[action.id] = {
        ...newBattalions[action.id],
        targetId: action.targetId,
      };
      newState = {
        ...state,
        battalions: newBattalions,
      };
      break;
    }

    case 'UPDATE_BATTALION_HEALTH': {
      if (!state.battalions[action.id]) {
        console.log('Battalion not found for UPDATE_BATTALION_HEALTH:', action.id);
        return state;
      }
      const newBattalions = { ...state.battalions };
      newBattalions[action.id] = {
        ...newBattalions[action.id],
        health: action.health,
      };
      newState = {
        ...state,
        battalions: newBattalions,
      };
      break;
    }

    case 'UPDATE_NODE_CONTROL': {
      if (!state.nodes[action.id]) {
        console.log('Node not found for UPDATE_NODE_CONTROL:', action.id);
        return state;
      }
      const newNodes = { ...state.nodes };
      newNodes[action.id] = {
        ...newNodes[action.id],
        controllingTeam: action.team,
        controlProgress: action.progress,
      };
      newState = {
        ...state,
        nodes: newNodes,
      };
      break;
    }

    case 'START_BATTLE': {
      newState = {
        ...state,
        phase: 'active' as const,
      };
      break;
    }

    case 'END_BATTLE': {
      newState = {
        ...state,
        phase: 'complete' as const,
        winner: action.winner,
      };
      break;
    }

    default:
      return state;
  }

  console.log('New state:', newState);
  return newState;
}

// Context
const BattleContext = createContext<{
  state: BattleState;
  deployBattalion: (battalion: Battalion) => void;
  updatePosition: (id: string, position: { x: number; y: number }) => void;
  updateTarget: (id: string, targetId: string | null) => void;
  updateHealth: (id: string, health: number) => void;
  updateNodeControl: (id: number, team: 'red' | 'blue' | null, progress: number) => void;
  startBattle: () => void;
  endBattle: (winner: 'red' | 'blue') => void;
} | null>(null);

// Provider
export function BattleProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(battleReducer, initialState);

  const deployBattalion = useCallback((battalion: Battalion) => {
    dispatch({ type: 'DEPLOY_BATTALION', battalion });
  }, []);

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    dispatch({ type: 'UPDATE_BATTALION_POSITION', id, position });
  }, []);

  const updateTarget = useCallback((id: string, targetId: string | null) => {
    dispatch({ type: 'UPDATE_BATTALION_TARGET', id, targetId });
  }, []);

  const updateHealth = useCallback((id: string, health: number) => {
    dispatch({ type: 'UPDATE_BATTALION_HEALTH', id, health });
  }, []);

  const updateNodeControl = useCallback((id: number, team: 'red' | 'blue' | null, progress: number) => {
    dispatch({ type: 'UPDATE_NODE_CONTROL', id, team, progress });
  }, []);

  const startBattle = useCallback(() => {
    dispatch({ type: 'START_BATTLE' });
  }, []);

  const endBattle = useCallback((winner: 'red' | 'blue') => {
    dispatch({ type: 'END_BATTLE', winner });
  }, []);

  const value = {
    state,
    deployBattalion,
    updatePosition,
    updateTarget,
    updateHealth,
    updateNodeControl,
    startBattle,
    endBattle,
  };

  return (
    <BattleContext.Provider value={value}>
      {children}
    </BattleContext.Provider>
  );
}

// Hook
export function useBattle() {
  const context = useContext(BattleContext);
  if (!context) {
    throw new Error('useBattle must be used within a BattleProvider');
  }
  return context;
} 