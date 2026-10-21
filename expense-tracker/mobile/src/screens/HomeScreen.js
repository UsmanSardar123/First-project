
import React, { useEffect, useState } from 'react';
import { createThemeColors, createThemedStyles } from '../theme';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { getExpenses } from '../api/expenseApi';
import { getWallets } from '../api/walletsApi';
import { formatCurrency } from '../constants/currency';

const COLORS = createThemeColors({
  background: '#F6F8FB',
  white: '#FFFFFF',
  primary: '#16A36A',
  primaryLight: '#E5F7EE',
  text: '#172B24',
  secondary: '#7C8983',
  border: '#EDF0EE',
  red: '#E65B64',
  redLight: '#FCECEE',
  amber: '#C98218',
  blue: '#5479E8',
  orange: '#F2A541',
  purple: '#9670DC',
});

const SPENDING_PERIODS = [
  { value: 'daily', label: 'Daily', icon: '🕒', subtitle: 'Expenses by time of day' },
  { value: 'weekly', label: 'Weekly', icon: '📅', subtitle: 'Last 6 weeks' },
  { value: 'monthly', label: 'Monthly', icon: '🗓️', subtitle: 'Last 6 months' },
];

const DAY_PARTS = [
  { label: '12–6a', title: 'Overnight', icon: '🌙', from: 0, to: 6 },
  { label: '6a–12p', title: 'Morning', icon: '🌅', from: 6, to: 12 },
  { label: '12–5p', title: 'Afternoon', icon: '☀️', from: 12, to: 17 },
  { label: '5–9p', title: 'Evening', icon: '🌇', from: 17, to: 21 },
  { label: '9p–12a', title: 'Late night', icon: '🌙', from: 21, to: 24 },
];

