import React, { useState } from 'react';
import { createThemeColors, createThemedStyles } from '../theme';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { createWallet, updateWallet } from '../api/walletsApi';

const COLORS = createThemeColors({ white: '#FFFFFF', background: '#F6F8FB', primary: '#16A36A', primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983', border: '#EDF0EE', red: '#E65B64' });
const TYPES = [
  { value: 'cash', label: 'Cash', icon: '◉' },
  { value: 'bank', label: 'Bank', icon: '▤' },
  { value: 'mobile', label: 'Mobile', icon: '▯' },
  { value: 'card', label: 'Card', icon: '▰' },
  { value: 'other', label: 'Other', icon: '◇' },
];

export default function WalletForm({ visible, wallet, onCancel, onSaved, onToast }) {
  const [name, setName] = useState(wallet?.name || '');
  const [type, setType] = useState(wallet?.type || 'cash');
  const [openingBalance, setOpeningBalance] = useState(String(wallet?.openingBalance ?? 0));
  const [color, setColor] = useState(wallet?.color || '#16A36A');
  const [icon, setIcon] = useState(wallet?.icon || '◉');
  const [isDefault, setIsDefault] = useState(Boolean(wallet?.isDefault));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const trimmedName = name.trim();
    const balance = Number(openingBalance);
    if (!trimmedName || trimmedName.length > 40) return setError('Enter a name between 1 and 40 characters.');
    if (!Number.isFinite(balance)) return setError('Enter a valid opening balance.');
    if (color && !/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)) return setError('Enter a hex color such as #16A36A.');
    if (icon.length > 8) return setError('Icon must be 8 characters or fewer.');
    setSaving(true);
    setError('');
    try {
      const input = { name: trimmedName, type, openingBalance: balance, color: color.trim(), icon: icon.trim(), isDefault };
      if (wallet?._id) await updateWallet(wallet._id, input);
      else await createWallet(input);
      onToast?.(wallet ? 'Wallet updated.' : 'Wallet created.');
      onSaved?.();
    } catch (saveError) {
      const message = saveError.message || 'Could not save wallet.';
      setError(message);
      onToast?.(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{wallet ? 'Edit wallet' : 'New wallet'}</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Everyday cash" maxLength={40} style={styles.input} placeholderTextColor="#9AA49F" />
            <Text style={styles.label}>Type</Text>
            <View style={styles.types}>
              {TYPES.map((item) => (
                <Pressable key={item.value} onPress={() => { setType(item.value); setIcon(item.icon); }} accessibilityRole="radio" accessibilityState={{ selected: type === item.value }} style={[styles.typeButton, type === item.value && styles.typeSelected]}>
                  <Text style={[styles.typeText, type === item.value && styles.selectedText]}>{item.icon} {item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Opening balance</Text>
            <TextInput value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad" style={styles.input} placeholder="0" placeholderTextColor="#9AA49F" />
            <View style={styles.inlineFields}>
              <View style={styles.inlineField}><Text style={styles.label}>Color</Text><TextInput value={color} onChangeText={setColor} autoCapitalize="characters" style={styles.input} placeholder="#16A36A" placeholderTextColor="#9AA49F" /></View>
              <View style={styles.inlineField}><Text style={styles.label}>Icon</Text><TextInput value={icon} onChangeText={setIcon} style={styles.input} placeholder="◉" placeholderTextColor="#9AA49F" maxLength={8} /></View>
            </View>
            <Pressable onPress={() => { if (!(wallet?.isDefault && isDefault)) setIsDefault((current) => !current); }} accessibilityRole="checkbox" accessibilityState={{ checked: isDefault }} style={styles.defaultOption}>
              <View style={[styles.checkbox, isDefault && styles.checkboxSelected]}><Text style={styles.check}>{isDefault ? '✓' : ''}</Text></View>
              <Text style={styles.defaultText}>Make this the default wallet</Text>
            </Pressable>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable onPress={onCancel} disabled={saving} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable onPress={submit} disabled={saving} style={styles.saveButton}>{saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>{wallet ? 'Save changes' : 'Create wallet'}</Text>}</Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = createThemedStyles({
  backdrop: { flex: 1, backgroundColor: '#172B2470', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  title: { color: COLORS.text, fontSize: 21, fontWeight: '800', marginBottom: 14 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 13, marginBottom: 7 },
  input: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, color: COLORS.text, backgroundColor: COLORS.white },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  typeButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, paddingHorizontal: 10, minHeight: 37, justifyContent: 'center', backgroundColor: COLORS.white },
  typeSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  typeText: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  selectedText: { color: COLORS.primary },
  inlineFields: { flexDirection: 'row', gap: 10 },
  inlineField: { flex: 1 },
  defaultOption: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 15 },
  checkbox: { width: 21, height: 21, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  check: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  defaultText: { color: COLORS.text, fontSize: 12 },
  error: { color: COLORS.red, fontSize: 12, marginTop: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 22 },
  cancelButton: { minWidth: 85, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { color: COLORS.text, fontWeight: '700' },
  saveButton: { minWidth: 130, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 14 },
  saveText: { color: COLORS.white, fontWeight: '800' },
});
