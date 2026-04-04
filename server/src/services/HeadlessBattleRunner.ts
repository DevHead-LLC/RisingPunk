/**
 * March headless resolution: keep a single in-memory `Battle` Mongoose document for a battle id so
 * movement/timer/attack mutations stay coherent without per-tick `battle.save()`.
 *
 * Also drives **virtual battle time** (ms from battle start, aligned with replay synthetic `t`):
 * `BattleTimer.runSyntheticTicksToCompletion` calls `setHeadlessBattleVirtualTimelineMs`; engine code uses
 * `battleEngineNowMs(battleId)` / `movementClockStartMs` instead of `Date.now()` while attached.
 * **`headlessDeterministicPickIndex`** supports deterministic PvP defender inventory key choice during headless deploy.
 *
 * Attach the document returned from `createBattle` before synthetic ticks; `BattleService.endBattle`
 * persists once and detaches. `abandonMarchBattleRuntimeNoSettlement` detaches without using this map for save.
 *
 * Defender deploy still applies `Bot` inventory updates to Mongo; redundant `Battle.updateOne` paths
 * are skipped while attached (see `DefenderDeploymentService`).
 */

import type { IBattleDocument } from '../models/Battle';

const workingBattles = new Map<string, IBattleDocument>();
/** Wall-clock-equivalent ms from battle start (aligned with replay virtual `t` during synthetic ticks). */
const virtualTimelineMs = new Map<string, number>();

/**
 * Advance headless engine time (movement, attacks, retarget timestamps). No-op if this battle is not attached.
 */
export function setHeadlessBattleVirtualTimelineMs(battleId: string, ms: number): void {
  const id = String(battleId).trim();
  if (!workingBattles.has(id)) {
    return;
  }
  virtualTimelineMs.set(id, ms);
}

/**
 * `Date.now()` substitute for battle engine logic while a march headless battle is attached.
 */
export function battleEngineNowMs(battleId: string): number {
  const id = String(battleId).trim();
  if (workingBattles.has(id)) {
    const t = virtualTimelineMs.get(id);
    if (t === undefined) {
      throw new Error(`HeadlessBattleRunner: virtual timeline not initialized for battle ${id}`);
    }
    return t;
  }
  return Date.now();
}

/** Movement `startTime` anchors: virtual when headless, wall clock otherwise. */
export function movementClockStartMs(battleId?: string): number {
  if (battleId == null) {
    return Date.now();
  }
  const id = String(battleId).trim();
  if (id === '') {
    return Date.now();
  }
  return battleEngineNowMs(id);
}

export function attachHeadlessWorkingBattle(battleId: string, battle: IBattleDocument): void {
  const id = String(battleId).trim();
  if (id === '') {
    throw new Error('attachHeadlessWorkingBattle: battleId is empty');
  }
  if (workingBattles.has(id)) {
    throw new Error(`attachHeadlessWorkingBattle: already attached for ${id}`);
  }
  workingBattles.set(id, battle);
  virtualTimelineMs.set(id, 0);
}

export function getHeadlessWorkingBattle(battleId: string): IBattleDocument | undefined {
  return workingBattles.get(String(battleId).trim());
}

export function isHeadlessWorkingBattleActive(battleId: string): boolean {
  return workingBattles.has(String(battleId).trim());
}

export function detachHeadlessWorkingBattle(battleId: string): void {
  const id = String(battleId).trim();
  workingBattles.delete(id);
  virtualTimelineMs.delete(id);
}

/** FNV-1a 32-bit — stable across Node for the same string (headless deploy / ids). */
function headlessDeterministicHash32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Pick index in `[0, modulo)` from battle id + virtual ms + salt (e.g. deploy slot).
 * Use only while headless-attached; modulo must be a positive integer.
 */
export function headlessDeterministicPickIndex(
  battleId: string,
  virtualMs: number,
  salt: string,
  modulo: number
): number {
  if (!Number.isInteger(modulo) || modulo <= 0) {
    throw new Error(`headlessDeterministicPickIndex: modulo must be a positive integer, got ${modulo}`);
  }
  const id = String(battleId).trim();
  const h = headlessDeterministicHash32(`${id}\0${virtualMs}\0${salt}`);
  return h % modulo;
}
