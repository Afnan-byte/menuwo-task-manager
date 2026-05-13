import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calendar, Film, Image, AlignLeft, Trash2, Edit2, CheckCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useContentStore from '../store/contentStore';
import { formatDate } from '../lib/utils';

const CONTENT_TYPES = [
  { id: 'reel', label: 'Reel', icon: Film, color: '#ec4899' },
  { id: 'poster', label: 'Poster', icon: Image, color: '#6366f1' },
  { id: 'story', label: 'Story', icon: AlignLeft, color: '#3b82f6' },
  { id: 'caption', label: 'Caption', icon: AlignLeft, color: '#f59e0b' },
];

const CONTENT_STATUS = [
  { id: 'idea', label: 'Idea', color: '#888' },
  { id: 'production', label: 'Production', color: '#f59e0b' },
  { id: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
  { id: 'published', label: 'Published', color: '#196F01' },
];

function ContentModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item || {
    type: 'reel', title: '', caption: '', scheduledDate: '', status: 'idea', platform: 'Instagram'
  });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 0 40px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="flex justify-between mb-5">
            <h2 className="font-semibold text-white">{item ? 'Edit Content' : 'New Content Idea'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-1">
              {CONTENT_TYPES.map(({ id, label }) => (
                <button key={id} onClick={() => setForm({ ...form, type: id })}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${form.type === id ? 'bg-accent text-black' : 'btn-ghost'}`}>
                  {label}
                </button>
              ))}
            </div>
            <input className="input-glass" placeholder="Title / Idea..." value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            <textarea className="input-glass" rows={3} placeholder="Caption draft..." value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="input-glass" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {CONTENT_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <input type="date" className="input-glass" value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
            </div>
            <button onClick={() => { if (form.title) { onSave(form); onClose(); } }} className="btn-accent w-full">
              {item ? 'Update' : 'Add Content'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ContentCard({ item, onEdit, onDelete, onStatusChange }) {
  const type = CONTENT_TYPES.find((t) => t.id === item.type);
  const status = CONTENT_STATUS.find((s) => s.id === item.status);
  const TypeIcon = type?.icon || Film;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${type?.color}20`, border: `1px solid ${type?.color}40` }}>
            <TypeIcon size={14} style={{ color: type?.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
            <p className="text-[10px]" style={{ color: status?.color }}>{status?.label}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(item)} className="p-1 text-text-muted hover:text-white"><Edit2 size={12} /></button>
          <button onClick={() => onDelete(item.id)} className="p-1 text-text-muted hover:text-red-400"><Trash2 size={12} /></button>
        </div>
      </div>

      {item.caption && <p className="text-xs text-text-muted mb-3 line-clamp-2">{item.caption}</p>}

      <div className="flex items-center justify-between">
        {item.scheduledDate ? (
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <Calendar size={10} /> {formatDate(item.scheduledDate)}
          </span>
        ) : <span />}
        {item.status !== 'published' && (
          <button
            onClick={() => {
              const idx = CONTENT_STATUS.findIndex((s) => s.id === item.status);
              if (idx < CONTENT_STATUS.length - 1) onStatusChange(item.id, CONTENT_STATUS[idx + 1].id);
            }}
            className="text-[10px] text-text-muted hover:text-accent transition-colors flex items-center gap-1">
            <CheckCircle size={10} /> Advance
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Content() {
  const { items, addItem, updateItem, deleteItem } = useContentStore();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = items.filter((i) => {
    const matchType = filterType === 'all' || i.type === filterType;
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchType && matchStatus;
  });

  const handleSave = (form) => {
    if (editItem) updateItem(editItem.id, form);
    else addItem(form);
    setEditItem(null);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="page-header">Content Planner</h1>
            <p className="text-text-muted text-sm mt-0.5">{items.length} content ideas</p>
          </div>
          <button onClick={() => { setEditItem(null); setShowModal(true); }} className="btn-accent flex items-center gap-1.5">
            <Plus size={15} /> New Idea
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {CONTENT_STATUS.map((s) => (
            <button key={s.id} onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
              className={`glass-card p-3 text-left transition-all ${filterStatus === s.id ? 'ring-1 ring-accent/40' : ''}`}>
              <div className="text-xl font-bold text-white">{items.filter((i) => i.status === s.id).length}</div>
              <div className="text-xs mt-0.5" style={{ color: s.color }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {['all', ...CONTENT_TYPES.map((t) => t.id)].map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                filterType === t ? 'bg-accent text-black' : 'btn-ghost'
              }`}>
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>

        {/* Pipeline columns */}
        <div className="flex gap-4 mobile-scroll-x pb-4 px-1">
          {CONTENT_STATUS.map((stage) => {
            const stageItems = filtered.filter((i) => i.status === stage.id);
            return (
              <div key={stage.id} className="kanban-column flex flex-col">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <span className="text-sm">{stage.label}</span>
                  <span className="ml-auto text-xs text-text-muted">{stageItems.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-360px)]">
                  <AnimatePresence>
                    {stageItems.map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        onEdit={(i) => { setEditItem(i); setShowModal(true); }}
                        onDelete={deleteItem}
                        onStatusChange={(id, status) => updateItem(id, { status })}
                      />
                    ))}
                  </AnimatePresence>
                  {stageItems.length === 0 && (
                    <p className="text-center text-text-muted text-xs py-6">Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <ContentModal item={editItem} onClose={() => { setShowModal(false); setEditItem(null); }} onSave={handleSave} />
      )}
    </PageWrapper>
  );
}
