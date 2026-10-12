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

const useContentStore = create((set, get) => ({
  items: lsGet(LS_KEYS.CONTENT),
  loading: false,

  fetchItems: async () => {
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'content'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const remoteData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Safe merge to prevent deleting existing local data
      const localItems = get().items || lsGet(LS_KEYS.CONTENT);
      const { merged, toUpload } = safeMergeItems(localItems, remoteData);
      set({ items: merged });
      lsSet(LS_KEYS.CONTENT, merged);

      // Upload unsynced local content to cloud
      if (toUpload.length > 0) {
        for (const c of toUpload) {
          try {
            await setDoc(doc(db, 'content', c.id), {
              created_at: c.created_at || new Date().toISOString(),
              title: c.title || '',
              type: c.type || null,
              status: c.status || 'idea',
              date: (c.date !== '' && c.date != null) ? c.date : null,
              notes: c.notes || null,
            }, { merge: true });
          } catch (uploadErr) {
            console.warn('[Content] Cloud upload item failed:', uploadErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firebase fetch content warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, 'content'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      const localItems = get().items || [];
      const { merged } = safeMergeItems(localItems, remoteData);
      set({ items: merged });
      lsSet(LS_KEYS.CONTENT, merged);
    }, (err) => {
      console.warn('Firebase content subscription warning:', err.message);
    });
    return unsubscribe;
  },

  addItem: async (item) => {
    const itemId = item.id || crypto.randomUUID();
    const newItem = { 
      ...item, 
      id: itemId,
      created_at: item.created_at || new Date().toISOString() 
    };
    
    // Optimistic update
    const updatedItems = [newItem, ...get().items.filter(i => i.id !== itemId)];
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isFirebaseConfigured && db) {
      const dbItem = {
        created_at: newItem.created_at,
        title: newItem.title || '',
        type: newItem.type || null,
        status: newItem.status || 'idea',
        date: (newItem.date !== '' && newItem.date != null) ? newItem.date : null,
        notes: newItem.notes || null,
      };
      try {
        await setDoc(doc(db, 'content', itemId), dbItem, { merge: true });
      } catch (e) {
        console.warn('Firebase add content warning:', e.message);
      }
    }
  },

  updateItem: async (id, updates) => {
    const updatedItems = get().items.map((i) => (i.id === id ? { ...i, ...updates } : i));
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isFirebaseConfigured && db) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.type !== undefined) dbUpdates.type = updates.type || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.date !== undefined) dbUpdates.date = (updates.date !== '' && updates.date != null) ? updates.date : null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      
      try {
        await updateDoc(doc(db, 'content', id), dbUpdates);
      } catch (e) {
        console.warn('Firebase update content warning:', e.message);
      }
    }
  },

  deleteItem: async (id) => {
    const updatedItems = get().items.filter((i) => i.id !== id);
    set({ items: updatedItems });
    lsSet(LS_KEYS.CONTENT, updatedItems);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'content', id));
      } catch (e) {
        console.warn('Firebase delete content warning:', e.message);
      }
    }
  },

  getByStatus: (status) => get().items.filter((i) => i.status === status),
  getByType: (type) => get().items.filter((i) => i.type === type),
}));

export default useContentStore;
