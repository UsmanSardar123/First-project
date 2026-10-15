export const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani rupee', symbol: 'Rs.', locale: 'en-PK' },
  { code: 'USD', name: 'US dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British pound', symbol: '£', locale: 'en-GB' },
];

export function currencySymbol(code = 'PKR') {
  return CURRENCIES.find((item) => item.code === code)?.symbol || 'Rs.';
}

export function formatCurrency(amount, code = 'PKR') {
  const currency = CURRENCIES.find((item) => item.code === code) || CURRENCIES[0];
  const number = new Intl.NumberFormat(currency.locale, { maximumFractionDigits: 0 }).format(Math.abs(Number(amount) || 0));
  return `${currency.symbol} ${number}`;
}
