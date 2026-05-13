import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useTaskStore = create((set, get) => ({
  tasks: lsGet(LS_KEYS.TASKS),
  loading: false,

  fetchTasks: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      set({ tasks: data });
      lsSet(LS_KEYS.TASKS, data);
    }
    set({ loading: false });
  },

  addTask: async (task) => {
    const newTask = { 
      ...task, 
      id: task.id || crypto.randomUUID(), 
      created_at: new Date().toISOString() 
    };
    const updatedTasks = [newTask, ...get().tasks];
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tasks').insert([newTask]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateTask: async (id, updates) => {
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  deleteTask: async (id) => {
    const updatedTasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  moveTask: async (id, newStatus) => {
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },
}));

export default useTaskStore;
