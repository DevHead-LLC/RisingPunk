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

  const mockBotsContext = {
    buildStartTime: new Date(),
    totalBuildQuantity: 5,
    buildingProgress: 40,
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    selectedType: null,
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    setBuildingProgress: jest.fn(),
    setBotCounts: jest.fn(),
    setSelectedType: jest.fn()
  };

  const defaultProps = {
    quantity: 5,
    buildTimePerUnit: 1000,
    progress: 40
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  it('should display correct progress count', () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper });
    expect(getByText('2/5')).toBeTruthy();
  });

  it('should display time remaining', () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper });
    expect(getByText('3s remaining')).toBeTruthy();
  });

  it('should handle zero progress', () => {
    const { getByText } = render(
      <BuildTimer {...defaultProps} progress={0} />,
      { wrapper }
    );
    expect(getByText('0/5')).toBeTruthy();
    expect(getByText('5s remaining')).toBeTruthy();
  });

  it('should handle complete progress', () => {
    const { getByText } = render(
      <BuildTimer {...defaultProps} progress={100} />,
      { wrapper }
    );
    expect(getByText('5/5')).toBeTruthy();
    expect(getByText('Complete')).toBeTruthy();
  });

  it('should update time remaining every second', () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper });
    expect(getByText('3s remaining')).toBeTruthy();
    
    jest.advanceTimersByTime(1000);
    expect(getByText('2s remaining')).toBeTruthy();
  });

  it('should handle missing buildStartTime', () => {
    const noStartContext = { ...mockBotsContext, buildStartTime: null };
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <BotsContext.Provider value={noStartContext}>
        {children}
      </BotsContext.Provider>
    );
    
    const { getByText } = render(<BuildTimer {...defaultProps} />, { wrapper: customWrapper });
    expect(getByText('--')).toBeTruthy();
  });

  describe('BuildTimer Memory Management', () => {
    it('should cleanup interval on unmount', () => {
      const { unmount } = render(<BuildTimer progress={50} quantity={5} buildTimePerUnit={1000} />);
      const initialTimers = jest.getTimerCount();
      unmount();
      expect(jest.getTimerCount()).toBe(initialTimers - 1);
    });
  });
});