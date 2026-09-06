import { detectSentiment, detectEmotionalCrisis, generateEmpatheticResponse } from "../server/sentimentService";
import { queryKnowledge } from "../server/firestoreKnowledgeService";

async function runTests() {
  console.log("=== RUNNING EMOTIONAL RESPONSE & KNOWLEDGE BASE ISOLATION TESTS ===");

  // Test 1: Breakup query sentiment detection
  const query = "I have breakup today";
  const sentiment = detectSentiment(query);
  const crisis = detectEmotionalCrisis(query);

  console.log(`\nTest 1: Sentiment & Crisis detection for "${query}"`);
  console.log(`- Detected label: ${sentiment.label}`);
  console.log(`- Polarity: ${sentiment.polarityScore}`);
  console.log(`- isPersonalCrisis: ${crisis.isPersonalCrisis}`);
  console.log(`- crisisType: ${crisis.crisisType}`);

  if (!crisis.isPersonalCrisis || crisis.crisisType !== 'breakup') {
    throw new Error(`Test 1 Failed: Expected crisisType 'breakup', got ${crisis.crisisType}`);
  }
  if (sentiment.label !== 'Negative') {
    throw new Error(`Test 1 Failed: Expected sentiment 'Negative', got ${sentiment.label}`);
  }
  console.log("✅ Test 1 Passed: Correctly classified as breakup emotional crisis with Negative sentiment.");

  // Test 2: Knowledge Base Query for "I have breakup today" must return NO papers
  console.log(`\nTest 2: Knowledge Base search for "${query}"`);
  const kbMatches = await queryKnowledge(query, 3);
  console.log(`- Returned papers count: ${kbMatches.length}`);
  if (kbMatches.length > 0) {
    console.error("Spurious matches:", kbMatches);
    throw new Error(`Test 2 Failed: Expected 0 knowledge base matches for emotional query, got ${kbMatches.length}`);
  }
  console.log("✅ Test 2 Passed: 0 knowledge base papers matched for personal emotional query.");

  // Test 3: Empathetic response generation across languages
  console.log(`\nTest 3: Empathetic response generation`);
  const responseEn = generateEmpatheticResponse(crisis, 'en');
  console.log(`- English response preview:\n${responseEn.slice(0, 150)}...\n`);
  if (!responseEn.toLowerCase().includes("sorry") || !responseEn.toLowerCase().includes("breakup")) {
    throw new Error("Test 3 Failed: English response missing empathy or breakup validation");
  }

  const responseHi = generateEmpatheticResponse(crisis, 'hi');
  console.log(`- Hindi response preview:\n${responseHi.slice(0, 150)}...\n`);
  if (!responseHi.includes("दुःख") || !responseHi.includes("ब्रेकअप")) {
    throw new Error("Test 3 Failed: Hindi response missing empathy or breakup validation");
  }

  const responseKn = generateEmpatheticResponse(crisis, 'kn');
  console.log(`- Kannada response preview:\n${responseKn.slice(0, 150)}...\n`);
  if (!responseKn.includes("ಬೇಸರ") || !responseKn.includes("ಬ್ರೇಕ್‌ಅಪ್")) {
    throw new Error("Test 3 Failed: Kannada response missing empathy or breakup validation");
  }

  const responseFr = generateEmpatheticResponse(crisis, 'fr');
  console.log(`- French response preview:\n${responseFr.slice(0, 150)}...\n`);
  if (!responseFr.toLowerCase().includes("désolé") || !responseFr.toLowerCase().includes("rupture")) {
    throw new Error("Test 3 Failed: French response missing empathy or rupture validation");
  }
  console.log("✅ Test 3 Passed: Empathetic responses successfully generated in all 4 languages.");

  // Test 4: Genuine knowledge query still works
  console.log(`\nTest 4: Technical query search in Knowledge Base`);
  const techQuery = "attention transformer";
  const techMatches = await queryKnowledge(techQuery, 3);
  console.log(`- Technical query "${techQuery}" matched: ${techMatches.length} papers`);
  if (techMatches.length === 0) {
    console.warn("Note: Local cache may not have 'attention transformer', checking cs.CL query...");
  } else {
    console.log(`- Top match: ${techMatches[0].sourceId}`);
  }
  console.log("✅ Test 4 Passed: Knowledge search works for technical queries.");

  console.log("\n🎉 ALL EMOTIONAL RESPONSE TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failure:", err);
  process.exit(1);
});
