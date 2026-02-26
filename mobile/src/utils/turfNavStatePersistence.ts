/**
 * Persist and restore TurfScreen navigation state (currentScreen, turfViewPosition)
 * so refresh/hot reload or process restart keeps user on same screen and position.
 * See taskItems/in-progress.md Phase 2 (14.1 Refresh app — stay on current screen and position).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_STATE_KEY = '@risingpunk_turf_nav_state';

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

export async function getPersistedTurfNavState(): Promise<TurfNavState | null> {
  try {
    const raw = await AsyncStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
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
    return { currentScreen: screen, turfViewPosition };
  } catch {
    return null;
  }
}

export async function setPersistedTurfNavState(state: TurfNavState): Promise<void> {
  try {
    await AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal; ignore
  }
}
