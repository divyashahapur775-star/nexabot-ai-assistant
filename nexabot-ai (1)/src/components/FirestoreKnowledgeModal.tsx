import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Sparkles,
  Clock,
  Radio,
  Globe,
  FolderSync,
  Play,
  Layers,
  Edit3
} from 'lucide-react';

interface KnowledgeItem {
  id: string;
  content: string;
  sourceId: string;
  contentHash: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ExternalSource {
  id: string;
  name: string;
  type: 'url_api' | 'url_text' | 'local_dir' | 'sample_feed';
  endpointUrlOrPath: string;
  enabled: boolean;
  pollIntervalMs: number;
  lastPolledAt: string | null;
  lastSyncStatus: 'idle' | 'success' | 'failed' | 'in_progress';
  lastRecordsAdded: number;
  lastRecordsDeduplicated: number;
  totalDocsIngested: number;
  lastError: string | null;
}

interface IngestionLog {
  id: string;
  timestamp: string;
  sourceId: string;
  sourceName: string;
  durationMs: number;
  recordsFetched: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsDeduplicated: number;
  status: 'success' | 'partial' | 'failed';
  details: string;
}

interface FirestoreKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet?: (text: string) => void;
}

export const FirestoreKnowledgeModal: React.FC<FirestoreKnowledgeModalProps> = ({
  isOpen,
  onClose,
  onSelectSnippet
}) => {
  const [activeTab, setActiveTab] = useState<'stored' | 'scheduler'>('stored');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newText, setNewText] = useState('');
  const [newSourceId, setNewSourceId] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Scheduler state
  const [sources, setSources] = useState<ExternalSource[]>([]);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [schedulerActive, setSchedulerActive] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);

  // New source form
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<'url_text' | 'url_api' | 'sample_feed'>('url_text');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceInterval, setNewSourceInterval] = useState('60000');
  const [syncingArxiv, setSyncingArxiv] = useState(false);
  const [ingestingLiveArxiv, setIngestingLiveArxiv] = useState(false);

  const safeJson = async (res: Response) => {
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleIngestLiveArxiv = async () => {
    setIngestingLiveArxiv(true);
    setNotification(null);
    try {
      const res = await fetch('/api/arxiv/ingest-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 60 })
      });
      const data = await safeJson(res);
      if (data && data.success) {
        setNotification({
          type: 'success',
          message: `Successfully ingested and wrote ${data.totalIngested} real papers from arXiv's public API to Firestore "knowledge_base" collection!`
        });
        await fetchItems();
      } else {
        setNotification({ type: 'error', message: data?.error || 'Failed to ingest from arXiv API.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to trigger live arXiv API ingestion.' });
    } finally {
      setIngestingLiveArxiv(false);
    }
  };

  const handleSyncArxiv = async () => {
    setSyncingArxiv(true);
    setNotification(null);
    try {
      const res = await fetch('/api/arxiv/sync-all', { method: 'POST' });
      const data = await safeJson(res);
      if (data && data.success) {
        setNotification({ type: 'success', message: data.message });
        await fetchItems();
      } else {
        setNotification({ type: 'error', message: data?.error || 'Failed to sync arXiv dataset.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to trigger bulk arXiv sync.' });
    } finally {
      setSyncingArxiv(false);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/firestore-knowledge/all');
      const data = await safeJson(res);
      if (data && data.documents) {
        setItems(data.documents);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to fetch knowledge base from Firestore.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      const data = await safeJson(res);
      if (data) {
        if (data.sources) setSources(data.sources);
        if (data.recentLogs) setLogs(data.recentLogs);
        setSchedulerActive(data.isSchedulerActive ?? true);
      }
    } catch (err) {
      console.warn('Failed to fetch scheduler status:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      fetchSchedulerStatus();
      setNotification(null);
    }
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !newSourceId.trim()) return;

    setAdding(true);
    setNotification(null);

    try {
      const res = await fetch('/api/firestore-knowledge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newText.trim(),
          sourceId: newSourceId.trim(),
          metadata: { addedVia: 'admin_modal', author: 'user' }
        })
      });
      const data = await safeJson(res);

      if (data && (data.status === 'added' || data.status === 'updated')) {
        setNotification({ type: 'success', message: data.message });
        setNewText('');
        setNewSourceId('');
        fetchItems();
      } else if (data && data.status === 'duplicate_skipped') {
        setNotification({ type: 'info', message: data.message });
      } else {
        setNotification({ type: 'error', message: data?.error || data?.message || 'Failed to save to Firestore.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Network error communicating with Firestore API.' });
    } finally {
      setAdding(false);
    }
  };

  const handleEditItem = (item: KnowledgeItem) => {
    setNewSourceId(item.sourceId);
    setNewText(item.content);
    const inputEl = document.getElementById('firestore-content-input');
    if (inputEl) {
      inputEl.focus();
    }
    setNotification({
      type: 'info',
      message: `Loaded '${item.sourceId}' into editor. Modify the text above and click Save to update.`
    });
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/firestore-knowledge/${docId}`, { method: 'DELETE' });
      const data = await safeJson(res);
      if (data && data.success) {
        setItems(prev => prev.filter(i => i.id !== docId));
        setNotification({ type: 'success', message: 'Document deleted from Firestore collection.' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to delete document from Firestore.' });
    }
  };

  const handleTriggerSyncAll = async () => {
    setSyncingAll(true);
    setNotification(null);
    try {
      const res = await fetch('/api/scheduler/sync', { method: 'POST' });
      const data = await safeJson(res);
      if (data && data.success) {
        setNotification({ type: 'success', message: 'Automated external sources synchronized into Firestore!' });
        fetchItems();
        fetchSchedulerStatus();
      } else {
        setNotification({ type: 'error', message: data?.error || 'Failed to trigger sync.' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Network error triggering external sync.' });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    try {
      const res = await fetch('/api/scheduler/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim(),
          type: newSourceType,
          endpointUrlOrPath: newSourceUrl.trim(),
          pollIntervalMs: Number(newSourceInterval)
        })
      });
      const data = await safeJson(res);
      if (data && data.success) {
        setNotification({ type: 'success', message: `Registered external source '${newSourceName}'.` });
        setNewSourceName('');
        setNewSourceUrl('');
        fetchSchedulerStatus();
      } else {
        setNotification({ type: 'error', message: data?.error || 'Failed to add source.' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to register source.' });
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.content.toLowerCase().includes(q) ||
      item.sourceId.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="firestore-knowledge-modal"
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Dynamic Knowledge Base Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Firestore Connected
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Persistent storage, automated scheduled polling, and strict factual grounding.
              </p>
            </div>
          </div>
          <button
            id="close-firestore-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('stored')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'stored'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stored Knowledge ({items.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('scheduler');
              fetchSchedulerStatus();
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'scheduler'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Automated Scheduler & Sources</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`px-4 py-2.5 mx-5 mt-4 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : notification.type === 'info'
              ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'stored' ? (
            <>
              {/* Add New Knowledge Form */}
              <form onSubmit={handleAdd} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Add / Update Knowledge Live</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Or type <code className="text-cyan-600 dark:text-cyan-400">store this fact: [text]</code> in chat
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    id="firestore-source-id-input"
                    type="text"
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    placeholder="Source ID (e.g. product_specs)"
                    className="col-span-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <input
                    id="firestore-content-input"
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Knowledge content / facts to store in Firestore..."
                    className="col-span-1 sm:col-span-2 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    SHA-256 hash deduplication and automatic versioning are applied.
                  </p>
                  <button
                    id="save-firestore-doc-btn"
                    type="submit"
                    disabled={adding || !newText.trim() || !newSourceId.trim()}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {adding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Save to Firestore</span>
                  </button>
                </div>
              </form>

              {/* Stored Items List Header & Search */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Stored Firestore Entries ({items.length})
                    </span>
                    <button
                      onClick={fetchItems}
                      disabled={loading}
                      title="Refresh items from Firestore"
                      className="p-1 text-slate-400 hover:text-cyan-500 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      id="sync-all-arxiv-btn"
                      onClick={handleSyncArxiv}
                      disabled={syncingArxiv}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                      title="Re-index cs.CL papers into Firestore and Vector Engine"
                    >
                      {syncingArxiv ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>Sync All (310)</span>
                    </button>
                    <button
                      id="ingest-live-arxiv-btn"
                      onClick={handleIngestLiveArxiv}
                      disabled={ingestingLiveArxiv}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                      title="Fetch live cs.CL papers directly from arXiv's public API XML feed and write to Firestore"
                    >
                      {ingestingLiveArxiv ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>Fetch Live arXiv API (XML)</span>
                    </button>
                  </div>

                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter stored facts..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* List of Documents */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {loading && items.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Loading entries from Firestore collection...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      No knowledge entries found. Add one above or trigger an external sync in the Scheduler tab!
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-colors flex items-start justify-between gap-3 group"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                              {item.sourceId}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed break-words">
                            {item.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditItem(item)}
                            title="Edit and update this entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {onSelectSnippet && (
                            <button
                              onClick={() => {
                                onSelectSnippet(`What do you know about ${item.sourceId}?`);
                                onClose();
                              }}
                              className="px-2 py-1 text-[10px] rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-semibold cursor-pointer"
                              title="Ask chatbot about this entry"
                            >
                              Ask Chatbot
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            title="Delete from Firestore"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Automated Scheduler Tab */
            <div className="space-y-5">
              {/* Scheduler Status Header */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Background Polling Scheduler: ACTIVE
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Runs every 30-60s on the Node.js server to poll external feeds, parse documents, and sync directly to Firestore.
                  </p>
                </div>

                <button
                  id="trigger-sync-now-btn"
                  onClick={handleTriggerSyncAll}
                  disabled={syncingAll}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                  <span>{syncingAll ? 'Syncing...' : 'Sync Sources Now'}</span>
                </button>
              </div>

              {/* Registered External Sources */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Configured Data Sources ({sources.length})</span>
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sources.map(s => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white truncate">{s.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                            {s.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {s.endpointUrlOrPath}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>Poll: {s.pollIntervalMs / 1000}s</span>
                          <span>Last sync: {s.lastPolledAt ? new Date(s.lastPolledAt).toLocaleTimeString() : 'Pending'}</span>
                          <span>Ingested: {s.totalDocsIngested} docs</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.lastSyncStatus === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          s.lastSyncStatus === 'in_progress' ? 'bg-amber-500/10 text-amber-600 animate-pulse' :
                          s.lastSyncStatus === 'failed' ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {s.lastSyncStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Source Form */}
              <form onSubmit={handleAddSource} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Register New External Polling Source</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="Source Name (e.g. GitHub Tech Docs)"
                    className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <input
                    type="text"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="Endpoint URL or Path"
                    className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <select
                    value={newSourceInterval}
                    onChange={(e) => setNewSourceInterval(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="30000">Poll every 30 seconds</option>
                    <option value="60000">Poll every 1 minute</option>
                    <option value="300000">Poll every 5 minutes</option>
                    <option value="900000">Poll every 15 minutes</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Source</span>
                  </button>
                </div>
              </form>

              {/* Ingestion Cycle Logs */}
              {logs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Recent Scheduler Ingestion Logs
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px] pr-1">
                    {logs.map(log => (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-600 dark:text-slate-300"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={log.status === 'success' ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                            [{log.status.toUpperCase()}]
                          </span>
                          <span className="truncate">{log.sourceName}: {log.details}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()} ({log.durationMs}ms)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
          <span>Target Firestore Collection: <code className="text-cyan-600 dark:text-cyan-400 font-mono">knowledge_base</code></span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
