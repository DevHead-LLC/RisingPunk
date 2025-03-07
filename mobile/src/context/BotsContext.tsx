import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useBalance } from './BalanceContext';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';

type BotType = 'breacher' | 'guardian' | 'phreak';

type BuildQueue = {
  type: BotType;
  quantity: number;
  totalCost: number;
  progress: number;
  startedAt: string;
  completesAt: string;
} | null;

type DeploymentUpdate = {
  botType: BotType;
  quantity: number;
  battalionId: string;
};

type BotsContextType = {
  botCounts: Record<BotType, number>;
  deployedCounts: Record<BotType, number>;
  buildingProgress: number | null;
  selectedType: BotType | null;
  startBuilding: (type: BotType, quantity: number) => void;
  selectBotType: (type: BotType) => void;
  buildStartTime: Date | null;
  totalBuildQuantity: number;
  buildQueue: BuildQueue;
  assignToBattalion: (update: DeploymentUpdate) => void;
  getAvailableBots: (botType: BotType) => number;
};

export const BotsContext = createContext<BotsContextType | undefined>(undefined);

export function BotsProvider({ children }: { children: React.ReactNode }) {
  // Define default values that we'll fallback to
  const defaultBotCounts = {
    breacher: 10,
    guardian: 10, 
    phreak: 10,
  };
  
  const defaultDeployedCounts = {
    breacher: 0,
    guardian: 0,
    phreak: 0,
  };
  
  const { token } = useAuth();
  
  // Safe usage of useBalance
  let subtractFromBalance = (amount: number) => { 
    // Silent no-op if balance context is not available
  };
  
  try {
    const balanceContext = useBalance();
    if (balanceContext && balanceContext.subtractFromBalance) {
      subtractFromBalance = balanceContext.subtractFromBalance;
    }
  } catch (error) {
    // Silent error handling
  }
  
  // Initialize state with default values
  const [botCounts, setBotCounts] = useState<Record<BotType, number>>(defaultBotCounts);
  const [deployedCounts, setDeployedCounts] = useState<Record<BotType, number>>(defaultDeployedCounts);
  
  const [buildingProgress, setBuildingProgress] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<BotType | null>(null);
  const buildTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [buildStartTime, setBuildStartTime] = useState<Date | null>(null);
  const [totalBuildQuantity, setTotalBuildQuantity] = useState<number>(0);
  const [buildQueue, setBuildQueue] = useState<BuildQueue>(null);

  const BOT_COST = 1;
  const BUILD_TIME = 1000;

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
        
        // Set bot counts from server
        setBotCounts(data.bots);
        
        // Calculate deployed counts from battalion assignments
        const deployedState = {
          breacher: 0,
          guardian: 0,
          phreak: 0
        };
        
        // Sum up all battalion assignments
        data.battalionAssignments?.forEach(
          (assignment: { botType: BotType; quantity: number }) => {
            deployedState[assignment.botType] += assignment.quantity;
          }
        );
        
        setDeployedCounts(deployedState);
      } catch (error) {
        // Silent error handling
      }
    };
    
    if (token) {
      fetchBots();
    }
  }, [token]);

  const pollBuildStatus = useCallback(async () => {
    try {
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
          setBotCounts(bots);
          setBuildQueue(serverQueue);
          setBuildStartTime(new Date(serverQueue.startedAt));
          if (!selectedType) {
            setSelectedType(serverQueue.type);
          }
        } else {
          // Build complete or no active build
          setBuildingProgress(null);
          setTotalBuildQuantity(0);
          setBuildQueue(null);
          setBuildStartTime(null);
          setBotCounts(bots);
        }
      }
    } catch (error) {
      console.error('Error polling build status:', error);
    }
  }, [token, selectedType]);

  // Set up polling when component mounts or when token changes
  useEffect(() => {
    if (token) {
      // Initial poll to check for active builds
      pollBuildStatus();
      
      // Set up interval for polling
      const interval = setInterval(pollBuildStatus, 1000);
      
      return () => clearInterval(interval);
    }
  }, [token, pollBuildStatus]);

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
        throw new Error('Failed to start build');
      }

      const buildData = await buildResponse.json();
      setBuildQueue(buildData.buildQueue);
      setBuildStartTime(new Date(buildData.buildQueue.startedAt));
      setTotalBuildQuantity(quantity);
      setBuildingProgress(0);

      // Start polling
      pollBuildStatus();
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

  const assignToBattalion = useCallback(async ({ botType, quantity, battalionId }: DeploymentUpdate) => {
    // Don't attempt API call if no token is available
    if (!token) {
      console.log('Authentication token not available, skipping battalion assignment');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/battalions/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ botType, quantity, battalionId })
      });

      const data = await response.json() as {
        updatedBotCount: number;
        previousAssignment: { botType: BotType; quantity: number } | null;
        error?: string;
      };

      if (!response.ok) {
        // For authentication errors, we'll just log and return instead of throwing
        if (response.status === 401) {
          console.log('Authentication error in battalion assignment, please log in again');
          return;
        }
        throw new Error(data.error || 'Failed to assign bots');
      }

      // Update local state with server response
      setBotCounts(prev => ({
        ...prev,
        [botType]: data.updatedBotCount
      }));
      
      // If there was a previous assignment, subtract it first
      if (data.previousAssignment) {
        const { botType: prevBotType, quantity: prevQuantity } = data.previousAssignment;
        setDeployedCounts(prev => ({
          ...prev,
          [prevBotType]: prev[prevBotType] - prevQuantity
        }));
      }
      
      // Then add the new assignment
      setDeployedCounts(prev => ({
        ...prev,
        [botType]: prev[botType] + quantity
      }));

    } catch (error) {
      // Log the error but don't crash the app
      console.error('Battalion assignment error:', error);
      // We don't rethrow the error here anymore
    }
  }, [token]);

  const getAvailableBots = useCallback((botType: BotType) => {
    return (botCounts?.[botType] || 0) - (deployedCounts?.[botType] || 0);
  }, [botCounts, deployedCounts]);

  // Create a safe context value
  const contextValue = {
    botCounts: botCounts || defaultBotCounts,
    deployedCounts,
    assignToBattalion,
    getAvailableBots,
    buildingProgress,
    selectedType,
    startBuilding,
    selectBotType,
    buildStartTime,
    totalBuildQuantity,
    buildQueue,
  };

  return (
    <BotsContext.Provider value={contextValue}>
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