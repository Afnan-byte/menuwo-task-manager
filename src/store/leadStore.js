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
      const mappedData = data.map(l => ({
        ...l,
        dealValue: l.deal_value,
        followUp: l.follow_up,
      }));
      set({ leads: mappedData });
      lsSet(LS_KEYS.LEADS, mappedData);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', table: 'leads' }, () => {
        get().fetchLeads();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
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
      // Map camelCase to snake_case for Supabase
      const dbLead = {
        ...newLead,
        deal_value: newLead.dealValue,
        follow_up: newLead.followUp,
      };
      delete dbLead.dealValue;
      delete dbLead.followUp;

      const { error } = await supabase.from('leads').insert([dbLead]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateLead: async (id, updates) => {
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
      // Map camelCase to snake_case for Supabase
      const dbUpdates = { ...updates };
      if (updates.dealValue !== undefined) {
        dbUpdates.deal_value = updates.dealValue;
        delete dbUpdates.dealValue;
      }
      if (updates.followUp !== undefined) {
        dbUpdates.follow_up = updates.followUp;
        delete dbUpdates.followUp;
      }

      const { error } = await supabase.from('leads').update(dbUpdates).eq('id', id);
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
