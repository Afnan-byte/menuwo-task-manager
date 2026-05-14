import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Leads from './pages/Leads';
import Expenses from './pages/Expenses';
import Content from './pages/Content';
import Notes from './pages/Notes';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';
import useTaskStore from './store/taskStore';
import useLeadStore from './store/leadStore';
import useExpenseStore from './store/expenseStore';
import useContentStore from './store/contentStore';
import useNoteStore from './store/noteStore';
import useOrderStore from './store/orderStore';
import useSettingsStore from './store/settingsStore';
import { isSupabaseConfigured } from './lib/supabase';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/content" element={<Content />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/ai" element={<AIAssistant />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchLeads = useLeadStore((s) => s.fetchLeads);
  const fetchEntries = useExpenseStore((s) => s.fetchEntries);
  const fetchItems = useContentStore((s) => s.fetchItems);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  const subTasks = useTaskStore((s) => s.subscribeToChanges);
  const subLeads = useLeadStore((s) => s.subscribeToChanges);
  const subExpenses = useExpenseStore((s) => s.subscribeToChanges);
  const subContent = useContentStore((s) => s.subscribeToChanges);
  const subNotes = useNoteStore((s) => s.subscribeToChanges);
  const subOrders = useOrderStore((s) => s.subscribeToChanges);

  useEffect(() => {
    const initData = async () => {
      // 1. Fetch all data from Supabase
      try {
        await Promise.all([
          fetchTasks(),
          fetchLeads(),
          fetchEntries(),
          fetchItems(),
          fetchNotes(),
          fetchOrders(),
          fetchSettings()
        ]);

        // 2. Reconcile closed leads with revenue tracker ONCE on init
        await useLeadStore.getState().reconcileLeads();
      } catch (e) {
        console.error('Initialization error:', e);
      }

      // 3. Setup real-time subscriptions
      const unsubTasks = subTasks();
      const unsubLeads = subLeads();
      const unsubExpenses = subExpenses();
      const unsubContent = subContent();
      const unsubNotes = subNotes();
      const unsubOrders = subOrders();

      return () => {
        unsubTasks?.();
        unsubLeads?.();
        unsubExpenses?.();
        unsubContent?.();
        unsubNotes?.();
        unsubOrders?.();
      };
    };

    initData();

    // Diagnostic logging
    console.log('--- Menuwo OS Diagnostics ---');
    console.log('Supabase Configured:', isSupabaseConfigured);
  }, []);

  // Keyboard shortcut: Ctrl+K for quick search
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#060608' }}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <AnimatedRoutes />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
