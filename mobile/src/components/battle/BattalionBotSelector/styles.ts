import { StyleSheet } from 'react-native';
import { SIZING } from '../../../styles/theme';

export const createStyles = (colors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.themeMode === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.themeMode === 'light' ? 'rgba(245, 245, 220, 0.95)' : 'rgba(10, 10, 10, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: SIZING.spacing.lg,
    position: 'relative',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    color: colors.secondary,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  battalionName: {
    color: colors.themeMode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
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
    backgroundColor: colors.themeMode === 'light' ? 'rgba(71, 23, 246, 0.08)' : 'rgba(71, 23, 246, 0.1)',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deployButtonText: {
    color: colors.secondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  deployButtonDisabled: {
    borderColor: colors.themeMode === 'light' ? 'rgba(71, 23, 246, 0.3)' : 'rgba(71, 23, 246, 0.3)',
    backgroundColor: colors.themeMode === 'light' ? 'rgba(245, 245, 220, 0.95)' : 'rgba(10, 10, 10, 0.95)',
  },
  deployButtonTextDisabled: {
    color: colors.themeMode === 'light' ? 'rgba(71, 23, 246, 0.3)' : 'rgba(71, 23, 246, 0.3)',
  },
});
