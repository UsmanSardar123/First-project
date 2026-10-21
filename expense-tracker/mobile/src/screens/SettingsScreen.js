import React from 'react';
import { createThemeColors, createThemedStyles } from '../theme';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  View,
} from 'react-native';
import { CURRENCIES } from '../constants/currency';

const COLORS = createThemeColors({
  background: '#F6F8FB', white: '#FFFFFF', primary: '#16A36A',
  primaryLight: '#E5F7EE', text: '#172B24', secondary: '#7C8983',
  border: '#EDF0EE', red: '#C7434B',
});

function SettingsLink({ title, description, onPress, destructive = false, darkMode = false }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
      <View style={styles.linkCopy}>
        <Text style={[styles.linkTitle, darkMode && styles.darkText, destructive && styles.destructive]}>{title}</Text>
        {description ? <Text style={[styles.description, darkMode && styles.darkMuted]}>{description}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function SettingsScreen({ onBack, currency, onCurrencyChange, user, onLogout, onProfile, darkMode = false, onDarkModeChange }) {
  const showAccessibilityInfo = () => Alert.alert(
    'Accessibility',
    'The app supports your device’s screen reader and system text-size settings. You can manage these in your device’s Accessibility settings.',
  );
  const showHelpInfo = () => Alert.alert(
    'Help and feedback',
    'For help with your account, open your profile to check the account email and sign-in method.',
  );
  const showPrivacyInfo = () => Alert.alert(
    'Privacy and security',
    'Your account and sign-in options are available in your profile. Sign out to end this session on this device.',
  );

  return (
    <View style={[styles.safeArea, darkMode && styles.darkBackground]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={darkMode ? '#111A17' : COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to previous screen" hitSlop={8} style={({ pressed }) => [styles.backButton, darkMode && styles.darkCard, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PREFERENCES</Text>
            <Text style={[styles.heading, darkMode && styles.darkText]}>Settings</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>ACCOUNT</Text>
        <View style={[styles.card, darkMode && styles.darkCard]}>
          <View style={styles.accountHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</Text></View>
            <View style={styles.accountCopy}>
              <Text style={[styles.accountName, darkMode && styles.darkText]} numberOfLines={1}>{user?.name || 'Your account'}</Text>
              <Text style={[styles.description, darkMode && styles.darkMuted]} numberOfLines={2}>{user?.email || 'Email not available'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <SettingsLink title="Profile" description="Personal details and sign-in method" onPress={onProfile} darkMode={darkMode} />
          <View style={styles.divider} />
          <SettingsLink title="Privacy and security" description="Account and session information" onPress={showPrivacyInfo} darkMode={darkMode} />
          <View style={styles.divider} />
          <SettingsLink title="Log out" onPress={onLogout} destructive darkMode={darkMode} />
        </View>

        <Text style={styles.sectionHeading}>PREFERENCES</Text>
        <View style={[styles.card, darkMode && styles.darkCard]}>
          <View style={styles.themeRow}>
            <View style={styles.linkCopy}>
              <Text style={[styles.cardTitle, darkMode && styles.darkText]}>Dark mode</Text>
              <Text style={[styles.description, darkMode && styles.darkMuted]}>Use a darker app appearance</Text>
            </View>
            <Switch value={darkMode} onValueChange={onDarkModeChange} accessibilityLabel="Dark mode" trackColor={{ false: '#D6DED9', true: darkMode ? '#58B99D' : '#16A36A' }} thumbColor="#FFFFFF" />
          </View>
          <View style={[styles.divider, styles.themeDivider]} />
          <Text style={[styles.cardTitle, darkMode && styles.darkText]}>Currency display</Text>
          <Text style={[styles.description, darkMode && styles.darkMuted]}>Choose the currency label and number format used for amounts.</Text>
          <View style={styles.options}>
            {CURRENCIES.map((item) => {
              const selected = item.code === currency;
              return (
                <Pressable key={item.code} onPress={() => onCurrencyChange(item.code)} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.option, darkMode && styles.darkOption, selected && styles.optionSelected]}>
                  <View style={styles.optionCopy}>
                    <Text style={[styles.currencyName, darkMode && styles.darkText, selected && styles.selectedText]}>{item.name}</Text>
                    <Text style={[styles.currencyCode, darkMode && styles.darkMuted]}>{item.code}</Text>
                  </View>
                  <Text style={[styles.symbol, selected && styles.selectedText]}>{selected ? '✓' : item.symbol}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.note, darkMode && styles.darkMuted]}>Currency changes the displayed label only. It does not convert stored amounts.</Text>
        </View>

        <Text style={styles.sectionHeading}>SUPPORT</Text>
        <View style={[styles.card, darkMode && styles.darkCard]}>
          <SettingsLink title="Accessibility" description="Uses your device’s screen reader and text-size settings" onPress={showAccessibilityInfo} darkMode={darkMode} />
          <View style={styles.divider} />
          <SettingsLink title="Help and feedback" description="Account help and sign-in information" onPress={showHelpInfo} darkMode={darkMode} />
        </View>
        <Text style={styles.footer}>Expense Tracker</Text>
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  darkBackground: { backgroundColor: '#111A17' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backText: { color: COLORS.text, fontSize: 28, lineHeight: 32 },
  darkText: { color: '#F1F5F2' },
  darkMuted: { color: '#A9B9B0' },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  sectionHeading: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 18 },
  darkCard: { backgroundColor: '#1B2923', borderColor: '#2B3A33' },
  themeRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  themeDivider: { marginTop: 10, marginBottom: 14 },
  accountHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: COLORS.primary, fontSize: 19, fontWeight: '800' },
  accountCopy: { flex: 1, minWidth: 0 },
  accountName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  description: { color: COLORS.secondary, fontSize: 11, lineHeight: 16, marginTop: 4 },
  divider: { height: 1, backgroundColor: COLORS.border },
  linkRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  linkCopy: { flex: 1, paddingRight: 10 },
  linkTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  destructive: { color: COLORS.red },
  chevron: { color: COLORS.secondary, fontSize: 22 },
  cardTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  options: { gap: 8, marginTop: 14 },
  option: { minHeight: 54, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionSelected: { borderColor: '#BDE8D0', backgroundColor: COLORS.primaryLight },
  darkOption: { borderColor: '#34463C', backgroundColor: '#202F28' },
  optionCopy: { flex: 1 },
  currencyName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  currencyCode: { color: COLORS.secondary, fontSize: 10, marginTop: 3 },
  symbol: { color: COLORS.secondary, fontSize: 15, fontWeight: '800' },
  selectedText: { color: COLORS.primary },
  note: { color: COLORS.secondary, fontSize: 10, lineHeight: 15, marginTop: 12 },
  footer: { color: COLORS.secondary, fontSize: 10, textAlign: 'center', marginTop: -2 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.99 }] },
});
