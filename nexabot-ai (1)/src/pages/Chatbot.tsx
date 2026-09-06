import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { TaskType, Attachment, ChatMessage } from '../types';
import { FEATURES_DATA } from '../data/featuresData';
import { SettingsModal } from '../components/SettingsModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { SentimentVisualizer } from '../components/SentimentVisualizer';
import { ExportReportModal } from '../components/ExportReportModal';
import { FirestoreKnowledgeModal } from '../components/FirestoreKnowledgeModal';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Settings,
  LogOut,
  Menu,
  X,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Paperclip,
  Sparkles,
  FileText,
  User,
  Activity,
  Stethoscope,
  BookOpen,
  Cpu,
  BrainCircuit,
  Layers,
  ArrowRight,
  MessageSquare,
  Mic,
  MicOff,
  Download,
  Share2,
  CheckCircle2,
  Database,
  Globe
} from 'lucide-react';

interface ChatbotProps {
  onNavigate: (path: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  BrainCircuit: <BrainCircuit className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />,
  Activity: <Activity className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
  Stethoscope: <Stethoscope className="w-5 h-5 text-rose-500 dark:text-rose-400" />,
  FileText: <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
  BookOpen: <BookOpen className="w-5 h-5 text-purple-500 dark:text-purple-400" />,
  Cpu: <Cpu className="w-5 h-5 text-blue-500 dark:text-blue-400" />
};

const RenderMessageContent: React.FC<{ text: string }> = ({ text }) => {
  // Regex to match SVGs
  const svgRegex = /(<svg[\s\S]*?<\/svg>)/gi;
  // Regex to match markdown images: ![alt](url)
  const mdImageRegex = /(!\[.*?\]\([^)]+\))/g;

