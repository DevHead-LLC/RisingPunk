import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { SIZING } from '../styles/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  useStartBinaryBankCrackSessionMutation,
  useSubmitBinaryBankCrackRegistersMutation,
  useClaimBinaryBankCrackLevelMutation,
  useGetBinaryBankCrackStatusQuery,
} from '../store/api/binaryBankCrackApi';
import type { BinaryBankCrackSessionResponse } from '../store/api/binaryBankCrackApi';

/** Bit weights MSB first (e.g. 4-bit → [8,4,2,1]). */
function getBitWeights(registerSize: number): number[] {
  if (registerSize <= 0 || registerSize > 24) return [];
  return Array.from({ length: registerSize }, (_, i) => Math.pow(2, registerSize - 1 - i));
}

type BinaryBankCrackGameScreenProps = {
  levelId: string;
  initialSession?: BinaryBankCrackSessionResponse | null;
  onClose: () => void;
};

function bitsToDecimal(bits: number[], registerSize?: number): number {
  const size = registerSize ?? bits.length;
  if (bits.length !== size || size === 0) return 0;
  let n = 0;
  for (let i = 0; i < bits.length; i++) {
    n = (n << 1) | (bits[i] === 1 ? 1 : 0);
  }
  return n;
}

function initialRegisters(count: number, registerSize: number): number[][] {
  return Array.from({ length: count }, () => Array.from({ length: registerSize }, () => 0));
}

/** True if every register's binary value matches the vault target. */
function registersMatchTargets(registers: number[][], targets: number[], registerSize: number): boolean {
  if (registers.length !== targets.length) return false;
  return registers.every((bits, i) => bitsToDecimal(bits, registerSize) === (targets[i] ?? -1));
}

