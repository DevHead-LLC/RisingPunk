interface ArmyComposition {
  breacher: number;
  guardian: number;
  phreak: number;
}

// Future implementation
interface BattleResult {
  winner: 'attacker' | 'defender';
  remainingForces: {
    attacker: ArmyComposition;
    defender: ArmyComposition;
  };
  battleLog: string[];
}

type BattalionType = 'breacher' | 'guardian' | 'phreak';

interface Battalion {
  type: BattalionType;
  quantity: number;
  nodeIndex: number;
}

interface BattleState {
  userBattalions: Battalion[];
  enemyBattalions: Battalion[];
  controlledNodes: number[]; // Indices of nodes controlled by user
}

export const resolveBattle = (state: BattleState) => {
  let userScore = 0;
  let enemyScore = 0;

  // Calculate control points from nodes
  userScore += state.controlledNodes.length * 10;
  enemyScore += (9 - state.controlledNodes.length) * 10;

  // Calculate battalion effectiveness
  state.userBattalions.forEach(battalion => {
    const multiplier = state.controlledNodes.includes(battalion.nodeIndex) ? 1.5 : 1;
    userScore += calculateBattalionPower(battalion) * multiplier;
  });

  state.enemyBattalions.forEach(battalion => {
    const multiplier = !state.controlledNodes.includes(battalion.nodeIndex) ? 1.5 : 1;
    enemyScore += calculateBattalionPower(battalion) * multiplier;
  });

  return {
    winner: userScore >= enemyScore ? 'user' : 'enemy',
    userScore,
    enemyScore,
  };
};

const calculateBattalionPower = (battalion: Battalion) => {
  const basePower = {
    breacher: 8,  // Good at taking nodes
    guardian: 6,  // Good at holding nodes
    phreak: 7,   // Balanced
  };

  return battalion.quantity * basePower[battalion.type];
};

export const checkRangeIntersection = (
  position1: { x: number, y: number },
  position2: { x: number, y: number },
  range: number
): boolean => {
  const dx = position1.x - position2.x;
  const dy = position1.y - position2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // TODO: CLARIFY RANGE INTERSECTION LOGIC - This function checks if two positions are within range
  // For attack range positioning: position1 = battalion_center, position2 = target_center, range = attack_range
  // Current logic: returns true if battalion center is within attack range of target center
  // For proper attack positioning: we want battalion attack range edge to touch target center
  // This means: distance(battalion_center, target_center) should equal attack_range
  // Consider adding a tolerance for floating point precision: Math.abs(distance - range) < tolerance
  return distance <= range;
}; 