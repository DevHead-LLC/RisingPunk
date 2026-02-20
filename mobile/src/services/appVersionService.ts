import { APP_VERSION } from '../appVersion';
import { API_URL } from '../config';
import semver from 'semver';

export type VersionCheckResult = {
  updateRequired: boolean;
  /** When updateRequired is true, the server's minimum required version (for display in UI). */
  minAppVersion?: string;
};

/**
 * Fetches server health (which includes minAppVersion when set) and returns whether
 * the current app version is below minimum (force update required).
 * On network/parse error, returns updateRequired: false so we don't block the user.
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'X-App-Version': APP_VERSION,
      },
    });
    if (!res.ok) return { updateRequired: false };
    const data = (await res.json()) as { minAppVersion?: string };
    const minAppVersion = data.minAppVersion;
    if (!minAppVersion || typeof minAppVersion !== 'string') return { updateRequired: false };
    const current = semver.valid(APP_VERSION);
    const min = semver.valid(minAppVersion);
    if (!current || !min) return { updateRequired: false };
    const required = semver.lt(current, min);
    return { updateRequired: required, ...(required && { minAppVersion }) };
  } catch {
    return { updateRequired: false };
  }
}
