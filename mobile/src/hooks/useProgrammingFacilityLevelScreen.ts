import { useState, useCallback, useRef, useEffect } from 'react';

/** Minimal level config shape used by all three Programming Facility level screens. */
export interface LevelConfigForSelect {
  levelId: string;
  tier: number;
  cost?: number;
  isUnlocked: boolean;
  isCompleted: boolean;
}

const DEFAULT_ENTRY_DEDUCTION_DELAY_MS = 1000;

type UseProgrammingFacilityLevelScreenArgs<TSession> = {
  levelConfigs: LevelConfigForSelect[];
  numericBalance: number;
  startSession: (levelId: string) => Promise<TSession>;
  onSelectLevel: (levelId: string, session?: TSession) => void;
  onClose: () => void;
  entryDeductionDelayMs?: number;
  /** Called when startSession throws (e.g. to handle 402 without resetting UI). */
  onStartSessionError?: (err: unknown) => void;
};

export function useProgrammingFacilityLevelScreen<TSession = unknown>({
  levelConfigs,
  numericBalance,
  startSession,
  onSelectLevel,
  onClose,
  entryDeductionDelayMs = DEFAULT_ENTRY_DEDUCTION_DELAY_MS,
  onStartSessionError,
}: UseProgrammingFacilityLevelScreenArgs<TSession>) {
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);
  const entryDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingLevelRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (entryDelayTimeoutRef.current != null) {
        clearTimeout(entryDelayTimeoutRef.current);
        entryDelayTimeoutRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (entryDelayTimeoutRef.current != null) {
      clearTimeout(entryDelayTimeoutRef.current);
      entryDelayTimeoutRef.current = null;
    }
    isSelectingLevelRef.current = false;
    onClose();
  }, [onClose]);

  const handleSelectLevel = useCallback(
    async (levelId: string) => {
      if (isSelectingLevelRef.current) return;
      const config = levelConfigs.find((c) => c.levelId === levelId);
      if (!config?.isUnlocked || config?.isCompleted || numericBalance < (config.cost ?? 0)) return;
      isSelectingLevelRef.current = true;
      if (entryDelayTimeoutRef.current != null) {
        clearTimeout(entryDelayTimeoutRef.current);
        entryDelayTimeoutRef.current = null;
      }
      setStartingLevelId(levelId);
      try {
        const result = await startSession(levelId);
        if (!isMountedRef.current) {
          isSelectingLevelRef.current = false;
          setStartingLevelId(null);
          return;
        }
        entryDelayTimeoutRef.current = setTimeout(() => {
          entryDelayTimeoutRef.current = null;
          isSelectingLevelRef.current = false;
          setStartingLevelId(null);
          if (!isMountedRef.current) return;
          onSelectLevel(levelId, result);
        }, entryDeductionDelayMs);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        isSelectingLevelRef.current = false;
        setStartingLevelId(null);
        onStartSessionError?.(err);
      }
    },
    [levelConfigs, numericBalance, startSession, onSelectLevel, entryDeductionDelayMs, onStartSessionError]
  );

  return { startingLevelId, handleClose, handleSelectLevel };
}
