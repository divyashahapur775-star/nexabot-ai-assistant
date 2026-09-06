import {
  ImageAttachmentData,
  MultimodalPipelineResult,
  ImageAnalysisReport,
} from "./types";
import { analyzeImage } from "./imageAnalyzer";
import { MultimodalContextManager } from "./contextManager";
import { AmbiguityDetector } from "./ambiguityDetector";
import { EvidenceExtractor } from "./evidenceExtractor";
import { ReasoningEngine } from "./reasoningEngine";
import { ResponseValidator } from "./responseValidator";

/**
 * Master Multimodal AI Pipeline Orchestrator
 * Executes:
 * 1. Input Classification
 * 2. Image Analysis
 * 3. Context Retrieval
 * 4. Evidence Extraction
 * 5. Ambiguity Detection
 * 6. Reasoning / Decision Layer
 * 7. Response Generation
 * 8. Response Validation Layer
 * 9. Final Answer Output
 */
export async function executeMultimodalPipeline(
  userQuery: string,
  images: ImageAttachmentData[] = [],
  sessionId: string = "default_session"
): Promise<MultimodalPipelineResult> {
  const query = userQuery || "";

  // -------------------------------------------------------------
  // Stage 1: Input Classification
  // -------------------------------------------------------------
  const hasCurrentImages = images.length > 0;
  const historyContext = MultimodalContextManager.retrieveHistoricalContext(sessionId, query);
  const hasHistoricalImages = historyContext.activeImageAnalyses.length > 0;

  let detectedModality: "text_only" | "image_with_text" | "image_only" | "multimodal_followup" = "text_only";
  if (hasCurrentImages && query.trim()) {
    detectedModality = "image_with_text";
  } else if (hasCurrentImages && !query.trim()) {
    detectedModality = "image_only";
  } else if (!hasCurrentImages && hasHistoricalImages && historyContext.hasFollowupReference) {
    detectedModality = "multimodal_followup";
  }

  const queryIntent = query.trim()
    ? `Inquiry regarding ${detectedModality === "text_only" ? "text query" : "visual and textual multi-modal content"}`
    : "Visual image analysis and feature extraction";

  // -------------------------------------------------------------
  // Stage 2: Image Analysis (for current images)
  // -------------------------------------------------------------
  const analyzedCurrentImages: ImageAnalysisReport[] = [];
  for (const img of images) {
    const analysis = await analyzeImage(img, query);
    analyzedCurrentImages.push(analysis);
  }

  // -------------------------------------------------------------
  // Stage 3: Context Retrieval (retrieve session history & past images)
  // -------------------------------------------------------------
  const retrievedTurns = historyContext.turns;
  const historicalImages = historyContext.activeImageAnalyses;

  // -------------------------------------------------------------
  // Stage 4: Ambiguity Detection & Clarification Handling
  // -------------------------------------------------------------
  const ambiguityAssessment = AmbiguityDetector.assessAmbiguity(
    query,
    analyzedCurrentImages,
    historicalImages,
    retrievedTurns
  );

  // -------------------------------------------------------------
  // Stage 5: Evidence Extraction
  // -------------------------------------------------------------
  const evidence = EvidenceExtractor.extractEvidence(
    query,
    analyzedCurrentImages,
    historicalImages,
    retrievedTurns
  );

  // -------------------------------------------------------------
  // Stage 6 & 7: Reasoning / Decision Layer & Response Generation
  // -------------------------------------------------------------
  const reasoningResult = await ReasoningEngine.executeReasoning(
    query,
    evidence,
    ambiguityAssessment,
    analyzedCurrentImages,
    historicalImages,
    retrievedTurns,
    images
  );

  // -------------------------------------------------------------
  // Stage 8: Response Validation Layer
  // -------------------------------------------------------------
  const validation = ResponseValidator.validate(
    reasoningResult.draftResponse,
    query,
    evidence,
    ambiguityAssessment
  );

  const finalReply = validation.revisedResponse || reasoningResult.draftResponse;

  // -------------------------------------------------------------
  // Stage 9: Record turn in context memory & return structured output
  // -------------------------------------------------------------
  MultimodalContextManager.recordTurn(
    sessionId,
    "user",
    query || "[Uploaded image for analysis]",
    analyzedCurrentImages
  );

  MultimodalContextManager.recordTurn(
    sessionId,
    "assistant",
    finalReply,
    []
  );

  return {
    reply: finalReply,
    pipelineStages: {
      inputClassification: {
        hasCurrentImages,
        hasHistoricalImages,
        queryIntent,
        detectedModality,
      },
      imageAnalysis: analyzedCurrentImages,
      contextRetrieval: {
        retrievedTurnsCount: retrievedTurns.length,
        activeImageReferencesCount: historicalImages.length + analyzedCurrentImages.length,
        relevantHistorySummary: historyContext.summary || "Starting new session context",
      },
      ambiguityDetection: ambiguityAssessment,
      evidenceExtraction: evidence,
      reasoning: {
        decisionPath: reasoningResult.decisionPath,
        steps: reasoningResult.steps,
      },
      validation,
    },
    groundedFacts: {
      directlyObserved: evidence.directlyObserved.map(o => o.detail),
      reasonedConclusions: evidence.reasonedDeductions.map(d => `${d.hypothesis} (supported by: ${d.supportedBy.join(", ")})`),
      uncertainties: evidence.uncertainties,
    },
    ambiguityDetected: ambiguityAssessment.isAmbiguous,
    clarificationRequired: ambiguityAssessment.suggestedAction === "clarify_first",
  };
}
