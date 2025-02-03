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