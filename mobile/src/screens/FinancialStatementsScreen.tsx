import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { useAppSelector } from '../store/hooks';
import { getCurrentBalance } from '../store/slices/balanceSlice';
import { useFetchFinanceTemplatesQuery, useFetchUserFinanceTiersQuery } from '../store/api/userFinanceApi';
import { useGetRentalHousingIncomeQuery } from '../store/api/rentalHousingApi';
import { useFetchBalanceQuery } from '../store/api/balanceApi';
import { useGetUserFeaturesQuery, useGetExpenseModifiersQuery } from '../store/api/researchFeaturesApi';
import { useTrackFinancialStatementViewMutation } from '../store/api/userGuideApi';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { truncToHundredths } from '../utils/currencyUtils';

type Props = {
  onClose: () => void;
};

type TabKey = 'income' | 'balance' | 'cashflow';

/**
 * Cumulative build cost by property level (0–5). Source of truth: server/src/config/rentalPropertyConfig.ts
 * PROPERTY_BUILD_LEVELS — cumulative = sum of cost for levels 1..level. When server config changes, update here
 * and in any docs that reference this (see taskItems/ios/turf/rental-property-level-remodel-system.md § Client–server config sync).
 */
const CUMULATIVE_PROPERTY_BUILD_VALUE_BY_LEVEL: number[] = [0, 10000, 40000, 90000, 165000, 265000];

function getPropertyCumulativeValue(level: number): number {
  return CUMULATIVE_PROPERTY_BUILD_VALUE_BY_LEVEL[Math.min(5, Math.max(0, level))] ?? 100000;
}

