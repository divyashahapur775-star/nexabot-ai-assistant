import { ValidationReport, GroundedEvidence, AmbiguityAssessment } from "./types";

/**
 * Multi-Modal Response Validator
 * Verifies that the generated response is grounded, addresses the query, avoids hallucinations, and communicates uncertainties.
 */
export class ResponseValidator {
  public static validate(
    draftResponse: string,
    userQuery: string,
    evidence: GroundedEvidence,
    ambiguity: AmbiguityAssessment
  ): ValidationReport {
    const unsupportedClaims: string[] = [];
    const notes: string[] = [];

    // If clarification was requested, it is valid by design
    if (ambiguity.isAmbiguous) {
      return {
        isValid: true,
        addressesUserQuestion: true,
        isFullyGrounded: true,
        hallucinationRisk: "low",
        unsupportedClaims: [],
        validationNotes: "Response correctly presents a clarification question to avoid unsupported assumptions.",
      };
    }

    // 1. Verify that response addresses user query keywords
    const queryKeywords = userQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !["what", "where", "when", "which", "about", "this", "that"].includes(w));

    let keywordMatches = 0;
    const responseLower = draftResponse.toLowerCase();

    for (const kw of queryKeywords) {
      if (responseLower.includes(kw)) {
        keywordMatches++;
      }
    }

    const addressesUserQuestion = queryKeywords.length === 0 || keywordMatches > 0;
    if (!addressesUserQuestion) {
      notes.push("Response may be tangentially related to the original query keywords.");
    }

    // 2. Check for Hallucination / Unsupported Claims
    // Verify that claims about images are grounded in evidence.directlyObserved
    const claimsToVerify = draftResponse.match(/\b(?:shows|contains|depicts|includes|displays)\s+([^.,;:\n]+)/gi) || [];
    for (const claim of claimsToVerify) {
      const claimSnippet = claim.toLowerCase();
      const isGrounded = evidence.directlyObserved.some(obs =>
        obs.detail.toLowerCase().includes(claimSnippet.slice(0, 15))
      ) || evidence.reasonedDeductions.some(ded =>
        ded.hypothesis.toLowerCase().includes(claimSnippet.slice(0, 15))
      );

      if (!isGrounded && claim.length > 25) {
        unsupportedClaims.push(claim);
      }
    }

    // Check for speculative normalcy / safety / operational assumptions without evidence
    const speculativePhrases = [
      "typical", "safe range", "normal range", "typical range", "optimal", "healthy", 
      "functioning as intended", "operating normally", "within typical", "within safe",
      "within normal", "acceptable range", "good condition"
    ];

    for (const phrase of speculativePhrases) {
      if (responseLower.includes(phrase)) {
        const hasEvidence = evidence.directlyObserved.some(obs => obs.detail.toLowerCase().includes(phrase)) ||
                            evidence.reasonedDeductions.some(ded => ded.hypothesis.toLowerCase().includes(phrase));
        if (!hasEvidence) {
          unsupportedClaims.push(`Unsupported assumption of normalcy/safety/status: "${phrase}"`);
        }
      }
    }

    // 3. Check if uncertainty is required but omitted
    const hasUncertainties = evidence.uncertainties.length > 0;
    const mentionsUncertainty = /\b(uncertain|cannot\s+confirm|not\s+visible|blurry|unclear|missing|approximate|cannot\s+be\s+determined)\b/i.test(draftResponse);

    if (hasUncertainties && !mentionsUncertainty) {
      notes.push("Added explicit uncertainty notice to ensure factual transparency.");
    }

    const hallucinationRisk = unsupportedClaims.length > 1 ? "high" : unsupportedClaims.length === 1 ? "medium" : "low";
    const isFullyGrounded = unsupportedClaims.length === 0;

    let revisedResponse: string | undefined = undefined;

    // 4. Revise if necessary
    if (unsupportedClaims.length > 0 || (hasUncertainties && !mentionsUncertainty)) {
      revisedResponse = draftResponse;
      
      // If speculative normalcy/safety claims were detected, sanitize or correct them
      if (unsupportedClaims.some(c => c.includes("normalcy/safety/status"))) {
        for (const phrase of speculativePhrases) {
          if (revisedResponse.toLowerCase().includes(phrase)) {
            const regex = new RegExp(`[^.?!]*\\b${phrase}\\b[^.?!]*[.?!]`, 'gi');
            revisedResponse = revisedResponse.replace(regex, `(Note: Whether values or operational status are normal, safe, or functioning as intended cannot be determined from the available image evidence alone.)`);
          }
        }
      }

      if (hasUncertainties && !mentionsUncertainty && !revisedResponse.toLowerCase().includes("cannot be determined")) {
        revisedResponse += `\n\n*(Uncertainty Notice: Assessment of safe ranges or operational status cannot be determined from the available evidence alone.)*`;
      }
    }

    return {
      isValid: hallucinationRisk !== "high",
      addressesUserQuestion,
      isFullyGrounded,
      hallucinationRisk,
      unsupportedClaims,
      revisedResponse,
      validationNotes: notes.join(" ") || "Response passed all grounding and validation checks.",
    };
  }
}
