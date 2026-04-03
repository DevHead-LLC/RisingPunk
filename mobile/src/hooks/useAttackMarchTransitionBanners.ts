import { useCallback, useEffect, useRef, useState } from 'react';
import { useGetMyAttackMarchesQuery } from '../store/api/attackApi';

type BannerPayload = { message: string; type: 'info' };

/**
 * Shows one-shot in-app banners when the user's own marches change state (GET /api/attack/mine poll).
 * Uses the same RTK Query cache + 15s interval as HackExpeditionCommitmentBanner.
 */
export function useAttackMarchTransitionBanners(token: string | null): {
  marchBanner: BannerPayload | null;
  dismissMarchBanner: () => void;
} {
  const [marchBanner, setMarchBanner] = useState<BannerPayload | null>(null);
  const prevStatesRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);

  const { data } = useGetMyAttackMarchesQuery(undefined, {
    skip: !token,
    pollingInterval: 15000,
  });

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
    consider((prev, next) => prev === 'outbound' && next === 'arrived', 'Your expedition has arrived at its target.');
    consider((prev, next) => next === 'queued' && prev !== 'queued', 'Your expedition is queued behind another battle.');

    for (const m of marches) {
      prevStatesRef.current.set(m.marchId, m.state);
    }

    const ids = new Set(marches.map((m) => m.marchId));
    for (const id of [...prevStatesRef.current.keys()]) {
      if (!ids.has(id)) {
        prevStatesRef.current.delete(id);
      }
    }

    if (message) {
      setMarchBanner({ message, type: 'info' });
    }
  }, [token, data]);

  return { marchBanner, dismissMarchBanner };
}
