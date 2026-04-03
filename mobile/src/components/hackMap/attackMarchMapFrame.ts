/**
 * Tile ↔ content-space math for attack march overlay. Must match HackMapScreen `CELL_SIZE` / `MARGIN_SIZE`.
 */
import type { AttackMarchListItem } from '../../store/api/attackApi';

export const ATTACK_MARCH_CELL_SIZE = 75;
export const ATTACK_MARCH_MARGIN_SIZE = 80;

export function parseMarchTimeMs(iso: string | undefined): number | null {
  if (iso == null || typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

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
    return {
      marchId,
      px: tx + (ox - tx) * t,
      py: ty + (oy - ty) * t,
      seg: { sx: tx, sy: ty, ex: ox, ey: oy },
      lineOpacity: 0.8,
      iconOpacity: 1,
    };
  }

  return null;
}
