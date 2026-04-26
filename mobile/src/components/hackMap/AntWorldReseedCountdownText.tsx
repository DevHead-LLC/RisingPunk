import React, { useEffect, useMemo, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

function formatDurationHms(totalSeconds: number): string {
  const clampedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export type AntWorldReseedCountdownTextProps = {
  style: StyleProp<TextStyle>;
  reseedInProgress: boolean;
  nextAntWorldReseedAtUtc: string | undefined | null;
  serverSkewMs: number;
};

/**
 * Bug hunt map — "World refresh" line when a bug cell is selected. Owns a 1s tick only while mounted
 * so HackMapScreen does not re-run renderInfoPanel every second for unrelated selections.
 */
export const AntWorldReseedCountdownText = React.memo(function AntWorldReseedCountdownText({
  style,
  reseedInProgress,
  nextAntWorldReseedAtUtc,
  serverSkewMs,
}: AntWorldReseedCountdownTextProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reseedInProgress) {
      return;
    }
    const nextMs = nextAntWorldReseedAtUtc ? Date.parse(nextAntWorldReseedAtUtc) : NaN;
    if (!Number.isFinite(nextMs)) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [reseedInProgress, nextAntWorldReseedAtUtc]);

  const label = useMemo(() => {
    if (reseedInProgress) {
      return 'Refreshing';
    }
    const nextMs = nextAntWorldReseedAtUtc ? Date.parse(nextAntWorldReseedAtUtc) : NaN;
    if (!Number.isFinite(nextMs)) {
      return 'Unavailable';
    }
    const estimatedServerNowMs = Date.now() + serverSkewMs;
    const sec = Math.max(0, Math.ceil((nextMs - estimatedServerNowMs) / 1000));
    return formatDurationHms(sec);
  }, [reseedInProgress, nextAntWorldReseedAtUtc, serverSkewMs, tick]);

  return <Text style={style}>{label}</Text>;
});
