import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
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
  const buildTimerRef = useRef<NodeJS.Timeout | null>(null);

  const BOT_COST = 1;
  const BUILD_TIME = 1000; // 1 second per bot

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (buildTimerRef.current) {
        clearInterval(buildTimerRef.current);
      }
    };
  }, []);

  const startBuilding = (type: BotType, quantity: number) => {
    try {
      const totalCost = BOT_COST * quantity;
      subtractFromBalance(totalCost);
      
      // Clear any existing timer
      if (buildTimerRef.current) {
        clearInterval(buildTimerRef.current);
      }

      let botsBuilt = 0;
      setBuildingProgress(0);
      
      const timer = setInterval(() => {
        botsBuilt++;
        setBotCounts(prev => ({
          ...prev,
          [type]: prev[type] + 1
        }));

        if (botsBuilt === quantity) {
          clearInterval(timer);
          setBuildingProgress(null);
          buildTimerRef.current = null;
        } else {
          setBuildingProgress((botsBuilt / quantity) * 100);
        }
      }, BUILD_TIME);

      buildTimerRef.current = timer;
    } catch (error) {
      console.error('Build error:', error);
      setBuildingProgress(null);
      if (buildTimerRef.current) {
        clearInterval(buildTimerRef.current);
      }
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