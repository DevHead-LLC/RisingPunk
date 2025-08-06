import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BattleEndOverlay } from '../src/components/battle/BattleEndOverlay';
import { BattleOverlayManager } from '../src/components/battle/BattleOverlayManager';
import { NodeOwner } from '../src/types/battleTypes';

// Mock the useBattleState hook
jest.mock('../src/hooks/useBattleState', () => ({
  useBattleState: jest.fn(),
}));

describe('Battle End Overlay', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Overlay Component', () => {
    it('should render overlay with "User Wins!" when user wins', () => {
      render(
        <BattleEndOverlay 
          winner={NodeOwner.USER} 
          onContinue={mockOnContinue} 
        />
      );

      // Verify the overlay is rendered
      expect(screen.getByTestId('battle-end-overlay')).toBeTruthy();
      
      // Verify the title is displayed
      expect(screen.getByText('BATTLE COMPLETE')).toBeTruthy();
      
      // Verify winner text is displayed
      expect(screen.getByTestId('winner-display')).toBeTruthy();
      expect(screen.getByText('User Wins!')).toBeTruthy();
      
      // Verify continue button is present
      expect(screen.getByTestId('continue-button')).toBeTruthy();
      expect(screen.getByText('Continue')).toBeTruthy();
    });

    it('should render overlay with "Enemy Wins!" when enemy wins', () => {
      render(
        <BattleEndOverlay 
          winner={NodeOwner.ENEMY} 
          onContinue={mockOnContinue} 
        />
      );

      // Verify the overlay is rendered
      expect(screen.getByTestId('battle-end-overlay')).toBeTruthy();
      
      // Verify the title is displayed
      expect(screen.getByText('BATTLE COMPLETE')).toBeTruthy();
      
      // Verify winner text is displayed
      expect(screen.getByTestId('winner-display')).toBeTruthy();
      expect(screen.getByText('Enemy Wins!')).toBeTruthy();
      
      // Verify continue button is present
      expect(screen.getByTestId('continue-button')).toBeTruthy();
      expect(screen.getByText('Continue')).toBeTruthy();
    });

    it('should call onContinue when continue button is pressed', () => {
      render(
        <BattleEndOverlay 
          winner={NodeOwner.USER} 
          onContinue={mockOnContinue} 
        />
      );

      // Find and press the continue button
      const continueButton = screen.getByTestId('continue-button');
      fireEvent.press(continueButton);

      // Verify the callback was called
      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('should display correct winner text for both user and enemy', () => {
      // Test user winner
      const { rerender } = render(
        <BattleEndOverlay 
          winner={NodeOwner.USER} 
          onContinue={mockOnContinue} 
        />
      );
      expect(screen.getByText('User Wins!')).toBeTruthy();

      // Test enemy winner
      rerender(
        <BattleEndOverlay 
          winner={NodeOwner.ENEMY} 
          onContinue={mockOnContinue} 
        />
      );
      expect(screen.getByText('Enemy Wins!')).toBeTruthy();
    });
  });

  describe('Battle Overlay Manager Integration', () => {
    const mockUseBattleState = require('../src/hooks/useBattleState').useBattleState;

    it('should show battle end overlay when battle is complete and user wins', () => {
      // Mock battle state with complete phase and user winner
      mockUseBattleState.mockReturnValue({
        data: {
          battleId: 'test-battle',
          phase: 'complete',
          winner: 'user',
          timeRemaining: 0,
        },
        isLoading: false,
        error: null,
      });

      render(
        <BattleOverlayManager 
          battleId="test-battle"
          onClose={mockOnContinue}
        />
      );

      // Verify the battle end overlay is rendered
      expect(screen.getByTestId('battle-end-overlay')).toBeTruthy();
      expect(screen.getByText('BATTLE COMPLETE')).toBeTruthy();
      expect(screen.getByText('User Wins!')).toBeTruthy();
    });

    it('should show battle end overlay when battle is complete and enemy wins', () => {
      // Mock battle state with complete phase and enemy winner
      mockUseBattleState.mockReturnValue({
        data: {
          battleId: 'test-battle',
          phase: 'complete',
          winner: 'enemy',
          timeRemaining: 0,
        },
        isLoading: false,
        error: null,
      });

      render(
        <BattleOverlayManager 
          battleId="test-battle"
          onClose={mockOnContinue}
        />
      );

      // Verify the battle end overlay is rendered
      expect(screen.getByTestId('battle-end-overlay')).toBeTruthy();
      expect(screen.getByText('BATTLE COMPLETE')).toBeTruthy();
      expect(screen.getByText('Enemy Wins!')).toBeTruthy();
    });

    it('should not show battle end overlay when battle is not complete', () => {
      // Mock battle state with active phase
      mockUseBattleState.mockReturnValue({
        data: {
          battleId: 'test-battle',
          phase: 'active',
          timeRemaining: 30,
        },
        isLoading: false,
        error: null,
      });

      render(
        <BattleOverlayManager 
          battleId="test-battle"
          onClose={mockOnContinue}
        />
      );

      // Verify the battle end overlay is NOT rendered
      expect(screen.queryByTestId('battle-end-overlay')).toBeNull();
      expect(screen.queryByText('BATTLE COMPLETE')).toBeNull();
    });
  });
}); 