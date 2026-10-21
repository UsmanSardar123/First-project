import React, { useCallback, useEffect, useState } from 'react';
import { createThemeColors, createThemedStyles, isDarkMode } from '../theme';
import { ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { archiveWallet, deleteWallet, getWallets } from '../api/walletsApi';
import WalletForm from '../components/WalletForm';
import { formatCurrency } from '../constants/currency';

const COLORS = createThemeColors({ background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A', primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983', border: '#EDF0EE', red: '#E65B64', redLight: '#FCECEE' });

export default function WalletsScreen({ onBack, currency = 'PKR' }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await getWallets();
      if (!Array.isArray(result)) throw new Error('Unexpected wallet data received.');
      setWallets(result);
    } catch (loadError) {
      setError(loadError.message || 'Could not load wallets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(''), 2400);
  }

  function beginEdit(wallet = null) {
    setEditing(wallet);
    setFormVisible(true);
  }

  async function archive(wallet) {
    try {
      await archiveWallet(wallet._id);
      showToast(`${wallet.name} archived.`);
      await load(true);
    } catch (archiveError) {
      Alert.alert('Could not archive wallet', archiveError.message || 'Try again.');
    }
  }

  function confirmDelete(wallet) {
    Alert.alert('Delete wallet?', `Delete ${wallet.name}? Wallets with transactions cannot be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteWallet(wallet._id);
          showToast(`${wallet.name} deleted.`);
          await load(true);
        } catch (deleteError) {
          Alert.alert('Could not delete wallet', deleteError.message || 'Try again.');
        }
      } },
    ]);
  }

  const total = wallets.reduce((sum, wallet) => sum + (Number(wallet.balance) || 0), 0);

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode() ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>MONEY ACCOUNTS</Text><Text style={styles.title}>Wallets</Text></View>
          <Pressable onPress={() => beginEdit()} accessibilityRole="button" style={styles.addButton}><Text style={styles.addText}>+ Add</Text></Pressable>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL BALANCE</Text>
          {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={[styles.totalAmount, total < 0 && styles.negative]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(total, currency)}</Text>}
          <Text style={styles.totalHint}>Across active wallets</Text>
        </View>

        {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
        <View style={styles.listHeader}><Text style={styles.sectionTitle}>Your wallets</Text><Pressable onPress={() => load(true)} accessibilityRole="button"><Text style={styles.refresh}>Refresh</Text></Pressable></View>
        {loading ? <View style={styles.stateCard}><ActivityIndicator color={COLORS.primary} /><Text style={styles.stateText}>Loading wallets…</Text></View> : error ? <View style={styles.stateCard}><Text style={styles.error}>{error}</Text><Pressable onPress={() => load()}><Text style={styles.retry}>Tap to retry</Text></Pressable></View> : wallets.length === 0 ? <View style={styles.stateCard}><Text style={styles.stateText}>No active wallets. Add one to get started.</Text></View> : wallets.map((wallet) => (
          <View key={wallet._id} style={styles.walletCard}>
            <Pressable onPress={() => beginEdit(wallet)} accessibilityRole="button" accessibilityLabel={`Edit ${wallet.name}`} style={styles.walletMain}>
              <View style={[styles.walletIcon, { backgroundColor: wallet.color || COLORS.primaryLight }]}><Text style={styles.walletIconText}>{wallet.icon || '◉'}</Text></View>
              <View style={styles.walletCopy}>
                <View style={styles.nameRow}><Text style={styles.walletName} numberOfLines={1}>{wallet.name}</Text>{wallet.isDefault ? <Text style={styles.defaultBadge}>DEFAULT</Text> : null}</View>
                <Text style={styles.walletType}>{wallet.type}</Text>
              </View>
              <Text style={[styles.walletBalance, Number(wallet.balance) < 0 && styles.negative]} numberOfLines={1}>{formatCurrency(wallet.balance, currency)}</Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable onPress={() => beginEdit(wallet)} accessibilityRole="button" style={styles.actionButton}><Text style={styles.actionText}>Edit</Text></Pressable>
              <Pressable onPress={() => archive(wallet)} accessibilityRole="button" style={styles.actionButton}><Text style={styles.actionText}>Archive</Text></Pressable>
              <Pressable onPress={() => confirmDelete(wallet)} accessibilityRole="button" style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
        {refreshing ? <Text style={styles.refreshing}>Refreshing wallets…</Text> : null}
      </ScrollView>
      {formVisible ? <WalletForm key={editing?._id || 'new-wallet'} visible wallet={editing} onCancel={() => setFormVisible(false)} onToast={showToast} onSaved={async () => { setFormVisible(false); await load(true); }} /> : null}
    </View>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  backText: { color: COLORS.text, fontSize: 29, lineHeight: 32 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: COLORS.text, fontSize: 23, fontWeight: '800' },
  addButton: { minHeight: 39, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', paddingHorizontal: 14 },
  addText: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  totalCard: { backgroundColor: COLORS.white, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, padding: 18, marginBottom: 21 },
  totalLabel: { color: COLORS.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  totalAmount: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 7 },
  totalHint: { color: COLORS.secondary, fontSize: 11, marginTop: 4 },
  negative: { color: COLORS.red },
  toast: { backgroundColor: COLORS.text, borderRadius: 11, padding: 11, marginBottom: 14 },
  toastText: { color: COLORS.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  refresh: { color: COLORS.primary, fontWeight: '700', fontSize: 11 },
  walletCard: { backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, padding: 13, marginBottom: 10 },
  walletMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  walletIconText: { color: COLORS.text, fontSize: 19 },
  walletCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletName: { color: COLORS.text, fontSize: 13, fontWeight: '800', flexShrink: 1 },
  defaultBadge: { color: COLORS.primary, backgroundColor: COLORS.primaryLight, fontSize: 7, fontWeight: '800', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  walletType: { color: COLORS.secondary, fontSize: 10, textTransform: 'capitalize', marginTop: 4 },
  walletBalance: { color: COLORS.text, fontSize: 12, fontWeight: '800', maxWidth: 110 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7, marginTop: 11, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 9 },
  actionButton: { minWidth: 59, minHeight: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, borderRadius: 9 },
  actionText: { color: COLORS.text, fontSize: 10, fontWeight: '700' },
  deleteButton: { minWidth: 59, minHeight: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.redLight, borderRadius: 9 },
  deleteText: { color: COLORS.red, fontSize: 10, fontWeight: '700' },
  stateCard: { minHeight: 105, backgroundColor: COLORS.white, borderRadius: 15, alignItems: 'center', justifyContent: 'center', padding: 15 },
  stateText: { color: COLORS.secondary, fontSize: 12, marginTop: 8, textAlign: 'center' },
  error: { color: COLORS.red, fontSize: 12, textAlign: 'center' },
  retry: { color: COLORS.primary, fontSize: 11, fontWeight: '800', marginTop: 8 },
  refreshing: { color: COLORS.secondary, fontSize: 10, textAlign: 'center', marginTop: 5 },
});
