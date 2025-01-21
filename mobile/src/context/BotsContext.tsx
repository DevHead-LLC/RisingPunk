import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { updateBotCount, getArmyStatus, BotType, BotCounts } from '../services/api';
import { useAuth } from './AuthContext';
import { useBalance } from './BalanceContext';

interface BotsContextType {
  botCounts: BotCounts;
  buildingProgress: number | null;
  selectedType: BotType | null;
  startBuilding: (type: BotType, quantity: number) => Promise<void>;
  setSelectedType: (type: BotType | null) => void;
}

const BotsContext = createContext<BotsContextType | null>(null);

export function BotsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { subtractFromBalance } = useBalance();
  const [botCounts, setBotCounts] = useState<BotCounts>({
    breacher: 0,
    guardian: 0,
    phreak: 0,
  });
  const [buildingProgress, setBuildingProgress] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<BotType | null>(null);
  const buildTimerRef = useRef<NodeJS.Timeout | null>(null);

  const BOT_COST = 1;
  const BUILD_TIME = 1000; // 1 second per bot

  useEffect(() => {
    if (token) {
      getArmyStatus(token)
        .then(setBotCounts)
        .catch(console.error);
    }
  }, [token]);

  const startBuilding = async (type: BotType, quantity: number) => {
    try {
      if (!token) throw new Error('Not authenticated');
      
      const totalCost = BOT_COST * quantity;
      subtractFromBalance(totalCost);
      
      if (buildTimerRef.current) {
        clearInterval(buildTimerRef.current);
      }

      let botsBuilt = 0;
      setBuildingProgress(0);
      
      const timer = setInterval(async () => {
        try {
          const updatedCounts = await updateBotCount(token, type, 1);
          setBotCounts(updatedCounts);
          
          botsBuilt++;
          const progress = (botsBuilt / quantity) * 100;
          setBuildingProgress(progress);

          if (botsBuilt === quantity) {
            clearInterval(timer);
            setBuildingProgress(null);
            buildTimerRef.current = null;
          }
        } catch (error) {
          console.error('Failed to update bot count:', error);
          clearInterval(timer);
          setBuildingProgress(null);
          buildTimerRef.current = null;
        }
      }, BUILD_TIME);

      buildTimerRef.current = timer;
    } catch (error) {
      console.error('Build error:', error);
      setBuildingProgress(null);
      throw error;
    }
  };

  const value = {
    botCounts,
    buildingProgress,
    selectedType,
    startBuilding,
    setSelectedType,
  };

  return (
    <BotsContext.Provider value={value}>
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