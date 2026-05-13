import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Save, Check, Database, KeyRound } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { lsGetObj, lsSet } from '../lib/localStorage';


export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState(() => lsGetObj('menuwo_profile', {
    name: 'Afnan', business: 'Menuwo', email: 'info@menuwo.in', role: 'Founder & CEO'
  }));
  const [supabase, setSupabase] = useState(() => lsGetObj('menuwo_supabase', {
    url: import.meta.env.VITE_SUPABASE_URL || '', key: ''
  }));
  const [notifications, setNotifications] = useState(() => lsGetObj('menuwo_notif', {
    overdueTasks: true, leadFollowups: true, dailyBriefing: true
  }));

  const handleSave = () => {
    lsSet('menuwo_profile', profile);
    lsSet('menuwo_supabase', supabase);
    lsSet('menuwo_notif', notifications);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="page-header">Settings</h1>
          <p className="text-text-muted text-sm mt-0.5">Customize your Menuwo Business OS</p>
        </div>

        <div className="space-y-4">
          {/* Profile */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-accent" size={16} />
              <h3 className="text-sm font-semibold text-white">Profile</h3>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-black"
                style={{ background: 'linear-gradient(135deg, #196F01, #1e8501)', boxShadow: '0 0 20px rgba(25,111,1,0.3)' }}>
                {profile.name?.[0] || 'A'}
              </div>
              <div>
                <p className="text-white font-semibold">{profile.name}</p>
                <p className="text-text-muted text-sm">{profile.role}</p>
                <p className="text-text-muted text-xs">{profile.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Full Name</label>
                <input className="input-glass" value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Business Name</label>
                <input className="input-glass" value={profile.business}
                  onChange={(e) => setProfile({ ...profile, business: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Email</label>
                <input className="input-glass" type="email" value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Role</label>
                <input className="input-glass" value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Theme removed */}

          {/* Supabase */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="text-accent" size={16} />
              <h3 className="text-sm font-semibold text-white">Supabase Configuration</h3>
              <span className="badge text-[10px] text-amber-400 bg-amber-400/10">Optional</span>
            </div>
            <p className="text-xs text-text-muted mb-3">
              Connect your Supabase project for real-time cloud sync. Without this, data is stored locally.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Supabase Project URL</label>
                <input className="input-glass font-mono text-xs" placeholder="https://xxxx.supabase.co"
                  value={supabase.url} onChange={(e) => setSupabase({ ...supabase, url: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Anon Public Key</label>
                <input className="input-glass font-mono text-xs" type="password" placeholder="eyJhbGciOiJ..."
                  value={supabase.key} onChange={(e) => setSupabase({ ...supabase, key: e.target.value })} />
              </div>
              <p className="text-[10px] text-text-muted">
                After saving, add these values to your <code className="text-accent">.env.local</code> file as
                VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.
              </p>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="text-accent" size={16} />
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
            </div>
            <div className="space-y-3">
              {[
                { key: 'overdueTasks', label: 'Overdue task alerts', desc: 'Show warnings for tasks past deadline' },
                { key: 'leadFollowups', label: 'Lead follow-up reminders', desc: 'Remind me of upcoming follow-up dates' },
                { key: 'dailyBriefing', label: 'Daily AI briefing', desc: 'Show AI insights on dashboard' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white">{label}</p>
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, [key]: !notifications[key] })}
                    className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${notifications[key] ? 'bg-accent' : 'bg-white/10'}`}
                    style={notifications[key] ? { boxShadow: '0 0 8px rgba(57,211,0,0.4)' } : {}}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notifications[key] ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <motion.button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              saved ? 'bg-accent/20 text-accent border border-accent/30' : 'btn-accent'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Settings</>}
          </motion.button>
        </div>
      </div>
    </PageWrapper>
  );
}
