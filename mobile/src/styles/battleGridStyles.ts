import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const battleGridStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background
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
    color: '#4717F6',
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: '#FF4141',
    fontSize: 16,
    marginBottom: 5,
  },
  errorSubtext: {
    color: '#666666',
    fontSize: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
  },
  botInfoContainer: {
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4717F6',
  },
  botInfoTitle: {
    color: '#4717F6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  botInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
  battalionStatsContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
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
    color: '#FFFFFF',
    fontSize: 12,
  },
  battalionInfoContainer: {
    backgroundColor: 'rgba(255, 65, 65, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4141',
  },
  battalionInfoTitle: {
    color: '#FF4141',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  battalionInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
