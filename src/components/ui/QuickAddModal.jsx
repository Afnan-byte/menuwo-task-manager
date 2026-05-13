import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Users, FileText } from 'lucide-react';
import useTaskStore from '../../store/taskStore';
import useLeadStore from '../../store/leadStore';
import useNoteStore from '../../store/noteStore';

const TABS = [
  { id: 'task', label: 'Task', icon: CheckSquare },
  { id: 'lead', label: 'Lead', icon: Users },
  { id: 'note', label: 'Note', icon: FileText },
];

export default function QuickAddModal({ open, onClose }) {
  const [tab, setTab] = useState('task');
  const addTask = useTaskStore((s) => s.addTask);
  const addLead = useLeadStore((s) => s.addLead);
  const addNote = useNoteStore((s) => s.addNote);

  const [taskForm, setTaskForm] = useState({ title: '', priority: 'medium', status: 'todo' });
  const [leadForm, setLeadForm] = useState({ restaurant: '', contact: '', phone: '', status: 'lead', dealValue: '' });
  const [noteForm, setNoteForm] = useState({ body: '', tags: 'idea' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tab === 'task' && taskForm.title) {
      addTask(taskForm);
      setTaskForm({ title: '', priority: 'medium', status: 'todo' });
    } else if (tab === 'lead' && leadForm.restaurant) {
      addLead(leadForm);
      setLeadForm({ restaurant: '', contact: '', phone: '', status: 'lead', dealValue: '' });
    } else if (tab === 'note' && noteForm.body) {
      addNote(noteForm);
      setNoteForm({ body: '', tags: 'idea' });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass-card w-full max-w-md pointer-events-auto p-6"
              style={{ boxShadow: '0 0 60px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-white">Quick Add</h2>
                <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      tab === id ? 'bg-accent text-black' : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {tab === 'task' && (
                  <>
                    <input className="input-glass" placeholder="Task title..." value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} autoFocus />
                    <select className="input-glass" value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                      <option value="low">Low priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="high">High priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </>
                )}
                {tab === 'lead' && (
                  <>
                    <input className="input-glass" placeholder="Restaurant name..." value={leadForm.restaurant}
                      onChange={(e) => setLeadForm({ ...leadForm, restaurant: e.target.value })} autoFocus />
                    <input className="input-glass" placeholder="Contact person..." value={leadForm.contact}
                      onChange={(e) => setLeadForm({ ...leadForm, contact: e.target.value })} />
                    <input className="input-glass" placeholder="Deal value (₹)..." value={leadForm.dealValue}
                      onChange={(e) => setLeadForm({ ...leadForm, dealValue: e.target.value })} type="number" />
                  </>
                )}
                {tab === 'note' && (
                  <>
                    <textarea className="input-glass" rows={4} placeholder="Capture your idea..." value={noteForm.body}
                      onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })} autoFocus />
                    <select className="input-glass" value={noteForm.tags}
                      onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}>
                      <option value="idea">💡 Idea</option>
                      <option value="feature">⚡ Feature</option>
                      <option value="client">👤 Client Request</option>
                      <option value="business">📈 Business</option>
                    </select>
                  </>
                )}

                <button type="submit" className="btn-accent w-full mt-1">
                  Add {TABS.find((t) => t.id === tab)?.label}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
