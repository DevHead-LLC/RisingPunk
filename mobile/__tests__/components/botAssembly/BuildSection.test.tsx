import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildSection } from '../../../src/components/botAssembly/BuildSection';
import { BotsContext } from '../../../src/context/BotsContext';

describe('BuildSection', () => {
  const defaultProps = {
    selectedType: 'breacher' as const,
    buildingProgress: null,
    quantity: '1',
    onQuantityChange: jest.fn(),
    onBuild: jest.fn(),
    botCost: 1
  };

  const mockBotsContext = {
    buildStartTime: null,
    totalBuildQuantity: 0,
    buildingProgress: null,
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    selectedType: null,
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    setBuildingProgress: jest.fn(),
    setBotCounts: jest.fn(),
    setSelectedType: jest.fn()
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  it('should display build controls title', () => {
    const { getByText } = render(<BuildSection {...defaultProps} />, { wrapper });
    expect(getByText('BUILD CONTROLS')).toBeTruthy();
  });

  it('should show selected bot type', () => {
    const { getByText } = render(<BuildSection {...defaultProps} />, { wrapper });
    expect(getByText('BREACHER')).toBeTruthy();
  });

  it('should show "NO BOT SELECTED" when no type selected', () => {
    const { getByText } = render(
      <BuildSection {...defaultProps} selectedType={null} />,
      { wrapper }
    );
    expect(getByText('NO BOT SELECTED')).toBeTruthy();
  });

  it('should show build progress components when building', () => {
    const { getByTestId } = render(
      <BuildSection {...defaultProps} buildingProgress={50} />,
      { wrapper }
    );
    expect(getByTestId('build-timer')).toBeTruthy();
    expect(getByTestId('build-progress-bar')).toBeTruthy();
  });

  it('should not show progress components when not building', () => {
    const { queryByTestId } = render(<BuildSection {...defaultProps} />, { wrapper });
    expect(queryByTestId('build-timer')).toBeNull();
    expect(queryByTestId('build-progress-bar')).toBeNull();
  });
}); 