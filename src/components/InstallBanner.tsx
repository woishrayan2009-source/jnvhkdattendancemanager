import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export const InstallBanner: React.FC = () => {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80 animate-slide-up">
      <div className="bg-[#1a3a5c] text-white rounded-2xl shadow-2xl px-4 py-4 flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Download size={18} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install JNV App</p>
          <p className="text-xs text-white/70 mt-0.5">Works offline · No app store needed</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={install}
            className="bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/50 hover:text-white transition-colors p-1"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
