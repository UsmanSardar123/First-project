import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { setThemeMode } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MenuScreen from './src/screens/MenuScreen';
import WalletsScreen from './src/screens/WalletsScreen';
import AuthScreen from './src/screens/AuthScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const TABS = [
  { name: 'Home', label: 'Home', icon: '\u2302' },
  { name: 'Menu', label: 'Menu', icon: '\u2630' },
  { name: 'Transactions', label: 'Transactions', icon: '\u21C4' },
  { name: 'Reports', label: 'Reports', icon: '\u25A4' },
  { name: 'Settings', label: 'Settings', icon: '\u2699' },
];
const ROUTES = ['Home', 'Transactions', 'Reports', 'Settings', 'Profile', 'Menu', 'Budgets', 'Wallets', 'AddTransaction', 'AddIncome', 'AddExpense', 'EditTransaction'];
const THEME_KEY = 'expenseTrackerDarkMode';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { session, loading, signIn, signOut } = useAuth();
  if (loading) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Loading your account…</Text></View>;
  }
  if (!session) return <AuthScreen onAuthenticated={signIn} />;
  return <AuthenticatedApp user={session.user} onLogout={signOut} />;
}

function AuthenticatedApp({ user, onLogout }) {
  const [history, setHistory] = useState(['Home']);
  const [currency, setCurrency] = useState('PKR');
  const [darkMode, setDarkMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionsWalletId, setTransactionsWalletId] = useState(null);
  const screen = history[history.length - 1];

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((savedTheme) => {
        const isDark = savedTheme === 'true';
        setThemeMode(isDark);
        setDarkMode(isDark);
      })
      .catch(() => {});
  }, []);

  const toggleDarkMode = useCallback((value) => {
    setThemeMode(value);
    setDarkMode(value);
    SecureStore.setItemAsync(THEME_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  const openTab = useCallback((name) => {
    if (!TABS.some((tab) => tab.name === name)) return;
    setHistory([name]);
    setEditingTransaction(null);
  }, []);

  const pushScreen = useCallback((name) => {
    if (!ROUTES.includes(name)) return;
    setHistory((current) => [...current, name]);
  }, []);

  const navigate = useCallback((name, options) => {
    if (!ROUTES.includes(name)) return;
    if (TABS.some((tab) => tab.name === name)) {
      if (name === 'Transactions') setTransactionsWalletId(options?.walletId || null);
      openTab(name);
      return;
    }
    pushScreen(name);
  }, [openTab, pushScreen]);

  const goBack = useCallback(() => {
    setEditingTransaction(null);
    setHistory((current) => current.length > 1 ? current.slice(0, -1) : ['Home']);
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'Home') return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack, screen]);

  let content;
  if (['AddTransaction', 'AddIncome', 'AddExpense', 'EditTransaction'].includes(screen)) {
    const edit = screen === 'EditTransaction';
    content = (
      <AddTransactionScreen
        key={edit ? editingTransaction?._id || 'edit' : screen}
        transaction={edit ? editingTransaction : undefined}
        initialType={screen === 'AddIncome' ? 'income' : 'expense'}
        lockedType={screen !== 'AddTransaction'}
        currency={currency}
        onBack={goBack}
        onSaved={goBack}
      />
    );
  } else if (screen === 'Transactions') {
    content = <TransactionsScreen currency={currency} initialWalletId={transactionsWalletId} onBack={goBack} onEdit={(transaction) => { setEditingTransaction(transaction); pushScreen('EditTransaction'); }} />;
  } else if (screen === 'Wallets') {
    content = <WalletsScreen currency={currency} onBack={goBack} />;
  } else if (screen === 'Reports') {
    content = <ReportsScreen currency={currency} onBack={goBack} onTransactions={() => { setTransactionsWalletId(null); pushScreen('Transactions'); }} />;
  } else if (screen === 'Budgets') {
    content = <BudgetsScreen currency={currency} onBack={goBack} />;
  } else if (screen === 'Settings') {
    content = <SettingsScreen currency={currency} onCurrencyChange={setCurrency} onBack={goBack} user={user} onLogout={onLogout} onProfile={() => pushScreen('Profile')} darkMode={darkMode} onDarkModeChange={toggleDarkMode} />;
  } else if (screen === 'Profile') {
    content = <ProfileScreen user={user} onBack={goBack} onLogout={onLogout} />;
  } else if (screen === 'Menu') {
    content = <MenuScreen onBack={goBack} navigation={{ navigate: pushScreen }} />;
  } else {
    content = <HomeScreen currency={currency} user={user} navigation={{ navigate }} darkMode={darkMode} onDarkModeChange={toggleDarkMode} />;
  }

  return (
    <SafeAreaView style={[styles.app, darkMode && styles.appDark]} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.screen}>{content}</View>
      <View style={[styles.navbar, darkMode && styles.navbarDark]} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const selected = screen === tab.name
            || (screen === 'EditTransaction' && tab.name === 'Transactions')
            || (['AddTransaction', 'AddIncome', 'AddExpense'].includes(screen) && tab.name === 'Home')
            || (screen === 'Budgets' && tab.name === 'Menu')
            || (screen === 'Wallets' && tab.name === 'Home');
          const selectedTab = selected || (screen === 'Profile' && tab.name === 'Settings');
          return (
            <Pressable
              key={tab.name}
              onPress={() => openTab(tab.name)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: selectedTab }}
              hitSlop={4}
              style={({ pressed }) => [styles.navItem, selectedTab && (darkMode ? styles.navItemActiveDark : styles.navItemActive), pressed && styles.navItemPressed]}
            >
              <Text style={[styles.navIcon, darkMode && styles.navTextDark, selectedTab && (darkMode ? styles.navActiveDark : styles.navActive)]}>{tab.icon}</Text>
              <Text style={[styles.navLabel, darkMode && styles.navTextDark, selectedTab && (darkMode ? styles.navActiveDark : styles.navActive)]} numberOfLines={1}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#F6F8FB', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#7C8983', fontSize: 13 },
  app: { flex: 1, backgroundColor: '#F6F8FB' },
  appDark: { backgroundColor: '#111A17' },
  screen: { flex: 1 },
  navbar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EDF0EE', paddingHorizontal: 5, paddingTop: 7, paddingBottom: 5 },
  navbarDark: { backgroundColor: '#18231F', borderTopColor: '#293831' },
  navItem: { flex: 1, minWidth: 0, minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  navItemActive: { backgroundColor: '#E5F7EE' },
  navItemActiveDark: { backgroundColor: '#233832' },
  navItemPressed: { opacity: 0.72 },
  navIcon: { color: '#7C8983', fontSize: 19, lineHeight: 22, fontWeight: '700' },
  navLabel: { color: '#7C8983', fontSize: 9, fontWeight: '700', marginTop: 2 },
  navActive: { color: '#16A36A' },
  navActiveDark: { color: '#58B99D' },
  navTextDark: { color: '#A9B9B0' },
});
