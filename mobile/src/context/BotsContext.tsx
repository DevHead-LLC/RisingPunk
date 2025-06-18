import React, { createContext, useContext, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setBots, setDeployedCounts, setBuildState, selectBotType, clearBuildState, BotType } from '../store/slices/botsSlice';
import { useFetchBotsQuery, useFetchBuildStateQuery, useStartBuildMutation, useAssignToBattalionMutation } from '../store/api/botsApi';

export type DeploymentUpdate = {
  botType: BotType;
  quantity: number;
  battalionId: string;
};

type BotsContextType = {
  botCounts: Record<BotType, number>;
  deployedCounts: Record<BotType, number>;
  buildingProgress: number | null;
  selectedType: BotType | null;
  startBuilding: (type: BotType, quantity: number) => Promise<void>;
  selectBotType: (type: BotType) => void;
  buildStartTime: string | null;
  totalBuildQuantity: number;
  buildQueue: any;
  assignToBattalion: (update: DeploymentUpdate) => Promise<void>;
  getAvailableBots: (botType: BotType) => number;
};

export const BotsContext = createContext<BotsContextType | undefined>(undefined);

export function BotsProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const bots = useAppSelector((state) => state.bots);
  const { data: botsData } = useFetchBotsQuery();
  const { data: buildStateData } = useFetchBuildStateQuery(undefined, { pollingInterval: 1000 });
  const [startBuild] = useStartBuildMutation();
  const [assignToBattalion] = useAssignToBattalionMutation();

  // Sync bots and build state from API
  React.useEffect(() => {
    if (botsData) {
      dispatch(setBots(botsData.bots));
      // Calculate deployed counts
      const deployedState = { breacher: 0, guardian: 0, phreak: 0 };
      botsData.battalionAssignments?.forEach((assignment) => {
        deployedState[assignment.botType] += assignment.quantity;
      });
      dispatch(setDeployedCounts(deployedState));
    }
  }, [botsData, dispatch]);

  React.useEffect(() => {
    if (buildStateData) {
      dispatch(setBuildState({ buildQueue: buildStateData.buildQueue, bots: buildStateData.bots }));
    }
  }, [buildStateData, dispatch]);

  const startBuilding = useCallback(async (type: BotType, quantity: number) => {
    // Assume cost is handled server-side
    await startBuild({ type, quantity, totalCost: quantity }).unwrap();
  }, [startBuild]);

  const selectBotTypeHandler = useCallback((type: BotType) => {
    dispatch(selectBotType(type));
  }, [dispatch]);

  const assignToBattalionHandler = useCallback(async (update: DeploymentUpdate) => {
    await assignToBattalion(update).unwrap();
  }, [assignToBattalion]);

  const getAvailableBots = useCallback((botType: BotType) => {
    return bots.botCounts[botType] - bots.deployedCounts[botType];
  }, [bots.botCounts, bots.deployedCounts]);

  return (
    <BotsContext.Provider value={{
      botCounts: bots.botCounts,
      deployedCounts: bots.deployedCounts,
      buildingProgress: bots.buildingProgress,
      selectedType: bots.selectedType,
      startBuilding,
      selectBotType: selectBotTypeHandler,
      buildStartTime: bots.buildStartTime,
      totalBuildQuantity: bots.totalBuildQuantity,
      buildQueue: bots.buildQueue,
      assignToBattalion: assignToBattalionHandler,
      getAvailableBots,
    }}>
      {children}
    </BotsContext.Provider>
  );
}

export function useBots() {
  const context = useContext(BotsContext);
  if (!context) {
    throw new Error('useBots must be used within a BotsProvider');
  }
  return context;
} 