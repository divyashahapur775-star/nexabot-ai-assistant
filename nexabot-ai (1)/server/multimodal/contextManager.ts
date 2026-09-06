import { ConversationTurnContext, ImageAnalysisReport } from "./types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "../firestoreKnowledgeService";

interface SessionMultimodalMemory {
  sessionId: string;
  turns: ConversationTurnContext[];
  cachedImageAnalyses: Map<string, ImageAnalysisReport>;
  updatedAt: string;
}

const memoryStore: Map<string, SessionMultimodalMemory> = new Map();

export class MultimodalContextManager {
  /**
   * Retrieves or creates context memory for a conversation session
   */
  public static getSessionMemory(sessionId: string): SessionMultimodalMemory {
    const key = sessionId || "default_session";
    if (!memoryStore.has(key)) {
      memoryStore.set(key, {
        sessionId: key,
        turns: [],
        cachedImageAnalyses: new Map(),
        updatedAt: new Date().toISOString(),
      });
    }
    return memoryStore.get(key)!;
  }

  /**
   * Records a user or assistant turn along with any analyzed images
   */
  public static recordTurn(
    sessionId: string,
    role: "user" | "assistant",
    text: string,
    imageAnalyses?: ImageAnalysisReport[]
  ): ConversationTurnContext {
    const session = this.getSessionMemory(sessionId);
    const hasImage = Boolean(imageAnalyses && imageAnalyses.length > 0);

    const turn: ConversationTurnContext = {
      turnId: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role,
      text,
      timestamp: new Date().toISOString(),
      hasImage,
      imageAnalyses: imageAnalyses || [],
      extractedEntities: this.extractKeyEntities(text),
      keyTopics: this.extractTopics(text),
    };

    session.turns.push(turn);
    session.updatedAt = new Date().toISOString();

    if (imageAnalyses) {
      for (const img of imageAnalyses) {
        session.cachedImageAnalyses.set(img.imageId, img);
      }
    }

    // Persist snapshot asynchronously to Firestore
    this.persistSessionSnapshot(session).catch(err => {
      console.warn("[MultimodalContextManager] Async snapshot notice:", err);
    });

    return turn;
  }

  /**
   * Retrieves historical context, recent messages, and previously analyzed images
   */
  public static retrieveHistoricalContext(sessionId: string, currentTurnText: string): {
    turns: ConversationTurnContext[];
    activeImageAnalyses: ImageAnalysisReport[];
    summary: string;
    hasFollowupReference: boolean;
  } {
    const session = this.getSessionMemory(sessionId);
    const recentTurns = session.turns.slice(-6); // Last 6 turns

    // Collect all historical images in this session
    const allImages: ImageAnalysisReport[] = [];
    for (const turn of session.turns) {
      if (turn.imageAnalyses) {
        for (const img of turn.imageAnalyses) {
          if (!allImages.some(x => x.imageId === img.imageId)) {
            allImages.push(img);
          }
        }
      }
    }

    // Detect if current turn references previous conversation or past images
    const followupKeywords = /\b(it|this|that|these|those|the\s+image|the\s+picture|the\s+diagram|the\s+chart|above|previous|earlier|first\s+one|color\s+of\s+it|what\s+else|explain\s+more)\b/i;
    const hasFollowupReference = followupKeywords.test(currentTurnText);

    let summary = "";
    if (recentTurns.length > 0) {
      summary = recentTurns
        .map(t => `${t.role.toUpperCase()}: ${t.text.slice(0, 100)}${t.hasImage ? " [Image Attached]" : ""}`)
        .join(" | ");
    }

    return {
      turns: recentTurns,
      activeImageAnalyses: allImages,
      summary,
      hasFollowupReference,
    };
  }

  /**
   * Clears context for a given session
   */
  public static clearSession(sessionId: string) {
    memoryStore.delete(sessionId);
  }

  private static extractKeyEntities(text: string): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const capitalized = text.match(/\b[A-Z][a-z0-9_]+\b/g) || [];
    return Array.from(new Set([...capitalized, ...words.slice(0, 5)]));
  }

  private static extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lower = text.toLowerCase();
    if (lower.includes("chart") || lower.includes("graph")) topics.push("data_visualization");
    if (lower.includes("code") || lower.includes("architecture")) topics.push("software_architecture");
    if (lower.includes("summary") || lower.includes("summarize")) topics.push("summarization");
    if (lower.includes("color") || lower.includes("visual")) topics.push("visual_attributes");
    return topics;
  }

  private static async persistSessionSnapshot(session: SessionMultimodalMemory) {
    const db = getDb();
    if (!db) return;
    try {
      const docRef = doc(db, "multimodal_sessions", session.sessionId);
      await setDoc(
        docRef,
        {
          sessionId: session.sessionId,
          turnCount: session.turns.length,
          lastUpdated: session.updatedAt,
          recentTurns: session.turns.slice(-10).map(t => ({
            role: t.role,
            text: t.text,
            hasImage: t.hasImage,
            timestamp: t.timestamp,
          })),
        },
        { merge: true }
      );
    } catch (e) {
      // Ignored for non-blocking persistence
    }
  }
}
