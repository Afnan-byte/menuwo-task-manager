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
      const mappedData = data.map(t => ({
        ...t,
        dealValue: t.deal_value,
      }));
      set({ tasks: mappedData });
      lsSet(LS_KEYS.TASKS, mappedData);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', table: 'tasks' }, () => {
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

    // Auto-add revenue if task is added as 'done' and has dealValue
    if (newTask.status === 'done' && newTask.dealValue) {
      const { default: useExpenseStore } = await import('./expenseStore');
      useExpenseStore.getState().addEntry({
        type: 'revenue',
        amount: parseFloat(newTask.dealValue) || 0,
        category: 'Task Revenue',
        date: new Date().toISOString(),
        notes: `Task completed: ${newTask.title}`,
      });
    }
  },

  updateTask: async (id, updates) => {
    const oldTask = get().tasks.find((t) => t.id === id);
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

    // Auto-add revenue when task is completed
    const newStatus = updates.status;
    const wasNotDone = oldTask && oldTask.status !== 'done';
    const dealVal = updates.dealValue || (oldTask && oldTask.dealValue);
    if (newStatus === 'done' && wasNotDone && dealVal) {
      const { default: useExpenseStore } = await import('./expenseStore');
      useExpenseStore.getState().addEntry({
        type: 'revenue',
        amount: parseFloat(dealVal) || 0,
        category: 'Task Revenue',
        date: new Date().toISOString(),
        notes: `Task completed: ${updates.title || oldTask?.title || 'Unknown'}`,
      });
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
    const task = get().tasks.find((t) => t.id === id);
    const wasNotDone = task && task.status !== 'done';
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }

    // Auto-add revenue when task is moved to done
    if (newStatus === 'done' && wasNotDone && task && task.dealValue) {
      const { default: useExpenseStore } = await import('./expenseStore');
      useExpenseStore.getState().addEntry({
        type: 'revenue',
        amount: parseFloat(task.dealValue) || 0,
        category: 'Task Revenue',
        date: new Date().toISOString(),
        notes: `Task completed: ${task.title}`,
      });
    }
  },
}));

export default useTaskStore;
