import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BattleLossBreakdown } from '../../../src/components/battle/BattleLossBreakdown';
import { BattalionLossItem } from '../../../src/components/battle/BattalionLossItem';
import { BattleEndData, BattleLosses, BattalionLoss } from '../../../src/store/api/battleApi';

describe('Battle Loss Display Components', () => {
  const createMockBattalionLoss = (
    id: string,
    owner: 'user' | 'enemy',
    type: 'guardian' | 'breacher' | 'phreak',
    mark: number,
    startingQuantity: number,
    endingQuantity: number,
    losses: number
  ): BattalionLoss => ({
    battalionId: id,
    type,
    mark,
    startingQuantity,
    endingQuantity,
    startingPoints: startingQuantity * Math.pow(2, mark - 1),
    endingPoints: endingQuantity * Math.pow(2, mark - 1),
    losses,
    owner
  });

  const createMockBattleLosses = (): BattleLosses => ({
    userLosses: 25,
    enemyLosses: 32,
    winner: 'user',
    userStartingPoints: 100,
    userEndingPoints: 75,
    enemyStartingPoints: 120,
    enemyEndingPoints: 88,
    battalionLosses: [
      createMockBattalionLoss('user-1', 'user', 'guardian', 1, 10, 5, 5),
      createMockBattalionLoss('user-2', 'user', 'breacher', 2, 5, 0, 10),
      createMockBattalionLoss('enemy-1', 'enemy', 'guardian', 1, 8, 2, 6),
      createMockBattalionLoss('enemy-2', 'enemy', 'phreak', 3, 3, 0, 12)
    ],
    victoryMessage: 'Breach defended!',
    endCondition: 'elimination',
    battleDuration: 30
  });

  const createMockBattleEndData = (): BattleEndData => ({
    battleId: 'test-battle',
    winner: 'user',
    losses: createMockBattleLosses(),
    endTime: new Date(),
    phase: 'complete'
  });

  describe('BattalionLossItem', () => {
    it('should display battalion loss information correctly', () => {
      const battalionLoss = createMockBattalionLoss('test-1', 'user', 'guardian', 2, 10, 5, 10);
      
      render(<BattalionLossItem battalionLoss={battalionLoss} />);
      
      expect(screen.getByText('Guardian Mk II')).toBeTruthy();
      expect(screen.getByText('10 → 5')).toBeTruthy();
      expect(screen.getByText('10 losses')).toBeTruthy();
    });

    it('should display destroyed battalion correctly', () => {
      const battalionLoss = createMockBattalionLoss('test-2', 'enemy', 'phreak', 3, 5, 0, 20);
      
      render(<BattalionLossItem battalionLoss={battalionLoss} />);
      
      expect(screen.getByText('Phreak Mk III')).toBeTruthy();
      expect(screen.getByText('5 → 0')).toBeTruthy();
      expect(screen.getByText('20 losses')).toBeTruthy();
    });

    it('should show correct color for user vs enemy battalions', () => {
      const userBattalion = createMockBattalionLoss('user-1', 'user', 'guardian', 1, 10, 5, 5);
      const enemyBattalion = createMockBattalionLoss('enemy-1', 'enemy', 'guardian', 1, 8, 2, 6);
      
      const { rerender } = render(<BattalionLossItem battalionLoss={userBattalion} />);
      const userContainer = screen.getByTestId('battalion-loss-item');
      expect(userContainer.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderLeftColor: '#4717F6' })])
      );
      
      rerender(<BattalionLossItem battalionLoss={enemyBattalion} />);
      const enemyContainer = screen.getByTestId('battalion-loss-item');
      expect(enemyContainer.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderLeftColor: '#FF4141' })])
      );
    });
  });

  describe('BattleLossBreakdown', () => {
    it('should display total losses for both sides', () => {
      const battleEndData = createMockBattleEndData();
      
      render(<BattleLossBreakdown battleEndData={battleEndData} />);
      
      expect(screen.getByText('User Losses: 25')).toBeTruthy();
      expect(screen.getByText('Enemy Losses: 32')).toBeTruthy();
    });

    it('should display victory message correctly', () => {
      const battleEndData = createMockBattleEndData();
      
      render(<BattleLossBreakdown battleEndData={battleEndData} />);
      
      expect(screen.getByText('Breach defended!')).toBeTruthy();
    });

    it('should display battle duration and end condition', () => {
      const battleEndData = createMockBattleEndData();
      
      render(<BattleLossBreakdown battleEndData={battleEndData} />);
      
      expect(screen.getByText('Battle Duration: 30s')).toBeTruthy();
      expect(screen.getByText('End Condition: Elimination')).toBeTruthy();
    });

    it('should display all battalion losses in scrollable list', () => {
      const battleEndData = createMockBattleEndData();
      
      render(<BattleLossBreakdown battleEndData={battleEndData} />);
      
      // Should show all 4 battalion losses
      expect(screen.getAllByText('Guardian Mk I')).toHaveLength(2); // Both user and enemy
      expect(screen.getByText('Breacher Mk II')).toBeTruthy();
      expect(screen.getByText('Phreak Mk III')).toBeTruthy();
    });

    it('should handle complete victory scenario', () => {
      const completeVictoryData: BattleEndData = {
        ...createMockBattleEndData(),
        losses: {
          ...createMockBattleLosses(),
          userLosses: 0,
          enemyLosses: 50,
          victoryMessage: 'Complete Victory!',
          endCondition: 'elimination'
        }
      };
      
      render(<BattleLossBreakdown battleEndData={completeVictoryData} />);
      
      expect(screen.getByText('Complete Victory!')).toBeTruthy();
      expect(screen.getByText('User Losses: 0')).toBeTruthy();
      expect(screen.getByText('Enemy Losses: 50')).toBeTruthy();
    });

    it('should handle timer expiration scenario', () => {
      const timerData: BattleEndData = {
        ...createMockBattleEndData(),
        losses: {
          ...createMockBattleLosses(),
          endCondition: 'timer',
          battleDuration: 45
        }
      };
      
      render(<BattleLossBreakdown battleEndData={timerData} />);
      
      expect(screen.getByText('Battle Duration: 45s')).toBeTruthy();
      expect(screen.getByText('End Condition: Timer')).toBeTruthy();
    });
  });
}); 