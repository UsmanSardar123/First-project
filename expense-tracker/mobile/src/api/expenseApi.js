import { API_URL } from '../constants/config';
import { request } from './client';

export async function getExpenses(type, walletId) {
  const params = [];
  if (type) params.push(`type=${encodeURIComponent(type)}`);
  if (walletId) params.push(`walletId=${encodeURIComponent(walletId)}`);
  const endpoint = params.length ? `${API_URL}?${params.join('&')}` : API_URL;
  return request(endpoint);
}

export async function getSummary(month, walletId) {
  const params = [`month=${encodeURIComponent(month)}`];
  if (walletId) params.push(`walletId=${encodeURIComponent(walletId)}`);
  return request(`${API_URL}/summary?${params.join('&')}`);
}

export async function createExpense(expense, walletId) {
  return request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(walletId ? { ...expense, walletId } : expense),
  });
}

export async function updateExpense(id, expense) {
  return request(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(id) {
  return request(`${API_URL}/${id}`, { method: 'DELETE' });
}

const BUDGETS_URL = API_URL.replace(/\/expenses\/?$/, '/budgets');

export async function getBudgets() {
  return request(BUDGETS_URL);
}

export async function saveBudget(budget) {
  return request(BUDGETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budget),
  });
}
