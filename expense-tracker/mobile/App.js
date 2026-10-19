import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MenuScreen from './src/screens/MenuScreen';

const TABS = [
  { name: 'Home', label: 'Home', icon: '⌂' },
  { name: 'Menu', label: 'Menu', icon: '☰' },
  { name: 'Transactions', label: 'Transactions', icon: '▤' },
  { name: 'Reports', label: 'Reports', icon: '▥' },
  { name: 'Settings', label: 'Settings', icon: '⚙' },
];
const ROUTES = ['Home', 'Transactions', 'Reports', 'Settings', 'Menu', 'Budgets', 'AddTransaction', 'AddIncome', 'AddExpense', 'EditTransaction'];

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <AuthenticatedApp />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const { user, loading, initializationError } = useAuth();
  const [history, setHistory] = useState(['Home']);
  const [currency, setCurrency] = useState('PKR');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const screen = history[history.length - 1];

  const openTab = useCallback((name) => {
    if (!TABS.some((tab) => tab.name === name)) return;
    setHistory([name]);
    setEditingTransaction(null);
  }, []);

  const pushScreen = useCallback((name) => {
    if (!ROUTES.includes(name)) return;
    setHistory((current) => [...current, name]);
  }, []);

  const navigate = useCallback((name) => {
    if (!ROUTES.includes(name)) return;
    if (TABS.some((tab) => tab.name === name)) {
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
    if (!user || loading) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'Home') return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack, loading, screen, user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.app} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.gate}>
          <ActivityIndicator size="large" color="#16A36A" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.app} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.gate}>
          <Text style={styles.gateText}>
            {initializationError || 'Sign in to access your expenses.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
    content = <TransactionsScreen currency={currency} onBack={goBack} onEdit={(transaction) => { setEditingTransaction(transaction); pushScreen('EditTransaction'); }} />;
  } else if (screen === 'Reports') {
    content = <ReportsScreen currency={currency} onBack={goBack} onTransactions={() => pushScreen('Transactions')} />;
  } else if (screen === 'Budgets') {
    content = <BudgetsScreen currency={currency} onBack={goBack} />;
  } else if (screen === 'Settings') {
    content = <SettingsScreen currency={currency} onCurrencyChange={setCurrency} onBack={goBack} />;
  } else if (screen === 'Menu') {
    content = <MenuScreen onBack={goBack} navigation={{ navigate: pushScreen }} />;
  } else {
    content = <HomeScreen currency={currency} navigation={{ navigate }} />;
  }

  return (
    <SafeAreaView style={styles.app} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.screen}>{content}</View>
      <View style={styles.navbar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const selected = screen === tab.name
            || (screen === 'EditTransaction' && tab.name === 'Transactions')
            || (['AddTransaction', 'AddIncome', 'AddExpense'].includes(screen) && tab.name === 'Home')
            || (screen === 'Budgets' && tab.name === 'Menu');
          return (
            <Pressable
              key={tab.name}
              onPress={() => openTab(tab.name)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              hitSlop={4}
              style={({ pressed }) => [styles.navItem, selected && styles.navItemActive, pressed && styles.navItemPressed]}
            >
              <Text style={[styles.navIcon, selected && styles.navActive]}>{tab.icon}</Text>
              <Text style={[styles.navLabel, selected && styles.navActive]} numberOfLines={1}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#F6F8FB' },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  gateText: { color: '#172B24', fontSize: 15, textAlign: 'center' },
  screen: { flex: 1 },
  navbar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EDF0EE', paddingHorizontal: 5, paddingTop: 7, paddingBottom: 5 },
  navItem: { flex: 1, minWidth: 0, minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  navItemActive: { backgroundColor: '#E5F7EE' },
  navItemPressed: { opacity: 0.72 },
  navIcon: { color: '#7C8983', fontSize: 19, lineHeight: 22, fontWeight: '700' },
  navLabel: { color: '#7C8983', fontSize: 9, fontWeight: '700', marginTop: 2 },
  navActive: { color: '#16A36A' },
});
