import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useNoteStore = create((set, get) => ({
  notes: lsGet(LS_KEYS.NOTES),
  loading: false,

  fetchNotes: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      set({ notes: data });
      lsSet(LS_KEYS.NOTES, data);
    }
    set({ loading: false });
  },

  addNote: async (note) => {
    const newNote = { 
      ...note, 
      id: note.id || crypto.randomUUID(), 
      created_at: new Date().toISOString(),
      pinned: false
    };
    const updatedNotes = [newNote, ...get().notes];
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notes').insert([newNote]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateNote: async (id, updates) => {
    const updatedNotes = get().notes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notes').update(updates).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  deleteNote: async (id) => {
    const updatedNotes = get().notes.filter((n) => n.id !== id);
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.pinned;
    
    const updatedNotes = get().notes.map((n) => (n.id === id ? { ...n, pinned: newPinned } : n));
    set({ notes: updatedNotes });
    lsSet(LS_KEYS.NOTES, updatedNotes);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notes').update({ pinned: newPinned }).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  getSorted: () => {
    const notes = get().notes;
    return [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
  },
}));

export default useNoteStore;
