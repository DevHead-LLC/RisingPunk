import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { useAppSelector } from '../store/hooks';
import { getCurrentBalance } from '../store/slices/balanceSlice';
import { useFetchFinanceTemplatesQuery, useFetchUserFinanceTiersQuery } from '../store/api/userFinanceApi';

type Props = {
  onClose: () => void;
};

type TabKey = 'income' | 'balance' | 'cashflow';

export function FinancialStatementsScreen({ onClose }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('income');
  const { data: templatesData } = useFetchFinanceTemplatesQuery();
  const { data: userTiersData } = useFetchUserFinanceTiersQuery();
  const currentCash = useAppSelector(getCurrentBalance);

  const merged = useMemo(() => {
    const templates = templatesData?.templates || [];
    const overrides = userTiersData?.tiers || [];
    const byKey: Record<string, any> = {};
    for (const t of templates) { byKey[t.tierKey] = t; }
    for (const o of overrides) {
      const base = byKey[o.tierKey] || {};
      byKey[o.tierKey] = { ...base, ...o };
    }
    // Default pick: barista (Tier 1) if present; else first template
    return byKey['barista'] || templates[0] || null;
  }, [templatesData, userTiersData]);

  const TabButton = ({ label, tab }: { label: string; tab: TabKey }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.contentWrapper}>
        <View style={styles.sidebar}>
          <Text style={styles.title}>Financials</Text>
          <TabButton label="Income Statement" tab="income" />
          <TabButton label="Balance Sheet" tab="balance" />
          <TabButton label="Cash Flows" tab="cashflow" />
        </View>

        <View style={styles.mainPanel}>
          {activeTab === 'income' && (
            <View style={styles.placeholderBox}>
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.placeholderTitle}>Income Statement</Text>
                {merged?.tierName ? <Text style={styles.tierTitle}>{merged.tierName}</Text> : null}
                {merged ? (
                  <View style={styles.listContainer}>
                    {Object.entries(merged.incomeStatement || {}).map(([k, v]) => {
                      const num = Number(v);
                      return (
                        <View key={k} style={styles.row}><Text style={styles.keyText}>{k}</Text><Text style={styles.valText}>{num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2)}</Text></View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.placeholderSubtitle}>Loading...</Text>
                )}
              </ScrollView>
            </View>
          )}
          {activeTab === 'balance' && (
            <View style={styles.placeholderBox}>
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.placeholderTitle}>Balance Sheet</Text>
                {merged?.tierName ? <Text style={styles.tierTitle}>{merged.tierName}</Text> : null}
                {merged ? (
                  <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Assets</Text>
                    <View style={styles.row}>
                      <Text style={styles.keyText}>Cash Balance</Text>
                      <Text style={styles.valText}>{`$${Number(currentCash).toFixed(2)}`}</Text>
                    </View>
                    <Text style={[styles.sectionTitle, { marginTop: SIZING.spacing.md }]}>Liabilities</Text>
                    <View style={styles.row}>
                      <Text style={styles.keyText}>None</Text>
                      <Text style={styles.valText}>$0.00</Text>
                    </View>
                    <View style={[styles.row, { marginTop: SIZING.spacing.sm }]}>
                      <Text style={styles.keyText}>Net Worth (Cash)</Text>
                      <Text style={styles.valText}>{`$${Number(currentCash).toFixed(2)}`}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.placeholderSubtitle}>Loading...</Text>
                )}
              </ScrollView>
            </View>
          )}
          {activeTab === 'cashflow' && (
            <View style={styles.placeholderBox}>
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.placeholderTitle}>Statement of Cash Flows</Text>
                {merged?.tierName ? <Text style={styles.tierTitle}>{merged.tierName}</Text> : null}
                {merged ? (
                  <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Operating</Text>
                    {Object.entries(merged.cashFlows?.operating || {}).map(([k, v]) => {
                      const num = Number(v);
                      return (
                        <View key={k} style={styles.row}><Text style={styles.keyText}>{k}</Text><Text style={styles.valText}>{num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2)}</Text></View>
                      );
                    })}
                    <View style={[styles.row, { marginTop: SIZING.spacing.md }]}>
                      <Text style={styles.keyText}>Investing Activities</Text>
                      <Text style={styles.valText}>{(merged.cashFlows?.investing ?? 0) >= 0 ? `+${(merged.cashFlows?.investing ?? 0).toFixed(2)}` : (merged.cashFlows?.investing ?? 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.keyText}>Financing Activities</Text>
                      <Text style={styles.valText}>{(merged.cashFlows?.financing ?? 0).toFixed(2)}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.placeholderSubtitle}>Loading...</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    zIndex: 2000,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    paddingTop: SIZING.spacing.lg,
    paddingHorizontal: SIZING.spacing.md,
    gap: SIZING.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  title: {
    color: '#cfd8dc',
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  tabButton: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(71,23,246,0.15)',
    borderColor: 'rgba(71,23,246,0.5)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZING.font.body,
  },
  tabTextActive: {
    color: '#b39ddb',
    fontWeight: 'bold',
  },
  mainPanel: {
    flex: 1,
    padding: SIZING.spacing.lg,
  },
  placeholderBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: SIZING.spacing.lg,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  scrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  placeholderTitle: {
    color: '#e8eaf6',
    fontSize: SIZING.font.h2,
    marginBottom: SIZING.spacing.md,
    textAlign: 'left',
  },
  placeholderSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZING.font.small,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    gap: SIZING.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  keyText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: SIZING.font.body,
    maxWidth: '70%'
  },
  valText: {
    color: '#b39ddb',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#cfd8dc',
    fontSize: SIZING.font.large,
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
  },
  tierTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZING.font.body,
    marginTop: -8,
    marginBottom: SIZING.spacing.sm,
  },
});


