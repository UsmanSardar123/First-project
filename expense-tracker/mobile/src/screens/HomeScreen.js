
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';
import { getExpenses } from '../api/expenseApi';

const COLORS = {
  background: '#F6F8FB',
  white: '#FFFFFF',
  primary: '#16A36A',
  primaryLight: '#E5F7EE',
  text: '#172B24',
  secondary: '#7C8983',
  border: '#EDF0EE',
  red: '#E65B64',
  redLight: '#FCECEE',
  blue: '#5479E8',
  orange: '#F2A541',
  purple: '#9670DC',
};

const formatPKR = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

const getMonthName = () =>
  new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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

function SummaryCard({ title, amount, icon, color, background }) {
  return (
    <View style={styles.summaryCard}>
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

      <Text style={[styles.summaryAmount, { color }]} numberOfLines={1}>
        {amount == null ? 'Not tracked' : `Rs. ${formatPKR(amount)}`}
      </Text>
    </View>
  );
}


function SpendingChart({ weeklySpending }) {
  const maxAmount = Math.max(
    ...weeklySpending.map((item) => item.amount),
    1
  );

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeading}>
        <View>
          <Text style={styles.cardTitle}>Weekly spending</Text>
          <Text style={styles.mutedText}>Your expenses this week</Text>
        </View>

        <View style={styles.chartBadge}>
          <Text style={styles.chartBadgeText}>This week</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {weeklySpending.map((item) => {
          const height = Math.max(
            (item.amount / maxAmount) * 115,
            6
          );

          const isHighest = item.amount === maxAmount;

          return (
            <View key={item.day} style={styles.chartColumn}>
              <View style={styles.barArea}>
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
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function CategoryItem({ item }) {
  return (
    <View style={styles.categoryItem}>
      <View
        style={[
          styles.categoryIcon,
          { backgroundColor: `${item.color}18` },
        ]}
      >
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>

      <View style={styles.categoryInfo}>
        <View style={styles.categoryTop}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryAmount}>
            Rs. {formatPKR(item.amount)}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(item.percent, 100)}%`,
                backgroundColor: item.color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function TransactionItem({ item, isLast }) {
  const isIncome = item.amount > 0;

  return (
    <View
      style={[
        styles.transactionItem,
        !isLast && styles.transactionDivider,
      ]}
    >
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: item.color },
        ]}
      >
        <Text style={styles.transactionEmoji}>{item.icon}</Text>
      </View>

      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.transactionMeta}>
          {item.category} · {item.date}
        </Text>
      </View>

      <Text
        style={[
          styles.transactionAmount,
          { color: isIncome ? COLORS.primary : COLORS.text },
        ]}
      >
        {isIncome ? '+' : '-'}Rs. {formatPKR(item.amount)}
      </Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getExpenses();
      if (!Array.isArray(result)) throw new Error('Unexpected expense data received');
      setExpenses(result);
    } catch (loadError) {
      setError(loadError.message || 'Could not load expenses');
    } finally {
      setLoading(false);
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

  const now = new Date();
  const monthExpenses = expenses.filter((item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const monthlyExpenses = monthExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const categoryTotals = monthExpenses.reduce((totals, item) => {
    const name = item.category || 'General';
    totals[name] = (totals[name] || 0) + (Number(item.amount) || 0);
    return totals;
  }, {});
  const maxCategoryAmount = Math.max(...Object.values(categoryTotals), 1);
  const colors = [COLORS.orange, COLORS.blue, COLORS.purple];
  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, amount], index) => ({
    name, amount, color: colors[index], icon: '•', percent: amount / maxCategoryAmount * 100,
  }));
  const weeklySpending = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const amount = expenses.reduce((sum, item) => new Date(item.date).toDateString() === day.toDateString() ? sum + (Number(item.amount) || 0) : sum, 0);
    return { day: day.toLocaleDateString('en-US', { weekday: 'short' }), amount };
  });
  const transactions = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4).map((item, index) => ({
    id: item._id || `${item.title}-${item.date}`, title: item.title || 'Expense', category: item.category || 'General',
    date: new Date(item.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
    amount: -(Number(item.amount) || 0), icon: '•', color: ['#FFF1DC', '#E9EEFF', '#F4EAFE'][index % 3],
  }));

  const goTo = (screen) => {
    navigation?.navigate?.(screen);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.headerTitle}>My finances</Text>
          </View>

          <Pressable
            style={styles.profileButton}
            onPress={() => goTo('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Text style={styles.profileInitial}>U</Text>
          </Pressable>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>Expenses this month</Text>
              <Text style={styles.balanceAmount}>
                Rs. {formatPKR(monthlyExpenses)}
              </Text>
            </View>

            <View style={styles.balanceIcon}>
              <Text style={styles.balanceIconText}>💳</Text>
            </View>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooter}>
            <View>
              <Text style={styles.balanceFooterLabel}>
                Monthly expenses
              </Text>
              <Text style={styles.balanceFooterValue}>
                {getMonthName()}
              </Text>
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
        </View>

        {/* Income and expenses */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <SummaryCard
              title="Income (not tracked)"
              amount={null}
              icon="↙"
              color={COLORS.primary}
              background={COLORS.primaryLight}
            />
          </View>

          <View style={styles.summaryColumn}>
            <SummaryCard
              title="Expenses this month"
              amount={monthlyExpenses}
              icon="↗"
              color={COLORS.red}
              background={COLORS.redLight}
            />
          </View>
        </View>

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
            onPress={() => goTo('Transactions')}
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
          ) : expenses.length ? <SpendingChart weeklySpending={weeklySpending} /> : <View style={styles.stateCard}><Text style={styles.stateText}>Add an expense to see your spending trend.</Text></View>}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <SectionHeader
            title="Top spending categories"
            action="See all"
            onPress={() => goTo('Reports')}
          />

          <View style={styles.categoryCard}>
            {loading ? <Text style={styles.stateText}>Loading categories…</Text> : categories.length ? categories.map((item) => (
              <CategoryItem key={item.name} item={item} />
            )) : <Text style={styles.stateText}>No expenses recorded this month.</Text>}

            <Pressable
              style={styles.categoryFooter}
              onPress={() => goTo('Budgets')}
              accessibilityRole="button"
            >
              <Text style={styles.categoryFooterText}>
                Manage your budgets
              </Text>
              <Text style={styles.categoryFooterArrow}>→</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent transactions */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent transactions"
            action="See all"
            onPress={() => goTo('Transactions')}
          />

          <View style={styles.transactionsCard}>
            {loading ? <Text style={styles.stateText}>Loading transactions…</Text> : transactions.length ? transactions.map((item, index) => (
              <TransactionItem
                key={item.id}
                item={item}
                isLast={index === transactions.length - 1}
              />
            )) : <Text style={styles.stateText}>Your recent expenses will appear here.</Text>}
          </View>

          <Pressable
            style={styles.allTransactionsButton}
            onPress={() => goTo('Transactions')}
            accessibilityRole="button"
          >
            <Text style={styles.allTransactionsText}>
              View all transactions →
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          Stay on top of your money, one day at a time.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
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

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
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
  },
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
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
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
