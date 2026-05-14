import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  setDoc
} from 'firebase/firestore';

const useLeadStore = create((set, get) => ({
  leads: lsGet(LS_KEYS.LEADS),
  loading: false,

  fetchLeads: async () => {
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'leads'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value,
        followUp: doc.data().follow_up,
      }));
      set({ leads: data });
      lsSet(LS_KEYS.LEADS, data);
    } catch (e) {
      console.error('Firebase fetch error:', e);
    }
    set({ loading: false });
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
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, 'leads'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value,
        followUp: doc.data().follow_up,
      }));
      set({ leads: data });
      lsSet(LS_KEYS.LEADS, data);
    });
    return unsubscribe;
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

    if (isFirebaseConfigured) {
      const dv = newLead.dealValue;
      const fu = newLead.followUp;
      const dbLead = {
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

      try {
        const docRef = await addDoc(collection(db, 'leads'), dbLead);
        // Sync with revenue using the REAL ID from Firestore
        const { default: useExpenseStore } = await import('./expenseStore');
        await handleLeadRevenueSync(docRef.id, { ...newLead, id: docRef.id }, useExpenseStore.getState());
      } catch (e) {
        console.error('Firebase add error:', e);
      }
    } else {
      const { default: useExpenseStore } = await import('./expenseStore');
      await handleLeadRevenueSync(newLead.id, newLead, useExpenseStore.getState());
    }
  },

  updateLead: async (id, updates) => {
    const oldLead = get().leads.find((l) => l.id === id);
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isFirebaseConfigured) {
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
        console.error('Firebase update error:', e);
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

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'leads', id));
      } catch (e) {
        console.error('Firebase delete error:', e);
      }
    }
  },

  moveLead: async (id, newStatus) => {
    const lead = get().leads.find((l) => l.id === id);
    const updatedLeads = get().leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    set({ leads: updatedLeads });
    lsSet(LS_KEYS.LEADS, updatedLeads);

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'leads', id), { status: newStatus });
      } catch (e) {
        console.error('Firebase move error:', e);
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
    console.error('Lead revenue sync error:', e);
  }
}

export default useLeadStore;
