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
      const { error } = await supabase.from('expenses').insert([newEntry]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateEntry: async (id, updates) => {
    const updatedEntries = get().entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('expenses').update(updates).eq('id', id);
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
}));

export default useExpenseStore;
