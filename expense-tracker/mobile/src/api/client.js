import { getToken } from '../services/tokenStorage';

let onUnauthorized = null;

export function registerOnUnauthorized(callback) {
  onUnauthorized = callback;
}

export async function request(endpoint, options = {}) {
  const token = await getToken();
  const headers = { ...options.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && onUnauthorized) {
    await onUnauthorized();
  }

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed (${response.status}) at ${endpoint}`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}
