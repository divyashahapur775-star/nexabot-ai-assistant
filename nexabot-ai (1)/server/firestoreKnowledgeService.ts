import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  setLogLevel,
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  Firestore
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ingestDocumentStream, searchVectorDatabase, RawDocumentPayload } from "./knowledgeEngine";

export interface KnowledgeDocument {
  id?: string;
  content: string;
  sourceId: string;
  contentHash: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

let dbInstance: Firestore | null = null;
let firestoreQuotaExceededUntil = 0; // Timestamp until which we avoid hammering Firestore if quota error encountered

// Local mirror cache for knowledge_base documents
const LOCAL_KB_CACHE_FILE = path.join(process.cwd(), "knowledge_cache.json");
let localKbStore: Map<string, KnowledgeDocument & { id: string }> = new Map();

// Initialize local cache from disk
try {
  if (fs.existsSync(LOCAL_KB_CACHE_FILE)) {
    const raw = fs.readFileSync(LOCAL_KB_CACHE_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const key = item.sourceId || item.id;
        localKbStore.set(key, item);
      }
    }
  }
} catch (e) {
  console.warn("Could not read knowledge_cache.json:", e);
}

function persistLocalKbCache() {
  try {
    const arr = Array.from(localKbStore.values());
    fs.writeFileSync(LOCAL_KB_CACHE_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write knowledge_cache.json:", e);
  }
}

export function getDb(): Firestore {
  if (!dbInstance) {
    let firebaseConfig: any = {};
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch (err) {
      console.warn("Could not read firebase-applet-config.json:", err);
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
      setLogLevel("silent");
    } catch (e) {
      // ignore
    }
    dbInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
  return dbInstance;
}

export function computeHash(text: string): string {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * Adds or updates knowledge in Firestore collection 'knowledge_base'
 * - Versioning: If sourceId exists, old document is replaced
 * - Deduplication: If same contentHash exists, skips insertion
 * - Resilient Quota Fallback: If free-tier Firestore quota is reached, stores to local persistent cache cleanly.
 */
export async function addKnowledge(
  text: string, 
  sourceId: string, 
  metadata: Record<string, any> = {}
): Promise<{ status: "added" | "updated" | "duplicate_skipped" | "error"; message: string; docId?: string }> {
  const content = text.trim();
  if (!content) {
    return { status: "error", message: "Content cannot be empty." };
  }

  const hash = computeHash(content);
  const docId = metadata?.docId || `kb_${sourceId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const newDoc: KnowledgeDocument & { id: string } = {
    id: docId,
    content,
    sourceId,
    contentHash: hash,
    timestamp: metadata?.timestamp || new Date().toISOString(),
    metadata
  };

  // Check local cache for deduplication and replace existing source record
  const existingDoc = localKbStore.get(docId);
  if (existingDoc && existingDoc.contentHash === hash) {
    return {
      status: "duplicate_skipped",
      message: `Duplicate content skipped. Already stored under document ID: ${existingDoc.id}`,
      docId: existingDoc.id
    };
  }

  // Check if Firestore quota is currently in cooldown
  const now = Date.now();
  if (now < firestoreQuotaExceededUntil) {
    // Delete any old document for this sourceId or docId
    for (const [k, v] of localKbStore.entries()) {
      if (v.sourceId === sourceId || k === docId || v.id === docId) {
        localKbStore.delete(k);
      }
    }
    localKbStore.set(docId, newDoc);
    persistLocalKbCache();

    // Always synchronize with Vector Database immediately
    try {
      ingestDocumentStream(
        [{
          sourceId,
          docId,
          title: (metadata?.title as string) || (content.length > 50 ? content.slice(0, 50) + "..." : content),
          rawContent: content,
          contentType: "text",
          publishedAt: newDoc.timestamp,
          metadata: {
            ...metadata,
            author: metadata?.author || "user",
            isUserDocument: true
          }
        }],
        sourceId
      );
    } catch (vectorErr) {
      console.warn("[Vector Engine] Ingestion sync note:", vectorErr);
    }

    return {
      status: "added",
      message: `Successfully saved and updated knowledge for source '${sourceId}' (Persistent Local Cache & Vector Engine).`,
      docId
    };
  }

  try {
    const db = getDb();
    const kbRef = collection(db, "knowledge_base");

    // 1. Check if the exact same content hash already exists across the knowledge base
    const duplicateQuery = query(kbRef, where("contentHash", "==", hash));
    const duplicateSnap = await getDocs(duplicateQuery);
    if (!duplicateSnap.empty) {
      const existingDoc = duplicateSnap.docs[0];
      return {
        status: "duplicate_skipped",
        message: `Duplicate content skipped. Already stored under document ID: ${existingDoc.id}`,
        docId: existingDoc.id
      };
    }

    // 2. Versioning: Check if documents with the same sourceId already exist
    const sourceQuery = query(kbRef, where("sourceId", "==", sourceId));
    const sourceSnap = await getDocs(sourceQuery);
    
    let isUpdate = false;
    // Delete any old document for this source_id
    for (const d of sourceSnap.docs) {
      isUpdate = true;
      await deleteDoc(doc(db, "knowledge_base", d.id));
    }

    // 3. Insert new/updated document
    await setDoc(doc(db, "knowledge_base", docId), newDoc);

    // Also update local cache
    for (const [k, v] of localKbStore.entries()) {
      if (v.sourceId === sourceId) {
        localKbStore.delete(k);
      }
    }
    localKbStore.set(docId, newDoc);
    persistLocalKbCache();

    // Immediately synchronize with Vector Database for real-time semantic retrieval
    try {
      ingestDocumentStream(
        [{
          sourceId,
          docId,
          title: (metadata?.title as string) || (content.length > 50 ? content.slice(0, 50) + "..." : content),
          rawContent: content,
          contentType: "text",
          publishedAt: newDoc.timestamp,
          metadata
        }],
        sourceId
      );
    } catch (vectorErr) {
      console.warn("[Vector Engine] Ingestion sync note:", vectorErr);
    }

    return {
      status: isUpdate ? "updated" : "added",
      message: isUpdate 
        ? `Updated existing source '${sourceId}'. Old versions replaced with new document.` 
        : `Successfully added new knowledge from source '${sourceId}'.`,
      docId
    };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes("Quota limit exceeded") || errMsg.includes("quota")) {
      firestoreQuotaExceededUntil = Date.now() + 300000; // 5 minute quota cooldown
      console.warn("[Firestore] Daily free read quota reached. Seamlessly utilizing local persistent store.");
      
      for (const [k, v] of localKbStore.entries()) {
        if (v.sourceId === sourceId) {
          localKbStore.delete(k);
        }
      }
      localKbStore.set(docId, newDoc);
      persistLocalKbCache();

      // Immediately synchronize with Vector Database for real-time semantic retrieval
      try {
        ingestDocumentStream(
          [{
            sourceId,
            docId,
            title: (metadata?.title as string) || (content.length > 50 ? content.slice(0, 50) + "..." : content),
            rawContent: content,
            contentType: "text",
            publishedAt: newDoc.timestamp,
            metadata
          }],
          sourceId
        );
      } catch (vectorErr) {
        console.warn("[Vector Engine] Ingestion sync note:", vectorErr);
      }

      return {
        status: "added",
        message: `Saved to persistent knowledge store (Firestore daily free quota limit reached).`,
        docId
      };
    }

    console.error("Error in addKnowledge:", error);
    return { status: "error", message: errMsg || "Failed to write to Firestore." };
  }
}

const COMMON_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "to", "at", "in", "on",
  "for", "of", "with", "by", "from", "about", "into", "through", "during",
  "before", "after", "above", "below", "this", "that", "these", "those",
  "am", "tell", "show", "give", "me", "how", "why", "can", "could", "would",
  "should", "will", "please",
  // Emotional and conversational words
  "feel", "feeling", "feels", "felt", "like", "want",
  "sad", "sadness", "cry", "crying", "cried", "hurt", "hurts", "hurting", "pain",
  "love", "loved", "hi", "hello", "hey", "yes", "no", "okay", "ok"
]);

/**
 * Searches Firestore / persistent knowledge store for relevant content.
 * Prioritizes user-updated custom knowledge records.
 */
export async function queryKnowledge(
  question: string,
  topK: number = 3
): Promise<Array<{ id: string; content: string; sourceId: string; timestamp: string; score: number }>> {
  let docsList: Array<KnowledgeDocument & { id: string }> = [];

  const now = Date.now();
  if (now >= firestoreQuotaExceededUntil) {
    try {
      const db = getDb();
      const kbRef = collection(db, "knowledge_base");
      const snapshot = await getDocs(kbRef);

      snapshot.forEach((docSnap) => {
        const d = { id: docSnap.id, ...(docSnap.data() as KnowledgeDocument) };
        localKbStore.set(d.id, d);
      });
      persistLocalKbCache();
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      if (errMsg.includes("Quota limit exceeded") || errMsg.includes("quota")) {
        firestoreQuotaExceededUntil = Date.now() + 600000; // 10 minute cooldown
        console.warn("[Firestore] Quota reached during queryKnowledge, using local persistent cache.");
      } else {
        console.error("Error in queryKnowledge:", error);
      }
    }
  }

  docsList = Array.from(localKbStore.values());

  if (docsList.length === 0) {
    return [];
  }

  // 1. Check if user is asking for an update, overview, or list of the knowledge base
  const isOverviewOrUpdateQuery = /(?:what\s+is|what\s+are|tell\s+me\s+about|show|list|display)?\s*(?:the\s+)?(?:new|latest|recent|updated|current)?\s*(?:knowledge\s*base|knowledge|facts|updates|entries|stored\s+facts)/i.test(question) ||
    /(?:what\s+did\s+i\s+(?:add|update|store)|what\s+was\s+updated|what\s+is\s+updated|what\s+is\s+new|latest\s+update|show\s+update)/i.test(question);

  if (isOverviewOrUpdateQuery) {
    // Collect user-added or custom records first
    const customDocs = docsList.filter(d => 
      d.metadata?.author === 'user' ||
      d.metadata?.addedVia === 'admin_modal' ||
      (!d.sourceId.startsWith('arxiv_') && !d.sourceId.startsWith('src_'))
    );

    if (customDocs.length > 0) {
      // Sort custom docs newest first
      customDocs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return customDocs.slice(0, topK).map((doc, idx) => ({
        id: doc.id,
        content: doc.content,
        sourceId: doc.sourceId,
        timestamp: doc.timestamp,
        score: Number((1.0 - idx * 0.05).toFixed(2))
      }));
    }
  }

  const cleanQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const rawTokens = cleanQuestion.split(/\s+/).filter((t) => t.length >= 2);
  const keywords = rawTokens.filter(t => !COMMON_STOPWORDS.has(t));
  const searchTerms = keywords.length > 0 ? keywords : rawTokens.filter(t => t.length >= 3);

  if (searchTerms.length === 0) {
    return [];
  }

  const scoredDocs: Array<{ id: string; content: string; sourceId: string; timestamp: string; score: number }> = [];

  docsList.forEach((data) => {
    const contentLower = (data.content || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const sourceLower = (data.sourceId || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");

    const isCustom = data.metadata?.author === "user" || 
      data.metadata?.addedVia === "admin_modal" || 
      (!data.sourceId.startsWith("arxiv_") && !data.sourceId.startsWith("src_"));

    let matchScore = 0;

    // Direct exact content or source matching
    if (contentLower.includes(cleanQuestion.trim()) || sourceLower.includes(cleanQuestion.trim())) {
      matchScore += isCustom ? 25 : 12;
    }

    searchTerms.forEach((term) => {
      // Check whole word match in content
      if (new RegExp(`\\b${term}\\b`, 'i').test(contentLower)) {
        matchScore += isCustom ? 5 : 2.5;
      } else if (contentLower.includes(term)) {
        matchScore += isCustom ? 3 : 1.2;
      }

      // Check match in source ID
      if (sourceLower.includes(term)) {
        matchScore += isCustom ? 8 : 3;
      }
    });

    if (isCustom && matchScore > 0) {
      matchScore += 4; // Priority boost for user-updated documents
    }

    if (matchScore >= 1.5) {
      const normalizedScore = Number((matchScore / (searchTerms.length * 3 + 1)).toFixed(2));
      if (normalizedScore >= 0.15 || matchScore >= 3.0) {
        scoredDocs.push({
          id: data.id,
          content: data.content,
          sourceId: data.sourceId,
          timestamp: data.timestamp,
          score: normalizedScore
        });
      }
    }
  });

  // Also query Vector Database for semantic similarity matches
  try {
    const vectorMatches = searchVectorDatabase(question, topK, 0.15);
    for (const vm of vectorMatches) {
      const exists = scoredDocs.some(d => d.sourceId === vm.chunk.sourceId || d.content.includes(vm.chunk.passageText));
      if (!exists) {
        scoredDocs.push({
          id: vm.chunk.chunkId,
          content: vm.chunk.passageText,
          sourceId: vm.chunk.sourceId,
          timestamp: new Date().toISOString(),
          score: Number(vm.similarityScore.toFixed(2))
        });
      }
    }
  } catch (vectorErr) {
    console.warn("[QueryKnowledge] Vector search note:", vectorErr);
  }

  scoredDocs.sort((a, b) => b.score - a.score);
  return scoredDocs.slice(0, topK);
}

/**
 * Retrieves all stored documents from Firestore
 */
export async function getAllStoredKnowledge(): Promise<Array<KnowledgeDocument & { id: string }>> {
  const now = Date.now();
  if (now >= firestoreQuotaExceededUntil) {
    try {
      const db = getDb();
      const snapshot = await getDocs(collection(db, "knowledge_base"));
      snapshot.forEach((d) => {
        const item = { id: d.id, ...(d.data() as KnowledgeDocument) };
        const sid = item.sourceId || item.id;
        localKbStore.set(sid, item);
      });
      persistLocalKbCache();
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      if (errMsg.includes("Quota limit exceeded") || errMsg.includes("quota")) {
        firestoreQuotaExceededUntil = Date.now() + 300000;
        console.warn("[Firestore] Quota reached during getAllStoredKnowledge, serving from local persistent cache.");
      } else {
        console.error("Error in getAllStoredKnowledge:", error);
      }
    }
  }

  // Deduplicate array by sourceId before returning
  const uniqueMap = new Map<string, KnowledgeDocument & { id: string }>();
  for (const doc of localKbStore.values()) {
    const key = doc.sourceId || doc.id;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, doc);
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * Delete a specific document from Firestore
 */
export async function deleteKnowledge(docId: string): Promise<boolean> {
  for (const [k, v] of localKbStore.entries()) {
    if (k === docId || v.id === docId || v.sourceId === docId) {
      localKbStore.delete(k);
    }
  }
  persistLocalKbCache();

  const now = Date.now();
  if (now >= firestoreQuotaExceededUntil) {
    try {
      const db = getDb();
      await deleteDoc(doc(db, "knowledge_base", docId));
      return true;
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      if (errMsg.includes("Quota limit exceeded") || errMsg.includes("quota")) {
        firestoreQuotaExceededUntil = Date.now() + 600000;
      }
      return true;
    }
  }
  return true;
}
