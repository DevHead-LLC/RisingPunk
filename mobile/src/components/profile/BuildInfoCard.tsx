import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBuildInfo } from '../../utils/BuildInfo';
import Config from 'react-native-config';
import { API_URL } from '../../config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

interface BuildInfo {
  versionCode: number;
  versionName: string;
  debug: boolean;
}

export function BuildInfoCard(): React.JSX.Element {
  const colors = useThemeColors();
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBuildInfo = async () => {
      try {
        const info = await getBuildInfo();
        setBuildInfo(info);
      } catch (error) {
        console.error('Failed to load build info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBuildInfo();
  }, []);

  const apiEnv = Config.API_ENV || 'unknown';
  const apiUrl = API_URL;
  const isProduction = apiEnv === 'prod';
  const isStaging = apiEnv === 'staging';
  const isDev = apiEnv === 'dev';

  // Determine environment status color
  const getEnvColor = () => {
    if (isProduction) return colors.matrix;
    if (isStaging) return '#FFA500'; // Orange for staging
    if (isDev) return '#00FF00'; // Green for dev
    return colors.error; // Red for unknown
  };

  const getEnvStatus = () => {
    if (isProduction) return '✅ PRODUCTION';
    if (isStaging) return '⚠️ STAGING';
    if (isDev) return '🔧 DEVELOPMENT';
    return '❌ UNKNOWN';
  };

  if (loading) {
    return (
      <View style={[styles.container, { borderColor: colors.matrix }]}>
        <Text style={[styles.label, { color: colors.text.primary }]}>BUILD INFORMATION</Text>
        <Text style={[styles.value, { color: colors.text.secondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: colors.matrix }]}>
      <Text style={[styles.label, { color: colors.text.primary }]}>BUILD INFORMATION</Text>
      
      {/* Version Info */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Version Code:</Text>
        <Text style={[styles.infoValue, { color: colors.text.primary }]}>
          {buildInfo?.versionCode ?? 'N/A'}
        </Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Version Name:</Text>
        <Text style={[styles.infoValue, { color: colors.text.primary }]}>
          {buildInfo?.versionName ?? 'N/A'}
        </Text>
      </View>

      {/* Environment Info */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Environment:</Text>
        <Text style={[styles.infoValue, { color: getEnvColor() }]}>
          {getEnvStatus()}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>API_ENV:</Text>
        <Text style={[styles.infoValue, { 
          color: isProduction ? colors.matrix : isStaging ? '#FFA500' : colors.text.primary 
        }]}>
          {apiEnv.toUpperCase()}
        </Text>
      </View>

      {/* API URL */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>API URL:</Text>
        <Text 
          style={[styles.infoValue, { 
            color: apiUrl.includes('risingpunk.com') ? colors.matrix : 
                   apiUrl.includes('risingpunk.dev') ? '#FFA500' : colors.text.primary,
            fontSize: SIZING.font.small,
          }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {apiUrl}
        </Text>
      </View>

      {/* Critical Warning for Production */}
      {!isProduction && (
        <View style={[styles.warningBox, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
          <Text style={[styles.warningText, { color: colors.error }]}>
            ⚠️ WARNING: This build is NOT connecting to production!
          </Text>
          <Text style={[styles.warningSubtext, { color: colors.text.secondary }]}>
            Expected: api.risingpunk.com
          </Text>
          <Text style={[styles.warningSubtext, { color: colors.text.secondary }]}>
            Actual: {apiUrl}
          </Text>
        </View>
      )}

      {/* Success Message for Production */}
      {isProduction && apiUrl.includes('risingpunk.com') && (
        <View style={[styles.warningBox, { backgroundColor: colors.matrix + '20', borderColor: colors.matrix }]}>
          <Text style={[styles.warningText, { color: colors.matrix }]}>
            ✅ CONFIRMED: Production environment active
          </Text>
          <Text style={[styles.warningSubtext, { color: colors.text.secondary }]}>
            Connected to: {apiUrl}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginTop: SIZING.spacing.md,
  },
  label: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  value: {
    fontSize: SIZING.font.body,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZING.spacing.xs,
  },
  infoLabel: {
    fontSize: SIZING.font.small,
    flex: 1,
  },
  infoValue: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  warningBox: {
    marginTop: SIZING.spacing.sm,
    padding: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
  },
  warningText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  warningSubtext: {
    fontSize: SIZING.font.small,
    marginTop: 2,
  },
});
