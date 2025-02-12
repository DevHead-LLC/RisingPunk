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