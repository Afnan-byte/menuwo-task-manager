import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, CheckSquare, Clock, Users, DollarSign, Package, AlertCircle, Target, Zap } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useTaskStore from '../store/taskStore';
import useLeadStore from '../store/leadStore';
import useExpenseStore from '../store/expenseStore';
import useOrderStore from '../store/orderStore';
import { formatCurrency, getGreeting, timeAgo } from '../lib/utils';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

function StatCard({ icon: Icon, label, value, sub, color = 'accent', index }) {
  const colorMap = {
    accent: { bg: 'rgba(57,211,0,0.08)', border: 'rgba(57,211,0,0.2)', icon: 'text-accent' },
    blue: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: 'text-blue-400' },
    amber: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: 'text-amber-400' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: 'text-red-400' },
    purple: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', icon: 'text-purple-400' },
  };
  const c = colorMap[color];

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="glass-card p-5 stat-glow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className={c.icon} size={18} />
        </div>
        {sub && (
          <span className={`text-xs font-medium flex items-center gap-1 ${sub.positive ? 'text-accent' : 'text-red-400'}`}>
            {sub.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {sub.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
    </motion.div>
  );
}

function DailyFocus({ tasks }) {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const topTasks = [...tasks]
    .filter((t) => t.status !== 'done')
    .sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3))
    .slice(0, 3);

  const priorityColors = { urgent: 'text-pink-400', high: 'text-red-400', medium: 'text-amber-400', low: 'text-blue-400' };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-accent" size={16} />
        <h3 className="text-sm font-semibold text-white">Daily Focus</h3>
        <span className="ml-auto badge" style={{ background: 'rgba(25,111,1,0.1)', color: '#196F01' }}>
          Today
        </span>
      </div>
      {topTasks.length === 0 ? (
        <div className="text-center py-6">
          <CheckSquare className="text-text-muted mx-auto mb-2" size={28} />
          <p className="text-text-muted text-sm">All caught up! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                task.priority === 'urgent' ? 'bg-pink-400' :
                task.priority === 'high' ? 'bg-red-400' :
                task.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
              <span className="text-sm text-white flex-1 truncate">{task.title}</span>
              <span className={`text-[10px] font-semibold uppercase ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentActivity({ tasks, leads }) {
  const activities = [
    ...tasks.slice(0, 4).map((t) => ({ type: 'task', text: `Task: ${t.title}`, time: t.createdAt, icon: CheckSquare })),
    ...leads.slice(0, 3).map((l) => ({ type: 'lead', text: `Lead: ${l.restaurant}`, time: l.createdAt, icon: Users })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="text-accent" size={16} />
        <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
      </div>
      {activities.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-6">No activity yet. Start adding items!</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 py-2"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: a.type === 'task' ? 'rgba(57,211,0,0.1)' : 'rgba(99,102,241,0.1)' }}>
                <a.icon size={12} className={a.type === 'task' ? 'text-accent' : 'text-indigo-400'} />
              </div>
              <span className="text-sm text-text-secondary flex-1 truncate">{a.text}</span>
              <span className="text-[11px] text-text-muted flex-shrink-0">{timeAgo(a.time)}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const tasks = useTaskStore((s) => s.tasks);
  const leads = useLeadStore((s) => s.leads);
  const expenseEntries = useExpenseStore((s) => s.entries);
  const orders = useOrderStore((s) => s.orders);
  const greeting = getGreeting();

  // Compute derived values locally to avoid Zustand infinite loops
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    completed: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
  };
  const closedValue = leads.filter((l) => l.status === 'closed').reduce((s, l) => s + (parseFloat(l.dealValue) || 0), 0);
  const revenue = expenseEntries.filter((e) => e.type === 'revenue').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const expenses = expenseEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const summary = { revenue, expenses, profit: revenue - expenses };
  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
  };

  const stats = [
    { icon: CheckSquare, label: 'Total Tasks', value: taskStats.total, color: 'accent', index: 0 },
    { icon: Clock, label: 'Pending Tasks', value: taskStats.pending + taskStats.inProgress, color: 'amber', index: 1 },
    { icon: Users, label: 'Total Leads', value: leads.length, sub: { label: `${leads.filter(l=>l.status==='closed').length} closed`, positive: true }, color: 'blue', index: 2 },
    { icon: DollarSign, label: 'Revenue Closed', value: formatCurrency(closedValue), color: 'accent', index: 3 },
    { icon: TrendingUp, label: 'Net Profit', value: formatCurrency(summary.profit), color: summary.profit >= 0 ? 'accent' : 'red', index: 4 },
    { icon: Package, label: 'QR Orders', value: orderStats.total, sub: { label: `${orderStats.pending} pending`, positive: false }, color: 'purple', index: 5 },
    { icon: AlertCircle, label: 'Overdue Tasks', value: taskStats.overdue, color: 'red', index: 6 },
    { icon: Target, label: 'Completed', value: taskStats.completed, color: 'accent', index: 7 },
  ];

  return (
    <PageWrapper>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">👋</span>
            <h1 className="text-xl font-bold text-white">{greeting}, Afnan</h1>
          </div>
          <p className="text-text-muted text-sm ml-8">Here's your Menuwo startup overview for today</p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DailyFocus tasks={tasks} />
          <RecentActivity tasks={tasks} leads={leads} />
        </div>
      </div>
    </PageWrapper>
  );
}
