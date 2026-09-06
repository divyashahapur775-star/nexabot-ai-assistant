/**
 * Dynamic Knowledge Base Vector Engine & Incremental Ingestion Service
 * 
 * Implements:
 * 1. Multi-source Ingestion Connectors (RSS/Web Feed, JSON API, Plaintext/Markdown Docs)
 * 2. Content Normalization, HTML stripping, & Semantic Passage Chunking (with token/char bounds)
 * 3. Consistent Dense Vector Embeddings (Cosine Similarity & Term-Frequency Projection)
 * 4. Incremental Vector Database Engine:
 *    - In-place insertion without re-indexing from scratch
 *    - SHA-256 Content Hashing & Semantic Similarity Deduplication
 *    - Source-level Versioning & Stale Record Replacement
 *    - Expiry & Deletion Handling
 * 5. Scheduling & Periodic Automation (Background scheduler with interval configuration)
 * 6. Non-blocking In-flight Query Execution (Lock-free memory reads with atomic snapshot swaps)
 * 7. Monitoring, Audit Logging, & Knowledge Base Growth Telemetry
 * 8. Automatic Post-Ingestion Validation & Regression Testing
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type SourceType = 'api' | 'rss_feed' | 'web_document' | 'file_sync' | 'clinical_guideline';

export interface DataSourceConfig {
  id: string;
  name: string;
  type: SourceType;
  endpointUrlOrPath: string;
  enabled: boolean;
  pollIntervalMs: number; // e.g. 60000 (1 min) or 3600000 (1 hr)
  lastPolledAt: string | null;
  lastIngestedCount: number;
  totalDocumentsProvided: number;
  status: 'idle' | 'fetching' | 'error' | 'synced';
  lastError?: string | null;
}

export interface RawDocumentPayload {
  sourceId: string;
  docId: string;
  title: string;
  rawContent: string;
  contentType: 'html' | 'json' | 'text' | 'markdown';
  publishedAt?: string;
  metadata?: Record<string, any>;
}

export interface ChunkedDocument {
  chunkId: string;
  sourceId: string;
  docId: string;
  title: string;
  passageText: string;
  contentHash: string; // SHA-256 hash for deduplication
  version: number;
  chunkIndex: number;
  totalChunks: number;
  embeddingVector: number[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface IngestionCycleLog {
  cycleId: string;
  timestamp: string;
  sourceId: string;
  sourceName: string;
  durationMs: number;
  documentsFetched: number;
  chunksCreated: number;
  chunksAdded: number;
  chunksUpdated: number;
  chunksDeduplicated: number;
  chunksExpiredOrDeleted: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string | null;
  validationPassed: boolean;
  validationTestScore?: number;
}

export interface KnowledgeBaseTelemetry {
  totalActiveVectors: number;
  totalUniqueDocuments: number;
  totalSourcesConfigured: number;
  totalIngestionCycles: number;
  lastUpdatedTimestamp: string;
  growthHistory: Array<{ timestamp: string; totalVectors: number; source: string }>;
  recentLogs: IngestionCycleLog[];
}

export interface VectorSearchResult {
  chunk: ChunkedDocument;
  similarityScore: number;
  matchType: 'exact_hash' | 'high_semantic' | 'contextual';
}

// -------------------------------------------------------------
// In-Memory Vector Store & Source Configurations
// -------------------------------------------------------------

// Active In-memory Vector Index (chunkId -> ChunkedDocument)
let VECTOR_STORE: Map<string, ChunkedDocument> = new Map();
// Hash Index for rapid O(1) content deduplication
let CONTENT_HASH_INDEX: Map<string, string> = new Map(); // hash -> chunkId
// Document-to-Chunks Index for versioning/replacements
let DOC_CHUNKS_INDEX: Map<string, Set<string>> = new Map(); // docId -> Set<chunkId>

// Configured Ingestion Data Sources
let DATA_SOURCES: DataSourceConfig[] = [
  {
    id: 'src_who_clinical_alerts',
    name: 'WHO & CDC Emerging Health Bulletin',
    type: 'rss_feed',
    endpointUrlOrPath: 'https://api.healthalerts.int/v1/bulletin',
    enabled: true,
    pollIntervalMs: 3600000, // 1 hour
    lastPolledAt: null,
    lastIngestedCount: 0,
    totalDocumentsProvided: 0,
    status: 'idle',
    lastError: null
  },
  {
    id: 'src_fda_drug_updates',
    name: 'FDA Pharmacotherapy & Medication Approvals',
    type: 'api',
    endpointUrlOrPath: 'https://api.fda.gov/drug/label/updates',
    enabled: true,
    pollIntervalMs: 86400000, // 24 hours
    lastPolledAt: null,
    lastIngestedCount: 0,
    totalDocumentsProvided: 0,
    status: 'idle',
    lastError: null
  },
  {
    id: 'src_nih_guidelines',
    name: 'NIH Clinical Research & Protocol Sync',
    type: 'clinical_guideline',
    endpointUrlOrPath: 'https://clinicalcenter.nih.gov/protocols/stream',
    enabled: true,
    pollIntervalMs: 43200000, // 12 hours
    lastPolledAt: null,
    lastIngestedCount: 0,
    totalDocumentsProvided: 0,
    status: 'idle',
    lastError: null
  }
];

// Telemetry & Ingestion Cycle History
const INGESTION_LOGS: IngestionCycleLog[] = [];
const GROWTH_TIMELINE: Array<{ timestamp: string; totalVectors: number; source: string }> = [];

let schedulerIntervalHandle: NodeJS.Timeout | null = null;
let isSchedulerRunning = false;

// -------------------------------------------------------------
// 1. Text Normalization, HTML Cleaning, and Chunking
// -------------------------------------------------------------

export function cleanAndNormalizeContent(rawText: string, contentType: 'html' | 'json' | 'text' | 'markdown'): string {
  if (!rawText) return '';

  let cleaned = rawText;

  if (contentType === 'html') {
    // Strip HTML scripts, styles, and tags
    cleaned = cleaned
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  } else if (contentType === 'json') {
    try {
      const parsed = JSON.parse(rawText);
      cleaned = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
    } catch {
      // Keep as-is if raw string
    }
  }

  // Normalize excessive whitespace and non-printable control characters
  cleaned = cleaned
    .replace(/[\r\n]+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return cleaned;
}

export function chunkDocument(
  doc: RawDocumentPayload,
  maxChunkChars: number = 600,
  overlapChars: number = 100
): Array<{ passageText: string; chunkIndex: number; totalChunks: number; contentHash: string }> {
  const normalized = cleanAndNormalizeContent(doc.rawContent, doc.contentType);
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = start + maxChunkChars;
    if (end >= normalized.length) {
      chunks.push(normalized.substring(start));
      break;
    }

    // Try finding clean sentence/paragraph boundary
    const boundary = normalized.lastIndexOf('. ', end);
    if (boundary > start + maxChunkChars * 0.5) {
      end = boundary + 1;
    }

    chunks.push(normalized.substring(start, end).trim());
    start = end - overlapChars;
    if (start < 0) start = 0;
  }

  const total = chunks.length;
  return chunks.map((passage, idx) => {
    const hash = crypto.createHash('sha256').update(`${doc.docId}:${idx}:${passage}`).digest('hex');
    return {
      passageText: passage,
      chunkIndex: idx,
      totalChunks: total,
      contentHash: hash
    };
  });
}

// -------------------------------------------------------------
// 2. Vector Embedding Projection (Dense Cosine Similarity)
// -------------------------------------------------------------

// Fixed dimension vocabulary projection for consistent vector space
const VOCAB_PROJECTION_DIM = 64;

export function generateEmbedding(text: string): number[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter(t => t.length > 2);
  const vector = new Array(VOCAB_PROJECTION_DIM).fill(0);

  if (tokens.length === 0) return vector;

  tokens.forEach(token => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % VOCAB_PROJECTION_DIM;
    vector[idx] += 1.0;
  });

  // L2-Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < VOCAB_PROJECTION_DIM; i++) {
      vector[i] = Number((vector[i] / magnitude).toFixed(5));
    }
  }

  return vector;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

// -------------------------------------------------------------
// 3. Incremental Vector Database Update & Deduplication Engine
// -------------------------------------------------------------

export interface IngestionResult {
  sourceId: string;
  documentsProcessed: number;
  added: number;
  updated: number;
  deduplicated: number;
  deleted: number;
  durationMs: number;
  cycleLog: IngestionCycleLog;
}

export function ingestDocumentStream(
  documents: RawDocumentPayload[],
  sourceId: string
): IngestionResult {
  const startTime = Date.now();
  let added = 0;
  let updated = 0;
  let deduplicated = 0;
  let deleted = 0;

  const sourceConfig = DATA_SOURCES.find(s => s.id === sourceId);
  const sourceName = sourceConfig ? sourceConfig.name : sourceId;

  // New atomic working maps for isolation during batch ingestion
  const newVectorStore = new Map(VECTOR_STORE);
  const newContentHashIndex = new Map(CONTENT_HASH_INDEX);
  const newDocChunksIndex = new Map(DOC_CHUNKS_INDEX);

  documents.forEach(doc => {
    const chunks = chunkDocument(doc);
    const existingChunkIds = newDocChunksIndex.get(doc.docId) || new Set<string>();
    const newChunkIdsForDoc = new Set<string>();

    chunks.forEach(item => {
      const chunkId = `${doc.sourceId}_${doc.docId}_c${item.chunkIndex}`;
      newChunkIdsForDoc.add(chunkId);

      // Check Exact Content Deduplication via SHA-256 Hash
      if (newContentHashIndex.has(item.contentHash)) {
        const existingId = newContentHashIndex.get(item.contentHash)!;
        if (newVectorStore.has(existingId)) {
          deduplicated++;
          return; // Skip inserting duplicate vector
        }
      }

      // Generate embedding vector
      const vector = generateEmbedding(`${doc.title} ${item.passageText}`);

      // Check Semantic Vector Similarity Deduplication (> 0.985 threshold)
      let isSemanticDuplicate = false;
      for (const [_, existingChunk] of newVectorStore) {
        if (existingChunk.sourceId === doc.sourceId && existingChunk.docId === doc.docId) {
          const sim = cosineSimilarity(vector, existingChunk.embeddingVector);
          if (sim > 0.985 && item.passageText === existingChunk.passageText) {
            isSemanticDuplicate = true;
            deduplicated++;
            break;
          }
        }
      }

      if (isSemanticDuplicate) return;

      const isUpdate = newVectorStore.has(chunkId);
      const prevVersion = isUpdate ? newVectorStore.get(chunkId)!.version : 0;

      const chunkRecord: ChunkedDocument = {
        chunkId,
        sourceId: doc.sourceId,
        docId: doc.docId,
        title: doc.title,
        passageText: item.passageText,
        contentHash: item.contentHash,
        version: prevVersion + 1,
        chunkIndex: item.chunkIndex,
        totalChunks: item.totalChunks,
        embeddingVector: vector,
        createdAt: isUpdate ? newVectorStore.get(chunkId)!.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: doc.metadata || {}
      };

      // Store in vector index & hash index
      newVectorStore.set(chunkId, chunkRecord);
      newContentHashIndex.set(item.contentHash, chunkId);

      if (isUpdate) {
        updated++;
      } else {
        added++;
      }
    });

    // Cleanup stale chunks if an updated doc has fewer chunks than prior version
    existingChunkIds.forEach(oldId => {
      if (!newChunkIdsForDoc.has(oldId)) {
        const oldChunk = newVectorStore.get(oldId);
        if (oldChunk) {
          newContentHashIndex.delete(oldChunk.contentHash);
          newVectorStore.delete(oldId);
          deleted++;
        }
      }
    });

    newDocChunksIndex.set(doc.docId, newChunkIdsForDoc);
  });

  // Atomic state swap — zero downtime for query readers
  VECTOR_STORE = newVectorStore;
  CONTENT_HASH_INDEX = newContentHashIndex;
  DOC_CHUNKS_INDEX = newDocChunksIndex;

  const durationMs = Date.now() - startTime;

  // Update source status
  if (sourceConfig) {
    sourceConfig.lastPolledAt = new Date().toISOString();
    sourceConfig.lastIngestedCount = added + updated;
    sourceConfig.totalDocumentsProvided += documents.length;
    sourceConfig.status = 'synced';
  }

  // Automatic Post-Ingestion Validation
  const validationResult = validateKnowledgeBaseIntegration(documents);

  const cycleLog: IngestionCycleLog = {
    cycleId: `cycle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    sourceId,
    sourceName,
    durationMs,
    documentsFetched: documents.length,
    chunksCreated: added + updated + deduplicated,
    chunksAdded: added,
    chunksUpdated: updated,
    chunksDeduplicated: deduplicated,
    chunksExpiredOrDeleted: deleted,
    status: 'success',
    validationPassed: validationResult.passed,
    validationTestScore: validationResult.score
  };

  INGESTION_LOGS.unshift(cycleLog);
  if (INGESTION_LOGS.length > 50) INGESTION_LOGS.pop();

  GROWTH_TIMELINE.push({
    timestamp: new Date().toISOString(),
    totalVectors: VECTOR_STORE.size,
    source: sourceName
  });

  return {
    sourceId,
    documentsProcessed: documents.length,
    added,
    updated,
    deduplicated,
    deleted,
    durationMs,
    cycleLog
  };
}

// -------------------------------------------------------------
// 4. Vector Query Retrieval Pipeline
// -------------------------------------------------------------

export function searchVectorDatabase(query: string, topK: number = 4, minSimilarity: number = 0.15): VectorSearchResult[] {
  if (!query || VECTOR_STORE.size === 0) return [];

  const queryVector = generateEmbedding(query);
  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const queryTokens = cleanQuery.split(/\s+/).filter(t => t.length > 2);
  const results: VectorSearchResult[] = [];

  for (const [_, chunk] of VECTOR_STORE) {
    const cosSim = cosineSimilarity(queryVector, chunk.embeddingVector);

    // Hybrid keyword & vector score
    let tokenOverlap = 0;
    const passageClean = `${chunk.title} ${chunk.passageText} ${chunk.sourceId}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    queryTokens.forEach(token => {
      if (passageClean.includes(token)) {
        tokenOverlap += 0.20;
      }
    });

    // Substantial boost for custom user-added documents so user facts take top priority
    const isUserDoc = chunk.metadata?.isUserDocument || 
      chunk.metadata?.author === 'user' || 
      chunk.metadata?.addedVia === 'admin_modal' || 
      (!chunk.sourceId.startsWith('arxiv_') && !chunk.sourceId.startsWith('src_'));
    const userDocBoost = isUserDoc ? 0.35 : 0;

    const combinedScore = (cosSim * 0.5) + (Math.min(0.5, tokenOverlap)) + userDocBoost;

    if (combinedScore >= minSimilarity) {
      let matchType: 'exact_hash' | 'high_semantic' | 'contextual' = 'contextual';
      if (combinedScore > 0.70) matchType = 'high_semantic';

      results.push({
        chunk,
        similarityScore: Number(combinedScore.toFixed(3)),
        matchType
      });
    }
  }

  results.sort((a, b) => b.similarityScore - a.similarityScore);
  return results.slice(0, topK);
}

// -------------------------------------------------------------
// 5. Post-Ingestion Validation & Regression Checks
// -------------------------------------------------------------

export function validateKnowledgeBaseIntegration(newDocs: RawDocumentPayload[]): { passed: boolean; score: number; details: string[] } {
  if (newDocs.length === 0 || VECTOR_STORE.size === 0) {
    return { passed: true, score: 1.0, details: ['No new documents to test. Index healthy.'] };
  }

  let passedTests = 0;
  const details: string[] = [];

  newDocs.forEach(doc => {
    // Generate test query using title or first key terms
    const testQuery = doc.title;
    const hits = searchVectorDatabase(testQuery, 3);
    const hasHit = hits.some(h => h.chunk.docId === doc.docId);

    if (hasHit) {
      passedTests++;
      details.push(`✓ Verified retrieval for newly ingested doc "${doc.title.slice(0, 40)}"`);
    } else {
      details.push(`✗ Retrieval check missed for "${doc.title.slice(0, 40)}"`);
    }
  });

  const score = Number((passedTests / newDocs.length).toFixed(2));
  return {
    passed: score >= 0.75,
    score,
    details
  };
}

// -------------------------------------------------------------
// 6. Source Connectors & Synthetic Stream Mock Feeds
// -------------------------------------------------------------

export function fetchSourceUpdates(sourceId: string): RawDocumentPayload[] {
  const timestamp = new Date().toLocaleTimeString();

  switch (sourceId) {
    case 'src_who_clinical_alerts':
      return [
        {
          sourceId,
          docId: `alert_rsv_monoclonal_${Date.now().toString().slice(-4)}`,
          title: 'WHO Technical Guidance: Monoclonal Antibody Prophylaxis for RSV',
          contentType: 'text',
          rawContent: `The World Health Organization (WHO) has updated global recommendations for Respiratory Syncytial Virus (RSV) immunization. Long-acting monoclonal antibodies (Nirsevimab) demonstrate a 79% reduction in infant lower respiratory tract infection hospitalizations. Administration is advised prior to the onset of the seasonal epidemic.`,
          metadata: { category: 'Infectious Disease', issued: timestamp }
        },
        {
          sourceId,
          docId: `alert_mpox_surveillance_${Date.now().toString().slice(-4)}`,
          title: 'Global Surveillance Protocol for Clade Ib Mpox Lineage',
          contentType: 'html',
          rawContent: `<div><h3>Epidemiological Update</h3><p>Enhanced genomic sequencing and contact tracing protocols have been deployed for Clade Ib Mpox. Clinical presentation features localized cutaneous lesions accompanied by fever, lymphadenopathy, and myalgia. Supportive care with Tecovirimat is evaluated under expanded access.</p></div>`,
          metadata: { category: 'Global Surveillance', issued: timestamp }
        }
      ];

    case 'src_fda_drug_updates':
      return [
        {
          sourceId,
          docId: `fda_tirzepatide_label_${Date.now().toString().slice(-4)}`,
          title: 'FDA Label Expansion: Dual GIP and GLP-1 Receptor Agonist Indications',
          contentType: 'text',
          rawContent: `FDA has approved updated clinical labeling for dual glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptor agonists (Tirzepatide). Clinical trial data shows significant glycemic reduction (HbA1c drop ~2.4%) along with sustained cardiometabolic endpoint improvements. Common adverse events are dose-dependent gastrointestinal symptoms.`,
          metadata: { regulatoryBody: 'FDA', approvalStatus: 'Approved' }
        }
      ];

    case 'src_nih_guidelines':
      return [
        {
          sourceId,
          docId: `nih_lipid_guideline_${Date.now().toString().slice(-4)}`,
          title: 'NIH Guidelines: Non-Statin Therapies in Atherosclerotic Cardiovascular Disease (ASCVD)',
          contentType: 'markdown',
          rawContent: `### Primary Recommendations for High-Risk Dyslipidemia
1. **PCSK9 Inhibitors (Evolocumab / Alirocumab):** Recommended for patients failing to achieve LDL-C < 55 mg/dL on maximally tolerated statin and ezetimibe therapy.
2. **Bempedoic Acid:** Approved as adjunct therapy for statin-intolerant patients to inhibit hepatic cholesterol synthesis upstream of HMG-CoA reductase.`,
          metadata: { focus: 'Cardiology', grade: 'Class I Recommendation' }
        }
      ];

    default:
      return [];
  }
}

// -------------------------------------------------------------
// 7. Scheduler & Background Automation Engine
// -------------------------------------------------------------

export function triggerSourceIngestion(sourceId: string): IngestionResult {
  const source = DATA_SOURCES.find(s => s.id === sourceId);
  if (!source) {
    throw new Error(`Data source with id '${sourceId}' not found.`);
  }

  source.status = 'fetching';
  const rawDocs = fetchSourceUpdates(sourceId);
  return ingestDocumentStream(rawDocs, sourceId);
}

export function runAllEnabledSourcesIngestion(): IngestionResult[] {
  const results: IngestionResult[] = [];
  DATA_SOURCES.filter(s => s.enabled).forEach(source => {
    try {
      const res = triggerSourceIngestion(source.id);
      results.push(res);
    } catch (err: any) {
      source.status = 'error';
      source.lastError = err.message;
    }
  });
  return results;
}

export function startDynamicKnowledgeScheduler(intervalMs: number = 60000) {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  // Run initial seed sync
  runAllEnabledSourcesIngestion();

  schedulerIntervalHandle = setInterval(() => {
    const now = Date.now();
    DATA_SOURCES.filter(s => s.enabled).forEach(source => {
      const lastPoll = source.lastPolledAt ? new Date(source.lastPolledAt).getTime() : 0;
      if (now - lastPoll >= source.pollIntervalMs) {
        try {
          triggerSourceIngestion(source.id);
        } catch (err) {
          console.error(`Scheduled ingestion error for source ${source.id}:`, err);
        }
      }
    });
  }, intervalMs);
}

export function stopDynamicKnowledgeScheduler() {
  if (schedulerIntervalHandle) {
    clearInterval(schedulerIntervalHandle);
    schedulerIntervalHandle = null;
  }
  isSchedulerRunning = false;
}

// -------------------------------------------------------------
// 8. Knowledge Base Telemetry & Status API
// -------------------------------------------------------------

export function getKnowledgeBaseTelemetry(): KnowledgeBaseTelemetry {
  const uniqueDocIds = new Set<string>();
  VECTOR_STORE.forEach(chunk => uniqueDocIds.add(chunk.docId));

  return {
    totalActiveVectors: VECTOR_STORE.size,
    totalUniqueDocuments: uniqueDocIds.size,
    totalSourcesConfigured: DATA_SOURCES.length,
    totalIngestionCycles: INGESTION_LOGS.length,
    lastUpdatedTimestamp: INGESTION_LOGS.length > 0 ? INGESTION_LOGS[0].timestamp : new Date().toISOString(),
    growthHistory: GROWTH_TIMELINE.slice(-20),
    recentLogs: INGESTION_LOGS.slice(0, 10)
  };
}

export function getDataSourceConfigs(): DataSourceConfig[] {
  return DATA_SOURCES;
}

export function updateDataSourceConfig(sourceId: string, updates: Partial<DataSourceConfig>): DataSourceConfig {
  const idx = DATA_SOURCES.findIndex(s => s.id === sourceId);
  if (idx === -1) throw new Error(`Source ${sourceId} not found`);
  DATA_SOURCES[idx] = { ...DATA_SOURCES[idx], ...updates };
  return DATA_SOURCES[idx];
}

// Synchronize Vector Store with locally cached persistent Firestore documents
export function syncVectorStoreWithCachedKnowledge(): number {
  try {
    const cachePath = path.join(process.cwd(), 'knowledge_cache.json');
    if (!fs.existsSync(cachePath)) return 0;
    
    const content = fs.readFileSync(cachePath, 'utf8');
    const items = JSON.parse(content);
    if (!Array.isArray(items) || items.length === 0) return 0;

    const rawDocs: RawDocumentPayload[] = items.map((item: any) => ({
      sourceId: item.sourceId || 'custom_kb',
      docId: item.id || `doc_${Math.random().toString(36).substring(2, 9)}`,
      title: item.metadata?.title || (item.content.length > 50 ? item.content.slice(0, 50) + '...' : item.content),
      rawContent: item.content,
      contentType: 'text',
      publishedAt: item.timestamp,
      metadata: {
        ...(item.metadata || {}),
        isUserDocument: item.metadata?.author === 'user' || item.metadata?.addedVia === 'admin_modal' || (!item.sourceId?.startsWith('arxiv_') && !item.sourceId?.startsWith('src_'))
      }
    }));

    const result = ingestDocumentStream(rawDocs, 'cached_knowledge_store');
    return result.added + result.updated;
  } catch (err) {
    console.warn('[Vector Engine] Initial cache sync note:', err);
    return 0;
  }
}

// Auto-seed initial knowledge base and synchronize with persistent local cache
syncVectorStoreWithCachedKnowledge();
startDynamicKnowledgeScheduler(300000); // Check every 5 minutes
