import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getExpenses } from '../api/expenseApi';
import { formatCurrency } from '../constants/currency';

const COLORS = {
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983',
  border: '#EDF0EE', red: '#E65B64', redLight: '#FCECEE',
};
const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function TransactionRow({ item, onPress, currency }) {
  const income = item.type === 'income';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${item.title || 'transaction'} details`} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: income ? COLORS.primaryLight : '#FFF1DC' }]}>
        <Text style={styles.iconText}>{income ? '↑' : '↓'}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title || 'Transaction'}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{item.category || 'General'} · {formatDate(item.date)}</Text>
      </View>
      <Text style={[styles.amount, { color: income ? COLORS.primary : COLORS.text }]} numberOfLines={1}>
        {income ? '+' : '-'}{formatCurrency(item.amount, currency)}
      </Text>
    </Pressable>
  );
}

export default function TransactionsScreen({ onBack, currency = 'PKR' }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getExpenses();
      if (!Array.isArray(result)) throw new Error('Unexpected transaction data received');
      setTransactions(result);
    } catch (loadError) {
      setError(loadError.message || 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const visibleTransactions = useMemo(() => transactions
    .filter((item) => filter === 'all' || (item.type || 'expense') === filter)
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [transactions, filter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to dashboard" style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>YOUR ACTIVITY</Text>
            <Text style={styles.heading}>Transactions</Text>
          </View>
          <Pressable onPress={loadTransactions} accessibilityRole="button" accessibilityLabel="Refresh transactions" style={styles.refreshButton}>
            <Text style={styles.refreshText}>↻</Text>
          </Pressable>
        </View>

        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const active = item.value === filter;
            return (
              <Pressable key={item.value} onPress={() => setFilter(item.value)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.filterButton, active && styles.filterActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator color={COLORS.primary} /><Text style={styles.stateText}>Loading transactions…</Text></View>
        ) : error ? (
          <View style={styles.stateBox}><Text style={styles.error}>{error}</Text><Pressable onPress={loadTransactions} accessibilityRole="button"><Text style={styles.retry}>Tap to retry</Text></Pressable></View>
        ) : (
          <FlatList
            data={visibleTransactions}
            keyExtractor={(item, index) => item._id || `${item.title || 'transaction'}-${item.date}-${index}`}
            renderItem={({ item }) => <TransactionRow item={item} currency={currency} onPress={() => setSelected(item)} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={visibleTransactions.length ? styles.list : styles.emptyList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>{transactions.length ? 'No transactions match this filter.' : 'No transactions yet. Add one from the dashboard.'}</Text>}
          />
        )}
      </View>

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailCard}>
            <View style={styles.detailTop}>
              <Text style={styles.detailHeading}>Transaction details</Text>
              <Pressable onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Close transaction details" style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            {selected ? (
              <>
                <Text style={[styles.detailAmount, { color: selected.type === 'income' ? COLORS.primary : COLORS.text }]}>
                  {selected.type === 'income' ? '+' : '-'}{formatCurrency(selected.amount, currency)}
                </Text>
                <Text style={styles.detailTitle}>{selected.title || 'Transaction'}</Text>
                <View style={styles.detailDivider} />
                <DetailLine label="Type" value={selected.type === 'income' ? 'Income' : 'Expense'} />
                <DetailLine label="Category" value={selected.category || 'General'} />
                <DetailLine label="Date" value={formatDate(selected.date)} />
                {selected.notes ? <DetailLine label="Notes" value={selected.notes} /> : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailLine({ label, value }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backText: { color: COLORS.text, fontSize: 30, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  refreshText: { color: COLORS.primary, fontSize: 25, lineHeight: 29 },
  filters: { flexDirection: 'row', backgroundColor: '#EDF1EF', borderRadius: 14, padding: 4, marginBottom: 16 },
  filterButton: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterActive: { backgroundColor: COLORS.white },
  filterText: { color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: COLORS.primary },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 70 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 11 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 54 },
  icon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: COLORS.primary, fontSize: 21, fontWeight: '800' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 5 },
  rowMeta: { color: COLORS.secondary, fontSize: 10 },
  amount: { maxWidth: 115, fontSize: 11, fontWeight: '800' },
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  stateText: { color: COLORS.secondary, fontSize: 12, marginTop: 12, textAlign: 'center' },
  error: { color: COLORS.red, fontSize: 13, textAlign: 'center' },
  retry: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 12 },
  emptyText: { color: COLORS.secondary, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 28 },
  modalBackdrop: { flex: 1, backgroundColor: '#172B2470', justifyContent: 'center', padding: 22 },
  detailCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 20 },
  detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  detailHeading: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  closeButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: COLORS.secondary, fontSize: 23, lineHeight: 26 },
  detailAmount: { fontSize: 25, fontWeight: '800', marginBottom: 5 },
  detailTitle: { color: COLORS.secondary, fontSize: 13 },
  detailDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  detailLine: { marginBottom: 14 },
  detailLabel: { color: COLORS.secondary, fontSize: 10, marginBottom: 4 },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
});
