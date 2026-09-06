import React, { useState, useEffect, useRef } from 'react';
import { Globe, Send, Sparkles, Languages, Cpu, CheckCircle2, RefreshCcw, ArrowRight, MessageSquare, Shield, Layers, Bot, User } from 'lucide-react';

interface MultilingualMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  language?: string;
  confidence?: number;
  isCodeSwitched?: boolean;
  detectedLanguages?: string[];
  slots?: Record<string, string>;
  intent?: string;
  timestamp: number;
}

export const MultilingualChat: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'demo' | 'architecture'>('chat');
  const [messages, setMessages] = useState<MultilingualMessage[]>([
    {
      id: 'msg_init',
      sender: 'assistant',
      text: "Hello! I am NexaBot AI's Multilingual Assistant. You can speak to me in English, Spanish, Français, Deutsch, Hindi, or mixed code-switched phrases. I will maintain your context and slots across all language switches!",
      language: 'en',
      confidence: 0.99,
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(`multi_session_${Date.now()}`);
  const [currentSlots, setCurrentSlots] = useState<Record<string, string>>({});
  const [demoScenario, setDemoScenario] = useState<any[]>([]);
  const [architectureInfo, setArchitectureInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Fetch demo scenario on mount
    fetch('/api/multilingual/demo')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDemoScenario(data.scenario);
          setArchitectureInfo(data.architectureDescription);
        }
      })
      .catch(err => console.error('Failed to load multilingual demo:', err));
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    const userMsgId = `msg_user_${Date.now()}`;

    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp: Date.now()
      }
    ]);

    setIsSending(true);

    try {
      const res = await fetch('/api/multilingual/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userText })
      });
      const data = await res.json();

      if (data.success) {
        if (data.slots) {
          setCurrentSlots(data.slots);
        }
        setMessages(prev => [
          ...prev,
          {
            id: `msg_asst_${Date.now()}`,
            sender: 'assistant',
            text: data.reply,
            language: data.detectedLanguage,
            confidence: data.confidence,
            isCodeSwitched: data.isCodeSwitched,
            detectedLanguages: data.detectedLanguages,
            slots: data.slots,
            intent: data.intent,
            timestamp: Date.now()
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to process multilingual request');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Error processing multilingual request: ${err.message}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const loadDemoIntoChat = () => {
    const demoMessages: MultilingualMessage[] = [];
    demoScenario.forEach((turn, idx) => {
      demoMessages.push({
        id: `demo_${idx}_${Date.now()}`,
        sender: turn.speaker,
        text: turn.text,
        language: turn.language,
        confidence: 0.95,
        timestamp: Date.now() + idx * 100
      });
    });
    setMessages(demoMessages);
    setCurrentSlots({ destination: 'Tokyo', preference: 'hotel & flight' });
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-900 dark:text-white">NexaBot Multilingual Engine</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-semibold">Task 6</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cross-lingual context retention, code-switching LID, and pivot-architecture
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/chatbot')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors cursor-pointer"
          >
            Back to Standard Chat
          </button>
          <button
            onClick={() => onNavigate('/')}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Home
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 flex gap-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'chat'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Interactive Multilingual Chat
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'demo'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Demo Conversation & Ambiguity Resolution
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'architecture'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Architecture & Open-Source Design
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col">
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
            {/* Chat Column */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[650px]">
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Metadata Badge for Assistant */}
                      {msg.sender === 'assistant' && msg.language && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-bold uppercase">
                            Lang: {msg.language}
                          </span>
                          {msg.confidence && (
                            <span>Conf: {(msg.confidence * 100).toFixed(0)}%</span>
                          )}
                          {msg.isCodeSwitched && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold">
                              Code-Switched
                            </span>
                          )}
                          {msg.intent && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 font-medium">
                              Intent: {msg.intent}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type in English, Spanish (Hola), French (Bonjour), Hindi (नमस्ते), or mixed..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </form>
            </div>

            {/* Sidebar Context & Slots Inspector */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <Languages className="w-4 h-4 text-indigo-500" />
                  Active Dialogue State & Slots
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Extracted entities and context retained across language switches:
                </p>

                <div className="space-y-2">
                  {Object.keys(currentSlots).length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-center">
                      No slots extracted yet. Try asking to book a trip to Tokyo in Spanish or Hindi!
                    </div>
                  ) : (
                    Object.entries(currentSlots).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{k}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{v}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Test Multilingual Demo
                </h3>
                <p className="text-xs text-indigo-200 mb-4">
                  Instantly load the pre-configured demo conversation showing English ➔ Spanish ➔ Hindi switches, context retention, and ambiguity resolution.
                </p>
                <button
                  onClick={loadDemoIntoChat}
                  className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Load Demo Conversation
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'demo' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Multilingual Demo Conversation</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Demonstrating language switching (English ➔ Spanish ➔ Hindi ➔ French), slot retention, and contextual ambiguity resolution.
                </p>
              </div>
              <button
                onClick={loadDemoIntoChat}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Play in Interactive Chat
              </button>
            </div>

            <div className="space-y-4">
              {demoScenario.map((turn, index) => (
                <div key={index} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      Turn {turn.turn} • {turn.speaker.toUpperCase()} ({turn.language.toUpperCase()})
                    </span>
                    <span className="text-slate-400">Architectural Note</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    "{turn.text}"
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    💡 <strong className="text-indigo-600 dark:text-indigo-400">Behavior:</strong> {turn.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'architecture' && architectureInfo && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{architectureInfo.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Designed with clean separation of concerns, pivot-language normalization, and open-source modularity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {architectureInfo.principles.map((principle: string, idx: number) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {principle}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-transparent border border-indigo-500/20 space-y-3">
              <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Open-Source Model Stack Integration
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The architecture decouples Language Identification (fastText/langdetect), Neural Machine Translation (MarianMT / NLLB / M2M100 via HuggingFace Transformers), and Intent/Slot dialogue logic. This ensures models can be swapped effortlessly without altering upstream conversation management or slot persistence.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
