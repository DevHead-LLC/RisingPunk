import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { SIZING } from '../styles/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import {
  useStartPacketBreachSessionMutation,
  useSubmitPacketBreachAttemptMutation,
  useClaimPacketBreachLevelMutation,
  useGetPacketBreachStatusQuery,
  type NodeDef,
} from '../store/api/packetBreachApi';

type AttemptEntry = {
  sequenceLabel: string;
  /** When true, server returned no feedback (decoy was used). */
  feedbackWithheld?: boolean;
  routed?: number;
  misrouted?: number;
  rejected?: number;
};

type PacketBreachGameScreenProps = {
  levelId: string;
  /** When present (e.g. from level screen after startSession), use this and do not call startSession again to avoid double charge. */
  initialSession?: { nodePool: NodeDef[]; slots: number; attemptsLeft: number } | null;
  onClose: () => void;
};

/** Digits mode: pool has 3 nodes (tiers 1–6), 4 with decoy (tiers 7–12), or 5 with decoy (tiers 13+); ids "1"–"3", "1"–"4", or "1"–"5". */
function isDigitsMode(nodePool: NodeDef[]): boolean {
  const validIds =
    nodePool.length === 3
      ? (n: NodeDef) => n.id === '1' || n.id === '2' || n.id === '3'
      : nodePool.length === 4
        ? (n: NodeDef) => n.id === '1' || n.id === '2' || n.id === '3' || n.id === '4'
        : (n: NodeDef) => n.id === '1' || n.id === '2' || n.id === '3' || n.id === '4' || n.id === '5';
  return (
    (nodePool.length === 3 || nodePool.length === 4 || nodePool.length === 5) &&
    nodePool.every(validIds) &&
    nodePool.some((n) => n.protocol === 'tcp')
  );
}

function formatSequenceLabel(sequence: string[], nodePool: NodeDef[]): string {
  if (isDigitsMode(nodePool)) {
    return sequence.join(', ');
  }
  return sequence
    .map((id) => {
      const node = nodePool.find((n) => n.id === id);
      return node ? `${node.protocol} ${node.port}` : id;
    })
    .join(', ');
}

const DIGIT_IMAGES: Record<string, number> = {
  tcp: require('../assets/images/miniGame/tcp.png'),
  udp: require('../assets/images/miniGame/udp.png'),
  ssh: require('../assets/images/miniGame/ssh.png'),
  http: require('../assets/images/miniGame/http.png'),
  https: require('../assets/images/miniGame/https.png'),
  dns: require('../assets/images/miniGame/dns.png'),
};

