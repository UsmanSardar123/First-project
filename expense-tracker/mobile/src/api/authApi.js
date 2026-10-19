import { API_URL } from '../constants/config';
import { request } from './client';

const API_BASE_URL = API_URL.replace(/\/api\/expenses\/?$/, '');

function post(endpoint, body) {
  return request(`${API_BASE_URL}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function register(details) {
  return post('register', details);
}

export function login(credentials) {
  return post('login', credentials);
}

export function googleLogin(idToken) {
  return post('google', { idToken });
}

export function me() {
  return request(`${API_BASE_URL}/auth/me`);
}
