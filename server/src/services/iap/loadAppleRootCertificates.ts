import fs from 'fs';
import path from 'path';

/**
 * Loads Apple Root CA certificates (DER) for {@link SignedDataVerifier}.
 * Set `APPLE_ROOT_CA_PATHS` to a platform-delimited list of absolute or repo-relative paths to `.cer` / `.pem` files
 * from https://www.apple.com/certificateauthority/
 */
export function loadAppleRootCertificateBuffers(): Buffer[] {
  const raw = process.env.APPLE_ROOT_CA_PATHS;
  if (!raw || !raw.trim()) {
    throw new Error(
      'APPLE_ROOT_CA_PATHS is not set. Download Apple Root CA G3 (and related) .cer files and list paths separated by your OS path delimiter.',
    );
  }
  const paths = raw
    .split(path.delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
  if (paths.length === 0) {
    throw new Error('APPLE_ROOT_CA_PATHS contained no usable paths');
  }
  return paths.map((p) => {
    const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    return fs.readFileSync(resolved);
  });
}
