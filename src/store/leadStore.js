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

        // Reconcile existing closed leads with revenue tracker
        const closedLeads = mappedData.filter(l => l.status === 'closed');
        for (const lead of closedLeads) {
          handleLeadRevenueSync(lead.id, lead);
        }
      }
    } catch (e) {
      console.error('Supabase fetch error:', e);
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

    // Sync revenue for the new lead
    await handleLeadRevenueSync(newLead.id, newLead);
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

    // Handle revenue sync
    await handleLeadRevenueSync(id, { ...oldLead, ...updates });
  },

  deleteLead: async (id) => {
    const updatedLeads = get().leads.filter((l) => l.id !== id);
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    // Handle revenue sync (deletion)
    await handleLeadRevenueSync(id, { status: 'deleted' });

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

    // Handle revenue sync
    await handleLeadRevenueSync(id, { ...lead, status: newStatus });
  },
}));

// Helper to handle lead revenue synchronization
async function handleLeadRevenueSync(leadId, lead) {
  try {
    const { default: useExpenseStore } = await import('./expenseStore');
    const expenseStore = useExpenseStore.getState();
    
    // Always get fresh entries to avoid race conditions
    const currentEntries = useExpenseStore.getState().entries;
    const linkedEntries = currentEntries.filter(e => e.notes?.includes(`[LEAD_LINK:${leadId}]`));

    if (lead.status === 'closed' && (lead.dealValue !== undefined && lead.dealValue !== null && lead.dealValue !== '')) {
      const dealVal = parseFloat(lead.dealValue);
      if (isNaN(dealVal)) return;
      
      const expectedNotes = `Deal closed: ${lead.restaurant} [LEAD_LINK:${leadId}]`;
      
      if (linkedEntries.length > 0) {
        const [primary, ...others] = linkedEntries;
        
        // Update primary if amount or restaurant name changed
        if (Math.abs(parseFloat(primary.amount) - dealVal) > 0.01 || !primary.notes.includes(lead.restaurant)) {
          await expenseStore.updateEntry(primary.id, {
            amount: dealVal,
            notes: expectedNotes
          });
        }
        
        // Clean up any duplicates
        for (const duplicate of others) {
          await expenseStore.deleteEntry(duplicate.id);
        }
      } else {
        // Create new entry
        await expenseStore.addEntry({
          type: 'revenue',
          amount: dealVal,
          category: 'Closed Deal',
          date: new Date().toISOString(),
          notes: expectedNotes,
        });
      }
    } else {
      // Remove all linked entries if no longer closed
      for (const entry of linkedEntries) {
        await expenseStore.deleteEntry(entry.id);
      }
    }
  } catch (e) {
    console.error('Lead revenue sync error:', e);
  }
}

export default useLeadStore;
