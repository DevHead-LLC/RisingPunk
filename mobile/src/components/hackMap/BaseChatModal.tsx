/**
 * Shared chat modal UI for Crew Chat and World Chat (Bugbot: single source for scroll, report, input, styling).
 * Parameterized by title, messages data, send callback, and report context so callers only wire their API hooks.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { FilteredTextInput } from '../common/FilteredTextInput';
import { FilteredText } from '../common/FilteredText';
import { UserReportModal } from '../modals/UserReportModal';
import { PROBE_REPORT_SENDER_ID, BATTLE_REPORT_SENDER_ID } from '../../constants/systemSenders';
import {
  formatHackLocationDisplay,
  parseHackLocationDisplayCoords,
} from '../../../../shared/hackMapLocationDisplay';
import { parseMapLocationShareMessage } from '../../../../shared/mapLocationShareMessage';
import type { ReportContext } from '../../types/reports';
import { normalizeUserId } from '../../utils/battleUtils';

const PROBE_REPORT_PREFIX = 'PRB|';
const BATTLE_REPORT_PREFIX = 'BTL|';

export interface ProbeReportPayload {
  pr: 1;
  n: string;
  t: 'player' | 'npc';
  l: number;
  x: number;
  y: number;
  b: { breacher: number; guardian: number; phreak: number };
}

function parseProbeReportMessage(message: string): ProbeReportPayload | null {
  if (!message.startsWith(PROBE_REPORT_PREFIX)) return null;
  try {
    const json = message.slice(PROBE_REPORT_PREFIX.length);
    const payload = JSON.parse(json) as ProbeReportPayload;
    if (payload?.pr === 1 && payload.n != null && payload.b) {
      if (!Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return null;
      return payload;
    }
  } catch (_) {
    // ignore
  }
  return null;
}

export interface BattleReportBotCounts {
  guardian: number;
  breacher: number;
  phreak: number;
}

/** Parse/validate bot count object from BTL JSON; returns null if shape is unusable (Bugbot: matches probe `b` guard). */
function normalizeBattleReportBotCounts(raw: unknown): BattleReportBotCounts | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const n = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.max(0, Math.floor(v));
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const parsed = Number(v);
      if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
    }
    return null;
  };
  const guardian = n(o.guardian);
  const breacher = n(o.breacher);
  const phreak = n(o.phreak);
  if (guardian === null || breacher === null || phreak === null) return null;
  return { guardian, breacher, phreak };
}

export interface BattleReportPayload {
  br: 1;
  /** Set for computer/NPC battles (server); client adjusts reward vs PvP wallet copy. */
  npc?: 1;
  attackerId: string;
  defenderId: string;
  attackerHandle: string;
  defenderHandle: string;
  attackerStart: BattleReportBotCounts;
  defenderStart: BattleReportBotCounts;
  attackerLost: BattleReportBotCounts;
  defenderLost: BattleReportBotCounts;
  /**
   * Which battle **side** won (see `BattleNotificationService`: `battle.winner` → JSON).
   * `user` = attacker NODE (`NodeOwner.USER`); `enemy` = defender NODE (`NodeOwner.ENEMY`).
   * Same payload for both recipients — not the English word "enemy" as "your opponent"; both sides interpret using the same keys.
   */
  winner: 'user' | 'enemy';
  /** Dollars moved from defender wallet to attacker when attacker won (0 or omitted if none). */
  cash?: number;
  /** NPC / legacy: single XP line. */
  xp?: number;
  /** PvP: XP from destroying opponent bots (per side). */
  xpAttacker?: number;
  xpDefender?: number;
  /** Synthetic IP-style hack location (server `hl`); not real map data. */
  hl?: string;
  /** When present with `x`/`y`, tap-to-navigate on map (same as shared location in chat). */
  mapName?: string;
  x?: number;
  y?: number;
  /** Present on newer PvP reports; links to GET /api/battle/:id/replay. */
  battleId?: string;
}

