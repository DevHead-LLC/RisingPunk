import { useCallback, useEffect, useRef, useState } from 'react';
import { useGetCrewStatusQuery } from '../store/api/authApi';
import { swarmApi, useGetMySwarmQuery } from '../store/api/swarmApi';
import { useAppDispatch } from '../store/hooks';

type BannerPayload = { message: string; type: 'info' };

/**
 * Auto-dismiss for Crew Swarm toast in AppContent `NotificationBanner` (longer read time than march toasts).
 */
export const SWARM_ACTIVE_BANNER_DURATION_MS = 5000;

/**
 * Shows a one-shot banner when a crew-active Swarm is visible for this user.
 * Unlike march transitions, this should also fire on initial load when a Swarm is already active.
 */
export function useCrewSwarmActiveBanner(token: string | null): {
  swarmBanner: BannerPayload | null;
  dismissSwarmBanner: () => void;
} {
  const dispatch = useAppDispatch();
  const [swarmBanner, setSwarmBanner] = useState<BannerPayload | null>(null);
  /** Gate banner logic until post-crew-change refetch settles (void-arg /mine cache can stay fulfilled while skipped — Bugbot / ios-bugs.md). */
  const [swarmReadyForBanner, setSwarmReadyForBanner] = useState(true);
  const seededRef = useRef(false);
  const lastSwarmIdRef = useRef<string | null>(null);
  /** Last `crewScopeKey` we ran banner logic for; changes bust stale void-arg swarm cache after leave/rejoin. */
  const lastBannerCrewScopeKeyRef = useRef<string | null>(null);
  const { data: crewStatus } = useGetCrewStatusQuery();
  const inCrew = crewStatus?.isInCrew === true;
  const crewId = inCrew ? crewStatus?.crewId ?? null : null;
  /** Distinguishes leave/rejoin and crew switches; `getMySwarm` arg is void so RTK can keep a stale fulfilled /mine while skipped (Bugbot / ios-bugs.md). */
  const crewScopeKey = inCrew && crewId != null && crewId !== '' ? crewId : '';
  // Bugbot: Swarm sessions are crew-only — match HackMap/Turf (no 5s poll for users not in a crew).
  const { data: activeSwarm, isSuccess: swarmQuerySuccess, refetch: refetchMySwarm } = useGetMySwarmQuery(undefined, {
    skip: !token || !inCrew,
    pollingInterval: token && inCrew ? 5000 : 0,
  });

  const dismissSwarmBanner = useCallback(() => {
    setSwarmBanner(null);
  }, []);

  useEffect(() => {
    if (!token) {
      seededRef.current = false;
      lastSwarmIdRef.current = null;
      lastBannerCrewScopeKeyRef.current = null;
      setSwarmReadyForBanner(true);
      setSwarmBanner(null);
      return;
    }
    if (!inCrew || crewScopeKey === '') {
      seededRef.current = false;
      lastSwarmIdRef.current = null;
      lastBannerCrewScopeKeyRef.current = null;
      setSwarmReadyForBanner(true);
      setSwarmBanner(null);
      return;
    }

    if (lastBannerCrewScopeKeyRef.current !== crewScopeKey) {
      lastBannerCrewScopeKeyRef.current = crewScopeKey;
      seededRef.current = false;
      lastSwarmIdRef.current = null;
      setSwarmBanner(null);
      setSwarmReadyForBanner(false);
      dispatch(swarmApi.util.updateQueryData('getMySwarm', undefined, () => null));
      void refetchMySwarm().finally(() => {
        setSwarmReadyForBanner(true);
      });
      return;
    }

    if (!swarmReadyForBanner) {
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
    // Bugbot / ios-bugs.md: do not write `lastSwarmIdRef` when the poll yields null. A brief null (RTK/network blip)
    // then the same `swarmId` again must not look like null→id — that falsely showed "started" for an existing session.
    if (currentSwarmId != null) {
      if (currentSwarmId !== prev) {
        setSwarmBanner({
          message: 'Crew Swarm started — open Hack Map toolbar to join.',
          type: 'info',
        });
      }
      lastSwarmIdRef.current = currentSwarmId;
    }
  }, [token, inCrew, crewScopeKey, activeSwarm?.swarmId, swarmQuerySuccess, swarmReadyForBanner, refetchMySwarm, dispatch]);

  return { swarmBanner, dismissSwarmBanner };
}
