import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'authToken';

export function saveToken(token) {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function clearToken() {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}
