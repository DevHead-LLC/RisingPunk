/**
 * Deduplicate map cells by (x,y). Single source of truth for E11000 fix and Bugbot policy:
 * prefer occupied over empty; when both occupied, prefer stronger occupancy (userId > entityName/npcSlug).
 */
export function dedupCellsByCoord(cells: any[]): any[] {
  const occupancyStrength = (cell: any) =>
    cell?.userId ? 2 : (cell?.entityName || cell?.npcSlug) ? 1 : 0;
  const cellByKey = new Map<string, any>();
  for (const c of cells) {
    const key = `${c.x},${c.y}`;
    const existing = cellByKey.get(key);
    if (!existing) {
      cellByKey.set(key, c);
    } else if (c.isOccupied && !existing.isOccupied) {
      cellByKey.set(key, c);
    } else if (
      existing.isOccupied &&
      c.isOccupied &&
      occupancyStrength(c) >= occupancyStrength(existing)
    ) {
      cellByKey.set(key, c);
    }
  }
  return Array.from(cellByKey.values());
}
