import { StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../../styles/theme';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4717F6',
    padding: SIZING.spacing.lg,
    position: 'relative',
    shadowColor: '#4717F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    color: '#4717F6',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.xs,
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  battalionName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  botTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
  },
  quantityContainer: {
    marginBottom: SIZING.spacing.md,
  },
  deployButton: {
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#4717F6',
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    alignItems: 'center',
    shadowColor: '#4717F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deployButtonText: {
    color: '#4717F6',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  deployButtonDisabled: {
    borderColor: 'rgba(71, 23, 246, 0.3)',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  deployButtonTextDisabled: {
    color: 'rgba(71, 23, 246, 0.3)',
  },
}); 