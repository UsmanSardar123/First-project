import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getBudgets, getExpenses, saveBudget } from '../api/expenseApi';
import { currencySymbol, formatCurrency } from '../constants/currency';

const COLORS = {
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983',
  border: '#EDF0EE', red: '#E65B64', redLight: '#FCECEE',
};

const normalizeCategory = (value) => String(value || '').trim().toLocaleLowerCase();
const displayCategory = (value) => value.replace(/\b\w/g, (character) => character.toLocaleUpperCase());

function BudgetCard({ budget, spent, currency }) {
  const limit = Number(budget.amount) || 0;
  const remaining = limit - spent;
  const overBudget = remaining < 0;
  const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetTop}>
        <View style={styles.budgetTitleWrap}>
          <Text style={styles.budgetName} numberOfLines={1}>{displayCategory(budget.category)}</Text>
          <Text style={styles.period}>Monthly limit</Text>
        </View>
        <Text style={styles.limitAmount}>{formatCurrency(limit, currency)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: overBudget ? COLORS.red : COLORS.primary }]} />
      </View>
      <View style={styles.budgetBottom}>
        <Text style={styles.spentText}>Spent {formatCurrency(spent, currency)}</Text>
        <Text style={[styles.remainingText, overBudget && styles.overBudgetText]}>
          {overBudget ? `Over by ${formatCurrency(-remaining, currency)}` : `${formatCurrency(remaining, currency)} left`}
        </Text>
      </View>
    </View>
  );
}

export default function BudgetsScreen({ onBack, currency = 'PKR' }) {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBudgets = async () => {
    setLoading(true);
    setError('');
    try {
      const [budgetResult, expenseResult] = await Promise.all([getBudgets(), getExpenses()]);
      if (!Array.isArray(budgetResult) || !Array.isArray(expenseResult)) throw new Error('Unexpected budget data received');
      setBudgets(budgetResult);
      setExpenses(expenseResult);
    } catch (loadError) {
      setError(loadError.message || 'Could not load budgets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchBudgets = async () => {
      setLoading(true);
      setError('');
      try {
        const [budgetResult, expenseResult] = await Promise.all([getBudgets(), getExpenses()]);
        if (!active) return;
        if (!Array.isArray(budgetResult) || !Array.isArray(expenseResult)) throw new Error('Unexpected budget data received');
        setBudgets(budgetResult);
        setExpenses(expenseResult);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'Could not load budgets.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchBudgets();

    return () => {
      active = false;
    };
  }, []);

  const spentByCategory = useMemo(() => {
    const now = new Date();
    return expenses.reduce((totals, expense) => {
      const date = new Date(expense.date);
      if (expense.type === 'income' || Number.isNaN(date.getTime()) || date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return totals;
      const key = normalizeCategory(expense.category || 'General');
      totals[key] = (totals[key] || 0) + (Number(expense.amount) || 0);
      return totals;
    }, {});
  }, [expenses]);

  const totalLimit = budgets.reduce((sum, budget) => sum + (Number(budget.amount) || 0), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + (spentByCategory[normalizeCategory(budget.category)] || 0), 0);

  async function submitBudget() {
    setFormError('');
    setNotice('');
    const numericAmount = Number(amount);
    if (!category.trim()) return setFormError('Enter a category.');
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return setFormError('Enter a limit greater than zero.');
    setSaving(true);
    try {
      await saveBudget({ category: category.trim(), amount: numericAmount });
      setCategory('');
      setAmount('');
      setNotice('Budget saved. Existing category limits are updated.');
      await loadBudgets();
    } catch (saveError) {
      setFormError(saveError.message || 'Could not save this budget.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to dashboard" style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>SPENDING PLAN</Text><Text style={styles.heading}>Budgets</Text></View>
          <Pressable onPress={loadBudgets} accessibilityRole="button" accessibilityLabel="Refresh budgets" style={styles.refreshButton}><Text style={styles.refreshText}>↻</Text></Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Monthly budget overview</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalSpent, currency)} <Text style={styles.summaryOf}>of {formatCurrency(totalLimit, currency)}</Text></Text>
          <Text style={styles.summaryHint}>Spent in categories with a budget this month</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Set a category limit</Text>
          <TextInput value={category} onChangeText={setCategory} placeholder="Category, e.g. Food" placeholderTextColor="#9AA49F" style={styles.input} returnKeyType="next" maxLength={50} />
          <TextInput value={amount} onChangeText={(value) => setAmount(value.replace(',', '.'))} placeholder={`Monthly limit (${currencySymbol(currency)})`} placeholderTextColor="#9AA49F" style={styles.input} keyboardType="decimal-pad" />
          {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Pressable onPress={submitBudget} disabled={saving} accessibilityRole="button" style={[styles.saveButton, saving && styles.disabledButton]}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Save monthly budget</Text>}
          </Pressable>
        </View>

        <View style={styles.listHeader}><Text style={styles.sectionTitle}>Your category budgets</Text><Text style={styles.sectionSub}>Spent and remaining this month</Text></View>
        {loading ? (
          <View style={styles.stateCard}><ActivityIndicator color={COLORS.primary} /><Text style={styles.stateText}>Loading budgets…</Text></View>
        ) : error ? (
          <View style={styles.stateCard}><Text style={styles.error}>{error}</Text><Pressable onPress={loadBudgets} accessibilityRole="button"><Text style={styles.retry}>Tap to retry</Text></Pressable></View>
        ) : budgets.length ? budgets.map((budget) => (
          <BudgetCard key={budget._id || budget.category} budget={budget} spent={spentByCategory[normalizeCategory(budget.category)] || 0} currency={currency} />
        )) : (
          <View style={styles.stateCard}><Text style={styles.emptyText}>No budgets yet. Set a category limit above to get started.</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backText: { color: COLORS.text, fontSize: 30, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  refreshText: { color: COLORS.primary, fontSize: 25, lineHeight: 29 },
  summaryCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 19, marginBottom: 14 },
  summaryLabel: { color: '#D8F5E6', fontSize: 12, marginBottom: 8 },
  summaryAmount: { color: COLORS.white, fontSize: 23, fontWeight: '800' },
  summaryOf: { color: '#D8F5E6', fontSize: 14, fontWeight: '600' },
  summaryHint: { color: '#D8F5E6', fontSize: 10, marginTop: 7 },
  formCard: { backgroundColor: COLORS.white, borderRadius: 19, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  formTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  input: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, color: COLORS.text, fontSize: 13, marginBottom: 10, backgroundColor: '#FCFDFC' },
  error: { color: COLORS.red, fontSize: 12, marginTop: 4 },
  notice: { color: COLORS.primary, fontSize: 11, marginTop: 4 },
  saveButton: { minHeight: 46, backgroundColor: COLORS.text, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  disabledButton: { opacity: 0.7 },
  saveText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  listHeader: { marginBottom: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  sectionSub: { color: COLORS.secondary, fontSize: 11, marginTop: 4 },
  budgetCard: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 11 },
  budgetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  budgetTitleWrap: { flex: 1 },
  budgetName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  period: { color: COLORS.secondary, fontSize: 10, marginTop: 4 },
  limitAmount: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 7, backgroundColor: '#F0F2F1', borderRadius: 5, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 5 },
  budgetBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  spentText: { color: COLORS.secondary, fontSize: 10 },
  remainingText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  overBudgetText: { color: COLORS.red },
  stateCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 20, minHeight: 115, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  stateText: { color: COLORS.secondary, fontSize: 12, marginTop: 11 },
  retry: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 12 },
  emptyText: { color: COLORS.secondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
