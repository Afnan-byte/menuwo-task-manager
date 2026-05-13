import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';

const useExpenseStore = create((set, get) => ({
  entries: lsGet(LS_KEYS.EXPENSES),

  setEntries: (entries) => { lsSet(LS_KEYS.EXPENSES, entries); set({ entries }); },

  addEntry: (entry) => {
    const entries = [{ ...entry, id: entry.id || crypto.randomUUID(), createdAt: new Date().toISOString() }, ...get().entries];
    lsSet(LS_KEYS.EXPENSES, entries);
    set({ entries });
  },

  updateEntry: (id, updates) => {
    const entries = get().entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    lsSet(LS_KEYS.EXPENSES, entries);
    set({ entries });
  },

  deleteEntry: (id) => {
    const entries = get().entries.filter((e) => e.id !== id);
    lsSet(LS_KEYS.EXPENSES, entries);
    set({ entries });
  },

  getSummary: () => {
    const entries = get().entries;
    const revenue = entries.filter((e) => e.type === 'revenue').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const expenses = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return { revenue, expenses, profit: revenue - expenses };
  },

  getByMonth: () => {
    const entries = get().entries;
    const monthMap = {};
    entries.forEach((e) => {
      const month = e.date ? new Date(e.date).toLocaleString('default', { month: 'short', year: '2-digit' }) : 'Unknown';
      if (!monthMap[month]) monthMap[month] = { month, revenue: 0, expenses: 0 };
      if (e.type === 'revenue') monthMap[month].revenue += parseFloat(e.amount) || 0;
      else monthMap[month].expenses += parseFloat(e.amount) || 0;
    });
    return Object.values(monthMap).slice(-6);
  },

  getByCategory: () => {
    const entries = get().entries.filter((e) => e.type === 'expense');
    const catMap = {};
    entries.forEach((e) => {
      const cat = e.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + (parseFloat(e.amount) || 0);
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  },
}));

export default useExpenseStore;