function SectionHeader({ title, action, onPress }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {action ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SummaryCard({ title, amount, icon, color, background, currency = 'PKR', compact = false }) {
  return (
    <View style={[styles.summaryCard, compact && styles.compactSummaryCard]}>
      <View style={styles.summaryTop}>
        <View
          style={[
            styles.summaryIcon,
            { backgroundColor: background },
          ]}
        >
          <Text style={styles.summaryIconText}>{icon}</Text>
        </View>

        <Text style={styles.summaryLabel}>{title}</Text>
      </View>

      <Text style={[styles.summaryAmount, compact && styles.compactSummaryAmount, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {amount == null ? 'Not tracked' : formatCurrency(amount, currency)}
      </Text>
    </View>
  );
}


function buildSpendingSeries(transactions, period, now, selectedDay) {
  const expenses = transactions.filter((item) => item.type !== 'income');
  const sumBetween = (start, end) => expenses.reduce((sum, item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.getTime()) && date >= start && date < end ? sum + (Number(item.amount) || 0) : sum;
  }, 0);

  if (period === 'daily') {
    const start = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return DAY_PARTS.map((part) => {
      const amount = expenses.reduce((sum, item) => {
        const transactionDate = new Date(item.date);
        if (Number.isNaN(transactionDate.getTime()) || transactionDate < start || transactionDate >= end) return sum;
        const recordedAt = new Date(item.createdAt || item.date);
        const hour = Number.isNaN(recordedAt.getTime()) ? transactionDate.getHours() : recordedAt.getHours();
        return hour >= part.from && hour < part.to ? sum + (Number(item.amount) || 0) : sum;
      }, 0);
      return { label: part.label, title: part.title, icon: part.icon, amount };
    });
  }

  if (period === 'weekly') {
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - (5 - index) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { label: startLabel, title: `Week of ${startLabel}`, amount: sumBetween(start, end) };
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const offset = index - 5;
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    return {
      label: start.toLocaleDateString('en-US', { month: 'short' }),
      title: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      amount: sumBetween(start, end),
    };
  });
}

function SpendingChart({ transactions, period, onPeriodChange, currency, now, selectedDay, onSelectedDayChange }) {
  const series = buildSpendingSeries(transactions, period, now, selectedDay);
  const maxAmount = Math.max(
    ...series.map((item) => item.amount),
    1
  );
  const total = series.reduce((sum, item) => sum + item.amount, 0);
  const selectedPeriod = SPENDING_PERIODS.find((item) => item.value === period);
  const isSelectedToday = selectedDay.toDateString() === now.toDateString();
  const selectedDayLabel = isSelectedToday
    ? 'Today'
    : selectedDay.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeading}>
        <View>
          <Text style={styles.cardTitle}>Expense trend</Text>
          <Text style={styles.mutedText}>{selectedPeriod.subtitle}</Text>
        </View>

        <View style={styles.chartBadge}>
          <Text style={styles.chartBadgeText}>{formatCurrency(total, currency)}</Text>
        </View>
      </View>

      <View style={styles.periodTabs} accessibilityRole="tablist">
        {SPENDING_PERIODS.map((option) => {
          const selected = option.value === period;
          return (
            <Pressable key={option.value} onPress={() => onPeriodChange(option.value)} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.periodTab, selected && styles.periodTabSelected]}>
              <Text style={[styles.periodTabIcon, selected && styles.periodTabTextSelected]}>{option.icon}</Text>
              <Text style={[styles.periodTabText, selected && styles.periodTabTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {period === 'daily' ? (
        <View style={styles.dateNavigator}>
          <Pressable onPress={() => onSelectedDayChange((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1))} accessibilityRole="button" accessibilityLabel="Previous day" hitSlop={8} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.selectedDate}>{selectedDayLabel}</Text>
          <Pressable onPress={() => onSelectedDayChange((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1))} accessibilityRole="button" accessibilityLabel="Next day" disabled={isSelectedToday} hitSlop={8} style={[styles.dateArrow, isSelectedToday && styles.dateArrowDisabled]}>
            <Text style={styles.dateArrowText}>›</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.chart}>
        {series.map((item, index) => {
          const height = Math.max(
            (item.amount / maxAmount) * 115,
            6
          );

          const isHighest = item.amount === maxAmount && item.amount > 0;

          return (
            <View key={`${item.label}-${index}`} style={styles.chartColumn}>
              <View style={styles.barArea}>
                {period === 'daily' ? <Text style={styles.timeIcon}>{item.icon}</Text> : null}
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: isHighest
                        ? COLORS.primary
                        : '#BCEBD2',
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.chartDay,
                  isHighest && styles.chartDayActive,
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.seriesBreakdown}>
        {series.map((item, index) => (
          <View key={`${item.title || item.label}-value-${index}`} style={styles.seriesRow}>
            <View style={styles.seriesNameWrap}>
              {period === 'daily' ? <Text style={styles.seriesIcon}>{item.icon}</Text> : null}
              <Text style={styles.seriesName}>{period === 'daily' ? `${item.title} · ${item.label}` : item.title || item.label}</Text>
            </View>
            <Text style={styles.seriesAmount}>{formatCurrency(item.amount, currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation, currency = 'PKR', user, darkMode = false, onDarkModeChange }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [spendingPeriod, setSpendingPeriod] = useState('weekly');
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [summaryMonth, setSummaryMonth] = useState(() => new Date());
  const [wallets, setWallets] = useState([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState(null);

  const loadExpenses = async () => {
    setRefreshing(true);
    setError('');
    try {
      const result = await getExpenses();
      if (!Array.isArray(result)) throw new Error('Unexpected expense data received');
      setExpenses(result);
      const walletResult = await getWallets();
      if (Array.isArray(walletResult)) setWallets(walletResult);
    } catch (loadError) {
      setError(loadError.message || 'Could not load expenses');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchExpenses = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getExpenses();
        if (!active) return;
        if (!Array.isArray(result)) throw new Error('Unexpected expense data received');
        setExpenses(result);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'Could not load expenses');
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchExpenses();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getWallets()
      .then((items) => {
        if (!Array.isArray(items)) throw new Error('Unexpected wallet data received');
        if (active) setWallets(items);
      })
      .catch((loadError) => { if (active) setWalletError(loadError.message || 'Could not load wallets'); })
      .finally(() => { if (active) setWalletLoading(false); });
    return () => { active = false; };
  }, []);

  const now = new Date();
  const selectedWallet = wallets.find((wallet) => wallet._id === selectedWalletId);
  const visibleExpenses = selectedWalletId
    ? expenses.filter((item) => item.walletId === selectedWalletId || (selectedWallet?.isDefault && !item.walletId))
    : expenses;
  const monthTransactions = visibleExpenses.filter((item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === summaryMonth.getMonth() && date.getFullYear() === summaryMonth.getFullYear();
  });
  const monthlyIncome = monthTransactions.reduce((sum, item) => item.type === 'income' ? sum + (Number(item.amount) || 0) : sum, 0);
  const monthlyExpenses = monthTransactions.reduce((sum, item) => item.type !== 'income' ? sum + (Number(item.amount) || 0) : sum, 0);
  const monthlyNet = monthlyIncome - monthlyExpenses;
  const monthLabel = summaryMonth.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  const isCurrentMonth = summaryMonth.getFullYear() === now.getFullYear() && summaryMonth.getMonth() === now.getMonth();
  const allWalletBalance = wallets.reduce((sum, wallet) => sum + (Number(wallet.balance) || 0), 0);
  const currentBalance = selectedWallet ? Number(selectedWallet.balance) || 0 : allWalletBalance;
  const balanceColor = currentBalance < 0 ? COLORS.red : COLORS.primary;
  const balanceStatus = selectedWallet ? `${selectedWallet.name} · ${selectedWallet.type}` : 'Across all active wallets';
  const goTo = (screen, options) => {
    navigation?.navigate?.(screen, options);
  };

  return (
    <View style={[styles.safeArea, darkMode && styles.darkBackground]}>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={darkMode ? '#111A17' : COLORS.background}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadExpenses} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.headerTitle}>My finances</Text>
          </View>

          <Pressable onPress={() => onDarkModeChange?.(!darkMode)} accessibilityRole="switch" accessibilityLabel="Dark mode" accessibilityState={{ checked: darkMode }} style={[styles.themeButton, darkMode && styles.themeButtonDark]}>
            <Text style={[styles.themeButtonText, darkMode && styles.darkText]}>{darkMode ? '☀' : '☾'}</Text>
          </Pressable>
          <Pressable
            style={styles.profileButton}
            onPress={() => goTo('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={styles.profileInitial}>{user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </Pressable>
        </View>

        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: balanceColor }]}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>{selectedWallet ? `${selectedWallet.name} balance` : 'Total balance'}</Text>
              <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
                {walletLoading ? 'Loading…' : formatCurrency(currentBalance, currency)}
              </Text>
            </View>

            <View style={styles.balanceIcon}>
              <Text style={styles.balanceIconText}>💳</Text>
            </View>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooter}>
            <View>
              <Text style={styles.balanceFooterLabel}>Wallet scope</Text>
              <Text style={styles.balanceFooterValue} numberOfLines={1}>{balanceStatus}</Text>
            </View>

            <Pressable
              style={styles.viewReportsButton}
              onPress={() => goTo('Reports')}
              accessibilityRole="button"
            >
              <Text style={styles.viewReportsText}>
                View reports ↗
              </Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletChips}>
            <Pressable onPress={() => setSelectedWalletId(null)} accessibilityRole="button" accessibilityState={{ selected: !selectedWalletId }} style={[styles.walletChip, !selectedWalletId && styles.walletChipSelected]}>
              <Text style={[styles.walletChipText, !selectedWalletId && styles.walletChipTextSelected]}>All</Text>
            </Pressable>
            {wallets.map((wallet) => {
              const selected = selectedWalletId === wallet._id;
              return <Pressable key={wallet._id} onPress={() => setSelectedWalletId(wallet._id)} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.walletChip, selected && styles.walletChipSelected]}>
                <Text style={[styles.walletChipText, selected && styles.walletChipTextSelected]}>{wallet.icon || '◉'} {wallet.name}</Text>
              </Pressable>;
            })}
          </ScrollView>
          {walletError ? <Text style={styles.walletError}>{walletError}</Text> : null}
        </View>

        {/* Monthly income, expenses, and net */}
        <View style={styles.monthSummaryHeader}>
          <Pressable onPress={() => setSummaryMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.monthSummaryTitle}>{monthLabel}</Text>
          <Pressable onPress={() => setSummaryMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} accessibilityRole="button" accessibilityLabel="Next month" disabled={isCurrentMonth} style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}>
            <Text style={styles.monthArrowText}>›</Text>
          </Pressable>
        </View>
        {loading ? <View style={styles.monthSummaryState}><Text style={styles.mutedText}>Loading monthly totals…</Text></View> : error ? <View style={styles.monthSummaryState}><Text style={styles.monthSummaryError}>Monthly totals unavailable</Text></View> : (
          <View style={styles.monthSummaryRow}>
            <SummaryCard title="Income" amount={monthlyIncome} icon="+" color={COLORS.primary} background={COLORS.primaryLight} currency={currency} compact />
            <SummaryCard title="Expenses" amount={monthlyExpenses} icon="−" color={COLORS.red} background={COLORS.redLight} currency={currency} compact />
            <SummaryCard title="Net balance" amount={monthlyNet} icon="=" color={monthlyNet >= 0 ? COLORS.primary : COLORS.red} background={monthlyNet >= 0 ? COLORS.primaryLight : COLORS.redLight} currency={currency} compact />
          </View>
        )}
        <Pressable onPress={() => goTo('Wallets')} accessibilityRole="button" style={styles.walletsEntry}>
          <View style={styles.walletsEntryIcon}><Text style={styles.walletsEntryIconText}>▣</Text></View>
          <View style={styles.walletsEntryCopy}><Text style={styles.walletsEntryTitle}>Wallets</Text><Text style={styles.walletsEntryHint}>Manage accounts and balances</Text></View>
          <Text style={styles.walletsEntryArrow}>›</Text>
        </Pressable>
        {/* Quick actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => goTo('AddTransaction')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryActionIcon}>＋</Text>
            <Text style={styles.primaryActionText}>Add transaction</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() => goTo('Transactions', { walletId: selectedWalletId })}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryActionIcon}>↗</Text>
            <Text style={styles.secondaryActionText}>
              All transactions
            </Text>
          </Pressable>
        </View>

        {/* Weekly chart */}
        <View style={styles.section}>
          <SectionHeader title="Spending insights" />

          {loading ? <Text style={styles.stateText}>Loading expense data…</Text> : error ? (
            <View style={styles.stateCard}><Text style={styles.stateText}>{error}</Text><Pressable onPress={loadExpenses}><Text style={styles.sectionAction}>Tap to retry</Text></Pressable></View>
          ) : visibleExpenses.some((item) => item.type !== 'income') ? (
            <SpendingChart transactions={visibleExpenses} period={spendingPeriod} onPeriodChange={setSpendingPeriod} currency={currency} now={now} selectedDay={selectedDay} onSelectedDayChange={setSelectedDay} />
          ) : <View style={styles.stateCard}><Text style={styles.stateText}>Add an expense to see your spending trend.</Text></View>}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  darkBackground: { backgroundColor: '#111A17' },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  themeButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  themeButtonDark: { backgroundColor: '#1B2923', borderColor: '#2B3A33' },
  themeButtonText: { color: COLORS.text, fontSize: 19, fontWeight: '700' },
  darkText: { color: '#F1F5F2' },
  greeting: {
    color: COLORS.secondary,
    fontSize: 13,
    marginBottom: 5,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
  },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBEEDB',
  },
  profileInitial: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '800',
  },

  // Balance
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#D8F5E6',
    fontSize: 14,
    marginBottom: 10,
  },
  balanceAmount: {
    color: COLORS.white,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  balanceIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#FFFFFF25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceIconText: {
    fontSize: 24,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#FFFFFF35',
    marginVertical: 20,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceFooterLabel: {
    color: '#D8F5E6',
    fontSize: 12,
    marginBottom: 5,
  },
  balanceFooterValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  viewReportsButton: {
    backgroundColor: '#FFFFFF20',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  viewReportsText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  walletChips: { flexDirection: 'row', gap: 7, paddingTop: 14 },
  walletChip: { borderRadius: 10, backgroundColor: '#FFFFFF25', paddingHorizontal: 11, minHeight: 33, justifyContent: 'center' },
  walletChipSelected: { backgroundColor: COLORS.white },
  walletChipText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  walletChipTextSelected: { color: COLORS.primary },
  walletError: { color: '#FFE6E6', fontSize: 10, marginTop: 8 },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  monthSummaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthSummaryTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  monthArrow: { width: 34, height: 32, borderRadius: 10, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  monthArrowDisabled: { opacity: 0.35 },
  monthArrowText: { color: COLORS.text, fontSize: 21, lineHeight: 25, fontWeight: '700' },
  monthSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  monthSummaryState: { minHeight: 76, backgroundColor: COLORS.white, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  monthSummaryError: { color: COLORS.red, fontSize: 12 },
  walletsEntry: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 17 },
  walletsEntryIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  walletsEntryIconText: { color: COLORS.primary, fontSize: 19 },
  walletsEntryCopy: { flex: 1 },
  walletsEntryTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  walletsEntryHint: { color: COLORS.secondary, fontSize: 10, marginTop: 3 },
  walletsEntryArrow: { color: COLORS.secondary, fontSize: 22 },
  summaryColumn: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    minHeight: 125,
    justifyContent: 'space-between',
  },
  compactSummaryCard: { flex: 1, minWidth: 0, padding: 10, minHeight: 106 },
  compactSummaryAmount: { fontSize: 13, marginTop: 8 },
  summaryTop: {
    gap: 9,
  },
  summaryIcon: {
    width: 33,
    height: 33,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  summaryAmount: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 14,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 27,
  },
  primaryAction: {
    flex: 1,
    minHeight: 49,
    borderRadius: 14,
    backgroundColor: COLORS.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 5,
  },
  primaryActionIcon: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '400',
  },
  primaryActionText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 49,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 7,
  },
  secondaryActionIcon: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryActionText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },

  // Sections
  section: {
    marginBottom: 27,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  sectionAction: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Chart
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  mutedText: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 5,
  },
  chartBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chartBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 125,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F2F4F3',
    borderRadius: 12,
    padding: 3,
    marginTop: 16,
  },
  periodTab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  periodTabIcon: { color: COLORS.secondary, fontSize: 13, lineHeight: 16 },
  periodTabSelected: { backgroundColor: COLORS.white },
  periodTabText: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  periodTabTextSelected: { color: COLORS.primary },
  dateNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, paddingHorizontal: 3 },
  dateArrow: { width: 36, height: 34, borderRadius: 10, backgroundColor: '#F2F4F3', alignItems: 'center', justifyContent: 'center' },
  dateArrowDisabled: { opacity: 0.35 },
  dateArrowText: { color: COLORS.text, fontSize: 22, lineHeight: 26, fontWeight: '700' },
  selectedDate: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barArea: {
    position: 'relative',
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  timeIcon: { position: 'absolute', top: 2, fontSize: 14 },
  bar: {
    width: 19,
    borderRadius: 7,
  },
  chartDay: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 10,
  },
  chartDayActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  seriesBreakdown: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 15, paddingTop: 8 },
  seriesRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  seriesNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  seriesIcon: { fontSize: 13 },
  seriesName: { color: COLORS.secondary, fontSize: 10, flexShrink: 1 },
  seriesAmount: { color: COLORS.text, fontSize: 11, fontWeight: '700' },

  // Categories
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  categoryIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 19,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  categoryAmount: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F0F2F1',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  categoryFooterText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryFooterArrow: {
    color: COLORS.primary,
    fontSize: 17,
  },

  // Transactions
  transactionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 11,
  },
  transactionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transactionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionEmoji: {
    fontSize: 19,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },
  transactionMeta: {
    color: COLORS.secondary,
    fontSize: 10,
  },
  transactionAmount: {
    fontSize: 11,
    fontWeight: '800',
  },
  allTransactionsButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  allTransactionsText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  stateCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  stateText: { color: COLORS.secondary, fontSize: 12, padding: 12, textAlign: 'center' },
  footerText: {
    color: COLORS.secondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: -5,
    marginBottom: 10,
  },
});
