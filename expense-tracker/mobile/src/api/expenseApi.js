import { API_URL } from '../constants/config';
import { request } from './client';

export async function getExpenses() {
  return request(API_URL);
}

export async function createExpense(expense) {
  return request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
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
