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

// Dark Theme Colors (Current Design)
export const DARK_COLORS = {
  background: '#0E0B16',
  primary: '#A239CA',
  secondary: '#4717F6',
  accent: '#1A1625',
  surface: '#1A1625',
  inputBg: '#201C2B',
  buttonBg: '#2E7D32', // Darker green when enabled
  buttonDisabled: 'rgba(102, 102, 102, 0.6)', // Gray with 0.6 opacity when disabled
  matrix: '#00FF41',
  progressBarBg: '#4A4A4A', // Keep original dark mode progress bar color
  text: {
    primary: '#A239CA',
    secondary: '#4717F6',
    accent: '#00FF41',
    placeholder: 'rgba(0, 255, 65, 0.4)',
  },
  error: '#ff4444',
  success: '#00FF41',
  successDark: '#006400',
  neutral: '#666666',
  border: '#4717F6',
  modalBorder: '#666666',
};

// Light Theme Colors (Optimized for Daylight Viewing)
export const LIGHT_COLORS = {
  background: '#F5F5DC', // Beige - professional, easy on eyes
  primary: '#A239CA', // Keep same pinkish purple as dark mode for "Rising"
  secondary: '#4717F6', // Keep same blue as dark mode for "Punk"
  accent: '#E8E4D9', // Light tan accent
  surface: '#E8E4D9', // Light tan surface for cards/containers
  inputBg: '#F8F6F0', // Off-white with slight beige tint
  buttonBg: '#6A4C93', // Slightly dark purple (just under vibrant full purple)
  buttonDisabled: '#9E9E9E', // Gray-ish box for disabled state
  matrix: '#004D00', // Much darker green for better readability
  progressBarBg: 'rgba(146, 135, 135, 0.67)', // Progress bar background color
  text: {
    primary: '#000000', // Black text for tagline
    secondary: '#2E2E2E', // Dark gray for better contrast on light backgrounds
    accent: '#004D00', // Darker green for "Punk?!" and signup
    placeholder: 'rgba(26, 11, 61, 0.7)', // Darker placeholder with higher opacity
  },
  error: '#B71C1C', // Darker red for better contrast
  success: '#2E7D32', // Dark green for success states
  neutral: '#2E2E2E', // Darker neutral for better readability
  border: '#4717F6', // Blue border for consistency
};

export const COLORS = DARK_COLORS; // Default to dark theme for backward compatibility

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

// Theme-aware style guide
export const createThemeAwareStyleGuide = (isLightMode: boolean) => {
  const colors = isLightMode ? LIGHT_COLORS : DARK_COLORS;
  
  return {
    matrixGlow: {
      textShadowColor: isLightMode ? 'rgba(0, 100, 0, 0.3)' : 'rgba(0, 255, 65, 0.5)', // Darker green glow for light theme
      textShadowOffset: {width: 0, height: 0},
      textShadowRadius: isLightMode ? 8 : 15,
    },
    inputField: {
      height: createResponsiveSize(48),
      backgroundColor: colors.inputBg,
      color: colors.text.primary,
      paddingHorizontal: createResponsiveSize(15),
      fontSize: SIZING.font.body,
      borderWidth: isLightMode ? 2 : 1, // Thicker borders for light theme
      borderColor: isLightMode ? colors.primary + '60' : colors.buttonBg, // 60 = 37% opacity for better visibility
      borderRadius: isLightMode ? 6 : 0, // Rounded corners for light theme
    },
    cornerDecoration: {
      position: 'absolute' as const,
      right: 0,
      top: 0,
      width: createResponsiveSize(10),
      height: createResponsiveSize(10),
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.primary,
    },
  };
};

export type ThemeColors = typeof DARK_COLORS;
export type LightThemeColors = typeof LIGHT_COLORS;
