import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppSelector } from '../../store/hooks';
import { useGetCrewStatusQuery, useGetCrewDetailsQuery, useRequestCrewBackupMutation } from '../../store/api/authApi';
import { BuildCountdownTimer } from './BuildCountdownTimer';

interface DevelopmentZoneProps {
  children: React.ReactNode;
  buildingProperties?: Array<{
    propertyId: number;
    buildStatus: any;
    onComplete: () => void;
  }>;
}

export const DevelopmentZone: React.FC<DevelopmentZoneProps> = ({ children, buildingProperties = [] }) => {
  const colors = useThemeColors();
  const activeBuilds = buildingProperties.filter(prop => prop.buildStatus && prop.buildStatus.completesAt);
  const hasActiveBuild = activeBuilds.length > 0;

  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? (state.auth.user as any)?.id);
  const { data: crewStatus } = useGetCrewStatusQuery();
  const { data: crewDetails, refetch: refetchCrewDetails } = useGetCrewDetailsQuery(crewStatus?.crewId ?? '', {
    skip: !crewStatus?.crewId || !crewStatus?.isInCrew || !hasActiveBuild,
    pollingInterval: hasActiveBuild ? 3000 : 0,
  });
  // Hide only for the displayed active build's property (jobKey); not for other properties' rentalBuild requests (Bugbot).
  const displayedRentalJobKey =
    activeBuilds.length > 0 ? `property${activeBuilds[0].propertyId}` : '';
  const hasRequestedBackupForRentalBuild = Boolean(
    currentUserId &&
    activeBuilds.length > 0 &&
    crewDetails?.crew?.backupRequests?.some(
      (r) =>
        String(r.userId) === String(currentUserId) &&
        (r.jobType === 'rentalBuild' || (r.jobLabel?.includes('Investment property') ?? false)) &&
        r.jobKey === displayedRentalJobKey
    )
  );
  const hadActiveBuildRef = useRef(false);
  useEffect(() => {
    if (hasActiveBuild && crewStatus?.crewId && crewStatus?.isInCrew && !hadActiveBuildRef.current) {
      hadActiveBuildRef.current = true;
      refetchCrewDetails();
    }
    if (!hasActiveBuild) hadActiveBuildRef.current = false;
  }, [hasActiveBuild, crewStatus?.crewId, crewStatus?.isInCrew, refetchCrewDetails]);
  const [requestCrewBackup] = useRequestCrewBackupMutation();

  const containerStyle = [
    styles.developmentZone,
    {
      backgroundColor: colors.matrix + '0D',
      borderColor: colors.matrix + '33'
    }
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.gridContainer}>
        <View style={styles.topRow}>
          {React.Children.toArray(children).slice(0, 2)}
        </View>
        <View style={styles.bottomRow}>
          {React.Children.toArray(children).slice(2, 4)}
        </View>
      </View>
      
      <Text style={[styles.zoneLabel, { color: colors.secondary }]}>
        INVESTMENT PROPERTIES
      </Text>

      {activeBuilds.length > 0 && (
        <View style={styles.timerContainer}>
          <BuildCountdownTimer
            completesAt={activeBuilds[0].buildStatus.completesAt}
            onComplete={activeBuilds[0].onComplete}
          />
          {crewStatus?.isInCrew && crewDetails != null && !hasRequestedBackupForRentalBuild && (
            <TouchableOpacity
              style={[styles.requestBackupButton, { backgroundColor: colors.primary, borderColor: colors.matrix }]}
              onPress={() => {
                requestCrewBackup({
                  jobType: 'rentalBuild',
                  jobKey: `property${activeBuilds[0].propertyId}`,
                });
              }}
            >
              <Text style={[styles.requestBackupText, { color: colors.background }]}>Request back-up</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  developmentZone: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    width: 600,
    height: 350,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1,
    paddingHorizontal: SIZING.spacing.lg,
    paddingTop: SIZING.spacing.lg,
    paddingBottom: SIZING.spacing.sm,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: SIZING.spacing.lg * 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: SIZING.spacing.lg * 6,
  },
  zoneLabel: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: SIZING.spacing.sm,
    width: '100%',
  },
  timerContainer: {
    position: 'absolute',
    top: '105%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  requestBackupButton: {
    marginTop: SIZING.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  requestBackupText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
