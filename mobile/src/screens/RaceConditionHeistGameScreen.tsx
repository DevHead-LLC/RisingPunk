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
  /** Tier from levelId. Tier 2–5 = 2–4 nodes, 6 = five, 7 = six, 8 = seven, 9–11 = eight, 12–13 = nine, 14–15 = ten, 16–17 = eleven, 18–19 = twelve, 20–21 = thirteen nodes. */
  const tier = levelId.includes('.') ? parseInt(levelId.split('.')[0], 10) : 1;
  const isTier2 = tier === 2;
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
    if (phase !== 'RUNNING' || !session || matchDurationMs <= 0 || elapsedMs < matchDurationMs || timerExpireTriggeredRef.current) return;
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
      if (timerExpireTriggeredRef.current) {
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
    return () => clearTimeout(t);
  }, [session?.score, session?.packets, phase, scoreThreshold, levelId, endRun, claimLevel]);

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
        ...(viewpoint?.displayedWordLabel != null && { displayedWordLabel: viewpoint.displayedWordLabel }),
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
        if (result.reason === 'fatal_secure_word') {
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
          setTimeout(() => {
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
          setTimeout(() => {
            setHijackFeedback(null);
            setLastAttemptReason(null);
          }, 1500);
        } else {
          setHijackFeedback('missed');
          setLastAttemptReason(null);
          setTimeout(() => setHijackFeedback(null), 1500);
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
  /** Tier 20+: after twelfth node captured, display phase-13 words for the thirteenth node (Reset). Defined first so lower phases can exclude it. */
  const usePhase13Words =
    thirteenPacketTier &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    session.packets[5]?.isHijacked &&
    session.packets[6]?.isHijacked &&
    session.packets[7]?.isHijacked &&
    session.packets[8]?.isHijacked &&
    session.packets[9]?.isHijacked &&
    session.packets[10]?.isHijacked &&
    session.packets[11]?.isHijacked &&
    (session.wordRotationPhase13?.length ?? 0) > 0 &&
    session.phase13StartedAt != null;
  const phase13ElapsedMs = usePhase13Words && session.phase13StartedAt
    ? serverAdjustedNow - new Date(session.phase13StartedAt).getTime()
    : 0;
  /** Tier 18+: after eleventh node captured, display phase-12 words for the twelfth node (Clear). Exclude when phase 13 active (match phases 2–9 pattern). */
  const usePhase12Words =
    (twelvePacketTier || thirteenPacketTier) &&
    !usePhase13Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    session.packets[5]?.isHijacked &&
    session.packets[6]?.isHijacked &&
    session.packets[7]?.isHijacked &&
    session.packets[8]?.isHijacked &&
    session.packets[9]?.isHijacked &&
    session.packets[10]?.isHijacked &&
    (session.wordRotationPhase12?.length ?? 0) > 0 &&
    session.phase12StartedAt != null;
  const phase12ElapsedMs = usePhase12Words && session.phase12StartedAt
    ? serverAdjustedNow - new Date(session.phase12StartedAt).getTime()
    : 0;
  /** Tier 16+: after tenth node captured, display phase-11 words for the eleventh node (Dump). Exclude when phase 12/13 active. */
  const usePhase11Words =
    (elevenPacketTier || twelvePacketTier || thirteenPacketTier) &&
    !usePhase12Words &&
    !usePhase13Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    session.packets[5]?.isHijacked &&
    session.packets[6]?.isHijacked &&
    session.packets[7]?.isHijacked &&
    session.packets[8]?.isHijacked &&
    session.packets[9]?.isHijacked &&
    (session.wordRotationPhase11?.length ?? 0) > 0 &&
    session.phase11StartedAt != null;
  const phase11ElapsedMs = usePhase11Words && session.phase11StartedAt
    ? serverAdjustedNow - new Date(session.phase11StartedAt).getTime()
    : 0;
  /** Tier 14+: after ninth node captured, display phase-10 words for the tenth node (Flush). Exclude when phase 11/12/13 active so display advances. */
  const usePhase10Words =
    (tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier) &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    session.packets[5]?.isHijacked &&
    session.packets[6]?.isHijacked &&
    session.packets[7]?.isHijacked &&
    session.packets[8]?.isHijacked &&
    (session.wordRotationPhase10?.length ?? 0) > 0 &&
    session.phase10StartedAt != null;
  const phase10ElapsedMs = usePhase10Words && session.phase10StartedAt
    ? serverAdjustedNow - new Date(session.phase10StartedAt).getTime()
    : 0;
  /** Tier 12+: after seventh node captured, display phase-9 words for the ninth node (Scrub). Must match server (packet 8 → phase 9). */
  const usePhase9Words =
    (ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier) &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    session.packets[5]?.isHijacked &&
    session.packets[6]?.isHijacked &&
    session.packets[7]?.isHijacked &&
    (session.wordRotationPhase9?.length ?? 0) > 0 &&
    session.phase9StartedAt != null;
  const phase9ElapsedMs = usePhase9Words && session.phase9StartedAt
    ? serverAdjustedNow - new Date(session.phase9StartedAt).getTime()
    : 0;
  /** Tier 9+: after sixth node captured, display phase-8 words for the eighth node (Wipe). Must match server (packet 7 → phase 8). */
  const usePhase8Words =
    (eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier) &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    !usePhase9Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    session.packets[5]?.isHijacked &&
    session.packets[6]?.isHijacked &&
    (session.wordRotationPhase8?.length ?? 0) > 0 &&
    session.phase8StartedAt != null;
  const phase8ElapsedMs = usePhase8Words && session.phase8StartedAt
    ? serverAdjustedNow - new Date(session.phase8StartedAt).getTime()
    : 0;
  /** Tier 8+: after fifth node captured, display phase-7 words for the seventh node (Purge). Must match server (packet 6 → phase 7). */
  const usePhase7Words =
    (sevenPacketTier || eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier) &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    !usePhase9Words &&
    !usePhase8Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    session.packets[5]?.isHijacked &&
    (session.wordRotationPhase7?.length ?? 0) > 0 &&
    session.phase7StartedAt != null;
  const phase7ElapsedMs = usePhase7Words && session.phase7StartedAt
    ? serverAdjustedNow - new Date(session.phase7StartedAt).getTime()
    : 0;
  /** Tier 7+: after fifth node captured, display phase-6 words for the sixth node (Offload). */
  const usePhase6Words =
    (sixPacketTier || sevenPacketTier || eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier) &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    !usePhase9Words &&
    !usePhase8Words &&
    !usePhase7Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    session.packets[4]?.isHijacked &&
    (session.wordRotationPhase6?.length ?? 0) > 0 &&
    session.phase6StartedAt != null;
  const phase6ElapsedMs = usePhase6Words && session.phase6StartedAt
    ? serverAdjustedNow - new Date(session.phase6StartedAt).getTime()
    : 0;
  /** Tier 6+: after fourth node captured, display phase-5 words for the fifth node (Extract). */
  const usePhase5Words =
    (fivePacketTier || sixPacketTier || sevenPacketTier || eightPacketTier || ninePacketTier || tenPacketTier || elevenPacketTier || twelvePacketTier || thirteenPacketTier) &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    !usePhase9Words &&
    !usePhase8Words &&
    !usePhase7Words &&
    !usePhase6Words &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    session.packets[3]?.isHijacked &&
    (session.wordRotationPhase5?.length ?? 0) > 0 &&
    session.phase5StartedAt != null;
  const phase5ElapsedMs = usePhase5Words && session.phase5StartedAt
    ? serverAdjustedNow - new Date(session.phase5StartedAt).getTime()
    : 0;
  /** Tiers 4+: after third node captured, display phase-4 words for the fourth node (Bypass). Exclude when any higher phase active (match phases 5–9). */
  const usePhase4Words =
    !usePhase5Words &&
    !usePhase6Words &&
    !usePhase7Words &&
    !usePhase8Words &&
    !usePhase9Words &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    (isTier4 || isTier5 || isTier6 || isTier7 || isTier8 || isTier9 || tier >= 10) &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    session.packets[2]?.isHijacked &&
    (session.wordRotationPhase4?.length ?? 0) > 0 &&
    session.phase4StartedAt != null;
  const phase4ElapsedMs = usePhase4Words && session.phase4StartedAt
    ? serverAdjustedNow - new Date(session.phase4StartedAt).getTime()
    : 0;
  /** Tier 3+: after second node captured, display phase-3 words for the third node (Exfiltrate). Exclude when any higher phase active. */
  const usePhase3Words =
    !usePhase4Words &&
    !usePhase5Words &&
    !usePhase6Words &&
    !usePhase7Words &&
    !usePhase8Words &&
    !usePhase9Words &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    (isTier3 || isTier4 || isTier5 || isTier6 || isTier7 || isTier8 || isTier9 || tier >= 10) &&
    session.packets[0]?.isHijacked &&
    session.packets[1]?.isHijacked &&
    (session.wordRotationPhase3?.length ?? 0) > 0 &&
    session.phase3StartedAt != null;
  const phase3ElapsedMs = usePhase3Words && session.phase3StartedAt
    ? serverAdjustedNow - new Date(session.phase3StartedAt).getTime()
    : 0;
  /** Tier 2+: after first node captured, display phase-2 words for the second node (Encrypt). Exclude when any higher phase active. */
  const usePhase2Words =
    !usePhase3Words &&
    !usePhase4Words &&
    !usePhase5Words &&
    !usePhase6Words &&
    !usePhase7Words &&
    !usePhase8Words &&
    !usePhase9Words &&
    !usePhase10Words &&
    !usePhase11Words &&
    !usePhase12Words &&
    !usePhase13Words &&
    multiNodeTier &&
    session.packets[0]?.isHijacked &&
    (session.wordRotationPhase2?.length ?? 0) > 0 &&
    session.phase2StartedAt != null;
  const phase2ElapsedMs = usePhase2Words && session.phase2StartedAt
    ? serverAdjustedNow - new Date(session.phase2StartedAt).getTime()
    : 0;
  /** Resolve active phase (highest usePhaseNWords that is true) then pick rotation/offset/elapsed/start from arrays. */
  const usePhaseFlags = [usePhase2Words, usePhase3Words, usePhase4Words, usePhase5Words, usePhase6Words, usePhase7Words, usePhase8Words, usePhase9Words, usePhase10Words, usePhase11Words, usePhase12Words, usePhase13Words];
  const phaseRotations: string[][] = [session.wordRotationPhase2 ?? [], session.wordRotationPhase3 ?? [], session.wordRotationPhase4 ?? [], session.wordRotationPhase5 ?? [], session.wordRotationPhase6 ?? [], session.wordRotationPhase7 ?? [], session.wordRotationPhase8 ?? [], session.wordRotationPhase9 ?? [], session.wordRotationPhase10 ?? [], session.wordRotationPhase11 ?? [], session.wordRotationPhase12 ?? [], session.wordRotationPhase13 ?? []];
  const phaseOffsets = [session.wordStartOffsetPhase2 ?? 0, session.wordStartOffsetPhase3 ?? 0, session.wordStartOffsetPhase4 ?? 0, session.wordStartOffsetPhase5 ?? 0, session.wordStartOffsetPhase6 ?? 0, session.wordStartOffsetPhase7 ?? 0, session.wordStartOffsetPhase8 ?? 0, session.wordStartOffsetPhase9 ?? 0, session.wordStartOffsetPhase10 ?? 0, session.wordStartOffsetPhase11 ?? 0, session.wordStartOffsetPhase12 ?? 0, session.wordStartOffsetPhase13 ?? 0];
  const phaseElapsed = [phase2ElapsedMs, phase3ElapsedMs, phase4ElapsedMs, phase5ElapsedMs, phase6ElapsedMs, phase7ElapsedMs, phase8ElapsedMs, phase9ElapsedMs, phase10ElapsedMs, phase11ElapsedMs, phase12ElapsedMs, phase13ElapsedMs];
  let activePhaseIndex = -1;
  for (let i = 12; i >= 0; i--) if (usePhaseFlags[i]) { activePhaseIndex = i; break; }
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
      <CloseButton onPress={handleClose} />
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
              ? thirteenPacketTier
                ? 'Capture the first twelve nodes before resetting the thirteenth.'
                : twelvePacketTier
                  ? 'Capture the first eleven nodes before clearing the twelfth.'
                  : elevenPacketTier
                    ? 'Capture the first ten nodes before dumping the eleventh.'
                    : tenPacketTier
                      ? 'Capture the first nine nodes before flushing the tenth.'
                      : ninePacketTier
                        ? 'Capture the first eight nodes before scrubbing the ninth.'
                        : eightPacketTier
                          ? 'Capture the first seven nodes before wiping the eighth.'
                          : sevenPacketTier
                            ? 'Capture the first six nodes before purging the seventh.'
                            : sixPacketTier
                              ? 'Capture the first five nodes before offloading the sixth.'
                              : fivePacketTier
                                ? 'Capture the first four nodes before extracting the fifth.'
                                : tier >= 4
                                  ? 'Capture the first three nodes before bypassing the fourth.'
                                  : 'Capture the first two nodes before exfiltrating the third.'
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

      {scrollablePacketTier ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.packetsScrollContent}
          style={styles.packetsScroll}
        >
          {session.packets.map((packet: RCHPacket, index: number) => {
            const actionLabel =
              index === 0 ? 'Exploit' : index === 1 ? 'Encrypt' : index === 2 ? 'Exfiltrate' : index === 3 ? 'Bypass' : index === 4 ? 'Extract' : index === 5 ? 'Offload' : index === 6 ? 'Purge' : index === 7 ? 'Wipe' : index === 8 ? 'Scrub' : index === 9 ? 'Flush' : index === 10 ? 'Dump' : index === 11 ? 'Clear' : 'Reset';
            const canTap =
              index === 0 ||
              (index === 1 && session.packets[0]?.isHijacked) ||
              (index === 2 && session.packets[0]?.isHijacked && session.packets[1]?.isHijacked) ||
              (index === 3 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked) ||
              (index === 4 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked) ||
              (index === 5 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked) ||
              (index === 6 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked &&
                session.packets[5]?.isHijacked) ||
              (index === 7 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked &&
                session.packets[5]?.isHijacked &&
                session.packets[6]?.isHijacked) ||
              (index === 8 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked &&
                session.packets[5]?.isHijacked &&
                session.packets[6]?.isHijacked &&
                session.packets[7]?.isHijacked) ||
              (index === 9 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked &&
                session.packets[5]?.isHijacked &&
                session.packets[6]?.isHijacked &&
                session.packets[7]?.isHijacked &&
                session.packets[8]?.isHijacked) ||
              (index === 10 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked &&
                session.packets[5]?.isHijacked &&
                session.packets[6]?.isHijacked &&
                session.packets[7]?.isHijacked &&
                session.packets[8]?.isHijacked &&
                session.packets[9]?.isHijacked) ||
              (index === 11 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked &&
                session.packets[5]?.isHijacked &&
                session.packets[6]?.isHijacked &&
                session.packets[7]?.isHijacked &&
                session.packets[8]?.isHijacked &&
                session.packets[9]?.isHijacked &&
                session.packets[10]?.isHijacked) ||
              (index === 12 &&
                session.packets[0]?.isHijacked &&
                session.packets[1]?.isHijacked &&
                session.packets[2]?.isHijacked &&
                session.packets[3]?.isHijacked &&
                session.packets[4]?.isHijacked &&
                session.packets[5]?.isHijacked &&
                session.packets[6]?.isHijacked &&
                session.packets[7]?.isHijacked &&
                session.packets[8]?.isHijacked &&
                session.packets[9]?.isHijacked &&
                session.packets[10]?.isHijacked &&
                session.packets[11]?.isHijacked);
            const doneLabel =
              index === 0 ? 'Stolen' : index === 1 ? 'Encrypted' : index === 2 ? 'Exfiltrated' : index === 3 ? 'Bypassed' : index === 4 ? 'Extracted' : index === 5 ? 'Offloaded' : index === 6 ? 'Purged' : index === 7 ? 'Wiped' : index === 8 ? 'Scrubbed' : index === 9 ? 'Flushed' : index === 10 ? 'Dumped' : index === 11 ? 'Cleared' : 'Reset';
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
                      const { rotation } = getRotationAndOffsetForPacket(index, session);
                      /** Capture the word the user sees (value-based). Server resolves label → index in its rotation. */
                      const label = displayedWord;
                      const indexInPacketRotation = rotation.indexOf(label);
                      clientViewpointAtTapRef.current = {
                        clientTimestampMs: now,
                        displayedWordIndex: indexInPacketRotation >= 0 ? indexInPacketRotation : 0,
                        displayedWordLabel: label,
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
        </ScrollView>
      ) : (
      <View style={styles.packetsRow}>
        {session.packets.map((packet: RCHPacket, index: number) => {
          const actionLabel =
            index === 0 ? 'Exploit' : index === 1 ? 'Encrypt' : index === 2 ? 'Exfiltrate' : index === 3 ? 'Bypass' : 'Extract';
          const canTap =
            index === 0 ||
            (index === 1 && session.packets[0]?.isHijacked) ||
            (index === 2 && session.packets[0]?.isHijacked && session.packets[1]?.isHijacked) ||
            (index === 3 &&
              session.packets[0]?.isHijacked &&
              session.packets[1]?.isHijacked &&
              session.packets[2]?.isHijacked) ||
            (index === 4 &&
              session.packets[0]?.isHijacked &&
              session.packets[1]?.isHijacked &&
              session.packets[2]?.isHijacked &&
              session.packets[3]?.isHijacked);
          const doneLabel =
            index === 0 ? 'Stolen' : index === 1 ? 'Encrypted' : index === 2 ? 'Exfiltrated' : index === 3 ? 'Bypassed' : 'Extracted';
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
                    const { rotation } = getRotationAndOffsetForPacket(index, session);
                    /** Capture the word the user sees (value-based). Server resolves label → index in its rotation. */
                    const label = displayedWord;
                    const indexInPacketRotation = rotation.indexOf(label);
                    clientViewpointAtTapRef.current = {
                      clientTimestampMs: now,
                      displayedWordIndex: indexInPacketRotation >= 0 ? indexInPacketRotation : 0,
                      displayedWordLabel: label,
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
      )}

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
