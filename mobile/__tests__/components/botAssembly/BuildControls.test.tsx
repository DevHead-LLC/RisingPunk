import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BuildControls } from '../../../src/components/botAssembly/BuildControls';

describe('BuildControls', () => {
  const mockProps = {
    selectedType: 'breacher' as const,
    buildingProgress: null,
    quantity: '1',
    onQuantityChange: jest.fn(),
    onBuild: jest.fn(),
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
}); 