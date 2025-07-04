// Pure movement utilities for battalion movement logic
// No React Native or UI imports allowed

export function calculateMovementDistance(
  currentPos: { x: number; y: number },
  target: { type: string; index: number; position: { x: number; y: number } },
  range: number,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[],
  botCategories?: any,
  rangeMultiplier?: number
): {
  moveDistance: number;
  directionX: number;
  directionY: number;
  updatedDistance: number;
  rangePosition: { x: number; y: number };
} {
  // Recalculate distance and direction after potential target position updates
  const updatedDx = target.position.x - currentPos.x;
  const updatedDy = target.position.y - currentPos.y;
  const updatedDistance = Math.sqrt(updatedDx * updatedDx + updatedDy * updatedDy);

  if (isNaN(updatedDistance) || updatedDistance === 0) {
    return { moveDistance: 0, directionX: 0, directionY: 0, updatedDistance: 0, rangePosition: currentPos };
  }

  const directionX = updatedDx / updatedDistance;
  const directionY = updatedDy / updatedDistance;

  let moveDistance: number;
  if (target.type === 'node') {
    const optimalDistance = range;
    if (updatedDistance <= range) {
      moveDistance = 0;
    } else {
      moveDistance = updatedDistance - optimalDistance;
    }
  } else {
    // For pure logic, we don't use botCategories or rangeMultiplier unless provided
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];

    if (!enemyBattalion) {
      return { moveDistance: 0, directionX: 0, directionY: 0, updatedDistance: 0, rangePosition: currentPos };
    }

    let enemyRange = 0;
    if (botCategories && rangeMultiplier) {
      enemyRange = botCategories[enemyBattalion.type]?.stats.range * rangeMultiplier;
    }

    const optimalDistance = range;
    if (updatedDistance <= range) {
      moveDistance = 0;
    } else {
      moveDistance = updatedDistance - optimalDistance;
    }
  }

  const rangePosition = {
    x: currentPos.x + (directionX * moveDistance),
    y: currentPos.y + (directionY * moveDistance)
  };

  return { moveDistance, directionX, directionY, updatedDistance, rangePosition };
}

export function handleMovementDecision(
  currentPos: { x: number; y: number },
  target: any,
  range: number,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[],
  botCategories?: any,
  rangeMultiplier?: number
): {
  shouldAttack: boolean;
  moveDistance: number;
  directionX: number;
  directionY: number;
  updatedDistance: number;
  rangePosition: { x: number; y: number };
} {
  const movementResult = calculateMovementDistance(
    currentPos,
    target,
    range,
    isUser,
    userBattalions,
    enemyBattalions,
    botCategories,
    rangeMultiplier
  );

  const { updatedDistance, rangePosition, moveDistance, directionX, directionY } = movementResult;

  return {
    shouldAttack: updatedDistance <= range,
    moveDistance,
    directionX,
    directionY,
    updatedDistance,
    rangePosition
  };
} 