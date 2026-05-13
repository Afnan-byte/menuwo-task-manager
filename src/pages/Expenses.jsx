import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Plus, X, TrendingUp, TrendingDown, Minus, Trash2, Edit2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useExpenseStore from '../store/expenseStore';
import { formatCurrency, formatDate } from '../lib/utils';

const EXPENSE_CATEGORIES = ['Marketing', 'Travel', 'Printing', 'Software', 'Food', 'Other'];
const PIE_COLORS = ['#196F01', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs">
        <p className="text-text-secondary mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

function EntryModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(entry || { type: 'expense', amount: '', category: 'Marketing', date: new Date().toISOString().split('T')[0], notes: '' });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 0 40px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="flex justify-between mb-5">
            <h2 className="font-semibold text-white">{entry ? 'Edit Entry' : 'Add Entry'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              {['expense', 'revenue'].map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    form.type === t ? (t === 'revenue' ? 'bg-accent text-black' : 'bg-red-500/20 text-red-400 border border-red-500/30') : 'btn-ghost'
                  }`}>
                  {t === 'expense' ? '📉 Expense' : '📈 Revenue'}
                </button>
              ))}
            </div>
            <input type="number" className="input-glass" placeholder="Amount (₹)" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
            {form.type === 'expense' && (
              <select className="input-glass" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <input type="date" className="input-glass" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input className="input-glass" placeholder="Notes (optional)" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button onClick={() => { if (form.amount) { onSave(form); onClose(); } }} className="btn-accent w-full">
              {entry ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Expenses() {
  const { entries, addEntry, updateEntry, deleteEntry } = useExpenseStore();
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [filter, setFilter] = useState('all');

  // Compute derived values locally
  const revenue = entries.filter((e) => e.type === 'revenue').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const expensesTotal = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const summary = { revenue, expenses: expensesTotal, profit: revenue - expensesTotal };

  const monthMap = {};
  entries.forEach((e) => {
    const month = e.date ? new Date(e.date).toLocaleString('default', { month: 'short', year: '2-digit' }) : 'Unknown';
    if (!monthMap[month]) monthMap[month] = { month, revenue: 0, expenses: 0 };
    if (e.type === 'revenue') monthMap[month].revenue += parseFloat(e.amount) || 0;
    else monthMap[month].expenses += parseFloat(e.amount) || 0;
  });
  const monthly = Object.values(monthMap).slice(-6);

  const catMap = {};
  entries.filter((e) => e.type === 'expense').forEach((e) => {
    const cat = e.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(e.amount) || 0);
  });
  const byCategory = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.type === filter);

  const handleSave = (form) => {
    if (editEntry) updateEntry(editEntry.id, form);
    else addEntry(form);
    setEditEntry(null);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="page-header">Expense Tracker</h1>
            <p className="text-text-muted text-sm mt-0.5">{entries.length} entries tracked</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-accent flex items-center gap-1.5">
            <Plus size={15} /> Add Entry
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Revenue', value: summary.revenue, icon: TrendingUp, color: 'accent', textColor: 'text-accent' },
            { label: 'Total Expenses', value: summary.expenses, icon: TrendingDown, color: 'red', textColor: 'text-red-400' },
            { label: 'Net Profit', value: summary.profit, icon: Minus, color: summary.profit >= 0 ? 'accent' : 'red', textColor: summary.profit >= 0 ? 'text-accent' : 'text-red-400' },
          ].map(({ label, value, icon: Icon, color, textColor }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 stat-glow">
              <div className={`flex items-center gap-2 mb-3 ${textColor}`}>
                <Icon size={18} />
                <span className="text-sm font-medium text-text-secondary">{label}</span>
              </div>
              <p className={`text-3xl font-bold ${textColor}`}>{formatCurrency(value)}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Bar chart */}
          <div className="glass-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-4">Monthly Revenue vs Expenses</h3>
            {monthly.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-text-muted text-sm">Add entries to see chart</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly} barGap={4}>
                  <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="revenue" fill="#196F01" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Expense Breakdown</h3>
            {byCategory.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-text-muted text-sm">No expenses yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#888' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Entries table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">All Entries</h3>
            <div className="flex gap-1">
              {['all', 'revenue', 'expense'].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${filter === f ? 'bg-accent text-black font-semibold' : 'text-text-secondary hover:text-white'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Type', 'Amount', 'Category', 'Date', 'Notes', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((entry) => (
                    <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${entry.type === 'revenue' ? 'text-accent bg-accent/10' : 'text-red-400 bg-red-400/10'}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${entry.type === 'revenue' ? 'text-accent' : 'text-red-400'}`}>
                        {entry.type === 'revenue' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{entry.category || '—'}</td>
                      <td className="px-4 py-3 text-text-muted text-xs">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-text-muted text-xs max-w-[200px] truncate">{entry.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditEntry(entry); setShowModal(true); }}
                            className="p-1.5 text-text-muted hover:text-white transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => deleteEntry(entry.id)}
                            className="p-1.5 text-text-muted hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <TrendingUp className="text-text-muted mx-auto mb-3" size={36} />
                <p className="text-text-muted text-sm">No entries yet. Track your first revenue or expense!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && <EntryModal entry={editEntry} onClose={() => { setShowModal(false); setEditEntry(null); }} onSave={handleSave} />}
    </PageWrapper>
  );
}
