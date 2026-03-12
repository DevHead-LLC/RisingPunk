import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  InteractionManager,
  ScrollView,
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

/** Action labels per packet index (0–12). Shared by scrollable and non-scrollable packet lists. */
const PACKET_ACTION_LABELS = ['Exploit', 'Encrypt', 'Exfiltrate', 'Bypass', 'Extract', 'Offload', 'Purge', 'Wipe', 'Scrub', 'Flush', 'Dump', 'Clear', 'Reset'] as const;
/** Done labels per packet index (0–12). */
const PACKET_DONE_LABELS = ['Stolen', 'Encrypted', 'Exfiltrated', 'Bypassed', 'Extracted', 'Offloaded', 'Purged', 'Wiped', 'Scrubbed', 'Flushed', 'Dumped', 'Cleared', 'Reset'] as const;

/** "Complete previous nodes" hint per packet count (3–13). Key = packet count for this tier. */
const COMPLETE_PREVIOUS_NODES_MESSAGES: Record<number, string> = {
  3: 'Capture the first two nodes before exfiltrating the third.',
  4: 'Capture the first three nodes before bypassing the fourth.',
  5: 'Capture the first four nodes before extracting the fifth.',
  6: 'Capture the first five nodes before offloading the sixth.',
  7: 'Capture the first six nodes before purging the seventh.',
  8: 'Capture the first seven nodes before wiping the eighth.',
  9: 'Capture the first eight nodes before scrubbing the ninth.',
  10: 'Capture the first nine nodes before flushing the tenth.',
  11: 'Capture the first ten nodes before dumping the eleventh.',
  12: 'Capture the first eleven nodes before clearing the twelfth.',
  13: 'Capture the first twelve nodes before resetting the thirteenth.',
};

/** Packet count for tier (matches server getPacketCountForTier). Used for feedback message lookup. */
function getPacketCountForTier(tier: number): number {
  if (tier === 1) return 1;
  if (tier === 2) return 2;
  if (tier === 3) return 3;
  if (tier === 4 || tier === 5) return 4;
  if (tier === 6) return 5;
  if (tier === 7) return 6;
  if (tier === 8) return 7;
  if (tier === 9 || tier === 10 || tier === 11) return 8;
  if (tier === 12 || tier === 13) return 9;
  if (tier === 14 || tier === 15) return 10;
  if (tier === 16 || tier === 17) return 11;
  if (tier === 18 || tier === 19) return 12;
  if (tier === 20 || tier === 21) return 13;
  return 1;
}

