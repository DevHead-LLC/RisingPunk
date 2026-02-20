import { Request, Response, NextFunction } from 'express';
import { MIN_APP_VERSION } from '../config/env';

/** Version core (numeric parts) plus whether a pre-release suffix is present (e.g. -beta.1). */
function parseVersion(s: string): { parts: number[]; hasPreRelease: boolean } {
  const trimmed = s.trim();
  const hasPreRelease = trimmed.includes('-');
  const core = hasPreRelease ? trimmed.split('-')[0] : trimmed;
  const partStrs = core.split('.');
  const parts = partStrs.map((p) => {
    const n = parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  return { parts, hasPreRelease };
}

/**
 * Returns true if client is less than min (reject with 426).
 * Matches semver spec for pre-release: e.g. 2.5.0-beta.1 < 2.5.0 so we stay in sync with client (semver package).
 */
function isVersionBelowMin(client: string, min: string): boolean {
  const a = parseVersion(client);
  const b = parseVersion(min);
  const maxLen = Math.max(a.parts.length, b.parts.length);
  for (let i = 0; i < maxLen; i++) {
    const va = a.parts[i] ?? 0;
    const vb = b.parts[i] ?? 0;
    if (va < vb) return true;
    if (va > vb) return false;
  }
  // Numeric parts equal: pre-release is less than release (2.5.0-beta.1 < 2.5.0)
  if (a.hasPreRelease && !b.hasPreRelease) return true;
  return false;
}

/**
 * When MIN_APP_VERSION is set, rejects requests with X-App-Version below it (426 Upgrade Required).
 * Pre-release handling matches client (semver): e.g. 2.5.0-beta.1 < 2.5.0. No extra dependency.
 * Skips when MIN_APP_VERSION is unset or X-App-Version is missing (allow through).
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
  if (isVersionBelowMin(clientVersion, MIN_APP_VERSION)) {
    res.status(426).json({
      error: 'Upgrade required',
      minAppVersion: MIN_APP_VERSION,
      message: 'Please update the app to continue.',
    });
    return;
  }
  next();
}
