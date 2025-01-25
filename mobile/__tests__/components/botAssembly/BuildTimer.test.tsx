import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildTimer } from '../../../src/components/botAssembly/BuildTimer';
import { BotsContext } from '../../../src/context/BotsContext';

describe('BuildTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultProps = {
    quantity: 5,
    buildTimePerUnit: 1000,
    progress: 40,
  };

  const mockBotsContext = {
    buildStartTime: new Date(),
    totalBuildQuantity: 5,
    buildingProgress: 40,
    selectedType: null,
    botCounts: {
      breacher: 0,
      guardian: 0,
      phreak: 0
    },
    setBuildingProgress: jest.fn(),
    startBuilding: jest.fn(),
    setBotCounts: jest.fn(),
    setSelectedType: jest.fn(),
    selectBotType: jest.fn()
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  it('should display correct progress count', () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper });
    // At 40% progress of 5 total = 2 bots built
    expect(getByText('2/5')).toBeTruthy();
  });

  it('should display time remaining', () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper });
    // With 60% remaining of 5 bots at 1000ms each = 4000ms = 4s
    expect(getByText('4s remaining')).toBeTruthy();
  });

  it('should handle zero quantity', () => {
    const { getByText } = render(
      <BuildTimer {...defaultProps} quantity={0} progress={0} />,
      { wrapper }
    );
    expect(getByText('0/5')).toBeTruthy();
  });

  it('should handle 100% progress', () => {
    const { getByText } = render(
      <BuildTimer {...defaultProps} progress={100} />,
      { wrapper }
    );
    expect(getByText('5/5')).toBeTruthy();
    expect(getByText('4s remaining')).toBeTruthy();
  });
}); 