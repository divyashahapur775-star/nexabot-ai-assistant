/**
 * Multimodal AI Assistant Pipeline Types & Interfaces
 */

export interface ImageAttachmentData {
  id?: string;
  name?: string;
  mimeType: string;
  base64Data: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface DetectedVisualEntity {
  name: string;
  category: "object" | "text" | "chart" | "diagram" | "person" | "symbol" | "animal" | "scenery" | "other";
  confidence: number;
  attributes?: Record<string, any>;
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  spatialRelation?: string;
}

export interface ExtractedOcrText {
  text: string;
  language?: string;
  confidence: number;
  location?: string;
}

export interface ImageAnalysisReport {
  imageId: string;
  imageName?: string;
  timestamp: string;
  summary: string;
  detectedObjects: DetectedVisualEntity[];
  extractedTexts: ExtractedOcrText[];
  dominantColors: string[];
  visualPatterns: string[];
  sceneContext: string;
  qualityMetrics: {
    isBlurry: boolean;
    isLowResolution: boolean;
    isOccluded: boolean;
    clarityScore: number; // 0.0 to 1.0
  };
}

export interface ConversationTurnContext {
  turnId: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  hasImage: boolean;
  imageAnalyses?: ImageAnalysisReport[];
  extractedEntities?: string[];
  keyTopics?: string[];
}

export interface AmbiguityAssessment {
  isAmbiguous: boolean;
  ambiguityType: "none" | "unclear_pronoun" | "missing_image" | "blurry_image" | "vague_intent" | "multiple_interpretations";
  confidence: number;
  detectedAmbiguousTerms: string[];
  clarificationQuestion?: string;
  potentialInterpretations?: string[];
  suggestedAction: "proceed_with_reasoning" | "clarify_first" | "present_options";
}

export interface GroundedEvidence {
  directlyObserved: Array<{
    source: "image" | "text" | "conversation_history";
    detail: string;
    confidence: number;
  }>;
  reasonedDeductions: Array<{
    hypothesis: string;
    supportedBy: string[];
    confidence: number;
  }>;
  uncertainties: string[];
}

export interface ValidationReport {
  isValid: boolean;
  addressesUserQuestion: boolean;
  isFullyGrounded: boolean;
  hallucinationRisk: "low" | "medium" | "high";
  unsupportedClaims: string[];
  revisedResponse?: string;
  validationNotes: string;
}

export interface MultimodalPipelineResult {
  reply: string;
  pipelineStages: {
    inputClassification: {
      hasCurrentImages: boolean;
      hasHistoricalImages: boolean;
      queryIntent: string;
      detectedModality: "text_only" | "image_with_text" | "image_only" | "multimodal_followup";
    };
    imageAnalysis?: ImageAnalysisReport[];
    contextRetrieval: {
      retrievedTurnsCount: number;
      activeImageReferencesCount: number;
      relevantHistorySummary: string;
    };
    ambiguityDetection: AmbiguityAssessment;
    evidenceExtraction: GroundedEvidence;
    reasoning: {
      decisionPath: string;
      steps: string[];
    };
    validation: ValidationReport;
  };
  groundedFacts: {
    directlyObserved: string[];
    reasonedConclusions: string[];
    uncertainties: string[];
  };
  ambiguityDetected: boolean;
  clarificationRequired: boolean;
}
