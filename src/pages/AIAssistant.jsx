import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Target, TrendingUp, AlertCircle, Users, CheckSquare, RefreshCw, ChevronRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useTaskStore from '../store/taskStore';
import useLeadStore from '../store/leadStore';
import useExpenseStore from '../store/expenseStore';
import { isOverdue, formatCurrency } from '../lib/utils';

function InsightCard({ icon: Icon, title, message, action, color = 'accent', index }) {
  const colorMap = {
    accent: { bg: 'rgba(25,111,1,0.08)', border: 'rgba(25,111,1,0.2)', icon: '#196F01' },
    amber: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '#f59e0b' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: '#ef4444' },
    blue: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', icon: '#6366f1' },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-4 flex items-start gap-4"
      style={{ borderColor: c.border }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: c.bg }}>
        <Icon size={18} style={{ color: c.icon }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white mb-1">{title}</p>
        <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        {action && (
          <button className="mt-2 text-xs font-medium flex items-center gap-1" style={{ color: c.icon }}>
            {action} <ChevronRight size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function DailyBriefing({ tasks, leads, summary }) {
  const overdue = tasks.filter((t) => isOverdue(t.deadline) && t.status !== 'done');
  const pending = tasks.filter((t) => t.status !== 'done');
  const followUps = leads.filter((l) => {
    if (!l.followUp) return false;
    const d = new Date(l.followUp);
    const today = new Date();
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });
  const hotLeads = leads.filter((l) => l.status === 'negotiation');

  return (
    <div className="glass-card p-5 mb-6"
      style={{ background: 'rgba(57,211,0,0.04)', borderColor: 'rgba(57,211,0,0.15)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
          <Brain className="text-accent" size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">AI Daily Briefing</h2>
          <p className="text-[10px] text-text-muted">Powered by your Menuwo data</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] text-accent font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(57,211,0,0.1)' }}>
            Live
          </span>
        </div>
      </div>

      <div className="text-sm text-text-secondary leading-relaxed space-y-2">
        <p>
          👋 <span className="text-white font-medium">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Afnan!</span>{' '}
          Here's your Menuwo intelligence briefing:
        </p>
        {pending.length > 0 && (
          <p>📋 You have <span className="text-amber-400 font-medium">{pending.length} open tasks</span>
            {overdue.length > 0 && <span className="text-red-400"> ({overdue.length} overdue)</span>}.
            Focus on high-priority items first.</p>
        )}
        {followUps.length > 0 && (
          <p>📞 <span className="text-blue-400 font-medium">{followUps.length} lead{followUps.length > 1 ? 's' : ''}</span> need follow-up this week: {followUps.map(l => l.restaurant).join(', ')}.</p>
        )}
        {hotLeads.length > 0 && (
          <p>🔥 <span className="text-accent font-medium">{hotLeads.length} lead{hotLeads.length > 1 ? 's are' : ' is'} in negotiation</span> — close them today!</p>
        )}
        {summary.profit < 0 && (
          <p>⚠️ <span className="text-red-400 font-medium">Expenses exceeding revenue</span> by {formatCurrency(Math.abs(summary.profit))}. Review your spend.</p>
        )}
        {summary.profit >= 0 && summary.revenue > 0 && (
          <p>💰 <span className="text-accent font-medium">Profit is positive</span> at {formatCurrency(summary.profit)}. Keep closing!</p>
        )}
        {pending.length === 0 && followUps.length === 0 && (
          <p>✅ <span className="text-accent font-medium">All caught up!</span> Great job. Time to add new leads or plan content.</p>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const tasks = useTaskStore((s) => s.tasks);
  const leads = useLeadStore((s) => s.leads);
  const entries = useExpenseStore((s) => s.entries);
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute summary inside memo to avoid stale closure / infinite loops
  const { summary, insights } = useMemo(() => {
    const rev = entries.filter((e) => e.type === 'revenue').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const exp = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const sum = { revenue: rev, expenses: exp, profit: rev - exp };

    const items = [];
    const overdue = tasks.filter((t) => isOverdue(t.deadline) && t.status !== 'done');
    const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');
    const hotLeads = leads.filter((l) => l.status === 'negotiation');
    const coldLeads = leads.filter((l) => l.status === 'lead');
    const pending = tasks.filter((t) => t.status === 'todo');

    if (overdue.length > 0) {
      items.push({
        icon: AlertCircle, title: `${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}`,
        message: `"${overdue[0].title}"${overdue.length > 1 ? ` and ${overdue.length - 1} more are` : ' is'} past deadline. Reschedule or complete immediately.`,
        action: 'View overdue tasks', color: 'red',
      });
    }

    if (urgentTasks.length > 0) {
      items.push({
        icon: Target, title: 'Urgent Priority Tasks',
        message: `${urgentTasks.map(t => `"${t.title}"`).join(', ')} ${urgentTasks.length > 1 ? 'require' : 'requires'} immediate attention.`,
        action: 'Open task manager', color: 'amber',
      });
    }

    if (hotLeads.length > 0) {
      items.push({
        icon: TrendingUp, title: `${hotLeads.length} Hot Lead${hotLeads.length > 1 ? 's' : ''} in Negotiation`,
        message: `${hotLeads.map(l => l.restaurant).join(', ')} — push for a closing call today. You're one step away from ${formatCurrency(hotLeads.reduce((s, l) => s + (parseFloat(l.dealValue) || 0), 0))}.`,
        action: 'View CRM', color: 'accent',
      });
    }

    if (coldLeads.length > 3) {
      items.push({
        icon: Users, title: `${coldLeads.length} Uncontacted Leads`,
        message: `You have ${coldLeads.length} leads still at "Lead" stage. Start reaching out — even 2 follow-ups a day can move the pipeline.`,
        action: 'Go to Leads', color: 'blue',
      });
    }

    if (pending.length > 5) {
      items.push({
        icon: CheckSquare, title: 'Task Backlog Growing',
        message: `${pending.length} tasks are in your "To Do" column. Consider delegating or setting realistic daily goals.`,
        color: 'amber',
      });
    }

    if (sum.profit < 0) {
      items.push({
        icon: TrendingUp, title: 'Expenses Exceeding Revenue',
        message: `Net profit is ${formatCurrency(sum.profit)}. Review your expense categories and focus on closing revenue-generating leads.`,
        color: 'red',
      });
    }

    if (items.length === 0) {
      items.push({
        icon: Sparkles, title: 'All Systems Looking Great!',
        message: "No urgent action items right now. This is a great time to reach out to cold leads, plan your content calendar, or brainstorm new business ideas.",
        color: 'accent',
      });
    }

    return { summary: sum, insights: items };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, leads, entries, refreshKey]);

  return (
    <PageWrapper>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="text-accent" size={20} />
              <h1 className="page-header">AI Assistant</h1>
            </div>
            <p className="text-text-muted text-sm">Smart insights powered by your Menuwo data</p>
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <DailyBriefing tasks={tasks} leads={leads} summary={summary} />

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Action Items & Insights</h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <InsightCard key={i} {...insight} index={i} />
            ))}
          </div>
        </div>

        {/* Future AI integration placeholder */}
        <div className="glass-card p-5 mt-6" style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)' }}>
          <div className="flex items-center gap-3 mb-3">
            <Brain className="text-indigo-400" size={18} />
            <h3 className="text-sm font-semibold text-white">GPT / Gemini Integration</h3>
            <span className="badge text-[10px] text-indigo-400 bg-indigo-400/10">Coming Soon</span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Connect your OpenAI or Google Gemini API key to unlock natural language business queries, auto-generated email templates for leads, content caption generation, and predictive revenue forecasting.
          </p>
          <button className="mt-4 btn-ghost text-xs flex items-center gap-1">
            Configure API Key <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
