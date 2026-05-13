import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';

const useOrderStore = create((set, get) => ({
  orders: lsGet(LS_KEYS.ORDERS),

  addOrder: (order) => {
    const orders = [{ ...order, id: order.id || crypto.randomUUID(), createdAt: new Date().toISOString() }, ...get().orders];
    lsSet(LS_KEYS.ORDERS, orders);
    set({ orders });
  },

  updateOrder: (id, updates) => {
    const orders = get().orders.map((o) => (o.id === id ? { ...o, ...updates } : o));
    lsSet(LS_KEYS.ORDERS, orders);
    set({ orders });
  },

  deleteOrder: (id) => {
    const orders = get().orders.filter((o) => o.id !== id);
    lsSet(LS_KEYS.ORDERS, orders);
    set({ orders });
  },

  getStats: () => {
    const orders = get().orders;
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      inProgress: orders.filter((o) => o.status === 'in-progress').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
    };
  },
}));

export default useOrderStore;
