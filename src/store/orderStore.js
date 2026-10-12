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

const useOrderStore = create((set, get) => ({
  orders: lsGet(LS_KEYS.ORDERS),
  loading: false,

  fetchOrders: async () => {
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const remoteData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        standType: doc.data().stand_type || doc.data().standType,
      }));

      // Safe merge to prevent deleting existing local data
      const localOrders = get().orders || lsGet(LS_KEYS.ORDERS);
      const { merged, toUpload } = safeMergeItems(localOrders, remoteData);
      set({ orders: merged });
      lsSet(LS_KEYS.ORDERS, merged);

      // Upload unsynced local orders to cloud
      if (toUpload.length > 0) {
        for (const o of toUpload) {
          try {
            await setDoc(doc(db, 'orders', o.id), {
              created_at: o.created_at || new Date().toISOString(),
              client: o.client || '',
              stand_type: o.standType || o.stand_type || null,
              qty: parseInt(o.qty) || 1,
              status: o.status || 'pending',
              delivery: (o.delivery !== '' && o.delivery != null) ? o.delivery : null,
              notes: o.notes || null,
            }, { merge: true });
          } catch (uploadErr) {
            console.warn('[Orders] Cloud upload item failed:', uploadErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firebase fetch orders warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        standType: doc.data().stand_type || doc.data().standType,
      }));
      const localOrders = get().orders || [];
      const { merged } = safeMergeItems(localOrders, remoteData);
      set({ orders: merged });
      lsSet(LS_KEYS.ORDERS, merged);
    }, (err) => {
      console.warn('Firebase orders subscription warning:', err.message);
    });
    return unsubscribe;
  },

  addOrder: async (order) => {
    const orderId = order.id || crypto.randomUUID();
    const newOrder = { 
      ...order, 
      id: orderId,
      created_at: order.created_at || new Date().toISOString() 
    };
    
    // Optimistic update
    const updatedOrders = [newOrder, ...get().orders.filter(o => o.id !== orderId)];
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isFirebaseConfigured && db) {
      const dbOrder = {
        created_at: newOrder.created_at,
        client: newOrder.client || '',
        stand_type: newOrder.standType || newOrder.stand_type || null,
        qty: parseInt(newOrder.qty) || 1,
        status: newOrder.status || 'pending',
        delivery: (newOrder.delivery !== '' && newOrder.delivery != null) ? newOrder.delivery : null,
        notes: newOrder.notes || null,
      };
      try {
        await setDoc(doc(db, 'orders', orderId), dbOrder, { merge: true });
      } catch (e) {
        console.warn('Firebase add order warning:', e.message);
      }
    }
  },

  updateOrder: async (id, updates) => {
    const updatedOrders = get().orders.map((o) => (o.id === id ? { ...o, ...updates } : o));
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isFirebaseConfigured && db) {
      const dbUpdates = {};
      if (updates.client !== undefined) dbUpdates.client = updates.client;
      if (updates.standType !== undefined) dbUpdates.stand_type = updates.standType;
      if (updates.stand_type !== undefined) dbUpdates.stand_type = updates.stand_type;
      if (updates.qty !== undefined) dbUpdates.qty = parseInt(updates.qty) || 1;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.delivery !== undefined) dbUpdates.delivery = (updates.delivery !== '' && updates.delivery != null) ? updates.delivery : null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      
      try {
        await updateDoc(doc(db, 'orders', id), dbUpdates);
      } catch (e) {
        console.warn('Firebase update order warning:', e.message);
      }
    }
  },

  deleteOrder: async (id) => {
    const updatedOrders = get().orders.filter((o) => o.id !== id);
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (e) {
        console.warn('Firebase delete order warning:', e.message);
      }
    }
  },

  getStats: () => {
    const orders = get().orders;
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      inProgress: orders.filter((o) => o.status === 'in-progress').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
    };
  },
}));

export default useOrderStore;
