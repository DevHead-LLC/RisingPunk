/**
 * Single source of truth for app version (displayed in auth TitleSection etc.).
 * Reads from package.json; do not hardcode version in UI.
 */
const pkg = require('../package.json') as { version?: string };

if (!pkg || typeof pkg.version !== 'string') {
  throw new Error('appVersion: package.json version is missing or invalid');
}

export const APP_VERSION: string = pkg.version;
