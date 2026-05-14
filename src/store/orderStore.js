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

const useOrderStore = create((set, get) => ({
  orders: lsGet(LS_KEYS.ORDERS),
  loading: false,

  fetchOrders: async () => {
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        standType: doc.data().stand_type,
      }));
      set({ orders: data });
      lsSet(LS_KEYS.ORDERS, data);
    } catch (e) {
      console.error('Firebase fetch error:', e);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        standType: doc.data().stand_type,
      }));
      set({ orders: data });
      lsSet(LS_KEYS.ORDERS, data);
    });
    return unsubscribe;
  },

  addOrder: async (order) => {
    const newOrder = { 
      ...order, 
      created_at: new Date().toISOString() 
    };
    
    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const updatedOrders = [{ ...newOrder, id: optimisticId }, ...get().orders];
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isFirebaseConfigured) {
      const dbOrder = {
        created_at: newOrder.created_at,
        client: newOrder.client,
        stand_type: newOrder.standType || newOrder.stand_type || null,
        qty: parseInt(newOrder.qty) || 1,
        status: newOrder.status || 'pending',
        delivery: (newOrder.delivery !== '' && newOrder.delivery != null) ? newOrder.delivery : null,
        notes: newOrder.notes || null,
      };
      try {
        await addDoc(collection(db, 'orders'), dbOrder);
      } catch (e) {
        console.error('Firebase add error:', e);
      }
    }
  },

  updateOrder: async (id, updates) => {
    const updatedOrders = get().orders.map((o) => (o.id === id ? { ...o, ...updates } : o));
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isFirebaseConfigured) {
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
        console.error('Firebase update error:', e);
      }
    }
  },

  deleteOrder: async (id) => {
    const updatedOrders = get().orders.filter((o) => o.id !== id);
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (e) {
        console.error('Firebase delete error:', e);
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
