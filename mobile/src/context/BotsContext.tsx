import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useBalance } from './BalanceContext';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';

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
  const { token } = useAuth();
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

  // Fetch initial bot counts
  useEffect(() => {
    const fetchBots = async () => {
      try {
        const response = await fetch(`${API_URL}/api/bots`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setBotCounts(data);
      } catch (error) {
        console.error('Failed to fetch bot counts:', error);
      }
    };
    
    if (token) {
      fetchBots();
    }
  }, [token]);

  const startBuilding = async (type: BotType, quantity: number) => {
    try {
      const totalCost = BOT_COST * quantity;
      
      // Deduct balance on server first
      const deductResponse = await fetch(`${API_URL}/api/balance/deduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: totalCost })
      });

      // Log the response for debugging
      console.log('Deduct response:', await deductResponse.clone().json());

      if (!deductResponse.ok) {
        const errorData = await deductResponse.json();
        throw new Error(errorData.error || 'Failed to deduct balance');
      }

      // Update local balance after server confirms deduction
      const balanceData = await deductResponse.json();
      subtractFromBalance(totalCost);

      if (buildTimerRef.current) {
        clearInterval(buildTimerRef.current);
      }

      let botsBuilt = 0;
      setBuildingProgress(0);
      
      const timer = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/api/bots/build`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, quantity: 1 })
          });
          
          if (response.ok) {
            const updatedCounts = await response.json();
            setBotCounts(updatedCounts);
            botsBuilt++;
          }

          if (botsBuilt === quantity) {
            clearInterval(timer);
            setBuildingProgress(null);
            buildTimerRef.current = null;
          } else {
            setBuildingProgress((botsBuilt / quantity) * 100);
          }
        } catch (error) {
          console.error('Build interval error:', error);
          clearInterval(timer);
          setBuildingProgress(null);
        }
      }, BUILD_TIME);

      buildTimerRef.current = timer;
    } catch (error) {
      console.error('Build error details:', error);
      setBuildingProgress(null);
      if (buildTimerRef.current) {
        clearInterval(buildTimerRef.current);
      }
      throw error;
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