import React, { useState } from 'react';
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
import { createExpense } from '../api/expenseApi';
import { currencySymbol } from '../constants/currency';

const COLORS = {
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983',
  border: '#EDF0EE', red: '#E65B64',
};

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddTransactionScreen({ onBack, onSaved, currency = 'PKR' }) {
  const [type, setType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(localDateString(new Date()));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      await createExpense({
        title: title.trim(), amount: numericAmount, type,
        category: category.trim(), date, notes: notes.trim(),
      });
      onSaved?.();
    } catch (saveError) {
      setError(saveError.message || 'Could not save this transaction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to dashboard" style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>TRANSACTIONS</Text>
            <Text style={styles.heading}>Add transaction</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Transaction type</Text>
          <View style={styles.typeRow}>
            {['expense', 'income'].map((option) => {
              const selected = type === option;
              return (
                <Pressable key={option} onPress={() => setType(option)} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.typeButton, selected && styles.typeSelected]}>
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{option === 'expense' ? 'Expense' : 'Income'}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Groceries or Salary" placeholderTextColor="#9AA49F" style={styles.input} returnKeyType="next" maxLength={100} />

          <Text style={styles.label}>Amount ({currencySymbol(currency)})</Text>
          <TextInput value={amount} onChangeText={(value) => setAmount(value.replace(',', '.'))} placeholder="0" placeholderTextColor="#9AA49F" style={styles.input} keyboardType="decimal-pad" />

          <Text style={styles.label}>Category</Text>
          <TextInput value={category} onChangeText={setCategory} placeholder="e.g. Food, Transport, Salary" placeholderTextColor="#9AA49F" style={styles.input} returnKeyType="next" maxLength={50} />

          <Text style={styles.label}>Date</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9AA49F" style={styles.input} keyboardType="numbers-and-punctuation" maxLength={10} />

          <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Add a note" placeholderTextColor="#9AA49F" style={[styles.input, styles.notesInput]} multiline textAlignVertical="top" maxLength={500} />

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <Pressable onPress={submit} disabled={saving} accessibilityRole="button" style={[styles.submitButton, saving && styles.submitDisabled]}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Save {type}</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backText: { color: COLORS.text, fontSize: 30, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  formCard: { backgroundColor: COLORS.white, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, padding: 18 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 15 },
  optional: { color: COLORS.secondary, fontWeight: '400' },
  typeRow: { flexDirection: 'row', backgroundColor: '#F2F4F3', padding: 4, borderRadius: 13 },
  typeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 10 },
  typeSelected: { backgroundColor: COLORS.primaryLight },
  typeText: { color: COLORS.secondary, fontWeight: '700', textTransform: 'capitalize' },
  typeTextSelected: { color: COLORS.primary },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, color: COLORS.text, fontSize: 14, backgroundColor: '#FCFDFC' },
  notesInput: { minHeight: 92, paddingTop: 12 },
  error: { color: COLORS.red, fontSize: 12, marginTop: 14 },
  submitButton: { backgroundColor: COLORS.primary, minHeight: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: COLORS.white, fontWeight: '800', fontSize: 15, textTransform: 'capitalize' },
});
