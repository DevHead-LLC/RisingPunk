import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BattleTimerDisplay } from '../../src/components/battle/BattleTimerDisplay';

describe('BattleTimerDisplay - Server-Client Coordination', () => {
  it('should display correct timer text for 45-second battle from server', () => {
    const maxBattleTime = 45;
    
    // Test cases simulating server-sent timeRemaining values
    const testCases = [
      { battleTime: 45, expectedText: '45s' }, // Start of battle (timeRemaining from server)
      { battleTime: 35, expectedText: '35s' }, // 10 seconds elapsed (timeRemaining from server)
      { battleTime: 25, expectedText: '25s' }, // 20 seconds elapsed (timeRemaining from server)
      { battleTime: 15, expectedText: '15s' }, // 30 seconds elapsed (timeRemaining from server)
      { battleTime: 5, expectedText: '5s' },   // 40 seconds elapsed (timeRemaining from server)
      { battleTime: 0, expectedText: '0s' },   // End of battle (timeRemaining from server)
    ];

    testCases.forEach(({ battleTime, expectedText }) => {
      render(
        <BattleTimerDisplay
          battleTime={battleTime} // This is timeRemaining from server
          maxBattleTime={maxBattleTime}
          isVisible={true}
        />
      );

      expect(screen.getByText(expectedText)).toBeTruthy();
    });
  });

  it('should display system breach status text', () => {
    render(
      <BattleTimerDisplay
        battleTime={25} // Example time remaining from server
        maxBattleTime={45}
        isVisible={true}
      />
    );

    expect(screen.getByText('SYSTEM BREACH IN PROGRESS')).toBeTruthy();
  });
}); 