import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LevelSection } from '../../../src/components/botAssembly/LevelSection';

describe('LevelSection', () => {
  const defaultProps = {
    level: 1,
    selectedType: null,
    botCounts: {
      breacher: 0,
      guardian: 0,
      phreak: 0
    },
    onSelectBotType: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render mark level title', () => {
    const { getByText } = render(<LevelSection {...defaultProps} />);
    expect(getByText('MARK 1')).toBeTruthy();
  });

  it('should render all bot types for the level', () => {
    const { getByText } = render(<LevelSection {...defaultProps} />);
    expect(getByText('BREACHER')).toBeTruthy();
    expect(getByText('GUARDIAN')).toBeTruthy();
    expect(getByText('PHREAK')).toBeTruthy();
  });

  it('should allow bot selection only for level 1', () => {
    const { getAllByTestId } = render(<LevelSection {...defaultProps} />);
    const botCards = getAllByTestId('bot-card');
    
    fireEvent.press(botCards[0]); // Press breacher
    expect(defaultProps.onSelectBotType).toHaveBeenCalledWith('breacher');
  });

  it('should show locked state for higher levels', () => {
    const { getAllByTestId } = render(
      <LevelSection {...defaultProps} level={2} />
    );
    
    const lockedCards = getAllByTestId('bot-card-locked');
    expect(lockedCards).toHaveLength(3);
  });

  it('should display correct bot counts', () => {
    const props = {
      ...defaultProps,
      botCounts: {
        breacher: 5,
        guardian: 3,
        phreak: 1
      }
    };
    
    const { getByText } = render(<LevelSection {...props} />);
    expect(getByText('5')).toBeTruthy(); // breacher count
    expect(getByText('3')).toBeTruthy(); // guardian count
    expect(getByText('1')).toBeTruthy(); // phreak count
  });

  it('should highlight selected bot type', () => {
    const { getByTestId } = render(
      <LevelSection {...defaultProps} selectedType="breacher" />
    );
    expect(getByTestId('bot-card-breacher')).toHaveStyle({
      borderColor: expect.any(String)
    });
  });
}); 