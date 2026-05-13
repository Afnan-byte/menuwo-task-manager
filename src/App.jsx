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

  useEffect(() => {
    const initData = async () => {
      // Fetch all data
      await Promise.all([
        fetchTasks(),
        fetchLeads(),
        fetchEntries(),
        fetchItems(),
        fetchNotes(),
        fetchOrders(),
        fetchSettings()
      ]);

      // Simple Migration: If Supabase is configured but empty, and we have local data, upload it.
      // Note: This is a basic implementation. For production, more robust conflict resolution is needed.
      const stores = [
        { name: 'tasks', data: useTaskStore.getState().tasks, add: useTaskStore.getState().addTask },
        { name: 'leads', data: useLeadStore.getState().leads, add: useLeadStore.getState().addLead },
        { name: 'expenses', data: useExpenseStore.getState().entries, add: useExpenseStore.getState().addEntry },
        { name: 'content', data: useContentStore.getState().items, add: useContentStore.getState().addItem },
        { name: 'notes', data: useNoteStore.getState().notes, add: useNoteStore.getState().addNote },
        { name: 'orders', data: useOrderStore.getState().orders, add: useOrderStore.getState().addOrder },
      ];

      for (const store of stores) {
        // If local storage has data but we fetched nothing from Supabase, upload local data
        // We check if data exists in LS but not in the state after fetch
        const lsData = JSON.parse(localStorage.getItem(`menuwo_${store.name}`) || '[]');
        if (lsData.length > 0 && store.data.length === 0) {
          console.log(`Migrating ${store.name} to Supabase...`);
          for (const item of lsData) {
            await store.add(item);
          }
        }
      }
    };

    initData();
  }, []);

  // Keyboard shortcut: Ctrl+K for quick search
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // trigger search (topbar handles this internally)
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
