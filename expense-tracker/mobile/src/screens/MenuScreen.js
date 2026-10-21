import React from 'react';
import { createThemeColors, createThemedStyles, isDarkMode } from '../theme';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';

const COLORS = createThemeColors({
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983', border: '#EDF0EE',
});

const ACTIONS = [
  { title: 'Reports', description: 'Review monthly totals and spending by category', icon: '▥', screen: 'Reports' },
  { title: 'Budgets', description: 'Set monthly limits and track category spending', icon: '◎', screen: 'Budgets' },
  { title: 'Add income', description: 'Record salary or other money received', icon: '↗', screen: 'AddIncome' },
  { title: 'Add expense', description: 'Record a purchase or bill', icon: '↘', screen: 'AddExpense' },
  { title: 'All transactions', description: 'Search, review, and manage your activity', icon: '↔', screen: 'Transactions' },
];

export default function MenuScreen({ onBack, navigation }) {
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode() ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to dashboard" hitSlop={8} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MORE TOOLS</Text>
            <Text style={styles.heading}>Menu</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Manage your money</Text>
        <View style={styles.card}>
          {ACTIONS.map((action, index) => (
            <Pressable
              key={action.screen}
              onPress={() => navigation?.navigate?.(action.screen)}
              accessibilityRole="button"
              accessibilityLabel={action.title}
              hitSlop={4}
              style={({ pressed }) => [styles.action, index < ACTIONS.length - 1 && styles.actionDivider, pressed && styles.pressed]}
            >
              <View style={styles.icon}><Text style={styles.iconText}>{action.icon}</Text></View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backText: { color: COLORS.text, fontSize: 28, lineHeight: 32 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14 },
  action: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: COLORS.primary, fontSize: 20, fontWeight: '800' },
  actionCopy: { flex: 1 },
  actionTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  actionDescription: { color: COLORS.secondary, fontSize: 10 },
  arrow: { color: COLORS.secondary, fontSize: 24, marginLeft: 4 },
  pressed: { opacity: 0.65 },
});
