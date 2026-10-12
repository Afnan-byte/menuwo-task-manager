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

const useExpenseStore = create((set, get) => ({
  entries: lsGet(LS_KEYS.EXPENSES),
  loading: false,

  fetchEntries: async () => {
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'expenses'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const remoteData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Safe merge to prevent deleting existing local data
      const localEntries = get().entries || lsGet(LS_KEYS.EXPENSES);
      const { merged, toUpload } = safeMergeItems(localEntries, remoteData);
      set({ entries: merged });
      lsSet(LS_KEYS.EXPENSES, merged);

      // Upload unsynced local entries to cloud
      if (toUpload.length > 0) {
        for (const e of toUpload) {
          try {
            await setDoc(doc(db, 'expenses', e.id), {
              created_at: e.created_at || new Date().toISOString(),
              type: e.type || 'expense',
              amount: parseFloat(e.amount) || 0,
              category: e.category || null,
              date: (e.date !== '' && e.date != null) ? e.date : null,
              notes: e.notes || null,
            }, { merge: true });
          } catch (uploadErr) {
            console.warn('[Expenses] Cloud upload item failed:', uploadErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firebase fetch expenses warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, 'expenses'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      const localEntries = get().entries || [];
      const { merged } = safeMergeItems(localEntries, remoteData);
      set({ entries: merged });
      lsSet(LS_KEYS.EXPENSES, merged);
    }, (err) => {
      console.warn('Firebase expenses subscription warning:', err.message);
    });
    return unsubscribe;
  },

  addEntry: async (entry) => {
    const entryId = entry.id || crypto.randomUUID();
    const newEntry = { 
      ...entry, 
      id: entryId,
      created_at: entry.created_at || new Date().toISOString() 
    };
    
    // Optimistic update
    const updatedEntries = [newEntry, ...get().entries.filter(e => e.id !== entryId)];
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isFirebaseConfigured && db) {
      const dbEntry = {
        created_at: newEntry.created_at,
        type: newEntry.type || 'expense',
        amount: parseFloat(newEntry.amount) || 0,
        category: newEntry.category || null,
        date: (newEntry.date !== '' && newEntry.date != null) ? newEntry.date : null,
        notes: newEntry.notes || null,
      };
      try {
        await setDoc(doc(db, 'expenses', entryId), dbEntry, { merge: true });
      } catch (e) {
        console.warn('Firebase add expense warning:', e.message);
      }
    }
  },

  updateEntry: async (id, updates) => {
    const updatedEntries = get().entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isFirebaseConfigured && db) {
      const dbUpdates = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.amount !== undefined) dbUpdates.amount = parseFloat(updates.amount) || 0;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.date !== undefined) dbUpdates.date = (updates.date !== '' && updates.date != null) ? updates.date : null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      
      try {
        await updateDoc(doc(db, 'expenses', id), dbUpdates);
      } catch (e) {
        console.warn('Firebase update expense warning:', e.message);
      }
    }
  },

  deleteEntry: async (id) => {
    const updatedEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: updatedEntries });
    lsSet(LS_KEYS.EXPENSES, updatedEntries);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (e) {
        console.warn('Firebase delete expense warning:', e.message);
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
