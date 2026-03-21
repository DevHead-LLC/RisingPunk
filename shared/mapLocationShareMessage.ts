import { formatHackLocationDisplay } from './hackMapLocationDisplay';

/** First line prefix for map location shares (world + crew chat). */
export const MAP_LOCATION_SHARE_PREFIX = 'LOC|';

export interface MapLocationSharePayload {
  loc: 1;
  mapName: string;
  x: number;
  y: number;
  /** Short label: terrain, player handle, or NPC name */
  label: string;
}

export function buildMapLocationShareMessage(
  mapName: string,
  x: number,
  y: number,
  label: string
): string {
  const payload: MapLocationSharePayload = {
    loc: 1,
    mapName,
    x,
    y,
    label: label.trim() || 'Location',
  };
  const line1 = `${MAP_LOCATION_SHARE_PREFIX}${JSON.stringify(payload)}`;
  const hackLoc = formatHackLocationDisplay(x, y);
  const line2 = `${hackLoc} — ${payload.label}`;
  return `${line1}\n${line2}`;
}

export function parseMapLocationShareMessage(message: string): MapLocationSharePayload | null {
  const trimmed = message.trim();
  const firstLine = trimmed.split('\n')[0]?.trim() ?? '';
  if (!firstLine.startsWith(MAP_LOCATION_SHARE_PREFIX)) return null;
  try {
    const json = firstLine.slice(MAP_LOCATION_SHARE_PREFIX.length);
    const payload = JSON.parse(json) as MapLocationSharePayload;
    if (
      payload?.loc !== 1 ||
      typeof payload.mapName !== 'string' ||
      !Number.isFinite(payload.x) ||
      !Number.isFinite(payload.y)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
