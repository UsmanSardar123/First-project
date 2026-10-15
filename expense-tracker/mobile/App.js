import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import React, { useState } from 'react';

export default function App() {
  const [screen, setScreen] = useState('Home');
  const [currency, setCurrency] = useState('PKR');
  if (screen === 'AddTransaction') {
    return <AddTransactionScreen currency={currency} onBack={() => setScreen('Home')} onSaved={() => setScreen('Home')} />;
  }
  if (screen === 'Transactions') {
    return <TransactionsScreen currency={currency} onBack={() => setScreen('Home')} />;
  }
  if (screen === 'Reports') {
    return <ReportsScreen currency={currency} onBack={() => setScreen('Home')} onTransactions={() => setScreen('Transactions')} />;
  }
  if (screen === 'Budgets') {
    return <BudgetsScreen currency={currency} onBack={() => setScreen('Home')} />;
  }
  if (screen === 'Settings') {
    return <SettingsScreen currency={currency} onCurrencyChange={setCurrency} onBack={() => setScreen('Home')} />;
  }
  return <HomeScreen currency={currency} navigation={{ navigate: (name) => ['AddTransaction', 'Transactions', 'Reports', 'Budgets', 'Settings'].includes(name) && setScreen(name) }} />;
}
