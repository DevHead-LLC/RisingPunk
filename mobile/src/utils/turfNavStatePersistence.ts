/**
 * Persist and restore TurfScreen navigation state (currentScreen, turfViewPosition)
 * so refresh/hot reload or process restart keeps user on same screen and position.
 * State is keyed by userId so each user gets their own screen/position; switching
 * users or creating a new guest does not restore the previous user's state (fixes
 * iOS/Android bug where new guest saw HackMap/onboarding from previous account).
 * See taskItems/in-progress.md Phase 2 (14.1 Refresh app — stay on current screen and position).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_STATE_KEY_PREFIX = '@risingpunk_turf_nav_state';
/** Legacy single-key (pre per-user). Cleared on clearPersistedTurfNavState for migration. */
const LEGACY_NAV_STATE_KEY = '@risingpunk_turf_nav_state';

function navStateKey(userId: string): string {
  return `${NAV_STATE_KEY_PREFIX}_${userId}`;
}

export type TurfScreenName =
  | 'turf'
  | 'hackRig'
  | 'barracks'
  | 'botAssembly'
  | 'battlePrep'
  | 'battle'
  | 'map'
  | 'profile'
  | 'research'
  | 'investmentProperty';

const VALID_SCREENS: TurfScreenName[] = [
  'turf',
  'hackRig',
  'barracks',
  'botAssembly',
  'battlePrep',
  'battle',
  'map',
  'profile',
  'research',
  'investmentProperty',
];

/** Screens that depend on transient state (battleId, pendingDefenderUserId, pendingNpcSlug) not persisted. We do not persist these and fall back to 'turf' on restore to avoid restoring into a broken battle context. */
const TRANSIENT_SCREENS: TurfScreenName[] = ['battlePrep', 'battle'];

export interface TurfNavState {
  currentScreen: TurfScreenName;
  turfViewPosition: { x: number; y: number } | null;
}

function isValidScreen(s: string): s is TurfScreenName {
  return VALID_SCREENS.includes(s as TurfScreenName);
}

function isValidPosition(p: unknown): p is { x: number; y: number } {
  return (
    p !== null &&
    typeof p === 'object' &&
    'x' in p &&
    'y' in p &&
    typeof (p as { x: unknown; y: unknown }).x === 'number' &&
    typeof (p as { x: unknown; y: unknown }).y === 'number'
  );
}

function parseStoredState(raw: string): TurfNavState | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const screen = (parsed as Record<string, unknown>).currentScreen;
    const position = (parsed as Record<string, unknown>).turfViewPosition;
    if (!isValidScreen(screen)) return null;
    const turfViewPosition =
      position === null || position === undefined
        ? null
        : isValidPosition(position)
          ? { x: position.x, y: position.y }
          : null;
    const currentScreen = TRANSIENT_SCREENS.includes(screen) ? 'turf' : screen;
    return { currentScreen, turfViewPosition };
  } catch {
    return null;
  }
}

/** Get persisted turf nav state for the given user. When userId is null, returns null (e.g. logged out). */
export async function getPersistedTurfNavState(userId: string | null): Promise<TurfNavState | null> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return null;
  try {
    const key = navStateKey(userId.trim());
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return parseStoredState(raw);
  } catch {
    return null;
  }
}

/** Persist turf nav state for the given user. When userId is null, no-op. */
export async function setPersistedTurfNavState(state: TurfNavState, userId: string | null): Promise<void> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return;
  try {
    const currentScreen = TRANSIENT_SCREENS.includes(state.currentScreen) ? 'turf' : state.currentScreen;
    const key = navStateKey(userId.trim());
    await AsyncStorage.setItem(key, JSON.stringify({ ...state, currentScreen }));
  } catch {
    // Non-fatal; ignore
  }
}

/** Clear persisted turf nav state. Call on logout or account switch. Clears legacy global key and, when userId is provided, that user's key so the next user does not restore the previous user's screen/position. */
export async function clearPersistedTurfNavState(userId?: string | null): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEGACY_NAV_STATE_KEY);
    if (userId && typeof userId === 'string' && userId.trim()) {
      await AsyncStorage.removeItem(navStateKey(userId.trim()));
    }
  } catch {
    // Non-fatal; ignore
  }
}
