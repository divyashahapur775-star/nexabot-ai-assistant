import React, { useState } from 'react';
import { Bot, Sparkles, Menu, X, ArrowRight, UserCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPath = '/' }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, currentUser } = useAuth();

  const handleNavClick = (path: string, sectionId?: string) => {
    setMobileMenuOpen(false);
    if (sectionId && currentPath === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200 shadow-xs dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Branding Logo */}
        <div 
          onClick={() => handleNavClick('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                NexaBot<span className="text-cyan-600 dark:text-cyan-500 font-extrabold">.AI</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 hidden sm:inline-block">
                Internship Project
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1 hidden sm:block">
              Intelligent Assistant Platform
            </span>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => handleNavClick('/', 'features')}
            className="text-slate-600 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => handleNavClick('/', 'about')}
            className="text-slate-600 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 transition-colors cursor-pointer"
          >
            About
          </button>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle showLabel={false} />

          {isAuthenticated ? (
            <button
              onClick={() => onNavigate('/chatbot')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Dashboard ({currentUser?.name.split(' ')[0]})</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate('/login')}
                className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors text-sm font-medium cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => onNavigate('/signup')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all cursor-pointer"
              >
                <span>Try NexaBot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle showLabel={false} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200 shadow-lg">
          <div className="flex flex-col space-y-2 text-sm">
            <button
              onClick={() => handleNavClick('/', 'features')}
              className="text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('/', 'about')}
              className="text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              About
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                onClick={() => { setMobileMenuOpen(false); onNavigate('/chatbot'); }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Go to Chatbot Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('/login'); }}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium text-center"
                >
                  Login
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('/signup'); }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm text-center flex items-center justify-center gap-1.5"
                >
                  <span>Start Exploring NexaBot AI</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
