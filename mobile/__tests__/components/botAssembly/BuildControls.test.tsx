import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BuildControls } from '../../../src/components/botAssembly/BuildControls';

describe('BuildControls', () => {
  const mockProps = {
    selectedType: 'breacher' as const,
    buildingProgress: null,
    quantity: '1',
    onQuantityChange: jest.fn(),
    onBuild: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable build button when no bot type is selected', () => {
    const { getByText } = render(
      <BuildControls {...mockProps} selectedType={null} />
    );
    const buildButton = getByText('BUILD');
    expect(buildButton.parent?.props.disabled).toBe(true);
  });

  it('should disable input when building is in progress', () => {
    const { getByPlaceholderText } = render(
      <BuildControls {...mockProps} buildingProgress={50} />
    );
    const input = getByPlaceholderText('Qty');
    expect(input.props.editable).toBe(false);
  });

  it('should call onQuantityChange when input value changes', () => {
    const { getByPlaceholderText } = render(<BuildControls {...mockProps} />);
    fireEvent.changeText(getByPlaceholderText('Qty'), '5');
    expect(mockProps.onQuantityChange).toHaveBeenCalledWith('5');
  });

  it('should call onBuild when build button is pressed', () => {
    const { getByText } = render(<BuildControls {...mockProps} />);
    fireEvent.press(getByText('BUILD'));
    expect(mockProps.onBuild).toHaveBeenCalled();
  });

  it('should show loading state while build initializes', async () => {
    const { getByText } = render(<BuildControls {...mockProps} />);
    fireEvent.press(getByText('BUILD'));
    expect(getByText('Building...')).toBeTruthy();
  });

  it('should handle build initialization errors', async () => {
    mockProps.onBuild.mockRejectedValueOnce(new Error('Build failed'));
    const { getByText } = render(<BuildControls {...mockProps} />);
    fireEvent.press(getByText('BUILD'));
    expect(getByText('Error: Build failed')).toBeTruthy();
  });

  it('should validate build parameters before sending', () => {
    const { getByText } = render(
      <BuildControls {...mockProps} quantity="0" />
    );
    fireEvent.press(getByText('BUILD'));
    expect(mockProps.onBuild).not.toHaveBeenCalled();
    expect(getByText('Invalid quantity')).toBeTruthy();
  });

  it('should validate inputs before sending build request', () => {
    const { getByText, getByTestId } = render(
      <BuildControls {...mockProps} quantity="0" />
    );
    
    fireEvent.press(getByText('BUILD'));
    
    expect(mockProps.onBuild).not.toHaveBeenCalled();
    expect(getByTestId('error-message')).toHaveTextContent('Quantity must be greater than 0');
  });

  it('should show loading state during build initialization', async () => {
    const { getByText } = render(
      <BuildControls {...mockProps} buildingProgress={0} />
    );
    
    expect(getByText('Initializing Build...')).toBeTruthy();
    expect(getByText('BUILD').props.disabled).toBeTruthy();
  });

  it('should display server errors', () => {
    mockProps.onBuild.mockRejectedValue(new Error('Insufficient resources'));
    const { getByTestId, getByText } = render(
      <BuildControls {...mockProps} />
    );
    
    fireEvent.press(getByText('BUILD'));
    expect(getByTestId('error-message')).toHaveTextContent('Insufficient resources');
  });

  it('should disable controls during active build', () => {
    const { getByTestId, getByText } = render(
      <BuildControls {...mockProps} buildingProgress={50} />
    );
    
    expect(getByTestId('quantity-input').props.editable).toBeFalsy();
    expect(getByText('BUILD').props.disabled).toBeTruthy();
  });
}); 