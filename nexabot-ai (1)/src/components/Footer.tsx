import React from 'react';
import { Bot, Sparkles, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Brand */}
          <div className="md:col-span-1 space-y-3">
            <div 
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2 cursor-pointer inline-flex"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                NexaBot<span className="text-cyan-600 dark:text-cyan-500">.AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              An intelligent assistant platform bringing 6 core AI capabilities together in one unified SaaS experience.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-3 h-3" />
                AI & Data Science Internship Project
              </span>
            </div>
          </div>

          {/* Column 2: Platform Tasks */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-3">
              AI Capabilities
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><button onClick={() => onNavigate('/chatbot')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Personal Assistant</button></li>
              <li><button onClick={() => onNavigate('/chatbot')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Sentiment Analysis</button></li>
              <li><button onClick={() => onNavigate('/chatbot')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Medical Q&A</button></li>
              <li><button onClick={() => onNavigate('/chatbot')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Knowledge Base</button></li>
              <li><button onClick={() => onNavigate('/chatbot')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Paper Analysis</button></li>
              <li><button onClick={() => onNavigate('/chatbot')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Image Analysis</button></li>
            </ul>
          </div>

          {/* Column 3: Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><button onClick={() => onNavigate('/')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Landing Home</button></li>
              <li><button onClick={() => onNavigate('/chatbot')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Chatbot Dashboard</button></li>
              <li><button onClick={() => onNavigate('/login')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">User Login</button></li>
              <li><button onClick={() => onNavigate('/signup')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">Create Account</button></li>
            </ul>
          </div>

          {/* Column 4: Internship Specs */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-3">
              Internship Tech
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
              Built with React.js, Tailwind CSS v4, Express server, and Google Gemini 3.6 Flash engine for high-speed inference.
            </p>
            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
              Version 1.0.0 (Production Build)
            </span>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} NexaBot AI. All rights reserved.</p>
          <p className="flex items-center gap-1 font-medium">
            <span>Developed for AI & Data Science Internship Presentation</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
