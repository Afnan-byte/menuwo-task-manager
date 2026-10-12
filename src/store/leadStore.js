import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { safeMergeItems } from '../lib/syncService';
import { 
  collection, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs
} from 'firebase/firestore';

const useLeadStore = create((set, get) => ({
  leads: lsGet(LS_KEYS.LEADS),
  loading: false,

  fetchLeads: async () => {
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'leads'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const remoteData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value,
        followUp: doc.data().follow_up,
      }));

      // Safe merge to prevent deleting existing local data
      const localLeads = get().leads || lsGet(LS_KEYS.LEADS);
      const { merged, toUpload } = safeMergeItems(localLeads, remoteData);
      set({ leads: merged });
      lsSet(LS_KEYS.LEADS, merged);

      // Upload unsynced local leads to cloud
      if (toUpload.length > 0) {
        for (const l of toUpload) {
          try {
            await setDoc(doc(db, 'leads', l.id), {
              created_at: l.created_at || new Date().toISOString(),
              restaurant: l.restaurant || '',
              contact: l.contact || null,
              phone: l.phone || null,
              location: l.location || null,
              status: l.status || 'lead',
              deal_value: (l.dealValue !== '' && l.dealValue != null) ? parseFloat(l.dealValue) : 0,
              follow_up: l.followUp || null,
              notes: l.notes || null,
            }, { merge: true });
          } catch (uploadErr) {
            console.warn('[Leads] Cloud upload item failed:', uploadErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firebase fetch leads warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  reconcileLeads: async () => {
    const closedLeads = get().leads.filter(l => l.status === 'closed');
    if (closedLeads.length === 0) return;

    const { default: useExpenseStore } = await import('./expenseStore');
    const expenseStore = useExpenseStore.getState();
    
    for (const lead of closedLeads) {
      await handleLeadRevenueSync(lead.id, lead, expenseStore);
    }
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, 'leads'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value,
        followUp: doc.data().follow_up,
      }));
      const localLeads = get().leads || [];
      const { merged } = safeMergeItems(localLeads, remoteData);
      set({ leads: merged });
      lsSet(LS_KEYS.LEADS, merged);
    }, (err) => {
      console.warn('Firebase leads subscription warning:', err.message);
    });
    return unsubscribe;
  },

  addLead: async (lead) => {
    const leadId = lead.id || crypto.randomUUID();
    const newLead = { 
      ...lead, 
      id: leadId, 
      created_at: lead.created_at || new Date().toISOString() 
    };
    const updatedLeads = [newLead, ...get().leads.filter(l => l.id !== leadId)];
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isFirebaseConfigured && db) {
      const dv = newLead.dealValue;
      const fu = newLead.followUp;
      const dbLead = {
        created_at: newLead.created_at,
        restaurant: newLead.restaurant || '',
        contact: newLead.contact || null,
        phone: newLead.phone || null,
        location: newLead.location || null,
        status: newLead.status || 'lead',
        deal_value: (dv !== '' && dv != null) ? parseFloat(dv) : 0,
        follow_up: (fu !== '' && fu != null) ? fu : null,
        notes: newLead.notes || null,
      };

      try {
        await setDoc(doc(db, 'leads', leadId), dbLead, { merge: true });
      } catch (e) {
        console.warn('Firebase add lead warning:', e.message);
      }
    }

    const { default: useExpenseStore } = await import('./expenseStore');
    await handleLeadRevenueSync(leadId, newLead, useExpenseStore.getState());
  },

  updateLead: async (id, updates) => {
    const oldLead = get().leads.find((l) => l.id === id);
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isFirebaseConfigured && db) {
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

      try {
        await updateDoc(doc(db, 'leads', id), dbUpdates);
      } catch (e) {
        console.warn('Firebase update lead warning:', e.message);
      }
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

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'leads', id));
      } catch (e) {
        console.warn('Firebase delete lead warning:', e.message);
      }
    }
  },

  moveLead: async (id, newStatus) => {
    const lead = get().leads.find((l) => l.id === id);
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'leads', id), { status: newStatus });
      } catch (e) {
        console.warn('Firebase move lead warning:', e.message);
      }
    }

    const { default: useExpenseStore } = await import('./expenseStore');
    await handleLeadRevenueSync(id, { ...lead, status: newStatus }, useExpenseStore.getState());
  },
}));

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
    console.warn('Lead revenue sync warning:', e.message);
  }
}

export default useLeadStore;