export function PacketBreachGameScreen({ levelId, initialSession, onClose }: PacketBreachGameScreenProps) {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const digitColor = themeMode === 'light' ? colors.secondary : (colors.matrix ?? colors.success);
  const [nodePool, setNodePool] = useState<NodeDef[]>([]);
  const [slots, setSlots] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<AttemptEntry[]>([]);
  const [win, setWin] = useState(false);
  const [lostAll, setLostAll] = useState(false);
  const [antiSolutionTriggered, setAntiSolutionTriggered] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  /** When true, we got win from submit but claim API failed; user can retry claim. */
  const [claimError, setClaimError] = useState(false);
  /** When true, a retry claim is in progress; keep showing claim UI to avoid flashing game board. */
  const [claimingInProgress, setClaimingInProgress] = useState(false);
  const lostOrWonRef = useRef(false);

  const [startSession, { isLoading: starting, error: startError }] =
    useStartPacketBreachSessionMutation();
  const [submitAttempt, { isLoading: submitting }] = useSubmitPacketBreachAttemptMutation();
  const [claimLevel] = useClaimPacketBreachLevelMutation();
  useGetPacketBreachStatusQuery(undefined, { refetchOnMountOrArgChange: true });

  useEffect(() => {
    if (initialSession) {
      setNodePool(initialSession.nodePool);
      setSlots(initialSession.slots);
      setAttemptsLeft(initialSession.attemptsLeft);
      setSequence([]);
      setAttemptHistory([]);
      setWin(false);
      setLostAll(false);
      setAntiSolutionTriggered(false);
      setInsufficientFunds(false);
      setClaimError(false);
      setClaimingInProgress(false);
      lostOrWonRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await startSession(levelId).unwrap();
        if (!cancelled) {
          setNodePool(result.nodePool);
          setSlots(result.slots);
          setAttemptsLeft(result.attemptsLeft);
          setSequence([]);
          setAttemptHistory([]);
          setWin(false);
          setLostAll(false);
          setAntiSolutionTriggered(false);
          setInsufficientFunds(false);
          setClaimError(false);
          setClaimingInProgress(false);
          lostOrWonRef.current = false;
        }
      } catch (_) {
        if (!cancelled) {
          setLostAll(false);
          setWin(false);
          setInsufficientFunds(false);
          setClaimError(false);
          setClaimingInProgress(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [levelId, startSession, initialSession]);

  const addToSequence = useCallback(
    (nodeId: string) => {
      if (sequence.length >= slots || win || lostAll) return;
      setSequence((prev) => (prev.length < slots ? [...prev, nodeId] : prev));
    },
    [sequence.length, slots, win, lostAll]
  );

  const clearSequence = useCallback(() => {
    setSequence([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (sequence.length !== slots || submitting || win || lostAll || lostOrWonRef.current) return;
    setInsufficientFunds(false);
    try {
      const result = await submitAttempt({ levelId, sequence }).unwrap();
      if (lostOrWonRef.current) return;
      const feedbackWithheld = result.decoyUsed === true || result.routed === undefined;
      const entry: AttemptEntry = {
        sequenceLabel: formatSequenceLabel(sequence, nodePool),
        ...(feedbackWithheld
          ? { feedbackWithheld: true }
          : {
              routed: result.routed,
              misrouted: result.misrouted,
              rejected: result.rejected,
            }),
      };
      setAttemptHistory((prev) => [entry, ...prev]);
      setAttemptsLeft(result.attemptsLeft);
      setSequence([]);
      if (result.win) {
        lostOrWonRef.current = true;
        setClaimingInProgress(true);
        try {
          await claimLevel(levelId).unwrap();
          setWin(true);
          setClaimError(false);
        } catch {
          setWin(true);
          setClaimError(true);
        } finally {
          setClaimingInProgress(false);
        }
      } else if (result.lostAllAttempts || result.attemptsLeft === 0) {
        lostOrWonRef.current = true;
        setAntiSolutionTriggered(result.antiSolutionTriggered === true);
        setLostAll(true);
      }
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 402) {
        setInsufficientFunds(true);
      }
      // Other errors surfaced by API / global handler
    }
  }, [levelId, sequence, slots, submitting, win, lostAll, submitAttempt, claimLevel, nodePool]);

  const handleRetryClaim = useCallback(async () => {
    setClaimingInProgress(true);
    try {
      await claimLevel(levelId).unwrap();
      setClaimingInProgress(false);
      setClaimError(false);
      setWin(true);
    } catch {
      setClaimingInProgress(false);
      setClaimError(true);
    }
  }, [levelId, claimLevel]);

  if (startError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <Text style={[styles.errorText, { color: colors.error }]}>
          Could not start level. Try again from the level select.
        </Text>
      </View>
    );
  }

  if (starting || (nodePool.length === 0 && !startError)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (claimError || claimingInProgress) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <View style={styles.centered}>
          <Text style={[styles.winTitle, { color: colors.success ?? colors.primary }]}>
            Level complete
          </Text>
          {claimingInProgress ? (
            <>
              <Text style={[styles.lostSub, { color: colors.text?.secondary ?? colors.primary }]}>
                Claiming reward…
              </Text>
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            </>
          ) : (
            <>
              <Text style={[styles.lostSub, { color: colors.text?.secondary ?? colors.primary }]}>
                Claiming the reward failed. Tap Retry to try again.
              </Text>
              <TouchableOpacity
                style={[styles.backButton, { borderColor: colors.primary }]}
                onPress={handleRetryClaim}
              >
                <Text style={[styles.backButtonText, { color: colors.primary }]}>Retry claim</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.primary, marginTop: SIZING.spacing.sm }]}
            onPress={onClose}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to levels</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (win) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <View style={styles.centered}>
          <Text style={[styles.winTitle, { color: colors.success ?? colors.primary }]}>
            Level complete!
          </Text>
          <Text style={[styles.winSub, { color: colors.text?.secondary ?? colors.primary }]}>
            You breached the node.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to levels</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (lostAll) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <View style={styles.centered}>
          <Text style={[styles.lostTitle, { color: colors.error }]}>
            {antiSolutionTriggered ? "You've Been Traced!" : 'FAILED'}
          </Text>
          <Text style={[styles.lostSub, { color: colors.text?.secondary ?? colors.primary }]}>
            {antiSolutionTriggered
              ? "Your sequence matched the hidden trap. All attempts lost for this run."
              : 'Try again from level select. Attempts will reset for your next run.'}
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to levels</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onClose} />
      <View style={styles.mainContent}>
        <View style={styles.gameArea}>
          <Text style={[styles.title, { color: colors.primary }]}>Level {levelId}</Text>
          <Text style={[styles.attempts, { color: colors.text?.secondary ?? colors.primary }]}>
            Attempts left: {attemptsLeft}
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Node pool — tap to add to sequence</Text>
          <View style={styles.grid}>
            {nodePool.map((node) => {
              const imageSource = isDigitsMode(nodePool) ? DIGIT_IMAGES[node.protocol] : null;
              const cellContent = imageSource ? (
                <View style={styles.digitCellInner}>
                  <ImageBackground
                    source={imageSource}
                    style={styles.digitImageBg}
                    resizeMode="cover"
                  />
                  <Text style={[styles.digitNumber, styles.digitNumberPosition, { color: digitColor }]}>{node.id}</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.nodeProtocol, { color: colors.text?.secondary ?? colors.primary }]}>
                    {node.protocol}
                  </Text>
                  <Text style={[styles.nodePort, { color: colors.primary }]}>{node.port}</Text>
                </>
              );
              return (
                <TouchableOpacity
                  key={node.id}
                  style={[styles.nodeCell, { borderColor: colors.primary }]}
                  onPress={() => addToSequence(node.id)}
                  disabled={sequence.length >= slots}
                  accessible
                  accessibilityLabel={
                    isDigitsMode(nodePool)
                      ? `Number ${node.id}`
                      : `Node ${node.protocol} port ${node.port}`
                  }
                  accessibilityRole="button"
                >
                  {cellContent}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Your sequence ({sequence.length}/{slots})</Text>
          <View style={styles.sequenceRow}>
            {sequence.map((id, i) => {
              const node = nodePool.find((n) => n.id === id);
              const slotImage = node && isDigitsMode(nodePool) ? DIGIT_IMAGES[node.protocol] : null;
              return (
                <View
                  key={`${i}-${id}`}
                  style={[styles.sequenceSlot, { borderColor: colors.primary }]}
                >
                  {slotImage ? (
                    <View style={styles.digitCellInner}>
                      <ImageBackground
                        source={slotImage}
                        style={styles.digitImageBg}
                        resizeMode="cover"
                      />
                      <Text style={[styles.digitNumber, styles.digitNumberPosition, { color: digitColor }]}>{id}</Text>
                    </View>
                  ) : node ? (
                    <>
                      <Text style={[styles.nodeProtocol, { color: colors.text?.secondary ?? colors.primary }]}>
                        {node.protocol}
                      </Text>
                      <Text style={[styles.nodePort, { color: colors.primary }]}>{node.port}</Text>
                    </>
                  ) : (
                    <Text style={[styles.placeholder, { color: colors.text?.secondary ?? colors.primary }]}>—</Text>
                  )}
                </View>
              );
            })}
            {Array.from({ length: Math.max(0, slots - sequence.length) }).map((_, i) => (
              <View
                key={`empty-${i}`}
                style={[styles.sequenceSlot, styles.sequenceSlotEmpty, { borderColor: colors.primary }]}
              >
                <Text style={[styles.placeholder, { color: colors.text?.secondary ?? colors.primary }]}>—</Text>
              </View>
            ))}
          </View>

          {insufficientFunds && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              Insufficient funds for this attempt. Each try costs the level fee.
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.primary }]}
              onPress={clearSequence}
              disabled={sequence.length === 0}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.submitButton,
                { backgroundColor: colors.matrix ?? colors.primary, borderColor: colors.matrix ?? colors.primary },
              ]}
              onPress={handleSubmit}
              disabled={sequence.length !== slots || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={[styles.actionButtonText, { color: colors.background }]}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {attemptHistory.length > 0 && (
          <View style={[styles.historyPanel, { borderColor: colors.primary }]}>
            <Text style={[styles.sectionLabel, styles.attemptPanelTitle, { color: colors.primary }]}>
              Previous attempts
            </Text>
            <ScrollView
              style={styles.attemptHistoryScroll}
              contentContainerStyle={styles.attemptHistoryContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {attemptHistory.map((entry, index) => (
                <View
                  key={`attempt-${index}`}
                  style={[styles.attemptRow, { borderColor: colors.primary }]}
                >
                  <Text
                    style={[styles.attemptSequence, { color: colors.text?.secondary ?? colors.primary }]}
                    numberOfLines={1}
                  >
                    {entry.sequenceLabel}
                  </Text>
                  <Text style={[styles.attemptFeedback, { color: colors.primary }]}>
                    {entry.feedbackWithheld
                      ? 'No signal'
                      : `Routed: ${entry.routed} · Misrouted: ${entry.misrouted} · Rejected: ${entry.rejected}`}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  gameArea: {
    flexShrink: 0,
  },
  historyPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    marginTop: SIZING.spacing.xs,
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 100,
  },
  attemptPanelTitle: {
    marginBottom: SIZING.spacing.sm,
  },
  title: {
    fontSize: SIZING.font.large,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  attempts: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.sm,
  },
  sectionLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.sm,
  },
  nodeCell: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  digitCellInner: {
    width: 64,
    height: 56,
    borderRadius: 6,
    overflow: 'visible',
  },
  digitImageBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    overflow: 'hidden',
  },
  digitNumber: {
    fontSize: SIZING.font.large,
    fontWeight: '700',
  },
  digitNumberPosition: {
    position: 'absolute',
    bottom: -7,
    right: -7,
    zIndex: 10,
  },
  nodeProtocol: {
    fontSize: SIZING.font.small,
  },
  nodePort: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  sequenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  sequenceSlot: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  sequenceSlotEmpty: {
    opacity: 0.6,
  },
  placeholder: {
    fontSize: SIZING.font.small,
  },
  attemptHistoryScroll: {
    flex: 1,
    minHeight: 80,
  },
  attemptHistoryContent: {
    paddingRight: SIZING.spacing.xs,
    paddingBottom: SIZING.spacing.sm,
  },
  attemptRow: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
  },
  attemptSequence: {
    fontSize: SIZING.font.small,
    marginBottom: 2,
  },
  attemptFeedback: {
    fontSize: SIZING.font.small,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.lg,
  },
  submitButton: {},
  actionButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  loader: {
    marginTop: SIZING.spacing.xl,
  },
  errorText: {
    fontSize: SIZING.font.body,
    marginTop: SIZING.spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  winTitle: {
    fontSize: SIZING.font.large,
    fontWeight: '700',
    marginBottom: SIZING.spacing.xs,
  },
  winSub: {
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.lg,
  },
  lostTitle: {
    fontSize: SIZING.font.large,
    fontWeight: '700',
    marginBottom: SIZING.spacing.xs,
  },
  lostSub: {
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.lg,
  },
  backButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.lg,
  },
  backButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
});
