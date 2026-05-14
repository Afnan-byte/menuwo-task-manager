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
  getDocs
} from 'firebase/firestore';

const useExpenseStore = create((set, get) => ({
  entries: lsGet(LS_KEYS.EXPENSES),
  loading: false,

  fetchEntries: async () => {
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'expenses'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ entries: data });
      lsSet(LS_KEYS.EXPENSES, data);
    } catch (e) {
      console.error('Firebase fetch error:', e);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, 'expenses'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ entries: data });
      lsSet(LS_KEYS.EXPENSES, data);
    });
    return unsubscribe;
  },

  addEntry: async (entry) => {
    const newEntry = { 
      ...entry, 
      created_at: new Date().toISOString() 
    };
    
    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const updatedEntries = [{ ...newEntry, id: optimisticId }, ...get().entries];
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isFirebaseConfigured) {
      const dbEntry = {
        created_at: newEntry.created_at,
        type: newEntry.type,
        amount: parseFloat(newEntry.amount) || 0,
        category: newEntry.category || null,
        date: (newEntry.date !== '' && newEntry.date != null) ? newEntry.date : null,
        notes: newEntry.notes || null,
      };
      try {
        await addDoc(collection(db, 'expenses'), dbEntry);
      } catch (e) {
        console.error('Firebase add error:', e);
      }
    }
  },

  updateEntry: async (id, updates) => {
    const updatedEntries = get().entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isFirebaseConfigured) {
      const dbUpdates = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.amount !== undefined) dbUpdates.amount = parseFloat(updates.amount) || 0;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.date !== undefined) dbUpdates.date = (updates.date !== '' && updates.date != null) ? updates.date : null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      
      try {
        await updateDoc(doc(db, 'expenses', id), dbUpdates);
      } catch (e) {
        console.error('Firebase update error:', e);
      }
    }
  },

  deleteEntry: async (id) => {
    const updatedEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (e) {
        console.error('Firebase delete error:', e);
      }
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
