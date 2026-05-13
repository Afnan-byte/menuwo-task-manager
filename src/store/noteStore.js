import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';

const useNoteStore = create((set, get) => ({
  notes: lsGet(LS_KEYS.NOTES),

  addNote: (note) => {
    const notes = [{ ...note, id: note.id || crypto.randomUUID(), createdAt: new Date().toISOString(), pinned: false }, ...get().notes];
    lsSet(LS_KEYS.NOTES, notes);
    set({ notes });
  },

  updateNote: (id, updates) => {
    const notes = get().notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    lsSet(LS_KEYS.NOTES, notes);
    set({ notes });
  },

  deleteNote: (id) => {
    const notes = get().notes.filter((n) => n.id !== id);
    lsSet(LS_KEYS.NOTES, notes);
    set({ notes });
  },

  togglePin: (id) => {
    const notes = get().notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    lsSet(LS_KEYS.NOTES, notes);
    set({ notes });
  },

  getSorted: () => {
    const notes = get().notes;
    return [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));
  },
}));

export default useNoteStore;
