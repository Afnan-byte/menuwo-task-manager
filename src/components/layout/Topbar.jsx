import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QuickAddModal from '../ui/QuickAddModal';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/tasks': 'Task Manager',
  '/leads': 'Leads & CRM',
  '/expenses': 'Expense Tracker',
  '/content': 'Content Planner',
  '/notes': 'Notes & Ideas',
  '/orders': 'QR Stand Orders',
  '/analytics': 'Analytics',
  '/ai': 'AI Assistant',
  '/settings': 'Settings',
};

export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const title = PAGE_TITLES[location.pathname] || 'Menuwo OS';

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5"
        style={{ background: 'rgba(6,6,8,0.9)', backdropFilter: 'blur(20px)' }}>
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">{title}</h1>
            <p className="text-[11px] text-text-muted hidden sm:block">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <AnimatePresence>
            {showSearch ? (
              <motion.input
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                autoFocus
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setShowSearch(false)}
                className="input-glass text-sm"
                style={{ width: 200 }}
              />
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
                title="Search (Ctrl+K)"
              >
                <Search size={17} />
              </button>
            )}
          </AnimatePresence>

          {/* Notifications */}
          <button className="p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-colors relative">
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent shadow-glow-sm" />
          </button>

          {/* Quick Add */}
          <button
            onClick={() => setShowQuickAdd(true)}
            className="btn-accent flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Quick Add</span>
          </button>
        </div>
      </header>

      <QuickAddModal open={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
    </>
  );
}