function parseBattleReportMessage(message: string): BattleReportPayload | null {
  if (!message.startsWith(BATTLE_REPORT_PREFIX)) return null;
  try {
    const json = message.slice(BATTLE_REPORT_PREFIX.length);
    const payload = JSON.parse(json) as BattleReportPayload;
    if (payload?.br !== 1 || payload.attackerHandle == null || payload.defenderHandle == null) return null;
    if (payload.winner !== 'user' && payload.winner !== 'enemy') return null;
    const attackerStart = normalizeBattleReportBotCounts(payload.attackerStart);
    const defenderStart = normalizeBattleReportBotCounts(payload.defenderStart);
    const attackerLost = normalizeBattleReportBotCounts(payload.attackerLost);
    const defenderLost = normalizeBattleReportBotCounts(payload.defenderLost);
    if (!attackerStart || !defenderStart || !attackerLost || !defenderLost) return null;
    const mapName =
      typeof payload.mapName === 'string' && payload.mapName.trim().length > 0
        ? payload.mapName.trim()
        : undefined;
    const x =
      typeof payload.x === 'number' && Number.isFinite(payload.x) ? payload.x : undefined;
    const y =
      typeof payload.y === 'number' && Number.isFinite(payload.y) ? payload.y : undefined;
    const battleIdRaw = (payload as { battleId?: unknown }).battleId;
    const battleId =
      typeof battleIdRaw === 'string' && battleIdRaw.trim().length > 0 ? battleIdRaw.trim() : undefined;
    const isNpcReport = (payload as { npc?: unknown }).npc === 1;
    return {
      ...payload,
      npc: isNpcReport ? 1 : undefined,
      attackerStart,
      defenderStart,
      attackerLost,
      defenderLost,
      mapName,
      x: x !== undefined && Number.isFinite(x) ? x : undefined,
      y: y !== undefined && Number.isFinite(y) ? y : undefined,
      battleId,
    };
  } catch (_) {
    // ignore
  }
  return null;
}

/**
 * Whether the viewer is the attacker (hacker) vs defender (hackee).
 * Uses id match (case-insensitive hex) and handle fallback when ids differ in shape.
 */
function battleReportViewerIsAttacker(
  report: BattleReportPayload,
  currentUser: BaseChatModalProps['currentUser']
): boolean {
  const uid = normalizeUserId(currentUser?._id ?? currentUser?.id);
  const aid = normalizeUserId(report.attackerId);
  const did = normalizeUserId(report.defenderId);
  const ul = uid.toLowerCase();
  const al = aid.toLowerCase();
  const dl = did.toLowerCase();
  if (ul && al && ul === al) return true;
  if (ul && dl && ul === dl) return false;

  const ch = (currentUser?.handle ?? '').trim().toLowerCase();
  const ah = (report.attackerHandle ?? '').trim().toLowerCase();
  const dh = (report.defenderHandle ?? '').trim().toLowerCase();
  if (ch && ah && ch === ah) return true;
  if (ch && dh && ch === dh) return false;

  // Non-empty id matches are handled above; remaining '' === '' must not count as attacker (Bugbot).
  return false;
}

function formatFetchErrorMessage(fetchError: unknown): string {
  if (fetchError == null) return 'Unknown error';
  if (typeof fetchError === 'object' && fetchError !== null) {
    const o = fetchError as Record<string, unknown>;
    const data = o.data;
    if (data && typeof data === 'object' && data !== null && 'error' in data) {
      const err = (data as Record<string, unknown>).error;
      if (typeof err === 'string' && err.trim() !== '') return err;
    }
    if (typeof o.error === 'string' && o.error.trim() !== '') return o.error;
  }
  return 'Unknown error';
}

export interface ChatMessageForModal {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  /** When true, show as "Admin" (or "You (Admin)" if current user). Set by server for world/crew/PM. */
  isFromAdmin?: boolean;
  /** When true, message was sent via admin "message all"; replies are disabled for this conversation. */
  isAdminBroadcast?: boolean;
}

export interface BaseChatModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  messages: ChatMessageForModal[];
  fetchError: unknown;
  isLoadingMessages: boolean;
  onSendMessage: (trimmedMessage: string) => Promise<void>;
  isSending: boolean;
  currentUser: { _id?: string; id?: string; handle?: string; isAdmin?: boolean } | null;
  reportContext: ReportContext;
  getReportContextData: (reportedMessage: ChatMessageForModal) => Record<string, unknown>;
  /** When false, input is hidden (e.g. admin broadcast conversation). Default true. */
  canReply?: boolean;
  /** Tap shared map location (LOC|) to pan the HackMap to that cell. */
  onNavigateToMapCell?: (target: { mapName: string; x: number; y: number }) => void;
  /** Battle Report: open stored replay when `battleId` is present in payload (R4). */
  onWatchBattle?: (battleId: string) => void;
}

