import { create } from 'zustand';
import { checkCloudConnection, syncAllLocalDataToCloud, downloadBackupFile, saveEmergencyBackup } from '../lib/syncService';
import { isFirebaseConfigured } from '../lib/firebase';

const useSyncStore = create((set, get) => ({
  status: isFirebaseConfigured ? 'checking' : 'local_only', // 'checking' | 'connected' | 'permission_denied' | 'local_only' | 'error'
  statusMessage: '',
  isSyncing: false,
  lastSyncTime: null,
  showRulesModal: false,

  setShowRulesModal: (val) => set({ showRulesModal: val }),

  checkStatus: async () => {
    if (!isFirebaseConfigured) {
      set({ status: 'local_only', statusMessage: 'Firebase configuration is not set.' });
      return 'local_only';
    }

    const res = await checkCloudConnection();
    set({
      status: res.status,
      statusMessage: res.message,
      lastSyncTime: res.status === 'connected' ? new Date().toISOString() : get().lastSyncTime
    });
    return res.status;
  },

  syncNow: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    // Save local emergency snapshot first
    saveEmergencyBackup();

    const status = await get().checkStatus();
    if (status !== 'connected') {
      set({ isSyncing: false });
      return { success: false, status, message: get().statusMessage };
    }

    const res = await syncAllLocalDataToCloud();
    set({
      isSyncing: false,
      lastSyncTime: res.success ? new Date().toISOString() : get().lastSyncTime
    });

    return res;
  },

  downloadBackup: () => {
    downloadBackupFile();
  }
}));

export default useSyncStore;
