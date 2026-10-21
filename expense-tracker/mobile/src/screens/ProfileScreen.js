import React from 'react';
import { createThemeColors, createThemedStyles, isDarkMode } from '../theme';
import {
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';

const COLORS = createThemeColors({
  background: '#F6F8FB',
  white: '#FFFFFF',
  primary: '#16A36A',
  primaryLight: '#E5F7EE',
  text: '#172B24',
  secondary: '#7C8983',
  border: '#EDF0EE',
  red: '#C7434B',
});

const GENDER_LABELS = {
  female: 'Woman',
  male: 'Man',
  'non-binary': 'Non-binary',
  'prefer-not-to-say': 'Prefer not to say',
};

const WORK_LABELS = {
  employee: 'Employee',
  'business-owner': 'Business owner',
  'self-employed': 'Self-employed',
  student: 'Student',
  other: 'Other',
};

function InfoItem({ label, value }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value || 'Not added yet'}</Text>
    </View>
  );
}

function AccountRow({ label, value }) {
  return (
    <View style={styles.accountRow}>
      <View style={styles.accountCopy}>
        <Text style={styles.accountLabel}>{label}</Text>
        <Text style={styles.accountValue} numberOfLines={2}>{value || 'Not available'}</Text>
      </View>
      <Text style={styles.rowMark}>›</Text>
    </View>
  );
}

export default function ProfileScreen({ user, onBack, onLogout }) {
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const age = Number.isInteger(user?.age) ? `${user.age} years` : undefined;
  const gender = GENDER_LABELS[user?.gender];
  const workType = WORK_LABELS[user?.workType];
  const signInMethod = user?.provider === 'google' ? 'Google' : 'Email and password';

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode() ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>{user?.name || 'Your name'}</Text>
          <Text style={styles.email} numberOfLines={2}>{user?.email || 'Email not available'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal info</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Age" value={age} />
            <InfoItem label="Gender" value={gender} />
            <InfoItem label="Profession" value={user?.profession?.trim()} />
            <InfoItem label="Work type" value={workType} />
          </View>
        </View>

        <Text style={styles.sectionHeading}>ACCOUNT</Text>
        <View style={styles.card}>
          <AccountRow label="Email address" value={user?.email} />
          <View style={styles.divider} />
          <AccountRow label="Sign-in method" value={signInMethod} />
        </View>

        <Pressable onPress={onLogout} accessibilityRole="button" style={({ pressed }) => [styles.logoutRow, pressed && styles.pressed]}>
          <Text style={styles.logoutText}>Log out</Text>
          <Text style={styles.logoutMark}>›</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  backText: { color: COLORS.text, fontSize: 28, lineHeight: 32 },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  headerSpacer: { width: 44 },
  identity: { alignItems: 'center', paddingTop: 4, paddingBottom: 22 },
  avatar: { width: 94, height: 94, borderRadius: 47, backgroundColor: COLORS.primaryLight, borderWidth: 3, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 2 },
  avatarText: { color: COLORS.primary, fontSize: 36, fontWeight: '800' },
  name: { maxWidth: '100%', color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  email: { color: COLORS.secondary, fontSize: 12, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 14 },
  sectionTitle: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginBottom: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  infoItem: { width: '50%', paddingRight: 10 },
  infoLabel: { color: COLORS.secondary, fontSize: 10, marginBottom: 4 },
  infoValue: { color: COLORS.text, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  sectionHeading: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
  accountRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  accountCopy: { flex: 1, paddingVertical: 8 },
  accountLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  accountValue: { color: COLORS.secondary, fontSize: 10, marginTop: 3 },
  rowMark: { color: COLORS.secondary, fontSize: 21, marginLeft: 10 },
  divider: { height: 1, backgroundColor: COLORS.border },
  logoutRow: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoutText: { color: COLORS.red, fontSize: 12, fontWeight: '700' },
  logoutMark: { color: COLORS.secondary, fontSize: 21 },
  pressed: { opacity: 0.7 },
});