export const BaseChatModal: React.FC<BaseChatModalProps> = ({
  visible,
  onClose,
  title,
  messages,
  fetchError,
  isLoadingMessages,
  onSendMessage,
  isSending,
  currentUser,
  reportContext,
  getReportContextData,
  canReply = true,
  onNavigateToMapCell,
  onWatchBattle,
}) => {
  const colors = useThemeColors();
  const currentUserId = currentUser?._id || (currentUser as any)?.id;

  const [messageInput, setMessageInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedMessage, setReportedMessage] = useState<ChatMessageForModal | null>(null);

  const maxCharacters = 500;
  const characterCount = messageInput.length;

  const hasScrolledOnOpen = useRef(false);
  const lastVisibleState = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const SCROLL_BOTTOM_THRESHOLD = 60;
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    if (!visible && lastVisibleState.current) {
      hasScrolledOnOpen.current = false;
      prevMessagesLengthRef.current = 0;
      isAtBottomRef.current = true;
      setShowReportModal(false);
      setReportedMessage(null);
    }
    lastVisibleState.current = visible;
  }, [visible]);

  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    if (messages.length > prevLen && isAtBottomRef.current && visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, visible]);

  const updateAtBottomFromScrollEvent = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    try {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      if (contentSize.height <= 0) return;
      const atBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_BOTTOM_THRESHOLD;
      isAtBottomRef.current = atBottom;
    } catch (_) {
      // ignore
    }
  }, []);

  const handleSendMessage = async () => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage || !currentUserId || isSending) return;
    try {
      await onSendMessage(trimmedMessage);
      setMessageInput('');
      Keyboard.dismiss();
      isAtBottomRef.current = true;
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (_) {
      // Caller's onSendMessage may throw; mutation exposes error state if needed
    }
  };

  const handleClose = useCallback(() => {
    setMessageInput('');
    setShowReportModal(false);
    setReportedMessage(null);
    onClose();
  }, [onClose]);

  const isCurrentUser = useCallback(
    (userId: string) => {
      if (!userId || !currentUser || !currentUserId) return false;
      const currentIdStr = String(currentUserId).trim();
      const messageIdStr = String(userId).trim();
      const currentIdAlt = String(currentUser._id || (currentUser as any)?.id || '').trim();
      return currentIdStr === messageIdStr || currentIdAlt === messageIdStr;
    },
    [currentUserId, currentUser],
  );

  const handleReportMessage = (message: ChatMessageForModal) => {
    if (isCurrentUser(message.userId)) return;
    const timestamp =
      message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
    setReportedMessage({
      id: message.id,
      userId: message.userId,
      username: message.username,
      message: message.message,
      timestamp,
    });
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportedMessage(null);
  };

  const styles = createStyles(colors);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
        hardwareAccelerated
        supportedOrientations={['landscape-left', 'landscape-right']}
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalRoot}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <SafeAreaView style={styles.chatModalContainer}>
            <View style={styles.header} pointerEvents="box-none">
              <Text style={styles.title}>{title}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEnabled
              keyboardShouldPersistTaps="handled"
              onScrollEndDrag={updateAtBottomFromScrollEvent}
              onMomentumScrollEnd={updateAtBottomFromScrollEvent}
              onContentSizeChange={() => {
                if (
                  visible &&
                  !hasScrolledOnOpen.current &&
                  messages.length > 0 &&
                  !isLoadingMessages
                ) {
                  hasScrolledOnOpen.current = true;
                  isAtBottomRef.current = true;
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }, 50);
                }
              }}
            >
              {fetchError ? (
                <View style={styles.errorState}>
                  <Text style={styles.errorStateText}>Error loading messages. Please try again.</Text>
                  <Text
                    style={[styles.errorStateText, { fontSize: SIZING.font.small, marginTop: SIZING.spacing.xs }]}
                  >
                    {formatFetchErrorMessage(fetchError)}
                  </Text>
                </View>
              ) : isLoadingMessages && messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Loading messages...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No messages yet. Start the conversation!</Text>
                </View>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = isCurrentUser(message.userId);
                  const displayName = isOwnMessage
                    ? (currentUser?.isAdmin ? 'You (Admin)' : 'You')
                    : (message.isFromAdmin ? 'Admin' : message.username);
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageWrapper,
                        isOwnMessage ? styles.messageWrapperRight : styles.messageWrapperLeft,
                      ]}
                    >
                      <Text
                        style={[
                          styles.usernameText,
                          isOwnMessage ? styles.usernameTextRight : styles.usernameTextLeft,
                        ]}
                      >
                        {displayName}
                      </Text>
                      <View style={styles.messageBubbleWrapper}>
                        <View
                          style={[
                            styles.messageBubble,
                            isOwnMessage ? styles.messageBubbleRight : styles.messageBubbleLeft,
                          ]}
                        >
                          {message.userId === PROBE_REPORT_SENDER_ID ? (() => {
                            const report = parseProbeReportMessage(message.message);
                            if (!report) {
                              return (
                                <FilteredText
                                  style={[
                                    styles.messageText,
                                    isOwnMessage ? styles.messageTextRight : styles.messageTextLeft,
                                  ]}
                                >
                                  {message.message}
                                </FilteredText>
                              );
                            }
                            const probeHackLocLine = formatHackLocationDisplay(report.x, report.y);
                            return (
                              <View style={styles.probeReportBlock}>
                                <Text style={[styles.probeReportTitle, { color: colors.text.primary }]}>
                                  Probe Report
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  Target: {report.n} ({report.t === 'npc' ? 'NPC' : 'Player'}) | Level: {report.l}
                                </Text>
                                <Text
                                  style={[
                                    styles.messageText,
                                    styles.probeReportLine,
                                    { color: colors.text.primary },
                                  ]}
                                >
                                  Hack Location
                                </Text>
                                <Text
                                  style={[
                                    styles.messageText,
                                    styles.probeReportLine,
                                    styles.hackLocationMono,
                                    { color: colors.text.secondary },
                                  ]}
                                >
                                  {probeHackLocLine}
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  Breacher: {report.b.breacher} · Guardian: {report.b.guardian} · Phreak: {report.b.phreak}
                                </Text>
                              </View>
                            );
                          })() : message.userId === BATTLE_REPORT_SENDER_ID ? (() => {
                            const report = parseBattleReportMessage(message.message);
                            if (!report) {
                              return (
                                <FilteredText
                                  style={[
                                    styles.messageText,
                                    isOwnMessage ? styles.messageTextRight : styles.messageTextLeft,
                                  ]}
                                >
                                  {message.message}
                                </FilteredText>
                              );
                            }
                            const isAttacker = battleReportViewerIsAttacker(report, currentUser);
                            // Bugbot: attacker viewer — `user` = attacker side won, `enemy` = defender side won. Defender viewer uses same `winner` (battle-axis; not narrative "enemy").
                            const status =
                              isAttacker
                                ? (report.winner === 'user' ? 'Successful Breach' : 'Hack Failed')
                                : (report.winner === 'enemy' ? 'Defense Successful' : 'Defense Failed');
                            const cash =
                              typeof report.cash === 'number' && Number.isFinite(report.cash)
                                ? Math.max(0, Math.floor(report.cash))
                                : 0;
                            // NPC: show wallet only when cash > 0 (server sets cash from processedRewards).
                            // PvP: always show wallet line when attacker won — even $0 (defender had no remaining balance).
                            const isPvP = report.npc !== 1;
                            const xpLegacy =
                              typeof report.xp === 'number' && Number.isFinite(report.xp)
                                ? Math.max(0, Math.floor(report.xp))
                                : 0;
                            const xpAtt =
                              typeof report.xpAttacker === 'number' && Number.isFinite(report.xpAttacker)
                                ? Math.max(0, Math.floor(report.xpAttacker))
                                : 0;
                            const xpDef =
                              typeof report.xpDefender === 'number' && Number.isFinite(report.xpDefender)
                                ? Math.max(0, Math.floor(report.xpDefender))
                                : 0;
                            const xp =
                              isPvP && (xpAtt > 0 || xpDef > 0)
                                ? isAttacker
                                  ? xpAtt
                                  : xpDef
                                : xpLegacy;
                            const showWallet = report.winner === 'user' && (isPvP || cash > 0);
                            const hackLocLine =
                              typeof report.hl === 'string' && report.hl.trim().length > 0
                                ? report.hl.trim()
                                : null;
                            const battleMapName =
                              typeof report.mapName === 'string' && report.mapName.trim().length > 0
                                ? report.mapName.trim()
                                : 'main';
                            const battleCoords =
                              typeof report.x === 'number' &&
                              Number.isFinite(report.x) &&
                              typeof report.y === 'number' &&
                              Number.isFinite(report.y)
                                ? { x: report.x, y: report.y }
                                : hackLocLine
                                  ? parseHackLocationDisplayCoords(hackLocLine)
                                  : null;
                            const canOpenBattleOnMap =
                              Boolean(onNavigateToMapCell) &&
                              battleCoords !== null &&
                              battleMapName === 'main';
                            const fmt = (n: number) => n.toLocaleString();
                            const line = (label: string, start: number, lost: number) =>
                              `${label} - ${fmt(start)} > ${fmt(lost)} Lost`;
                            const renderSide = (
                              title: string,
                              start: BattleReportBotCounts,
                              lost: BattleReportBotCounts,
                            ) => (
                              <>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  {title}
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  {line('Guardians', start.guardian, lost.guardian)}
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  {line('Breachers', start.breacher, lost.breacher)}
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  {line('Phreaks', start.phreak, lost.phreak)}
                                </Text>
                              </>
                            );
                            const hackLocationBlock = hackLocLine ? (
                              <>
                                <Text
                                  style={[
                                    styles.messageText,
                                    styles.probeReportLine,
                                    { color: colors.text.primary },
                                  ]}
                                >
                                  Hack Location
                                </Text>
                                <Text
                                  style={[
                                    styles.messageText,
                                    styles.probeReportLine,
                                    styles.hackLocationMono,
                                    {
                                      color: canOpenBattleOnMap
                                        ? (colors.primary ?? colors.text.secondary)
                                        : colors.text.secondary,
                                      textDecorationLine: canOpenBattleOnMap ? 'underline' : 'none',
                                    },
                                  ]}
                                >
                                  {hackLocLine}
                                </Text>
                                {canOpenBattleOnMap ? (
                                  <Text
                                    style={[
                                      styles.messageText,
                                      styles.probeReportLine,
                                      {
                                        fontSize: SIZING.font.small,
                                        fontStyle: 'italic',
                                        color: colors.text.secondary,
                                      },
                                    ]}
                                  >
                                    Tap to open on map
                                  </Text>
                                ) : null}
                              </>
                            ) : null;
                            return (
                              <View style={styles.probeReportBlock}>
                                <Text style={[styles.probeReportTitle, { color: colors.text.primary }]}>
                                  Battle Report
                                </Text>
                                {hackLocationBlock ? (
                                  canOpenBattleOnMap && battleCoords ? (
                                    <Pressable
                                      onPress={() =>
                                        onNavigateToMapCell?.({
                                          mapName: battleMapName,
                                          x: battleCoords.x,
                                          y: battleCoords.y,
                                        })
                                      }
                                      accessibilityRole="button"
                                      accessibilityLabel="Open battle location on map"
                                    >
                                      {hackLocationBlock}
                                    </Pressable>
                                  ) : (
                                    hackLocationBlock
                                  )
                                ) : null}
                                {renderSide(
                                  `Attacker: ${report.attackerHandle}${isAttacker ? ' (You)' : ''}`,
                                  report.attackerStart,
                                  report.attackerLost,
                                )}
                                {renderSide(
                                  `Defender: ${report.defenderHandle}${!isAttacker ? ' (You)' : ''}`,
                                  report.defenderStart,
                                  report.defenderLost,
                                )}
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  Result:
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  {status}
                                </Text>
                                {showWallet ? (
                                  <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                    {report.npc === 1 && isAttacker
                                      ? `Victory reward: $${fmt(cash)}`
                                      : isAttacker
                                        ? cash > 0
                                          ? `Wallet stolen: $${fmt(cash)}`
                                          : 'Wallet stolen: $0 (No remaining balance)'
                                        : cash > 0
                                          ? `Wallet lost: $${fmt(cash)}`
                                          : 'Wallet lost: $0 (No remaining balance)'}
                                  </Text>
                                ) : null}
                                {xp > 0 ? (
                                  <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                    Experience gained: {fmt(xp)} XP
                                  </Text>
                                ) : null}
                                {report.battleId && onWatchBattle ? (
                                  <Pressable
                                    onPress={() => onWatchBattle(report.battleId!)}
                                    style={styles.watchBattleBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel="Watch battle replay"
                                  >
                                    <Text style={[styles.messageText, styles.watchBattleBtnText, { color: colors.primary }]}>
                                      Watch battle
                                    </Text>
                                  </Pressable>
                                ) : null}
                              </View>
                            );
                          })() : (() => {
                            const locShare = parseMapLocationShareMessage(message.message);
                            if (locShare) {
                              const hackLocLine = formatHackLocationDisplay(locShare.x, locShare.y);
                              const primaryOnBubble = isOwnMessage ? colors.background : colors.text.primary;
                              const secondaryOnBubble = isOwnMessage ? colors.background : colors.text.secondary;
                              const card = (
                                <View style={styles.probeReportBlock}>
                                  <Text style={[styles.probeReportTitle, { color: primaryOnBubble }]}>
                                    Shared location
                                  </Text>
                                  <Text
                                    style={[
                                      styles.messageText,
                                      styles.probeReportLine,
                                      { color: primaryOnBubble },
                                    ]}
                                  >
                                    {locShare.label}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.messageText,
                                      styles.probeReportLine,
                                      styles.hackLocationMono,
                                      { color: secondaryOnBubble },
                                    ]}
                                  >
                                    {hackLocLine}
                                  </Text>
                                  {onNavigateToMapCell ? (
                                    <Text
                                      style={[
                                        styles.messageText,
                                        styles.probeReportLine,
                                        {
                                          fontSize: SIZING.font.small,
                                          fontStyle: 'italic',
                                          color: secondaryOnBubble,
                                        },
                                      ]}
                                    >
                                      Tap to open on map
                                    </Text>
                                  ) : null}
                                </View>
                              );
                              if (onNavigateToMapCell) {
                                return (
                                  <Pressable
                                    onPress={() =>
                                      onNavigateToMapCell({
                                        mapName: locShare.mapName,
                                        x: locShare.x,
                                        y: locShare.y,
                                      })
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel="Open shared location on map"
                                  >
                                    {card}
                                  </Pressable>
                                );
                              }
                              return card;
                            }
                            return (
                              <FilteredText
                                style={[
                                  styles.messageText,
                                  isOwnMessage ? styles.messageTextRight : styles.messageTextLeft,
                                ]}
                              >
                                {message.message}
                              </FilteredText>
                            );
                          })()}
                        </View>
                        {!isOwnMessage && (
                          <TouchableOpacity
                            onPress={() => handleReportMessage(message)}
                            activeOpacity={0.7}
                            style={[styles.reportButton, { backgroundColor: colors.background + 'E6' }]}
                          >
                            <Text style={[styles.reportButtonText, { color: colors.text.secondary }]}>
                              Report
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.timestampText,
                          isOwnMessage ? styles.timestampTextRight : styles.timestampTextLeft,
                        ]}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {canReply ? (
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <FilteredTextInput
                    style={[
                      styles.messageInput,
                      {
                        borderColor:
                          characterCount > maxCharacters ? colors.error : colors.secondary,
                        backgroundColor: colors.inputBg || colors.surface,
                        color: colors.text.primary,
                      },
                    ]}
                    value={messageInput}
                    onChangeText={setMessageInput}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.text.placeholder}
                    multiline
                    maxLength={maxCharacters}
                    textAlignVertical="top"
                  />
                  <Text style={styles.characterCount}>
                    {characterCount} / {maxCharacters}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                    (characterCount > maxCharacters || !messageInput.trim()) && {
                      backgroundColor: colors.buttonDisabled,
                      borderColor: colors.buttonDisabled,
                    },
                  ]}
                  onPress={handleSendMessage}
                  disabled={
                    characterCount > maxCharacters || !messageInput.trim() || isSending
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noReplyContainer}>
                <Text style={[styles.noReplyText, { color: colors.text.secondary }]}>
                  Admin message — replies are disabled.
                </Text>
              </View>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>

        {currentUser && reportedMessage && showReportModal && (
          <UserReportModal
            visible={showReportModal}
            onClose={handleCloseReportModal}
            reportedUserId={reportedMessage.userId}
            reportedUsername={reportedMessage.username}
            reportingUserId={String(currentUser._id || (currentUser as any)?.id || '')}
            reportingUsername={currentUser.handle || 'Unknown'}
            context={reportContext}
            contextData={getReportContextData(reportedMessage)}
            maxDescriptionLength={1000}
            renderAsOverlay
          />
        )}
        </View>
      </Modal>
    </>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      zIndex: 99999,
      elevation: 99999,
    },
    overlay: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.background,
    },
    chatModalContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SIZING.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.secondary,
    },
    title: {
      color: colors.text.primary,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      borderColor: colors.secondary,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: SIZING.spacing.md,
    },
    closeButtonText: {
      color: colors.background,
      fontSize: 28,
      marginTop: -2,
      fontWeight: 'bold',
    },
    messagesContainer: { flex: 1 },
    messagesContent: {
      padding: SIZING.spacing.md,
      paddingBottom: SIZING.spacing.lg,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SIZING.spacing.lg * 2,
    },
    emptyStateText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.body,
      textAlign: 'center',
    },
    errorState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SIZING.spacing.lg * 2,
    },
    errorStateText: {
      color: colors.error,
      fontSize: SIZING.font.body,
      textAlign: 'center',
    },
    messageWrapper: {
      marginBottom: SIZING.spacing.lg,
      maxWidth: '75%',
    },
    messageWrapperLeft: { alignSelf: 'flex-start', paddingRight: SIZING.spacing.lg },
    messageWrapperRight: { alignSelf: 'flex-end', paddingLeft: SIZING.spacing.lg },
    messageBubbleWrapper: { position: 'relative' },
    usernameText: {
      fontSize: SIZING.font.small,
      fontWeight: '600',
      marginBottom: SIZING.spacing.xs,
    },
    usernameTextLeft: { color: colors.text.secondary, textAlign: 'left' },
    usernameTextRight: {
      color: colors.primary,
      textAlign: 'right',
      fontWeight: '700',
    },
    messageBubble: {
      borderRadius: 12,
      padding: SIZING.spacing.md,
      borderWidth: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    messageBubbleLeft: { backgroundColor: colors.surface, borderColor: colors.secondary },
    messageBubbleRight: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderWidth: 2,
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    messageText: { fontSize: SIZING.font.body, lineHeight: SIZING.font.body + 4 },
    probeReportBlock: { gap: 4 },
    probeReportTitle: { fontSize: SIZING.font.body, fontWeight: '600', marginBottom: 2 },
    probeReportLine: { fontSize: SIZING.font.body, lineHeight: SIZING.font.body + 4 },
    /** Synthetic hack location — monospace “IP-like” line */
    hackLocationMono: {
      fontSize: SIZING.font.body,
      lineHeight: SIZING.font.body + 4,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      letterSpacing: 0.5,
    },
    reportButton: {
      position: 'absolute',
      bottom: -3,
      right: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    reportButtonText: { fontSize: SIZING.font.small - 5, fontWeight: '500' },
    messageTextLeft: { color: colors.text.primary },
    messageTextRight: { color: colors.background, fontWeight: '500' },
    timestampText: {
      fontSize: SIZING.font.small - 2,
      marginTop: SIZING.spacing.xs / 2,
      opacity: 0.6,
    },
    timestampTextLeft: { color: colors.text.secondary, textAlign: 'left' },
    timestampTextRight: { color: colors.primary, textAlign: 'right' },
    inputContainer: {
      flexDirection: 'row',
      padding: SIZING.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.secondary,
      gap: SIZING.spacing.md,
      paddingBottom: Platform.OS === 'ios' ? SIZING.spacing.lg : SIZING.spacing.md,
    },
    noReplyContainer: {
      padding: SIZING.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.secondary,
      alignItems: 'center',
    },
    noReplyText: {
      fontSize: SIZING.font.small,
      fontStyle: 'italic',
    },
    inputWrapper: { flex: 1 },
    messageInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: SIZING.spacing.md,
      fontSize: SIZING.font.body,
      minHeight: 44,
      maxHeight: 100,
    },
    characterCount: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      textAlign: 'right',
      marginTop: SIZING.spacing.xs,
    },
    sendButton: {
      paddingHorizontal: SIZING.spacing.lg,
      paddingVertical: SIZING.spacing.md,
      borderRadius: 8,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 80,
    },
    sendButtonText: {
      color: colors.background,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    watchBattleBtn: {
      marginTop: SIZING.spacing.sm,
      alignSelf: 'flex-start',
    },
    watchBattleBtnText: {
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
  });
