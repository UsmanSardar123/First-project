import { getSession } from '../services/tokenStorage';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function request(endpoint, options = {}) {
  const { auth = true, ...fetchOptions } = options;
  const headers = { ...fetchOptions.headers };
  if (auth) {
    const session = await getSession();
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(endpoint, { ...fetchOptions, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && auth && unauthorizedHandler) {
      await unauthorizedHandler();
    }
    const error = new Error(
      data.message || `Request failed (${response.status}) at ${endpoint}`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}
