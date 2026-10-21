export type ExpenseType = 'expense' | 'income';
export type WalletType = 'cash' | 'bank' | 'mobile' | 'card' | 'other';

export interface Expense {
  _id?: string;
  title: string;
  amount: number;
  type?: ExpenseType;
  category?: string;
  date?: string;
  notes?: string;
  paymentMethod?: string;
  walletId?: string;
}

export interface Wallet {
  _id: string;
  name: string;
  type: WalletType;
  openingBalance: number;
  color: string;
  icon: string;
  isDefault: boolean;
  archived: boolean;
  balance: number;
}

export interface WalletInput {
  name: string;
  type: WalletType;
  openingBalance?: number;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}
