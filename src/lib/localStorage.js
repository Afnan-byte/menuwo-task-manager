// Local storage keys
export const LS_KEYS = {
  TASKS: 'menuwo_tasks',
  LEADS: 'menuwo_leads',
  EXPENSES: 'menuwo_expenses',
  NOTES: 'menuwo_notes',
  ORDERS: 'menuwo_orders',
  CONTENT: 'menuwo_content',
  PROFILE: 'menuwo_profile',
  ACTIVITY: 'menuwo_activity',
  INVOICES: 'menuwo_invoices',
};

export function lsGet(key) {
  try {
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : [];
    return parsed || [];
  } catch {
    return [];
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

export function lsGetObj(key, defaultVal = {}) {
  try {
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : defaultVal;
    return parsed || defaultVal;
  } catch {
    return defaultVal;
  }
}
