import { GroundedEvidence, ImageAnalysisReport, ConversationTurnContext } from "./types";

/**
 * Grounded Evidence Extractor
 * Separates direct visual observations, contextual text facts, reasoned deductions, and explicit uncertainties.
 */
export class EvidenceExtractor {
  public static extractEvidence(
    userQuery: string,
    currentImages: ImageAnalysisReport[],
    historicalImages: ImageAnalysisReport[],
    recentTurns: ConversationTurnContext[]
  ): GroundedEvidence {
    const directlyObserved: GroundedEvidence["directlyObserved"] = [];
    const reasonedDeductions: GroundedEvidence["reasonedDeductions"] = [];
    const uncertainties: string[] = [];

    // 1. Extract from Current & Historical Images
    const targetImages = currentImages.length > 0 ? currentImages : historicalImages;

    for (const img of targetImages) {
      // Direct visual entities
      for (const obj of img.detectedObjects) {
        let detail = `Observed entity: "${obj.name}" (${obj.category})`;
        if (obj.spatialRelation) {
          detail += ` located at ${obj.spatialRelation}`;
        }
        if (obj.attributes) {
          const attrStr = Object.entries(obj.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          detail += ` with attributes [${attrStr}]`;
        }
        directlyObserved.push({
          source: "image",
          detail,
          confidence: obj.confidence || 0.9,
        });
      }

      // Direct OCR text
      for (const txt of img.extractedTexts) {
        directlyObserved.push({
          source: "image",
          detail: `Verbatim text in image: "${txt.text}" (location: ${txt.location || "visible body"})`,
          confidence: txt.confidence || 0.95,
        });
      }

      // Colors & patterns
      if (img.dominantColors && img.dominantColors.length > 0) {
        directlyObserved.push({
          source: "image",
          detail: `Visual color palette: ${img.dominantColors.join(", ")}`,
          confidence: 0.88,
        });
      }
    }

    // 2. Extract from User Query & Recent Turns
    if (userQuery.trim()) {
      directlyObserved.push({
        source: "text",
        detail: `User explicit query: "${userQuery.trim()}"`,
        confidence: 1.0,
      });
    }

    for (const turn of recentTurns.slice(-3)) {
      directlyObserved.push({
        source: "conversation_history",
        detail: `Previous ${turn.role} context: "${turn.text.slice(0, 120)}"`,
        confidence: 0.95,
      });
    }

    // 3. Reasoned Deductions based on user intent & observed items
    const queryLower = userQuery.toLowerCase();
    if (targetImages.length > 0) {
      const img = targetImages[0];
      if (img.sceneContext) {
        reasonedDeductions.push({
          hypothesis: `The image represents a ${img.sceneContext}`,
          supportedBy: img.detectedObjects.map(o => o.name).slice(0, 4),
          confidence: 0.92,
        });
      }

      if (queryLower.includes("summarize") || queryLower.includes("what is this") || queryLower.includes("explain")) {
        reasonedDeductions.push({
          hypothesis: `Primary function/subject of the image: ${img.summary}`,
          supportedBy: [`Extracted ${img.detectedObjects.length} visual entities and ${img.extractedTexts.length} text blocks.`],
          confidence: 0.9,
        });
      }
    }

    // 4. Identify Missing or Uncertain Information
    if (targetImages.length === 0 && (queryLower.includes("image") || queryLower.includes("chart") || queryLower.includes("photo"))) {
      uncertainties.push("No direct image file is attached to confirm specific visual metrics.");
    }
    if (targetImages.some(img => img.qualityMetrics.isBlurry)) {
      uncertainties.push("Fine textual details or micro-elements could not be confirmed with 100% certainty due to image resolution/blur.");
    }

    return {
      directlyObserved,
      reasonedDeductions,
      uncertainties,
    };
  }
}
