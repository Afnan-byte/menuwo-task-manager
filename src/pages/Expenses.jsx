import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Plus, X, TrendingUp, TrendingDown, Minus, Trash2, Edit2, Clock, CheckCircle2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useExpenseStore from '../store/expenseStore';
import { formatCurrency, formatDate } from '../lib/utils';

const EXPENSE_CATEGORIES = ['Marketing', 'Travel', 'Printing', 'Software', 'Food', 'Other'];
const REVENUE_CATEGORIES = ['Client Project', 'Monthly Retainer', 'Menu Design', 'Consulting', 'Software / Tech', 'Other'];
const PENDING_CATEGORIES = ['Pending Client Payment', 'Milestone Due', 'Project Advance', 'Monthly Retainer Due', 'Custom Menu Work', 'Other'];
const PIE_COLORS = ['#196F01', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs">
        <p className="text-text-secondary mb-1 font-medium">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

function EntryModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(entry || {
    type: 'expense',
    amount: '',
    category: 'Marketing',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const getCategories = () => {
    if (form.type === 'expense') return EXPENSE_CATEGORIES;
    if (form.type === 'revenue') return REVENUE_CATEGORIES;
    return PENDING_CATEGORIES;
  };

  const handleTypeChange = (t) => {
    let cat = EXPENSE_CATEGORIES[0];
    if (t === 'revenue') cat = REVENUE_CATEGORIES[0];
    if (t === 'pending') cat = PENDING_CATEGORIES[0];
    setForm({ ...form, type: t, category: cat });
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="glass-card w-full max-w-md p-5 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 0 40px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-white text-base sm:text-lg">{entry ? 'Edit Entry' : 'Add Financial Entry'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4">
            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
              {[
                { id: 'expense', label: 'Expense', activeClass: 'bg-red-500/20 text-red-400 border border-red-500/30' },
                { id: 'revenue', label: 'Revenue', activeClass: 'bg-accent text-white shadow-sm' },
                { id: 'pending', label: 'Pending', activeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all ${
                    form.type === t.id ? t.activeClass : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">
                {form.type === 'pending' ? 'Pending Amount to Receive (₹)' : form.type === 'revenue' ? 'Revenue Amount (₹)' : 'Expense Amount (₹)'}
              </label>
              <input
                type="number"
                className="input-glass"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">Category</label>
              <select
                className="input-glass"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {getCategories().map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">
                {form.type === 'pending' ? 'Expected Date / Deadline' : 'Date'}
              </label>
              <input
                type="date"
                className="input-glass"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* Notes / Client */}
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">
                {form.type === 'pending' ? 'Client Name & Description' : 'Notes / Description'}
              </label>
              <input
                className="input-glass"
                placeholder={form.type === 'pending' ? 'e.g. Royal Cafe - Menu Design 2nd Installment' : 'Notes (optional)'}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              onClick={() => {
                if (form.amount) {
                  onSave(form);
                  onClose();
                }
              }}
              className="btn-accent w-full mt-2 py-2.5 font-semibold text-sm"
            >
              {entry ? 'Update Entry' : form.type === 'pending' ? 'Add Pending' : 'Save Entry'}
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
  const pendingTotal = entries.filter((e) => e.type === 'pending').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const summary = {
    revenue,
    expenses: expensesTotal,
    profit: revenue - expensesTotal,
    pending: pendingTotal
  };

  const monthMap = {};
  entries.forEach((e) => {
    const month = e.date ? new Date(e.date).toLocaleString('default', { month: 'short' }) : 'Unknown';
    if (!monthMap[month]) monthMap[month] = { month, revenue: 0, expenses: 0, pending: 0 };
    if (e.type === 'revenue') monthMap[month].revenue += parseFloat(e.amount) || 0;
    else if (e.type === 'expense') monthMap[month].expenses += parseFloat(e.amount) || 0;
    else if (e.type === 'pending') monthMap[month].pending += parseFloat(e.amount) || 0;
  });
  const monthly = Object.values(monthMap).slice(-6);

  const catMap = {};
  entries.filter((e) => e.type === 'expense').forEach((e) => {
    const cat = e.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(e.amount) || 0);
  });
  const byCategory = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.type === filter);
  const pendingEntries = entries.filter((e) => e.type === 'pending');

  const handleSave = (form) => {
    if (editEntry) updateEntry(editEntry.id, form);
    else addEntry(form);
    setEditEntry(null);
  };

  const handleMarkReceived = (id) => {
    updateEntry(id, { type: 'revenue' });
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="page-header text-xl sm:text-2xl font-bold text-white tracking-tight">
              Expense & Financial Tracker
            </h1>
            <p className="text-text-muted text-xs sm:text-sm mt-0.5">
              {entries.length} entries tracked · {pendingEntries.length} pending
            </p>
          </div>
          <button
            onClick={() => { setEditEntry(null); setShowModal(true); }}
            className="btn-accent flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs sm:text-sm font-semibold shadow-lg shadow-accent/10 hover:shadow-accent/25 transition-all w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>Add Entry</span>
          </button>
        </div>

        {/* 4 Summary Cards - Pixel Perfect Alignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {[
            {
              label: 'Total Revenue',
              value: summary.revenue,
              icon: TrendingUp,
              textColor: 'text-emerald-400',
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              badge: 'Received',
              badgeStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              sub: 'Total cash collected',
            },
            {
              label: 'Total Expenses',
              value: summary.expenses,
              icon: TrendingDown,
              textColor: 'text-red-400',
              iconBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
              badge: 'Spent',
              badgeStyle: 'bg-red-500/10 text-red-400 border border-red-500/20',
              sub: 'Total operational costs',
            },
            {
              label: 'Net Profit',
              value: summary.profit,
              icon: summary.profit >= 0 ? TrendingUp : TrendingDown,
              textColor: summary.profit >= 0 ? 'text-accent' : 'text-red-400',
              iconBg: summary.profit >= 0
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20',
              badge: summary.profit >= 0 ? 'Profit' : 'Loss',
              badgeStyle: summary.profit >= 0
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20',
              sub: 'Revenue minus expenses',
            },
            {
              label: 'Pending',
              value: summary.pending,
              icon: Clock,
              textColor: 'text-amber-400',
              iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
              badge: 'Due',
              badgeStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
              sub: 'Awaiting collection',
            },
          ].map(({ label, value, icon: Icon, textColor, iconBg, badge, badgeStyle, sub }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 sm:p-5 stat-glow rounded-2xl flex flex-col justify-between h-full min-h-[122px]"
            >
              {/* Header: Icon + Title on left, Compact Badge on right */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon size={15} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white truncate" title={label}>
                    {label}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${badgeStyle}`}>
                  {badge}
                </span>
              </div>

              {/* Amount and Subtitle */}
              <div>
                <p className={`text-2xl sm:text-3xl font-bold tracking-tight truncate ${textColor}`}>
                  {formatCurrency(value)}
                </p>
                <p className="text-[11px] text-text-muted mt-1 truncate">
                  {sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Bar chart */}
          <div className="glass-card p-4 sm:p-5 lg:col-span-2 rounded-2xl flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-semibold text-white">Monthly Cash Flow & Receivables</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#196F01]" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /> Expenses</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> Pending</span>
              </div>
            </div>
            {monthly.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-text-muted text-sm">Add entries to see chart</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly} barGap={4}>
                  <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="revenue" fill="#196F01" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-white mb-4">Expense Breakdown</h3>
            {byCategory.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-text-muted text-sm">No expenses yet</div>
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

        {/* Entries table/list */}
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">All Financial Entries</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'revenue', label: 'Revenue' },
                { id: 'expense', label: 'Expenses' },
                { id: 'pending', label: 'Pending' }
              ].map(({ id, label }) => {
                const count = id === 'pending' ? pendingEntries.length : 0;
                return (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      filter === id
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{label}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        filter === id ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3.5 font-medium">Type</th>
                  <th className="text-left px-5 py-3.5 font-medium">Amount</th>
                  <th className="text-left px-5 py-3.5 font-medium">Category</th>
                  <th className="text-left px-5 py-3.5 font-medium">Date</th>
                  <th className="text-left px-5 py-3.5 font-medium">Client / Notes</th>
                  <th className="text-right px-5 py-3.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {filtered.map((entry) => (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          entry.type === 'revenue'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : entry.type === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {entry.type === 'pending' ? 'Pending' : entry.type}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 font-semibold text-sm ${
                        entry.type === 'revenue'
                          ? 'text-emerald-400'
                          : entry.type === 'pending'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {entry.type === 'revenue' ? '+' : entry.type === 'pending' ? '⏳ ' : '-'}{formatCurrency(entry.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">{entry.category || '—'}</td>
                      <td className="px-5 py-3.5 text-text-muted text-xs">{formatDate(entry.date)}</td>
                      <td className="px-5 py-3.5 text-text-muted text-xs max-w-[220px] truncate" title={entry.notes}>
                        {entry.notes || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {entry.type === 'pending' && (
                            <button
                              onClick={() => handleMarkReceived(entry.id)}
                              title="Mark as Received (Converts to Revenue)"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-all border border-emerald-500/20"
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Received</span>
                            </button>
                          )}
                          <button
                            onClick={() => { setEditEntry(entry); setShowModal(true); }}
                            className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-white/5">
            {filtered.map((entry) => (
              <div key={entry.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-1.5 ${
                      entry.type === 'revenue'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : entry.type === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {entry.type === 'pending' ? 'Pending' : entry.type}
                    </span>
                    <p className="text-[11px] text-text-muted">{formatDate(entry.date)}</p>
                  </div>
                  <p className={`text-lg font-bold tracking-tight whitespace-nowrap ${
                    entry.type === 'revenue'
                      ? 'text-emerald-400'
                      : entry.type === 'pending'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {entry.type === 'revenue' ? '+' : entry.type === 'pending' ? '⏳ ' : '-'}{formatCurrency(entry.amount)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-text-secondary font-medium truncate">
                    {entry.category || 'General'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {entry.type === 'pending' && (
                      <button
                        onClick={() => handleMarkReceived(entry.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-all border border-emerald-500/20"
                      >
                        <CheckCircle2 size={13} />
                        <span>Received</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setEditEntry(entry); setShowModal(true); }}
                      className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {entry.notes && (
                  <p className="text-xs text-text-muted italic border-l-2 border-white/10 pl-2.5 mt-1 bg-white/[0.02] py-1 rounded-r">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Clock className="text-text-muted mx-auto mb-3" size={36} />
              <p className="text-text-muted text-sm font-medium">
                {filter === 'pending' ? 'No pending entries found!' : 'No entries found.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <EntryModal
          entry={editEntry}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
          onSave={handleSave}
        />
      )}
    </PageWrapper>
  );
}
