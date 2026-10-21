import React, { useEffect, useMemo, useState } from 'react';
import { createThemeColors, createThemedStyles, isDarkMode } from '../theme';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { getExpenses } from '../api/expenseApi';
import { formatCurrency } from '../constants/currency';

const COLORS = createThemeColors({
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983',
  border: '#EDF0EE', red: '#E65B64', redLight: '#FCECEE',
  orange: '#F2A541', blue: '#5479E8', purple: '#9670DC',
});

const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

function MetricCard({ label, amount, color, background, icon, currency }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: background }]}><Text style={[styles.metricIconText, { color }]}>{icon}</Text></View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricAmount, { color }]} numberOfLines={1}>{formatCurrency(Math.abs(amount), currency)}</Text>
    </View>
  );
}

export default function ReportsScreen({ onBack, onTransactions, currency = 'PKR' }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getExpenses();
      if (!Array.isArray(result)) throw new Error('Unexpected transaction data received');
      setRecords(result);
    } catch (loadError) {
      setError(loadError.message || 'Could not load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchRecords = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getExpenses();
        if (!active) return;
        if (!Array.isArray(result)) throw new Error('Unexpected transaction data received');
        setRecords(result);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'Could not load report data.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchRecords();

    return () => {
      active = false;
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const monthlyRecords = useMemo(() => records.filter((item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }), [records, now]);
  const income = monthlyRecords.filter((item) => item.type === 'income').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const expenses = monthlyRecords.filter((item) => item.type !== 'income').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const net = income - expenses;
  const categoryTotals = monthlyRecords.filter((item) => item.type !== 'income').reduce((totals, item) => {
    const category = item.category || 'General';
    totals[category] = (totals[category] || 0) + (Number(item.amount) || 0);
    return totals;
  }, {});
  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(...categories.map(([, amount]) => amount), 1);
  const categoryColors = [COLORS.orange, COLORS.blue, COLORS.purple, COLORS.primary];

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode() ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to previous screen" hitSlop={8} style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>YOUR MONEY</Text>
            <Text style={styles.heading}>Reports</Text>
          </View>
          <Pressable onPress={loadRecords} accessibilityRole="button" accessibilityLabel="Refresh reports" style={styles.refreshButton}><Text style={styles.refreshText}>↻</Text></Pressable>
        </View>

        <View style={styles.monthCard}>
          <Text style={styles.monthLabel}>Monthly overview</Text>
          <Text style={styles.monthValue}>{monthLabel(now)}</Text>
        </View>

        {loading ? (
          <View style={styles.stateCard}><ActivityIndicator color={COLORS.primary} /><Text style={styles.stateText}>Loading report data…</Text></View>
        ) : error ? (
          <View style={styles.stateCard}><Text style={styles.error}>{error}</Text><Pressable onPress={loadRecords} accessibilityRole="button"><Text style={styles.retry}>Tap to retry</Text></Pressable></View>
        ) : (
          <>
            <View style={styles.metricsRow}>
              <MetricCard label="Income" amount={income} color={COLORS.primary} background={COLORS.primaryLight} icon="↑" currency={currency} />
              <MetricCard label="Expenses" amount={expenses} color={COLORS.red} background={COLORS.redLight} icon="↓" currency={currency} />
            </View>
            <View style={styles.netCard}>
              <View style={styles.netCopy}><Text style={styles.netLabel}>Net change this month</Text><Text style={styles.netHint}>Income minus expenses</Text></View>
              <Text style={[styles.netAmount, { color: net < 0 ? COLORS.red : COLORS.primary }]} numberOfLines={1}>{net < 0 ? '-' : '+'}{formatCurrency(Math.abs(net), currency)}</Text>
            </View>

            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Spending by category</Text><Text style={styles.sectionSubtitle}>This month’s expenses</Text></View>
            </View>
            <View style={styles.categoryCard}>
              {categories.length ? categories.map(([name, amount], index) => (
                <View key={name} style={styles.categoryRow}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColors[index % categoryColors.length] }]} />
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryHeading}><Text style={styles.categoryName} numberOfLines={1}>{name}</Text><Text style={styles.categoryAmount}>{formatCurrency(amount, currency)}</Text></View>
                    <View style={styles.track}><View style={[styles.fill, { width: `${Math.max((amount / maxCategory) * 100, 2)}%`, backgroundColor: categoryColors[index % categoryColors.length] }]} /></View>
                  </View>
                </View>
              )) : <Text style={styles.emptyText}>{monthlyRecords.length ? 'No expenses recorded this month.' : 'Add transactions to see your monthly report.'}</Text>}
              <Pressable onPress={onTransactions} accessibilityRole="button" style={styles.transactionsLink}><Text style={styles.linkText}>View transactions</Text><Text style={styles.linkArrow}>›</Text></Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  backText: { color: COLORS.text, fontSize: 30, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  refreshText: { color: COLORS.primary, fontSize: 25, lineHeight: 29 },
  monthCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 20, marginBottom: 14 },
  monthLabel: { color: '#D8F5E6', fontSize: 12, marginBottom: 7 },
  monthValue: { color: COLORS.white, fontSize: 21, fontWeight: '800' },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: COLORS.border, minHeight: 130, justifyContent: 'space-between' },
  metricIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  metricIconText: { fontSize: 18, fontWeight: '800' },
  metricLabel: { color: COLORS.secondary, fontSize: 12, marginTop: 9 },
  metricAmount: { fontSize: 17, fontWeight: '800', marginTop: 8 },
  netCard: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 26 },
  netCopy: { flex: 1 },
  netLabel: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  netHint: { color: COLORS.secondary, fontSize: 10, marginTop: 5 },
  netAmount: { fontSize: 16, fontWeight: '800' },
  sectionHeader: { marginBottom: 13 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: COLORS.secondary, fontSize: 11, marginTop: 4 },
  categoryCard: { backgroundColor: COLORS.white, borderRadius: 20, paddingHorizontal: 15, paddingTop: 3, borderWidth: 1, borderColor: COLORS.border },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 14 },
  categoryDot: { width: 11, height: 11, borderRadius: 6 },
  categoryInfo: { flex: 1 },
  categoryHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 9 },
  categoryName: { color: COLORS.text, flex: 1, fontSize: 12, fontWeight: '700' },
  categoryAmount: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  track: { height: 6, backgroundColor: '#F0F2F1', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  transactionsLink: { minHeight: 48, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  linkText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  linkArrow: { color: COLORS.primary, fontSize: 20 },
  stateCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 20, minHeight: 150, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  stateText: { color: COLORS.secondary, fontSize: 12, marginTop: 12 },
  error: { color: COLORS.red, textAlign: 'center', fontSize: 13 },
  retry: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 12 },
  emptyText: { color: COLORS.secondary, fontSize: 12, textAlign: 'center', paddingVertical: 24, lineHeight: 18 },
});
