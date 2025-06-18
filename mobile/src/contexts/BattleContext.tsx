import React, { createContext, useContext, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  deployBattalion,
  updateBattalionPosition,
  updateBattalionTarget,
  updateBattalionHealth,
  updateNodeControl,
  startBattle,
  endBattle,
  resetBattle,
} from '../store/slices/battleSlice';

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

// Context
const BattleContext = createContext<any>(null);

export function BattleProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state.battle);

  const deployBattalionHandler = useCallback((battalion) => {
    dispatch(deployBattalion(battalion));
  }, [dispatch]);

  const updatePosition = useCallback((id, position) => {
    dispatch(updateBattalionPosition({ id, position }));
  }, [dispatch]);

  const updateTarget = useCallback((id, targetId) => {
    dispatch(updateBattalionTarget({ id, targetId }));
  }, [dispatch]);

  const updateHealth = useCallback((id, health) => {
    dispatch(updateBattalionHealth({ id, health }));
  }, [dispatch]);

  const updateNodeControlHandler = useCallback((id, team, progress) => {
    dispatch(updateNodeControl({ id, team, progress }));
  }, [dispatch]);

  const startBattleHandler = useCallback(() => {
    dispatch(startBattle());
  }, [dispatch]);

  const endBattleHandler = useCallback((winner) => {
    dispatch(endBattle(winner));
  }, [dispatch]);

  return (
    <BattleContext.Provider value={{
      state,
      deployBattalion: deployBattalionHandler,
      updatePosition,
      updateTarget,
      updateHealth,
      updateNodeControl: updateNodeControlHandler,
      startBattle: startBattleHandler,
      endBattle: endBattleHandler,
      resetBattle: () => dispatch(resetBattle()),
    }}>
      {children}
    </BattleContext.Provider>
  );
}

export function useBattle() {
  const context = useContext(BattleContext);
  if (!context) {
    throw new Error('useBattle must be used within a BattleProvider');
  }
  return context;
} 