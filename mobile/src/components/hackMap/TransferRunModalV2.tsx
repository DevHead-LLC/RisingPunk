import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { useFetchStorageInventoryQuery } from '../../store/api/bugHuntApi';
import { useCancelTransferRunMutation, useGetMyTransferRunsQuery, useLaunchTransferRunMutation, useQuoteTransferRunMutation } from '../../store/api/transferRunApi';

type Recipient = { userId: string; username: string; targetX: number; targetY: number };
type Props = { visible: boolean; onClose: () => void; recipient: Recipient | null };
type Tab = 'items' | 'cash' | 'active';

const FONT = { xs: SIZING.font.small, sm: SIZING.font.small, md: SIZING.font.body, lg: SIZING.font.large } as const;

export const TransferRunModalV2: React.FC<Props> = ({ visible, onClose, recipient }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('items');
  const [selectedByKey, setSelectedByKey] = useState<Record<string, number>>({});
  const [cashInput, setCashInput] = useState('');
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteTransfer, quoteState] = useQuoteTransferRunMutation();
  const [launchTransfer, launchState] = useLaunchTransferRunMutation();
  const [cancelTransfer, cancelState] = useCancelTransferRunMutation();
  const { data: balanceData, refetch: refetchBalance } = useFetchBalanceQuery(undefined, { skip: !visible, pollingInterval: visible ? 5000 : 0 });
  const { data: inventoryData, refetch: refetchInventory } = useFetchStorageInventoryQuery(undefined, { skip: !visible, pollingInterval: visible ? 5000 : 0 });
  const { data: myRunsData, isFetching: runsLoading, refetch: refetchRuns } = useGetMyTransferRunsQuery(undefined, { skip: !visible, pollingInterval: visible ? 3000 : 0 });

  const walletAmount = Math.max(0, Math.floor(Number(cashInput.replace(/[^0-9]/g, '') || '0')));
  const selectedItems = useMemo(
    () =>
      Object.entries(selectedByKey)
        .map(([itemKey, quantity]) => ({ itemKey, quantity: Math.max(0, Math.floor(quantity)) }))
        .filter((row) => row.quantity > 0),
    [selectedByKey]
  );
  const rows = inventoryData?.items ?? [];
  const quote = quoteState.data;

  useEffect(() => {
    if (!visible) return;
    const refresh = async () => {
      await Promise.all([refetchBalance(), refetchInventory(), refetchRuns()]);
    };
    refresh().catch(() => {
      // Non-blocking refresh; query hooks will continue polling.
    });
  }, [visible, refetchBalance, refetchInventory, refetchRuns]);

  useEffect(() => {
    if (!visible) {
      setTab('items');
      setSelectedByKey({});
      setCashInput('');
      setQuoteError(null);
      return;
    }
    if (walletAmount <= 0 && selectedItems.length === 0) {
      setQuoteError(null);
      return;
    }
    const timer = setTimeout(() => {
      const requestQuote = async () => {
        try {
          await quoteTransfer({ walletAmount, items: selectedItems }).unwrap();
          setQuoteError(null);
        } catch (error: unknown) {
          const message = (error as { data?: { error?: string } })?.data?.error;
          setQuoteError(message ? String(message) : 'Could not calculate transfer quote');
        }
      };
      requestQuote().catch(() => {
        // Error state is already handled in the catch above.
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [visible, walletAmount, selectedItems, quoteTransfer]);

  const canSend = recipient != null && !launchState.isLoading && quote != null && quoteError == null;
  const headerBalance = Math.max(0, Math.floor(Number(balanceData?.total ?? 0)));

  const onChangeItemQty = (itemKey: string, qty: number, maxOwned: number) => {
    const clamped = Math.max(0, Math.min(Math.floor(qty), Math.max(0, Math.floor(maxOwned))));
    setSelectedByKey((prev) => ({ ...prev, [itemKey]: clamped }));
  };

  const onSend = async () => {
    if (!recipient || !quote || quoteError) return;
    try {
      await launchTransfer({
        recipientUserId: recipient.userId,
        recipientTargetX: recipient.targetX,
        recipientTargetY: recipient.targetY,
        walletAmount,
        items: selectedItems,
      }).unwrap();
      Alert.alert('Transfer launched', `Transfer run sent to ${recipient.username}. Fee is non-refundable.`);
      setSelectedByKey({});
      setCashInput('');
      setQuoteError(null);
      setTab('active');
      await Promise.all([refetchBalance(), refetchInventory(), refetchRuns()]);
    } catch (error: unknown) {
      const message = (error as { data?: { error?: string } })?.data?.error;
      Alert.alert('Transfer failed', message ? String(message) : 'Unable to launch transfer');
    }
  };

  const onCancelRun = async (transferRunId: string) => {
    try {
      await cancelTransfer({ transferRunId }).unwrap();
      Alert.alert('Transfer cancelled', 'Payload refunded minus non-refundable fee.');
      await Promise.all([refetchBalance(), refetchInventory(), refetchRuns()]);
    } catch (error: unknown) {
      const message = (error as { data?: { error?: string } })?.data?.error;
      Alert.alert('Cancel failed', message ? String(message) : 'Unable to cancel transfer');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['landscape-left', 'landscape-right']}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView style={styles.safe}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Transfer Run</Text>
                <Text style={styles.subTitle}>
                  {recipient ? `To ${recipient.username} @ (${recipient.targetX}, ${recipient.targetY})` : 'Select a teammate from map'}
                </Text>
              </View>
              <Text style={styles.balanceTag}>Wallet ${headerBalance.toLocaleString()}</Text>
            </View>

            <View style={styles.tabs}>
              {(['items', 'cash', 'active'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'items' ? 'Items' : t === 'cash' ? 'Send Cash' : 'Active Runs'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {tab === 'items' && rows.map((row) => {
                const qty = Math.max(0, Math.floor(selectedByKey[row.itemKey] ?? 0));
                const owned = Math.max(0, Math.floor(Number(row.quantity ?? 0)));
                return (
                  <View key={row.itemKey} style={styles.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{row.label}</Text>
                      <Text style={styles.rowMeta}>Owned: {owned}</Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => onChangeItemQty(row.itemKey, qty - 1, owned)}><Text style={styles.stepText}>-</Text></TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => onChangeItemQty(row.itemKey, qty + 1, owned)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {tab === 'cash' && (
                <View style={styles.cashCard}>
                  <Text style={styles.inputLabel}>Cash Amount To Send</Text>
                  <TextInput value={cashInput} onChangeText={(v) => setCashInput(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="10000" placeholderTextColor={colors.text.secondary} style={styles.input} />
                  <Text style={styles.helper}>Minimum send amount is $10,000. Fee is charged on top.</Text>
                </View>
              )}

              {tab === 'active' && ((myRunsData?.runs?.length ?? 0) === 0 ? (
                <View style={styles.empty}><Text style={styles.helper}>{runsLoading ? 'Loading active runs...' : 'No active transfer runs.'}</Text></View>
              ) : (
                myRunsData?.runs?.map((run) => {
                  const eta = Math.max(0, Math.ceil((Date.parse(run.arriveAt) - Date.now()) / 1000));
                  return (
                    <View key={run.transferRunId} style={styles.rowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>${Math.floor(run.totalTransferValue).toLocaleString()} transfer</Text>
                        <Text style={styles.rowMeta}>Fee: ${Math.floor(run.feeAmount).toLocaleString()} | ETA: {eta}s</Text>
                      </View>
                      <TouchableOpacity style={[styles.cancelBtn, { opacity: run.state === 'outbound' && !cancelState.isLoading ? 1 : 0.6 }]} onPress={() => onCancelRun(run.transferRunId)} disabled={run.state !== 'outbound' || cancelState.isLoading}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ))}
            </ScrollView>

            <View style={styles.summary}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>You send</Text><Text style={styles.summaryValue}>${Math.floor(quote?.totalTransferValue ?? 0).toLocaleString()}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Fee (10%)</Text><Text style={styles.summaryFee}>${Math.floor(quote?.feeAmount ?? 0).toLocaleString()}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryTotalLabel}>Total cash debit</Text><Text style={styles.summaryTotalValue}>${Math.floor(quote?.totalSenderCashDebit ?? 0).toLocaleString()}</Text></View>
              <Text style={styles.warning}>Transfer fee is non-refundable once launched.</Text>
              {quoteError ? <Text style={styles.error}>{quoteError}</Text> : null}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.ghostBtn} onPress={onClose}><Text style={styles.ghostText}>Close</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { opacity: canSend ? 1 : 0.55 }]} onPress={onSend} disabled={!canSend}>
                {launchState.isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryText}>Launch Transfer</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center', padding: SIZING.spacing.lg },
    sheet: { width: '100%', maxWidth: 860, maxHeight: '94%', borderWidth: 1, borderColor: colors.matrix, borderRadius: 14, backgroundColor: colors.background },
    safe: { flex: 1, padding: SIZING.spacing.md, gap: SIZING.spacing.sm },
    head: { flexDirection: 'row', alignItems: 'center', gap: SIZING.spacing.sm },
    title: { color: colors.matrix, fontSize: FONT.lg, fontWeight: '700' },
    subTitle: { color: colors.text.secondary, marginTop: 2, fontSize: FONT.sm },
    balanceTag: { color: colors.background, backgroundColor: colors.matrix, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontSize: FONT.xs, fontWeight: '700' },
    tabs: { flexDirection: 'row', gap: SIZING.spacing.xs, flexWrap: 'wrap' },
    tab: { borderWidth: 1, borderColor: `${colors.matrix}80`, borderRadius: 8, paddingHorizontal: SIZING.spacing.sm, paddingVertical: 6, backgroundColor: `${colors.background}D4` },
    tabActive: { borderColor: colors.matrix, backgroundColor: `${colors.matrix}2A` },
    tabText: { color: colors.text.secondary, fontSize: FONT.sm, fontWeight: '600' },
    tabTextActive: { color: colors.matrix, fontWeight: '700' },
    body: { borderWidth: 1, borderColor: `${colors.matrix}44`, borderRadius: 10, maxHeight: 320 },
    bodyContent: { padding: SIZING.spacing.sm, gap: SIZING.spacing.xs },
    rowCard: { borderWidth: 1, borderColor: `${colors.matrix}2A`, borderRadius: 10, padding: SIZING.spacing.sm, flexDirection: 'row', alignItems: 'center', gap: SIZING.spacing.sm },
    rowTitle: { color: colors.text.primary, fontSize: FONT.md, fontWeight: '700' },
    rowMeta: { color: colors.text.secondary, fontSize: FONT.xs, marginTop: 2 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: SIZING.spacing.xs },
    stepBtn: { width: 30, height: 30, borderWidth: 1, borderColor: colors.matrix, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    stepText: { color: colors.matrix, fontSize: FONT.md, fontWeight: '700' },
    qtyText: { minWidth: 24, textAlign: 'center', color: colors.text.primary, fontSize: FONT.md, fontWeight: '700' },
    cashCard: { borderWidth: 1, borderColor: `${colors.matrix}2A`, borderRadius: 10, padding: SIZING.spacing.sm, gap: SIZING.spacing.xs },
    inputLabel: { color: colors.text.primary, fontSize: FONT.md, fontWeight: '700' },
    input: { borderWidth: 1, borderColor: `${colors.matrix}80`, borderRadius: 8, paddingHorizontal: SIZING.spacing.sm, paddingVertical: 8, color: colors.text.primary, fontSize: FONT.md },
    helper: { color: colors.text.secondary, fontSize: FONT.xs },
    empty: { paddingVertical: SIZING.spacing.lg, alignItems: 'center' },
    cancelBtn: { borderWidth: 1, borderColor: colors.error ?? '#ff6b6b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    cancelText: { color: colors.error ?? '#ff6b6b', fontSize: FONT.xs, fontWeight: '700' },
    summary: { borderWidth: 1, borderColor: `${colors.matrix}4A`, borderRadius: 10, padding: SIZING.spacing.sm, gap: 4, backgroundColor: `${colors.surface}C8` },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { color: colors.text.secondary, fontSize: FONT.sm },
    summaryValue: { color: colors.text.primary, fontSize: FONT.sm, fontWeight: '600' },
    summaryFee: { color: colors.error ?? '#ff6b6b', fontSize: FONT.sm, fontWeight: '600' },
    summaryTotalLabel: { color: colors.matrix, fontSize: FONT.md, fontWeight: '700' },
    summaryTotalValue: { color: colors.matrix, fontSize: FONT.md, fontWeight: '700' },
    warning: { color: colors.text.secondary, fontSize: FONT.xs, marginTop: 4 },
    error: { color: colors.error ?? '#ff6b6b', fontSize: FONT.xs, marginTop: 2 },
    footer: { flexDirection: 'row', gap: SIZING.spacing.sm },
    ghostBtn: { flex: 1, borderWidth: 1, borderColor: `${colors.matrix}7A`, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    ghostText: { color: colors.matrix, fontSize: FONT.md, fontWeight: '600' },
    primaryBtn: { flex: 2, backgroundColor: colors.matrix, borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: colors.background, fontSize: FONT.md, fontWeight: '700' },
  });

