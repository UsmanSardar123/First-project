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
import { register } from '../api/authApi';

const COLORS = createThemeColors({
  background: '#F6F8FB',
  white: '#FFFFFF',
  primary: '#16A36A',
  text: '#172B24',
  secondary: '#7C8983',
  border: '#EDF0EE',
  error: '#B42318',
});

const GENDER_OPTIONS = [
  { label: 'Woman', value: 'female' },
  { label: 'Man', value: 'male' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

const WORK_OPTIONS = [
  { label: 'Employee', value: 'employee' },
  { label: 'Business owner', value: 'business-owner' },
  { label: 'Self-employed', value: 'self-employed' },
  { label: 'Student', value: 'student' },
  { label: 'Other', value: 'other' },
];

export default function SignupScreen({ onAuthenticated, onOpenLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('prefer-not-to-say');
  const [profession, setProfession] = useState('');
  const [workType, setWorkType] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setError('');
    const parsedAge = Number(age);
    if (!age.trim() || !Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setError('Enter an age between 1 and 120.');
      return;
    }
    if (!profession.trim()) {
      setError('Enter your profession or job.');
      return;
    }
    if (!workType) {
      setError('Choose the option that best describes your work.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await register(name, email, password, {
        age: parsedAge,
        gender,
        profession: profession.trim(),
        workType,
      });
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
          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.description}>Sign up to keep your expenses in your account.</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            style={styles.input}
            accessibilityLabel="Name"
          />
          <TextInput
            value={age}
            onChangeText={(value) => setAge(value.replace(/[^0-9]/g, ''))}
            placeholder="Age"
            keyboardType="number-pad"
            returnKeyType="next"
            maxLength={3}
            style={styles.input}
            accessibilityLabel="Age"
          />
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.options}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setGender(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: gender === option.value }}
                style={[styles.option, gender === option.value && styles.optionSelected]}
              >
                <Text style={[styles.optionText, gender === option.value && styles.optionTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
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
            value={profession}
            onChangeText={setProfession}
            placeholder="Profession, job, or business"
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={100}
            style={styles.input}
            accessibilityLabel="Profession, job, or business"
          />
          <Text style={styles.fieldLabel}>What best describes your work?</Text>
          <View style={styles.options}>
            {WORK_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setWorkType(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: workType === option.value }}
                style={[styles.option, workType === option.value && styles.optionSelected]}
              >
                <Text style={[styles.optionText, workType === option.value && styles.optionTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoComplete="new-password"
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
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>Create account</Text>}
          </Pressable>
          <Pressable onPress={onOpenLogin} disabled={submitting} accessibilityRole="button" style={styles.switch}>
            <Text style={styles.switchText}>Already registered? Log in</Text>
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
  fieldLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 3, marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  option: { minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 11, justifyContent: 'center' },
  optionSelected: { backgroundColor: '#E5F7EE', borderColor: COLORS.primary },
  optionText: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  optionTextSelected: { color: COLORS.primary },
  error: { color: COLORS.error, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  submit: { minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, marginTop: 4 },
  submitText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.65 },
  switch: { alignItems: 'center', paddingTop: 17, paddingBottom: 3 },
  switchText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
