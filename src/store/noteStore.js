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

const useNoteStore = create((set, get) => ({
  notes: lsGet(LS_KEYS.NOTES),
  loading: false,

  fetchNotes: async () => {
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'notes'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ notes: data });
      lsSet(LS_KEYS.NOTES, data);
    } catch (e) {
      console.error('Firebase fetch error:', e);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, 'notes'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      set({ notes: data });
      lsSet(LS_KEYS.NOTES, data);
    });
    return unsubscribe;
  },

  addNote: async (note) => {
    const newNote = { 
      ...note, 
      created_at: new Date().toISOString(),
      pinned: false
    };
    
    // Optimistic update
    const optimisticId = crypto.randomUUID();
    const updatedNotes = [{ ...newNote, id: optimisticId }, ...get().notes];
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isFirebaseConfigured) {
      const dbNote = {
        created_at: newNote.created_at,
        title: newNote.title,
        content: newNote.content || null,
        category: newNote.category || null,
        pinned: newNote.pinned || false,
        color: newNote.color || null,
      };
      try {
        await addDoc(collection(db, 'notes'), dbNote);
      } catch (e) {
        console.error('Firebase add error:', e);
      }
    }
  },

  updateNote: async (id, updates) => {
    const updatedNotes = get().notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isFirebaseConfigured) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content || null;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;
      if (updates.color !== undefined) dbUpdates.color = updates.color || null;
      
      try {
        await updateDoc(doc(db, 'notes', id), dbUpdates);
      } catch (e) {
        console.error('Firebase update error:', e);
      }
    }
  },

  deleteNote: async (id) => {
    const updatedNotes = get().notes.filter((n) => n.id !== id);
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (e) {
        console.error('Firebase delete error:', e);
      }
    }
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.pinned;
    
    const updatedNotes = get().notes.map((n) => (n.id === id ? { ...n, pinned: newPinned } : n));
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'notes', id), { pinned: newPinned });
      } catch (e) {
        console.error('Firebase pin error:', e);
      }
    }
  },

  getSorted: () => {
    const notes = get().notes;
    return [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
  },
}));

export default useNoteStore;