export function FinancialStatementsScreen({ onClose }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('income');
  const [trackFinancialStatementView] = useTrackFinancialStatementViewMutation();

  // Mark "View financial statement" guided task when user reaches this screen (opened via wallet/balance tap)
  useEffect(() => {
    void trackFinancialStatementView();
  }, [trackFinancialStatementView]);

  const { data: templatesData } = useFetchFinanceTemplatesQuery();
  const { data: userTiersData } = useFetchUserFinanceTiersQuery();
  const { data: rentalHousingData, error: rentalHousingError, isLoading: rentalHousingLoading } = useGetRentalHousingIncomeQuery();
  const { data: balanceData } = useFetchBalanceQuery(undefined, { refetchOnFocus: true });
  const { data: expenseModifiers } = useGetExpenseModifiersQuery(undefined, { refetchOnFocus: true });
  const { data: cashFlowFeatures } = useGetUserFeaturesQuery('cash-flow');
  const currentCash = useAppSelector(getCurrentBalance);
  const ratePerSecondFromState = useAppSelector(state => state.balance.ratePerSecond);
  // Use balanceData from query if available (fresh data), otherwise fall back to Redux state
  const ratePerSecond = balanceData?.ratePerSecond ?? ratePerSecondFromState;
  // Expense reductions: prefer expense-modifiers API, then balance, then server value from cash-flow user-features (Bugbot: legacy insurance $0.02 not $0.03), then naive feature sum.
  const insuranceReductionTotal = useMemo(() => {
    if (typeof expenseModifiers?.insuranceReduction === 'number') return expenseModifiers.insuranceReduction;
    if (typeof balanceData?.insuranceReduction === 'number') return balanceData.insuranceReduction;
    if (typeof cashFlowFeatures?.insuranceReduction === 'number') return cashFlowFeatures.insuranceReduction;
    const features = cashFlowFeatures?.features;
    if (!features?.length) return 0;
    let total = 0;
    if (features.some((f: any) => f.id === 'reduce-insurance-01' && f.isUnlocked)) total += 0.01;
    if (features.some((f: any) => f.id === 'reduce-insurance-02' && f.isUnlocked)) total += 0.02;
    return total;
  }, [expenseModifiers?.insuranceReduction, balanceData?.insuranceReduction, cashFlowFeatures]);
  const taxReductionTotal = useMemo(() => {
    if (typeof expenseModifiers?.taxReduction === 'number') return expenseModifiers.taxReduction;
    if (typeof balanceData?.taxReduction === 'number') return balanceData.taxReduction;
    if (typeof cashFlowFeatures?.taxReduction === 'number') return cashFlowFeatures.taxReduction;
    const features = cashFlowFeatures?.features;
    if (!features?.length) return 0;
    // Server maps legacy financial/reduce-expenses onto cash-flow reduce-tax-expense-02 (Bugbot: reduce-expenses is financial, not in cashFlowFeatures).
    if (features.some((f: any) => f.id === 'reduce-tax-expense-02' && f.isUnlocked)) return 0.02;
    return 0;
  }, [expenseModifiers?.taxReduction, balanceData?.taxReduction, cashFlowFeatures]);
  const { themeMode } = useTheme();
  const colors = useThemeColors();
  
  // Calculate base income rate (ratePerSecond minus rental income)
  const baseIncomeRate = useMemo(() => {
    const rentalIncomeRate = rentalHousingData?.totalIncomePerSecond || 0;
    return Math.max(0, ratePerSecond - rentalIncomeRate);
  }, [ratePerSecond, rentalHousingData?.totalIncomePerSecond]);
  
  // Calculate income rate bonus (amount above base $1.00/sec) — includes both income-rate and insurance-reduction bonuses
  const incomeRateBonus = useMemo(() => {
    return Math.max(0, baseIncomeRate - 1.0);
  }, [baseIncomeRate]);

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
  
  // Calculate financial statement values (shared between Income Statement and Cash Flows)
  const financialCalculations = useMemo(() => {
    if (!merged) return null;
    
    // Insurance: base $0.50/sec; subtract unlocked reduction research (reduce-insurance-01 = $0.01, reduce-insurance-02 = $0.02)
    const baseIncomeStatement = merged.incomeStatement || {};
    const effectiveIncomeStatement = { ...baseIncomeStatement };
    const hasInsuranceInTemplate = 'Insurance' in baseIncomeStatement;
    if (hasInsuranceInTemplate) {
      const insuranceBase = baseIncomeStatement['Insurance'] ?? -0.50;
      effectiveIncomeStatement['Insurance'] = insuranceBase + insuranceReductionTotal;
    }
    // Tax reduction applied once to the first expense line containing "tax" (below). hasTaxInTemplate uses same /tax/ check so gross-income deduction matches.
    const hasTaxInTemplate = Object.keys(baseIncomeStatement).some(
      k => /tax/.test(String(k).trim().toLowerCase())
    );

    const incomeStatementEntries = Object.entries(effectiveIncomeStatement);
    
    // Gross Income: subtract insurance and tax reduction from display when template has those lines,
    // so we don't double-count (savings shown as reduced expense). If template lacks them, show full incomeRateBonus.
    let effectiveIncomeRateBonus = incomeRateBonus;
    if (hasInsuranceInTemplate && insuranceReductionTotal > 0) {
      effectiveIncomeRateBonus = Math.max(0, effectiveIncomeRateBonus - insuranceReductionTotal);
    }
    if (hasTaxInTemplate && taxReductionTotal > 0) {
      effectiveIncomeRateBonus = Math.max(0, effectiveIncomeRateBonus - taxReductionTotal);
    }
    const baseGrossIncome = 12.00;
    const grossIncome = baseGrossIncome + effectiveIncomeRateBonus;
    
    // Calculate expenses (negative values only, excluding totals)
    const rawExpenseEntries = incomeStatementEntries.filter(([k, v]) => {
      const num = Number(v);
      const keyLower = k.toLowerCase().trim();
      if (k === 'Gross Income' || k === 'Gross income' || k === 'gross income' ||
          keyLower.includes('net income') || keyLower.includes('net cashflow') ||
          keyLower === 'total expenses' || keyLower.includes('total expense') ||
          keyLower === 'total' || keyLower.includes('calculated')) {
        return false;
      }
      return num < 0;
    });
    // Apply tax reduction to the first expense line whose label contains "tax" only (so gross-income offset matches; Bugbot: avoid N× reduction with 1× offset when multiple "tax" lines exist).
    let taxReductionApplied = false;
    const expenseEntries = rawExpenseEntries.map(([k, v]) => {
      const num = Number(v);
      if (num < 0 && /tax/.test(String(k).trim().toLowerCase()) && !taxReductionApplied) {
        taxReductionApplied = true;
        return [k, num + taxReductionTotal] as [string, number];
      }
      return [k, v] as [string, number];
    });
    
    const totalExpenses = expenseEntries.reduce((sum, [, v]) => {
      const num = Number(v);
      if (num < 0) {
        return sum + Math.abs(num);
      }
      return sum;
    }, 0);
    
    // Calculate Net Income: Gross Income - Total Expenses
    const netIncome = grossIncome - totalExpenses;
    
    // Calculate Net Cash Flow: Net Income + Passive Income
    const passiveIncome = rentalHousingData?.totalIncomePerSecond || 0;
    const netCashFlow = netIncome + passiveIncome;
    
    return {
      grossIncome,
      expenseEntries,
      totalExpenses,
      netIncome,
      passiveIncome,
      netCashFlow
    };
  }, [merged, incomeRateBonus, insuranceReductionTotal, taxReductionTotal, rentalHousingData?.totalIncomePerSecond]);

  const getStyles = () => ({
    container: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      zIndex: 2000,
    },
    contentWrapper: {
      flex: 1,
      flexDirection: 'row' as const,
    },
    sidebar: {
      width: 220,
      borderRightWidth: 1,
      borderRightColor: themeMode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
      paddingTop: SIZING.spacing.lg,
      paddingHorizontal: SIZING.spacing.md,
      gap: SIZING.spacing.sm,
      backgroundColor: themeMode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)',
    },
    title: {
      color: themeMode === 'light' ? colors.text.primary : '#cfd8dc',
      fontSize: SIZING.font.large,
      fontWeight: 'bold' as const,
      marginBottom: SIZING.spacing.sm,
    },
    tabButton: {
      paddingVertical: SIZING.spacing.sm,
      paddingHorizontal: SIZING.spacing.sm,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: themeMode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
      backgroundColor: themeMode === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.02)',
    },
    tabButtonActive: {
      backgroundColor: themeMode === 'light' ? 'rgba(71,23,246,0.1)' : 'rgba(71,23,246,0.15)',
      borderColor: themeMode === 'light' ? 'rgba(71,23,246,0.3)' : 'rgba(71,23,246,0.5)',
    },
    tabText: {
      color: themeMode === 'light' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
      fontSize: SIZING.font.body,
    },
    tabTextActive: {
      color: themeMode === 'light' ? colors.secondary : '#b39ddb',
      fontWeight: 'bold' as const,
    },
    mainPanel: {
      flex: 1,
      padding: SIZING.spacing.lg,
    },
    placeholderBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: themeMode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)',
      borderRadius: 8,
      backgroundColor: themeMode === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)',
      padding: SIZING.spacing.lg,
      justifyContent: 'flex-start' as const,
      alignItems: 'stretch' as const,
    },
    scrollContent: {
      paddingBottom: SIZING.spacing.lg,
    },
    placeholderTitle: {
      color: themeMode === 'light' ? colors.text.primary : '#e8eaf6',
      fontSize: SIZING.font.h2,
      marginBottom: SIZING.spacing.md,
      textAlign: 'left' as const,
    },
    placeholderSubtitle: {
      color: themeMode === 'light' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
      fontSize: SIZING.font.small,
      textAlign: 'center' as const,
      lineHeight: 18,
    },
    listContainer: {
      gap: SIZING.spacing.xs,
    },
    row: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: themeMode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
    },
    keyText: {
      color: themeMode === 'light' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
      fontSize: SIZING.font.body,
      flex: 0.7
    },
    valText: {
      color: themeMode === 'light' ? colors.secondary : '#b39ddb',
      fontSize: SIZING.font.body,
      fontWeight: 'bold' as const,
    },
    sectionTitle: {
      color: themeMode === 'light' ? colors.text.primary : '#cfd8dc',
      fontSize: SIZING.font.large,
      marginTop: SIZING.spacing.sm,
      marginBottom: SIZING.spacing.xs,
    },
    tierTitle: {
      color: themeMode === 'light' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
      fontSize: SIZING.font.body,
      marginTop: -8,
      marginBottom: SIZING.spacing.sm,
    },
  });

  const styles = getStyles();

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
                {merged && financialCalculations ? (
                  <View style={styles.listContainer}>
                    {(() => {
                      const { grossIncome, expenseEntries, totalExpenses, netIncome, passiveIncome, netCashFlow } = financialCalculations;
                      
                      return (
                        <>
                          {/* Section 1: Gross Income (display floored to hundredths) */}
                          <Text style={styles.sectionTitle}>Gross Income</Text>
                          <View style={styles.row}>
                            <Text style={styles.keyText}>Gross Income</Text>
                            <Text style={styles.valText}>+${truncToHundredths(grossIncome).toFixed(2)}</Text>
                          </View>
                          
                          {/* Section 2: Expenses */}
                          <Text style={[styles.sectionTitle, { marginTop: SIZING.spacing.md }]}>Expenses</Text>
                          {expenseEntries.map(([k, v]) => {
                            const num = truncToHundredths(Number(v));
                            const cleanLabel = k.replace(/\s*\([^)]*%[^)]*\)/g, '').trim();
                            const formattedValue = num < 0 ? `-$${Math.abs(num).toFixed(2)}` : `$${num.toFixed(2)}`;
                            return (
                              <View key={k} style={styles.row}>
                                <Text style={styles.keyText}>{cleanLabel}</Text>
                                <Text style={styles.valText}>{formattedValue}</Text>
                              </View>
                            );
                          })}
                          <View style={styles.row}>
                            <Text style={styles.keyText}>Total Expenses</Text>
                            <Text style={styles.valText}>-${truncToHundredths(totalExpenses).toFixed(2)}</Text>
                          </View>
                          
                          {/* Section 3: Net Income Calculation */}
                          <Text style={[styles.sectionTitle, { marginTop: SIZING.spacing.md }]}>Net Income</Text>
                          <View style={styles.row}>
                            <Text style={styles.keyText}>Gross Income</Text>
                            <Text style={styles.valText}>+${truncToHundredths(grossIncome).toFixed(2)}</Text>
                          </View>
                          <View style={styles.row}>
                            <Text style={styles.keyText}>Less: Total Expenses</Text>
                            <Text style={styles.valText}>-${truncToHundredths(totalExpenses).toFixed(2)}</Text>
                          </View>
                          <View style={[styles.row, { marginTop: SIZING.spacing.xs }]}>
                            <Text style={styles.keyText}>Net Income</Text>
                            <Text style={styles.valText}>{truncToHundredths(netIncome) >= 0 ? `+$${truncToHundredths(netIncome).toFixed(2)}` : `-$${Math.abs(truncToHundredths(netIncome)).toFixed(2)}`}</Text>
                          </View>
                          
                          {/* Section 4: Net Cash Flow (passive income & net cash flow floored to hundredths) */}
                          <Text style={[styles.sectionTitle, { marginTop: SIZING.spacing.md }]}>Net Cash Flow</Text>
                          {rentalHousingLoading && (
                            <View style={styles.row}>
                              <Text style={styles.keyText}>Loading rental data...</Text>
                              <Text style={styles.valText}>...</Text>
                            </View>
                          )}
                          {rentalHousingError && (
                            <View style={styles.row}>
                              <Text style={styles.keyText}>Rental data error</Text>
                              <Text style={styles.valText}>Error</Text>
                            </View>
                          )}
                          {rentalHousingData && (
                            <View style={styles.row}>
                              <Text style={styles.keyText}>Investment Properties (Passive Income)</Text>
                              <Text style={styles.valText}>+${truncToHundredths(rentalHousingData.totalIncomePerSecond).toFixed(2)}</Text>
                            </View>
                          )}
                          <View style={styles.row}>
                            <Text style={styles.keyText}>Net Income</Text>
                            <Text style={styles.valText}>{truncToHundredths(netIncome) >= 0 ? `+$${truncToHundredths(netIncome).toFixed(2)}` : `-$${Math.abs(truncToHundredths(netIncome)).toFixed(2)}`}</Text>
                          </View>
                          <View style={[styles.row, { marginTop: SIZING.spacing.xs }]}>
                            <Text style={styles.keyText}>Net Cash Flow</Text>
                            <Text style={styles.valText}>{truncToHundredths(netCashFlow) >= 0 ? `+$${truncToHundredths(netCashFlow).toFixed(2)}` : `-$${Math.abs(truncToHundredths(netCashFlow)).toFixed(2)}`}</Text>
                          </View>
                        </>
                      );
                    })()}
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
                      <Text style={styles.valText}>{`$${Math.round(Number(currentCash)).toLocaleString()}`}</Text>
                    </View>
                    {rentalHousingLoading && (
                      <View style={styles.row}>
                        <Text style={styles.keyText}>Loading property data...</Text>
                        <Text style={styles.valText}>...</Text>
                      </View>
                    )}
                    {rentalHousingError && (
                      <View style={styles.row}>
                        <Text style={styles.keyText}>Property data error</Text>
                        <Text style={styles.valText}>Error</Text>
                      </View>
                    )}
                    {rentalHousingData && rentalHousingData.propertyBreakdown
                      .filter(p => p.isUnlocked)
                      .map((property) => {
                        const level = property.propertyLevel ?? 1;
                        const cumulativeValue = getPropertyCumulativeValue(level);
                        return (
                          <View key={property.propertyId} style={styles.row}>
                            <Text style={styles.keyText}>Investment Property {property.propertyId} (Lv.{level})</Text>
                            <Text style={styles.valText}>${cumulativeValue.toLocaleString()}</Text>
                          </View>
                        );
                      })}
                    <Text style={[styles.sectionTitle, { marginTop: SIZING.spacing.md }]}>Liabilities</Text>
                    <View style={styles.row}>
                      <Text style={styles.keyText}>None</Text>
                      <Text style={styles.valText}>$0</Text>
                    </View>
                    <View style={[styles.row, { marginTop: SIZING.spacing.sm }]}>
                      <Text style={styles.keyText}>Net Worth</Text>
                      <Text style={styles.valText}>
                        {`$${Math.round(Number(currentCash) + (rentalHousingData ? rentalHousingData.propertyBreakdown.filter(p => p.isUnlocked).reduce((sum, p) => sum + getPropertyCumulativeValue(p.propertyLevel ?? 1), 0) : 0)).toLocaleString()}`}
                      </Text>
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
                {merged && financialCalculations ? (
                  <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Operating</Text>
                    {(() => {
                      const { grossIncome, totalExpenses, netIncome } = financialCalculations;
                      const g = truncToHundredths(grossIncome);
                      const te = truncToHundredths(totalExpenses);
                      const ni = truncToHundredths(netIncome);
                      return (
                        <>
                          {/* 1. Job Income (matches Gross Income from Income Statement) */}
                          <View style={styles.row}>
                            <Text style={styles.keyText}>Job Income</Text>
                            <Text style={styles.valText}>+${g.toFixed(2)}</Text>
                          </View>
                          
                          {/* 2. Total Expenses (brief summary, matches Income Statement total) */}
                          <View style={styles.row}>
                            <Text style={styles.keyText}>Total Expenses</Text>
                            <Text style={styles.valText}>-${te.toFixed(2)}</Text>
                          </View>
                          
                          {/* 3. Net from Operations (matches Net Income from Income Statement) */}
                          <View style={[styles.row, { marginTop: SIZING.spacing.sm }]}>
                            <Text style={styles.keyText}>Net from Operations</Text>
                            <Text style={styles.valText}>{ni >= 0 ? `+$${ni.toFixed(2)}` : `-$${Math.abs(ni).toFixed(2)}`}</Text>
                          </View>
                        </>
                      );
                    })()}
                    
                    {/* 4. Investment Properties (Passive Income) - floored to hundredths for display */}
                    {rentalHousingLoading && (
                      <View style={styles.row}>
                        <Text style={styles.keyText}>Loading rental data...</Text>
                        <Text style={styles.valText}>...</Text>
                      </View>
                    )}
                    {rentalHousingError && (
                      <View style={styles.row}>
                        <Text style={styles.keyText}>Rental data error</Text>
                        <Text style={styles.valText}>Error</Text>
                      </View>
                    )}
                    {rentalHousingData && (
                      <View style={styles.row}>
                        <Text style={styles.keyText}>Investment Properties (Passive Income)</Text>
                        <Text style={styles.valText}>+${truncToHundredths(rentalHousingData.totalIncomePerSecond).toFixed(2)}</Text>
                      </View>
                    )}
                    
                    {/* 5. Total Cash Flow Rate (floored to hundredths for display) */}
                    <View style={[styles.row, { marginTop: SIZING.spacing.md }]}>
                      <Text style={styles.keyText}>Total Cash Flow Rate</Text>
                      <Text style={[styles.valText, { color: colors.matrix }]}>
                        {truncToHundredths(ratePerSecond) >= 0 ? `+$${truncToHundredths(ratePerSecond).toFixed(2)}` : `-$${Math.abs(truncToHundredths(ratePerSecond)).toFixed(2)}`}/sec
                      </Text>
                    </View>
                    <View style={[styles.row, { marginTop: SIZING.spacing.md }]}>
                      <Text style={styles.keyText}>Investing Activities</Text>
                      <Text style={styles.valText}>{(() => { const v = truncToHundredths(merged.cashFlows?.investing ?? 0); return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2); })()}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.keyText}>Financing Activities</Text>
                      <Text style={styles.valText}>{truncToHundredths(merged.cashFlows?.financing ?? 0).toFixed(2)}</Text>
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
    backgroundColor: '#0E0B16',
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


