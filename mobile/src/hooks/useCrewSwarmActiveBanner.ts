import { useCallback, useEffect, useRef, useState } from 'react';
import { useGetCrewStatusQuery } from '../store/api/authApi';
import { useGetMySwarmQuery } from '../store/api/swarmApi';

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
  const [swarmBanner, setSwarmBanner] = useState<BannerPayload | null>(null);
  const seededRef = useRef(false);
  const lastSwarmIdRef = useRef<string | null>(null);
  const { data: crewStatus } = useGetCrewStatusQuery();
  const inCrew = crewStatus?.isInCrew === true;
  // Bugbot: Swarm sessions are crew-only — match HackMap/Turf (no 5s poll for users not in a crew).
  const { data: activeSwarm, isSuccess: swarmQuerySuccess } = useGetMySwarmQuery(undefined, {
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
      setSwarmBanner(null);
      return;
    }
    if (!inCrew) {
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
  }, [token, inCrew, activeSwarm?.swarmId, swarmQuerySuccess]);

  return { swarmBanner, dismissSwarmBanner };
}
