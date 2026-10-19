import React, { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { deleteExpense, getExpenses } from '../api/expenseApi';
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
const PERIODS = [
  { label: 'All time', value: 'all' },
  { label: 'This month', value: 'month' },
  { label: '30 days', value: '30days' },
];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function transactionsToCsv(items) {
  const rows = [
    ['Date', 'Type', 'Description', 'Category', 'Amount', 'Payment method', 'Notes'],
    ...items.map((item) => [
      String(item.date || '').slice(0, 10), item.type || 'expense', item.title,
      item.category, item.amount, item.paymentMethod, item.notes,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
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

export default function TransactionsScreen({ onBack, onEdit, currency = 'PKR' }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchTransactions = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getExpenses();
        if (!active) return;
        if (!Array.isArray(result)) throw new Error('Unexpected transaction data received');
        setTransactions(result);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'Could not load transactions.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchTransactions();

    return () => {
      active = false;
    };
  }, []);

  async function removeSelected() {
    if (!selected?._id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteExpense(selected._id);
      setTransactions((current) => current.filter((item) => item._id !== selected._id));
      setConfirmDelete(false);
      setSelected(null);
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError.message || 'Could not delete this transaction.');
    } finally {
      setDeleting(false);
    }
  }

  async function shareCsv() {
    if (!visibleTransactions.length) return;
    setSharing(true);
    setExportError('');
    try {
      await Share.share(
        { message: transactionsToCsv(visibleTransactions), title: 'Transactions.csv' },
        { dialogTitle: 'Share transaction CSV' }
      );
    } catch (shareError) {
      setExportError(shareError.message || 'Could not share the transaction CSV.');
    } finally {
      setSharing(false);
    }
  }

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const visibleTransactions = useMemo(() => {
    const now = new Date();
    const daysStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return transactions
      .filter((item) => filter === 'all' || (item.type || 'expense') === filter)
      .filter((item) => {
        if (period === 'all') return true;
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return false;
        if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        return date >= daysStart && date <= now;
      })
      .filter((item) => !normalizedQuery || [item.title, item.category, item.notes, item.paymentMethod, item.type]
        .some((value) => String(value || '').toLocaleLowerCase().includes(normalizedQuery)))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filter, period, query]);

  const summary = useMemo(() => visibleTransactions.reduce((totals, item) => {
    const amount = Number(item.amount) || 0;
    if (item.type === 'income') totals.income += amount;
    else totals.expenses += amount;
    return totals;
  }, { income: 0, expenses: 0 }), [visibleTransactions]);

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to previous screen" hitSlop={8} style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>YOUR ACTIVITY</Text>
            <Text style={styles.heading}>Transactions</Text>
          </View>
          <Pressable onPress={transactions} accessibilityRole="button" accessibilityLabel="Refresh transactions" style={styles.refreshButton}>
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

        <View style={styles.exportRow}>
          <Pressable onPress={shareCsv} disabled={!visibleTransactions.length || sharing} accessibilityRole="button" accessibilityLabel="Share filtered transactions as CSV" style={[styles.exportButton, (!visibleTransactions.length || sharing) && styles.disabledButton]}>
            {sharing ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={styles.exportButtonText}>Share CSV</Text>}
          </Pressable>
        </View>
        {exportError ? <Text accessibilityRole="alert" style={styles.exportError}>{exportError}</Text> : null}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search description, category, or note"
          placeholderTextColor="#9AA49F"
          accessibilityLabel="Search transactions"
          clearButtonMode="while-editing"
          style={styles.searchInput}
        />

        <View style={styles.periodFilters}>
          {PERIODS.map((item) => {
            const active = item.value === period;
            return <Pressable key={item.value} onPress={() => setPeriod(item.value)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.periodButton, active && styles.periodActive]}>
              <Text style={[styles.periodText, active && styles.periodTextActive]}>{item.label}</Text>
            </Pressable>;
          })}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Income shown</Text>
            <Text style={[styles.summaryAmount, styles.incomeAmount]} numberOfLines={1}>{formatCurrency(summary.income, currency)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expenses shown</Text>
            <Text style={styles.summaryAmount} numberOfLines={1}>{formatCurrency(summary.expenses, currency)}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator color={COLORS.primary} /><Text style={styles.stateText}>Loading transactions…</Text></View>
        ) : error ? (
          <View style={styles.stateBox}><Text style={styles.error}>{error}</Text><Pressable onPress={transactions} accessibilityRole="button"><Text style={styles.retry}>Tap to retry</Text></Pressable></View>
        ) : (
          <FlatList
            data={visibleTransactions}
            keyExtractor={(item, index) => item._id || `${item.title || 'transaction'}-${item.date}-${index}`}
            renderItem={({ item }) => <TransactionRow item={item} currency={currency} onPress={() => setSelected(item)} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={visibleTransactions.length ? styles.list : styles.emptyList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>{transactions.length ? 'No transactions match your search and filters.' : 'No transactions yet. Add one from the dashboard.'}</Text>}
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
                {selected.paymentMethod ? <DetailLine label={selected.type === 'income' ? 'Received via' : 'Paid via'} value={selected.paymentMethod} /> : null}
                {selected.notes ? <DetailLine label="Notes" value={selected.notes} /> : null}
                <View style={styles.detailActions}>
                  <Pressable onPress={() => { const transaction = selected; setSelected(null); onEdit?.(transaction); }} accessibilityRole="button" style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => { setDeleteError(''); setConfirmDelete(true); }} accessibilityRole="button" style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => !deleting && setConfirmDelete(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmHeading}>Delete transaction?</Text>
            <Text style={styles.confirmCopy}>This will permanently remove {selected?.title || 'this transaction'} from your records.</Text>
            {deleteError ? <Text accessibilityRole="alert" style={styles.error}>{deleteError}</Text> : null}
            <View style={styles.confirmActions}>
              <Pressable disabled={deleting} onPress={() => setConfirmDelete(false)} accessibilityRole="button" style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={deleting} onPress={removeSelected} accessibilityRole="button" style={[styles.confirmDeleteButton, deleting && styles.disabledButton]}>
                {deleting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
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
  exportRow: { alignItems: 'flex-end', marginTop: -6, marginBottom: 8 },
  exportButton: { minWidth: 88, minHeight: 34, borderWidth: 1, borderColor: '#BDE8D0', borderRadius: 11, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  exportButtonText: { color: COLORS.primary, fontWeight: '800', fontSize: 11 },
  exportError: { color: COLORS.red, fontSize: 11, textAlign: 'right', marginBottom: 8 },
  searchInput: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 13, color: COLORS.text, fontSize: 13, backgroundColor: COLORS.white, marginBottom: 10 },
  periodFilters: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  periodButton: { flex: 1, minHeight: 36, borderRadius: 11, backgroundColor: '#EDF1EF', alignItems: 'center', justifyContent: 'center' },
  periodActive: { backgroundColor: COLORS.primaryLight },
  periodText: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },
  periodTextActive: { color: COLORS.primary },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard: { flex: 1, minWidth: 0, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  summaryLabel: { color: COLORS.secondary, fontSize: 10, marginBottom: 6 },
  summaryAmount: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  incomeAmount: { color: COLORS.primary },
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
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editButton: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  editButtonText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  deleteButton: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: COLORS.redLight, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: COLORS.red, fontWeight: '800', fontSize: 13 },
  confirmCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 20 },
  confirmHeading: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  confirmCopy: { color: COLORS.secondary, fontSize: 13, lineHeight: 19, marginTop: 9 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelButton: { minWidth: 92, minHeight: 44, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: COLORS.text, fontWeight: '700' },
  confirmDeleteButton: { minWidth: 92, minHeight: 44, borderRadius: 12, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center' },
  confirmDeleteText: { color: COLORS.white, fontWeight: '800' },
  disabledButton: { opacity: 0.7 },
});
