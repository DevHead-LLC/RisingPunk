import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ResponsiveDimensions {
  width: number;
  height: number;
  scaleFactor: number;
  isSmallDevice: boolean;
  isMediumDevice: boolean;
  isLargeDevice: boolean;
}

export const useResponsiveDimensions = (): ResponsiveDimensions => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const screenHeight = Math.max(dimensions.width, dimensions.height);
  
  // Device-specific scaling factors
  let scaleFactor = 0.9; // Default fallback
  
  if (screenHeight <= 844) {
    // iPhone 12 and similar smaller devices
    scaleFactor = 0.85;
  } else if (screenHeight <= 932) {
    // iPhone 13/14/15
    scaleFactor = 0.9;
  } else if (screenHeight > 932) {
    // iPhone 16 and larger
    scaleFactor = 1.0;
  }

  const isSmallDevice = screenHeight <= 844;
  const isMediumDevice = screenHeight > 844 && screenHeight <= 932;
  const isLargeDevice = screenHeight > 932;

  return {
    width: dimensions.width,
    height: dimensions.height,
    scaleFactor,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
  };
};
