import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, FunnelChart, Funnel, LabelList, Cell
} from 'recharts';
import PageWrapper from '../components/layout/PageWrapper';
import useTaskStore from '../store/taskStore';
import useLeadStore from '../store/leadStore';
import useExpenseStore from '../store/expenseStore';
import { formatCurrency } from '../lib/utils';

const FUNNEL_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#ef4444', '#196F01'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs border border-white/10">
        <p className="text-text-secondary mb-1 font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

function KPICard({ label, value, sub, color = '#196F01', index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass-card p-5"
    >
      <p className="text-3xl font-bold mb-1" style={{ color }}>{value}</p>
      <p className="text-sm text-text-secondary">{label}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function Analytics() {
  const tasks = useTaskStore((s) => s.tasks);
  const leads = useLeadStore((s) => s.leads);
  const entries = useExpenseStore((s) => s.entries);

  // Compute locally to avoid Zustand infinite loops
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'done').length,
  };
  const revenue = entries.filter((e) => e.type === 'revenue').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const expenses = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const summary = { revenue, expenses, profit: revenue - expenses };

  const monthMap = {};
  entries.forEach((e) => {
    const month = e.date ? new Date(e.date).toLocaleString('default', { month: 'short', year: '2-digit' }) : 'Unknown';
    if (!monthMap[month]) monthMap[month] = { month, revenue: 0, expenses: 0 };
    if (e.type === 'revenue') monthMap[month].revenue += parseFloat(e.amount) || 0;
    else monthMap[month].expenses += parseFloat(e.amount) || 0;
  });
  const monthly = Object.values(monthMap).slice(-6);

  const PIPELINE_STAGES = ['lead', 'contacted', 'demo', 'negotiation', 'closed'];
  const funnelData = PIPELINE_STAGES.map((stage, i) => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: leads.filter((l) => l.status === stage).length,
    fill: FUNNEL_COLORS[i],
  }));

  const completionRate = tasks.length ? Math.round((taskStats.completed / tasks.length) * 100) : 0;
  const conversionRate = leads.length ? Math.round((leads.filter((l) => l.status === 'closed').length / leads.length) * 100) : 0;

  // Generate productivity chart (last 7 days using existing tasks)
  const productivityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en', { weekday: 'short' });
    const completed = tasks.filter((t) => {
      if (!t.createdAt) return false;
      const td = new Date(t.createdAt);
      return td.toDateString() === d.toDateString() && t.status === 'done';
    }).length;
    return { day: label, completed };
  });

  const growthRate = monthly.length >= 2
    ? Math.round(((monthly[monthly.length - 1]?.revenue - monthly[monthly.length - 2]?.revenue) /
      (monthly[monthly.length - 2]?.revenue || 1)) * 100)
    : 0;

  return (
    <PageWrapper>
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="page-header">Analytics</h1>
          <p className="text-text-muted text-sm mt-0.5">Business performance overview</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KPICard label="Task Completion" value={`${completionRate}%`} sub={`${taskStats.completed} of ${taskStats.total} tasks`} index={0} />
          <KPICard label="Lead Conversion" value={`${conversionRate}%`} sub={`${leads.filter(l=>l.status==='closed').length} of ${leads.length} leads`} color="#6366f1" index={1} />
          <KPICard label="Net Profit" value={formatCurrency(summary.profit)} sub="All time" color={summary.profit >= 0 ? '#196F01' : '#ef4444'} index={2} />
          <KPICard label="Revenue Growth" value={`${growthRate > 0 ? '+' : ''}${growthRate}%`} sub="vs last month" color={growthRate >= 0 ? '#196F01' : '#ef4444'} index={3} />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Revenue area chart */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Revenue Trend</h3>
            {monthly.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-text-muted text-sm">Add expense entries to see data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#196F01" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#196F01" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#196F01" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Productivity bar chart */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Task Productivity (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={productivityData}>
                <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]}>
                  {productivityData.map((_, i) => (
                    <Cell key={i} fill={`rgba(57,211,0,${0.4 + (i / productivityData.length) * 0.6})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Conversion Funnel */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Lead Conversion Funnel</h3>
          {leads.length === 0 ? (
            <div className="text-center py-10 text-text-muted text-sm">Add leads to see conversion funnel</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center">
              {funnelData.map((stage, i) => {
                const width = Math.max(20, ((stage.value / Math.max(...funnelData.map(s => s.value), 1)) * 100));
                return (
                  <div key={stage.name} className="flex items-center gap-3 w-full max-w-md">
                    <span className="text-xs text-text-muted w-20 text-right flex-shrink-0">{stage.name}</span>
                    <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <motion.div
                        className="h-full rounded-lg flex items-center justify-end pr-2"
                        style={{ background: stage.fill, opacity: 0.85 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                      >
                        <span className="text-xs font-bold text-white">{stage.value}</span>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
