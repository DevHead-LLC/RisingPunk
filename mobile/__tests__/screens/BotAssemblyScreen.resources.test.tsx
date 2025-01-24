import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';
// import { ResourceContext } from '../../src/context/ResourceContext'; // TODO: Implement ResourceContext

describe('BotAssemblyScreen Resource Management', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = {
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    buildingProgress: null as null | number,
    selectedType: null as null | 'breacher' | 'guardian' | 'phreak',
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    buildStartTime: null as null | Date,
    totalBuildQuantity: 0,
    setBuildingProgress: jest.fn(),
    setBotCounts: jest.fn()
  };

  // TODO: Implement resource management
  // const mockResourceContext = {
  //   resources: {
  //     energy: 1000,
  //     materials: 500
  //   },
  //   updateResources: jest.fn(),
  //   checkResourceAvailability: jest.fn()
  // };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prevent build without sufficient resources', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));

    expect(mockBotsContext.startBuilding).not.toHaveBeenCalled();
  });
}); 