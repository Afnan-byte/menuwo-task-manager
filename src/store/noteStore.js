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

const useNoteStore = create((set, get) => ({
  notes: lsGet(LS_KEYS.NOTES),
  loading: false,

  fetchNotes: async () => {
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'notes'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const remoteData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Safe merge to prevent deleting existing local data
      const localNotes = get().notes || lsGet(LS_KEYS.NOTES);
      const { merged, toUpload } = safeMergeItems(localNotes, remoteData);
      set({ notes: merged });
      lsSet(LS_KEYS.NOTES, merged);

      // Upload unsynced local notes to cloud
      if (toUpload.length > 0) {
        for (const n of toUpload) {
          try {
            await setDoc(doc(db, 'notes', n.id), {
              created_at: n.created_at || new Date().toISOString(),
              title: n.title || '',
              content: n.content || null,
              category: n.category || null,
              pinned: !!n.pinned,
              color: n.color || null,
            }, { merge: true });
          } catch (uploadErr) {
            console.warn('[Notes] Cloud upload item failed:', uploadErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firebase fetch notes warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, 'notes'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      const localNotes = get().notes || [];
      const { merged } = safeMergeItems(localNotes, remoteData);
      set({ notes: merged });
      lsSet(LS_KEYS.NOTES, merged);
    }, (err) => {
      console.warn('Firebase notes subscription warning:', err.message);
    });
    return unsubscribe;
  },

  addNote: async (note) => {
    const noteId = note.id || crypto.randomUUID();
    const newNote = { 
      ...note, 
      id: noteId,
      created_at: note.created_at || new Date().toISOString(),
      pinned: false
    };
    
    // Optimistic update
    const updatedNotes = [newNote, ...get().notes.filter(n => n.id !== noteId)];
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isFirebaseConfigured && db) {
      const dbNote = {
        created_at: newNote.created_at,
        title: newNote.title || '',
        content: newNote.content || null,
        category: newNote.category || null,
        pinned: newNote.pinned || false,
        color: newNote.color || null,
      };
      try {
        await setDoc(doc(db, 'notes', noteId), dbNote, { merge: true });
      } catch (e) {
        console.warn('Firebase add note warning:', e.message);
      }
    }
  },

  updateNote: async (id, updates) => {
    const updatedNotes = get().notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isFirebaseConfigured && db) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content || null;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;
      if (updates.color !== undefined) dbUpdates.color = updates.color || null;
      
      try {
        await updateDoc(doc(db, 'notes', id), dbUpdates);
      } catch (e) {
        console.warn('Firebase update note warning:', e.message);
      }
    }
  },

  deleteNote: async (id) => {
    const updatedNotes = get().notes.filter((n) => n.id !== id);
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (e) {
        console.warn('Firebase delete note warning:', e.message);
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

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'notes', id), { pinned: newPinned });
      } catch (e) {
        console.warn('Firebase pin warning:', e.message);
      }
    }
  },

  getSorted: () => {
    const notes = get().notes;
    return [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
  },
}));

export default useNoteStore;
