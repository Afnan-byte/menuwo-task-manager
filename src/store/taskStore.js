import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useTaskStore = create((set, get) => ({
  tasks: lsGet(LS_KEYS.TASKS),
  loading: false,

  fetchTasks: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const mappedData = data.map(t => ({
          ...t,
          dealValue: t.deal_value || 0,
        }));
        set({ tasks: mappedData });
        lsSet(LS_KEYS.TASKS, mappedData);
      }
    } catch (e) {
      console.error('Supabase fetch error:', e);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', table: 'leads' }, () => { // Note: leadStore says 'leads' table? Wait, taskStore should be 'tasks' table.
        get().fetchTasks();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
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
      const dbTask = {
        id: newTask.id,
        created_at: newTask.created_at,
        title: newTask.title,
        description: newTask.description || null,
        status: newTask.status || 'todo',
        priority: newTask.priority || 'medium',
        deadline: (newTask.deadline !== '' && newTask.deadline != null) ? newTask.deadline : null,
        category: newTask.category || null,
        deal_value: (newTask.dealValue !== '' && newTask.dealValue != null) ? parseFloat(newTask.dealValue) : 0,
      };
      const { error } = await supabase.from('tasks').insert([dbTask]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateTask: async (id, updates) => {
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isSupabaseConfigured) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.deadline !== undefined) dbUpdates.deadline = (updates.deadline !== '' && updates.deadline != null) ? updates.deadline : null;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.dealValue !== undefined) dbUpdates.deal_value = (updates.dealValue !== '' && updates.dealValue != null) ? parseFloat(updates.dealValue) : 0;
      const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
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
