/**
 * Tile ↔ content-space math for attack march overlay. Must match HackMapScreen `CELL_SIZE` / `MARGIN_SIZE`.
 */
import type { AttackMarchListItem } from '../../store/api/attackApi';

export const ATTACK_MARCH_CELL_SIZE = 75;
export const ATTACK_MARCH_MARGIN_SIZE = 80;

/** Normalize API timestamps (ISO string, unix ms, or Date) so cancel + animation use the same instant. */
export function parseMarchTimeMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.getTime();
  return null;
}

/**
 * Same progress scalar as {@link computeMarchFrame} outbound (0 = home tile, 1 = target tile).
 * Use when cancelling so return duration and start tile match the icon.
 */
export function outboundProgressTForAttackMarch(m: AttackMarchListItem, nowMs: number): number | null {
  const depart = parseMarchTimeMs(m.departAt);
  const arrive = parseMarchTimeMs(m.arriveAt);
  if (depart == null || arrive == null) return null;
  const outboundDurMs = Math.max(1, arrive - depart);
  return Math.min(1, Math.max(0, (nowMs - depart) / outboundDurMs));
}

/**
 * Map tile-index coordinates to hack-map **content** pixels (same basis as `HackMapScreen` `MARGIN + (i+0.5)*CELL`).
 * `x`/`y` may be **fractional** (e.g. `originX + (targetX - originX) * t`): the map is uniform, so this affine map
 * equals lerping pixel centers — same as the outbound overlay. Bugbot: not “integer indices only.”
 */
export function marchTileCenter(x: number, y: number): { cx: number; cy: number } {
  return {
    cx: ATTACK_MARCH_MARGIN_SIZE + (x + 0.5) * ATTACK_MARCH_CELL_SIZE,
    cy: ATTACK_MARCH_MARGIN_SIZE + (y + 0.5) * ATTACK_MARCH_CELL_SIZE,
  };
}

export type MarchSegment = { sx: number; sy: number; ex: number; ey: number };

export type ComputedMarchFrame = {
  marchId: string;
  px: number;
  py: number;
  seg: MarchSegment;
  lineOpacity: number;
  iconOpacity: number;
};

export function computeMarchFrame(m: AttackMarchListItem, now: number): ComputedMarchFrame | null {
  const { marchId, originX, originY, targetX, targetY, state } = m;
  if (!Number.isFinite(originX) || !Number.isFinite(originY) || !Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    return null;
  }
  const { cx: ox, cy: oy } = marchTileCenter(originX, originY);
  const { cx: tx, cy: ty } = marchTileCenter(targetX, targetY);
  const depart = parseMarchTimeMs(m.departAt);
  const arrive = parseMarchTimeMs(m.arriveAt);
  if (depart == null || arrive == null) {
    return null;
  }
  const outboundDurMs = Math.max(1, arrive - depart);

  if (state === 'outbound') {
    const t = Math.min(1, Math.max(0, (now - depart) / outboundDurMs));
    return {
      marchId,
      px: ox + (tx - ox) * t,
      py: oy + (ty - oy) * t,
      seg: { sx: ox, sy: oy, ex: tx, ey: ty },
      lineOpacity: 0.8,
      iconOpacity: 1,
    };
  }

  if (state === 'arrived' || state === 'queued' || state === 'resolving') {
    const pulse = 0.78 + 0.22 * Math.sin(now / 350);
    return {
      marchId,
      px: tx,
      py: ty,
      seg: { sx: ox, sy: oy, ex: tx, ey: ty },
      lineOpacity: 0.42,
      iconOpacity: pulse,
    };
  }

  if (state === 'returning') {
    const resMs = parseMarchTimeMs(m.resolvedAt);
    const retEndMs = parseMarchTimeMs(m.returnArriveAt);
    if (resMs == null || retEndMs == null || retEndMs <= resMs) {
      return null;
    }
    const durMs = retEndMs - resMs;
    const t = Math.min(1, Math.max(0, (now - resMs) / durMs));
    const rsx = m.returnLegStartX;
    const rsy = m.returnLegStartY;
    const useCancelStart =
      typeof rsx === 'number' &&
      typeof rsy === 'number' &&
      Number.isFinite(rsx) &&
      Number.isFinite(rsy);
    // Bugbot: returnLegStart* are fractional tile indices from cancel; marchTileCenter applies the same affine
    // as outbound lerp (see JSDoc on marchTileCenter) — no snap/jump vs pre-cancel icon position.
    const { cx: rx, cy: ry } = useCancelStart ? marchTileCenter(rsx, rsy) : { cx: tx, cy: ty };
    return {
      marchId,
      px: rx + (ox - rx) * t,
      py: ry + (oy - ry) * t,
      seg: { sx: rx, sy: ry, ex: ox, ey: oy },
      lineOpacity: 0.8,
      iconOpacity: 1,
    };
  }

  return null;
}
