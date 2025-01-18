import React, { createContext, useContext, useState } from 'react';
import { useBalance } from './BalanceContext';

type BotType = 'breacher' | 'guardian' | 'phreak';

type BotsContextType = {
  botCounts: Record<BotType, number>;
  buildingProgress: number | null;
  selectedType: BotType | null;
  startBuilding: (type: BotType, quantity: number) => void;
  selectBotType: (type: BotType) => void;
};

const BotsContext = createContext<BotsContextType | undefined>(undefined);

export function BotsProvider({ children }: { children: React.ReactNode }) {
  const { subtractFromBalance } = useBalance();
  const [botCounts, setBotCounts] = useState<Record<BotType, number>>({
    breacher: 0,
    guardian: 0,
    phreak: 0,
  });
  const [buildingProgress, setBuildingProgress] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<BotType | null>(null);
  const [buildTimer, setBuildTimer] = useState<NodeJS.Timeout | null>(null);

  const BOT_COST = 1;
  const BUILD_TIME = 1000; // 1 second per bot

  const startBuilding = (type: BotType, quantity: number) => {
    try {
      const totalCost = BOT_COST * quantity;
      
      // Check if we can afford it
      subtractFromBalance(totalCost);
      
      let botsBuilt = 0;

      // Clear any existing timer
      if (buildTimer) {
        clearInterval(buildTimer);
        setBuildingProgress(null);
      }

      setBuildingProgress(0); // Set initial progress
      
      // Start building process
      const timer = setInterval(() => {
        botsBuilt++;
        setBotCounts(prev => ({
          ...prev,
          [type]: prev[type] + 1
        }));

        if (botsBuilt === quantity) {
          clearInterval(timer);
          setBuildingProgress(null);
          setBuildTimer(null);
        } else {
          setBuildingProgress((botsBuilt / quantity) * 100);
        }
      }, BUILD_TIME);

      setBuildTimer(timer);
    } catch (error) {
      console.error('Build error:', error);
      setBuildingProgress(null);
      if (buildTimer) clearInterval(buildTimer);
      throw new Error('Failed to start building');
    }
  };

  const selectBotType = (type: BotType) => {
    setSelectedType(type);
  };

  return (
    <BotsContext.Provider value={{
      botCounts,
      buildingProgress,
      selectedType,
      startBuilding,
      selectBotType,
    }}>
      {children}
    </BotsContext.Provider>
  );
}

export function useBots() {
  const context = useContext(BotsContext);
  if (context === undefined) {
    throw new Error('useBots must be used within a BotsProvider');
  }
  return context;
} 