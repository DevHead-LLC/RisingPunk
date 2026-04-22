import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { truncToHundredths } from '../../utils/currencyUtils';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { IncomeRateBreakdownDto, IncomeRateLineDto } from '../../store/api/userFinanceApi';

function fmtSigned(v: number): string {
  const t = truncToHundredths(v);
  const sign = t >= 0 ? '+' : '−';
  const abs = Math.abs(t).toFixed(2);
  return `${sign}$${abs}/sec`;
}

function LineRows({
  lines,
  keyPrefix,
  valTextStyle,
  keyTextStyle,
}: {
  lines: IncomeRateLineDto[];
  keyPrefix: string;
  valTextStyle: object;
  keyTextStyle: object;
}) {
  return (
    <>
      {lines.map((line, i) => (
        <View key={`${keyPrefix}-${line.featureId}-${i}`} style={styles.row}>
          <Text style={keyTextStyle} numberOfLines={3}>
            {line.label}
          </Text>
          <Text style={valTextStyle}>{fmtSigned(line.perSecond)}</Text>
        </View>
      ))}
    </>
  );
}

type Props = {
  data: IncomeRateBreakdownDto | undefined;
  isLoading: boolean;
  hasError: boolean;
  walletRatePerSecond: number;
};

export function IncomeRateBreakdownPanel({ data, isLoading, hasError, walletRatePerSecond }: Props): React.JSX.Element {
  const { themeMode } = useTheme();
  const colors = useThemeColors();
  const keyTextStyle = [
    styles.keyText,
    { color: themeMode === 'light' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' },
  ];
  const valTextStyle = [styles.valText, { color: themeMode === 'light' ? colors.secondary : '#b39ddb' }];
  const noteStyle = [
    styles.note,
    { color: themeMode === 'light' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.65)' },
  ];
  const sectionTitle = [
    styles.sectionTitle,
    { color: themeMode === 'light' ? colors.text.primary : '#cfd8dc' },
  ];

  if (isLoading) {
    return <Text style={noteStyle}>Loading rate breakdown…</Text>;
  }
  if (hasError || !data) {
    return <Text style={noteStyle}>Could not load income breakdown. Pull to refresh or reopen Financials.</Text>;
  }

  const ratesMatch =
    Math.abs(truncToHundredths(walletRatePerSecond) - truncToHundredths(data.totalEffectiveRatePerSecond)) < 0.005;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: themeMode === 'light' ? colors.text.primary : '#e8eaf6' }]}>
        Rate breakdown ($/sec)
      </Text>
      <Text style={noteStyle}>{data.notes.jobRate}</Text>
      <Text style={[noteStyle, { marginTop: 6 }]}>{data.notes.passive}</Text>

      <Text style={[sectionTitle, { marginTop: SIZING.spacing.md }]}>Job income (active rate)</Text>
      <View style={styles.row}>
        <Text style={keyTextStyle}>Base job rate</Text>
        <Text style={valTextStyle}>{fmtSigned(data.jobBasePerSecond)}</Text>
      </View>
      {data.incomeResearch.lines.length > 0 ? (
        <LineRows lines={data.incomeResearch.lines} keyPrefix="inc" valTextStyle={valTextStyle} keyTextStyle={keyTextStyle} />
      ) : null}
      <View style={styles.row}>
        <Text style={keyTextStyle}>Subtotal — income research</Text>
        <Text style={valTextStyle}>{fmtSigned(data.incomeResearch.totalPerSecond)}</Text>
      </View>

      <Text style={[sectionTitle, { marginTop: SIZING.spacing.sm }]}>Expense offsets (add to cash-flow rate)</Text>
      <Text style={noteStyle}>
        Same values as insurance / tax / rent / utilities / misc reductions on the Income Statement; they increase your net
        cash-flow rate.
      </Text>

      {[
        { title: 'Insurance', block: data.insuranceOffset },
        { title: 'Tax', block: data.taxOffset },
        { title: 'Rent / mortgage', block: data.rentMortgageOffset },
        { title: 'Utilities', block: data.utilitiesOffset },
        { title: 'Misc / entertainment', block: data.miscEntertainmentOffset },
      ].map(({ title, block }) => (
        <View key={title}>
          {block.lines.length > 0 ? (
            <>
              <Text style={[styles.subheading, { color: themeMode === 'light' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.75)' }]}>
                {title}
              </Text>
              <LineRows lines={block.lines} keyPrefix={title} valTextStyle={valTextStyle} keyTextStyle={keyTextStyle} />
              <View style={styles.row}>
                <Text style={keyTextStyle}>{title} total</Text>
                <Text style={valTextStyle}>{fmtSigned(block.totalPerSecond)}</Text>
              </View>
            </>
          ) : null}
        </View>
      ))}

      <View style={[styles.row, styles.highlightRow]}>
        <Text style={[keyTextStyle, { fontWeight: '600' }]}>Job subtotal (before passive)</Text>
        <Text style={[valTextStyle, { fontSize: SIZING.font.large }]}>{fmtSigned(data.jobSubtotalPerSecond)}</Text>
      </View>

      <Text style={[sectionTitle, { marginTop: SIZING.spacing.md }]}>Passive — investment properties</Text>
      <View style={styles.row}>
        <Text style={keyTextStyle}>Base from levels & remodels (no rental-profit research)</Text>
        <Text style={valTextStyle}>{fmtSigned(data.passive.baseFromPropertiesPerSecond)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={keyTextStyle}>Rental-profit research (per room, applied to each room)</Text>
        <Text style={valTextStyle}>{fmtSigned(data.passive.rentalResearchPerRoom)}</Text>
      </View>
      {data.passive.rentalResearchLines.length > 0 ? (
        <LineRows
          lines={data.passive.rentalResearchLines}
          keyPrefix="rp"
          valTextStyle={valTextStyle}
          keyTextStyle={keyTextStyle}
        />
      ) : null}
      <View style={styles.row}>
        <Text style={keyTextStyle}>Passive income total</Text>
        <Text style={valTextStyle}>{fmtSigned(data.passive.passiveIncomeTotalPerSecond)}</Text>
      </View>

      <Text style={[styles.subheading, { marginTop: SIZING.spacing.sm, color: themeMode === 'light' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.75)' }]}>
        By property
      </Text>
      {data.passive.properties.map((p) =>
        p.isUnlocked ? (
          <View key={p.propertyId} style={styles.propertyBlock}>
            <View style={styles.row}>
              <Text style={keyTextStyle}>
                Property {p.propertyId} (Lv.{p.propertyLevel})
              </Text>
              <Text style={valTextStyle}>{fmtSigned(p.totalPerSecond)}</Text>
            </View>
            <View style={styles.rowSub}>
              <Text style={[keyTextStyle, styles.subLine]}>Remodels/config (base)</Text>
              <Text style={[valTextStyle, styles.subLine]}>{fmtSigned(p.basePerSecond)}</Text>
            </View>
            <View style={styles.rowSub}>
              <Text style={[keyTextStyle, styles.subLine]}>Rental-profit research</Text>
              <Text style={[valTextStyle, styles.subLine]}>{fmtSigned(p.researchPerSecond)}</Text>
            </View>
          </View>
        ) : null,
      )}

      <Text style={[sectionTitle, { marginTop: SIZING.spacing.md }]}>Crew benefits</Text>
      <View style={styles.row}>
        <Text style={keyTextStyle}>
          Crew level income{data.crew.crewLevel != null ? ` (level ${data.crew.crewLevel})` : ''}
        </Text>
        <Text style={valTextStyle}>{fmtSigned(data.crew.crewBenefitsIncomePerSecond)}</Text>
      </View>

      <View style={[styles.row, styles.highlightRow, { marginTop: SIZING.spacing.md }]}>
        <Text style={[keyTextStyle, { fontWeight: '700' }]}>Total effective rate</Text>
        <Text style={[valTextStyle, { fontSize: SIZING.font.h2, color: colors.matrix }]}>
          {fmtSigned(data.totalEffectiveRatePerSecond)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={keyTextStyle}>Wallet rate (balance)</Text>
        <Text style={valTextStyle}>{fmtSigned(walletRatePerSecond)}</Text>
      </View>
      <Text style={noteStyle}>
        {ratesMatch
          ? 'Matches your current wallet rate.'
          : 'Differs slightly from wallet until the next balance sync; both use the same server formula.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  title: {
    fontSize: SIZING.font.h2,
    marginBottom: SIZING.spacing.sm,
  },
  note: {
    fontSize: SIZING.font.small,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: SIZING.font.large,
    marginTop: SIZING.spacing.xs,
    marginBottom: SIZING.spacing.xs,
  },
  subheading: {
    fontSize: SIZING.font.body,
    marginTop: SIZING.spacing.xs,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  highlightRow: {
    borderBottomWidth: 0,
    paddingTop: SIZING.spacing.sm,
  },
  keyText: {
    fontSize: SIZING.font.body,
    flex: 1,
  },
  valText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    maxWidth: '48%',
    textAlign: 'right',
  },
  propertyBlock: {
    marginBottom: 4,
  },
  rowSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingVertical: 2,
  },
  subLine: {
    fontSize: SIZING.font.small,
    opacity: 0.9,
  },
});
