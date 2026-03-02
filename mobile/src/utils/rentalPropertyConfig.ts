/**
 * Client-side rental property room-level constants. Single source of truth for room upgrade cap
 * and min-property-level rule; must stay in sync with server construction_config rental_property.
 */

/** Max room remodel level (2–8). Server roomRemodelLevels go up to 8. */
export const MAX_ROOM_LEVEL = 8;

/** Min property level required to remodel to this room level. Matches server (nextLevel+1 for 2..8). */
export function minPropertyLevelForNextRoomLevel(nextLevel: number): number {
  return nextLevel + 1;
}
