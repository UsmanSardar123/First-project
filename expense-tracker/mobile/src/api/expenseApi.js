import { API_URL } from '../constants/config';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export async function getExpenses() {
  const res = await fetch(API_URL);
  return handleResponse(res);
}

export async function createExpense(expense) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  return handleResponse(res);
}

export async function updateExpense(id, expense) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  return handleResponse(res);
}

export async function deleteExpense(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

const BUDGETS_URL = API_URL.replace(/\/expenses\/?$/, '/budgets');

export async function getBudgets() {
  const res = await fetch(BUDGETS_URL);
  return handleResponse(res);
}

export async function saveBudget(budget) {
  const res = await fetch(BUDGETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budget),
  });
  return handleResponse(res);
}
