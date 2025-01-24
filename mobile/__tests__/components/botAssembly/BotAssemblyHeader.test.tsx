import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BotAssemblyHeader } from '../../../src/components/botAssembly/BotAssemblyHeader';
// import { BalanceContext } from '../../../src/context/BalanceContext';

describe('BotAssemblyHeader', () => {
  const mockOnClose = jest.fn();
  // const mockBalance = {
  //   balance: 1000,
  //   addBalance: jest.fn(),
  //   subtractBalance: jest.fn()
  // };

  // const wrapper = ({ children }: { children: React.ReactNode }) => (
  //   <BalanceContext.Provider value={mockBalance}>
  //     {children}
  //   </BalanceContext.Provider>
  // );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title', () => {
    const { getByText } = render(<BotAssemblyHeader onClose={mockOnClose} />);
    expect(getByText('BOT ASSEMBLY')).toBeTruthy();
  });

  it('should call onClose when close button is pressed', () => {
    const { getByTestId } = render(<BotAssemblyHeader onClose={mockOnClose} />);
    fireEvent.press(getByTestId('close-button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Tests requiring BalanceContext implementation
  // it('should render balance', () => {
  //   const { getByText } = render(<BotAssemblyHeader onClose={mockOnClose} />, { wrapper });
  //   expect(getByText('$1,000')).toBeTruthy();
  // });

  // it('should format large balances with commas', () => {
  //   const largeBalance = { ...mockBalance, balance: 1000000 };
  //   const customWrapper = ({ children }: { children: React.ReactNode }) => (
  //     <BalanceContext.Provider value={largeBalance}>
  //       {children}
  //     </BalanceContext.Provider>
  //   );
    
  //   const { getByText } = render(<BotAssemblyHeader onClose={mockOnClose} />, { wrapper: customWrapper });
  //   expect(getByText('$1,000,000')).toBeTruthy();
  // });
}); 