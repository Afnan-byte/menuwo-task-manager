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

const useInvoiceStore = create((set, get) => ({
  invoices: lsGet(LS_KEYS.INVOICES),
  loading: false,

  fetchInvoices: async () => {
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'invoices'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ invoices: data });
      lsSet(LS_KEYS.INVOICES, data);
    } catch (e) {
      console.error('Firebase fetch error:', e);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, 'invoices'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ invoices: data });
      lsSet(LS_KEYS.INVOICES, data);
    });
    return unsubscribe;
  },

  addInvoice: async (invoice) => {
    const newInvoice = { 
      ...invoice, 
      created_at: new Date().toISOString() 
    };
    
    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const updatedInvoices = [{ ...newInvoice, id: optimisticId }, ...get().invoices];
    set({ invoices: updatedInvoices });
    lsSet(LS_KEYS.INVOICES, updatedInvoices);

    if (isFirebaseConfigured) {
      const dbInvoice = {
        created_at: newInvoice.created_at,
        invoiceNumber: newInvoice.invoiceNumber,
        clientName: newInvoice.clientName || null,
        clientEmail: newInvoice.clientEmail || null,
        clientAddress: newInvoice.clientAddress || null,
        date: newInvoice.date || null,
        dueDate: newInvoice.dueDate || null,
        items: newInvoice.items || [],
        subtotal: newInvoice.subtotal || 0,
        taxRate: newInvoice.taxRate || 0,
        discount: newInvoice.discount || 0,
        total: newInvoice.total || 0,
        status: newInvoice.status || 'draft',
        notes: newInvoice.notes || null,
      };
      try {
        await addDoc(collection(db, 'invoices'), dbInvoice);
      } catch (e) {
        console.error('Firebase add error:', e);
      }
    }
  },

  updateInvoice: async (id, updates) => {
    const updatedInvoices = get().invoices.map((i) => (i.id === id ? { ...i, ...updates } : i));
    set({ invoices: updatedInvoices });
    lsSet(LS_KEYS.INVOICES, updatedInvoices);

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'invoices', id), updates);
      } catch (e) {
        console.error('Firebase update error:', e);
      }
    }
  },

  deleteInvoice: async (id) => {
    const updatedInvoices = get().invoices.filter((i) => i.id !== id);
    set({ invoices: updatedInvoices });
    lsSet(LS_KEYS.INVOICES, updatedInvoices);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (e) {
        console.error('Firebase delete error:', e);
      }
    }
  },
}));

export default useInvoiceStore;
