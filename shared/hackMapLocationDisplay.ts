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