function canTapPacket(index: number, packets: { isHijacked?: boolean }[]): boolean {
  if (index === 0) return true;
  for (let i = 0; i < index; i++) {
    if (!packets[i]?.isHijacked) return false;
  }
  return true;
}

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
  const autoCompleteTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerExpireTriggeredRef = useRef(false);
  const fatalFailureTriggeredRef = useRef(false);
  const victoryAutoCloseTriggeredRef = useRef(false);
  const onCloseRef = useRef(onClose);
  /** Pending timeout that clears hijackFeedback/lastAttemptReason; cancelled when a new attempt runs so rapid taps don't clear later feedback. */
  const hijackFeedbackClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Skew so client word timing matches server: serverNow ≈ Date.now() + timeSkewMsRef.current */
  const timeSkewMsRef = useRef(0);
  /** Client viewpoint at touch-down per packet id (so rapid taps on different packets don't overwrite). */
  const clientViewpointAtTapRef = useRef<Record<
    string,
    {
      clientTimestampMs: number;
      displayedWordIndex: number;
      displayedWordLabel: string;
      clientPhaseElapsedMs: number;
      wordDurationMs: number;
      wordCount: number;
    }
  >>({});
  onCloseRef.current = onClose;

  const [attemptHijack] = useAttemptRaceConditionHeistHijackMutation();
  const [endRun] = useEndRaceConditionHeistRunMutation();
  const [claimLevel] = useClaimRaceConditionHeistLevelMutation();

  const matchDurationMs = session?.matchDurationMs ?? 0;
  const timeRemainingMs = Math.max(0, matchDurationMs - elapsedMs);
  /** Use server-provided threshold (tier 1 = 50, tier 2 = 100 for two nodes). */
  const scoreThreshold = session?.scoreThreshold ?? 50;
  /** Tier from levelId. Tier 2–5 = 2–4 nodes, 6 = five, 7 = six, 8 = seven, 9–11 = eight, 12–13 = nine, 14–15 = ten, 16–17 = eleven, 18–19 = twelve, 20–21 = thirteen nodes. */
  const tier = levelId.includes('.') ? parseInt(levelId.split('.')[0], 10) : 1;
  const isTier3 = tier === 3;
  const isTier4 = tier === 4;
  const isTier5 = tier === 5;
  const isTier6 = tier === 6;
  const isTier7 = tier === 7;
  const isTier8 = tier === 8;
  const isTier9 = tier === 9;
  const fivePacketTier = isTier6;
  const sixPacketTier = isTier7;
  const sevenPacketTier = isTier8;
  const eightPacketTier = tier >= 9 && tier <= 11;
  const ninePacketTier = tier >= 12 && tier <= 13;
  const tenPacketTier = tier >= 14 && tier <= 15;
  const elevenPacketTier = tier >= 16 && tier <= 17;
  const twelvePacketTier = tier >= 18 && tier <= 19;
  const thirteenPacketTier = tier >= 20 && tier <= 21;
  const scrollablePacketTier = sixPacketTier || sevenPacketTier || eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier;
  const multiNodeTier = tier >= 2 && tier <= 21;

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

  /** Reset auto-complete, timer-expire, and fatal refs when level or run changes so each run can trigger (e.g. level 1.2 after 1.1). */
  useEffect(() => {
    autoCompleteTriggeredRef.current = false;
    timerExpireTriggeredRef.current = false;
    victoryAutoCloseTriggeredRef.current = false;
    fatalFailureTriggeredRef.current = false;
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
    if (
      phase !== 'RUNNING' ||
      !session ||
      matchDurationMs <= 0 ||
      elapsedMs < matchDurationMs ||
      timerExpireTriggeredRef.current ||
      autoCompleteTriggeredRef.current
    )
      return;
    timerExpireTriggeredRef.current = true;
    autoCompleteTriggeredRef.current = true;
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
  }, [phase, session, elapsedMs, matchDurationMs, levelId, endRun]);

  useEffect(() => {
    const allPacketsHijacked =
      session?.packets != null &&
      session.packets.length > 0 &&
      session.packets.every((p: RCHPacket) => p.isHijacked);
    if (
      !session ||
      phase !== 'RUNNING' ||
      session.score < scoreThreshold ||
      !allPacketsHijacked ||
      autoCompleteTriggeredRef.current ||
      timerExpireTriggeredRef.current
    ) {
      return;
    }
    autoCompleteTriggeredRef.current = true;
    setAutoCompleting(true);
    const t = setTimeout(async () => {
      autoCompleteTimeoutIdRef.current = null;
      if (timerExpireTriggeredRef.current) {
        setAutoCompleting(false);
        return;
      }
      if (fatalFailureTriggeredRef.current) {
        setAutoCompleting(false);
        return;
      }
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
    autoCompleteTimeoutIdRef.current = t;
    /* Intentionally no cleanup here: we set the ref true before creating the timeout, so cleanup would never clear. Not clearing ensures a late session update (e.g. hijack response) re-running this effect does not cancel the in-flight endRun/claimLevel. Unmount effect below clears the timeout. */
  }, [session?.score, session?.packets, phase, scoreThreshold, levelId, endRun, claimLevel]);

  /** Clear auto-complete and hijack-feedback timeouts on unmount so we don't run after unmount. */
  useEffect(() => {
    return () => {
      if (autoCompleteTimeoutIdRef.current != null) {
        clearTimeout(autoCompleteTimeoutIdRef.current);
        autoCompleteTimeoutIdRef.current = null;
      }
      if (hijackFeedbackClearTimeoutRef.current != null) {
        clearTimeout(hijackFeedbackClearTimeoutRef.current);
        hijackFeedbackClearTimeoutRef.current = null;
      }
    };
  }, []);

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
      if (hijackFeedbackClearTimeoutRef.current != null) {
        clearTimeout(hijackFeedbackClearTimeoutRef.current);
        hijackFeedbackClearTimeoutRef.current = null;
      }
      setHijackFeedback(null);
      setLastAttemptReason(null);
      const displayedWordIndex = viewpoint?.displayedWordIndex ?? 0;
      const body: Parameters<ReturnType<typeof useAttemptRaceConditionHeistHijackMutation>[0]>[0] = {
        levelId,
        packetId,
        displayedWordIndex,
        ...(viewpoint?.displayedWordLabel != null && { displayedWordLabel: viewpoint.displayedWordLabel }),
        ...(viewpoint && { clientViewpoint: viewpoint }),
      };
      try {
        const result = await attemptHijack(body).unwrap();
        if (result.reason === 'fatal_secure_word') {
          fatalFailureTriggeredRef.current = true;
          setSession(null);
          setFatalFailure(true);
          return;
        }
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
          const res = result as unknown as Record<string, unknown>;
          const out = next as unknown as Record<string, unknown>;
          for (let n = 2; n <= 13; n++) {
            const rot = res[`wordRotationPhase${n}`] as string[] | undefined;
            if (Array.isArray(rot) && rot.length > 0) {
              out[`wordRotationPhase${n}`] = rot;
              out[`wordStartOffsetPhase${n}`] = typeof res[`wordStartOffsetPhase${n}`] === 'number' ? res[`wordStartOffsetPhase${n}`] : 0;
              const started = res[`phase${n}StartedAt`];
              if (started != null) out[`phase${n}StartedAt`] = started;
            }
          }
          return next;
        });
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
        } else if (result.reason === 'wrong_word') {
          setHijackFeedback('missed');
          setLastAttemptReason('wrong_word');
        }
        if (result.success || result.reason === 'missed_window' || result.reason === 'complete_first_node' || result.reason === 'complete_previous_nodes' || result.reason === 'wrong_word') {
          if (hijackFeedbackClearTimeoutRef.current != null) clearTimeout(hijackFeedbackClearTimeoutRef.current);
          hijackFeedbackClearTimeoutRef.current = setTimeout(() => {
            hijackFeedbackClearTimeoutRef.current = null;
            setHijackFeedback(null);
            setLastAttemptReason(null);
          }, 1500);
        }
      } catch (err: unknown) {
        const data = (err as { data?: { reason?: string; packets?: RCHPacket[]; score?: number; comboCount?: number } })?.data;
        const reason = data?.reason;
        if (reason === 'complete_first_node' || reason === 'complete_previous_nodes') {
          setHijackFeedback('missed');
          setLastAttemptReason(reason);
          if (data?.packets != null && data?.score != null && data?.comboCount != null) {
            setSession((s) =>
              s ? { ...s, packets: data.packets, score: data.score, comboCount: data.comboCount } : null
            );
          }
          if (hijackFeedbackClearTimeoutRef.current != null) clearTimeout(hijackFeedbackClearTimeoutRef.current);
          hijackFeedbackClearTimeoutRef.current = setTimeout(() => {
            hijackFeedbackClearTimeoutRef.current = null;
            setHijackFeedback(null);
            setLastAttemptReason(null);
          }, 1500);
        } else {
          setHijackFeedback('missed');
          setLastAttemptReason(null);
          if (hijackFeedbackClearTimeoutRef.current != null) clearTimeout(hijackFeedbackClearTimeoutRef.current);
          hijackFeedbackClearTimeoutRef.current = setTimeout(() => {
            hijackFeedbackClearTimeoutRef.current = null;
            setHijackFeedback(null);
          }, 1500);
        }
      }
    },
    [session, phase, levelId, attemptHijack]
  );

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

  /** Close during auto-complete: end run, claim level (so win is credited), then close. Prevents losing credit when user taps X while "Hijacked System!" is showing. */
  const handleCloseDuringAutoComplete = useCallback(async () => {
    if (autoCompleteTimeoutIdRef.current != null) {
      clearTimeout(autoCompleteTimeoutIdRef.current);
      autoCompleteTimeoutIdRef.current = null;
    }
    setClaimingInProgress(true);
    try {
      await endRun(levelId).unwrap();
    } catch (_) {
      // Session may already be ended by in-flight auto-complete timeout; still try claim
    }
    try {
      await claimLevel(levelId).unwrap();
      setClaimError(false);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      // 400/409 may mean already claimed by auto-complete path; avoid spurious claim error
      if (status !== 400 && status !== 409) {
        setClaimError(true);
      }
    } finally {
      setClaimingInProgress(false);
      InteractionManager.runAfterInteractions(() => onCloseRef.current());
    }
  }, [levelId, endRun, claimLevel]);

  /** Close game: end run on server so session is deleted and next attempt gets full clock, then navigate back. */
  const handleClose = useCallback(async () => {
    if (session && phase === 'RUNNING') {
      try {
        await endRun(levelId).unwrap();
      } catch (_) {
        // Still close; session may already be gone or network failed
      }
    }
    onCloseRef.current();
  }, [session, phase, levelId, endRun]);

  /** Phase start for a given packet index (must run before any conditional return to satisfy hooks rules). */
  const getPhaseStartForPacket = useCallback(
    (packetIndex: number, s: RaceConditionHeistSessionResponse | null): string => {
      if (!s) return '';
      if (packetIndex === 0) return s.startedAt;
      if (packetIndex === 1) return s.phase2StartedAt ?? s.startedAt;
      if (packetIndex === 2) return s.phase3StartedAt ?? s.startedAt;
      if (packetIndex === 3) return s.phase4StartedAt ?? s.phase3StartedAt ?? s.startedAt;
      if (packetIndex === 4) return s.phase5StartedAt ?? s.phase4StartedAt ?? s.startedAt;
      if (packetIndex === 5) return s.phase6StartedAt ?? s.phase5StartedAt ?? s.startedAt;
      if (packetIndex === 6) return s.phase7StartedAt ?? s.phase6StartedAt ?? s.startedAt;
      if (packetIndex === 7) return s.phase8StartedAt ?? s.phase7StartedAt ?? s.startedAt;
      if (packetIndex === 8) return s.phase9StartedAt ?? s.phase8StartedAt ?? s.startedAt;
      if (packetIndex === 9) return s.phase10StartedAt ?? s.phase9StartedAt ?? s.startedAt;
      if (packetIndex === 10) return s.phase11StartedAt ?? s.phase10StartedAt ?? s.startedAt;
      if (packetIndex === 11) return s.phase12StartedAt ?? s.phase11StartedAt ?? s.startedAt;
      if (packetIndex === 12) return s.phase13StartedAt ?? s.phase12StartedAt ?? s.startedAt;
      return s.phase13StartedAt ?? s.phase12StartedAt ?? s.phase11StartedAt ?? s.phase10StartedAt ?? s.startedAt;
    },
    []
  );

  /** Rotation and offset for a given packet index (must match server’s phase for that packet so sent index is correct). */
  const getRotationAndOffsetForPacket = useCallback(
    (packetIndex: number, s: RaceConditionHeistSessionResponse | null): { rotation: string[]; startOffset: number } => {
      const base = s?.wordRotation ?? ['Read', 'Write', 'Lock'];
      const off = s?.wordStartOffset ?? 0;
      if (!s) return { rotation: base, startOffset: off };
      if (packetIndex === 0) return { rotation: base, startOffset: off };
      if (packetIndex === 1) return { rotation: s.wordRotationPhase2 ?? base, startOffset: s.wordStartOffsetPhase2 ?? off };
      if (packetIndex === 2) return { rotation: s.wordRotationPhase3 ?? base, startOffset: s.wordStartOffsetPhase3 ?? off };
      if (packetIndex === 3) return { rotation: s.wordRotationPhase4 ?? base, startOffset: s.wordStartOffsetPhase4 ?? off };
      if (packetIndex === 4) return { rotation: s.wordRotationPhase5 ?? base, startOffset: s.wordStartOffsetPhase5 ?? off };
      if (packetIndex === 5) return { rotation: s.wordRotationPhase6 ?? base, startOffset: s.wordStartOffsetPhase6 ?? off };
      if (packetIndex === 6) return { rotation: s.wordRotationPhase7 ?? base, startOffset: s.wordStartOffsetPhase7 ?? off };
      if (packetIndex === 7) return { rotation: s.wordRotationPhase8 ?? base, startOffset: s.wordStartOffsetPhase8 ?? off };
      if (packetIndex === 8) return { rotation: s.wordRotationPhase9 ?? base, startOffset: s.wordStartOffsetPhase9 ?? off };
      if (packetIndex === 9) return { rotation: s.wordRotationPhase10 ?? base, startOffset: s.wordStartOffsetPhase10 ?? off };
      if (packetIndex === 10) return { rotation: s.wordRotationPhase11 ?? base, startOffset: s.wordStartOffsetPhase11 ?? off };
      if (packetIndex === 11) return { rotation: s.wordRotationPhase12 ?? base, startOffset: s.wordStartOffsetPhase12 ?? off };
      if (packetIndex === 12) return { rotation: s.wordRotationPhase13 ?? base, startOffset: s.wordStartOffsetPhase13 ?? off };
      return { rotation: s.wordRotationPhase13 ?? s.wordRotationPhase10 ?? base, startOffset: s.wordStartOffsetPhase13 ?? s.wordStartOffsetPhase10 ?? off };
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

  const serverAdjustedNow = Date.now() + timeSkewMsRef.current;
  const onCooldown =
    session.exploitCooldownUntil &&
    new Date(session.exploitCooldownUntil).getTime() > serverAdjustedNow;

  const wordRotation = session.wordRotation ?? ['Read', 'Write', 'Lock'];
  const wordDurationMs = session.wordDurationMs ?? 1500;
  const wordStartOffset = session.wordStartOffset ?? 0;
  /** Tier condition per phase (index 0 = phase 2 … index 11 = phase 13). Phase N active only if tier has ≥N packets. */
  const tierCondForPhase: boolean[] = [
    multiNodeTier,
    isTier3 || isTier4 || isTier5 || isTier6 || isTier7 || isTier8 || isTier9 || tier >= 10,
    isTier4 || isTier5 || isTier6 || isTier7 || isTier8 || isTier9 || tier >= 10,
    fivePacketTier || sixPacketTier || sevenPacketTier || eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier,
    sixPacketTier || sevenPacketTier || eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier,
    sevenPacketTier || eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier,
    eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier,
    ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier,
    tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier,
    elevenPacketTier || twelvePacketTier || thirteenPacketTier,
    twelvePacketTier || thirteenPacketTier,
    thirteenPacketTier,
  ];
  const phaseRotations: string[][] = [session.wordRotationPhase2 ?? [], session.wordRotationPhase3 ?? [], session.wordRotationPhase4 ?? [], session.wordRotationPhase5 ?? [], session.wordRotationPhase6 ?? [], session.wordRotationPhase7 ?? [], session.wordRotationPhase8 ?? [], session.wordRotationPhase9 ?? [], session.wordRotationPhase10 ?? [], session.wordRotationPhase11 ?? [], session.wordRotationPhase12 ?? [], session.wordRotationPhase13 ?? []];
  const phaseOffsets = [session.wordStartOffsetPhase2 ?? 0, session.wordStartOffsetPhase3 ?? 0, session.wordStartOffsetPhase4 ?? 0, session.wordStartOffsetPhase5 ?? 0, session.wordStartOffsetPhase6 ?? 0, session.wordStartOffsetPhase7 ?? 0, session.wordStartOffsetPhase8 ?? 0, session.wordStartOffsetPhase9 ?? 0, session.wordStartOffsetPhase10 ?? 0, session.wordStartOffsetPhase11 ?? 0, session.wordStartOffsetPhase12 ?? 0, session.wordStartOffsetPhase13 ?? 0];
  const sessionRecord = session as unknown as Record<string, unknown>;
  const usePhaseFlags: boolean[] = new Array(12);
  const phaseElapsed: number[] = new Array(12);
  for (let i = 11; i >= 0; i--) {
    const n = i + 2;
    const packetsRequired = i + 1;
    let allHijacked = true;
    for (let p = 0; p < packetsRequired && allHijacked; p++) allHijacked = !!session.packets[p]?.isHijacked;
    const rotation = phaseRotations[i];
    const phaseStartedAt = sessionRecord[`phase${n}StartedAt`];
    const base = tierCondForPhase[i] && allHijacked && (rotation?.length ?? 0) > 0 && phaseStartedAt != null;
    const noHigherActive = i === 11 || !usePhaseFlags.slice(i + 1).some(Boolean);
    usePhaseFlags[i] = !!base && noHigherActive;
    const startedAt = phaseStartedAt as string | undefined;
    phaseElapsed[i] = usePhaseFlags[i] && startedAt ? serverAdjustedNow - new Date(startedAt).getTime() : 0;
  }
  /** Resolve active phase (highest usePhaseNWords that is true) then pick rotation/offset/elapsed from arrays. */
  let activePhaseIndex = -1;
  for (let i = 11; i >= 0; i--) if (usePhaseFlags[i]) { activePhaseIndex = i; break; }
  const activeRotation = activePhaseIndex >= 0 ? phaseRotations[activePhaseIndex] : wordRotation;
  const activeStartOffset = activePhaseIndex >= 0 ? phaseOffsets[activePhaseIndex] : wordStartOffset;
  const activeElapsedMs = activePhaseIndex >= 0 ? phaseElapsed[activePhaseIndex] : elapsedMs;
  /** Delay display by 250ms so "tap when word first appears" lands in server's window (client was ahead). */
  const DISPLAY_DELAY_MS = 250;
  const displayElapsedMs = Math.max(0, activeElapsedMs - DISPLAY_DELAY_MS);
  const currentWordIndex =
    activeRotation.length > 0
      ? (Math.floor(displayElapsedMs / wordDurationMs) + activeStartOffset) % activeRotation.length
      : 0;
  const displayedWord = activeRotation[currentWordIndex] ?? '—';

  /** Lost run: show "Run complete" and "Back to levels" only. */
  if ((phase === 'LOCKDOWN' || phase === 'RESULTS') && !won) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={handleClose} />
        <Text style={[styles.title, { color: colors.primary }]}>Run complete</Text>
        <Text style={[styles.scoreLabel, { color: colors.text?.secondary ?? colors.primary }]}>
          Score: {session.score} (need {scoreThreshold} to pass)
        </Text>
        <TouchableOpacity style={[styles.button, { borderColor: colors.primary }]} onPress={handleClose}>
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
                  {idx === 0 ? 'Stolen' : idx === 1 ? 'Encrypted' : idx === 2 ? 'Exfiltrated' : idx === 3 ? 'Bypassed' : idx === 4 ? 'Extracted' : idx === 5 ? 'Offloaded' : idx === 6 ? 'Purged' : idx === 7 ? 'Wiped' : idx === 8 ? 'Scrubbed' : idx === 9 ? 'Flushed' : idx === 10 ? 'Dumped' : idx === 11 ? 'Cleared' : 'Reset'}
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
      <CloseButton onPress={autoCompleting ? handleCloseDuringAutoComplete : handleClose} />
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
            : lastAttemptReason === 'complete_previous_nodes'
              ? (COMPLETE_PREVIOUS_NODES_MESSAGES[getPacketCountForTier(tier)] ?? 'Capture the previous nodes first.')
              : lastAttemptReason === 'wrong_word'
                ? 'Wrong word! Tap when the word before the secure word appears.'
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

      {(() => {
        const getActionLabel = (i: number) => PACKET_ACTION_LABELS[i] ?? 'Exploit';
        const getDoneLabel = (i: number) => PACKET_DONE_LABELS[i] ?? 'Stolen';
        const renderPacketCard = (packet: RCHPacket, index: number) => {
          const canTap = canTapPacket(index, session.packets);
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
                    const { rotation, startOffset } = getRotationAndOffsetForPacket(index, session);
                    const displayElapsedMsForPacket = Math.max(0, clientPhaseElapsedMs - DISPLAY_DELAY_MS);
                    const displayedWordIndexForPacket =
                      rotation.length > 0
                        ? (Math.floor(displayElapsedMsForPacket / wordDurationMs) + startOffset) % rotation.length
                        : 0;
                    const label = rotation[displayedWordIndexForPacket] ?? '—';
                    clientViewpointAtTapRef.current[packet.id] = {
                      clientTimestampMs: now,
                      displayedWordIndex: displayedWordIndexForPacket,
                      displayedWordLabel: label,
                      clientPhaseElapsedMs,
                      wordDurationMs,
                      wordCount: rotation.length,
                    };
                  }}
                  onPress={() => {
                    const viewpoint = clientViewpointAtTapRef.current[packet.id] ?? null;
                    delete clientViewpointAtTapRef.current[packet.id];
                    handleHijack(packet.id, viewpoint);
                  }}
                  disabled={onCooldown || !canTap}
                  accessible
                  accessibilityLabel={`${getActionLabel(index)} packet`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.hijackButtonText, { color: colors.primary }]}>{getActionLabel(index)}</Text>
                </TouchableOpacity>
              )}
              {packet.isHijacked && (
                <Text style={[styles.stolenLabel, { color: colors.success ?? colors.primary }]}>
                  {getDoneLabel(index)}
                </Text>
              )}
            </View>
          );
        };
        return scrollablePacketTier ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.packetsScrollContent}
            style={styles.packetsScroll}
          >
            {session.packets.map((packet: RCHPacket, index: number) => renderPacketCard(packet, index))}
          </ScrollView>
        ) : (
          <View style={styles.packetsRow}>
            {session.packets.map((packet: RCHPacket, index: number) => renderPacketCard(packet, index))}
          </View>
        );
      })()}

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
  packetsScroll: { maxHeight: 220, marginHorizontal: SIZING.spacing.sm },
  packetsScrollContent: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
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
