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
      // Map camelCase to snake_case and sanitize values for Supabase
      const dv = newLead.dealValue;
      const fu = newLead.followUp;
      const dbLead = {
        id: newLead.id,
        created_at: newLead.created_at,
        restaurant: newLead.restaurant,
        contact: newLead.contact || null,
        phone: newLead.phone || null,
        location: newLead.location || null,
        status: newLead.status || 'lead',
        deal_value: (dv !== '' && dv != null) ? parseFloat(dv) : 0,
        follow_up: (fu !== '' && fu != null) ? fu : null,
        notes: newLead.notes || null,
      };

      const { error } = await supabase.from('leads').insert([dbLead]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateLead: async (id, updates) => {
    const oldLead = get().leads.find((l) => l.id === id);
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
      // Build clean update object with only valid DB columns
      const dbUpdates = {};
      if (updates.restaurant !== undefined) dbUpdates.restaurant = updates.restaurant;
      if (updates.contact !== undefined) dbUpdates.contact = updates.contact || null;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
      if (updates.location !== undefined) dbUpdates.location = updates.location || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      if (updates.dealValue !== undefined) {
        dbUpdates.deal_value = (updates.dealValue !== '' && updates.dealValue != null) ? parseFloat(updates.dealValue) : 0;
      }
      if (updates.followUp !== undefined) {
        dbUpdates.follow_up = (updates.followUp !== '' && updates.followUp != null) ? updates.followUp : null;
      }

      const { error } = await supabase.from('leads').update(dbUpdates).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }

    // Auto-add revenue when deal is closed (via edit modal)
    const newStatus = updates.status;
    const wasNotClosed = oldLead && oldLead.status !== 'closed';
    const dealVal = updates.dealValue || (oldLead && oldLead.dealValue);
    if (newStatus === 'closed' && wasNotClosed && dealVal) {
      const { default: useExpenseStore } = await import('./expenseStore');
      useExpenseStore.getState().addEntry({
        type: 'revenue',
        amount: parseFloat(dealVal) || 0,
        category: 'Closed Deal',
        date: new Date().toISOString(),
        notes: `Deal closed: ${updates.restaurant || oldLead?.restaurant || 'Unknown'}`,
      });
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
    const lead = get().leads.find((l) => l.id === id);
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }

    // Auto-add revenue when deal is closed
    if (newStatus === 'closed' && lead && lead.dealValue) {
      const { default: useExpenseStore } = await import('./expenseStore');
      useExpenseStore.getState().addEntry({
        type: 'revenue',
        amount: parseFloat(lead.dealValue) || 0,
        category: 'Closed Deal',
        date: new Date().toISOString(),
        notes: `Deal closed: ${lead.restaurant}`,
      });
    }
  },
}));

export default useLeadStore;
