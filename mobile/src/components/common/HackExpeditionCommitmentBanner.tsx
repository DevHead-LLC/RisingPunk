import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { useThemeColors } from '../../hooks/useThemeColors';
import {
  attackApi,
  getAttackMarchMinePollingIntervalMs,
  useGetMyAttackMarchesQuery,
} from '../../store/api/attackApi';
import { SIZING } from '../../styles/theme';

/**
 * When async marches are on and the user has a non-terminal expedition, explains that
 * committed bots are unavailable in barracks / assembly until the army returns home (battle end or cancel recall).
 */
export function HackExpeditionCommitmentBanner(): React.ReactElement | null {
  const token = useAppSelector((state) => state.auth.token);
  const colors = useThemeColors();
  const mineCached = useAppSelector((s) => attackApi.endpoints.getMyAttackMarches.select(undefined)(s));
  const pollingInterval = getAttackMarchMinePollingIntervalMs(
    mineCached.data?.asyncMarchesEnabled,
    mineCached.data?.marches
  );
  const { data } = useGetMyAttackMarchesQuery(undefined, {
    skip: !token,
    pollingInterval,
  });

  const visible = data?.asyncMarchesEnabled === true && (data?.marches?.length ?? 0) > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginHorizontal: SIZING.spacing.md,
          marginBottom: SIZING.spacing.sm,
          paddingVertical: SIZING.spacing.sm,
          paddingHorizontal: SIZING.spacing.md,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: colors.secondary,
          backgroundColor: `${colors.secondary}18`,
        },
        text: {
          color: colors.text.primary,
          fontSize: 12,
          lineHeight: 16,
        },
      }),
    [colors.secondary, colors.text.primary]
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.text}>
        Hack expedition in progress. Committed bots are not available for assignment or builds
        until your army returns home. Cancelling outbound on the Hack Map recalls your army—it still marches home
        before bots unlock.
      </Text>
    </View>
  );
}
