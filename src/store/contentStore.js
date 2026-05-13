import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';

const useContentStore = create((set, get) => ({
  items: lsGet(LS_KEYS.CONTENT),

  addItem: (item) => {
    const items = [{ ...item, id: item.id || crypto.randomUUID(), createdAt: new Date().toISOString() }, ...get().items];
    lsSet(LS_KEYS.CONTENT, items);
    set({ items });
  },

  updateItem: (id, updates) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, ...updates } : i));
    lsSet(LS_KEYS.CONTENT, items);
    set({ items });
  },

  deleteItem: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    lsSet(LS_KEYS.CONTENT, items);
    set({ items });
  },

  getByStatus: (status) => get().items.filter((i) => i.status === status),
  getByType: (type) => get().items.filter((i) => i.type === type),
}));

export default useContentStore;
