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
  const [editingTransaction, setEditingTransaction] = useState(null);
  if (screen === 'AddTransaction') {
    return <AddTransactionScreen currency={currency} onBack={() => setScreen('Home')} onSaved={() => setScreen('Home')} />;
  }
  if (screen === 'AddIncome') {
    return <AddTransactionScreen initialType="income" lockedType currency={currency} onBack={() => setScreen('Home')} onSaved={() => setScreen('Home')} />;
  }
  if (screen === 'AddExpense') {
    return <AddTransactionScreen initialType="expense" lockedType currency={currency} onBack={() => setScreen('Home')} onSaved={() => setScreen('Home')} />;
  }
  if (screen === 'EditTransaction' && editingTransaction) {
    return <AddTransactionScreen transaction={editingTransaction} lockedType currency={currency} onBack={() => { setEditingTransaction(null); setScreen('Transactions'); }} onSaved={() => { setEditingTransaction(null); setScreen('Transactions'); }} />;
  }
  if (screen === 'Transactions') {
    return <TransactionsScreen currency={currency} onBack={() => setScreen('Home')} onEdit={(transaction) => { setEditingTransaction(transaction); setScreen('EditTransaction'); }} />;
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
  return <HomeScreen currency={currency} navigation={{ navigate: (name) => ['AddTransaction', 'AddIncome', 'AddExpense', 'Transactions', 'Reports', 'Budgets', 'Settings'].includes(name) && setScreen(name) }} />;
}
