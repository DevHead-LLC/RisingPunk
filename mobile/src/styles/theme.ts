import { Dimensions, Platform } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// Device-specific scaling factors
const getDeviceScaleFactor = () => {
  const screenHeight = Math.max(WINDOW_WIDTH, WINDOW_HEIGHT);
  
  // iPhone 12 and similar smaller devices
  if (screenHeight <= 844) {
    return 0.85;
  }
  
  // iPhone 13/14/15
  if (screenHeight <= 932) {
    return 0.9;
  }
  
  // iPhone 16 and larger
  if (screenHeight > 932) {
    return 1.0;
  }
  
  return 0.9; // Default fallback
};

const deviceScaleFactor = getDeviceScaleFactor();

// Responsive sizing that scales based on device
const createResponsiveSize = (baseSize: number) => Math.round(baseSize * deviceScaleFactor);

type ThemeSizing = {
  font: {
    h1: number;
    h2: number;
    body: number;
    small: number;
    large: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  screen: {
    width: number;
    height: number;
    padding: {
      horizontal: number;
      vertical: number;
    };
    maxContentWidth: number;
    scaleFactor: number;
  };
};

export const COLORS = {
  background: '#0E0B16',
  primary: '#A239CA',
  secondary: '#4717F6',
  accent: '#1A1625',
  inputBg: '#201C2B',
  buttonBg: '#2D2640',
  buttonDisabled: 'rgba(0, 255, 65, 0.05)',
  matrix: '#00FF41',
  text: {
    primary: '#A239CA',
    secondary: '#4717F6',
    accent: '#00FF41',
    placeholder: 'rgba(0, 255, 65, 0.4)',
  },
  error: '#ff4444',
  neutral: '#666666',
};

export const SIZING: ThemeSizing = {
  font: {
    h1: createResponsiveSize(76),
    h2: createResponsiveSize(24),
    body: createResponsiveSize(16),
    small: createResponsiveSize(14),
    large: createResponsiveSize(22),
  },
  spacing: {
    xs: createResponsiveSize(4),
    sm: createResponsiveSize(8),
    md: createResponsiveSize(16),
    lg: createResponsiveSize(24),
  },
  screen: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    padding: {
      horizontal: createResponsiveSize(20),
      vertical: createResponsiveSize(10),
    },
    maxContentWidth: 800,
    scaleFactor: deviceScaleFactor,
  },
};

export const styleGuide = {
  matrixGlow: {
    textShadowColor: 'rgba(0, 255, 65, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
  },
  inputField: {
    height: createResponsiveSize(48),
    backgroundColor: COLORS.inputBg,
    color: COLORS.primary,
    paddingHorizontal: createResponsiveSize(15),
    fontSize: SIZING.font.body,
    borderWidth: 1,
    borderColor: COLORS.buttonBg,
  },
  cornerDecoration: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    width: createResponsiveSize(10),
    height: createResponsiveSize(10),
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.primary,
  },
};

export type ThemeColors = typeof COLORS;
