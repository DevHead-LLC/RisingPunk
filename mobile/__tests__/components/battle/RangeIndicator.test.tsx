import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { RangeIndicator } from '../../../src/components/battle/RangeIndicator';
import { BattalionPosition } from '../../../src/types/battle';

describe('RangeIndicator', () => {
  // Mock battalion data
  const mockBattalion: BattalionPosition = {
    type: 'guardian' as const,
    nodeIndex: 0,
    position: {
      x: 100,
      y: 100,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      setValue: jest.fn(),
      setOffset: jest.fn(),
      flattenOffset: jest.fn(),
      extractOffset: jest.fn(),
      __getValue: () => ({ x: 100, y: 100 }),
      __attach: jest.fn(),
      __detach: jest.fn(),
      __makeNative: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
      removeAllListeners: jest.fn(),
      stopTracking: jest.fn(),
      track: jest.fn(),
      getLayout: jest.fn(),
      getTranslateTransform: jest.fn(),
      getXY: jest.fn()
    } as any,
    quantity: 1000,
    currentHealth: 14000,
    mark: 1
  };

  it('renders with correct range for guardian type', () => {
    const { getByTestId } = render(
      <RangeIndicator
        battalion={mockBattalion}
        isUser={true}
        opacity={new Animated.Value(1)}
      />
    );

    const rangeCircle = getByTestId('range-circle');
    const styles = rangeCircle.props.style;
    
    // Guardian range is 4, diameter should be 4 * 40 = 160
    expect(styles.width).toBe(160);
    expect(styles.height).toBe(160);
    expect(styles.borderRadius).toBe(80);
  });

  it('renders with correct range for phreak type', () => {
    const phreakBattalion = { ...mockBattalion, type: 'phreak' as const };
    const { getByTestId } = render(
      <RangeIndicator
        battalion={phreakBattalion}
        isUser={true}
        opacity={new Animated.Value(1)}
      />
    );

    const rangeCircle = getByTestId('range-circle');
    const styles = rangeCircle.props.style;
    
    // Phreak range is 9, diameter should be 9 * 40 = 360
    expect(styles.width).toBe(360);
    expect(styles.height).toBe(360);
    expect(styles.borderRadius).toBe(180);
  });

  it('renders with correct range for breacher type', () => {
    const breacherBattalion = { ...mockBattalion, type: 'breacher' as const };
    const { getByTestId } = render(
      <RangeIndicator
        battalion={breacherBattalion}
        isUser={true}
        opacity={new Animated.Value(1)}
      />
    );

    const rangeCircle = getByTestId('range-circle');
    const styles = rangeCircle.props.style;
    
    // Breacher range is 5, diameter should be 5 * 40 = 200
    expect(styles.width).toBe(200);
    expect(styles.height).toBe(200);
    expect(styles.borderRadius).toBe(100);
  });

  it('uses correct colors for user battalion', () => {
    const { getByTestId } = render(
      <RangeIndicator
        battalion={mockBattalion}
        isUser={true}
        opacity={new Animated.Value(1)}
      />
    );

    const rangeCircle = getByTestId('range-circle');
    const styles = rangeCircle.props.style;
    
    expect(styles.backgroundColor).toBe('rgba(0, 255, 0, 0.1)');
  });

  it('uses correct colors for enemy battalion', () => {
    const { getByTestId } = render(
      <RangeIndicator
        battalion={mockBattalion}
        isUser={false}
        opacity={new Animated.Value(1)}
      />
    );

    const rangeCircle = getByTestId('range-circle');
    const styles = rangeCircle.props.style;
    
    expect(styles.backgroundColor).toBe('rgba(255, 0, 0, 0.1)');
  });

  it('positions range circle correctly based on battalion position', () => {
    const { getByTestId } = render(
      <RangeIndicator
        battalion={mockBattalion}
        isUser={true}
        opacity={new Animated.Value(1)}
      />
    );

    const rangeCircle = getByTestId('range-circle');
    const styles = rangeCircle.props.style;
    
    // Guardian range is 4, diameter is 160, so offset should be 80
    expect(styles.transform).toEqual([
      { translateX: 20 }, // 100 - 80
      { translateY: 20 }  // 100 - 80
    ]);
  });
}); 