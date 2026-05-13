import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useContentStore = create((set, get) => ({
  items: lsGet(LS_KEYS.CONTENT),
  loading: false,

  fetchItems: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    const { data, error } = await supabase.from('content').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      set({ items: data });
      lsSet(LS_KEYS.CONTENT, data);
    }
    set({ loading: false });
  },

  addItem: async (item) => {
    const newItem = { 
      ...item, 
      id: item.id || crypto.randomUUID(), 
      created_at: new Date().toISOString() 
    };
    const updatedItems = [newItem, ...get().items];
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('content').insert([newItem]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateItem: async (id, updates) => {
    const updatedItems = get().items.map((i) => (i.id === id ? { ...i, ...updates } : i));
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('content').update(updates).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  deleteItem: async (id) => {
    const updatedItems = get().items.filter((i) => i.id !== id);
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('content').delete().eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  getByStatus: (status) => get().items.filter((i) => i.status === status),
  getByType: (type) => get().items.filter((i) => i.type === type),
}));

export default useContentStore;
