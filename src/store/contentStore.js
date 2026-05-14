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

const useContentStore = create((set, get) => ({
  items: lsGet(LS_KEYS.CONTENT),
  loading: false,

  fetchItems: async () => {
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'content'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ items: data });
      lsSet(LS_KEYS.CONTENT, data);
    } catch (e) {
      console.error('Firebase fetch error:', e);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, 'content'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ items: data });
      lsSet(LS_KEYS.CONTENT, data);
    });
    return unsubscribe;
  },

  addItem: async (item) => {
    const newItem = { 
      ...item, 
      created_at: new Date().toISOString() 
    };
    
    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const updatedItems = [{ ...newItem, id: optimisticId }, ...get().items];
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isFirebaseConfigured) {
      const dbItem = {
        created_at: newItem.created_at,
        title: newItem.title,
        type: newItem.type || null,
        status: newItem.status || 'idea',
        date: (newItem.date !== '' && newItem.date != null) ? newItem.date : null,
        notes: newItem.notes || null,
      };
      try {
        await addDoc(collection(db, 'content'), dbItem);
      } catch (e) {
        console.error('Firebase add error:', e);
      }
    }
  },

  updateItem: async (id, updates) => {
    const updatedItems = get().items.map((i) => (i.id === id ? { ...i, ...updates } : i));
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isFirebaseConfigured) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.type !== undefined) dbUpdates.type = updates.type || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.date !== undefined) dbUpdates.date = (updates.date !== '' && updates.date != null) ? updates.date : null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      
      try {
        await updateDoc(doc(db, 'content', id), dbUpdates);
      } catch (e) {
        console.error('Firebase update error:', e);
      }
    }
  },

  deleteItem: async (id) => {
    const updatedItems = get().items.filter((i) => i.id !== id);
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'content', id));
      } catch (e) {
        console.error('Firebase delete error:', e);
      }
    }
  },

  getByStatus: (status) => get().items.filter((i) => i.status === status),
  getByType: (type) => get().items.filter((i) => i.type === type),
}));

export default useContentStore;
