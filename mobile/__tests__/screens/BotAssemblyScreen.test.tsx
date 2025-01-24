import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';
// import { BalanceContext } from '../../src/context/BalanceContext';

describe('BotAssemblyScreen', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = {
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    buildingProgress: null as null | number,
    selectedType: null,
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    buildStartTime: null,
    totalBuildQuantity: 0,
    setBuildingProgress: jest.fn(),
    setBotCounts: jest.fn()
  };

  // const mockBalanceContext = {
  //   balance: 1000,
  //   addBalance: jest.fn(),
  //   subtractBalance: jest.fn()
  // };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render all sections', () => {
    const { getByText } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    expect(getByText('BOT ASSEMBLY')).toBeTruthy();
    expect(getByText('MARK 1')).toBeTruthy();
    expect(getByText('BUILD CONTROLS')).toBeTruthy();
  });

  it('should handle bot type selection', () => {
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    fireEvent.press(getByTestId('bot-card-breacher'));
    expect(mockBotsContext.selectBotType).toHaveBeenCalledWith('breacher');
  });

  it('should handle quantity changes', () => {
    const { getByPlaceholderText } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Qty'), '5');
    expect(getByPlaceholderText('Qty').props.value).toBe('5');
  });

  it('should handle complete build flow', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Select bot type
    fireEvent.press(getByTestId('bot-card-breacher'));
    expect(mockBotsContext.selectBotType).toHaveBeenCalledWith('breacher');

    // Enter quantity
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    expect(getByTestId('quantity-input').props.value).toBe('5');

    // Verify cost display
    expect(getByText('$5')).toBeTruthy();

    // Start build
    fireEvent.press(getByText('BUILD'));
    expect(mockBotsContext.startBuilding).toHaveBeenCalledWith({
      type: 'breacher',
      quantity: 5
    });

    // Check build progress
    mockBotsContext.buildingProgress = 50;
    expect(getByText('2/5')).toBeTruthy();
    expect(getByText('3s remaining')).toBeTruthy();

    // Verify controls disabled during build
    expect(getByTestId('quantity-input').props.editable).toBe(false);
    expect(getByText('BUILD').props.disabled).toBe(true);

    // Complete build
    mockBotsContext.buildingProgress = 100;
    expect(getByText('Complete')).toBeTruthy();

    // Verify form reset
    expect(getByTestId('quantity-input').props.value).toBe('');
    expect(queryByText('$5')).toBeNull();
  });

  it('should handle build errors', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    mockBotsContext.startBuilding.mockRejectedValue({
      response: { data: { error: 'Insufficient funds' } }
    });

    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));

    expect(getByText('Insufficient funds')).toBeTruthy();
    expect(getByTestId('quantity-input').props.editable).toBe(true);
  });

  it('should persist build state on navigation', () => {
    const { getByText, unmount, rerender } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    mockBotsContext.buildingProgress = 50;
    unmount();
    rerender(<BotAssemblyScreen onClose={mockOnClose} />);

    expect(getByText('2/5')).toBeTruthy();
    expect(getByText('3s remaining')).toBeTruthy();
  });

  it('should prevent interaction during build', () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    mockBotsContext.buildingProgress = 50;

    fireEvent.press(getByTestId('bot-card-breacher'));
    expect(mockBotsContext.selectBotType).not.toHaveBeenCalled();

    fireEvent.press(getByText('BUILD'));
    expect(mockBotsContext.startBuilding).not.toHaveBeenCalled();
  });

  it('should update barracks after build completion', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));

    // Complete build
    mockBotsContext.buildingProgress = 100;
    
    // Verify barracks update
    expect(mockBotsContext.setBotCounts).toHaveBeenCalledWith({
      ...mockBotsContext.botCounts,
      breacher: 5
    });
  });

  // Tests requiring BalanceContext implementation
  // it('should validate balance before building', () => {
  //   const { getByText } = render(<BotAssemblyScreen onClose={mockOnClose} />, {
  //     wrapper: ({ children }) => (
  //       <BalanceContext.Provider value={mockBalanceContext}>
  //         <BotsContext.Provider value={mockBotsContext}>
  //           {children}
  //         </BotsContext.Provider>
  //       </BalanceContext.Provider>
  //     )
  //   });
  //   fireEvent.press(getByText('BUILD'));
  //   expect(mockBotsContext.startBuilding).not.toHaveBeenCalled();
  //   expect(getByText('Insufficient funds')).toBeTruthy();
  // });
});

describe('BotAssemblyScreen Security', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = {
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    buildingProgress: null as null | number,
    selectedType: null,
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    buildStartTime: null,
    totalBuildQuantity: 0,
    setBuildingProgress: jest.fn(),
    setBotCounts: jest.fn()
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  it('should sanitize quantity input', () => {
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    fireEvent.changeText(getByTestId('quantity-input'), '<script>alert(1)</script>');
    expect(getByTestId('quantity-input').props.value).toBe('');
  });

  it('should prevent negative quantities', () => {
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    fireEvent.changeText(getByTestId('quantity-input'), '-5');
    expect(getByTestId('quantity-input').props.value).toBe('5');
  });

  it('should enforce maximum build limits', () => {
    const { getByTestId, getByText } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    fireEvent.changeText(getByTestId('quantity-input'), '1001');
    fireEvent.press(getByText('BUILD'));
    expect(getByText('Maximum build limit is 1000')).toBeTruthy();
  });
}); 