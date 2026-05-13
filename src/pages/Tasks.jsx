import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Calendar, Tag, GripVertical, List, LayoutGrid, Trash2, Edit2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useTaskStore from '../store/taskStore';
import { getPriorityColor, formatDate, isOverdue } from '../lib/utils';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#6366f1' },
  { id: 'in-progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#39D300' },
];

const CATEGORIES = ['Marketing', 'Sales', 'Operations', 'Tech', 'Admin', 'Design', 'Finance'];

function TaskCard({ task, onEdit, onDelete, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isSortDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className={`glass-card p-3.5 cursor-default group ${isDragging ? 'drag-overlay' : ''}`}>
      <div className="flex items-start gap-2">
        <button {...listeners} {...attributes} className="mt-0.5 text-text-muted hover:text-white cursor-grab active:cursor-grabbing flex-shrink-0">
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-snug mb-2">{task.title}</p>
          {task.description && <p className="text-xs text-text-muted mb-2 line-clamp-2">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`badge text-[10px] ${getPriorityColor(task.priority)}`}>{task.priority}</span>
            {task.category && (
              <span className="badge text-[10px] text-text-secondary bg-white/5">{task.category}</span>
            )}
            {task.deadline && (
              <span className={`flex items-center gap-1 text-[10px] ${isOverdue(task.deadline) && task.status !== 'done' ? 'text-red-400' : 'text-text-muted'}`}>
                <Calendar size={10} />
                {formatDate(task.deadline)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(task)} className="p-1 text-text-muted hover:text-white transition-colors"><Edit2 size={12} /></button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onEdit, onDelete, activeId }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="kanban-column flex flex-col" ref={setNodeRef}
      style={{ borderColor: isOver ? column.color + '40' : undefined, boxShadow: isOver ? `0 0 20px ${column.color}15` : undefined }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-semibold text-white">{column.label}</span>
        </div>
        <span className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} isDragging={activeId === task.id} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-text-muted text-xs">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onSave }) {
  const [form, setForm] = useState(task || { title: '', description: '', priority: 'medium', status: 'todo', category: '', deadline: '' });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="glass-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 0 40px rgba(57,211,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">{task ? 'Edit Task' : 'New Task'}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <input className="input-glass" placeholder="Task title..." value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            <textarea className="input-glass" rows={3} placeholder="Description (optional)..." value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="input-glass" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">🔵 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
                <option value="urgent">💀 Urgent</option>
              </select>
              <select className="input-glass" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className="input-glass" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Category...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" className="input-glass" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <button onClick={() => { if (form.title) { onSave(form); onClose(); } }} className="btn-accent w-full">
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, moveTask } = useTaskStore();
  const [activeId, setActiveId] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('kanban');
  const [filter, setFilter] = useState('all');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = ({ active }) => setActiveId(active.id);
  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const column = COLUMNS.find((c) => c.id === over.id);
      if (column) moveTask(active.id, column.id);
    }
    setActiveId(null);
  };

  const activeTask = tasks.find((t) => t.id === activeId);
  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.priority === filter);

  const handleSave = (form) => {
    if (editTask) { updateTask(editTask.id, form); }
    else { addTask(form); }
    setEditTask(null);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="page-header">Task Manager</h1>
            <p className="text-text-muted text-sm mt-0.5">{tasks.length} tasks total</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input-glass text-xs py-1.5 w-auto" value={filter}
              onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button onClick={() => setView(view === 'kanban' ? 'list' : 'kanban')}
              className="btn-ghost flex items-center gap-1.5">
              {view === 'kanban' ? <List size={15} /> : <LayoutGrid size={15} />}
              {view === 'kanban' ? 'List' : 'Board'}
            </button>
            <button onClick={() => { setEditTask(null); setShowModal(true); }} className="btn-accent flex items-center gap-1.5">
              <Plus size={15} /> New Task
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="glass-card p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Overall Progress</span>
              <span className="text-sm font-semibold text-accent">
                {Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #39D300, #45FF00)', boxShadow: '0 0 8px rgba(57,211,0,0.5)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Kanban / List */}
        {view === 'kanban' ? (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 mobile-scroll-x pb-4 px-1">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={filtered.filter((t) => t.status === col.id)}
                  onEdit={(task) => { setEditTask(task); setShowModal(true); }}
                  onDelete={deleteTask}
                  activeId={activeId}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask && <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} isDragging />}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase">Task</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase hidden sm:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase hidden lg:table-cell">Deadline</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((task) => (
                    <motion.tr key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{task.title}</p>
                        {task.category && <p className="text-text-muted text-xs">{task.category}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`badge text-xs ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="badge text-xs text-text-secondary bg-white/5">{task.status}</span>
                      </td>
                      <td className={`px-4 py-3 text-xs hidden lg:table-cell ${isOverdue(task.deadline) && task.status !== 'done' ? 'text-red-400' : 'text-text-muted'}`}>
                        {formatDate(task.deadline)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditTask(task); setShowModal(true); }}
                            className="p-1.5 text-text-muted hover:text-white transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => deleteTask(task.id)}
                            className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <CheckSquare className="text-text-muted mx-auto mb-3" size={36} />
                <p className="text-text-muted text-sm">No tasks yet. Create your first task!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSave={handleSave}
        />
      )}
    </PageWrapper>
  );
}