export function BinaryBankCrackGameScreen({ levelId, initialSession, onClose }: BinaryBankCrackGameScreenProps) {
  const colors = useThemeColors();
  const [vaultTargets, setVaultTargets] = useState<number[]>([]);
  const [registersBits, setRegistersBits] = useState<number[][]>([]);
  const [flipsRemaining, setFlipsRemaining] = useState(0);
  /** Toggles since session load or last submit; each flip (0→1 or 1→0) counts. */
  const [flipsUsedThisRun, setFlipsUsedThisRun] = useState(0);
  const [showDecimalAssist, setShowDecimalAssist] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [registerResults, setRegisterResults] = useState<boolean[] | null>(null);
  const [win, setWin] = useState(false);
  const [lostByTime, setLostByTime] = useState(false);
  const [lostByFlips, setLostByFlips] = useState(false);
  const [claimError, setClaimError] = useState(false);
  const [claimingInProgress, setClaimingInProgress] = useState(false);
  const lostOrWonRef = useRef(false);
  /** Tracks flips used this run for the toggleBit guard; updated synchronously so rapid taps cannot bypass the limit. */
  const flipsUsedThisRunRef = useRef(0);

  const [startSession, { isLoading: starting }] = useStartBinaryBankCrackSessionMutation();
  const [submitRegisters, { isLoading: submitting }] = useSubmitBinaryBankCrackRegistersMutation();
  const [claimLevel] = useClaimBinaryBankCrackLevelMutation();
  useGetBinaryBankCrackStatusQuery(undefined, { refetchOnMountOrArgChange: true });

  const registerSize = registersBits[0]?.length ?? 4;
  const bitWeights = getBitWeights(registerSize);

  useEffect(() => {
    if (initialSession) {
      const count = initialSession.registerCount ?? initialSession.vaultTargets.length;
      const size = initialSession.registerSize ?? 4;
      setVaultTargets(initialSession.vaultTargets);
      setRegistersBits(initialRegisters(count, size));
      setFlipsRemaining(initialSession.flipsRemaining);
      setFlipsUsedThisRun(0);
      flipsUsedThisRunRef.current = 0;
      setTimeLeft(initialSession.timeLimitSeconds);
      setShowDecimalAssist(initialSession.showDecimalAssist ?? true);
      setRegisterResults(null);
      setWin(false);
      setLostByTime(false);
      setLostByFlips(false);
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
          const count = result.registerCount ?? result.vaultTargets.length;
          const size = result.registerSize ?? 4;
          setVaultTargets(result.vaultTargets);
          setRegistersBits(initialRegisters(count, size));
          setFlipsRemaining(result.flipsRemaining);
          setFlipsUsedThisRun(0);
          flipsUsedThisRunRef.current = 0;
          setTimeLeft(result.timeLimitSeconds);
          setShowDecimalAssist(result.showDecimalAssist ?? true);
          setRegisterResults(null);
          setWin(false);
          setLostByTime(false);
          setLostByFlips(false);
          setClaimError(false);
          setClaimingInProgress(false);
          lostOrWonRef.current = false;
        }
      } catch {
        if (!cancelled) setWin(false);
      }
    })();
    return () => { cancelled = true; };
  }, [levelId, startSession, initialSession]);

  useEffect(() => {
    if (vaultTargets.length === 0 || lostOrWonRef.current || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!lostOrWonRef.current) {
            lostOrWonRef.current = true;
            setLostByTime(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [vaultTargets.length, timeLeft]);

  const flipsDisplay = Math.max(0, flipsRemaining - flipsUsedThisRun);

  const toggleBit = useCallback(
    (registerIndex: number, bitIndex: number) => {
      if (win || lostByTime || lostByFlips || lostOrWonRef.current) return;
      const flipsLeft = Math.max(0, flipsRemaining - flipsUsedThisRunRef.current);
      if (flipsLeft <= 0) return;
      flipsUsedThisRunRef.current += 1;
      setFlipsUsedThisRun((prev) => prev + 1);
      setRegistersBits((prev) => {
        const next = prev.map((r) => [...r]);
        if (next[registerIndex]) {
          next[registerIndex][bitIndex] = next[registerIndex][bitIndex] === 0 ? 1 : 0;
        }
        return next;
      });
      setRegisterResults(null);
    },
    [win, lostByTime, lostByFlips, flipsRemaining]
  );

  /** Fail only when flips are 0 AND the combination is still wrong (not solved). */
  useEffect(() => {
    if (vaultTargets.length === 0 || win || lostByTime || lostByFlips || lostOrWonRef.current) return;
    if (registersBits.length !== vaultTargets.length) return;
    const flipsLeft = Math.max(0, flipsRemaining - flipsUsedThisRun);
    if (flipsLeft > 0) return;
    const size = registersBits[0]?.length ?? 4;
    if (registersMatchTargets(registersBits, vaultTargets, size)) return;
    lostOrWonRef.current = true;
    setLostByFlips(true);
  }, [vaultTargets, registersBits, flipsRemaining, flipsUsedThisRun, win, lostByTime, lostByFlips]);

  const handleSubmit = useCallback(async () => {
    if (submitting || win || lostByTime || lostByFlips || lostOrWonRef.current) return;
    if (registersBits.length !== vaultTargets.length) return;
    setRegisterResults(null);
    const used = flipsUsedThisRun;
    try {
      const result = await submitRegisters({ levelId, registers: registersBits, flipsUsed: used }).unwrap();
      setFlipsRemaining(result.flipsRemaining);
      setFlipsUsedThisRun(0);
      flipsUsedThisRunRef.current = 0;
      if (result.registerResults) setRegisterResults(result.registerResults);
      if (result.win) {
        lostOrWonRef.current = true;
        setLostByTime(false);
        setLostByFlips(false);
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
      } else if (result.lostAllFlips) {
        lostOrWonRef.current = true;
        setLostByTime(false);
        setLostByFlips(true);
      }
    } catch {
      // Handled by API
    }
  }, [levelId, registersBits, vaultTargets.length, flipsUsedThisRun, submitting, win, lostByTime, lostByFlips, submitRegisters, claimLevel]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (starting && vaultTargets.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={handleClose} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  const lost = lostByTime || lostByFlips;
  const gameOver = win || lost;
  /** Submit allowed with 0 flips when combination is correct; lostByFlips only when 0 flips and wrong combo. */
  const canSubmit = !gameOver && !submitting && !lostOrWonRef.current;
  const noFlipsLeft = flipsDisplay <= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={handleClose} />
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.primary }]}>Flips: {flipsDisplay}</Text>
        <Text style={[styles.headerLabel, { color: colors.primary }]}>Time: {timeLeft}s</Text>
      </View>

      {!gameOver && vaultTargets.length > 0 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
          <Text style={[styles.comboLabel, { color: colors.text?.secondary ?? colors.primary }]}>COMBINATION</Text>
          <Text style={[styles.comboValue, { color: colors.primary }]}>
            {vaultTargets.map((n, i) => (
              <Text key={i}>{i > 0 ? ', ' : ''}{n}</Text>
            ))}
          </Text>

          {vaultTargets.map((target, regIndex) => (
            <View key={regIndex} style={[styles.registerBlock, { borderColor: colors.primary }]}>
              <Text style={[styles.registerLabel, { color: colors.text?.secondary ?? colors.primary }]}>
                Register {regIndex + 1} — target: {target}
              </Text>
              {showDecimalAssist && registersBits[regIndex] && (
                <Text style={[styles.decimalAssist, { color: colors.text?.secondary ?? colors.primary }]}>
                  Binary: {registersBits[regIndex].join('')} → Value: {bitsToDecimal(registersBits[regIndex], registerSize)}
                </Text>
              )}
              <View style={styles.bitRow}>
                {bitWeights.map((w, i) => (
                  <TouchableOpacity
                    key={w}
                    style={[
                      styles.bitButton,
                      { borderColor: colors.primary, backgroundColor: registersBits[regIndex]?.[i] ? (colors.primary + '40') : 'transparent' },
                    ]}
                    onPress={() => toggleBit(regIndex, i)}
                    disabled={gameOver || noFlipsLeft}
                    accessible
                    accessibilityLabel={`Register ${regIndex + 1}, bit ${w}, ${registersBits[regIndex]?.[i] ? 'on' : 'off'}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.bitValue, { color: colors.primary }]}>{registersBits[regIndex]?.[i] ?? 0}</Text>
                    <Text style={[styles.bitWeight, { color: colors.text?.secondary ?? colors.primary }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {registerResults && registerResults[regIndex] === false && (
                <Text style={[styles.regFeedback, { color: colors.error }]}>VALUE MISMATCH</Text>
              )}
              {registerResults && registerResults[regIndex] === true && (
                <Text style={[styles.regFeedback, { color: colors.success ?? colors.primary }]}>✓</Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitButton, { borderColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessible
            accessibilityLabel="Submit full combination"
            accessibilityRole="button"
          >
            <Text style={[styles.submitButtonText, { color: colors.primary }]}>
              {submitting ? '…' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {win && (
        <View style={styles.resultBox}>
          <Text style={[styles.resultTitle, { color: colors.success ?? colors.primary }]}>VAULT CRACKED</Text>
          <Text style={[styles.resultSub, { color: colors.text?.secondary ?? colors.primary }]}>ACCOUNT BREACH SUCCESSFUL</Text>
          {claimError && (
            <Text style={[styles.claimError, { color: colors.error }]}>Claim failed. Tap Back and try again.</Text>
          )}
          {claimingInProgress && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      )}
      {!win && lostByTime && (
        <View style={styles.resultBox}>
          <Text style={[styles.resultTitle, { color: colors.error }]}>SYSTEM LOCKDOWN</Text>
          <Text style={[styles.resultSub, { color: colors.error }]}>ACCESS DENIED</Text>
        </View>
      )}
      {!win && lostByFlips && (
        <View style={styles.resultBox}>
          <Text style={[styles.resultTitle, { color: colors.error }]}>FLIP LIMIT REACHED</Text>
          <Text style={[styles.resultSub, { color: colors.text?.secondary ?? colors.primary }]}>ACCESS DENIED</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.backButton, { borderColor: colors.primary }]} onPress={handleClose}>
        <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SIZING.spacing.lg, paddingTop: 56 },
  loader: { marginTop: SIZING.spacing.xl },
  header: { flexDirection: 'row', gap: SIZING.spacing.lg, marginBottom: SIZING.spacing.md, paddingRight: 56 },
  headerLabel: { fontSize: SIZING.font.body, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SIZING.spacing.xl },
  comboLabel: { fontSize: SIZING.font.small, marginBottom: SIZING.spacing.xs },
  comboValue: { fontSize: SIZING.font.body, fontWeight: '700', marginBottom: SIZING.spacing.lg },
  registerBlock: { borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.md, marginBottom: SIZING.spacing.lg },
  registerLabel: { fontSize: SIZING.font.small, fontWeight: '600', marginBottom: SIZING.spacing.xs },
  decimalAssist: { fontSize: SIZING.font.small, marginBottom: SIZING.spacing.sm },
  bitRow: { flexDirection: 'row', gap: SIZING.spacing.sm, marginBottom: SIZING.spacing.xs },
  bitButton: { borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.sm, minWidth: 48, alignItems: 'center' },
  bitValue: { fontSize: SIZING.font.body, fontWeight: '700' },
  bitWeight: { fontSize: SIZING.font.small, marginTop: 2 },
  regFeedback: { fontSize: SIZING.font.small, fontWeight: '700', marginTop: SIZING.spacing.xs },
  submitButton: { borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.md, alignSelf: 'flex-start', marginTop: SIZING.spacing.sm },
  submitButtonText: { fontSize: SIZING.font.body, fontWeight: '600' },
  resultBox: { marginTop: SIZING.spacing.xl, alignItems: 'center' },
  resultTitle: { fontSize: SIZING.font.large, fontWeight: '700', marginBottom: SIZING.spacing.xs },
  resultSub: { fontSize: SIZING.font.body },
  claimError: { fontSize: SIZING.font.small, marginTop: SIZING.spacing.sm },
  backButton: { borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.md, marginTop: SIZING.spacing.lg, alignSelf: 'flex-start' },
  backButtonText: { fontSize: SIZING.font.body, fontWeight: '600' },
});
