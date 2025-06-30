import { useCallback } from 'react';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { getConnectedNodes } from '../utils/networkConstants';
import { getAnimatedPosition } from './useMovement';
import { isNeutral, captureNode } from '../utils/nodeOwnership';

// Constants for targeting
const RETARGET_COOLDOWN = 2000; // 2 seconds
const CAPTURE_MEMORY_DURATION = 5000; // 5 seconds

// Add a DEBUG flag to control logging verbosity
const DEBUG = false;

export const useTargeting = (
  nodes: BattleNode[],
  retargetCooldowns: React.MutableRefObject<{ [key: string]: number }>,
  recentlyCapturedNodes: React.MutableRefObject<Set<number>>,
  battalionsRef: React.MutableRefObject<{ user: BattalionPosition[]; enemy: BattalionPosition[] }>,
  findBattalionIndexAndId: (battalion: BattalionPosition, isUser: boolean, userBattalions: BattalionPosition[], enemyBattalions: BattalionPosition[]) => { battalionIndex: number; battalionId: string },
  moveBattalionAlongPath: (battalion: BattalionPosition, target: BattleTarget, isUser: boolean, userBattalions?: BattalionPosition[], enemyBattalions?: BattalionPosition[]) => void
) => {
  const findAvailableTargets = useCallback((
    battalion: BattalionPosition,
    isUser: boolean,
    userBattalions: BattalionPosition[],
    enemyBattalions: BattalionPosition[]
  ): BattleTarget[] => {
    if (!battalion || battalion.quantity <= 0 || battalion.currentHealth <= 0) return [];
    if (!nodes || !Array.isArray(nodes)) return [];
    
    const currentPos = getAnimatedPosition(battalion.position);
    const allTargets: BattleTarget[] = [];
    
    // Collect all neutral nodes as possible targets
    nodes.forEach((node, index) => {
      if (!node) return;
      if (!isNeutral(index)) return;
      if (index === battalion.nodeIndex) return;
      const distance = Math.sqrt(
        Math.pow(node.x - currentPos.x, 2) + 
        Math.pow(node.y - currentPos.y, 2)
      );
      if (!isNaN(distance)) {
        allTargets.push({
          type: 'node',
          index,
          distance,
          position: { x: node.x, y: node.y }
        });
      }
    });

    // Collect all valid enemy battalions as possible targets
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    if (enemyBatts && Array.isArray(enemyBatts)) {
      enemyBatts.forEach((enemyBattalion, index) => {
        if (!enemyBattalion || enemyBattalion.quantity <= 0 || enemyBattalion.currentHealth <= 0) {
          return;
        }
        const enemyPos = getAnimatedPosition(enemyBattalion.position);
        const distance = Math.sqrt(
          Math.pow(enemyPos.x - currentPos.x, 2) + 
          Math.pow(enemyPos.y - currentPos.y, 2)
        );
        if (!isNaN(distance)) {
          allTargets.push({
            type: 'battalion',
            index,
            distance,
            position: enemyPos
          });
        }
      });
    }
    
    // Sort all targets by distance
    const validTargets = allTargets
      .filter(target => !isNaN(target.distance))
      .sort((a, b) => a.distance - b.distance);
    
    return validTargets;
  }, [nodes]);

  const findNewTarget = useCallback((battalion: BattalionPosition, isUser: boolean) => {
    if (!battalion || !battalionsRef.current) return;
    
    // Generate battalion ID
    const { battalionId } = findBattalionIndexAndId(battalion, isUser, battalionsRef.current.user, battalionsRef.current.enemy);
    
    // Check cooldown
    const now = Date.now();
    const lastRetarget = retargetCooldowns.current[battalionId] || 0;
    if (now - lastRetarget < RETARGET_COOLDOWN) {
      return; // Still in cooldown
    }
    
    // Get all available targets
    const allTargets = findAvailableTargets(
      battalion,
      isUser,
      battalionsRef.current.user,
      battalionsRef.current.enemy
    );

    if (allTargets.length > 0) {
      const target = allTargets[0]; // Closest target (already sorted by distance)
      // Set cooldown
      retargetCooldowns.current[battalionId] = now;
      moveBattalionAlongPath(
        battalion,
        target,
        isUser,
        battalionsRef.current.user,
        battalionsRef.current.enemy
      );
    }
  }, [nodes, findAvailableTargets, retargetCooldowns, recentlyCapturedNodes, battalionsRef, findBattalionIndexAndId, moveBattalionAlongPath]);

  // Node capture handling with retargeting
  const handleNodeCapture = useCallback((
    nodeIndex: number, 
    newControlState: 'user' | 'enemy',
    nodesRef: React.MutableRefObject<BattleNode[]>,
    CAPTURE_MEMORY_DURATION: number
  ) => {
    // Use new capture function
    captureNode(nodeIndex, newControlState);
    
    // Mark as recently captured to prevent immediate retargeting
    recentlyCapturedNodes.current.add(nodeIndex);
    setTimeout(() => {
      recentlyCapturedNodes.current.delete(nodeIndex);
    }, CAPTURE_MEMORY_DURATION);
    
    // Retarget all battalions
    retargetAllBattalions();
  }, [recentlyCapturedNodes, retargetCooldowns, battalionsRef, findBattalionIndexAndId, moveBattalionAlongPath]);

  // Retarget all battalions after node capture
  const retargetAllBattalions = useCallback(() => {
    if (!battalionsRef.current) return;
    
    // Retarget user battalions
    if (battalionsRef.current.user && Array.isArray(battalionsRef.current.user)) {
      battalionsRef.current.user.forEach((battalion, index) => {
        if (battalion && battalion.quantity > 0 && battalion.currentHealth > 0) {
          findNewTarget(battalion, true);
        }
      });
    }
    
    // Retarget enemy battalions
    if (battalionsRef.current.enemy && Array.isArray(battalionsRef.current.enemy)) {
      battalionsRef.current.enemy.forEach((battalion, index) => {
        if (battalion && battalion.quantity > 0 && battalion.currentHealth > 0) {
          findNewTarget(battalion, false);
        }
      });
    }
  }, [battalionsRef, findNewTarget]);

  // Create a wrapper function for handleNodeCapture with the correct signature
  const createSimplifiedNodeCaptureHandler = useCallback((
    nodesRef: React.MutableRefObject<BattleNode[]>,
    CAPTURE_MEMORY_DURATION: number
  ) => {
    return (nodeIndex: number, newControlState: 'user' | 'enemy') => 
      handleNodeCapture(nodeIndex, newControlState, nodesRef, CAPTURE_MEMORY_DURATION);
  }, [handleNodeCapture]);

  return { findAvailableTargets, findNewTarget, handleNodeCapture, retargetAllBattalions, createSimplifiedNodeCaptureHandler };
}; 