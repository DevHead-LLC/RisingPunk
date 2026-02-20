import { Request, Response, NextFunction } from 'express';
import { MIN_APP_VERSION } from '../config/env';

/** Version core (numeric parts), pre-release flag, and pre-release identifier (e.g. "beta.1") for comparison. */
function parseVersion(s: string): { parts: number[]; hasPreRelease: boolean; preRelease: string } {
  const trimmed = s.trim();
  const dashIdx = trimmed.indexOf('-');
  const hasPreRelease = dashIdx >= 0;
  const core = hasPreRelease ? trimmed.slice(0, dashIdx) : trimmed;
  const preRelease = hasPreRelease ? trimmed.slice(dashIdx + 1) : '';
  const partStrs = core.split('.');
  const parts = partStrs.map((p) => {
    const n = parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  return { parts, hasPreRelease, preRelease };
}

/** Returns true if preReleaseA < preReleaseB (semver pre-release order: segment-wise, numeric as number). */
function isPreReleaseLess(a: string, b: string): boolean {
  const segA = a.split('.');
  const segB = b.split('.');
  const maxLen = Math.max(segA.length, segB.length);
  for (let i = 0; i < maxLen; i++) {
    const pa = segA[i];
    const pb = segB[i];
    if (pa === undefined && pb === undefined) return false;
    if (pa === undefined) return true;  // a is prefix → a is less
    if (pb === undefined) return false; // b is prefix → a is greater
    const na = parseInt(pa, 10);
    const nb = parseInt(pb, 10);
    const aNum = !Number.isNaN(na);
    const bNum = !Number.isNaN(nb);
    if (aNum && bNum) {
      if (na < nb) return true;
      if (na > nb) return false;
    } else {
      const cmp = pa.localeCompare(pb);
      if (cmp !== 0) return cmp < 0;
    }
  }
  return false;
}

/**
 * Returns true if client is less than min (reject with 426).
 * Matches semver: release > pre-release; when both pre-release, compare identifiers (e.g. beta.1 < beta.2).
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
  // Numeric parts equal
  if (a.hasPreRelease && !b.hasPreRelease) return true;   // 2.5.0-beta.1 < 2.5.0
  if (!a.hasPreRelease && b.hasPreRelease) return false; // 2.5.0 > 2.5.0-beta.2
  if (a.hasPreRelease && b.hasPreRelease) return isPreReleaseLess(a.preRelease, b.preRelease); // beta.1 < beta.2
  return false;
}

/**
 * When MIN_APP_VERSION is set, rejects requests with X-App-Version below it (426 Upgrade Required).
 * Pre-release handling matches client (semver): 2.5.0-beta.1 < 2.5.0; when min is pre-release (e.g. 2.5.0-beta.2), beta.1 is below beta.2. No extra dependency.
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
