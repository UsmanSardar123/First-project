import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CURRENCIES } from '../constants/currency';

const COLORS = {
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983',
  border: '#EDF0EE',
};

export default function SettingsScreen({ onBack, currency, onCurrencyChange }) {
  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to previous screen" hitSlop={8} style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>PREFERENCES</Text><Text style={styles.heading}>Settings</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Currency display</Text>
          <Text style={styles.description}>Choose the currency label shown for amounts in the app.</Text>
          <View style={styles.options}>
            {CURRENCIES.map((item) => {
              const selected = item.code === currency;
              return (
                <Pressable key={item.code} onPress={() => onCurrencyChange(item.code)} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.option, selected && styles.optionSelected]}>
                  <View style={styles.optionCopy}>
                    <Text style={[styles.currencyName, selected && styles.selectedText]}>{item.name}</Text>
                    <Text style={styles.currencyCode}>{item.code}</Text>
                  </View>
                  <Text style={[styles.symbol, selected && styles.selectedText]}>{item.symbol}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>This changes the displayed label and number format only. Amounts are not converted, and this choice lasts until the app is closed.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.description}>No sign-in or account settings are configured in this app.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  backText: { color: COLORS.text, fontSize: 30, lineHeight: 34 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  description: { color: COLORS.secondary, fontSize: 11, lineHeight: 17, marginTop: 6 },
  options: { gap: 8, marginTop: 16 },
  option: { minHeight: 58, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionSelected: { borderColor: '#BDE8D0', backgroundColor: COLORS.primaryLight },
  optionCopy: { flex: 1 },
  currencyName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  currencyCode: { color: COLORS.secondary, fontSize: 10, marginTop: 3 },
  symbol: { color: COLORS.secondary, fontSize: 16, fontWeight: '800' },
  selectedText: { color: COLORS.primary },
  note: { color: COLORS.secondary, fontSize: 10, lineHeight: 15, marginTop: 14 },
});
