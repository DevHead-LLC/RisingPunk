import { APP_VERSION } from '../../appVersion';

/** Set X-App-Version on requests so server requireMinAppVersion middleware can enforce min version. */
export function setAppVersionHeader(headers: Headers): void {
  headers.set('X-App-Version', APP_VERSION);
}
