import dotenvFlow from 'dotenv-flow';
import mongoose from 'mongoose';

// Get NODE_ENV before loading env files
const nodeEnv = process.env.NODE_ENV || 'development';

// Load environment variables from .env.* files based on NODE_ENV
// silent: true suppresses warnings when .env files don't exist (expected for AWS deployments)
// Map "development" to "dev" and "production" to "prod" to match our file naming convention
const envFileMap: Record<string, string> = {
  'development': 'dev',
  'production': 'prod'
};

const mappedNodeEnv = envFileMap[nodeEnv] || nodeEnv;

// Load environment files: .env, .env.local, .env.<mappedNodeEnv>, .env.<mappedNodeEnv>.local
// This will load .env.dev when NODE_ENV=development, .env.prod when NODE_ENV=production, etc.
// Note: node_env option only affects which files are loaded, not process.env.NODE_ENV
dotenvFlow.config({ 
  node_env: mappedNodeEnv,
  silent: true 
});

// Ensure process.env.NODE_ENV remains at the original value for production checks
// (dotenvFlow may have mutated it, so we restore it)
if (process.env.NODE_ENV !== nodeEnv) {
  process.env.NODE_ENV = nodeEnv;
}

export const NODE_ENV: string = nodeEnv;
export const PORT: number = Number(process.env.PORT || 5001);
export const MONGODB_URI: string = process.env.MONGODB_URI || '';
export const JWT_SECRET: string = process.env.JWT_SECRET || 'defaultsecret';
export const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY || '';
export const CORS_ORIGINS: string[] = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Google Sign In Configuration
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';

// Apple Sign In Configuration
export const APPLE_CLIENT_ID: string = process.env.APPLE_CLIENT_ID || 'com.devheadllc.risingpunk';
export const APPLE_TEAM_ID: string = process.env.APPLE_TEAM_ID || '';
export const APPLE_KEY_ID: string = process.env.APPLE_KEY_ID || '';
export const APPLE_PRIVATE_KEY: string = process.env.APPLE_PRIVATE_KEY || '';

// Marketing redirect URLs
// Using HTTPS URLs to preserve UTM tracking parameters for campaign attribution
// iOS 18+ automatically redirects apps.apple.com links to App Store app
// Android can be configured to open Play Store app via App Links
export const APP_STORE_WEB_URL = process.env.APP_STORE_WEB_URL || 'https://apps.apple.com/app/risingpunk/id6749834469';
export const GOOGLE_PLAY_WEB_URL = process.env.GOOGLE_PLAY_WEB_URL || 'https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk';
export const DESKTOP_LANDING_URL = process.env.DESKTOP_LANDING_URL || 'https://risingpunk.com';

// Minimum app version (semver). When set, clients below this version are blocked (force update).
// For rollout: set MIN_APP_VERSION=2.5.0 so 2.5.0 and higher are allowed; anything below is blocked.
export const MIN_APP_VERSION: string | undefined = process.env.MIN_APP_VERSION;
export const RECOMMENDED_APP_VERSION: string | undefined = process.env.RECOMMENDED_APP_VERSION;

/** When `true`, live battles persist one `battle_replays` document per fight (see BattleReplayRecorder). */
export const ENABLE_BATTLE_REPLAY_RECORDING = process.env.ENABLE_BATTLE_REPLAY_RECORDING === 'true';

/** When `true`, `POST /api/attack/launch` creates a persisted march instead of using only the legacy live battle path. */
export const ENABLE_ASYNC_BATTLES = process.env.ENABLE_ASYNC_BATTLES === 'true';

/**
 * When `true` (with `ENABLE_ASYNC_BATTLES`), march-spawned battles drain countdown + 45s + movement via
 * `BattleTimerService.runSyntheticTicksToCompletion` instead of wall-clock `setInterval`.
 *
 * If `ENABLE_ASYNC_BATTLES` is on but this is off, marches still work (targeting is primed on ACTIVE),
 * but each battle burns ~48s wall-clock while the march icon sits on the target.
 */
export const ENABLE_HEADLESS_MARCH_BATTLE_RESOLUTION =
  process.env.ENABLE_HEADLESS_MARCH_BATTLE_RESOLUTION === 'true';

function parsePositiveIntMs(envName: string, fallbackMs: number, minMs: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') {
    return fallbackMs;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < minMs) {
    throw new Error(`${envName} must be unset or an integer >= ${minMs} (milliseconds)`);
  }
  return Math.floor(n);
}

/** Max age for `AttackMarch.state === 'resolving'` before watchdog refunds + abandons battle (default 5 min). */
export const STALE_RESOLVING_MARCH_MS = parsePositiveIntMs('STALE_RESOLVING_MARCH_MS', 5 * 60 * 1000, 60_000);

/** How often the stale-`resolving` watchdog runs (default 60s). */
export const STALE_RESOLVING_WATCHDOG_INTERVAL_MS = parsePositiveIntMs(
  'STALE_RESOLVING_WATCHDOG_INTERVAL_MS',
  60_000,
  10_000
);

// Admin user IDs (comma-separated MongoDB ObjectIds). Users in this list can send PM as admin and may be used for future admin posting in crew/world chat.
let cachedAdminIds: mongoose.Types.ObjectId[] | null = null;

export function getAdminUserIds(): mongoose.Types.ObjectId[] {
  if (cachedAdminIds !== null) return cachedAdminIds;
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw || typeof raw !== 'string') {
    cachedAdminIds = [];
    return cachedAdminIds;
  }
  const invalid: string[] = [];
  const acc = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .reduce<mongoose.Types.ObjectId[]>((arr, id) => {
      if (mongoose.Types.ObjectId.isValid(id)) {
        arr.push(new mongoose.Types.ObjectId(id));
      } else {
        invalid.push(id);
      }
      return arr;
    }, []);
  if (invalid.length > 0) {
    console.warn(`[env] ADMIN_USER_IDS: skipped invalid entries (expected 24-char hex ObjectIds): ${invalid.join(', ')}`);
  }
  cachedAdminIds = acc;
  return cachedAdminIds;
}
