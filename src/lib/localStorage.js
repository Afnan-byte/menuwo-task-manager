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
};

export function lsGet(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
}
