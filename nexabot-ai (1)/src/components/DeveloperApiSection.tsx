import React, { useState } from 'react';
import { Terminal, Copy, Check, Code, Play, ShieldAlert, Cpu } from 'lucide-react';

export const DeveloperApiSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'curl' | 'typescript' | 'python'>('curl');
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    curl: `curl -X POST https://ais-pre-ktjhqisi7h6smoion7cqi2-660632472690.asia-southeast1.run.app/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskType": "sentiment-analysis",
    "messages": [
      {
        "role": "user",
        "content": "The new update resolved all latency bottlenecks. Outstanding engineering work!"
      }
    ]
  }'`,
    typescript: `import axios from 'axios';

interface ChatResponse {
  reply: string;
  taskType: string;
}

async function queryNexaBot(prompt: string): Promise<string> {
  const response = await axios.post<ChatResponse>('/api/chat', {
    taskType: 'medical-qa',
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.data.reply;
}

// Example Execution
queryNexaBot("Explain preventive care for seasonal allergies").then(console.log);`,
    python: `import requests

def query_nexabot(prompt: str, task_type: str = "document-analysis") -> str:
    url = "https://your-domain.run.app/api/chat"
    payload = {
        "taskType": task_type,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json().get("reply", "")

# Run Analysis
print(query_nexabot("Summarize key milestones in quarterly report text"))`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developer-api" className="py-20 md:py-28 relative bg-slate-900 dark:bg-slate-950 text-slate-100 border-b border-slate-800">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold uppercase tracking-wider">
            <Code className="w-3.5 h-3.5" />
            <span>Developer-First Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            REST API & Multi-Language Integration
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            Integrate NexaBot AI’s server-side inference pipeline directly into external microservices, dashboards, or automation scripts.
          </p>
        </div>

        {/* Code Showcase Terminal Box */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Terminal Title Bar */}
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-1.5 ml-2 font-mono text-xs text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>POST /api/chat</span>
              </div>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('curl')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                  activeTab === 'curl' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveTab('typescript')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                  activeTab === 'typescript' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TypeScript
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                  activeTab === 'python' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Python
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Content */}
          <div className="p-6 overflow-x-auto bg-slate-950 font-mono text-xs sm:text-sm text-cyan-300 leading-relaxed">
            <pre>{codeSnippets[activeTab]}</pre>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Endpoint Active
              </span>
              <span>• Avg Latency: &lt;350ms</span>
              <span>• JSON Payload Spec v1.0</span>
            </div>
            <span className="text-cyan-400 font-semibold">Gemini 3.7 Flash Engine</span>
          </div>
        </div>
      </div>
    </section>
  );
};
