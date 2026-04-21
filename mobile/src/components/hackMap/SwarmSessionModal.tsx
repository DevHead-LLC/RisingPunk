import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import type { SwarmSession } from '../../store/api/swarmApi';
import { useAppSelector } from '../../store/hooks';
import { MARK2_DISPLAY_NAMES, M1_UNIT_DISPLAY_NAMES } from '../../utils/botInventory';

type Props = {
  visible: boolean;
  onClose: () => void;
  session: SwarmSession | null;
  currentUserId: string | null;
  onCommit: (payload: {
    slotIndex: number;
    botType: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    markLevel: 1 | 2;
  }) => Promise<void>;
  onDismiss: (slotIndex: number) => Promise<void>;
  onDeploy: () => Promise<void>;
  onAbort: () => Promise<void>;
  loading?: boolean;
};

export function SwarmSessionModal({
  visible,
  onClose,
  session,
  currentUserId,
  onCommit,
  onDismiss,
  onDeploy,
  onAbort,
  loading = false,
}: Props): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [botType, setBotType] = useState<'guardian' | 'breacher' | 'phreak'>('guardian');
  const [markLevel, setMarkLevel] = useState<1 | 2>(1);
  const botCountsM1 = useAppSelector((state) => state.bots.botCounts);
  const botCountsM2 = useAppSelector((state) => state.bots.botCountsM2);

  const isLead = session && currentUserId ? String(session.leaderUserId) === String(currentUserId) : false;
  const committedSlotSet = useMemo(() => {
    return new Set((session?.commitments ?? []).map((c) => c.slotIndex));
  }, [session?.commitments]);
  const availableJoinerSlots = useMemo(() => {
    const out: number[] = [];
    for (let i = 7; i <= 18; i += 1) {
      if (!committedSlotSet.has(i)) out.push(i);
    }
    return out;
  }, [committedSlotSet]);
  const myCommittedSlots = useMemo(() => {
    if (!session || !currentUserId) return [];
    return session.commitments.filter((c) => String(c.userId) === String(currentUserId));
  }, [session, currentUserId]);
  const participantUserIds = useMemo(() => {
    if (!session) return new Set<string>();
    return new Set(session.commitments.map((c) => String(c.userId)));
  }, [session]);
  const otherParticipants = useMemo(() => {
    if (!session) return 0;
    const ids = new Set(session.commitments.map(c => String(c.userId)).filter((id) => id !== String(session.leaderUserId)));
    return ids.size;
  }, [session]);
  const canDeploy = useMemo(() => {
    if (!session || session.state !== 'preparing') return false;
    const leadId = String(session.leaderUserId);
    const includesLead = participantUserIds.has(leadId);
    return includesLead && otherParticipants >= 1 && participantUserIds.size >= 2;
  }, [session, participantUserIds, otherParticipants]);
  const availableForSelectedMark = useMemo(() => {
    return markLevel === 2 ? botCountsM2 : botCountsM1;
  }, [markLevel, botCountsM1, botCountsM2]);

  React.useEffect(() => {
    if (selectedSlotIndex != null && availableJoinerSlots.includes(selectedSlotIndex)) {
      return;
    }
    setSelectedSlotIndex(availableJoinerSlots.length > 0 ? availableJoinerSlots[0] : null);
  }, [availableJoinerSlots, selectedSlotIndex]);

  React.useEffect(() => {
    if ((availableForSelectedMark[botType] ?? 0) > 0) return;
    const fallback = (['guardian', 'breacher', 'phreak'] as const).find(
      (t) => (availableForSelectedMark[t] ?? 0) > 0
    );
    if (fallback) setBotType(fallback);
  }, [availableForSelectedMark, botType]);

  /** Max barracks count for the selected family + Mark (joiner commit cannot exceed this). */
  const maxAvailableForSelectedType = useMemo(
    () => Math.max(0, Math.floor(availableForSelectedMark[botType] ?? 0)),
    [availableForSelectedMark, botType]
  );

  const handleQuantityChange = React.useCallback(
    (text: string) => {
      const digits = text.replace(/[^\d]/g, '');
      if (digits === '') {
        setQuantity('');
        return;
      }
      const n = parseInt(digits, 10);
      if (!Number.isFinite(n)) {
        setQuantity('');
        return;
      }
      const capped = maxAvailableForSelectedType > 0 ? Math.min(n, maxAvailableForSelectedType) : n;
      setQuantity(String(capped));
    },
    [maxAvailableForSelectedType]
  );

  // After mark/bot/inventory change, keep quantity within available so UX matches validation (Bugbot / ios-bugs.md).
  React.useEffect(() => {
    setQuantity((prev) => {
      const q = parseInt(prev, 10);
      if (!Number.isFinite(q)) return maxAvailableForSelectedType > 0 ? '1' : prev;
      if (maxAvailableForSelectedType <= 0) return prev;
      if (q > maxAvailableForSelectedType) return String(maxAvailableForSelectedType);
      if (q < 1) return '1';
      return prev;
    });
  }, [botType, markLevel, maxAvailableForSelectedType]);

  const handleCommit = async () => {
    try {
      const slot = selectedSlotIndex;
      const qty = Number(quantity);
      if (!Number.isInteger(slot) || !Number.isInteger(qty)) {
        Alert.alert('Swarm', 'Slot and quantity must be integers.');
        return;
      }
      if (qty < 1) {
        Alert.alert('Swarm', 'Quantity must be at least 1.');
        return;
      }
      if (slot < 7 || slot > 18) {
        Alert.alert('Swarm', 'Joiners must use slots 7-18.');
        return;
      }
      if (!availableJoinerSlots.includes(slot)) {
        Alert.alert('Swarm', 'That slot is no longer available.');
        return;
      }
      if ((availableForSelectedMark[botType] ?? 0) <= 0) {
        Alert.alert('Swarm', `No ${markLevel === 2 ? 'Mark II' : 'Mark I'} units available for that bot type.`);
        return;
      }
      if (qty > maxAvailableForSelectedType) {
        Alert.alert(
          'Swarm',
          `Quantity cannot exceed your available ${markLevel === 2 ? 'Mark II' : 'Mark I'} ${botType} bots (${maxAvailableForSelectedType}).`
        );
        return;
      }
      await onCommit({ slotIndex: slot, quantity: qty, botType, markLevel });
    } catch (e: any) {
      Alert.alert('Swarm', extractSwarmErrorMessage(e, 'Commit failed'));
    }
  };

  const handleDismiss = async (slot: number) => {
    try {
      await onDismiss(slot);
    } catch (e: any) {
      Alert.alert('Swarm', extractSwarmErrorMessage(e, 'Dismiss failed'));
    }
  };

  const handleDeploy = async () => {
    try {
      await onDeploy();
    } catch (e: any) {
      Alert.alert('Swarm', extractSwarmErrorMessage(e, 'Deploy failed'));
    }
  };

  const handleAbort = async () => {
    try {
      await onAbort();
    } catch (e: any) {
      Alert.alert('Swarm', extractSwarmErrorMessage(e, 'Abort failed'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['landscape']}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Swarm Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>
          {!session ? (
            <Text style={styles.emptyText}>No active swarm session.</Text>
          ) : (
            <ScrollView style={styles.scroll}>
              <Text style={styles.meta}>State: {session.state.toUpperCase()}</Text>
              <Text style={styles.meta}>Target: ({session.targetX}, {session.targetY})</Text>
              <Text style={styles.meta}>Other participants: {otherParticipants}</Text>
              <Text style={styles.meta}>Joiner slots open: {availableJoinerSlots.length} / 12</Text>
              <Text style={styles.meta}>Deadline: {new Date(session.deadlineAt).toLocaleTimeString()}</Text>

              {!isLead && session.state === 'preparing' && (
                <View style={styles.formBlock}>
                  <Text style={styles.sectionTitle}>Commit Joiner Slot (7-18)</Text>
                  <View style={styles.slotWrap}>
                    {Array.from({ length: 12 }, (_, idx) => idx + 7).map((slot) => {
                      const open = availableJoinerSlots.includes(slot);
                      const selected = selectedSlotIndex === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.slotChoice,
                            !open && styles.slotChoiceDisabled,
                            selected && styles.choiceActive,
                          ]}
                          onPress={() => {
                            if (!open) return;
                            setSelectedSlotIndex(slot);
                          }}
                          disabled={!open}
                        >
                          <Text style={styles.choiceText}>S{slot}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    value={quantity}
                    onChangeText={handleQuantityChange}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Quantity"
                    placeholderTextColor={colors.text.secondary}
                  />
                  <View style={styles.row}>
                    {(['guardian', 'breacher', 'phreak'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.choice,
                          botType === t && styles.choiceActive,
                          (availableForSelectedMark[t] ?? 0) <= 0 && styles.choiceDisabled,
                        ]}
                        onPress={() => {
                          if ((availableForSelectedMark[t] ?? 0) <= 0) return;
                          setBotType(t);
                        }}
                        disabled={(availableForSelectedMark[t] ?? 0) <= 0}
                      >
                        <Text style={styles.choiceText}>
                          {markLevel === 2 ? MARK2_DISPLAY_NAMES[t] : M1_UNIT_DISPLAY_NAMES[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.row}>
                    {[1, 2].map((m) => (
                      <TouchableOpacity key={m} style={[styles.choice, markLevel === m && styles.choiceActive]} onPress={() => setMarkLevel(m as 1 | 2)}>
                        <Text style={styles.choiceText}>Mark {m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.meta}>
                    Available {markLevel === 2 ? 'Mark II' : 'Mark I'}:
                    {' '}G {availableForSelectedMark.guardian ?? 0}
                    {' '}B {availableForSelectedMark.breacher ?? 0}
                    {' '}P {availableForSelectedMark.phreak ?? 0}
                  </Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleCommit} disabled={loading}>
                    <Text style={styles.primaryButtonText}>Commit</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isLead && session.state === 'preparing' && (
                <Text style={styles.meta}>
                  Lead setup is locked. Crew members use slots 7-18 to join this Swarm.
                </Text>
              )}

              {!isLead && session.state === 'preparing' && myCommittedSlots.length > 0 && (
                <Text style={styles.meta}>
                  Your committed slots: {myCommittedSlots.map((c) => `S${c.slotIndex}`).join(', ')}
                </Text>
              )}

              <Text style={styles.sectionTitle}>Committed Slots</Text>
              {session.commitments.map((c) => (
                <View key={c.slotIndex} style={styles.commitmentRow}>
                  <Text style={styles.commitmentText}>
                    S{c.slotIndex} · @{c.userHandle ?? c.userId} · {c.botType} M{c.markLevel} · {c.quantity}
                  </Text>
                  {isLead && session.state === 'preparing' && c.slotIndex >= 7 && (
                    <TouchableOpacity onPress={() => handleDismiss(c.slotIndex)} style={styles.smallButton}>
                      <Text style={styles.smallButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {isLead && (
                <View style={styles.actionRow}>
                  {session.state === 'preparing' && (
                    <TouchableOpacity
                      style={[styles.primaryButton, (!canDeploy || loading) && styles.primaryButtonDisabled]}
                      onPress={handleDeploy}
                      disabled={loading || !canDeploy}
                    >
                      <Text style={styles.primaryButtonText}>Distribute Payload</Text>
                    </TouchableOpacity>
                  )}
                  {session.state === 'preparing' && !canDeploy && (
                    <Text style={styles.meta}>
                      Need at least 2 participants including lead (lead + 1 crew member minimum).
                    </Text>
                  )}
                  {(session.state === 'preparing' || session.state === 'marching') && (
                    <TouchableOpacity style={styles.abortButton} onPress={handleAbort} disabled={loading}>
                      <Text style={styles.abortText}>Abort Swarm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function extractSwarmErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; data?: { error?: unknown }; error?: unknown };
    if (typeof maybe.data?.error === 'string' && maybe.data.error.trim().length > 0) {
      return maybe.data.error;
    }
    if (typeof maybe.error === 'string' && maybe.error.trim().length > 0) {
      return maybe.error;
    }
    if (typeof maybe.message === 'string' && maybe.message.trim().length > 0) {
      return maybe.message;
    }
  }
  return fallback;
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '70%', maxHeight: '85%', backgroundColor: colors.background, borderColor: colors.secondary, borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZING.spacing.sm },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: '700' },
  closeButton: { paddingHorizontal: 8, paddingVertical: 2 },
  closeText: { color: colors.text.primary, fontSize: 24, lineHeight: 24 },
  emptyText: { color: colors.text.secondary },
  scroll: { maxHeight: '100%' },
  meta: { color: colors.text.primary, fontSize: 12, marginBottom: 4 },
  sectionTitle: { color: colors.text.primary, fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  formBlock: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.secondary, paddingTop: 8 },
  input: { borderWidth: 1, borderColor: colors.secondary, borderRadius: 6, color: colors.text.primary, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  slotChoice: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.secondary, minWidth: 50, alignItems: 'center' },
  slotChoiceDisabled: { opacity: 0.35 },
  choice: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.secondary },
  choiceDisabled: { opacity: 0.35 },
  choiceActive: { backgroundColor: `${colors.matrix}33` },
  choiceText: { color: colors.text.primary, fontSize: 12 },
  primaryButton: { backgroundColor: colors.matrix, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', marginTop: 4 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: colors.background, fontWeight: '700', fontSize: 12 },
  commitmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: `${colors.secondary}44`, paddingVertical: 6 },
  commitmentText: { color: colors.text.primary, fontSize: 12 },
  smallButton: { borderWidth: 1, borderColor: colors.error, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  smallButtonText: { color: colors.error, fontSize: 11, fontWeight: '700' },
  actionRow: { marginTop: 12, gap: 8 },
  abortButton: { borderWidth: 1, borderColor: colors.error, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  abortText: { color: colors.error, fontWeight: '700', fontSize: 12 },
});

