import { SIZING, styleGuide } from './theme';

/**
 * Shared style definitions for auth/form modals (ForgotPasswordModal, LinkAccountModal, ChangePasswordModal).
 * Export plain objects so each modal can pass them to StyleSheet.create() and optionally override.
 */

/** Overlay for Modal-based modals (flex layout). */
export const modalOverlayFlex = {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.8)' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: SIZING.spacing.lg,
};

/** Overlay for View-based modals (position absolute). Use when not using RN Modal. */
export const modalOverlayAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  zIndex: 1000,
};

export const sharedModalFormStyles = {
  overlay: modalOverlayFlex,
  modal: {
    width: '100%' as const,
    maxWidth: 400,
    borderRadius: 8,
    borderWidth: 2,
    padding: 0,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: SIZING.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  content: {
    padding: SIZING.spacing.lg,
  },
  description: {
    fontSize: SIZING.font.body,
    lineHeight: 20,
    marginBottom: SIZING.spacing.lg,
    textAlign: 'center' as const,
  },
  inputContainer: {
    position: 'relative' as const,
    marginBottom: SIZING.spacing.md,
  },
  input: {
    ...styleGuide.inputField,
    height: 48,
    paddingHorizontal: SIZING.spacing.md,
    borderWidth: 2,
    borderRadius: 4,
  },
  inputCorner: {
    ...styleGuide.cornerDecoration,
  },
  buttonContainer: {
    gap: SIZING.spacing.md,
  },
  submitButton: {
    height: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
    borderWidth: 2,
    borderRadius: 4,
  },
  submitText: {
    fontSize: SIZING.font.body,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  cancelButton: {
    height: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: 'transparent' as const,
  },
  cancelText: {
    fontSize: SIZING.font.body,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  buttonCorner: {
    ...styleGuide.cornerDecoration,
  },
};
