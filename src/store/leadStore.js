import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useLeadStore = create((set, get) => ({
  leads: lsGet(LS_KEYS.LEADS),
  loading: false,

  fetchLeads: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    try {
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
    } catch (e) {
      console.error('Supabase fetch error:', e);
    }
    set({ loading: false });
  },

  // Manual trigger for reconciliation to avoid infinite loops during normal operation
  reconcileLeads: async () => {
    const closedLeads = get().leads.filter(l => l.status === 'closed');
    if (closedLeads.length === 0) return;

    const { default: useExpenseStore } = await import('./expenseStore');
    const expenseStore = useExpenseStore.getState();
    
    // Batch process to avoid multiple renders
    for (const lead of closedLeads) {
      await handleLeadRevenueSync(lead.id, lead, expenseStore);
    }
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
      if (error) console.error('Supabase error:', dbLead, error);
    }

    const { default: useExpenseStore } = await import('./expenseStore');
    await handleLeadRevenueSync(newLead.id, newLead, useExpenseStore.getState());
  },

  updateLead: async (id, updates) => {
    const oldLead = get().leads.find((l) => l.id === id);
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isSupabaseConfigured) {
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

    const { default: useExpenseStore } = await import('./expenseStore');
    await handleLeadRevenueSync(id, { ...oldLead, ...updates }, useExpenseStore.getState());
  },

  deleteLead: async (id) => {
    const updatedLeads = get().leads.filter((l) => l.id !== id);
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    const { default: useExpenseStore } = await import('./expenseStore');
    await handleLeadRevenueSync(id, { status: 'deleted' }, useExpenseStore.getState());

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

    const { default: useExpenseStore } = await import('./expenseStore');
    await handleLeadRevenueSync(id, { ...lead, status: newStatus }, useExpenseStore.getState());
  },
}));

// Helper to handle lead revenue synchronization
async function handleLeadRevenueSync(leadId, lead, expenseStore) {
  try {
    const currentEntries = expenseStore.entries;
    const linkedEntries = currentEntries.filter(e => e.notes?.includes(`[LEAD_LINK:${leadId}]`));

    if (lead.status === 'closed' && (lead.dealValue !== undefined && lead.dealValue !== null && lead.dealValue !== '')) {
      const dealVal = parseFloat(lead.dealValue);
      if (isNaN(dealVal)) return;
      
      const expectedNotes = `Deal closed: ${lead.restaurant} [LEAD_LINK:${leadId}]`;
      
      if (linkedEntries.length > 0) {
        const [primary, ...others] = linkedEntries;
        const currentAmount = parseFloat(primary.amount);
        
        if (Math.abs(currentAmount - dealVal) > 0.01 || !primary.notes.includes(lead.restaurant)) {
          await expenseStore.updateEntry(primary.id, {
            amount: dealVal,
            notes: expectedNotes
          });
        }
        
        for (const duplicate of others) {
          await expenseStore.deleteEntry(duplicate.id);
        }
      } else {
        await expenseStore.addEntry({
          type: 'revenue',
          amount: dealVal,
          category: 'Closed Deal',
          date: new Date().toISOString(),
          notes: expectedNotes,
        });
      }
    } else {
      for (const entry of linkedEntries) {
        await expenseStore.deleteEntry(entry.id);
      }
    }
  } catch (e) {
    console.error('Lead revenue sync error:', e);
  }
}

export default useLeadStore;
