import { APP_VERSION } from '../appVersion';
import { API_URL } from '../config';
import semver from 'semver';

export type VersionCheckResult = {
  updateRequired: boolean;
  /** Server's minimum required version when set (for display and so reducer can clear after update). */
  minAppVersion?: string;
  /** True when we got a successful health response and made a decision; lets reducer clear even when server omits minAppVersion. */
  success?: boolean;
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
    if (!minAppVersion || typeof minAppVersion !== 'string') return { updateRequired: false, success: true };
    const current = semver.valid(APP_VERSION);
    const min = semver.valid(minAppVersion);
    if (!current || !min) return { updateRequired: false, success: true };
    const required = semver.lt(current, min);
    // success: true so reducer can clear when updateRequired is false even if server later omits minAppVersion
    return { updateRequired: required, minAppVersion, success: true };
  } catch {
    return { updateRequired: false };
  }
}
