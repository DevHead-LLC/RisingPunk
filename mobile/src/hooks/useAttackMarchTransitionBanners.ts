import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  attackApi,
  getAttackMarchMinePollingIntervalMs,
  useGetMyAttackMarchesQuery,
} from '../store/api/attackApi';
import { useGetMySwarmQuery } from '../store/api/swarmApi';
import { useAppSelector } from '../store/hooks';

type BannerPayload = { message: string; type: 'info' };

/**
 * Auto-dismiss for march state toasts in AppContent `NotificationBanner` (arrive, queue, battle done, return, recall, home).
 * `NotificationBanner` runs a 300ms fade-in and starts fade-out after this many ms (full-opacity window ≈ duration − 300ms).
 * Bugbot: 2000ms is intentional product timing (between prior 1s “too fast to read” and legacy 6s).
 */
export const MARCH_TRANSITION_BANNER_DURATION_MS = 2000;
export const SWARM_ACTIVE_BANNER_DURATION_MS = 5000;

/**
 * Shows one-shot in-app banners when the user's own marches change state (GET /api/attack/mine poll).
 * Polls faster while `returning` and refetches at `returnArriveAt` so toasts match the map return leg.
 */
export function useAttackMarchTransitionBanners(token: string | null): {
  marchBanner: BannerPayload | null;
  dismissMarchBanner: () => void;
} {
  const [marchBanner, setMarchBanner] = useState<BannerPayload | null>(null);
  const prevStatesRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);

  const mineCached = useAppSelector((s) => attackApi.endpoints.getMyAttackMarches.select(undefined)(s));
  const pollingInterval = getAttackMarchMinePollingIntervalMs(
    mineCached.data?.asyncMarchesEnabled,
    mineCached.data?.marches
  );

  const { data, refetch } = useGetMyAttackMarchesQuery(undefined, {
    skip: !token,
    pollingInterval,
  });

  const returnScheduleKey = useMemo(() => {
    const marches = data?.marches ?? [];
    let min = Infinity;
    for (const m of marches) {
      if (m.state !== 'returning' || m.returnArriveAt == null || String(m.returnArriveAt).trim() === '') {
        continue;
      }
      const t = new Date(String(m.returnArriveAt)).getTime();
      if (Number.isFinite(t)) {
        min = Math.min(min, t);
      }
    }
    return min === Infinity ? '' : String(min);
  }, [data?.marches]);

  useEffect(() => {
    if (!token || returnScheduleKey === '') {
      return;
    }
    const min = Number(returnScheduleKey);
    if (!Number.isFinite(min)) {
      return;
    }
    const delay = Math.max(0, min - Date.now()) + 400;
    const tid = setTimeout(() => {
      refetch().catch(() => {});
    }, delay);
    return () => clearTimeout(tid);
  }, [token, returnScheduleKey, refetch]);

  const dismissMarchBanner = useCallback(() => {
    setMarchBanner(null);
  }, []);

  useEffect(() => {
    if (!token) {
      prevStatesRef.current.clear();
      seededRef.current = false;
      return;
    }

    if (!data?.asyncMarchesEnabled) {
      prevStatesRef.current.clear();
      seededRef.current = false;
      return;
    }

    const marches = data.marches ?? [];

    if (!seededRef.current) {
      for (const m of marches) {
        prevStatesRef.current.set(m.marchId, m.state);
      }
      seededRef.current = true;
      return;
    }

    let message: string | null = null;

    for (const m of marches) {
      const prev = prevStatesRef.current.get(m.marchId);
      if (prev === undefined && m.state === 'outbound' && m.attackType === 'swarm') {
        message = 'Swarm Initiated';
        break;
      }
    }

    const consider = (pred: (prev: string, next: string) => boolean, text: string) => {
      if (message) return;
      for (const m of marches) {
        const prev = prevStatesRef.current.get(m.marchId);
        if (prev === undefined || prev === m.state) continue;
        if (pred(prev, m.state)) {
          message = text;
          return;
        }
      }
    };

    consider((prev, next) => prev === 'resolving' && next === 'returning', 'Battle complete — your expedition is returning home.');
    consider((prev, next) => prev === 'outbound' && next === 'returning', 'Expedition recalled — marching home.');
    consider((prev, next) => prev === 'outbound' && next === 'arrived', 'Your expedition has arrived at its target.');
    consider((prev, next) => next === 'queued' && prev !== 'queued', 'Your expedition is queued behind another battle.');

    for (const m of marches) {
      prevStatesRef.current.set(m.marchId, m.state);
    }

    const ids = new Set(marches.map((m) => m.marchId));
    for (const id of [...prevStatesRef.current.keys()]) {
      if (!ids.has(id)) {
        const prev = prevStatesRef.current.get(id);
        // Bugbot: GET /mine omits terminal states (`done`, `cancelled`); returning→done drops the row — no in-list transition to observe.
        if (!message && prev === 'returning') {
          message = 'Your expedition has returned home.';
        }
        prevStatesRef.current.delete(id);
      }
    }

    if (message) {
      setMarchBanner({ message, type: 'info' });
    }
  }, [token, data]);

  return { marchBanner, dismissMarchBanner };
}

/**
 * Shows a one-shot banner when a crew-active Swarm is visible for this user.
 * Unlike march transitions, this should also fire on initial load when a Swarm is already active.
 */
export function useCrewSwarmActiveBanner(token: string | null): {
  swarmBanner: BannerPayload | null;
  dismissSwarmBanner: () => void;
} {
  const [swarmBanner, setSwarmBanner] = useState<BannerPayload | null>(null);
  const seededRef = useRef(false);
  const lastSwarmIdRef = useRef<string | null>(null);
  const { data: activeSwarm, isSuccess: swarmQuerySuccess } = useGetMySwarmQuery(undefined, {
    skip: !token,
    pollingInterval: token ? 5000 : 0,
  });

  const dismissSwarmBanner = useCallback(() => {
    setSwarmBanner(null);
  }, []);

  useEffect(() => {
    if (!token) {
      seededRef.current = false;
      lastSwarmIdRef.current = null;
      setSwarmBanner(null);
      return;
    }

    // Do not seed while loading: `data` is undefined until the first fulfilled response; otherwise we seed
    // with null and later treat a pre-existing session as "started" instead of "active."
    if (!swarmQuerySuccess) {
      return;
    }

    const currentSwarmId = activeSwarm?.swarmId ?? null;
    if (!seededRef.current) {
      seededRef.current = true;
      lastSwarmIdRef.current = currentSwarmId;
      if (currentSwarmId) {
        setSwarmBanner({
          message: 'Crew Swarm active — open Hack Map toolbar to join.',
          type: 'info',
        });
      }
      return;
    }

    const prev = lastSwarmIdRef.current;
    lastSwarmIdRef.current = currentSwarmId;
    // Any change to a new non-null session (null→id, id→id′), not only first-time id; polling can skip the null beat between swarms.
    if (currentSwarmId && prev !== currentSwarmId) {
      setSwarmBanner({
        message: 'Crew Swarm started — open Hack Map toolbar to join.',
        type: 'info',
      });
    }
  }, [token, activeSwarm?.swarmId, swarmQuerySuccess]);

  return { swarmBanner, dismissSwarmBanner };
}
