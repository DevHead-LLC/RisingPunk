import { setForceUpdateRequired } from '../slices/uiSlice';

/**
 * If the API result is 426 Upgrade Required, dispatch force-update state so the app shows UpdateRequiredScreen.
 * Returns true if 426 was handled (caller should return result without further error handling).
 */
export function handle426IfNeeded(result: { error?: { status?: number; data?: { minAppVersion?: string } } }, api: { dispatch: (a: unknown) => void }): boolean {
  if (result?.error?.status !== 426) return false;
  const minAppVersion = typeof (result.error?.data as { minAppVersion?: string } | undefined)?.minAppVersion === 'string'
    ? (result.error.data as { minAppVersion: string }).minAppVersion
    : undefined;
  api.dispatch(setForceUpdateRequired({ updateRequired: true, minAppVersion }));
  return true;
}
