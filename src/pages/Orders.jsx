import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Package, Trash2, Edit2, Search } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useOrderStore from '../store/orderStore';
import { getOrderStatusColor, formatDate } from '../lib/utils';

const STAND_TYPES = ['Wood', 'Acrylic', 'Metal', 'Custom'];
const ORDER_STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
];

function OrderModal({ order, onClose, onSave }) {
  const [form, setForm] = useState(order || {
    client: '', standType: 'Wood', qty: 1, status: 'pending', delivery: '', notes: ''
  });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 0 40px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="flex justify-between mb-5">
            <h2 className="font-semibold text-white">{order ? 'Edit Order' : 'New Order'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <input className="input-glass" placeholder="Client name *" value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <select className="input-glass" value={form.standType}
                onChange={(e) => setForm({ ...form, standType: e.target.value })}>
                {STAND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" min={1} className="input-glass" placeholder="Quantity" value={form.qty}
                onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className="input-glass" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <input type="date" className="input-glass" value={form.delivery}
                onChange={(e) => setForm({ ...form, delivery: e.target.value })} />
            </div>
            <input className="input-glass" placeholder="Notes..." value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button onClick={() => { if (form.client) { onSave(form); onClose(); } }} className="btn-accent w-full">
              {order ? 'Update Order' : 'Add Order'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Orders() {
  const { orders, addOrder, updateOrder, deleteOrder, getStats } = useOrderStore();
  const [showModal, setShowModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const stats = getStats();
  const filtered = orders.filter((o) => {
    const matchSearch = !search || o.client?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSave = (form) => {
    if (editOrder) updateOrder(editOrder.id, form);
    else addOrder(form);
    setEditOrder(null);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="page-header">QR Stand Orders</h1>
            <p className="text-text-muted text-sm mt-0.5">{orders.length} orders total</p>
          </div>
          <button onClick={() => { setEditOrder(null); setShowModal(true); }} className="btn-accent flex items-center gap-1.5">
            <Plus size={15} /> New Order
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {ORDER_STATUSES.map((s) => {
            const count = orders.filter((o) => o.status === s.id).length;
            return (
              <button key={s.id} onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
                className={`glass-card p-4 text-left transition-all ${filterStatus === s.id ? 'ring-1 ring-accent/30' : ''}`}>
                <p className="text-2xl font-bold text-white mb-1">{count}</p>
                <p className={`text-xs ${getOrderStatusColor(s.id).split(' ')[0]}`}>{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-sm mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input className="input-glass pl-8 text-sm" placeholder="Search by client..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Client', 'Stand Type', 'Qty', 'Status', 'Delivery', 'Notes', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((order) => (
                  <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="border-b border-white/5 hover:bg-white/2 group">
                    <td className="px-4 py-3 font-medium text-white">{order.client}</td>
                    <td className="px-4 py-3">
                      <span className="badge text-[10px] text-text-secondary bg-white/5">{order.standType}</span>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{order.qty}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[10px] ${getOrderStatusColor(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{formatDate(order.delivery)}</td>
                    <td className="px-4 py-3 text-text-muted text-xs max-w-[150px] truncate">{order.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditOrder(order); setShowModal(true); }}
                          className="p-1.5 text-text-muted hover:text-white"><Edit2 size={13} /></button>
                        <button onClick={() => deleteOrder(order.id)}
                          className="p-1.5 text-text-muted hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Package className="text-text-muted mx-auto mb-3" size={36} />
              <p className="text-text-muted text-sm">No orders yet. Track your first QR stand order!</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <OrderModal order={editOrder} onClose={() => { setShowModal(false); setEditOrder(null); }} onSave={handleSave} />
      )}
    </PageWrapper>
  );
}
