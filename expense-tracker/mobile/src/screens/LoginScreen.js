import React, { useState } from 'react';
import { createThemeColors, createThemedStyles } from '../theme';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login } from '../api/authApi';

const COLORS = createThemeColors({
  background: '#F6F8FB',
  white: '#FFFFFF',
  primary: '#16A36A',
  text: '#172B24',
  secondary: '#7C8983',
  border: '#EDF0EE',
  error: '#B42318',
});

export default function LoginScreen({ onAuthenticated, onOpenSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      await onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message || 'Unable to connect. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.eyebrow}>EXPENSE TRACKER</Text>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.description}>Log in to continue to your expenses.</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            style={styles.input}
            accessibilityLabel="Email"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="Password"
            onSubmitEditing={submit}
          />

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable
            onPress={submit}
            disabled={submitting}
            accessibilityRole="button"
            style={({ pressed }) => [styles.submit, pressed && styles.pressed, submitting && styles.disabled]}
          >
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Submit</Text>}
          </Pressable>
          <Pressable onPress={onOpenSignup} disabled={submitting} accessibilityRole="button" style={styles.switch}>
            <Text style={styles.switchText}>New here? Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = createThemedStyles({
  safe: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  card: { backgroundColor: COLORS.white, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: COLORS.border },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heading: { color: COLORS.text, fontSize: 25, fontWeight: '800', marginTop: 8 },
  description: { color: COLORS.secondary, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 20 },
  input: { minHeight: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, color: COLORS.text, marginBottom: 11, backgroundColor: COLORS.white },
  error: { color: COLORS.error, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  submit: { minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, marginTop: 4 },
  submitText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.65 },
  switch: { alignItems: 'center', paddingTop: 17, paddingBottom: 3 },
  switchText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
