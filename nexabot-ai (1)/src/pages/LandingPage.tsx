import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { FeatureCard } from '../components/FeatureCard';
import { FEATURES_DATA } from '../data/featuresData';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { 
  Bot, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  BrainCircuit, 
  CheckCircle2, 
  Activity, 
  Database,
  Cpu,
  Layers,
  Award,
  Lock,
  Server,
  HelpCircle,
  FileCode,
  Gauge,
  Check
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const { createNewChat } = useChat();

  const handleStartExploring = () => {
    if (isAuthenticated) {
      onNavigate('/chatbot');
    } else {
      onNavigate('/signup');
    }
  };

  const handleExploreFeature = (taskId: string) => {
    if (isAuthenticated) {
      createNewChat(taskId as any);
      onNavigate('/chatbot');
    } else {
      onNavigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar onNavigate={onNavigate} currentPath="/" />

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950">
        {/* Subtle Overlay */}
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/60 z-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none z-0" />
        <div className="absolute top-1/4 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Status Beacon & Project Badge */}
              <div className="inline-flex flex-wrap items-center gap-2 p-1 pl-3 pr-3.5 rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-md shadow-cyan-500/5 backdrop-blur-md">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Systems Operational
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI & Data Science Project
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                One AI Assistant.{' '}
                <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 dark:from-cyan-400 dark:via-blue-500 dark:to-indigo-500 bg-clip-text text-transparent">
                  Six Powerful Tasks.
                </span>
              </h1>

              {/* Subtitle / Description */}
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Meet NexaBot AI — a production-ready, full-stack intelligent assistant bringing specialized AI capabilities, server-side inference, NLP visualizers, and speech synthesis together in one unified platform.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={handleStartExploring}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                  <span>Launch Chatbot Dashboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Tech Badges Row */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium">
                  TypeScript
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium">
                  React 18 + Vite
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium">
                  Tailwind CSS v4
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium">
                  Express.js Proxy
                </span>
                <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                  Gemini 3.7 Flash
                </span>
              </div>
            </div>

            {/* Right Interactive AI Visual Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-blue-600/20 to-indigo-600/30 shadow-2xl shadow-cyan-500/10">
                <div className="bg-white dark:bg-slate-900/95 rounded-[22px] p-6 space-y-6 overflow-hidden relative border border-slate-200 dark:border-slate-800/80 shadow-md backdrop-blur-xl">
                  
                  {/* Visual Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                        Inference Active
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded font-medium">
                      gemini-3.7-flash
                    </span>
                  </div>

                  {/* Robot/AI Interactive Node Card */}
                  <div className="relative flex items-center justify-center py-6">
                    <div className="absolute w-44 h-44 rounded-full bg-cyan-500/10 animate-pulse blur-xl" />
                    <div className="relative z-10 w-28 h-28 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-1 shadow-2xl shadow-cyan-500/30 flex items-center justify-center">
                      <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[12px] flex items-center justify-center">
                        <Bot className="w-14 h-14 text-cyan-400 animate-bounce-slow" />
                      </div>
                    </div>
                  </div>

                  {/* Active Capability Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">Personal Assistant</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">Sentiment Analysis</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">Image Analysis</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">Paper Analysis</span>
                    </div>
                  </div>

                  {/* System Prompt Bar */}
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span className="truncate">status: ready for user input</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">100% Online</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES / TASKS SECTION */}
      <section id="features" className="py-20 md:py-28 relative bg-white dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Modular Multi-Agent Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Six Specialized AI Capabilities
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
              Each capability is fine-tuned with dedicated system directives, safety guardrails, and output formatters.
            </p>
          </div>

          {/* 6 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES_DATA.map((feat) => (
              <FeatureCard
                key={feat.id}
                feature={feat}
                onExplore={handleExploreFeature}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ENTERPRISE TRUST, SECURITY & COMPLIANCE */}
      <section className="py-20 md:py-28 relative bg-white dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise Standards</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Built with Security, Privacy & Safety
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
              Designed from the ground up to follow industry best practices in data security, secret isolation, and AI safety disclaimers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Zero-Leak Secret Isolation
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All external API tokens remain securely isolated on the Node.js/Express server. No keys or tokens are ever exposed to the client browser.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Client Session Privacy
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Chat history is kept strictly in the user's browser localStorage with full control to delete, rename, or export transcripts anytime.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Clinical & AI Guardrails
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Medical and domain models include automated safety directives preventing non-factual prescription generation and encouraging doctor consultations.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ABOUT & INTERNSHIP CREDENTIALS */}
      <section id="about" className="py-20 relative bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-6 text-center">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-semibold uppercase tracking-wider justify-center">
              <Award className="w-3.5 h-3.5" />
              <span>Internship Project Showcase</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Designed for High-Impact AI Engineering
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              NexaBot AI was architected as a comprehensive internship portfolio project demonstrating real-world proficiency in full-stack architecture, prompt engineering, multi-task AI routing, speech synthesis, and accessible UX.
            </p>

            <div className="grid sm:grid-cols-3 gap-6 pt-6 text-left">
              <div className="space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Production-Grade Codebase</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Strict TypeScript typing, modular component boundaries, and robust error handling.</p>
              </div>

              <div className="space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Voice Integration</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Web Speech API speech synthesis with toggleable pause/stop state and mic speech-to-text.</p>
              </div>

              <div className="space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Session Management</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Persistent multi-chat caching with one-click Markdown, JSON, and PDF report downloads.</p>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={handleStartExploring}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <span>Explore the Full Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
