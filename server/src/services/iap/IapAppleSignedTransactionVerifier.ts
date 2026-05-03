import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { loadAppleRootCertificateBuffers } from './loadAppleRootCertificates';

function getAppleIapEnvironment(): Environment {
  const v = (process.env.APPLE_IAP_VERIFY_ENVIRONMENT || '').toLowerCase();
  if (v === 'production' || v === 'prod') {
    return Environment.PRODUCTION;
  }
  if (v === 'sandbox' || v === 'development' || v === 'dev' || v === '') {
    return Environment.SANDBOX;
  }
  throw new Error(
    `APPLE_IAP_VERIFY_ENVIRONMENT must be "sandbox" or "production" (got: ${process.env.APPLE_IAP_VERIFY_ENVIRONMENT})`,
  );
}

export function createAppleSignedDataVerifier(): SignedDataVerifier {
  const bundleId = process.env.APPLE_BUNDLE_ID;
  if (!bundleId) {
    throw new Error('APPLE_BUNDLE_ID is not set (must match App Store Connect app, e.g. com.devheadllc.risingpunk)');
  }
  const roots = loadAppleRootCertificateBuffers();
  const enableOnlineChecks = process.env.APPLE_IAP_ONLINE_REVOCATION_CHECKS !== 'false';
  const env = getAppleIapEnvironment();
  const appAppleIdRaw = process.env.APP_APPLE_ID;
  const appAppleId =
    env === Environment.PRODUCTION
      ? (() => {
          if (!appAppleIdRaw) {
            throw new Error('APP_APPLE_ID is required when APPLE_IAP_VERIFY_ENVIRONMENT is production');
          }
          const n = Number(appAppleIdRaw);
          if (!Number.isFinite(n)) {
            throw new Error('APP_APPLE_ID must be a numeric Apple App ID');
          }
          return n;
        })()
      : undefined;
  return new SignedDataVerifier(roots, enableOnlineChecks, env, bundleId, appAppleId);
}
