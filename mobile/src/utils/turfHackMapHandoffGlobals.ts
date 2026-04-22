/**
 * Turf (Battle Prep) → Hack Map cross-route handoff.
 *
 * React Navigation does not expose shared React context between `TurfScreen` and `HackMapScreen`, so a
 * minimal `globalThis` bus matches the existing NPC/defender pattern.
 *
 * Bugbot / ios-bugs.md: keep a **single typed surface** here (not scattered `(globalThis as any)`), document
 * leak/race caveats, and **clear** fields once consumed on Hack Map or in Turf navigation branches.
 * Set only **one** logical flow’s keys before navigating (`pendingMapPan` is shared — two flows back-to-back
 * can race if the map mounts between them).
 */

export type HackMapHandoffGlobals = {
  openSwarmSessionModalOnMap?: boolean;
  pendingSwarmTargetUserId?: string;
  pendingNpcSlug?: string;
  pendingNpcInstanceId?: string;
  pendingDefenderUserId?: string;
  pendingMapPan?: { x: number; y: number };
};

/**
 * Narrow mutable view of the handoff keys stored on `globalThis` (same object each call).
 */
export function getHackMapHandoffGlobals(): HackMapHandoffGlobals {
  return globalThis as unknown as HackMapHandoffGlobals;
}

/**
 * Swarm prep vs NPC vs PvP-defender handoff all share `pendingMapPan`. Before writing one flow, clear the
 * others so Turf `onClose` cannot pair stale `pendingNpcSlug` / `pendingSwarmTargetUserId` with a newer pan
 * (Bugbot: rapid taps / queued `onClose`).
 */
export function setBattlePrepHandoffSwarm(
  h: HackMapHandoffGlobals,
  targetUserId: string,
  mapPan: { x: number; y: number }
): void {
  h.pendingNpcSlug = undefined;
  h.pendingNpcInstanceId = undefined;
  h.pendingDefenderUserId = undefined;
  h.pendingSwarmTargetUserId = targetUserId;
  h.pendingMapPan = mapPan;
}

export function setBattlePrepHandoffNpc(
  h: HackMapHandoffGlobals,
  args: { npcSlug: string; npcInstanceId: string | undefined; mapPan: { x: number; y: number } }
): void {
  h.pendingSwarmTargetUserId = undefined;
  h.pendingDefenderUserId = undefined;
  h.pendingNpcSlug = args.npcSlug;
  h.pendingNpcInstanceId = args.npcInstanceId;
  h.pendingMapPan = args.mapPan;
}

export function setBattlePrepHandoffDefender(
  h: HackMapHandoffGlobals,
  defenderUserId: string,
  mapPan: { x: number; y: number }
): void {
  h.pendingNpcSlug = undefined;
  h.pendingNpcInstanceId = undefined;
  h.pendingSwarmTargetUserId = undefined;
  h.pendingDefenderUserId = defenderUserId;
  h.pendingMapPan = mapPan;
}