  // Split text combining both regexes (using a unified tokenizer approach or sequential)
  // To keep it simple, let's just use a combined regex to split the text into parts
  const tokenRegex = /(<svg[\s\S]*?<\/svg>|!\[.*?\]\([^)]+\))/gi;
  
  if (!tokenRegex.test(text)) {
    return <span>{text}</span>;
  }

  const parts = text.split(tokenRegex);
  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (!part) return null;
        
        if (part.trim().startsWith('<svg') && part.trim().endsWith('</svg>')) {
          return (
            <div 
              key={idx} 
              className="my-3 p-3.5 bg-slate-950/90 rounded-xl border border-slate-700/60 overflow-x-auto shadow-inner flex flex-col items-center text-slate-100"
            >
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-cyan-400 font-mono">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Concept Architecture Diagram
                </span>
                <span className="text-[10px] text-slate-400 font-sans">Vector SVG Viewport</span>
              </div>
              <div 
                className="w-full flex justify-center py-2 min-w-[320px] max-w-full"
                dangerouslySetInnerHTML={{ __html: part }} 
              />
            </div>
          );
        }

        const mdImageMatch = part.match(/^!\[(.*?)\]\(([^)]+)\)$/);
        if (mdImageMatch) {
          const altText = mdImageMatch[1];
          const imgUrl = mdImageMatch[2];
          return (
            <div key={idx} className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
              <div className="w-full bg-slate-100 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Rendered Visualization
              </div>
              <img src={imgUrl} alt={altText} className="w-full h-auto object-contain bg-white max-h-[400px]" />
            </div>
          );
        }

        if (!part.trim()) return null;
        // Basic bold markdown support for the text parts
        const boldParts = part.split(/(\*\*.*?\*\*)/g);
        return (
          <span key={idx}>
            {boldParts.map((bp, bidx) => {
              if (bp.startsWith('**') && bp.endsWith('**')) {
                return <strong key={bidx} className="font-semibold text-slate-900 dark:text-slate-100">{bp.slice(2, -2)}</strong>;
              }
              return <span key={bidx}>{bp}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
};

export const Chatbot: React.FC<ChatbotProps> = ({ onNavigate }) => {
  const { currentUser, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    activeTaskId,
    isSending,
    selectedLanguage,
    setSelectedLanguage,
    setActiveTaskId,
    createNewChat,
    selectConversation,
    deleteConversation,
    sendMessage
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [firestoreModalOpen, setFirestoreModalOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isSending]);

  // Clean up any active speech synthesis when switching conversations or unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [activeConversation?.id]);

  // Initialize Web Speech Recognition if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsRecording(false);
        };

        recog.onerror = () => {
          setIsRecording(false);
        };

        recog.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  const langSpeechCodes: Record<string, string> = {
    kn: 'kn-IN',
    hi: 'hi-IN',
    fr: 'fr-FR',
    en: 'en-US'
  };

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.lang = langSpeechCodes[selectedLanguage] || 'en-US';
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        setIsRecording(false);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputMessage || inputMessage.trim() === '') && attachments.length === 0) {
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const currentText = inputMessage;
    const currentAttachments = [...attachments];

    setInputMessage('');
    setAttachments([]);

    await sendMessage(currentText, currentAttachments, selectedLanguage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectFeature = (task: TaskType) => {
    setActiveTaskId(task);
    const featData = FEATURES_DATA.find(f => f.id === task);
    if (featData) {
      setInputMessage(featData.examplePrompt);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((f: File, index: number) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string || '';
        const newAtt: Attachment = {
          id: `att_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
          name: f.name,
          size: f.size,
          type: f.type || 'document',
          mimeType: f.type || 'application/octet-stream',
          base64: result,
          dataUrl: result,
          content: result
        };
        setAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(f);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string || '';
            const newAtt: Attachment = {
              id: `att_paste_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              name: file.name || `pasted_image_${Date.now()}.png`,
              size: file.size,
              type: file.type || 'image/png',
              mimeType: file.type || 'image/png',
              base64: result,
              dataUrl: result,
              content: result
            };
            setAttachments(prev => [...prev, newAtt]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSpeakToggle = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*#_`~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = langSpeechCodes[selectedLanguage] || 'en-US';

    utterance.onstart = () => {
      setSpeakingMsgId(msgId);
    };

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleLogout = () => {
    logout();
    onNavigate('/login');
  };

  const messages = activeConversation?.messages || [];
  const isFreshConversation = messages.length <= 1;

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex overflow-hidden font-sans transition-colors">
      
      {/* HIDDEN FILE INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
        accept=".txt,.pdf,.doc,.docx,.csv,.json,image/*"
      />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 justify-between shrink-0 z-20 shadow-xs dark:shadow-none">
        
        {/* Sidebar Header & Branding */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div 
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                NexaBot<span className="text-cyan-600 dark:text-cyan-500 font-black">.AI</span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono -mt-1">
                Internship Dashboard
              </p>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="mt-4">
            <button
              onClick={() => createNewChat('general')}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Recent Chats Vertical List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 pb-2 pt-1 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Recent Chats</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400">{conversations.length}</span>
          </div>

          {conversations.map((conv) => {
            const isActive = conv.id === activeConversation?.id;
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{conv.title}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  title="Delete chat"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-rose-500 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer & User Info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout ({currentUser?.name.split(' ')[0] || 'User'})</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs" 
          />

          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full flex flex-col justify-between p-4 z-10 border-r border-slate-200 dark:border-slate-800 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bot className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-base">NexaBot AI</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => { createNewChat('general'); setMobileDrawerOpen(false); }}
                className="w-full mt-4 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>

              <div className="mt-6 space-y-1 overflow-y-auto max-h-[50vh]">
                <div className="px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Recent Conversations
                </div>
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { selectConversation(c.id); setMobileDrawerOpen(false); }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${
                      c.id === activeConversation?.id ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={() => { setSettingsOpen(true); setMobileDrawerOpen(false); }}
                className="w-full flex items-center gap-2 py-2 px-3 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 py-2 px-3 text-xs text-rose-600 dark:text-rose-400"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 dark:bg-slate-950 relative">
        
        {/* Main Chat Header */}
        <header className="h-14 px-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-xs dark:shadow-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                NexaBot AI Assistant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher Dropdown */}
            <div className="relative flex items-center">
              <div className="absolute left-2.5 pointer-events-none text-indigo-500 dark:text-indigo-400">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <select
                id="language-switcher-select"
                value={selectedLanguage}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setSelectedLanguage(newLang);
                }}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold focus:outline-none cursor-pointer appearance-none shadow-xs"
              >
                <option value="en">English (EN)</option>
                <option value="kn">ಕನ್ನಡ (KN)</option>
                <option value="hi">हिन्दी (HI)</option>
                <option value="fr">Français (FR)</option>
              </select>
            </div>

            {/* Firestore Knowledge Base Manager Button */}
            <button
              id="open-firestore-kb-btn"
              onClick={() => setFirestoreModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold transition-colors border border-cyan-500/20 cursor-pointer"
              title="Persistent Firestore Knowledge Base"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Knowledge Base</span>
            </button>

            {/* Export Session Report Button */}
            {activeConversation && activeConversation.messages.length > 0 && (
              <button
                onClick={() => setExportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Export Conversation Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            <ThemeToggle showLabel={true} />

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer hidden sm:block"
              title="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Conversation Stream Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto">
          
          {/* WELCOME / AVAILABLE FEATURES VIEW (when conversation is fresh) */}
          {isFreshConversation && (
            <div className="py-6 space-y-8 animate-in fade-in duration-300">
              
              {/* Welcome Banner */}
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/20 mb-2">
                  <Bot className="w-8 h-8" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  How can I help you today?
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  NexaBot can answer general questions, analyze text, summarize documents, evaluate sentiment, and provide specialized domain assistance.
                </p>
              </div>

              {/* AVAILABLE FEATURES GRID (Required exact section label) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AVAILABLE FEATURES
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Click any feature to load a specialized prompt</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FEATURES_DATA.map((feat) => (
                    <div
                      key={feat.id}
                      onClick={() => handleSelectFeature(feat.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                        activeTaskId === feat.id
                          ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {iconMap[feat.iconName]}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            {feat.number}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {feat.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {feat.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Use feature</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* CHAT MESSAGES DISPLAY */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isCopied = copiedMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-cyan-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-1.5 max-w-[85%] sm:max-w-[78%]`}>
                  {/* Sender Name & Task Tag */}
                  <div className={`flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isUser ? currentUser?.name || 'You' : 'NexaBot AI'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">{msg.timestamp}</span>

                    {msg.taskType && msg.taskType !== 'general' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono font-semibold">
                        {msg.taskType}
                      </span>
                    )}
                  </div>

                  {/* Attachment chips if user uploaded files */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {msg.attachments.map(att => {
                        const isImg = (att.type && att.type.startsWith('image/')) || 
                                      (att.mimeType && att.mimeType.startsWith('image/')) || 
                                      (att.dataUrl && att.dataUrl.startsWith('data:image/')) || 
                                      (att.base64 && att.base64.startsWith('data:image/')) || 
                                      (att.content && att.content.startsWith('data:image/')) ||
                                      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(att.name);
                        const imgSrc = att.dataUrl || att.base64 || att.content;
                        return (
                          <div 
                            key={att.id} 
                            onClick={() => {
                              if (isImg && imgSrc) {
                                setPreviewImageSrc(imgSrc);
                                setPreviewImageTitle(att.name);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-cyan-700 dark:text-cyan-300 ${isImg ? 'cursor-pointer hover:border-cyan-500 hover:shadow-sm transition-all group' : ''}`}
                            title={isImg ? "Click to view full image" : att.name}
                          >
                            {isImg ? (
                              <img src={imgSrc} alt={att.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform" />
                            ) : (
                              <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            )}
                            <span className="font-mono text-[11px] max-w-[140px] truncate">{att.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-none shadow-md shadow-cyan-500/10'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <RenderMessageContent text={msg.text} />
                  </div>

                  {/* Sentiment Visualizer (Rendered strictly for Sentiment Analysis feature) */}
                  {!isUser && (msg.taskType === 'sentiment-analysis' || msg.text.toLowerCase().includes('### 📊 nexabot sentiment analysis') || msg.text.toLowerCase().includes('### 📊 nexabot real-time sentiment')) && (
                    <div className="mt-3">
                      <SentimentVisualizer 
                        text={msg.text} 
                        sentimentData={msg.sentimentData}
                        adaptationStrategy={msg.adaptationStrategy}
                        conversationContext={msg.conversationContext}
                      />
                    </div>
                  )}

                  {/* Message Action Bar (Copy & TTS for AI responses) */}
                  {!isUser && (
                    <div className="flex items-center gap-2 pt-1 text-slate-500 dark:text-slate-400">
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="p-1 rounded hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="Copy text"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied && <span className="text-[10px] text-emerald-500 font-semibold">Copied</span>}
                      </button>

                      <button
                        onClick={() => handleSpeakToggle(msg.text, msg.id)}
                        className={`p-1 px-1.5 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                          speakingMsgId === msg.id
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30'
                            : 'hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                        title={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud'}
                        aria-label={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud'}
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[10px] font-semibold">Stop</span>
                          </>
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 shrink-0 mt-1 font-bold text-xs">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Loading Indicator */}
          {isSending && (
            <div className="flex gap-3.5 items-center text-slate-500 dark:text-slate-400 text-xs animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">NexaBot is generating response</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Chips Banner above Input */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 max-w-4xl w-full mx-auto flex flex-wrap gap-2">
            {attachments.map((att) => {
              const isImg = (att.type && att.type.startsWith('image/')) || 
                            (att.mimeType && att.mimeType.startsWith('image/')) || 
                            (att.dataUrl && att.dataUrl.startsWith('data:image/')) || 
                            (att.base64 && att.base64.startsWith('data:image/')) || 
                            (att.content && att.content.startsWith('data:image/')) ||
                            /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(att.name);
              const imgSrc = att.dataUrl || att.base64 || att.content;
              return (
                <div 
                  key={att.id} 
                  onClick={() => {
                    if (isImg && imgSrc) {
                      setPreviewImageSrc(imgSrc);
                      setPreviewImageTitle(att.name);
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border ${isImg ? 'border-cyan-500/60 cursor-pointer hover:shadow-md hover:border-cyan-500 transition-all group' : 'border-cyan-500/40'} text-xs text-cyan-600 dark:text-cyan-300 shadow-xs`}
                  title={isImg ? "Click to view full image" : att.name}
                >
                  {isImg && imgSrc ? (
                    <img src={imgSrc} alt={att.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  )}
                  <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachments(prev => prev.filter(a => a.id !== att.id));
                    }}
                    className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* CHAT INPUT FORM */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-2">
            
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
              title="Attach Document / File"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Microphone Speech-to-Text Button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`p-3 rounded-2xl transition-all cursor-pointer shrink-0 ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30 ring-2 ring-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
              title={isRecording ? 'Listening... Click to stop' : 'Voice Input (Speech-to-Text)'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input Text Area */}
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={1}
                placeholder={isRecording ? "Listening to your voice..." : "Message NexaBot AI, paste image (Ctrl+V), or select task..."}
                className={`w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border text-sm text-slate-900 dark:text-slate-100 focus:outline-none resize-none max-h-32 min-h-[44px] transition-colors ${
                  isRecording ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-800 focus:border-cyan-500'
                }`}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSending || (!inputMessage.trim() && attachments.length === 0)}
              className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2 font-mono font-medium">
            NexaBot AI Assistant • Press Enter to send • Shift+Enter for new line • Voice & TTS Enabled
          </div>
        </div>

      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Export Session Report Modal */}
      <ExportReportModal 
        isOpen={exportModalOpen} 
        onClose={() => setExportModalOpen(false)} 
        conversation={activeConversation} 
      />

      {/* Persistent Firestore Knowledge Base Modal */}
      <FirestoreKnowledgeModal
        isOpen={firestoreModalOpen}
        onClose={() => setFirestoreModalOpen(false)}
        onSelectSnippet={(promptText) => {
          setInputMessage(promptText);
          setActiveTaskId('knowledge-base');
        }}
      />

      {/* Image Preview Lightbox Modal */}
      {previewImageSrc && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageSrc(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-medium text-xs text-slate-700 dark:text-slate-300 truncate max-w-[80%] font-mono">
                {previewImageTitle || 'Image Preview'}
              </span>
              <button
                onClick={() => setPreviewImageSrc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto bg-slate-950/5 dark:bg-slate-950/40">
              <img 
                src={previewImageSrc} 
                alt={previewImageTitle || 'Preview'} 
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewImageSrc(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
