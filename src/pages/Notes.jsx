import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Pin, Trash2, Edit2, Search, Lightbulb, Zap, User, TrendingUp } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useNoteStore from '../store/noteStore';
import { timeAgo } from '../lib/utils';

const TAG_CONFIG = {
  idea: { label: '💡 Idea', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  feature: { label: '⚡ Feature', color: '#196F01', bg: 'rgba(25,111,1,0.1)' },
  client: { label: '👤 Client', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  business: { label: '📈 Business', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
};

function NoteModal({ note, onClose, onSave }) {
  const [form, setForm] = useState(note || { title: '', body: '', tags: 'idea' });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 0 40px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="flex justify-between mb-5">
            <h2 className="font-semibold text-white">{note ? 'Edit Note' : 'New Note'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <input className="input-glass" placeholder="Title (optional)..." value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            <textarea className="input-glass" rows={6} placeholder="Capture your thoughts, ideas, and insights..."
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm({ ...form, tags: key })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.tags === key ? 'ring-1 ring-white/20' : 'opacity-60 hover:opacity-100'
                  }`} style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </button>
              ))}
            </div>
            <button onClick={() => { if (form.body) { onSave(form); onClose(); } }} className="btn-accent w-full">
              {note ? 'Update Note' : 'Save Note'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function NoteCard({ note, onEdit, onDelete, onPin }) {
  const tag = TAG_CONFIG[note.tags] || TAG_CONFIG.idea;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass-card p-4 group cursor-default ${note.pinned ? 'ring-1 ring-accent/20' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: tag.bg, color: tag.color }}>
            {tag.label}
          </span>
          {note.pinned && <Pin size={11} className="text-accent" />}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onPin(note.id)} className={`p-1 transition-colors ${note.pinned ? 'text-accent' : 'text-text-muted hover:text-accent'}`}>
            <Pin size={12} />
          </button>
          <button onClick={() => onEdit(note)} className="p-1 text-text-muted hover:text-white"><Edit2 size={12} /></button>
          <button onClick={() => onDelete(note.id)} className="p-1 text-text-muted hover:text-red-400"><Trash2 size={12} /></button>
        </div>
      </div>
      {note.title && <h3 className="text-sm font-semibold text-white mb-1.5">{note.title}</h3>}
      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{note.body}</p>
      <p className="text-[10px] text-text-muted mt-3">{timeAgo(note.createdAt)}</p>
    </motion.div>
  );
}

export default function Notes() {
  const { addNote, updateNote, deleteNote, togglePin, getSorted } = useNoteStore();
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('all');

  const notes = getSorted();
  const filtered = notes.filter((n) => {
    const matchSearch = !search || n.body?.toLowerCase().includes(search.toLowerCase()) || n.title?.toLowerCase().includes(search.toLowerCase());
    const matchTag = filterTag === 'all' || n.tags === filterTag;
    return matchSearch && matchTag;
  });

  const handleSave = (form) => {
    if (editNote) updateNote(editNote.id, form);
    else addNote(form);
    setEditNote(null);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="page-header">Notes & Ideas</h1>
            <p className="text-text-muted text-sm mt-0.5">{notes.length} notes captured</p>
          </div>
          <button onClick={() => { setEditNote(null); setShowModal(true); }} className="btn-accent flex items-center gap-1.5">
            <Plus size={15} /> New Note
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input className="input-glass pl-8 text-sm" placeholder="Search notes..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setFilterTag('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterTag === 'all' ? 'bg-accent text-black' : 'btn-ghost'}`}>
              All
            </button>
            {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilterTag(filterTag === key ? 'all' : key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filterTag === key ? 'ring-1 ring-white/20 opacity-100' : 'opacity-60 hover:opacity-100 btn-ghost'
                }`} style={filterTag === key ? { background: cfg.bg, color: cfg.color } : {}}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <Lightbulb className="text-text-muted mx-auto mb-3" size={40} />
            <p className="text-text-muted text-sm">No notes yet. Capture your first idea!</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            <AnimatePresence>
              {filtered.map((note) => (
                <div key={note.id} className="break-inside-avoid mb-4">
                  <NoteCard note={note}
                    onEdit={(n) => { setEditNote(n); setShowModal(true); }}
                    onDelete={deleteNote}
                    onPin={togglePin}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showModal && (
        <NoteModal note={editNote} onClose={() => { setShowModal(false); setEditNote(null); }} onSave={handleSave} />
      )}
    </PageWrapper>
  );
}
