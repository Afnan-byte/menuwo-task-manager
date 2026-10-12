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

const useInvoiceStore = create((set, get) => ({
  invoices: lsGet(LS_KEYS.INVOICES),
  loading: false,

  fetchInvoices: async () => {
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'invoices'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const remoteData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Safe merge to prevent deleting existing local data
      const localInvoices = get().invoices || lsGet(LS_KEYS.INVOICES);
      const { merged, toUpload } = safeMergeItems(localInvoices, remoteData);
      set({ invoices: merged });
      lsSet(LS_KEYS.INVOICES, merged);

      // Upload unsynced local invoices to cloud
      if (toUpload.length > 0) {
        for (const inv of toUpload) {
          try {
            await setDoc(doc(db, 'invoices', inv.id), {
              created_at: inv.created_at || new Date().toISOString(),
              invoiceNumber: inv.invoiceNumber || '',
              clientName: inv.clientName || null,
              clientEmail: inv.clientEmail || null,
              clientAddress: inv.clientAddress || null,
              date: inv.date || null,
              dueDate: inv.dueDate || null,
              items: inv.items || [],
              subtotal: inv.subtotal || 0,
              taxRate: inv.taxRate || 0,
              discount: inv.discount || 0,
              total: inv.total || 0,
              status: inv.status || 'draft',
              notes: inv.notes || null,
            }, { merge: true });
          } catch (uploadErr) {
            console.warn('[Invoices] Cloud upload item failed:', uploadErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firebase fetch invoices warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, 'invoices'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      const localInvoices = get().invoices || [];
      const { merged } = safeMergeItems(localInvoices, remoteData);
      set({ invoices: merged });
      lsSet(LS_KEYS.INVOICES, merged);
    }, (err) => {
      console.warn('Firebase invoices subscription warning:', err.message);
    });
    return unsubscribe;
  },

  addInvoice: async (invoice) => {
    const invoiceId = invoice.id || crypto.randomUUID();
    const newInvoice = { 
      ...invoice, 
      id: invoiceId,
      created_at: invoice.created_at || new Date().toISOString() 
    };
    
    // Optimistic update
    const updatedInvoices = [newInvoice, ...get().invoices.filter(i => i.id !== invoiceId)];
    set({ invoices: updatedInvoices });
    lsSet(LS_KEYS.INVOICES, updatedInvoices);

    if (isFirebaseConfigured && db) {
      const dbInvoice = {
        created_at: newInvoice.created_at,
        invoiceNumber: newInvoice.invoiceNumber || '',
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
        await setDoc(doc(db, 'invoices', invoiceId), dbInvoice, { merge: true });
      } catch (e) {
        console.warn('Firebase add invoice warning:', e.message);
      }
    }
  },

  updateInvoice: async (id, updates) => {
    const updatedInvoices = get().invoices.map((i) => (i.id === id ? { ...i, ...updates } : i));
    set({ invoices: updatedInvoices });
    lsSet(LS_KEYS.INVOICES, updatedInvoices);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'invoices', id), updates);
      } catch (e) {
        console.warn('Firebase update invoice warning:', e.message);
      }
    }
  },

  deleteInvoice: async (id) => {
    const updatedInvoices = get().invoices.filter((i) => i.id !== id);
    set({ invoices: updatedInvoices });
    lsSet(LS_KEYS.INVOICES, updatedInvoices);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (e) {
        console.warn('Firebase delete invoice warning:', e.message);
      }
    }
  },
}));

export default useInvoiceStore;
