import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useGetCrewStatusQuery, useGetCrewDetailsQuery } from '../../store/api/authApi';
import { useAppSelector } from '../../store/hooks';

const AUTO_DISMISS_MS = 4000;

interface CrewBackupBannerProps {
  /** When false, banner is never shown (e.g. in battle or battle watch). */
  canShowBanner: boolean;
  /** Called when user taps the banner; should open crew modal to backup-requests list. */
  onPressOpenCrewToBackup: () => void;
}

/**
 * Toast-style banner: "Back up your crew member" when another crew member has requested backup.
 * Shows for ~4 seconds then auto-hides. Tappable to open crew modal to the backup-requests screen.
 * Only shows when canShowBanner is true (e.g. not in battle or battle watch).
 */
export function CrewBackupBanner({ canShowBanner, onPressOpenCrewToBackup }: CrewBackupBannerProps): React.ReactElement | null {
  const colors = useThemeColors();
  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? (state.auth.user as any)?.id);
  const { data: crewStatus } = useGetCrewStatusQuery(undefined, { skip: !currentUserId });
  const { data: crewData } = useGetCrewDetailsQuery(crewStatus?.crewId ?? '', {
    skip: !crewStatus?.crewId || !crewStatus?.isInCrew,
    pollingInterval: 15000,
  });

  const backupRequests = crewData?.crew?.backupRequests ?? [];
  /** Unhelped = from another crew member and current user has not yet helped. */
  const unhelpedRequests = backupRequests.filter(
    (r) => String(r.userId ?? '').trim() !== String(currentUserId ?? '').trim() && r.hasCurrentUserHelped === false
  );
  const hasUnhelpedRequests = unhelpedRequests.length > 0;

  const [dismissed, setDismissed] = useState(false);
  const prevUnhelpedCountRef = useRef(unhelpedRequests.length);

  // Reset dismissed only when a new request arrives (count increases), not when count decreases (e.g. someone helped) or canShowBanner toggles (Bugbot).
  useEffect(() => {
    const prev = prevUnhelpedCountRef.current;
    const curr = unhelpedRequests.length;
    if (curr > prev) setDismissed(false);
    prevUnhelpedCountRef.current = curr;
  }, [unhelpedRequests.length]);

  // Auto-dismiss after 4 seconds when visible
  useEffect(() => {
    if (!canShowBanner || !hasUnhelpedRequests || dismissed) return;
    const t = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [canShowBanner, hasUnhelpedRequests, dismissed]);

  const visible = canShowBanner && hasUnhelpedRequests && !dismissed;
  if (!visible) return null;

  const handlePress = () => {
    setDismissed(true);
    onPressOpenCrewToBackup();
  };

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.primary + 'EE', borderColor: colors.matrix }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Text style={[styles.title, { color: colors.background }]}>Back up your crew member — tap to help</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
});
