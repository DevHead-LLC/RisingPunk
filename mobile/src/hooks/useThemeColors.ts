import { useTheme } from '../context/ThemeContext';
import { DARK_COLORS, LIGHT_COLORS } from '../styles/theme';

export const useThemeColors = () => {
  const { themeMode } = useTheme();
  const colors = themeMode === 'light' ? LIGHT_COLORS : DARK_COLORS;
  return colors;
};
