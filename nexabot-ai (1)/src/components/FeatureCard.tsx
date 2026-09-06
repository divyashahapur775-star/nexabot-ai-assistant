import React from 'react';
import { FeatureCardInfo } from '../types';
import { Bot, Activity, Stethoscope, FileText, BookOpen, Cpu, ArrowUpRight, Sparkles } from 'lucide-react';

interface FeatureCardProps {
  feature: FeatureCardInfo;
  onExplore: (taskId: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Bot: <Bot className="w-6 h-6" />,
  Activity: <Activity className="w-6 h-6" />,
  Stethoscope: <Stethoscope className="w-6 h-6" />,
  FileText: <FileText className="w-6 h-6" />,
  BookOpen: <BookOpen className="w-6 h-6" />,
  Cpu: <Cpu className="w-6 h-6" />
};

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onExplore }) => {
  const icon = iconMap[feature.iconName] || <Bot className="w-6 h-6" />;

  return (
    <div className="group relative rounded-2xl p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 shadow-md hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col justify-between h-full overflow-hidden">
      {/* Subtle Background Glow */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${feature.bgGradient} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none`} />

      <div>
        {/* Top Header: Number & Badge */}
        <div className="flex items-center justify-between mb-5">
          <span className="font-mono text-2xl font-black text-slate-400 dark:text-slate-500 opacity-80 group-hover:opacity-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-all">
            {feature.number}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 group-hover:border-cyan-500/30 transition-colors">
            <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
            {feature.badge}
          </span>
        </div>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${feature.color} flex items-center justify-center text-white shadow-md shadow-cyan-500/10 group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {feature.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          {feature.description}
        </p>
      </div>

      {/* Explore Button */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
          {feature.id}
        </span>
        <button
          onClick={() => onExplore(feature.id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 text-slate-800 dark:text-slate-200 hover:text-white text-xs font-medium transition-all duration-200 cursor-pointer group-hover:bg-cyan-500 group-hover:text-white"
        >
          <span>Explore</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
