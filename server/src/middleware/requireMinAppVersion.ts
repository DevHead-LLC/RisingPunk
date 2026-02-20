import { Request, Response, NextFunction } from 'express';
import semver from 'semver';
import { MIN_APP_VERSION } from '../config/env';

/**
 * When MIN_APP_VERSION is set, rejects requests with X-App-Version below it (426 Upgrade Required).
 * Uses semver package so comparison matches the client (handles pre-release e.g. 2.5.0-beta.1 < 2.5.0).
 * Skips when MIN_APP_VERSION is unset or X-App-Version is missing (allow through).
 * Invalid version strings: allow through so we don't block on malformed headers.
 */
export function requireMinAppVersion(req: Request, res: Response, next: NextFunction): void {
  if (!MIN_APP_VERSION) {
    next();
    return;
  }
  const clientVersion = req.get('X-App-Version');
  if (!clientVersion) {
    next();
    return;
  }
  const clientValid = semver.valid(clientVersion);
  const minValid = semver.valid(MIN_APP_VERSION);
  if (!clientValid || !minValid) {
    next();
    return;
  }
  if (semver.lt(clientValid, minValid)) {
    res.status(426).json({
      error: 'Upgrade required',
      minAppVersion: MIN_APP_VERSION,
      message: 'Please update the app to continue.',
    });
    return;
  }
  next();
}
