import { Dimensions } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

type ThemeColors = {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  inputBg: string;
  buttonBg: string;
  matrix: string;
  text: {
    primary: string;
    secondary: string;
    accent: string;
    placeholder: string;
  };
  error: string;
  buttonDisabled: string;
};

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
  };
};

export const COLORS: ThemeColors = {
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
  error: '#ff4444'
};

export const SIZING: ThemeSizing = {
  font: {
    h1: 76,
    h2: 24,
    body: 16,
    small: 14,
    large: 22,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
  screen: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    padding: {
      horizontal: 20,
      vertical: 10
    },
    maxContentWidth: 800
  }
};

export const styleGuide = {
  matrixGlow: {
    textShadowColor: 'rgba(0, 255, 65, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
  },
  inputField: {
    height: 48,
    backgroundColor: COLORS.inputBg,
    color: COLORS.primary,
    paddingHorizontal: 15,
    fontSize: SIZING.font.body,
    borderWidth: 1,
    borderColor: COLORS.buttonBg,
  },
  cornerDecoration: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    width: 10,
    height: 10,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.primary,
  }
}; 