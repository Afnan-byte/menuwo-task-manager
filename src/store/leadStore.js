import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useLeadStore = create((set, get) => ({
  leads: lsGet(LS_KEYS.LEADS),
  loading: false,

  fetchLeads: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      set({ leads: data });
      lsSet(LS_KEYS.LEADS, data);
    }
    set({ loading: false });
  },

  addLead: async (lead) => {
    const newLead = { 
      ...lead, 
      id: lead.id || crypto.randomUUID(), 
      created_at: new Date().toISOString() 
    };
    const updatedLeads = [newLead, ...get().leads];
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('leads').insert([newLead]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateLead: async (id, updates) => {
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('leads').update(updates).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  deleteLead: async (id) => {
    const updatedLeads = get().leads.filter((l) => l.id !== id);
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  moveLead: async (id, newStatus) => {
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },
}));

export default useLeadStore;
