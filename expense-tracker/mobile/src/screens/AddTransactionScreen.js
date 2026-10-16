import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createExpense, getExpenses, updateExpense } from '../api/expenseApi';
import { currencySymbol, formatCurrency } from '../constants/currency';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';

const COLORS = {
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983',
  border: '#EDF0EE', red: '#E65B64', redLight: '#FCECEE',
};

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddTransactionScreen({
  onBack, onSaved, currency = 'PKR', initialType = 'expense', lockedType = false, transaction,
}) {
  const [type, setType] = useState(transaction?.type || initialType);
  const [title, setTitle] = useState(transaction?.title || '');
  const [amount, setAmount] = useState(transaction?.amount ? String(transaction.amount) : '');
  const [category, setCategory] = useState(transaction?.category || '');
  const [date, setDate] = useState(transaction?.date ? localDateString(new Date(transaction.date)) : localDateString(new Date()));
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [ledgerError, setLedgerError] = useState('');

  useEffect(() => {
    let active = true;
    getExpenses()
      .then((items) => {
        if (!Array.isArray(items)) throw new Error('Unexpected transaction data received.');
        if (active) {
          const totals = items.reduce((result, item) => {
            if (item.type === 'income') result.income += Number(item.amount) || 0;
            else result.expenses += Number(item.amount) || 0;
            return result;
          }, { income: 0, expenses: 0 });
          setIncomeTotal(totals.income);
          setAvailableBalance(totals.income - totals.expenses);
        }
      })
      .catch((loadError) => { if (active) setLedgerError(loadError.message || 'Could not load your balance.'); })
      .finally(() => { if (active) setLoadingLedger(false); });
    return () => { active = false; };
  }, []);

  async function submit() {
    setError('');
    const numericAmount = Number(amount);
    if (!title.trim()) return setError('Enter a description.');
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return setError('Enter an amount greater than zero.');
    if (!category.trim()) return setError('Enter a category.');
    const parsedDate = new Date(`${date}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || localDateString(parsedDate) !== date) return setError('Enter a valid date in YYYY-MM-DD format.');

    setSaving(true);
    try {
      const payload = { title: title.trim(), amount: numericAmount, type, category: category.trim(), date, notes: notes.trim() };
      if (type === 'expense') {
        const items = await getExpenses();
        const totals = items.reduce((result, item) => {
          if (item._id === transaction?._id) return result;
          if (item.type === 'income') result.income += Number(item.amount) || 0;
          else result.expenses += Number(item.amount) || 0;
          return result;
        }, { income: 0, expenses: 0 });
        const available = totals.income - totals.expenses;
        if (numericAmount > available) {
          return setError(`This expense is more than your available income of ${formatCurrency(Math.max(available, 0), currency)}.`);
        }
      }
      if (transaction?._id) {
        await updateExpense(transaction._id, payload);
      } else {
        await createExpense(payload);
      }
      onSaved?.();
    } catch (saveError) {
      setError(saveError.message || 'Could not save this transaction.');
    } finally {
      setSaving(false);
    }
  }

  const isIncome = type === 'income';
  const accent = isIncome ? COLORS.primary : COLORS.red;
  const categoryList = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryOptions = category && !categoryList.includes(category) ? [category, ...categoryList] : categoryList;

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to previous screen" hitSlop={8} style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: accent }]}>{isIncome ? 'MONEY IN' : 'MONEY OUT'}</Text>
            <Text style={styles.heading}>{transaction ? 'Edit transaction' : `Add ${isIncome ? 'income' : 'expense'}`}</Text>
          </View>
        </View>

        {!lockedType && !transaction ? (
          <View style={styles.typeRow} accessibilityRole="tablist">
            {['expense', 'income'].map((option) => {
              const selected = type === option;
              const optionColor = option === 'income' ? COLORS.primary : COLORS.red;
              return (
                <Pressable key={option} onPress={() => { setCategory(''); setType(option); }} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.typeButton, selected && { backgroundColor: option === 'income' ? COLORS.primaryLight : COLORS.redLight }]}>
                  <Text style={[styles.typeText, selected && { color: optionColor }]}>{option === 'expense' ? 'Expense' : 'Income'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={[styles.totalCard, { backgroundColor: isIncome ? COLORS.primary : '#D94B53' }]}>
            <View style={styles.totalCopy}>
              <Text style={styles.totalLabel}>{isIncome ? 'TOTAL INCOME' : 'AVAILABLE TO SPEND'}</Text>
              {loadingLedger ? <ActivityIndicator style={styles.totalLoader} color={COLORS.primary} /> : (
                <Text style={styles.totalAmount}>{formatCurrency(isIncome ? incomeTotal : Math.max(availableBalance, 0), currency)}</Text>
              )}
              {ledgerError ? <Text style={styles.totalError}>{ledgerError}</Text> : <Text style={styles.totalHint}>{isIncome ? 'All income transactions combined' : 'Income remaining after expenses'}</Text>}
            </View>
            <View style={styles.totalIcon}><Text style={styles.totalIconText}>↗</Text></View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formIntro}>{isIncome ? 'Record money received' : 'Record money spent'}</Text>
          <Text style={styles.label}>Description</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder={isIncome ? 'e.g. Monthly salary' : 'e.g. Groceries'} placeholderTextColor="#9AA49F" style={styles.input} returnKeyType="next" maxLength={100} />

          <Text style={styles.label}>Amount ({currencySymbol(currency)})</Text>
          <TextInput value={amount} onChangeText={(value) => setAmount(value.replace(',', '.'))} placeholder="0.00" placeholderTextColor="#9AA49F" style={styles.input} keyboardType="decimal-pad" />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryOptions}>
            {categoryOptions.map((option) => {
              const selected = category === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setCategory(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.categoryChip, selected && { backgroundColor: isIncome ? COLORS.primaryLight : COLORS.redLight, borderColor: accent }]}
                >
                  <Text style={[styles.categoryChipText, selected && { color: accent }]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Date</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9AA49F" style={styles.input} keyboardType="numbers-and-punctuation" maxLength={10} />

          <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Add a note" placeholderTextColor="#9AA49F" style={[styles.input, styles.notesInput]} multiline textAlignVertical="top" maxLength={500} />

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <Pressable onPress={submit} disabled={saving} accessibilityRole="button" style={[styles.submitButton, { backgroundColor: accent }, saving && styles.submitDisabled]}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>{transaction ? 'Save changes' : `Add ${isIncome ? 'income' : 'expense'}`}</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  backText: { color: COLORS.text, fontSize: 28, lineHeight: 32 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800', textTransform: 'capitalize' },
  typeRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, padding: 4, borderRadius: 15, marginBottom: 16 },
  typeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 11 },
  typeText: { color: COLORS.secondary, fontWeight: '700' },
  totalCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 19, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalCopy: { flex: 1 },
  totalLabel: { color: '#D8F5E6', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8 },
  totalAmount: { color: COLORS.white, fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  totalHint: { color: '#D8F5E6', fontSize: 11, marginTop: 7 },
  totalError: { color: '#FFE6E6', fontSize: 11, marginTop: 7 },
  totalLoader: { alignSelf: 'flex-start', marginVertical: 6 },
  totalIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#FFFFFF25', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  totalIconText: { color: COLORS.white, fontSize: 24, fontWeight: '700' },
  formCard: { backgroundColor: COLORS.white, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, padding: 18 },
  formIntro: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 15 },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FCFDFC', paddingHorizontal: 12, justifyContent: 'center' },
  categoryChipText: { color: COLORS.secondary, fontSize: 12, fontWeight: '600' },
  optional: { color: COLORS.secondary, fontWeight: '400' },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, color: COLORS.text, fontSize: 14, backgroundColor: '#FCFDFC' },
  notesInput: { minHeight: 92, paddingTop: 12 },
  error: { color: COLORS.red, fontSize: 12, marginTop: 14 },
  submitButton: { minHeight: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: COLORS.white, fontWeight: '800', fontSize: 15, textTransform: 'capitalize' },
});
