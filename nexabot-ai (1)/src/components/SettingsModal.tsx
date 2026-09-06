import React, { useState } from 'react';
import { X, Settings as SettingsIcon, Trash2, Cpu, Sparkles, Check, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { clearActiveChat, conversations } = useChat();
  const [clearedNotice, setClearedNotice] = useState(false);

  if (!isOpen) return null;

  const handleClearCurrent = () => {
    clearActiveChat();
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100 text-lg">NexaBot AI Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Theme Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Interface Theme
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-all ${
                  theme === 'dark'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-800/50 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>Dark Theme (Default)</span>
                {theme === 'dark' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-all ${
                  theme === 'light'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-800/50 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>Light Theme</span>
                {theme === 'light' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            </div>
          </div>

          {/* Chat Management */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Active Chat Management
            </label>
            <p className="text-xs text-slate-400">
              Total stored conversations in recent history: <span className="text-cyan-400 font-semibold">{conversations.length}</span>
            </p>
            <div className="pt-1">
              <button
                onClick={handleClearCurrent}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Current Active Conversation</span>
              </button>
              {clearedNotice && (
                <p className="text-[11px] text-emerald-400 text-center mt-1.5 flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Chat reset to default welcome message.
                </p>
              )}
            </div>
          </div>

          {/* Internship Project Information */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI & Data Science Internship Project</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              NexaBot AI is built as a production-grade showcase application demonstrating six modular AI tasks powered by Google Gemini 3.6 Flash engine.
            </p>
            <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Engine: gemini-3.6-flash</span>
              <span>Build: v1.0.0</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
