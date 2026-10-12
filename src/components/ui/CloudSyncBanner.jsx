import { useState } from 'react';
import { ShieldAlert, RefreshCw, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import useSyncStore from '../../store/syncStore';

export default function CloudSyncBanner() {
  const { status, setShowRulesModal } = useSyncStore();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === 'connected' || status === 'checking') {
    return null;
  }

  if (status === 'permission_denied') {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex items-center justify-between text-amber-300">
        <div className="flex items-center gap-2 overflow-hidden">
          <ShieldAlert size={15} className="text-amber-400 flex-shrink-0" />
          <span className="truncate">
            <strong>Multi-Device Sync Paused:</strong> Data is currently saved on this computer only because Firebase Firestore rules need approval.
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <button
            onClick={() => setShowRulesModal(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] flex items-center gap-1 transition-colors"
          >
            Fix in 1 Minute <ChevronRight size={12} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400/60 hover:text-amber-300 p-0.5"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
