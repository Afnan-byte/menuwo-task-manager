import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';

const useTaskStore = create((set, get) => ({
  tasks: lsGet(LS_KEYS.TASKS),
  loading: false,

  setTasks: (tasks) => {
    lsSet(LS_KEYS.TASKS, tasks);
    set({ tasks });
  },

  addTask: (task) => {
    const tasks = [{ ...task, id: task.id || crypto.randomUUID(), createdAt: new Date().toISOString() }, ...get().tasks];
    lsSet(LS_KEYS.TASKS, tasks);
    set({ tasks });
  },

  updateTask: (id, updates) => {
    const tasks = get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    lsSet(LS_KEYS.TASKS, tasks);
    set({ tasks });
  },

  deleteTask: (id) => {
    const tasks = get().tasks.filter((t) => t.id !== id);
    lsSet(LS_KEYS.TASKS, tasks);
    set({ tasks });
  },

  moveTask: (id, newStatus) => {
    const tasks = get().tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    lsSet(LS_KEYS.TASKS, tasks);
    set({ tasks });
  },

  getTasksByStatus: (status) => get().tasks.filter((t) => t.status === status),

  getStats: () => {
    const tasks = get().tasks;
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      completed: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
    };
  },
}));

export default useTaskStore;
