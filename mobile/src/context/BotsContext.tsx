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
  buildStartTime: Date | null;
  totalBuildQuantity: number;
  buildQueue: {
    type: BotType;
    quantity: number;
    totalCost: number;
    progress: number;
  } | null;
};

export const BotsContext = createContext<BotsContextType | undefined>(undefined);

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
  const [buildStartTime, setBuildStartTime] = useState<Date | null>(null);
  const [totalBuildQuantity, setTotalBuildQuantity] = useState<number>(0);
  const [buildQueue, setBuildQueue] = useState<{
    type: BotType;
    quantity: number;
    totalCost: number;
    progress: number;
  } | null>(null);

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
      
      // First deduct balance
      const deductResponse = await fetch(`${API_URL}/api/balance/deduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: totalCost })
      });

      if (!deductResponse.ok) {
        const errorData = await deductResponse.json();
        throw new Error(errorData.error || 'Failed to deduct balance');
      }

      const { balance } = await deductResponse.json();
      subtractFromBalance(totalCost);

      // Initialize buildQueue with totalCost before the build request
      setBuildQueue({
        type,
        quantity,
        totalCost,
        progress: 0
      });

      // Start the build process
      const buildResponse = await fetch(`${API_URL}/api/bots/build`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, quantity, totalCost })
      });

      if (!buildResponse.ok) {
        setBuildQueue(null);
        throw new Error('Failed to start build');
      }

      // Set up polling for build status
      const pollBuildStatus = setInterval(async () => {
        const statusResponse = await fetch(`${API_URL}/api/bots/build-state`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (statusResponse.ok) {
          const { buildQueue: serverQueue, bots } = await statusResponse.json();
          if (serverQueue) {
            setBuildingProgress(serverQueue.progress);
            setTotalBuildQuantity(serverQueue.quantity);
            setBotCounts(bots);  // Use server-provided bot counts
            
            // Preserve totalCost when updating buildQueue
            setBuildQueue(prevQueue => ({
              ...serverQueue,
              totalCost: prevQueue?.totalCost || 0
            }));

            if (serverQueue.progress >= 100) {
              clearInterval(pollBuildStatus);
              setBuildingProgress(null);
              setTotalBuildQuantity(0);
              setBuildQueue(null);
            }
          }
        }
      }, 1000);

      buildTimerRef.current = pollBuildStatus;
    } catch (error) {
      console.error('Build error:', error);
      setBuildingProgress(null);
      setTotalBuildQuantity(0);
      setBuildQueue(null);
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
      buildStartTime,
      totalBuildQuantity,
      buildQueue,
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