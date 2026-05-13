import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Search, Phone, Building2, DollarSign, StickyNote, Trash2, Edit2, ChevronRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useLeadStore from '../store/leadStore';
import { getLeadStatusColor, formatCurrency, formatDate } from '../lib/utils';

const PIPELINE = [
  { id: 'lead', label: 'Lead', color: '#6366f1' },
  { id: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { id: 'demo', label: 'Demo Scheduled', color: '#f59e0b' },
  { id: 'negotiation', label: 'Negotiation', color: '#ef4444' },
  { id: 'closed', label: 'Closed', color: '#196F01' },
];

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(lead || {
    restaurant: '', contact: '', phone: '', status: 'lead', dealValue: '', notes: '', followUp: ''
  });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 0 40px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="flex justify-between mb-5">
            <h2 className="font-semibold text-white">{lead ? 'Edit Lead' : 'New Lead'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <input className="input-glass" placeholder="Restaurant name *" value={form.restaurant}
              onChange={(e) => setForm({ ...form, restaurant: e.target.value })} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <input className="input-glass" placeholder="Contact person" value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              <input className="input-glass" placeholder="Phone number" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className="input-glass" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PIPELINE.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <input className="input-glass" type="number" placeholder="Deal value (₹)" value={form.dealValue}
                onChange={(e) => setForm({ ...form, dealValue: e.target.value })} />
            </div>
            <input type="date" className="input-glass" value={form.followUp}
              onChange={(e) => setForm({ ...form, followUp: e.target.value })}
              title="Follow-up date" />
            <textarea className="input-glass" rows={3} placeholder="Notes..." value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button onClick={() => { if (form.restaurant) { onSave(form); onClose(); } }} className="btn-accent w-full">
              {lead ? 'Update Lead' : 'Add Lead'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LeadCard({ lead, onEdit, onDelete, onMove }) {
  const stageIndex = PIPELINE.findIndex((p) => p.id === lead.status);
  const nextStage = PIPELINE[stageIndex + 1];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={14} className="text-text-muted flex-shrink-0" />
            <span className="text-sm font-semibold text-white truncate">{lead.restaurant}</span>
          </div>
          {lead.contact && (
            <p className="text-xs text-text-muted ml-5">{lead.contact}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(lead)} className="p-1 text-text-muted hover:text-white"><Edit2 size={12} /></button>
          <button onClick={() => onDelete(lead.id)} className="p-1 text-text-muted hover:text-red-400"><Trash2 size={12} /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`badge text-[10px] ${getLeadStatusColor(lead.status)}`}>{lead.status}</span>
        {lead.dealValue && (
          <span className="flex items-center gap-1 text-[10px] text-accent font-semibold">
            <DollarSign size={10} />{formatCurrency(lead.dealValue)}
          </span>
        )}
        {lead.phone && (
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <Phone size={10} />{lead.phone}
          </span>
        )}
      </div>

      {lead.followUp && (
        <p className="text-[10px] text-text-muted mb-3">
          📅 Follow up: {formatDate(lead.followUp)}
        </p>
      )}

      {lead.notes && (
        <p className="text-xs text-text-muted line-clamp-2 mb-3 flex gap-1">
          <StickyNote size={10} className="flex-shrink-0 mt-0.5" />{lead.notes}
        </p>
      )}

      {nextStage && (
        <button
          onClick={() => onMove(lead.id, nextStage.id)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-text-muted hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          Move to {nextStage.label} <ChevronRight size={12} />
        </button>
      )}
    </motion.div>
  );
}

export default function Leads() {
  const { leads, addLead, updateLead, deleteLead, moveLead } = useLeadStore();
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('pipeline');

  // Compute locally to avoid Zustand infinite loops
  const getTotalDealValue = () => leads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);

  const filtered = leads.filter((l) => {
    const matchSearch = !search ||
      l.restaurant?.toLowerCase().includes(search.toLowerCase()) ||
      l.contact?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSave = (form) => {
    if (editLead) updateLead(editLead.id, form);
    else addLead(form);
    setEditLead(null);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="page-header">Leads & CRM</h1>
            <p className="text-text-muted text-sm mt-0.5">{leads.length} leads · Pipeline value: {formatCurrency(getTotalDealValue())}</p>
          </div>
          <button onClick={() => { setEditLead(null); setShowModal(true); }} className="btn-accent flex items-center gap-1.5">
            <Plus size={15} /> Add Lead
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {PIPELINE.map((stage) => {
            const count = leads.filter((l) => l.status === stage.id).length;
            const value = leads.filter((l) => l.status === stage.id).reduce((s, l) => s + (parseFloat(l.dealValue) || 0), 0);
            return (
              <button key={stage.id} onClick={() => setFilterStatus(filterStatus === stage.id ? 'all' : stage.id)}
                className={`glass-card p-3 text-left transition-all ${filterStatus === stage.id ? 'ring-1' : ''}`}
                style={{ ringColor: stage.color }}>
                <div className="text-lg font-bold text-white mb-0.5">{count}</div>
                <div className="text-[10px] font-medium" style={{ color: stage.color }}>{stage.label}</div>
                {value > 0 && <div className="text-[10px] text-text-muted">{formatCurrency(value)}</div>}
              </button>
            );
          })}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {['pipeline', 'table'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${activeTab === t ? 'bg-accent text-black' : 'text-text-secondary hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input className="input-glass pl-8 text-xs" placeholder="Search leads..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Pipeline view */}
        {activeTab === 'pipeline' ? (
          <div className="flex flex-col md:flex-row flex-wrap gap-4 pb-4 px-1">
            {PIPELINE.map((stage) => {
              const stageLeads = filtered.filter((l) => l.status === stage.id);
              return (
                <div key={stage.id} className="w-full md:w-72 flex-shrink-0 flex flex-col glass-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold text-white">{stage.label}</span>
                    <span className="ml-auto text-xs text-text-muted">{stageLeads.length}</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)]">
                    <AnimatePresence>
                      {stageLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead}
                          onEdit={(l) => { setEditLead(l); setShowModal(true); }}
                          onDelete={deleteLead}
                          onMove={moveLead}
                        />
                      ))}
                    </AnimatePresence>
                    {stageLeads.length === 0 && (
                      <p className="text-center text-text-muted text-xs py-6">No leads here</p>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
        ) : (
          <div className="glass-card overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Restaurant', 'Contact', 'Phone', 'Status', 'Deal Value', 'Follow Up', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((lead) => (
                      <motion.tr key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-4 py-3 font-medium text-white">{lead.restaurant}</td>
                        <td className="px-4 py-3 text-text-secondary">{lead.contact || '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">{lead.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge text-[10px] ${getLeadStatusColor(lead.status)}`}>{lead.status}</span>
                        </td>
                        <td className="px-4 py-3 text-accent font-medium">{lead.dealValue ? formatCurrency(lead.dealValue) : '—'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{formatDate(lead.followUp)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditLead(lead); setShowModal(true); }}
                              className="p-1.5 text-text-muted hover:text-white"><Edit2 size={13} /></button>
                            <button onClick={() => deleteLead(lead.id)}
                              className="p-1.5 text-text-muted hover:text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-white/5">
              {filtered.map((lead) => (
                <div key={lead.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{lead.restaurant}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{lead.contact || 'No contact'} • {lead.phone || 'No phone'}</p>
                    </div>
                    <span className={`badge text-[10px] ${getLeadStatusColor(lead.status)}`}>{lead.status}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-accent font-bold">{lead.dealValue ? formatCurrency(lead.dealValue) : '—'}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditLead(lead); setShowModal(true); }}
                        className="p-2 text-text-muted hover:text-white"><Edit2 size={14} /></button>
                      <button onClick={() => deleteLead(lead.id)}
                        className="p-2 text-text-muted hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {lead.followUp && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-400/5 p-2 rounded-lg">
                      Follow-up: {formatDate(lead.followUp)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Users className="text-text-muted mx-auto mb-3" size={36} />
                <p className="text-text-muted text-sm">No leads found. Add your first restaurant client!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <LeadModal
          lead={editLead}
          onClose={() => { setShowModal(false); setEditLead(null); }}
          onSave={handleSave}
        />
      )}
    </PageWrapper>
  );
}
