import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Bell, Save, Check, Database, Download, Upload, 
  RefreshCw, ShieldAlert, CheckCircle2, ExternalLink, Copy 
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useSettingsStore from '../store/settingsStore';
import useSyncStore from '../store/syncStore';
import useTaskStore from '../store/taskStore';
import useLeadStore from '../store/leadStore';
import useExpenseStore from '../store/expenseStore';
import useOrderStore from '../store/orderStore';
import useNoteStore from '../store/noteStore';
import useInvoiceStore from '../store/invoiceStore';
import useContentStore from '../store/contentStore';
import { importBackupData } from '../lib/syncService';

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const { profile, updateProfile, notifications, updateNotifications } = useSettingsStore();
  const { status, statusMessage, isSyncing, checkStatus, syncNow, downloadBackup } = useSyncStore();
  
  // Local state for the Firebase form fields
  const [fbConfig, setFbConfig] = useState(() => {
    try {
      const custom = localStorage.getItem('menuwo_firebase_config');
      if (custom) return JSON.parse(custom);
    } catch {}
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  });

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestAndSync = async () => {
    setTesting(true);
    setSyncFeedback(null);
    try {
      const newStatus = await checkStatus();
      if (newStatus === 'connected') {
        const res = await syncNow();
        // Refresh all stores
        await Promise.all([
          useTaskStore.getState().fetchTasks(),
          useLeadStore.getState().fetchLeads(),
          useExpenseStore.getState().fetchEntries(),
          useOrderStore.getState().fetchOrders(),
          useNoteStore.getState().fetchNotes(),
          useInvoiceStore.getState().fetchInvoices(),
          useContentStore.getState().fetchItems(),
          useSettingsStore.getState().fetchSettings(),
        ]);
        setSyncFeedback({ success: true, message: 'All local data safely synced to cloud!' });
      } else if (newStatus === 'permission_denied') {
        setSyncFeedback({ 
          success: false, 
          message: 'Permission denied. Paste the rules in Firebase Console and click Publish.' 
        });
      } else {
        setSyncFeedback({ success: false, message: 'Unable to connect to Firebase.' });
      }
    } catch (e) {
      setSyncFeedback({ success: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem('menuwo_firebase_config', JSON.stringify(fbConfig));
    } catch (e) {
      console.error('Failed to save Firebase config:', e);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importBackupData(text);
      if (res.success) {
        // Refresh all stores
        await Promise.all([
          useTaskStore.getState().fetchTasks(),
          useLeadStore.getState().fetchLeads(),
          useExpenseStore.getState().fetchEntries(),
          useOrderStore.getState().fetchOrders(),
          useNoteStore.getState().fetchNotes(),
          useInvoiceStore.getState().fetchInvoices(),
          useContentStore.getState().fetchItems(),
          useSettingsStore.getState().fetchSettings(),
        ]);
        setImportStatus({ success: true, message: 'Backup restored successfully!' });
      } else {
        setImportStatus({ success: false, message: 'Invalid backup file format.' });
      }
    } catch (err) {
      setImportStatus({ success: false, message: 'Error reading file: ' + err.message });
    }
    // reset input
    e.target.value = '';
    setTimeout(() => setImportStatus(null), 4000);
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="page-header">Settings</h1>
          <p className="text-text-muted text-sm mt-0.5">Customize your Menuwo Business OS</p>
        </div>

        <div className="space-y-5">
          {/* Cloud Sync Status Card */}
          <div className="glass-card p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="text-accent" size={18} />
                <h3 className="text-sm font-semibold text-white">Multi-Device Cloud Sync</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : status === 'permission_denied'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                  : 'bg-white/5 text-text-muted'
              }`}>
                {status === 'connected' ? '● Synced' : status === 'permission_denied' ? 'Action Needed' : 'Local Only'}
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed mb-4">
              {status === 'connected' ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={14} /> Cloud sync active. Data changes appear automatically on all your devices.
                </span>
              ) : status === 'permission_denied' ? (
                <span className="text-amber-300">
                  Data is safely saved on this computer, but Firebase Firestore rules currently block sync. To show data on other devices, follow the 1-minute fix below.
                </span>
              ) : (
                'Data is currently stored locally in your browser.'
              )}
            </p>

            {/* 1-Minute Fix Section if permission_denied */}
            {status !== 'connected' && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span>1-Minute Fix: Enable Firestore Cloud Rules</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  1. Open your{' '}
                  <a
                    href="https://console.firebase.google.com/project/menuwo-task-manager/firestore/rules"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline font-semibold inline-flex items-center gap-1"
                  >
                    Firebase Console Rules tab <ExternalLink size={10} />
                  </a>
                  <br />
                  2. Paste the rules below and click <strong>Publish</strong>:
                </p>
                <div className="relative rounded-lg bg-black/80 border border-white/10 p-2.5 font-mono text-[11px] text-emerald-400">
                  <button
                    onClick={handleCopyRules}
                    className="absolute top-2 right-2 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 transition-all"
                  >
                    {copied ? <Check size={11} className="text-accent" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <pre className="overflow-x-auto pr-16">{FIRESTORE_RULES_SNIPPET}</pre>
                </div>
              </div>
            )}

            {syncFeedback && (
              <div className={`p-2.5 rounded-lg text-xs mb-3 ${
                syncFeedback.success 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}>
                {syncFeedback.message}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTestAndSync}
                disabled={testing || isSyncing}
                className="btn-accent py-2 px-3 text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={13} className={testing || isSyncing ? 'animate-spin' : ''} />
                <span>{testing || isSyncing ? 'Syncing...' : 'Test Connection & Sync Now'}</span>
              </button>
              <button
                onClick={downloadBackup}
                className="btn-outline py-2 px-3 text-xs flex items-center gap-1.5 text-white"
                title="Download backup file to keep your data 100% safe"
              >
                <Download size={13} />
                <span>Export Backup (JSON)</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-outline py-2 px-3 text-xs flex items-center gap-1.5 text-white"
                title="Import backup JSON file"
              >
                <Upload size={13} />
                <span>Import Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>

            {importStatus && (
              <div className={`mt-3 p-2 rounded-lg text-xs ${
                importStatus.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
              }`}>
                {importStatus.message}
              </div>
            )}
          </div>

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
                  onChange={(e) => updateProfile({ name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Business Name</label>
                <input className="input-glass" value={profile.business}
                  onChange={(e) => updateProfile({ business: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Email</label>
                <input className="input-glass" type="email" value={profile.email}
                  onChange={(e) => updateProfile({ email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Role</label>
                <input className="input-glass" value={profile.role}
                  onChange={(e) => updateProfile({ role: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Firebase Configuration */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="text-accent" size={16} />
              <h3 className="text-sm font-semibold text-white">Firebase Project Keys</h3>
              <span className="badge text-[10px] text-accent bg-accent/10">Active</span>
            </div>
            <p className="text-xs text-text-muted mb-3">
              Configured for multi-device sync across all devices.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-text-muted mb-1 block">API Key</label>
                <input className="input-glass font-mono text-xs" type="password" placeholder="AIzaSy..."
                  value={fbConfig.apiKey} onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Project ID</label>
                <input className="input-glass font-mono text-xs" placeholder="my-project-123"
                  value={fbConfig.projectId} onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Auth Domain</label>
                <input className="input-glass font-mono text-xs" placeholder="my-project.firebaseapp.com"
                  value={fbConfig.authDomain} onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-text-muted mb-1 block">App ID</label>
                <input className="input-glass font-mono text-xs" placeholder="1:123456789:web:abcdef..."
                  value={fbConfig.appId} onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })} />
              </div>
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
                    onClick={() => updateNotifications({ [key]: !notifications[key] })}
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
            {saved ? <><Check size={16} /> Settings Saved!</> : <><Save size={16} /> Save Settings</>}
          </motion.button>
        </div>
      </div>
    </PageWrapper>
  );
}
