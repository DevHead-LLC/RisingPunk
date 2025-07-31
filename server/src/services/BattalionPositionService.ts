import { IBattalion, BattalionPosition } from '../types/battle';

export class BattalionPositionService {
  static updateBattalionPosition(battalion: IBattalion, finalPosition: BattalionPosition): boolean {
    if (!battalion || !finalPosition) {
      return false;
    }

    const positionChanged = 
      battalion.position.nodeIndex !== finalPosition.nodeIndex || 
      Math.abs(battalion.position.x - finalPosition.x) > 0.1 || 
      Math.abs(battalion.position.y - finalPosition.y) > 0.1;

    if (positionChanged) {
      battalion.position.nodeIndex = finalPosition.nodeIndex;
      battalion.position.x = finalPosition.x;
      battalion.position.y = finalPosition.y;
      return true;
    }

    return false;
  }

  static getFinalPosition(movementState: any): BattalionPosition {
    if (movementState.wasInterrupted && movementState.interruptionPosition) {
      return movementState.interruptionPosition;
    }
    return movementState.targetPosition;
  }

  static isValidPosition(position: BattalionPosition): boolean {
    return position && 
           typeof position.x === 'number' && 
           typeof position.y === 'number' && 
           typeof position.nodeIndex === 'number' &&
           !isNaN(position.x) && 
           !isNaN(position.y) && 
           !isNaN(position.nodeIndex);
  }

  static clonePosition(position: BattalionPosition): BattalionPosition {
    return {
      x: position.x,
      y: position.y,
      nodeIndex: position.nodeIndex
    };
  }

  static calculateDistance(position1: BattalionPosition, position2: BattalionPosition): number {
    const dx = position1.x - position2.x;
    const dy = position1.y - position2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static isAtSameNode(position1: BattalionPosition, position2: BattalionPosition): boolean {
    return position1.nodeIndex === position2.nodeIndex;
  }

  static createStartPosition(battalion: IBattalion, nodePositions: any[]): BattalionPosition {
    const nodePosition = nodePositions[battalion.position.nodeIndex];
    return {
      x: nodePosition.position.x,
      y: nodePosition.position.y,
      nodeIndex: battalion.position.nodeIndex
    };
  }

  static canStartMovement(battalion: IBattalion, nodePositions: any[]): boolean {
    if (!battalion || !nodePositions) {
      return false;
    }

    const nodeIndex = battalion.position.nodeIndex;
    if (nodeIndex < 0 || nodeIndex >= nodePositions.length) {
      return false;
    }

    const nodePosition = nodePositions[nodeIndex];
    if (!nodePosition || !nodePosition.position) {
      return false;
    }

    return this.isValidPosition(battalion.position);
  }

  static createTargetPosition(attackRangePosition: any, targetNode: number): BattalionPosition {
    return {
      x: attackRangePosition.x,
      y: attackRangePosition.y,
      nodeIndex: targetNode
    };
  }

  static createAttackRangePosition(attackRangePosition: any): { x: number; y: number } {
    return {
      x: attackRangePosition.x,
      y: attackRangePosition.y
    };
  }

  static createTargetPositionFromAttackRange(attackRangePosition: any, targetNode: number): BattalionPosition {
    return {
      x: attackRangePosition.x,
      y: attackRangePosition.y,
      nodeIndex: targetNode
    };
  }

  static createTargetPositionFromNode(nodePositions: any[], nextNodeIndex: number): BattalionPosition {
    return {
      x: nodePositions[nextNodeIndex].position.x,
      y: nodePositions[nextNodeIndex].position.y,
      nodeIndex: nextNodeIndex
    };
  }

  static createTargetPositionFromAttackRangeForMovement(attackRangePosition: any, nextNodeIndex: number): BattalionPosition {
    return {
      x: attackRangePosition.x,
      y: attackRangePosition.y,
      nodeIndex: nextNodeIndex
    };
  }

  static createBattalionAtPosition(battalion: IBattalion, nodeIndex: number): IBattalion {
    return {
      ...battalion,
      position: { ...battalion.position, nodeIndex: nodeIndex },
      stats: battalion.stats
    };
  }

  static createStartPositionFromInterruption(interruptionPosition: any, battalionNodeIndex: number): BattalionPosition {
    return {
      x: interruptionPosition.x,
      y: interruptionPosition.y,
      nodeIndex: battalionNodeIndex
    };
  }

  static createTargetPositionFromNodePosition(targetNodePosition: any, interruptionNodeIndex: number): BattalionPosition {
    return {
      x: targetNodePosition.position.x,
      y: targetNodePosition.position.y,
      nodeIndex: interruptionNodeIndex
    };
  }
} 