import { useState, useEffect, useRef, useCallback } from 'react';
import { useGetBattleStateQuery, BattleState } from '../store/api/battleApi';

interface InterpolationState {
  isInterpolating: boolean;
  startTime: number;
  duration: number;
  startState: BattleState | null;
  endState: BattleState | null;
}

export const useBattleSync = (battleId: string) => {
  const { data: battleState, isLoading, error } = useGetBattleStateQuery(battleId);
  
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
    
    // Check battalion changes
    if (oldState.battalions.length !== newState.battalions.length) {
      changes.push('battalion_count_changed');
    }
    
    // Check node changes
    const nodeChanges = newState.nodes.some((node, index) => {
      const oldNode = oldState.nodes[index];
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

  // Performance tracking
  const logBattleEvent = useCallback((eventType: string, data: any) => {
    console.log(`[BattleSync] ${eventType}:`, data);
  }, []);

  // Main synchronization logic
  useEffect(() => {
    if (!battleState) return;

    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastUpdateTimeRef.current;
    
    // Detect state changes
    const stateDiff = detectStateDiff(lastState, battleState);
    
    if (stateDiff.hasChanges) {
      logBattleEvent('state_changed', {
        changes: stateDiff.changes,
        timeSinceLastUpdate
      });
      
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
  }, [battleState, lastState, detectStateDiff, logBattleEvent]);

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

  return {
    // State
    battleState,
    isLoading,
    error,
    isConnected,
    reconnectionAttempts,
    shouldAttemptReconnection,
    
    // Interpolation
    interpolationState,
    interpolatePosition,
    calculateTransitionProgress,
    
    // Connection management
    handleConnectionLoss,
    handleReconnection,
    
    // Utilities
    detectStateDiff,
    logBattleEvent
  };
}; 