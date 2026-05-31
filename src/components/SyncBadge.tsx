import React from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SyncBadge: React.FC = () => {
  const { pendingCount, isSyncing, isOnline } = useSyncStatus();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium">
        <CheckCircle2 className="w-4 h-4" />
        <span>Synced</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full font-medium">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full font-medium">
      <WifiOff className="w-4 h-4" />
      <span>Offline</span>
      {pendingCount > 0 && (
        <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">
          {pendingCount} pending
        </span>
      )}
    </div>
  );
};
