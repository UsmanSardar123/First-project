import { API_URL } from '../constants/config';
import { request } from './client';
import type { Wallet, WalletInput } from '../types/transaction';

const WALLETS_URL = API_URL.replace(/\/expenses\/?$/, '/wallets');

export async function getWallets(includeArchived = false): Promise<Wallet[]> {
  const query = includeArchived ? '?includeArchived=true' : '';
  return request(`${WALLETS_URL}${query}`);
}

export async function createWallet(wallet: WalletInput): Promise<Wallet> {
  return request(WALLETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wallet),
  });
}

export async function updateWallet(id: string, wallet: Partial<WalletInput>): Promise<Wallet> {
  return request(`${WALLETS_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wallet),
  });
}

export async function archiveWallet(id: string): Promise<Wallet> {
  return request(`${WALLETS_URL}/${encodeURIComponent(id)}/archive`, { method: 'PATCH' });
}

export async function deleteWallet(id: string): Promise<{ message: string }> {
  return request(`${WALLETS_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
