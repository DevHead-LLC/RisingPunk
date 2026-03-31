/**
 * Hack map cell display line — looks IP-like: XXX.YYY.123.987
 * where XXX/YYY are 3-digit map cell coordinates (0–999); tail 123.987 is fixed (not gameable).
 * Source of truth for server Battle Report `hl`, probe map coordinates (x/y), and mobile rendering.
 */

/**
 * @param mapCellX map grid X (integer; displayed mod 1000, zero-padded)
 * @param mapCellY map grid Y (integer; displayed mod 1000, zero-padded)
 */
export function formatHackLocationDisplay(mapCellX: number, mapCellY: number): string {
  if (!Number.isFinite(mapCellX) || !Number.isFinite(mapCellY)) {
    throw new Error('formatHackLocationDisplay: mapCellX and mapCellY must be finite numbers');
  }
  const seg = (n: number) => {
    const v = Math.floor(Math.abs(Number(n))) % 1000;
    return String(v).padStart(3, '0');
  };
  return `${seg(mapCellX)}.${seg(mapCellY)}.123.987`;
}

/**
 * Inverse of {@link formatHackLocationDisplay} for tap-to-nav when only `hl` is present (e.g. older Battle Report payloads).
 * Returns **display segments** (mod 1000), not necessarily full grid coords if either axis ≥ 1000.
 */
export function parseHackLocationDisplayCoords(hl: string): { x: number; y: number } | null {
  const trimmed = hl.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return null;
  if (parts[2] !== '123' || parts[3] !== '987') return null;
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
