import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { SIZING } from '../styles/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  useAttemptRaceConditionHeistHijackMutation,
  useEndRaceConditionHeistRunMutation,
  useClaimRaceConditionHeistLevelMutation,
  type RaceConditionHeistSessionResponse,
  type RCHPacket,
  type RaceConditionHeistClientViewpoint,
} from '../store/api/raceConditionHeistApi';

type RaceConditionHeistGameScreenProps = {
  levelId: string;
  initialSession: RaceConditionHeistSessionResponse | null;
  onClose: () => void;
};

const TICK_MS = 100;

export function RaceConditionHeistGameScreen({
  levelId,
  initialSession,
  onClose,
}: RaceConditionHeistGameScreenProps) {
  const colors = useThemeColors();
  const [session, setSession] = useState<RaceConditionHeistSessionResponse | null>(initialSession);
  /** Elapsed time synced with server using session.startedAt so word rotation and exploit validation match. */
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phase, setPhase] = useState<'RUNNING' | 'LOCKDOWN' | 'RESULTS'>(initialSession?.phase ?? 'RUNNING');
  const [won, setWon] = useState(false);
  const [claimError, setClaimError] = useState(false);
  const [claimingInProgress, setClaimingInProgress] = useState(false);
  /** Brief feedback after hijack attempt: 'stolen' | 'missed' | null. */
  const [hijackFeedback, setHijackFeedback] = useState<'stolen' | 'missed' | null>(null);
  /** When missed, reason for hint (e.g. complete_first_node for tier 2). */
  const [lastAttemptReason, setLastAttemptReason] = useState<string | null>(null);
  /** True once score >= threshold and we're auto-ending/claiming (show "Level complete! Claiming…"). */
  const [autoCompleting, setAutoCompleting] = useState(false);
  /** Tier 5+: instant fail when user tapped on secure word — show "You've been traced! FATAL FAILURE" then kick to level select. */
  const [fatalFailure, setFatalFailure] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCompleteTriggeredRef = useRef(false);
  const timerExpireTriggeredRef = useRef(false);
  const victoryAutoCloseTriggeredRef = useRef(false);
  const onCloseRef = useRef(onClose);
  /** Skew so client word timing matches server: serverNow ≈ Date.now() + timeSkewMsRef.current */
  const timeSkewMsRef = useRef(0);
  /** Client viewpoint at touch-down (ms-precision) for server comparison; see taskItems/problemSolvingTempFile.md */
  const clientViewpointAtTapRef = useRef<{
    clientTimestampMs: number;
    displayedWordIndex: number;
    displayedWordLabel: string;
    clientPhaseElapsedMs: number;
    wordDurationMs: number;
    wordCount: number;
  } | null>(null);
  onCloseRef.current = onClose;

  const [attemptHijack] = useAttemptRaceConditionHeistHijackMutation();
  const [endRun] = useEndRaceConditionHeistRunMutation();
  const [claimLevel] = useClaimRaceConditionHeistLevelMutation();

  const matchDurationMs = session?.matchDurationMs ?? 0;
  const timeRemainingMs = Math.max(0, matchDurationMs - elapsedMs);
  /** Use server-provided threshold (tier 1 = 50, tier 2 = 100 for two nodes). */
  const scoreThreshold = session?.scoreThreshold ?? 50;
  /** Tier from levelId (e.g. "2.1" → 2). Tier 2 = two nodes, tier 3 = three, tier 4 and 5 = four nodes. */
  const tier = levelId.includes('.') ? parseInt(levelId.split('.')[0], 10) : 1;
  const isTier2 = tier === 2;
  const isTier3 = tier === 3;
  const isTier4 = tier === 4;
  const isTier5 = tier === 5;
  const multiNodeTier = isTier2 || isTier3 || isTier4 || isTier5;

  /** Keep client word timing in sync with server using serverTime from responses. */
  useEffect(() => {
    const serverTime = session?.serverTime;
    if (serverTime != null) {
      timeSkewMsRef.current = new Date(serverTime).getTime() - Date.now();
    }
  }, [session?.serverTime]);

  useEffect(() => {
    if (!session?.startedAt || phase !== 'RUNNING') return;
    const startedAt = new Date(session.startedAt).getTime();
    const syncElapsed = () => {
      const serverAdjustedNow = Date.now() + timeSkewMsRef.current;
      const elapsed = Math.min(serverAdjustedNow - startedAt, matchDurationMs);
      setElapsedMs(elapsed);
      return elapsed;
    };
    syncElapsed();
    tickRef.current = setInterval(() => {
      const elapsed = syncElapsed();
      if (elapsed >= matchDurationMs && tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }, TICK_MS);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [session?.startedAt, phase, matchDurationMs]);

  /** Reset auto-complete and timer-expire refs when level or run changes so each run can trigger (e.g. level 1.2 after 1.1). */
  useEffect(() => {
    autoCompleteTriggeredRef.current = false;
    timerExpireTriggeredRef.current = false;
    victoryAutoCloseTriggeredRef.current = false;
  }, [levelId, session?.startedAt]);

  /** Tier 5+ fatal: show message then kick back to level select after delay. */
  useEffect(() => {
    if (!fatalFailure) return;
    const t = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        onCloseRef.current();
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [fatalFailure]);

  useEffect(() => {
    if (phase !== 'RUNNING' || elapsedMs < matchDurationMs || timerExpireTriggeredRef.current) return;
    timerExpireTriggeredRef.current = true;
    (async () => {
      try {
        const result = await endRun(levelId).unwrap();
        setPhase('LOCKDOWN');
        setSession((s) => (s ? { ...s, phase: 'LOCKDOWN', packets: result.packets, score: result.score, comboCount: result.comboCount } : null));
        setWon(result.won);
      } catch (_) {
        setPhase('RESULTS');
        setWon(false);
      }
    })();
  }, [phase, elapsedMs, matchDurationMs, levelId, endRun]);

  useEffect(() => {
    if (
      !session ||
      phase !== 'RUNNING' ||
      session.score < scoreThreshold ||
      autoCompleteTriggeredRef.current
    ) {
      return;
    }
    autoCompleteTriggeredRef.current = true;
    setAutoCompleting(true);
    const t = setTimeout(async () => {
      try {
        const result = await endRun(levelId).unwrap();
        if (result.won) {
          try {
            await claimLevel(levelId).unwrap();
            InteractionManager.runAfterInteractions(() => {
              onCloseRef.current();
            });
            return;
          } catch (_) {
            setAutoCompleting(false);
            setPhase('LOCKDOWN');
            setSession((s) =>
              s ? { ...s, phase: 'LOCKDOWN', packets: result.packets, score: result.score, comboCount: result.comboCount } : null
            );
            setWon(true);
            setClaimError(true);
            return;
          }
        }
        setAutoCompleting(false);
        setPhase('LOCKDOWN');
        setSession((s) =>
          s ? { ...s, phase: 'LOCKDOWN', packets: result.packets, score: result.score, comboCount: result.comboCount } : null
        );
        setWon(false);
      } catch (_) {
        setAutoCompleting(false);
        setPhase('LOCKDOWN');
        setSession((s) => (s ? { ...s, phase: 'LOCKDOWN' } : null));
        setWon(false);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [session?.score, phase, scoreThreshold, levelId, endRun, claimLevel]);

  /** When we've won (LOCKDOWN + won), show brief success then auto-claim and navigate back. No "Run complete" / "Back to levels" for win. */
  useEffect(() => {
    if (phase !== 'LOCKDOWN' || !won || claimError || claimingInProgress || victoryAutoCloseTriggeredRef.current) {
      return;
    }
    victoryAutoCloseTriggeredRef.current = true;
    const t = setTimeout(async () => {
      try {
        await claimLevel(levelId).unwrap();
        InteractionManager.runAfterInteractions(() => {
          onCloseRef.current();
        });
      } catch (_) {
        setClaimError(true);
        victoryAutoCloseTriggeredRef.current = false;
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, won, claimError, claimingInProgress, levelId, claimLevel]);

  const handleHijack = useCallback(
    async (packetId: string, viewpoint: RaceConditionHeistClientViewpoint | null) => {
      if (!session || phase !== 'RUNNING') return;
      setHijackFeedback(null);
      setLastAttemptReason(null);
      const displayedWordIndex = viewpoint?.displayedWordIndex ?? 0;
      const body: Parameters<ReturnType<typeof useAttemptRaceConditionHeistHijackMutation>[0]>[0] = {
        levelId,
        packetId,
        displayedWordIndex,
        ...(viewpoint && { clientViewpoint: viewpoint }),
      };
      if (__DEV__) {
        if (viewpoint) {
          console.log('[RCH-attempt client]', JSON.stringify({
            displayedWordIndex: viewpoint.displayedWordIndex,
            displayedWordLabel: viewpoint.displayedWordLabel,
            clientTimestampMs: viewpoint.clientTimestampMs,
            clientPhaseElapsedMs: viewpoint.clientPhaseElapsedMs,
            wordDurationMs: viewpoint.wordDurationMs,
            wordCount: viewpoint.wordCount,
          }));
        } else {
          console.log('[RCH-attempt client] viewpoint=null (using displayedWordIndex=', displayedWordIndex, ')');
        }
      }
      try {
        const result = await attemptHijack(body).unwrap();
        setSession((s) => {
          if (!s) return null;
          const next: RaceConditionHeistSessionResponse = {
            ...s,
            packets: result.packets,
            score: result.score,
            comboCount: result.comboCount,
            exploitCooldownUntil: result.exploitCooldownUntil,
            ...(result.serverTime != null && { serverTime: result.serverTime }),
          };
          /** Merge phase word data whenever server sends it so display rotates per node. */
          if (result.wordRotationPhase2 && result.wordRotationPhase2.length > 0) {
            next.wordRotationPhase2 = result.wordRotationPhase2;
            next.wordStartOffsetPhase2 = typeof result.wordStartOffsetPhase2 === 'number' ? result.wordStartOffsetPhase2 : 0;
            if (result.phase2StartedAt != null) next.phase2StartedAt = result.phase2StartedAt;
          }
          if (result.wordRotationPhase3 && result.wordRotationPhase3.length > 0) {
            next.wordRotationPhase3 = result.wordRotationPhase3;
            next.wordStartOffsetPhase3 = typeof result.wordStartOffsetPhase3 === 'number' ? result.wordStartOffsetPhase3 : 0;
            if (result.phase3StartedAt != null) next.phase3StartedAt = result.phase3StartedAt;
          }
          if (result.wordRotationPhase4 && result.wordRotationPhase4.length > 0) {
            next.wordRotationPhase4 = result.wordRotationPhase4;
            next.wordStartOffsetPhase4 = typeof result.wordStartOffsetPhase4 === 'number' ? result.wordStartOffsetPhase4 : 0;
            if (result.phase4StartedAt != null) next.phase4StartedAt = result.phase4StartedAt;
          }
          return next;
        });
        if (result.reason === 'fatal_secure_word') {
          setSession(null);
          setFatalFailure(true);
          return;
        }
        if (result.success) {
          setHijackFeedback('stolen');
          setLastAttemptReason(null);
        } else if (result.reason === 'missed_window') {
          setHijackFeedback('missed');
          setLastAttemptReason('missed_window');
        } else if (result.reason === 'complete_first_node') {
          setHijackFeedback('missed');
          setLastAttemptReason('complete_first_node');
        } else if (result.reason === 'complete_previous_nodes') {
          setHijackFeedback('missed');
          setLastAttemptReason('complete_previous_nodes');
        }
        if (result.success || result.reason === 'missed_window' || result.reason === 'complete_first_node' || result.reason === 'complete_previous_nodes') {
          setTimeout(() => {
            setHijackFeedback(null);
            setLastAttemptReason(null);
          }, 1500);
        }
      } catch (_) {
        setHijackFeedback('missed');
        setLastAttemptReason(null);
        setTimeout(() => setHijackFeedback(null), 1500);
      }
    },
    [session, phase, levelId, attemptHijack]
  );

  const handleClaim = useCallback(async () => {
    setClaimingInProgress(true);
    setClaimError(false);
    try {
      await claimLevel(levelId).unwrap();
      setClaimError(false);
      InteractionManager.runAfterInteractions(() => onCloseRef.current());
    } catch (_) {
      setClaimError(true);
    } finally {
      setClaimingInProgress(false);
    }
  }, [levelId, claimLevel]);

  /** Claim then close (e.g. when user taps X during victory overlay so level is marked complete). */
  const handleClaimThenClose = useCallback(async () => {
    setClaimingInProgress(true);
    try {
      await claimLevel(levelId).unwrap();
      InteractionManager.runAfterInteractions(() => onCloseRef.current());
    } catch (_) {
      setClaimError(true);
    } finally {
      setClaimingInProgress(false);
    }
  }, [levelId, claimLevel]);

  /** Phase start for a given packet index (must run before any conditional return to satisfy hooks rules). */
  const getPhaseStartForPacket = useCallback(
    (packetIndex: number, s: RaceConditionHeistSessionResponse | null): string => {
      if (!s) return '';
      if (packetIndex === 0) return s.startedAt;
      if (packetIndex === 1) return s.phase2StartedAt ?? s.startedAt;
      if (packetIndex === 2) return s.phase3StartedAt ?? s.startedAt;
      return s.phase4StartedAt ?? s.phase3StartedAt ?? s.startedAt;
    },
    []
  );

  const formatTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (fatalFailure) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.fatalOverlay, { backgroundColor: colors.background }]}>
          <Text style={[styles.fatalTitle, { color: colors.error }]}>
            You've been traced!
          </Text>
          <Text style={[styles.fatalSubtitle, { color: colors.error }]}>
            FATAL FAILURE
          </Text>
          <Text style={[styles.fatalHint, { color: colors.text?.secondary ?? colors.primary }]}>
            Returning to level select…
          </Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <Text style={[styles.message, { color: colors.text?.secondary ?? colors.primary }]}>
          No session. Start from the level screen.
        </Text>
      </View>
    );
  }

  const activePackets = session.packets.filter((p) => !p.isHijacked);
  const onCooldown =
    session.exploitCooldownUntil &&
    new Date(session.exploitCooldownUntil).getTime() > Date.now();

  const wordRotation = session.wordRotation ?? ['Read', 'Write', 'Lock'];
  const wordDurationMs = session.wordDurationMs ?? 1500;
  const wordStartOffset = session.wordStartOffset ?? 0;
  /** Tier 4 and 5: after third node captured, display phase-4 words for the fourth node (Bypass). */
  const usePhase4Words =
    (isTier4 || isTier5) &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    (session.wordRotationPhase4?.length ?? 0) > 0 &&
    session.phase4StartedAt != null;
  const serverAdjustedNow = Date.now() + timeSkewMsRef.current;
  const phase4ElapsedMs = usePhase4Words && session.phase4StartedAt
    ? serverAdjustedNow - new Date(session.phase4StartedAt).getTime()
    : 0;
  /** Tier 3+: after second node captured, display phase-3 words for the third node (Exfiltrate). */
  const usePhase3Words =
    !usePhase4Words &&
    (isTier3 || isTier4 || isTier5) &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    (session.wordRotationPhase3?.length ?? 0) > 0 &&
    session.phase3StartedAt != null;
  const phase3ElapsedMs = usePhase3Words && session.phase3StartedAt
    ? serverAdjustedNow - new Date(session.phase3StartedAt).getTime()
    : 0;
  /** Tier 2+: after first node captured, display phase-2 words for the second node (Encrypt). */
  const usePhase2Words =
    !usePhase3Words &&
    multiNodeTier &&
    session.packets[0]?.isHijacked &&
    (session.wordRotationPhase2?.length ?? 0) > 0 &&
    session.phase2StartedAt != null;
  const phase2ElapsedMs = usePhase2Words && session.phase2StartedAt
    ? serverAdjustedNow - new Date(session.phase2StartedAt).getTime()
    : 0;
  const activeRotation = usePhase4Words
    ? (session.wordRotationPhase4 ?? [])
    : usePhase3Words
      ? (session.wordRotationPhase3 ?? [])
      : usePhase2Words
        ? (session.wordRotationPhase2 ?? [])
        : wordRotation;
  const activeStartOffset = usePhase4Words
    ? (session.wordStartOffsetPhase4 ?? 0)
    : usePhase3Words
      ? (session.wordStartOffsetPhase3 ?? 0)
      : usePhase2Words
        ? (session.wordStartOffsetPhase2 ?? 0)
        : wordStartOffset;
  const activeElapsedMs = usePhase4Words
    ? phase4ElapsedMs
    : usePhase3Words
      ? phase3ElapsedMs
      : usePhase2Words
        ? phase2ElapsedMs
        : elapsedMs;
  /** Delay display by 250ms so "tap when word first appears" lands in server's window (client was ahead). */
  const DISPLAY_DELAY_MS = 250;
  const displayElapsedMs = Math.max(0, activeElapsedMs - DISPLAY_DELAY_MS);
  const currentWordIndex =
    activeRotation.length > 0
      ? (Math.floor(displayElapsedMs / wordDurationMs) + activeStartOffset) % activeRotation.length
      : 0;
  const displayedWord = activeRotation[currentWordIndex] ?? '—';
  /** Phase start (ISO string) for the active word display. */
  const phaseStart =
    usePhase4Words && session.phase4StartedAt
      ? session.phase4StartedAt
      : usePhase3Words && session.phase3StartedAt
        ? session.phase3StartedAt
        : usePhase2Words && session.phase2StartedAt
          ? session.phase2StartedAt
          : session.startedAt;

  /** Lost run: show "Run complete" and "Back to levels" only. */
  if ((phase === 'LOCKDOWN' || phase === 'RESULTS') && !won) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <Text style={[styles.title, { color: colors.primary }]}>Run complete</Text>
        <Text style={[styles.scoreLabel, { color: colors.text?.secondary ?? colors.primary }]}>
          Score: {session.score} (need {scoreThreshold} to pass)
        </Text>
        <TouchableOpacity style={[styles.button, { borderColor: colors.primary }]} onPress={onClose}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>Back to levels</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /** Won: show brief success overlay on top of game view, then auto-claim and close (no "Run complete" / "Back to levels" step). */
  if (phase === 'LOCKDOWN' && won) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={handleClaimThenClose} />
        <View style={styles.gameSummary}>
          <Text style={[styles.wordDisplayText, { color: colors.primary }]}>
            {displayedWord}
          </Text>
          <View style={styles.packetsRow}>
            {session.packets.map((p: RCHPacket, idx: number) => (
              <View key={p.id} style={[styles.packetBox, { borderColor: colors.primary }]}>
                <Text style={[styles.packetType, { color: colors.text?.secondary ?? colors.primary }]}>
                  {p.type.replace('_', ' ')}
                </Text>
                <Text style={[styles.packetValue, { color: colors.primary }]}>{p.value} pts</Text>
                <Text style={[styles.stolenLabel, { color: colors.success ?? colors.primary }]}>
                  {idx === 0 ? 'Stolen' : idx === 1 ? 'Encrypted' : idx === 2 ? 'Exfiltrated' : 'Bypassed'}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.successOverlay, { backgroundColor: colors.background }]}>
          <Text style={[styles.successTitle, { color: colors.success ?? colors.primary }]}>
            Hijacked System!
          </Text>
          <Text style={[styles.successSubtext, { color: colors.text?.secondary ?? colors.primary }]}>
            Returning to level select…
          </Text>
          {claimError && (
            <TouchableOpacity
              style={[styles.button, { borderColor: colors.primary }]}
              onPress={handleClaimThenClose}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>Retry claim</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onClose} />
      <Text style={[styles.title, { color: colors.primary }]}>Race Condition Heist — {levelId}</Text>
      <View style={styles.statsRow}>
        <Text style={[styles.stat, { color: colors.text?.secondary ?? colors.primary }]}>
          Time: {formatTime(timeRemainingMs)}
        </Text>
        <Text style={[styles.stat, { color: colors.text?.secondary ?? colors.primary }]}>
          Score: {session.score}
        </Text>
        <Text style={[styles.stat, { color: colors.text?.secondary ?? colors.primary }]}>
          Combo: {session.comboCount}×
        </Text>
      </View>

      <View style={[styles.wordDisplay, { borderColor: colors.primary }]}>
        <Text style={[styles.wordDisplayText, { color: colors.primary }]}>{displayedWord}</Text>
      </View>

      {hijackFeedback === 'missed' && (
        <Text style={[styles.feedbackText, { color: colors.error }]}>
          {lastAttemptReason === 'complete_first_node'
            ? 'Capture the first node before encrypting the second.'
            :             lastAttemptReason === 'complete_previous_nodes'
              ? isTier4 || isTier5
                ? 'Capture the first three nodes before bypassing the fourth.'
                : 'Capture the first two nodes before exfiltrating the third.'
              : 'Missed! Tap when the word before the secure word appears.'}
        </Text>
      )}

      {/* Victory: always show "Hijacked System!" (never "Stolen!" when level is complete). */}
      {autoCompleting && (
        <Text style={[styles.successTitle, { color: colors.success ?? colors.primary }]}>
          Hijacked System!
        </Text>
      )}
      {!autoCompleting && hijackFeedback === 'stolen' && (
        <Text style={[styles.feedbackText, { color: colors.success ?? colors.primary }]}>Stolen!</Text>
      )}

      <View style={styles.packetsRow}>
        {session.packets.map((packet: RCHPacket, index: number) => {
          const actionLabel =
            index === 0 ? 'Exploit' : index === 1 ? 'Encrypt' : index === 2 ? 'Exfiltrate' : 'Bypass';
          const canTap =
            index === 0 ||
            (index === 1 && session.packets[0]?.isHijacked) ||
            (index === 2 && session.packets[0]?.isHijacked && session.packets[1]?.isHijacked) ||
            (index === 3 &&
              session.packets[0]?.isHijacked &&
              session.packets[1]?.isHijacked &&
              session.packets[2]?.isHijacked);
          const doneLabel =
            index === 0 ? 'Stolen' : index === 1 ? 'Encrypted' : index === 2 ? 'Exfiltrated' : 'Bypassed';
          return (
            <View
              key={packet.id}
              style={[
                styles.packetBox,
                { borderColor: colors.primary },
                packet.isHijacked && styles.packetHijacked,
              ]}
            >
              <Text style={[styles.packetType, { color: colors.text?.secondary ?? colors.primary }]}>
                {packet.type.replace('_', ' ')}
              </Text>
              <Text style={[styles.packetValue, { color: colors.primary }]}>{packet.value} pts</Text>
              {!packet.isHijacked && (
                <TouchableOpacity
                  style={[
                    styles.hijackButton,
                    { borderColor: colors.primary },
                    (onCooldown || !canTap) && styles.hijackButtonDisabled,
                  ]}
                  onPressIn={() => {
                    const now = Date.now();
                    const serverAdjustedNow = now + timeSkewMsRef.current;
                    const phaseStartForPacket = getPhaseStartForPacket(index, session);
                    const clientPhaseElapsedMs = Math.max(
                      0,
                      serverAdjustedNow - new Date(phaseStartForPacket).getTime()
                    );
                    clientViewpointAtTapRef.current = {
                      clientTimestampMs: now,
                      displayedWordIndex: currentWordIndex,
                      displayedWordLabel: displayedWord,
                      clientPhaseElapsedMs,
                      wordDurationMs,
                      wordCount: activeRotation.length,
                    };
                  }}
                  onPress={() => handleHijack(packet.id, clientViewpointAtTapRef.current)}
                  disabled={onCooldown || !canTap}
                  accessible
                  accessibilityLabel={`${actionLabel} packet`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.hijackButtonText, { color: colors.primary }]}>{actionLabel}</Text>
                </TouchableOpacity>
              )}
              {packet.isHijacked && (
                <Text style={[styles.stolenLabel, { color: colors.success ?? colors.primary }]}>
                  {doneLabel}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {onCooldown && (
        <Text style={[styles.cooldownHint, { color: colors.text?.secondary ?? colors.primary }]}>
          Exploit on cooldown…
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SIZING.spacing.lg },
  title: {
    fontSize: SIZING.font.large,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  message: { fontSize: SIZING.font.body, textAlign: 'center', marginVertical: SIZING.spacing.md },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZING.spacing.lg,
  },
  stat: { fontSize: SIZING.font.body },
  packetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SIZING.spacing.md,
  },
  packetBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    minWidth: 140,
    alignItems: 'center',
  },
  packetHijacked: { opacity: 0.6 },
  packetType: { fontSize: SIZING.font.small },
  packetValue: { fontSize: SIZING.font.body, fontWeight: '600', marginVertical: SIZING.spacing.xs },
  hijackButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
    marginTop: SIZING.spacing.xs,
  },
  hijackButtonDisabled: { opacity: 0.5 },
  hijackButtonText: { fontSize: SIZING.font.small },
  stolenLabel: { fontSize: SIZING.font.small, marginTop: SIZING.spacing.xs },
  cooldownHint: { fontSize: SIZING.font.small, textAlign: 'center', marginTop: SIZING.spacing.md },
  wordDisplay: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.lg,
    paddingHorizontal: SIZING.spacing.xl,
    marginHorizontal: SIZING.spacing.lg,
    marginBottom: SIZING.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordDisplayText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
  },
  feedbackText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  scoreLabel: { fontSize: SIZING.font.body, textAlign: 'center', marginVertical: SIZING.spacing.sm },
  victoryHint: { fontSize: SIZING.font.small, textAlign: 'center', marginBottom: SIZING.spacing.sm },
  gameSummary: {
    alignItems: 'center',
    marginTop: SIZING.spacing.lg,
    marginBottom: SIZING.spacing.lg,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.xl,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  successSubtext: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  fatalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.xl,
  },
  fatalTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  fatalSubtitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  fatalHint: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm,
  },
  buttonText: { fontSize: SIZING.font.body },
  claimRow: { alignItems: 'center', marginTop: SIZING.spacing.sm },
});
