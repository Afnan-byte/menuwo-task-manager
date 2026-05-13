import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useExpenseStore = create((set, get) => ({
  entries: lsGet(LS_KEYS.EXPENSES),
  loading: false,

  fetchEntries: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      set({ entries: data });
      lsSet(LS_KEYS.EXPENSES, data);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', { event: '*', table: 'expenses' }, () => {
        get().fetchEntries();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  addEntry: async (entry) => {
    const newEntry = { 
      ...entry, 
      id: entry.id || crypto.randomUUID(), 
      created_at: new Date().toISOString() 
    };
    const updatedEntries = [newEntry, ...get().entries];
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isSupabaseConfigured) {
      const dbEntry = {
        id: newEntry.id,
        created_at: newEntry.created_at,
        type: newEntry.type,
        amount: parseFloat(newEntry.amount) || 0,
        category: newEntry.category || null,
        date: (newEntry.date !== '' && newEntry.date != null) ? newEntry.date : null,
        notes: newEntry.notes || null,
      };
      const { error } = await supabase.from('expenses').insert([dbEntry]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateEntry: async (id, updates) => {
    const updatedEntries = get().entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isSupabaseConfigured) {
      const dbUpdates = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.amount !== undefined) dbUpdates.amount = parseFloat(updates.amount) || 0;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.date !== undefined) dbUpdates.date = (updates.date !== '' && updates.date != null) ? updates.date : null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      const { error } = await supabase.from('expenses').update(dbUpdates).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  deleteEntry: async (id) => {
    const updatedEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
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
      const dateVal = e.created_at || e.date;
      const month = dateVal ? new Date(dateVal).toLocaleString('default', { month: 'short', year: 'numeric' }) : 'Unknown';
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
