import { StyleSheet, Dimensions } from 'react-native';
import { ThemeColors } from './theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const battleGridStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  battleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
  },
  botInfoContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
  },
  botInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  botInfoText: {
    fontSize: 12,
    marginBottom: 4,
  },
  battalionStatsContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
  },
  battalionStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  battalionStatsText: {
    fontSize: 12,
  },
  battalionInfoContainer: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  battalionInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  battalionInfoText: {
    fontSize: 12,
  },
});

export const createThemeAwareBattleGridStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  battleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondary,
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    marginBottom: 5,
  },
  errorSubtext: {
    color: colors.neutral,
    fontSize: 14,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.text.primary,
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
  },
  botInfoContainer: {
    backgroundColor: colors.secondary + '1A', // 10% opacity
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  botInfoTitle: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  botInfoText: {
    color: colors.text.primary,
    fontSize: 12,
    marginBottom: 4,
  },
  battalionStatsContainer: {
    backgroundColor: '#FFC107' + '1A', // 10% opacity
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  battalionStatsTitle: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  battalionStatsText: {
    color: colors.text.primary,
    fontSize: 12,
  },
  battalionInfoContainer: {
    backgroundColor: colors.error + '1A', // 10% opacity
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  battalionInfoTitle: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  battalionInfoText: {
    color: colors.text.primary,
    fontSize: 12,
  },
});
