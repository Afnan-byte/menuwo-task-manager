import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useOrderStore = create((set, get) => ({
  orders: lsGet(LS_KEYS.ORDERS),
  loading: false,

  fetchOrders: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const mappedData = data.map(o => ({
        ...o,
        standType: o.stand_type,
      }));
      set({ orders: mappedData });
      lsSet(LS_KEYS.ORDERS, mappedData);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', table: 'orders' }, () => {
        get().fetchOrders();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  addOrder: async (order) => {
    const newOrder = { 
      ...order, 
      id: order.id || crypto.randomUUID(), 
      created_at: new Date().toISOString() 
    };
    const updatedOrders = [newOrder, ...get().orders];
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isSupabaseConfigured) {
      const dbOrder = {
        id: newOrder.id,
        created_at: newOrder.created_at,
        client: newOrder.client,
        stand_type: newOrder.standType || newOrder.stand_type || null,
        qty: parseInt(newOrder.qty) || 1,
        status: newOrder.status || 'pending',
        delivery: (newOrder.delivery !== '' && newOrder.delivery != null) ? newOrder.delivery : null,
        notes: newOrder.notes || null,
      };
      const { error } = await supabase.from('orders').insert([dbOrder]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateOrder: async (id, updates) => {
    const updatedOrders = get().orders.map((o) => (o.id === id ? { ...o, ...updates } : o));
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isSupabaseConfigured) {
      const dbUpdates = {};
      if (updates.client !== undefined) dbUpdates.client = updates.client;
      if (updates.standType !== undefined) dbUpdates.stand_type = updates.standType;
      if (updates.stand_type !== undefined) dbUpdates.stand_type = updates.stand_type;
      if (updates.qty !== undefined) dbUpdates.qty = parseInt(updates.qty) || 1;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.delivery !== undefined) dbUpdates.delivery = (updates.delivery !== '' && updates.delivery != null) ? updates.delivery : null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      const { error } = await supabase.from('orders').update(dbUpdates).eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
  },

  deleteOrder: async (id) => {
    const updatedOrders = get().orders.filter((o) => o.id !== id);
    set({ orders: updatedOrders });
    lsSet(LS_KEYS.ORDERS, updatedOrders);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) console.error('Supabase error:', error);
    }
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
