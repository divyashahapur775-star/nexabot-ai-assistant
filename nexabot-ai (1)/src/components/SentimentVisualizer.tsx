import React from 'react';
import { Smile, Frown, Meh, AlertCircle, TrendingUp, BarChart2, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';
import { SentimentAnalysisData, AdaptationStrategyData, ConversationSentimentContextData } from '../types';

interface SentimentVisualizerProps {
  text: string;
  sentimentData?: SentimentAnalysisData;
  adaptationStrategy?: AdaptationStrategyData;
  conversationContext?: ConversationSentimentContextData;
}

export const SentimentVisualizer: React.FC<SentimentVisualizerProps> = ({
  text,
  sentimentData,
  adaptationStrategy,
  conversationContext
}) => {
  // Use structured sentimentData if provided by backend, or evaluate heuristics
  let label: 'Positive' | 'Negative' | 'Neutral' | 'Mixed' = sentimentData?.label || 'Neutral';
  let score = sentimentData ? (sentimentData.confidencePercentage / 100) : 0.75;
  let polarity = sentimentData?.polarityScore ?? 0.0;
  let joyScore = sentimentData?.emotionDistribution?.joy ?? 30;
  let neutralScore = sentimentData?.emotionDistribution?.neutrality ?? 50;
  let frustrationScore = sentimentData?.emotionDistribution?.frustration ?? 20;
  let urgencyScore = sentimentData?.emotionDistribution?.urgency ?? 15;
  let satisfactionScore = sentimentData?.emotionDistribution?.satisfaction ?? 50;

  if (!sentimentData) {
    const isPositive = /positive|optimistic|joy|satisfaction|delighted|happy|excited|great|love/i.test(text);
    const isNegative = /negative|frustrat|angry|disappoint|poor|sad|terrible|critic|broken|fail/i.test(text);
    if (isPositive && !isNegative) {
      label = 'Positive';
      score = 0.88;
      polarity = 0.72;
      joyScore = 85;
      satisfactionScore = 88;
      neutralScore = 10;
      frustrationScore = 5;
    } else if (isNegative && !isPositive) {
      label = 'Negative';
      score = 0.85;
      polarity = -0.68;
      joyScore = 5;
      satisfactionScore = 12;
      neutralScore = 15;
      frustrationScore = 80;
      urgencyScore = 65;
    }
  }

  const getScoreColor = () => {
    if (label === 'Positive') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (label === 'Negative') return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (label === 'Mixed') return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  };

  const getIcon = () => {
    if (label === 'Positive') return <Smile className="w-4 h-4 text-emerald-500" />;
    if (label === 'Negative') return <Frown className="w-4 h-4 text-rose-500" />;
    if (label === 'Mixed') return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return <Meh className="w-4 h-4 text-cyan-500" />;
  };

  return (
    <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Real-Time Sentiment & Emotion Metrics
          </span>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getScoreColor()}`}>
          {getIcon()}
          <span>{label}</span>
        </div>
      </div>

      {/* Metric Gauge & Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Confidence Score</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
              {(score * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> High
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${score * 100}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Polarity Index</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
              {polarity >= 0 ? `+${polarity.toFixed(2)}` : polarity.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">[-1.0 to +1.0]</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                label === 'Positive' ? 'bg-emerald-500' : label === 'Negative' ? 'bg-rose-500' : 'bg-cyan-500'
              }`} 
              style={{ width: `${Math.max(10, Math.min(100, (polarity + 1) * 50))}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Multi-Turn Trend</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {conversationContext?.trend || 'Stable'}
            </span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
              Turn #{conversationContext?.turnIndex || 1}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: '80%' }} />
          </div>
        </div>
      </div>

      {/* Emotion Probabilities */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
          Emotion Probability Distribution
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600 dark:text-slate-300">Satisfaction / Joy</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{joyScore}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${joyScore}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600 dark:text-slate-300">Neutral / Objective</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{neutralScore}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${neutralScore}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600 dark:text-slate-300">Frustration / Friction</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{frustrationScore}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${frustrationScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Response Adaptation & Escalation Status */}
      {adaptationStrategy && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-medium">Adapted Strategy:</span>
            <span className="text-slate-900 dark:text-white font-semibold">{adaptationStrategy.tone}</span>
          </div>

          {adaptationStrategy.shouldEscalate ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Human Escalation Triggered ({adaptationStrategy.escalationLevel})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span>✅ Automated Resolution Mode</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
