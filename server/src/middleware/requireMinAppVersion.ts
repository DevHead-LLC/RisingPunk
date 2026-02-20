import { Request, Response, NextFunction } from 'express';
import { MIN_APP_VERSION } from '../config/env';

/**
 * Parse "a.b.c" into [a, b, c]. Non-numeric parts treated as 0.
 */
function parseSemver(s: string): number[] {
  const parts = s.trim().split('.');
  return parts.map((p) => {
    const n = parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });
}

/**
 * Returns true if versionA is less than versionB (e.g. "2.5.0" < "2.10.0").
 */
export function semverLessThan(versionA: string, versionB: string): boolean {
  const a = parseSemver(versionA);
  const b = parseSemver(versionB);
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    if (va < vb) return true;
    if (va > vb) return false;
  }
  return false;
}

/**
 * When MIN_APP_VERSION is set, rejects requests with X-App-Version below it (426 Upgrade Required).
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
  if (semverLessThan(clientVersion, MIN_APP_VERSION)) {
    res.status(426).json({
      error: 'Upgrade required',
      minAppVersion: MIN_APP_VERSION,
      message: 'Please update the app to continue.',
    });
    return;
  }
  next();
}
