import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const COLORS = {
  background: '#F6F8FB',
  white: '#FFFFFF',
  primary: '#16A36A',
  primaryLight: '#E5F7EE',
  text: '#172B24',
  secondary: '#7C8983',
  border: '#EDF0EE',
  error: '#B42318',
};

const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};
const platformGoogleClientId = Platform.select({
  web: GOOGLE_CLIENT_IDS.web,
  android: GOOGLE_CLIENT_IDS.android,
  ios: GOOGLE_CLIENT_IDS.ios,
  default: undefined,
});

function GoogleSignInButton({ busy, onIdToken, onError }) {
  const [request, , promptAsync] = useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    selectAccount: true,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleGooglePress() {
    if (!request) {
      onError('Google sign-in is still preparing. Please try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await promptAsync();
      if (response.type === 'success') {
        const idToken = response.params?.id_token;
        if (!idToken) {
          onError('Google did not return an ID token. Please try again.');
          return;
        }

        await onIdToken(idToken);
      } else if (response.type === 'error') {
        onError('Google sign-in failed. Please try again.');
      }
    } catch (error) {
      onError(error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = busy || submitting;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={handleGooglePress}
      style={({ pressed }) => [
        styles.googleButton,
        (disabled || pressed) && styles.buttonDisabled,
      ]}
    >
      {(busy || submitting) ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <View style={styles.googleButtonContent}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function AuthScreen() {
  const { login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  function validate() {
    if (isRegister && !name.trim()) return 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Enter a valid email address.';
    }
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return '';
  }

  async function submit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        await register({ name: name.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>EXPENSE TRACKER</Text>
          <Text style={styles.title}>{isRegister ? 'Create account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isRegister ? 'Sign up to manage your expenses.' : 'Sign in to continue to your expenses.'}
          </Text>

          {isRegister && (
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                autoComplete="name"
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={COLORS.secondary}
                style={styles.input}
                value={name}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.secondary}
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.secondary}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                textContentType={isRegister ? 'newPassword' : 'password'}
                value={password}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((shown) => !shown)}
                hitSlop={8}
              >
                <Text style={styles.showPassword}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={submit}
            style={({ pressed }) => [
              styles.primaryButton,
              (busy || pressed) && styles.buttonDisabled,
            ]}
          >
            {busy ? <ActivityIndicator color={COLORS.white} /> : (
              <Text style={styles.primaryButtonText}>{isRegister ? 'Create account' : 'Sign in'}</Text>
            )}
          </Pressable>

          {platformGoogleClientId ? (
            <GoogleSignInButton busy={busy} onIdToken={googleLogin} onError={setError} />
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                disabled={busy}
                onPress={() => setError(
                  `Google sign-in needs the ${Platform.OS} OAuth client ID. Configure it in the app environment, then restart the app.`
                )}
                style={({ pressed }) => [
                  styles.googleButton,
                  (busy || pressed) && styles.buttonDisabled,
                ]}
              >
                <View style={styles.googleButtonContent}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              </Pressable>
              <Text style={styles.googleSetup}>
                Configure the Google client ID for this platform to enable sign-in.
              </Text>
            </>
          )}
          {platformGoogleClientId ? (
            <Text style={styles.googleSetup}>
              New here? We’ll create your account when you continue with Google.
            </Text>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => changeMode(isRegister ? 'login' : 'register')}
              hitSlop={8}
            >
              <Text style={styles.switchAction}>{isRegister ? 'Sign in' : 'Create one'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 22 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '800', marginTop: 10 },
  subtitle: { color: COLORS.secondary, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 20 },
  field: { marginTop: 13 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, color: COLORS.text, fontSize: 14 },
  passwordRow: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  showPassword: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginLeft: 8 },
  error: { color: COLORS.error, fontSize: 12, lineHeight: 18, marginTop: 12 },
  primaryButton: { minHeight: 49, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  googleButton: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: '#A8C7FA', backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  googleButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleIcon: { color: '#4285F4', backgroundColor: COLORS.white, width: 25, height: 25, borderRadius: 13, textAlign: 'center', textAlignVertical: 'center', fontSize: 17, lineHeight: 25, fontWeight: '800', overflow: 'hidden' },
  googleButtonText: { color: '#174EA6', fontSize: 13, fontWeight: '800' },
  googleSetup: { color: COLORS.secondary, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 14 },
  buttonDisabled: { opacity: 0.65 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 20 },
  switchText: { color: COLORS.secondary, fontSize: 12 },
  switchAction: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
});
