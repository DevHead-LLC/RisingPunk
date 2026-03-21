import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useGetActiveJobsQuery } from '../../store/api/authApi';
import type { ActiveJobEntry } from '../../store/api/authApi';

function formatTimeRemaining(completesAt: string, nowMs: number): string {
  const completionTime = new Date(completesAt).getTime();
  const remaining = Math.max(0, completionTime - nowMs);
  const totalSeconds = Math.floor(remaining / 1000);
  if (totalSeconds <= 0) return 'Complete';
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function JobRow({ job, nowMs }: { job: ActiveJobEntry; nowMs: number }) {
  const colors = useThemeColors();
  const timeStr = formatTimeRemaining(job.completesAt, nowMs);
  return (
    <View style={styles.jobRow}>
      <Text style={[styles.jobLabel, { color: colors.text.primary }]} numberOfLines={2}>
        {job.label}
      </Text>
      <Text style={[styles.jobTimer, { color: colors.matrix }]}>
        {timeStr}
      </Text>
    </View>
  );
}

interface ActiveJobsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ActiveJobsModal: React.FC<ActiveJobsModalProps> = ({ visible, onClose }) => {
  const colors = useThemeColors();
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { data, isLoading } = useGetActiveJobsQuery(undefined, {
    skip: !visible,
    pollingInterval: visible ? 5000 : 0,
  });

  useEffect(() => {
    if (!visible) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const jobs = data?.jobs ?? [];
  const isEmpty = !isLoading && jobs.length === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape-left', 'landscape-right']}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.content, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Active Jobs</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.text.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Loading…</Text>
          ) : isEmpty ? (
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No active jobs</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {jobs.map((job, index) => (
                <JobRow key={`${job.jobType}-${job.completesAt}-${index}`} job={job} nowMs={nowMs} />
              ))}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    padding: SIZING.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  title: {
    fontSize: SIZING.font.title,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: SIZING.spacing.sm,
  },
  closeText: {
    fontSize: SIZING.font.body,
  },
  emptyText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    paddingVertical: SIZING.spacing.lg,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: SIZING.spacing.md,
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.4)',
  },
  jobLabel: {
    flex: 1,
    fontSize: SIZING.font.body,
    marginRight: SIZING.spacing.sm,
  },
  jobTimer: {
    fontSize: SIZING.font.body,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
});
