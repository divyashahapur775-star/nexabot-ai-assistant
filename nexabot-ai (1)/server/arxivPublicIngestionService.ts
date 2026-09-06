import { XMLParser } from "fast-xml-parser";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { getDb } from "./firestoreKnowledgeService";
import { ingestDocumentStream, RawDocumentPayload } from "./knowledgeEngine";
import fs from "fs";
import path from "path";

export interface LiveArxivPaper {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedDate: string;
  docId: string;
  sourceId: string;
}

// In-memory store of live ingested papers
let liveIngestedPapers: LiveArxivPaper[] = [];

/**
 * Fetches real papers directly from arXiv public API XML feed
 * and writes them directly to Firestore 'knowledge_base' collection using concurrent writes.
 */
export async function fetchAndIngestLiveArxivPapers(maxResults: number = 50): Promise<{
  success: boolean;
  totalIngested: number;
  papers: LiveArxivPaper[];
  first10: { index: number; title: string; arxivId: string; published: string }[];
  errors: number;
}> {
  console.log(`[arXiv Ingestion] Fetching ${maxResults} live papers from arXiv API (cat:cs.CL)...`);
  const url = `http://export.arxiv.org/api/query?search_query=cat:cs.CL&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NexaBotAI-ResearchHarvester/2.0 (mailto:admin@nexabot.ai)' }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch from arXiv API: ${res.status} ${res.statusText}`);
  }
  const xmlData = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xmlData);
  const entries = parsed.feed?.entry || [];
  const entryList = Array.isArray(entries) ? entries : [entries];

  console.log(`[arXiv Ingestion] Successfully parsed ${entryList.length} real papers from arXiv XML.`);

  const db = getDb();
  const ingested: LiveArxivPaper[] = [];
  const vectorDocs: RawDocumentPayload[] = [];
  let writeErrors = 0;

  const writePromises = entryList.map(async (e: any) => {
    const rawId = String(e.id || "");
    const arxivId = rawId.includes("/abs/") ? rawId.split("/abs/")[1] : rawId;
    const title = String(e.title || "").replace(/\s+/g, " ").trim();
    const abstract = String(e.summary || "").replace(/\s+/g, " ").trim();
    const published = String(e.published || "");

    // Authors extraction
    let authors: string[] = [];
    if (e.author) {
      if (Array.isArray(e.author)) {
        authors = e.author.map((a: any) => typeof a === "object" ? String(a.name || "") : String(a)).filter(Boolean);
      } else if (typeof e.author === "object") {
        authors = [String(e.author.name || "")].filter(Boolean);
      }
    }

    const docId = `kb_arxiv_cscl_${arxivId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const sourceId = `arxiv_cscl_${arxivId}`;
    const content = `Paper Title: ${title}\narXiv ID: ${arxivId}\nAuthors: ${authors.join(", ")}\nCategory: cs.CL (Computation and Language)\nPublished: ${published}\n\nAbstract:\n${abstract}`;

    const paperObj: LiveArxivPaper = {
      arxivId,
      title,
      abstract,
      authors,
      publishedDate: published,
      docId,
      sourceId
    };

    // 1. Real database write to Firestore
    try {
      if (db) {
        const docRef = doc(db, "knowledge_base", docId);
        await setDoc(docRef, {
          id: docId,
          arxiv_id: arxivId,
          arxivId,
          title,
          abstract,
          authors,
          published_date: published,
          publishedDate: published,
          sourceId,
          content,
          timestamp: new Date().toISOString(),
          metadata: {
            arxivId,
            arxiv_id: arxivId,
            title,
            authors,
            publishedDate: published,
            published_date: published,
            dataset: "arxiv-cs.cl"
          }
        });
      }
    } catch (err: any) {
      console.warn(`[Firestore Write Notice] ${arxivId}:`, err?.message || err);
      writeErrors++;
    }

    return { paperObj, vectorDoc: {
      docId,
      sourceId: "arxiv-cscl-live",
      title,
      rawContent: content,
      contentType: "text" as const,
      publishedAt: published,
      metadata: { arxivId, arxiv_id: arxivId, authors, publishedDate: published, dataset: "arxiv-cs.cl" }
    }};
  });

  const results = await Promise.all(writePromises);
  for (const r of results) {
    ingested.push(r.paperObj);
    vectorDocs.push(r.vectorDoc);
  }

  liveIngestedPapers = ingested;

  // 2. Ingest into Vector Engine
  try {
    ingestDocumentStream(vectorDocs, "arxiv-cscl-live");
    console.log(`[Vector Engine] Indexed ${vectorDocs.length} live papers.`);
  } catch (err) {
    console.warn("[Vector Engine] Indexing notice:", err);
  }

  // 3. Save to local persistent cache backup
  try {
    const cachePath = path.join(process.cwd(), "knowledge_cache.json");
    const jsonList = ingested.map(p => ({
      id: p.docId,
      arxiv_id: p.arxivId,
      arxivId: p.arxivId,
      title: p.title,
      authors: p.authors,
      published_date: p.publishedDate,
      publishedDate: p.publishedDate,
      abstract: p.abstract,
      content: `Paper Title: ${p.title}\narXiv ID: ${p.arxivId}\nAuthors: ${p.authors.join(", ")}\nCategory: cs.CL (Computation and Language)\nPublished: ${p.publishedDate}\n\nAbstract:\n${p.abstract}`,
      sourceId: p.sourceId,
      timestamp: new Date().toISOString(),
      metadata: {
        arxivId: p.arxivId,
        arxiv_id: p.arxivId,
        title: p.title,
        authors: p.authors,
        publicationDate: p.publishedDate,
        published_date: p.publishedDate,
        dataset: "arxiv-cs.cl"
      }
    }));
    fs.writeFileSync(cachePath, JSON.stringify(jsonList, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Cache Persistence Notice]:", err);
  }

  const first10 = ingested.slice(0, 10).map((p, idx) => ({
    index: idx + 1,
    title: p.title,
    arxivId: p.arxivId,
    published: p.publishedDate
  }));

  console.log(`[arXiv Ingestion] Completed! Total: ${ingested.length} papers.`);
  return {
    success: true,
    totalIngested: ingested.length,
    papers: ingested,
    first10,
    errors: writeErrors
  };
}

let firestoreQuotaExceededUntil = 0;

/**
 * Live queries Firestore database for actual current document count
 */
export async function getLiveFirestoreDocCount(): Promise<number> {
  if (Date.now() < firestoreQuotaExceededUntil) {
    return getLiveIngestedPapers().length;
  }
  try {
    const db = getDb();
    if (db) {
      const snap = await getDocs(collection(db, "knowledge_base"));
      if (snap && typeof snap.size === "number") {
        return snap.size;
      }
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("Quota limit exceeded") || errMsg.includes("quota") || errMsg.includes("Quota exceeded")) {
      firestoreQuotaExceededUntil = Date.now() + 600000; // 10 minute cooldown
      console.log("[Firestore Live Count] Quota limit reached; utilizing local knowledge store cache.");
    } else {
      console.warn("[Firestore Live Count] Falling back to local store:", errMsg.slice(0, 120));
    }
  }
  const inMemory = getLiveIngestedPapers();
  return inMemory.length;
}

/**
 * Live queries Firestore database for actual documents
 */
export async function getLiveFirestorePapers(limitCount: number = 50): Promise<LiveArxivPaper[]> {
  if (Date.now() < firestoreQuotaExceededUntil) {
    return getLiveIngestedPapers().slice(0, limitCount);
  }
  try {
    const db = getDb();
    if (db) {
      const snap = await getDocs(collection(db, "knowledge_base"));
      if (snap && !snap.empty) {
        const docs: LiveArxivPaper[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const arxivId = d.arxiv_id || d.arxivId || (d.sourceId ? d.sourceId.replace("arxiv_cscl_", "") : docSnap.id);
          const title = d.title || d.metadata?.title || (d.content ? d.content.split("\n")[0].replace("Paper Title:", "").trim() : docSnap.id);
          const authors = Array.isArray(d.authors) ? d.authors : (Array.isArray(d.metadata?.authors) ? d.metadata.authors : []);
          const publishedDate = d.published_date || d.publishedDate || d.metadata?.publishedDate || d.timestamp || "";
          const abstract = d.abstract || d.content || "";
          docs.push({
            arxivId,
            title,
            abstract,
            authors,
            publishedDate,
            docId: docSnap.id,
            sourceId: d.sourceId || docSnap.id
          });
        });
        if (docs.length > 0) {
          liveIngestedPapers = docs;
          return docs.slice(0, limitCount);
        }
      }
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes("Quota limit exceeded") || errMsg.includes("quota") || errMsg.includes("Quota exceeded")) {
      firestoreQuotaExceededUntil = Date.now() + 600000; // 10 minute cooldown
      console.log("[Firestore Live Papers] Quota limit reached; utilizing local knowledge store cache.");
    } else {
      console.warn("[Firestore Live Papers] Falling back to local store:", errMsg.slice(0, 120));
    }
  }
  const inMemory = getLiveIngestedPapers();
  return inMemory.slice(0, limitCount);
}

export function getLiveIngestedPapers(): LiveArxivPaper[] {
  if (liveIngestedPapers.length > 0) return liveIngestedPapers;
  try {
    const cachePath = path.join(process.cwd(), "knowledge_cache.json");
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        liveIngestedPapers = data.map((d: any) => ({
          arxivId: d.arxiv_id || d.metadata?.arxivId || d.sourceId?.replace("arxiv_cscl_", "") || d.id,
          title: d.title || d.metadata?.title || "Paper",
          abstract: d.abstract || d.content || "",
          authors: d.authors || d.metadata?.authors || [],
          publishedDate: d.published_date || d.metadata?.publicationDate || d.timestamp || "",
          docId: d.id,
          sourceId: d.sourceId || d.id
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to load cached live papers:", e);
  }
  return liveIngestedPapers;
}

