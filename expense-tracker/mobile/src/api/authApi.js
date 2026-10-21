import { API_URL } from '../constants/config';
import { request } from './client';

const AUTH_URL = API_URL.replace(/\/api\/expenses\/?$/, '/api/auth');

export async function register(name, email, password, profile = {}) {
  return request(`${AUTH_URL}/register`, {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, ...profile }),
  });
}

export async function login(email, password) {
  return request(`${AUTH_URL}/login`, {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}
