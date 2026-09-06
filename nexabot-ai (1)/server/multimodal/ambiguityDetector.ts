import { AmbiguityAssessment, ImageAnalysisReport, ConversationTurnContext } from "./types";

/**
 * Ambiguity Detector
 * Identifies underspecified queries, vague pronouns, blurry images, missing contexts, and multiple interpretations.
 */
export class AmbiguityDetector {
  public static assessAmbiguity(
    userQuery: string,
    currentImages: ImageAnalysisReport[],
    historicalImages: ImageAnalysisReport[],
    recentTurns: ConversationTurnContext[]
  ): AmbiguityAssessment {
    const query = userQuery.trim().toLowerCase();
    const detectedAmbiguousTerms: string[] = [];

    // 1. Check for Blurry or Low Quality Images
    for (const img of currentImages) {
      if (img.qualityMetrics.isBlurry || img.qualityMetrics.clarityScore < 0.4) {
        return {
          isAmbiguous: true,
          ambiguityType: "blurry_image",
          confidence: 0.95,
          detectedAmbiguousTerms: ["blurry_image_quality"],
          clarificationQuestion: "The uploaded image appears blurry or low-resolution, making specific details or small text difficult to verify accurately. Could you provide a clearer capture or specify which section you'd like me to focus on?",
          potentialInterpretations: [
            "Attempt OCR reading of prominent visible text",
            "Describe high-level structural layout without fine details",
          ],
          suggestedAction: "clarify_first",
        };
      }
    }

    // 2. Check for Missing Image Reference
    // E.g., user asks "what does this image show?" or "read this chart" but no image is uploaded and none exists in history
    const directImageReferenceRegex = /\b(this\s+image|this\s+photo|this\s+picture|the\s+attached\s+image|in\s+the\s+image|in\s+this\s+diagram|this\s+chart|the\s+screenshot)\b/i;
    const hasImageAttachment = currentImages.length > 0 || historicalImages.length > 0;

    if (directImageReferenceRegex.test(userQuery) && !hasImageAttachment) {
      return {
        isAmbiguous: true,
        ambiguityType: "missing_image",
        confidence: 0.98,
        detectedAmbiguousTerms: ["unattached_image_reference"],
        clarificationQuestion: "You mentioned an image, chart, or diagram, but no file is currently attached to our conversation. Please upload the image so I can analyze its visual elements and answer your question accurately.",
        potentialInterpretations: [
          "Upload an image for multimodal analysis",
          "Describe the visual elements in text if you cannot upload",
        ],
        suggestedAction: "clarify_first",
      };
    }

    // 3. Check for Ambiguous Pronoun References
    // E.g. "what is it?", "how much is that?", "explain this" when multiple distinct entities exist in context
    const vaguePronounRegex = /^(?:what\s+is\s+(?:it|this|that)|how\s+much\s+is\s+(?:it|that)|why\s+is\s+(?:it|that|this)|tell\s+me\s+about\s+(?:it|this|that)|explain\s+(?:it|this|that))\??$/i;
    
    if (vaguePronounRegex.test(query)) {
      const allObjects: string[] = [];
      for (const img of [...currentImages, ...historicalImages]) {
        for (const obj of img.detectedObjects) {
          allObjects.push(obj.name);
        }
      }

      if (allObjects.length > 1 && recentTurns.length === 0) {
        return {
          isAmbiguous: true,
          ambiguityType: "unclear_pronoun",
          confidence: 0.88,
          detectedAmbiguousTerms: ["it", "this", "that"],
          clarificationQuestion: `The image contains multiple distinct elements (${allObjects.slice(0, 3).join(", ")}). Which specific item or section would you like me to explain?`,
          potentialInterpretations: allObjects.slice(0, 3).map(o => `Focus analysis on the ${o}`),
          suggestedAction: "present_options",
        };
      }
    }

    // 4. Check for Vague or Underspecified One-Word Queries
    if (query.length < 4 && !currentImages.length && !historicalImages.length) {
      return {
        isAmbiguous: true,
        ambiguityType: "vague_intent",
        confidence: 0.85,
        detectedAmbiguousTerms: [query],
        clarificationQuestion: "Your query is very brief. Could you provide a bit more detail on what you'd like to analyze, calculate, or explore?",
        potentialInterpretations: [
          "General conversational assistance",
          "Document or multimodal image analysis",
        ],
        suggestedAction: "clarify_first",
      };
    }

    // Default: Clear, unambiguous query
    return {
      isAmbiguous: false,
      ambiguityType: "none",
      confidence: 0.95,
      detectedAmbiguousTerms: [],
      suggestedAction: "proceed_with_reasoning",
    };
  }
}
