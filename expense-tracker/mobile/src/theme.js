let darkModeEnabled = false;

const DARK_COLORS = {
  '#16A36A': '#58B99D',
  '#F6F8FB': '#111A17',
  '#FFFFFF': '#1B2923',
  '#172B24': '#F1F5F2',
  '#7C8983': '#A9B9B0',
  '#EDF0EE': '#2B3A33',
  '#E5F7EE': '#233832',
  '#CBEEDB': '#36564B',
  '#BDE8D0': '#36564B',
  '#F2F4F3': '#202F28',
  '#BCEBD2': '#3B7255',
  '#FCECEE': '#3B2529',
  '#FFF1DC': '#3A3023',
  '#FFF2E5': '#3A3023',
  '#FFE0B2': '#58452F',
  '#FCFDFC': '#202F28',
  '#F0F2F1': '#202F28',
  '#EDF1EF': '#202F28',
  '#777777': '#A9B9B0',
};

export function setThemeMode(isDark) {
  darkModeEnabled = Boolean(isDark);
}

export function isDarkMode() {
  return darkModeEnabled;
}

function themedValue(value) {
  if (typeof value === 'string' && darkModeEnabled) {
    let color = value.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(color)) color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    return DARK_COLORS[color] || value;
  }
  if (Array.isArray(value)) return value.map(themedValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, themedValue(item)]));
  }
  return value;
}

export function createThemeColors(colors) {
  return new Proxy(colors, {
    get(target, key) {
      return themedValue(target[key]);
    },
  });
}

export function createThemedStyles(styles) {
  return new Proxy(styles, {
    get(target, key) {
      return themedValue(target[key]);
    },
  });
}
