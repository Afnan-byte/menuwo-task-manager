import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, RefreshCw, Download, Database, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';
import useSyncStore from '../../store/syncStore';
import useTaskStore from '../../store/taskStore';
import useLeadStore from '../../store/leadStore';
import useExpenseStore from '../../store/expenseStore';
import useOrderStore from '../../store/orderStore';
import useNoteStore from '../../store/noteStore';
import useInvoiceStore from '../../store/invoiceStore';
import useContentStore from '../../store/contentStore';
import useSettingsStore from '../../store/settingsStore';

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

export default function CloudSyncModal({ open, onClose }) {
  const { status, statusMessage, isSyncing, checkStatus, syncNow, downloadBackup } = useSyncStore();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  if (!open) return null;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestAndSync = async () => {
    setTesting(true);
    setSyncResult(null);
    try {
      const newStatus = await checkStatus();
      if (newStatus === 'connected') {
        const res = await syncNow();
        // Refresh stores
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
        setSyncResult({ success: true, message: 'Connected and synchronized all data with cloud!' });
      } else if (newStatus === 'permission_denied') {
        setSyncResult({ 
          success: false, 
          message: 'Permission still denied. Please ensure you clicked "Publish" in Firebase Console.' 
        });
      } else {
        setSyncResult({ success: false, message: 'Could not connect. Check your internet connection.' });
      }
    } catch (e) {
      setSyncResult({ success: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d12] shadow-2xl p-6 text-white no-scrollbar"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Multi-Device Cloud Sync</h2>
              <p className="text-xs text-text-muted">Ensure your data syncs across phone, laptop, and all devices</p>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className={`p-4 rounded-xl border mb-5 ${
            status === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : status === 'permission_denied'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-white/5 border-white/10 text-text-secondary'
          }`}>
            <div className="flex items-start gap-3">
              {status === 'connected' ? (
                <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-semibold text-sm">
                  {status === 'connected' && 'Cloud Sync is Active!'}
                  {status === 'permission_denied' && 'Firestore Permission Denied (Why other devices don’t see data)'}
                  {status === 'local_only' && 'Running in Local-Only Mode'}
                  {status === 'checking' && 'Checking Cloud Connection...'}
                  {status === 'error' && 'Cloud Connection Error'}
                </p>
                <p className="text-text-muted leading-relaxed">
                  {status === 'connected' && 'All added tasks, leads, orders, and expenses are actively syncing to Firebase Firestore in real-time across your devices.'}
                  {status === 'permission_denied' && 'Your existing data is 100% safe on this device. However, Firebase Firestore security rules currently block syncing, which is why other devices show an empty screen.'}
                  {status === 'local_only' && 'Data is stored safely in your browser’s local storage.'}
                </p>
              </div>
            </div>
          </div>

          {/* 1-Minute Fix Instructions if permission_denied */}
          {status !== 'connected' && (
            <div className="space-y-4 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                1-Minute Fix to Enable Cloud Sync
              </h3>

              <div className="space-y-2.5 text-xs text-text-muted">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px]">1</span>
                  <p>
                    Open your{' '}
                    <a
                      href="https://console.firebase.google.com/project/menuwo-task-manager/firestore/rules"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline inline-flex items-center gap-1 font-medium hover:text-accent-hover"
                    >
                      Firebase Console Rules tab <ExternalLink size={12} />
                    </a>
                    {' '}(Project: <code>menuwo-task-manager</code>).
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px]">2</span>
                  <p>Copy and paste these exact Firestore rules into the editor:</p>
                </div>
              </div>

              {/* Code Snippet */}
              <div className="relative rounded-xl bg-black/60 border border-white/10 p-3 font-mono text-[11px] text-emerald-400">
                <button
                  onClick={handleCopyRules}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy Rules'}</span>
                </button>
                <pre className="overflow-x-auto pr-24">{FIRESTORE_RULES_SNIPPET}</pre>
              </div>

              <div className="flex items-start gap-2 text-xs text-text-muted">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px]">3</span>
                <p>Click <strong className="text-white">Publish</strong> in the Firebase Console, then click <strong className="text-accent">Test & Sync Now</strong> below.</p>
              </div>
            </div>
          )}

          {/* Sync Result Feedback */}
          {syncResult && (
            <div className={`p-3 rounded-xl text-xs mb-4 ${
              syncResult.success 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}>
              {syncResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/5">
            <button
              onClick={handleTestAndSync}
              disabled={testing || isSyncing}
              className="flex-1 btn-accent py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={testing || isSyncing ? 'animate-spin' : ''} />
              <span>{testing || isSyncing ? 'Testing & Syncing...' : 'Test Connection & Sync Now'}</span>
            </button>

            <button
              onClick={downloadBackup}
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
              title="Download a complete copy of all your local data"
            >
              <Download size={14} />
              <span>Backup Data (JSON)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
