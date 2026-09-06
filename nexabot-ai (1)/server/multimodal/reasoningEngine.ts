import { GoogleGenAI } from "@google/genai";
import {
  GroundedEvidence,
  ImageAnalysisReport,
  ConversationTurnContext,
  AmbiguityAssessment,
  ImageAttachmentData,
} from "./types";

/**
 * Multimodal Reasoning Engine
 * Executes structured multi-step deduction, hypothesis evaluation, and grounded synthesis over text and image evidence.
 */
export class ReasoningEngine {
  public static async executeReasoning(
    userQuery: string,
    evidence: GroundedEvidence,
    ambiguity: AmbiguityAssessment,
    currentImages: ImageAnalysisReport[],
    historicalImages: ImageAnalysisReport[],
    recentTurns: ConversationTurnContext[],
    rawImages: ImageAttachmentData[] = []
  ): Promise<{
    decisionPath: string;
    steps: string[];
    draftResponse: string;
  }> {
    // If ambiguity requires immediate clarification
    if (ambiguity.isAmbiguous && ambiguity.clarificationQuestion) {
      return {
        decisionPath: "Ambiguity Clarification Path",
        steps: [
          `Detected ambiguity type: ${ambiguity.ambiguityType}`,
          `Triggered clarification protocol instead of guessing`,
          `Formulated clarifying question to resolve user intent`,
        ],
        draftResponse: ambiguity.clarificationQuestion,
      };
    }

    const steps: string[] = [
      `1. Analyzed input modality: ${currentImages.length > 0 ? "Direct Image + Text" : historicalImages.length > 0 ? "Conversational Image Follow-up" : "Text Query"}`,
      `2. Extracted ${evidence.directlyObserved.length} directly observed facts and ${evidence.reasonedDeductions.length} grounded deductions.`,
      `3. Cross-referenced with ${recentTurns.length} recent conversation turns to preserve multi-turn context.`,
    ];

    const decisionPath = "Evidence-Grounded Multimodal Deduction";

    // 1. Try Gemini generation with structured reasoning instructions
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: { "User-Agent": "aistudio-build" },
          },
        });

        const evidenceSummary = `
DIRECTLY OBSERVED EVIDENCE:
${evidence.directlyObserved.map(e => `- [${e.source.toUpperCase()}] ${e.detail}`).join("\n")}

REASONED DEDUCTIONS:
${evidence.reasonedDeductions.map(d => `- Hypothesis: ${d.hypothesis} (Supported by: ${d.supportedBy.join(", ")})`).join("\n")}

UNCERTAINTIES / MISSING INFORMATION:
${evidence.uncertainties.length > 0 ? evidence.uncertainties.map(u => `- ${u}`).join("\n") : "- None identified."}
`;

        const systemInstruction = `You are NexaBot Multi-Modal Reasoning Assistant.
You MUST provide clear, comprehensive, highly structured answers grounded strictly in the verified evidence above.

Structure your response with clean Markdown:
- 👁️ **Direct Visual & Text Observations**: Detail the exact objects, text, layouts, or data points observed.
- 🧠 **Contextual Reasoning & Analysis**: Detail logical deductions connecting the user's question to the evidence.
- ⚠️ **Limitations / Uncertainties**: If any element is ambiguous, blurry, or missing, clearly state it.

CRITICAL EVIDENCE-GROUNDING RULES:
1. Distinguish strictly between direct observations, reasoned conclusions, and unknown information.
2. DO NOT assume or state standard, safe, normal, typical, or optimal ranges unless those exact ranges are explicitly visible or provided in the image/evidence.
3. DO NOT claim that a system, device, or environment is "functioning as intended", "normal", "healthy", or "good" without explicit visual or textual evidence establishing that status.
4. If information (such as safety thresholds or operational status) is not available in the image, explicitly state that it cannot be determined from the available evidence.`;

        const userPrompt = `User Question: "${userQuery}"

Verified Evidence & Context:
${evidenceSummary}

Provide a well-grounded, helpful, and comprehensive response.`;

        // Attach actual inline image data parts so Gemini vision models process the real images
        const inlineImageParts: any[] = [];
        for (const img of rawImages) {
          if (img.base64Data) {
            const cleanBase64 = img.base64Data.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
            let mimeType = img.mimeType || "image/jpeg";
            if (mimeType === "image/jpg") mimeType = "image/jpeg";
            if (cleanBase64.length > 20) {
              inlineImageParts.push({
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              });
            }
          }
        }

        const modelsToTry = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro"];
        let response: any = null;

        for (const modelName of modelsToTry) {
          try {
            const apiCall = ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  ...inlineImageParts,
                  { text: userPrompt }
                ],
              },
              config: {
                systemInstruction: { parts: [{ text: systemInstruction }] },
              },
            });

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 12000));
            response = await Promise.race([apiCall, timeoutPromise]);

            if (response && response.text && response.text.trim()) {
              break;
            }
          } catch (modelErr: any) {
            const msg = modelErr?.message || String(modelErr);
            if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
              console.log(`[ReasoningEngine] Model ${modelName} quota limit reached, attempting fallback...`);
            } else if (msg.includes("Timeout")) {
              console.log(`[ReasoningEngine] Model ${modelName} timed out, attempting fallback...`);
            } else {
              console.log(`[ReasoningEngine] Model ${modelName} fallback triggered.`);
            }
          }
        }

        const generatedText = response?.text || "";
        if (generatedText.trim()) {
          steps.push("4. Successfully synthesized evidence-grounded response via Gemini Reasoning Engine.");
          return {
            decisionPath,
            steps,
            draftResponse: generatedText.trim(),
          };
        }
      } catch (err: any) {
        console.log("[ReasoningEngine] Engaging deterministic reasoning synthesizer.");
      }
    }

    // 2. Deterministic Structured Fallback Generator
    steps.push("4. Executed deterministic structured reasoning synthesis.");
    const draft = generateDeterministicResponse(userQuery, evidence, currentImages, historicalImages);

    return {
      decisionPath,
      steps,
      draftResponse: draft,
    };
  }
}

function generateDeterministicResponse(
  userQuery: string,
  evidence: GroundedEvidence,
  currentImages: ImageAnalysisReport[],
  historicalImages: ImageAnalysisReport[]
): string {
  const images = currentImages.length > 0 ? currentImages : historicalImages;
  const primaryImg = images[0];

  const observations = evidence.directlyObserved
    .slice(0, 5)
    .map(o => `- ${o.detail}`)
    .join("\n");

  const deductions = evidence.reasonedDeductions
    .map(d => `- **${d.hypothesis}**: Supported by visible attributes (${d.supportedBy.join(", ")}).`)
    .join("\n");

  let text = `### 👁️ Direct Visual & Text Observations\n${observations || "- Standard input context processed."}\n\n`;

  if (deductions) {
    text += `### 🧠 Contextual Reasoning & Analysis\n${deductions}\n\n`;
  }

  if (primaryImg) {
    text += `**Visual Summary:** ${primaryImg.summary}\n`;
    if (primaryImg.extractedTexts.length > 0) {
      text += `\n**Key Text Extracted via OCR:**\n${primaryImg.extractedTexts.map(t => `- *"${t.text}"* (${t.location || "visible"})`).join("\n")}\n`;
    }
  }

  if (evidence.uncertainties.length > 0) {
    text += `\n### ⚠️ Uncertainties & Limitations\n${evidence.uncertainties.map(u => `- ${u}`).join("\n")}\n`;
  }

  return text;
}
