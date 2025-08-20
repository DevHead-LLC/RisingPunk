import { Dimensions } from 'react-native';

export const getDeviceType = () => {
  const { width, height } = Dimensions.get('window');
  const screenHeight = Math.max(width, height);
  
  if (screenHeight <= 844) {
    return 'small'; // iPhone 12 and similar
  } else if (screenHeight <= 932) {
    return 'medium'; // iPhone 13/14/15
  } else {
    return 'large'; // iPhone 16 and larger
  }
};

export const getScaleFactor = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'small':
      return 0.85;
    case 'medium':
      return 0.9;
    case 'large':
      return 1.0;
    default:
      return 0.9;
  }
};

export const createResponsiveSize = (baseSize: number): number => {
  const scaleFactor = getScaleFactor();
  return Math.round(baseSize * scaleFactor);
};

export const getResponsivePadding = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'small':
      return { horizontal: 16, vertical: 8 };
    case 'medium':
      return { horizontal: 20, vertical: 10 };
    case 'large':
      return { horizontal: 24, vertical: 12 };
    default:
      return { horizontal: 20, vertical: 10 };
  }
};

export const getResponsiveSpacing = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'small':
      return { xs: 3, sm: 6, md: 12, lg: 18 };
    case 'medium':
      return { xs: 4, sm: 8, md: 16, lg: 24 };
    case 'large':
      return { xs: 5, sm: 10, md: 20, lg: 30 };
    default:
      return { xs: 4, sm: 8, md: 16, lg: 24 };
  }
};
