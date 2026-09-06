import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Binary, 
  Sparkles, 
  Volume2, 
  CheckCircle2, 
  Terminal,
  ArrowRight,
  Database
} from 'lucide-react';

export const ArchitecturePipeline: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: '1. Input Ingestion & Sanitization',
      category: 'Client Layer',
      icon: Terminal,
      color: 'from-cyan-500 to-blue-500',
      badge: 'Client / React 18',
      summary: 'Multi-modal user input capture with document attachment parsing and client-side speech transcription.',
      details: [
        'Multi-format support: raw text queries, PDF attachments, code blocks, and audio transcriptions via Web Speech API.',
        'Immediate optimistic state updates with local storage persistence to prevent user session loss.',
        'Context sanitization and payload batching.'
      ]
    },
    {
      id: 2,
      title: '2. Domain Prompt Orchestration',
      category: 'Proxy Gateway',
      icon: Layers,
      color: 'from-blue-500 to-indigo-500',
      badge: 'Express Gateway',
      summary: 'Dynamic task routing attaching domain-specific system prompts, temperature settings, and safety filters.',
      details: [
        'Task classifiers: Medical Q&A, Sentiment Analysis, Document Summarizer, Domain Consultant, Personal Assistant, Knowledge Base.',
        'Enforces clinical safety disclaimers and structured JSON/Markdown schema constraints.',
        'Masks API credentials entirely on the backend to avoid client exposure.'
      ]
    },
    {
      id: 3,
      title: '3. Multi-Tier Model Inference',
      category: 'Inference Layer',
      icon: Cpu,
      color: 'from-indigo-500 to-purple-500',
      badge: 'Gemini 3.7 Flash',
      summary: 'High-speed cloud inference with multi-model fallback cascade and intelligent offline resilience.',
      details: [
        'Direct connection to Google Gemini 3.7 Flash with automatic failover to Gemini 2.5 / 3.1 using the @google/genai SDK.',
        'Autonomous offline heuristic engine providing deep contextual responses when keys are unconfigured.',
        'Sub-400ms target latency with token usage observability.'
      ]
    },
    {
      id: 4,
      title: '4. Post-Processing & Audio Delivery',
      category: 'Response Delivery',
      icon: Volume2,
      color: 'from-purple-500 to-pink-500',
      badge: 'Output Engine',
      summary: 'Rich UI markdown rendering, NLP sentiment visualization gauges, and interactive speech synthesis.',
      details: [
        'Instant text-to-speech audio playback with pause/stop state synchronization.',
        'Dynamic NLP sentiment & emotion score breakdown bars.',
        '1-click Markdown copying and formatted report exports.'
      ]
    }
  ];

  return (
    <section id="architecture" className="py-20 md:py-28 relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>End-to-End System Flow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Production AI & Data Science Pipeline
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            A look under the hood at how NexaBot AI orchestrates multi-agent tasks, secures credentials, and guarantees sub-second response delivery.
          </p>
        </div>

        {/* Step Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {steps.map((step) => {
            const Icon = step.icon;
            const isSelected = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`p-5 rounded-2xl text-left transition-all duration-300 border cursor-pointer flex flex-col justify-between h-full relative overflow-hidden ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-cyan-500 shadow-xl shadow-cyan-500/10 -translate-y-1'
                    : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
                )}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${step.color} flex items-center justify-center text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {step.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {step.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                    Stage {step.id} of 4
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-cyan-500 translate-x-1' : 'text-slate-400'}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Deep Dive Card for Active Step */}
        {steps.find(s => s.id === activeStep) && (() => {
          const current = steps.find(s => s.id === activeStep)!;
          const Icon = current.icon;
          return (
            <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${current.color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                      {current.category}
                    </span>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                      {current.title}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    ● High Availability Pipeline
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {current.details.map((detail, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Specification {idx + 1}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    </section>
  );
};
