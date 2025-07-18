import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useGetBattleStateQuery, BattleState } from '../store/api/battleApi';
import { Battalion } from '../types/battle';
import { NodeIndex } from '../types/battleTypes';
import { calculateNodePositions } from './useBattleNodes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InterpolationState {
  isInterpolating: boolean;
  startTime: number;
  duration: number;
  startState: BattleState | null;
  endState: BattleState | null;
}

export const useBattleSync = (battleId: string) => {
  const { data: battleState, isLoading, error } = useGetBattleStateQuery(battleId, {
    pollingInterval: 1000, // Poll every 1 second for real-time updates
  });
  

  
  const [interpolationState, setInterpolationState] = useState<InterpolationState>({
    isInterpolating: false,
    startTime: 0,
    duration: 1000, // 1 second interpolation
    startState: null,
    endState: null
  });
  
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [lastState, setLastState] = useState<BattleState | null>(null);
  
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // State diff detection
  const detectStateDiff = useCallback((oldState: BattleState | null, newState: BattleState | null) => {
    if (!oldState || !newState) return { hasChanges: true, changes: [] };
    
    const changes = [];
    
    // Check battalion changes - add defensive checks
    const oldBattalions = oldState.battalions || [];
    const newBattalions = newState.battalions || [];
    if (oldBattalions.length !== newBattalions.length) {
      changes.push('battalion_count_changed');
    }
    
    // Check node changes - add defensive checks
    const oldNodes = oldState.nodes || [];
    const newNodes = newState.nodes || [];
    const nodeChanges = newNodes.some((node, index) => {
      const oldNode = oldNodes[index];
      return oldNode && (node.owner !== oldNode.owner || node.captureProgress !== oldNode.captureProgress);
    });
    
    if (nodeChanges) {
      changes.push('node_ownership_changed');
    }
    
    // Check phase changes
    if (oldState.phase !== newState.phase) {
      changes.push('phase_changed');
    }
    
    // Check timer changes
    if (oldState.timeRemaining !== newState.timeRemaining) {
      changes.push('timer_changed');
    }
    
    return {
      hasChanges: changes.length > 0,
      changes
    };
  }, []);

  // Interpolation calculations
  const interpolatePosition = useCallback((startPos: any, endPos: any, progress: number) => {
    if (!startPos || !endPos) return startPos;
    
    return {
      x: startPos.x + (endPos.x - startPos.x) * progress,
      y: startPos.y + (endPos.y - startPos.y) * progress,
      nodeIndex: progress >= 1 ? endPos.nodeIndex : startPos.nodeIndex
    };
  }, []);

  const calculateTransitionProgress = useCallback((startTime: number, duration: number, currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = elapsed / duration;
    return Math.min(1, Math.max(0, progress));
  }, []);

  // Reconnection logic
  const handleConnectionLoss = useCallback(() => {
    setIsConnected(false);
    setReconnectionAttempts(prev => prev + 1);
  }, []);

  const handleReconnection = useCallback(() => {
    setIsConnected(true);
    setReconnectionAttempts(0);
  }, []);

  const shouldAttemptReconnection = reconnectionAttempts < 5;



  // Main synchronization logic
  useEffect(() => {
    if (!battleState) return;



    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastUpdateTimeRef.current;
    
        // Detect state changes
    const stateDiff = detectStateDiff(lastState, battleState);
    
    if (stateDiff.hasChanges) {
      // Start interpolation if we have a previous state
      if (lastState) {
        setInterpolationState({
          isInterpolating: true,
          startTime: currentTime,
          duration: 1000,
          startState: lastState,
          endState: battleState
        });
      }
    }
    
    setLastState(battleState);
    lastUpdateTimeRef.current = currentTime;
  }, [battleState, lastState, detectStateDiff]);

  // Animation loop for interpolation
  useEffect(() => {
    if (!interpolationState.isInterpolating) return;

    const animate = () => {
      const currentTime = Date.now();
      const progress = calculateTransitionProgress(
        interpolationState.startTime,
        interpolationState.duration,
        currentTime
      );

      if (progress >= 1) {
        setInterpolationState(prev => ({ ...prev, isInterpolating: false }));
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [interpolationState.isInterpolating, interpolationState.startTime, interpolationState.duration, calculateTransitionProgress]);

  // Connection monitoring
  useEffect(() => {
    if (error) {
      handleConnectionLoss();
    } else if (!isConnected && !error) {
      handleReconnection();
    }
  }, [error, isConnected, handleConnectionLoss, handleReconnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Data orchestration logic - use server data only
  const displayBattalions = battleState?.battalions || [];
  
  // Use server node data with proper client positioning
  const displayNodes = useMemo(() => {
    if (battleState?.nodes) {
      // Get proper node positions using the established positioning logic
      const positionedNodes = calculateNodePositions(SCREEN_WIDTH, SCREEN_HEIGHT, 125);
      
      // Merge server data with client positioning
      return battleState.nodes.map((serverNode, index) => {
        const positionedNode = positionedNodes[index];
        if (positionedNode) {
          return {
            index: serverNode.index as NodeIndex,
            position: positionedNode.position, // Use proper positioning
            owner: serverNode.owner,
            health: serverNode.health,
            captureProgress: serverNode.captureProgress,
          };
        }
        return null;
      }).filter(Boolean); // Remove any null entries
    }
    return []; // No fallback - require server data
  }, [battleState?.nodes]);

  return {
    // State
    battleState,
    isLoading,
    error,
    isConnected,
    reconnectionAttempts,
    shouldAttemptReconnection,
    
    // Data orchestration
    displayBattalions,
    displayNodes,
    
    // Interpolation
    interpolationState,
    interpolatePosition,
    calculateTransitionProgress,
    
    // Connection management
    handleConnectionLoss,
    handleReconnection,
    
    // Utilities
    detectStateDiff
  };
}; 