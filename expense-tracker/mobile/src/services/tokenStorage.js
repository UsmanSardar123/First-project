import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'expense-tracker-session';

export async function getSession() {
  const savedSession = await SecureStore.getItemAsync(SESSION_KEY);
  if (!savedSession) return null;

  try {
    const session = JSON.parse(savedSession);
    return session?.token && session?.user ? session : null;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export function saveSession(session) {
  return SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  return SecureStore.deleteItemAsync(SESSION_KEY);
}
