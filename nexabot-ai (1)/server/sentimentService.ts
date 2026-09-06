/**
 * NexaBot Sentiment Analysis & Response Adaptation Engine
 * 
 * Implements:
 * 1. Real-time Conversational NLP Sentiment & Emotion Detection (Positive, Negative, Neutral)
 * 2. Response Adaptation Logic (Tone matching, Solution offering, Human Escalation scoring)
 * 3. Multi-turn Conversation Context & Frustration Trend Tracking
 * 4. Ground-truth Evaluation Matrix (Accuracy, Precision, Recall, F1-Score)
 * 5. Proxy Customer Satisfaction (CSAT) & Telemetry Logging
 */

export type SentimentLabel = 'Positive' | 'Negative' | 'Neutral';
export type EscalationLevel = 'None' | 'Medium' | 'High';
export type SentimentTrend = 'Improving' | 'Declining' | 'Stable' | 'Initial';

export interface EmotionDistribution {
  joy: number;          // 0 - 100%
  frustration: number;  // 0 - 100%
  neutrality: number;   // 0 - 100%
  urgency: number;      // 0 - 100%
  satisfaction: number; // 0 - 100%
}

export interface SentimentResult {
  label: SentimentLabel;
  polarityScore: number;        // -1.0 (very negative) to +1.0 (very positive)
  confidenceScore: number;      // 0.0 to 1.0 (e.g. 0.92)
  confidencePercentage: number; // 0 - 100%
  emotionDistribution: EmotionDistribution;
  keyPhrases: string[];
}

export interface AdaptationStrategy {
  tone: 'Empathetic & Solution-Focused' | 'Enthusiastic & Appreciative' | 'Objective & Informative' | 'Deeply Empathetic & Comforting';
  shouldEscalate: boolean;
  escalationLevel: EscalationLevel;
  escalationReason: string | null;
  actionRecommendation: string;
  systemPromptModifier: string;
}

export interface ConversationSentimentContext {
  sessionId?: string;
  turnIndex: number;
  currentSentiment: SentimentResult;
  history: SentimentResult[];
  trend: SentimentTrend;
  averagePolarity: number;
  escalationTriggered: boolean;
  sentimentDelta: number; // change from first turn to current turn
}

export interface SentimentAnalysisResponse {
  sentiment: SentimentResult;
  strategy: AdaptationStrategy;
  context: ConversationSentimentContext;
}

export interface EvaluationRecord {
  id: string;
  timestamp: string;
  text: string;
  predicted: SentimentLabel;
  confidence: number;
  actual?: SentimentLabel;
  escalated: boolean;
  adaptedTone: string;
}

// In-memory telemetry log for session evaluation & CSAT proxy metrics
const sentimentLogs: EvaluationRecord[] = [];
const sessionHistories: Map<string, SentimentResult[]> = new Map();

// --- Lexicons & Valence Modifiers ---
const POSITIVE_LEXICON: Record<string, number> = {
  great: 0.8,
  excellent: 0.9,
  good: 0.5,
  awesome: 0.9,
  fantastic: 0.95,
  love: 0.85,
  happy: 0.7,
  helpful: 0.6,
  perfect: 0.95,
  wonderful: 0.9,
  best: 0.85,
  superb: 0.9,
  amazing: 0.9,
  delighted: 0.85,
  resolved: 0.6,
  thank: 0.5,
  thanks: 0.5,
  appreciate: 0.7,
  fast: 0.4,
  easy: 0.4,
  smooth: 0.5,
  brilliant: 0.85,
  flawless: 0.95,
  reliable: 0.6
};

const NEGATIVE_LEXICON: Record<string, number> = {
  bad: -0.6,
  terrible: -0.9,
  horrible: -0.95,
  worst: -1.0,
  awful: -0.9,
  hate: -0.85,
  poor: -0.5,
  broken: -0.7,
  fail: -0.7,
  failed: -0.7,
  error: -0.6,
  bug: -0.5,
  angry: -0.8,
  frustrated: -0.85,
  frustrating: -0.85,
  slow: -0.4,
  disappointed: -0.8,
  annoyed: -0.6,
  useless: -0.85,
  ridiculous: -0.75,
  unacceptable: -0.9,
  waste: -0.7,
  stuck: -0.5,
  confused: -0.4,
  problem: -0.5,
  crash: -0.7,
  cancel: -0.6,
  refund: -0.65,
  // Relationship, heartbreak & emotional distress
  breakup: -0.95,
  heartbreak: -0.95,
  heartbroken: -0.95,
  dumped: -0.85,
  divorce: -0.9,
  divorced: -0.9,
  cheated: -0.9,
  cheating: -0.9,
  rejected: -0.8,
  rejection: -0.8,
  unloved: -0.9,
  sad: -0.8,
  sadness: -0.8,
  cry: -0.75,
  crying: -0.85,
  cried: -0.85,
  tears: -0.7,
  depressed: -0.95,
  depression: -0.95,
  lonely: -0.85,
  loneliness: -0.85,
  alone: -0.5,
  grief: -0.95,
  grieving: -0.95,
  mourning: -0.95,
  loss: -0.7,
  hurting: -0.8,
  hurt: -0.75,
  hurts: -0.75,
  pain: -0.7,
  painful: -0.75,
  devastated: -0.95,
  devastating: -0.95,
  miserable: -0.9,
  hopeless: -0.95,
  empty: -0.65,
  numb: -0.6,
  exhausted: -0.6,
  overwhelmed: -0.75,
  upset: -0.8,
  unhappy: -0.8,
  distressed: -0.85,
  disheartened: -0.75,
  sorrow: -0.8,
  sorrowful: -0.8,
  gloomy: -0.7,
  crushed: -0.85,
  bummed: -0.65,
  troubled: -0.65,
  stressed: -0.7,
  stress: -0.65,
  anxious: -0.7,
  anxiety: -0.7,
  panic: -0.85,
  scared: -0.7,
  afraid: -0.65
};

const NEGATION_WORDS = new Set(['not', 'never', 'no', 'hardly', 'barely', 'scarcely', 'without', 'cannot', "can't", "won't", "don't", "didn't"]);
const INTENSIFIER_WORDS: Record<string, number> = {
  very: 1.3,
  extremely: 1.5,
  super: 1.4,
  really: 1.3,
  totally: 1.3,
  completely: 1.4,
  absolutely: 1.5,
  incredibly: 1.4,
  highly: 1.3
};

const ESCALATION_TRIGGERS = [
  'human agent', 'talk to person', 'real person', 'manager', 'supervisor',
  'lawyer', 'lawsuit', 'chargeback', 'unacceptable', 'cancel my subscription',
  'worst service', 'scam', 'fraud', 'stolen', 'urgent broken', 'emergency',
  'speak with support', 'call me'
];

/**
 * 1. Core Sentiment Detection
 * Tokenizes text, handles negation flips, intensifiers, and emotion distributions
 */
export function detectSentiment(text: string): SentimentResult {
  const clean = text.toLowerCase();
  const words = clean.replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);

  let rawPolarity = 0;
  let wordMatches = 0;
  const keyPhrases: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let multiplier = 1.0;

    // Check preceding word for negation (e.g. "not good" -> negative)
    if (i > 0 && NEGATION_WORDS.has(words[i - 1])) {
      multiplier = -0.8;
    } else if (i > 1 && NEGATION_WORDS.has(words[i - 2])) {
      multiplier = -0.7;
    }

    // Check preceding word for intensifier (e.g. "extremely good")
    if (i > 0 && INTENSIFIER_WORDS[words[i - 1]]) {
      multiplier *= INTENSIFIER_WORDS[words[i - 1]];
    }

    if (POSITIVE_LEXICON[word] !== undefined) {
      const score = POSITIVE_LEXICON[word] * multiplier;
      rawPolarity += score;
      wordMatches++;
      keyPhrases.push(multiplier < 0 ? `not ${word}` : word);
    } else if (NEGATIVE_LEXICON[word] !== undefined) {
      const score = NEGATIVE_LEXICON[word] * multiplier;
      rawPolarity += score;
      wordMatches++;
      keyPhrases.push(multiplier < 0 ? `not ${word}` : word);
    }
  }

  // Punctuation & capitalization boosters
  if (text.includes('!') && rawPolarity !== 0) {
    rawPolarity *= 1.15;
  }
  if (text.includes('???') || text.includes('!?!')) {
    rawPolarity -= 0.2; // heightened confusion/frustration
  }

  // Determine sentiment label & confidence score
  let label: SentimentLabel = 'Neutral';
  let confidence = 0.70;

  // Check for personal emotional crises (Breakup, Grief, Sadness, Loneliness)
  const crisis = detectEmotionalCrisis(text);
  if (crisis.isPersonalCrisis) {
    label = 'Negative';
    confidence = 0.96;
    rawPolarity = -0.85;
    keyPhrases.push(crisis.detectedEmotion);
  }

  // Normalize polarity to [-1.0, 1.0]
  const normalizedPolarity = wordMatches > 0 || crisis.isPersonalCrisis
    ? Math.max(-1.0, Math.min(1.0, rawPolarity / Math.max(1, Math.sqrt(Math.max(1, wordMatches)))))
    : 0.0;

  if (crisis.isPersonalCrisis) {
    label = 'Negative';
    confidence = 0.96;
  } else if (normalizedPolarity >= 0.15) {
    label = 'Positive';
    confidence = Math.min(0.98, 0.65 + Math.abs(normalizedPolarity) * 0.33);
  } else if (normalizedPolarity <= -0.15) {
    label = 'Negative';
    confidence = Math.min(0.98, 0.65 + Math.abs(normalizedPolarity) * 0.33);
  } else {
    label = 'Neutral';
    confidence = Math.max(0.72, 0.90 - Math.abs(normalizedPolarity) * 1.5);
  }

  // Calculate fine-grained Emotion Distribution
  const joy = label === 'Positive' ? Math.round(confidence * 85) : Math.max(5, Math.round((normalizedPolarity + 1) * 15));
  const frustration = crisis.isPersonalCrisis ? 30 : (label === 'Negative' ? Math.round(confidence * 90) : Math.max(5, Math.round((1 - normalizedPolarity) * 15)));
  const satisfaction = label === 'Positive' ? Math.round(confidence * 80) : (label === 'Neutral' ? 50 : 15);
  const urgency = (clean.includes('urgent') || clean.includes('asap') || clean.includes('immediately') || frustration > 70) ? 85 : 20;
  const neutrality = label === 'Neutral' ? 85 : Math.max(10, 100 - (joy + frustration) / 2);

  return {
    label,
    polarityScore: Number(normalizedPolarity.toFixed(3)),
    confidenceScore: Number(confidence.toFixed(3)),
    confidencePercentage: Math.round(confidence * 100),
    emotionDistribution: {
      joy: Math.min(100, joy),
      frustration: Math.min(100, frustration),
      neutrality: Math.min(100, Math.round(neutrality)),
      urgency: Math.min(100, urgency),
      satisfaction: Math.min(100, satisfaction)
    },
    keyPhrases: Array.from(new Set(keyPhrases))
  };
}

export type EmotionalCrisisType = 'breakup' | 'grief_loss' | 'severe_sadness' | 'loneliness' | 'emotional_distress';

export interface EmotionalCrisisResult {
  isPersonalCrisis: boolean;
  crisisType: EmotionalCrisisType | null;
  detectedEmotion: string;
  isFollowUpAdvice?: boolean;
}

export interface EmotionalCrisisContext {
  messages?: Array<{ role: string; content: string }>;
  activeCrisis?: {
    crisisType: EmotionalCrisisType;
    detectedEmotion: string;
    initialMessage?: string;
  } | null;
}

// Regex to detect follow-up questions asking for advice, coping steps, or next actions during a crisis
export const CRISIS_ADVICE_FOLLOW_UP_REGEX = /(?:\b(?:what\s+(?:should|can|do|must)\s+i\s+do|what\s+to\s+do|what\s+do\s+i\s+do|what\s+now|what\s+next|now\s+what|how\s+(?:do|can|should)\s+i\s+(?:move\s+on|cope|handle|deal|survive|heal|get\s+through|feel\s+better|recover)|how\s+to\s+(?:move\s+on|cope|handle|deal|survive|heal|get\s+through|feel\s+better|recover)|why\s+did\s+this\s+happen|why\s+does\s+it\s+hurt|does\s+it\s+get\s+better|will\s+i\s+be\s+ok(?:ay)?|i\s+don't\s+know\s+what\s+to\s+do|i\s+feel\s+so\s+lost|should\s+i\s+(?:call|text|message|contact)|can\s+we\s+fix\s+this|i\s+miss\s+(?:him|her|them)|tell\s+me\s+what\s+to\s+do|give\s+me\s+advice|help\s+me|where\s+do\s+i\s+start)\b|अब\s*(?:मुझे\s*)?क्या\s*कर(?:ना|ूँ)|क्या\s*करना\s*चाहिए|कैसे\s*(?:संभालूँ|आगे\s*बढूँ|दर्द\s*कम\s*हो)|ಈಗ\s*ಏನು\s*ಮಾಡ(?:ಬೇಕು|ಲಿ)|ಹೇಗೆ\s*(?:ಮುಂದುವರಿಯುವುದು|ಸಮಾಧಾನ|ತಡೆದುಕೊಳ್ಳುವುದು)|\b(?:que\s+(?:dois[- ]je|faire)|comment\s+(?:faire|avancer|surmonter|guérir))\b)/i;

export function detectEmotionalCrisis(
  text: string,
  context?: EmotionalCrisisContext
): EmotionalCrisisResult {
  const clean = text.toLowerCase();

  // 1. Direct Breakup / Heartbreak / Relationship End detection
  const breakupRegex = /(?:\b(?:breakup|break\s+up|broke\s+up|broken\s+up|heartbreak|heartbroken|dumped|divorce|divorcing|cheated\s+on|left\s+me|relationship\s+ended|lost\s+my\s+(?:girlfriend|boyfriend|partner|fianc[eé]|wife|husband))\b|ब्रेकअप|संबंध\s*विच्छेद|दिल\s*टूट|छोड़\s*दिया|ಬ್ರೇಕ್‌ಅಪ್|ಸಂಬಂಧ\s*ಮುರಿದು|ಹೃದಯ\s*ಒಡೆದು|ಬಿಟ್ಟು\s*ಹೋದ|\b(?:rupture|rompu|quitté|séparation|chagrin\s+d'amour|cœur\s+brisé)\b)/i;
  
  const isAdviceFollowUp = CRISIS_ADVICE_FOLLOW_UP_REGEX.test(text);

  if (breakupRegex.test(text)) {
    return {
      isPersonalCrisis: true,
      crisisType: 'breakup',
      detectedEmotion: 'heartbreak',
      isFollowUpAdvice: isAdviceFollowUp
    };
  }

  // 2. Direct Grief / Death of loved one or pet
  const griefRegex = /(?:\b(?:passed\s+away|died|funeral|loss\s+of\s+(?:my\s+)?(?:mom|dad|mother|father|brother|sister|grandma|grandpa|pet|dog|cat)|grieving|mourning)\b|निधन|गुजर\s*गए|मृत्यु|ತೀರಿಕೊಂಡ|ಸತ್ತ|\b(?:décédé|mort|deuil|perdu\s+mon|perdu\s+ma)\b)/i;
  if (griefRegex.test(text)) {
    return {
      isPersonalCrisis: true,
      crisisType: 'grief_loss',
      detectedEmotion: 'grief',
      isFollowUpAdvice: isAdviceFollowUp
    };
  }

  // 3. Direct Sadness / Feeling Upset / Down / Crying / Depression / Distress / Anxiety about future
  const sadnessRegex = /(?:\b(?:upset|feeling\s+upset|feel\s+upset|so\s+upset|really\s+upset|feeling\s+down|feel\s+down|feeling\s+low|feel\s+low|feeling\s+sad|feel\s+sad|so\s+sad|feeling\s+terrible|feeling\s+awful|feeling\s+bad|having\s+a\s+bad\s+day|bad\s+day|having\s+a\s+rough\s+day|rough\s+day|hard\s+day|having\s+a\s+hard\s+time|feel\s+like\s+crying|can't\s+stop\s+crying|crying(?:\s+(?:so\s+much|all\s+day|right\s+now|today))?|depressed|so\s+depressed|depression|devastated|so\s+miserable|hopeless|hurting\s+so\s+(?:bad|much)|feel\s+so\s+empty|not\s+feeling\s+good|emotionally\s+(?:drained|exhausted)|overwhelmed|uncertainty|anxious\s+(?:about|for)|worried\s+(?:about|for))\b|उदास|परेशान|दुखी|अच्छा\s*नहीं\s*लग\s*रहा|मन\s*खराब|रोना\s*आ\s*रहा|रो\s*रहा|रो\s*रही|तनाव|ಬೇಸರ|ದುಃಖ|ಮನಸ್ಸಿಗೆ\s*ಬೇಸರ|ಸಂಕಟ|ಮನಸ್ಸು\s*ಸರಿಯಿಲ್ಲ|ತುಂಬಾ\s*ದುಃಖ|ಅಳು\s*ಬರುತ್ತಿದೆ|\b(?:triste|pleure|effondré|dévasté|dépression|bouleversé|mauvaise\s+journée|pas\s+bien|le\s+cafard|anxieux|inquiet)\b)/i;
  if (sadnessRegex.test(text)) {
    const isUpsetSpecific = /\b(?:upset|feeling\s+upset|feel\s+upset|so\s+upset|really\s+upset|having\s+a\s+bad\s+day|bad\s+day|having\s+a\s+rough\s+day|rough\s+day|having\s+a\s+hard\s+time|feeling\s+down|feel\s+down|feeling\s+low|feel\s+low|uncertainty|anxious|worried|overwhelmed)\b/i.test(text);
    return {
      isPersonalCrisis: true,
      crisisType: isUpsetSpecific ? 'emotional_distress' : 'severe_sadness',
      detectedEmotion: isUpsetSpecific ? 'upset' : 'sadness',
      isFollowUpAdvice: isAdviceFollowUp
    };
  }

  // 4. Direct Loneliness
  const lonelinessRegex = /(?:\b(?:feel\s+(?:so\s+)?(?:lonely|alone)|nobody\s+cares|have\s+no\s+(?:one|friends))\b|अकेलापन|अकेला\s*महसूस|ಒಂಟಿತನ|ಯಾರೂ\s*ಇಲ್ಲ|\b(?:tellement\s+seul|solitude)\b)/i;
  if (lonelinessRegex.test(text)) {
    return {
      isPersonalCrisis: true,
      crisisType: 'loneliness',
      detectedEmotion: 'loneliness',
      isFollowUpAdvice: isAdviceFollowUp
    };
  }

  // 5. Multi-turn Context Evaluation:
  // If the user does not mention the crisis keyword in the current message (e.g., "what should i do now"),
  // check if an active crisis was established in the ongoing session or in recent messages!
  let historicalCrisis: { crisisType: EmotionalCrisisType; detectedEmotion: string } | null = null;

  if (context?.activeCrisis && context.activeCrisis.crisisType) {
    historicalCrisis = {
      crisisType: context.activeCrisis.crisisType,
      detectedEmotion: context.activeCrisis.detectedEmotion || 'emotional_distress'
    };
  } else if (context?.messages && Array.isArray(context.messages) && context.messages.length > 0) {
    // Inspect recent user and assistant messages for prior crisis
    for (let i = context.messages.length - 1; i >= 0; i--) {
      const msg = context.messages[i];
      if (msg.role === 'user') {
        const priorCheck = detectEmotionalCrisis(msg.content);
        if (priorCheck.isPersonalCrisis && priorCheck.crisisType) {
          historicalCrisis = {
            crisisType: priorCheck.crisisType,
            detectedEmotion: priorCheck.detectedEmotion
          };
          break;
        }
      }
    }
  }

  if (historicalCrisis) {
    // Check if current text is an explicit domain switch (e.g., flight booking, arxiv lookup)
    const isExplicitDomainSwitch = /(?:\b(?:flight|ticket|booking|airline|arxiv|paper|code|function|database|sql)\b|विमान|टिकट|ಬುಕಿಂಗ್|vol|billet)/i.test(text);
    
    if (!isExplicitDomainSwitch) {
      // Evaluate current message sentiment independently to avoid forcing crisis templates on positive/neutral acknowledgments like "fine."
      const independentSentiment = detectSentiment(text);
      const isAcknowledgment = /^(?:fine|ok|okay|alright|good|better|thanks|thank you)\.?$/i.test(text.trim());
      const isUnclearNeutral = independentSentiment.label === 'Neutral' && text.split(/\s+/).length <= 4 && !isAcknowledgment;
      const isNegativeContext = independentSentiment.label === 'Negative';

      if (isAdviceFollowUp || isNegativeContext || isUnclearNeutral) {
        return {
          isPersonalCrisis: true,
          crisisType: historicalCrisis.crisisType,
          detectedEmotion: historicalCrisis.detectedEmotion,
          isFollowUpAdvice: true
        };
      }
    }
  }

  return {
    isPersonalCrisis: false,
    crisisType: null,
    detectedEmotion: 'neutral',
    isFollowUpAdvice: false
  };
}

export function generateEmpatheticResponse(
  crisis: EmotionalCrisisResult,
  language: string = 'en',
  isFollowUpAdvice: boolean = false
): string {
  const lang = (language || 'en').toLowerCase().slice(0, 2);
  const wantsAdvice = isFollowUpAdvice || crisis.isFollowUpAdvice;

  if (crisis.crisisType === 'breakup') {
    if (wantsAdvice) {
      if (lang === 'hi') {
        return `इस समय आपका एकमात्र काम आज का दिन शांति और धैर्य से निकालना है। ब्रेकअप के पहले दिन मन और शरीर दोनों गहरे सदमे में होते हैं। यहाँ कुछ बेहद संवेदनशील और व्यावहारिक कदम दिए गए हैं जिन्हें आप अभी, इस क्षण से अपना सकते हैं:\n\n1. 🛑 **आज कोई संपर्क न करें (The No-Contact Rule):**\n   अभी उन्हें कोई संदेश (text) न भेजें, कॉल न करें और न ही उनका सोशल मीडिया देखें। इस समय भावनाएं बहुत उफान पर होती हैं, और संपर्क करने से दर्द और भ्रम और बढ़ सकता है। खुद को 24 घंटे का विराम दें।\n\n2. 💧 **शारीरिक प्राथमिक उपचार (Ground Your Body):**\n   - अभी एक गिलास ठंडा पानी पिएं।\n   - अपने चेहरे को ठंडे पानी से धोएं या गर्म पानी से स्नान करें ताकि मांसपेशियों का तनाव कम हो।\n   - सबसे आरामदायक कपड़े पहनें और यदि भूख न भी लगे, तो भी कुछ हल्का (जैसे फल या बिस्किट) खाएं।\n\n3. 🫂 **किसी एक भरोसेमंद साथी या परिवारजन से बात करें:**\n   आज अकेले बंद कमरे में न रहें। अपने किसी करीबी दोस्त या परिवार के सदस्य को बताएं: *"आज मेरा ब्रेकअप हुआ है और मैं बहुत अकेला/उदास महसूस कर रहा हूँ, क्या तुम मुझसे बात कर सकते हो?"*\n\n4. 🤍 **आँसुओं को मत रोकें:**\n   यदि रोने का मन करे, तो खुलकर रो लें। भावनाओं को दबाने से दर्द और बढ़ता है। रोने से शरीर का तनाव कम होता है।\n\n5. ⏸️ **आज कोई बड़ा फैसला न लें:**\n   गुस्से या दुःख में आकर कोई स्थायी निर्णय न लें, न ही पुरानी यादों या सामान को तुरंत फेंकने का फैसला करें।\n\n6. ⏳ **बस 15-15 मिनट करके आगे बढ़ें:**\n   आने वाले महीनों या सालों की चिंता न करें। बस खुद से कहें: *"क्या मैं अगले 15 मिनट शांति से निकाल सकता हूँ?"* हाँ, आप निकाल सकते हैं।\n\nएक गहरी साँस लें। क्या आप मुझसे साझा करना चाहते हैं कि क्या हुआ, या आप मन को शांत करने के लिए कोई उपाय चाहते हैं? मैं यहीं आपके साथ हूँ।`;
      }
      if (lang === 'kn') {
        return `ಈ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ಏಕೈಕ ಮುಖ್ಯ ಕರ್ತವ್ಯವೆಂದರೆ ಇಂದಿನ ದಿನವನ್ನು ಸಮಾಧಾನದಿಂದ ಕಳೆಯುವುದು. ಬ್ರೇಕ್‌ಅಪ್ ಆದ ಮೊದಲ ದಿನ ಮನಸ್ಸು ಮತ್ತು ದೇಹ ಎರಡೂ ಆಘಾತದಲ್ಲಿರುತ್ತವೆ. ಈ ಕ್ಷಣದಲ್ಲಿ ನೀವು ಮಾಡಬೇಕಾದ ಅತ್ಯಂತ ಸೂಕ್ಷ್ಮ ಮತ್ತು ಉಪಯುಕ್ತ ಸಲಹೆಗಳು ಇಲ್ಲಿವೆ:\n\n1. 🛑 **ಇಂದು ಯಾವುದೇ ಸಂಪರ್ಕ ಬೇಡ (No-Contact Rule):**\n   ದಯವಿಟ್ಟು ಅವರಿಗೆ ಕರೆ ಮಾಡಬೇಡಿ, ಮೆಸೇಜ್ ಮಾಡಬೇಡಿ ಅಥವಾ ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮಗಳನ್ನು ನೋಡಬೇಡಿ. ಈ ಸಮಯದಲ್ಲಿ ಭಾವನೆಗಳು ತೀವ್ರವಾಗಿದ್ದು, ಸಂಪರ್ಕಿಸಲು ಪ್ರಯತ್ನಿಸಿದರೆ ನೋವು ಮತ್ತಷ್ಟು ಹೆಚ್ಚಾಗಬಹುದು. ಯಾವುದೇ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳುವ ಮುನ್ನ 24 ಗಂಟೆಗಳ ಕಾಲಾವಕಾಶ ನೀಡಿ.\n\n2. 💧 **ಮೊದಲು ನಿಮ್ಮ ದೇಹದ ಕಾಳಜಿ ವಹಿಸಿ (Self-Care):**\n   - ಈಗಲೇ ಒಂದು ಲೋಟ ತಣ್ಣೀರು ಕುಡಿಯಿರಿ.\n   - ಮುಖ ತೊಳೆದುಕೊಳ್ಳಿ ಅಥವಾ ಬೆಚ್ಚಗಿನ ನೀರಿನಲ್ಲಿ ಸ್ನಾನ ಮಾಡಿ ಮನಸ್ಸನ್ನು ತಿಳಿಗೊಳಿಸಿ.\n   - ಆರಾಮದಾಯಕ ಬಟ್ಟೆಗಳನ್ನು ಧರಿಸಿ ಮತ್ತು ಹಸಿವಿಲ್ಲದಿದ್ದರೂ ಸ್ವಲ್ಪ ಹಣ್ಣು ಅಥವಾ ಲಘು ಆಹಾರ ಸೇವಿಸಿ.\n\n3. 🫂 **ಒಬ್ಬ ಆಪ್ತ ಸ್ನೇಹಿತ ಅಥವಾ ಕುಟುಂಬದವರೊಂದಿಗೆ ಮಾತನಾಡಿ:**\n   ಇಂದು ಸಂಪೂರ್ಣವಾಗಿ ಒಬ್ಬರೇ ಕುಳಿತುಕೊಳ್ಳಬೇಡಿ. ನಿಮಗೆ ಅತ್ಯಂತ ಹತ್ತಿರವಾದ ಒಬ್ಬ ಸ್ನೇಹಿತರಿಗೆ ಕರೆ ಮಾಡಿ ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ.\n\n4. 🤍 **ಭಾವನೆಗಳನ್ನು ಹತ್ತಿಕ್ಕಬೇಡಿ:**\n   ಅಳು ಬಂದರೆ ಮನಸ್ಸಾರೆ ಅತ್ತುಬಿಡಿ. ದುಃಖವನ್ನು ಹೊರಹಾಕುವುದು ಮನಸ್ಸಿನ ಆಘಾತವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.\n\n5. ⏸️ **ಇಂದು ಯಾವುದೇ ದೊಡ್ಡ ನಿರ್ಧಾರಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ:**\n   ಆತುರದಲ್ಲಿ ಅಥವಾ ದುಃಖದಲ್ಲಿ ಯಾವುದೇ ಕಠಿಣ ನಿರ್ಧಾರಗಳನ್ನು ಕೈಗೊಳ್ಳಬೇಡಿ.\n\n6. ⏳ **ಕ್ಷಣ ಕ್ಷಣವನ್ನೂ ನಿಧಾನವಾಗಿ ಸಾಗಿಸಿ:**\n   ಮುಂದಿನ ತಿಂಗಳುಗಳು ಅಥವಾ ವರ್ಷಗಳ ಬಗ್ಗೆ ಚಿಂತಿಸಬೇಡಿ. ಮುಂದಿನ 15 ನಿಮಿಷಗಳನ್ನು ಶಾಂತವಾಗಿ ಕಳೆಯುವುದರ ಮೇಲೆ ಗಮನವಿಡಿ.\n\nದೀರ್ಘವಾಗಿ ಉಸಿರಾಡಿ. ಮನಸ್ಸು ಹಗುರವಾಗಲು ನೀವು ಏನಾದರೂ ಹೇಳಲು ಬಯಸಿದರೆ, ನಾನು ನಿಮ್ಮ ಮಾತನ್ನು ಕೇಳಲು ಸದಾ ಇಲ್ಲಿದ್ದೇನೆ.`;
      }
      if (lang === 'fr') {
        return `En ce premier jour de rupture, votre seule priorité est de traverser cette journée avec une immense bienveillance envers vous-même. Le choc émotionnel est brutal. Voici des repères doux et concrets à appliquer dès maintenant, heure par heure :\n\n1. 🛑 **La règle du zéro contact aujourd'hui (Protégez votre cœur) :**\n   N'envoyez pas de message, n'appelez pas et ne consultez pas ses réseaux sociaux. Sous le coup de l'émotion vive, chercher le contact amplifie le désarroi et la douleur. Accordez-vous au moins 24 heures de recul protecteur.\n\n2. 💧 **Premiers soins physiques pour votre corps :**\n   - Buvez un grand verre d'eau fraîche immédiatement.\n   - Lavez votre visage à l'eau tiède ou prenez une douche relaxante pour dénouer les tensions musculaires.\n   - Mettez vos vêtements les plus confortables et avalez une petite collation légère même si vous n'avez pas faim.\n\n3. 🫂 **Prévenez UNE personne de confiance :**\n   Ne restez pas seul(e) isolé(e) avec votre souffrance. Écrivez ou appelez un(e) ami(e) proche ou un proche : *« Je viens de vivre une rupture aujourd'hui et je me sens dépassé(e), peux-tu juste rester avec moi ou au téléphone ? »*\n\n4. 🤍 **Laissez couler les larmes :**\n   Ne retenez rien. Pleurer est une réponse biologique saine et nécessaire pour évacuer la douleur du choc.\n\n5. ⏸️ **Ne prenez aucune décision importante aujourd'hui :**\n   Ne jetez rien, n'effacez rien dans la panique et ne tirez pas de conclusions définitives sur votre avenir sous le coup du choc.\n\n6. ⏳ **Avancez quart d'heure par quart d'heure :**\n   Ne pensez pas aux prochaines semaines. Concentrez-vous uniquement sur les prochaines 15 minutes.\n\nPrenez une lente et profonde inspiration. Je suis là avec vous. Souhaitez-vous me raconter ce qui s'est passé ou préférez-vous que nous fassions un exercice de respiration apaisant ?`;
      }
      // English Default Follow-up Advice
      return `Right now, your only job is to get through today. Experiencing a breakup on day one is a massive shock to your emotional and nervous system. Here is gentle, step-by-step guidance on what to do right now, hour by hour:\n\n1. 🛑 **The 'No-Contact' Rule for Today (Protect Your Heart):**\n   Do not text, call, or check their social media right now. When emotions are in acute shock, reaching out almost always leads to more confusion, unanswered messages, and deeper agony. Give yourself a protective 24-hour pause before saying or doing anything you cannot undo.\n\n2. 💧 **Ground Your Physical Body First:**\n   - Drink a tall glass of cool water right now.\n   - Wash your face with warm water or take a warm shower to physically ease muscle tension.\n   - Change into the softest, most comfortable clothes you have.\n   - Eat something light (a piece of fruit, toast, or crackers) even if you don't feel an appetite.\n\n3. 🫂 **Reach Out to ONE Safe Person:**\n   Do not sit in complete isolation today. Call or message one trusted friend or family member. You don't have to explain the whole story—you can simply say: *"I went through a breakup today and I feel overwhelmed. Could you talk with me for a bit or just sit with me?"*\n\n4. 🤍 **Let the Tears and Pain Flow Freely:**\n   If you feel like crying, curling up, or grieving, allow it to happen. Fighting the emotion makes it hurt twice as much. Crying naturally releases soothing hormones (oxytocin and endorphins) that help your heart regulate.\n\n5. ⏸️ **Put Major Decisions on Pause:**\n   Do not throw away keepsakes, delete photo albums in a frenzy, or try to figure out what your life will look like six months from now. Everything can wait.\n\n6. ⏳ **Take It in 15-Minute Increments:**\n   Don't worry about next week or next month. Just focus on: *Can I get through the next 15 minutes?* Yes, you can.\n\nTake a slow, steady breath right now. Would you like to tell me more about what happened so you can get it off your chest, or would you prefer a gentle calming exercise? I am right here with you.`;
    }

    if (lang === 'hi') {
      return `मुझे यह सुनकर अत्यंत दुःख हुआ। ब्रेकअप का दर्द झेलना किसी के लिए भी बहुत कठिन और कष्टदायी होता है, और आज ही ऐसा होना बहुत भारी और संवेदनशील समय है।\n\nकृपया ध्यान रखें कि इस समय आप जो भी महसूस कर रहे हैं—चाहे वह गहरा दुःख हो, दिल टूटना, गुस्सा, खालीपन या भ्रम—यह सब पूरी तरह स्वाभाविक है। आपको आज ही सब कुछ ठीक करने या मजबूत दिखने का कोई दबाव लेने की आवश्यकता नहीं है।\n\nइस समय बस अपना ख्याल रखें:\n- 🤍 **गहरी साँस लें:** अपने मन और शरीर को थोड़ा शांत होने का समय दें।\n- 🤍 **खुद पर दबाव न डालें:** आने वाले कल की चिंता न करें, बस एक-एक पल करके आगे बढ़ें।\n- 🤍 **अपनी भावनाओं को व्यक्त करें:** यदि रोने का मन हो, तो रो लें। आँसू आपके दर्द को बाहर निकालने में मदद करते हैं।\n- 🤍 **पानी पिएं और आराम करें:** अपने स्वास्थ्य की बुनियादी जरूरतों का ध्यान रखें।\n\nमैं आपकी बात सुनने के लिए हमेशा यहाँ हूँ। यदि आप अपने दिल की बात साझा करना चाहते हैं, कुछ कहना चाहते हैं, या बस शांति चाहते हैं, तो बेझिझक कहें। आप अकेले नहीं हैं।`;
    }
    if (lang === 'kn') {
      return `ಇದನ್ನು ಕೇಳಿ ನನಗೆ ತುಂಬಾ ಬೇಸರವಾಯಿತು. ಬ್ರೇಕ್‌ಅಪ್‌ನ ನೋವು ಅನುಭವಿಸುವುದು ಜೀವನದ ಅತ್ಯಂತ ಕಷ್ಟಕರವಾದ ಕ್ಷಣಗಳಲ್ಲಿ ಒಂದಾಗಿದೆ, ಮತ್ತು ಇವತ್ತೇ ಇದು ನಡೆದಿದೆ ಎಂದರೆ ಮನಸ್ಸು ತುಂಬಾ ಘಾಸಿಗೊಂಡಿರುತ್ತದೆ.\n\nದಯವಿಟ್ಟು ನೆನಪಿಡಿ, ಈ ಸಮಯದಲ್ಲಿ ನೀವು ಅನುಭವಿಸುತ್ತಿರುವ ನೋವು, ದುಃಖ, ಅಸಹಾಯಕತೆ ಅಥವಾ ಗೊಂದಲ ಎಲ್ಲವೂ ಸಹಜ. ನೀವು ಎಲ್ಲವನ್ನೂ ಇಂದೇ ಸರಿಪಡಿಸಿಕೊಳ್ಳಬೇಕು ಅಥವಾ ಧೈರ್ಯವಾಗಿರಲೇಬೇಕು ಎಂಬ ಒತ್ತಡಕ್ಕೆ ಒಳಗಾಗಬೇಡಿ.\n\nಈ ಕ್ಷಣದಲ್ಲಿ ನಿಮ್ಮ ಆರೈಕೆಗೆ ಮೊದಲ ಆದ್ಯತೆ ನೀಡಿ:\n- 🤍 **ದೀರ್ಘವಾಗಿ ಉಸಿರಾಡಿ:** ನಿಮ್ಮ ಮನಸ್ಸಿಗೆ ಸ್ವಲ್ಪ ವಿಶ್ರಾಂತಿ ನೀಡಿ.\n- 🤍 **ಸ್ವಯಂ ಕಾಳಜಿ ವಹಿಸಿ:** ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ, ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ.\n- 🤍 **ಅಳು ಬಂದರೆ ತಡೆಯಬೇಡಿ:** ದುಃಖವನ್ನು ಹೊರಹಾಕುವುದು ಮನಸ್ಸಿನ ಭಾರವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.\n- 🤍 **ಆಪ್ತರ ಜೊತೆ ಮಾತನಾಡಿ:** ನಿಮ್ಮನ್ನು ಪ್ರೀತಿಸುವ, ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವ ಸ್ನೇಹಿತರು ಅಥವಾ ಕುಟುಂಬದವರೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಿ.\n\nನಾನು ನಿಮ್ಮ ಮಾತನ್ನು ಕೇಳಲು ಇಲ್ಲೇ ಇದ್ದೇನೆ. ನೀವು ಏನನ್ನಾದರೂ ಹಂಚಿಕೊಳ್ಳಲು ಬಯಸಿದರೆ ಅಥವಾ ಮನಸ್ಸಿನ ಭಾರ ಇಳಿಸಿಕೊಳ್ಳಲು ಬಯಸಿದರೆ, ನಾನು ನಿಮ್ಮ ಜೊತೆಗಿದ್ದೇನೆ.`;
    }
    if (lang === 'fr') {
      return `Je suis sincèrement désolé(e) d'apprendre cette nouvelle. Traverser une rupture est une épreuve particulièrement douloureuse et déstabilisante, et quand cela arrive aujourd'hui, le choc et la blessure sont encore vifs et bruts.\n\nSachez que tout ce que vous ressentez en ce moment — chagrin, tristesse, colère, incompréhension ou sensation de vide — est absolument légitime. Vous n'avez pas besoin de faire semblant d'aller bien ou de tout régler aujourd'hui.\n\nPrenez soin de vous avec beaucoup de douceur dès maintenant :\n- 🤍 **Prenez de grandes respirations :** Accordez à votre corps et à votre esprit un instant de répit.\n- 🤍 **Ne vous mettez aucune pression :** Vivez les choses une heure à la fois, sans chercher à anticiper l'avenir immédiat.\n- 🤍 **Pleurez si vous en ressentez le besoin :** Les larmes sont une étape saine pour évacuer la douleur.\n- 🤍 **Restez au chaud et hydratez-vous :** Buvez un verre d'eau et reposez-vous.\n- 🤍 **Ne restez pas seul(e) si possible :** N'hésitez pas à envoyer un message ou à appeler un proche en qui vous avez confiance.\n\nJe suis là pour vous écouter si vous avez besoin d'évacuer ce que vous avez sur le cœur ou de trouver un peu de réconfort.`;
    }
    // Default English Initial Breakup response
    return `I am so, so sorry you're going through this. Experiencing a breakup is one of the most painful, disorienting things a person can face, and having it happen today means everything is completely raw, fresh, and overwhelming.\n\nPlease remember that whatever emotions you're experiencing right now—deep sadness, shock, anger, numbness, or disbelief—are completely valid. You do not need to put on a brave face or pretend that you are okay today.\n\nRight now, please just be very gentle with yourself:\n- 🤍 **Breathe:** Take a few slow, steady breaths to give your nervous system a moment to settle.\n- 🤍 **Don't pressure yourself:** You don't have to figure out your future or understand everything today. Just take it one hour at a time.\n- 🤍 **Allow yourself to feel:** If you feel like crying, let it out. Tears are a natural, healthy way for your heart to release pain.\n- 🤍 **Take care of the basics:** Drink a glass of water, rest your body, and don't skip eating.\n- 🤍 **Lean on someone:** If you have a close friend or family member you trust, consider reaching out to them so you don't carry this alone.\n\nI'm right here with you. Whether you want to vent about what happened, talk through your feelings, or just need a gentle, comforting presence, I am here to listen without any judgment. How are you holding up right now?`;
  }

  if (crisis.crisisType === 'grief_loss') {
    if (wantsAdvice) {
      if (lang === 'hi') {
        return `शोक के इस शुरुआती दौर में खुद पर कोई दबाव न डालें। गहरी साँस लें, अपने प्रियजनों के करीब रहें और बुनियादी जरूरतों (पानी, भोजन और आराम) का ध्यान रखें। मैं यहाँ आपके साथ हूँ।`;
      }
      return `In this acute moment of grief and loss, please don't pressure yourself to be strong or do anything more than breathe. Keep loved ones close, drink water, and allow yourself to mourn without judgment. I am here with you.`;
    }
    if (lang === 'hi') {
      return `मुझे आपके नुकसान के बारे में जानकर गहरा दुःख हुआ। किसी प्रियजन या साथी को खोने का दर्द शब्दों में बयां नहीं किया जा सकता।\n\nइस कठिन समय में खुद को समय दें। शोक मनाना और दुःख व्यक्त करना स्वाभाविक है। यदि आप अपनी भावनाएं साझा करना चाहते हैं, तो मैं यहाँ मौजूद हूँ।`;
    }
    if (lang === 'kn') {
      return `ನಿಮ್ಮ ಈ ನಷ್ಟದ ಬಗ್ಗೆ ಕೇಳಿ ನನಗೆ ತುಂಬಾ ದುಃಖವಾಯಿತು. ಪ್ರೀತಿಪಾತ್ರರನ್ನು ಕಳೆದುಕೊಳ್ಳುವ ನೋವು ವರ್ಣಿಸಲಾಗದ್ದು.\n\nಈ ಕಷ್ಟದ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ಬಗ್ಗೆ ಕಾಳಜಿ ವಹಿಸಿ. ನೀವು ನಿಮ್ಮ ಭಾವನೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಲು ಬಯಸಿದರೆ, ನಾನು ಸದಾ ನಿಮ್ಮ ಜೊತೆಗಿದ್ದೇನೆ.`;
    }
    if (lang === 'fr') {
      return `Je vous présente toutes mes condoléances et suis de tout cœur avec vous dans cette terrible épreuve. La perte d'un être cher est un déchirement profond.\n\nPrenez tout le temps nécessaire pour faire votre deuil et entourez-vous de douceur. Je reste à votre écoute avec respect et bienveillance.`;
    }
    return `I am deeply sorry for your loss. Grieving the loss of a loved one is profound and heartbreaking, and there are no easy words to heal that pain.\n\nPlease take all the time and space you need to mourn and rest. Be gentle with yourself, and know that you are not alone. I am here whenever you need a safe space to share.`;
  }

  if (crisis.crisisType === 'emotional_distress' || crisis.detectedEmotion === 'upset') {
    if (wantsAdvice) {
      if (lang === 'hi') {
        return `जब मन उदास या परेशान हो, तो सबसे पहले खुद पर से हर प्रकार का दबाव हटा लें:\n\n1. 💧 **शारीरिक राहत लें:** एक गिलास ठंडा पानी पिएं और गहरी सांस लें ताकि शरीर का तनाव कम हो सके।\n2. ⏸️ **थोड़ा विराम दें:** आपको हर बात का समाधान अभी इसी पल निकालने की जरूरत नहीं है।\n3. 🫂 **मन की बात साझा करें:** किसी भरोसेमंद व्यक्ति या मुझसे बात करके अपने मन का बोझ हल्का करें।\n4. 🤍 **खुद के प्रति दयालु रहें:** बुरा महसूस होने पर खुद को दोष न दें।\n\nक्या आप बताना चाहते हैं कि किस वजह से आप परेशान हैं, या आप मन को शांत करने के लिए कोई बातचीत चाहते हैं? मैं यहीं आपके साथ हूँ।`;
      }
      if (lang === 'kn') {
        return `ಮನಸ್ಸಿಗೆ ಬೇಸರ ಅಥವಾ ಅಸಮಾಧಾನವಾದಾಗ, ಮೊದಲಿಗೆ ನಿಮ್ಮ ಮೇಲಿನ ಒತ್ತಡವನ್ನು ಕಡಿಮೆ ಮಾಡಿಕೊಳ್ಳಿ:\n\n1. 💧 **ಶಾಂತರಾಗಿ:** ಒಂದು ಲೋಟ ನೀರು ಕುಡಿಯಿರಿ ಮತ್ತು ದೀರ್ಘವಾಗಿ ಉಸಿರಾಡಿ.\n2. ⏸️ **ಸ್ವಲ್ಪ ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳಿ:** ಎಲ್ಲಾ ಸಮಸ್ಯೆಗಳನ್ನು ಇದೇ ಕ್ಷಣದಲ್ಲಿ ಬಗೆಹರಿಸಬೇಕಾಗಿಲ್ಲ.\n3. 🫂 **ಮನಸ್ಸಿನ ಭಾರ ಇಳಿಸಿಕೊಳ್ಳಿ:** ಏನಾಯಿತು ಎಂದು ನಿಮ್ಮ ಆಪ್ತರೊಂದಿಗೆ ಅಥವಾ ನನ್ನೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಿ.\n4. 🤍 **ನಿಮ್ಮ ಬಗ್ಗೆ ಕಾಳಜಿ ಇರಲಿ:** ಬೇಸರವಾದಾಗ ನಿಮ್ಮನ್ನೇ ನೀವು ದೂಷಿಸಿಕೊಳ್ಳಬೇಡಿ.\n\nನಿಮಗೆ ಬೇಸರ ತಂದ ವಿಷಯದ ಬಗ್ಗೆ ಮಾತನಾಡಲು ಬಯಸುವಿರಾ? ನಾನು ಸದಾ ಕೇಳಲು ಇಲ್ಲಿದ್ದೇನೆ.`;
      }
      if (lang === 'fr') {
        return `Lorsque vous vous sentez contrarié(e) ou dépassé(e), le plus important est de relâcher la pression :\n\n1. 💧 **Respirez et hydratez-vous :** Buvez un verre d'eau et prenez une grande inspiration pour détendre votre corps.\n2. ⏸️ **Faites une pause :** Vous n'avez pas à tout régler immédiatement.\n3. 🫂 **Exprimez vos sentiments :** N'hésitez pas à partager ce qui vous pèse avec un proche ou ici avec moi.\n4. 🤍 **Soyez bienveillant(e) envers vous-même :** Il est parfaitement normal d'avoir des jours difficiles.\n\nSouhaitez-vous me dire ce qui vous contrarie, ou préférez-vous simplement vous changer les idées ?`;
      }
      return `When you're feeling upset or overwhelmed, the kindest thing you can do is take the pressure off yourself:\n\n1. 💧 **Ground your body:** Take a slow, deep breath and drink a glass of cool water to help ease physical tension.\n2. ⏸️ **Take a gentle pause:** You don't have to fix everything or solve whatever is bothering you right this second.\n3. 🫂 **Express it safely:** Write it down, vent to a trusted friend, or talk it through with me to lighten the emotional weight.\n4. 🤍 **Be kind to yourself:** It's completely normal to have rough days; don't judge yourself for feeling down.\n\nWould you like to talk through what made you feel upset, or would you prefer a gentle distraction? I am right here with you.`;
    }

    if (lang === 'hi') {
      return `मुझे यह सुनकर बहुत दुःख हुआ कि आज आप परेशान या उदास महसूस कर रहे हैं। कभी-कभी दिन बहुत भारी और मुश्किल हो जाते हैं, और आपका ऐसा महसूस करना पूरी तरह स्वाभाविक है।\n\nआपको यह सब अकेले सहने की जरूरत नहीं है। यदि आप साझा करना चाहते हैं कि क्या हुआ, तो मैं आपकी बात सुनने के लिए पूरी तरह मौजूद हूँ—चाहे आप अपने दिल का बोझ हल्का करना चाहते हों या बस एक शांत उपस्थिति चाहते हों। आज मैं आपकी किस प्रकार सबसे अच्छी मदद या समर्थन कर सकता हूँ?`;
    }
    if (lang === 'kn') {
      return `ಇಂದು ನಿಮಗೆ ಮನಸ್ಸಿಗೆ ಬೇಸರವಾಗಿದೆ ಎಂದು ಕೇಳಿ ನನಗೆ ನಿಜವಾಗಿಯೂ ದುಃಖವಾಯಿತು. ಕೆಲವೊಮ್ಮೆ ದಿನಗಳು ತುಂಬಾ ಭಾರವೆನಿಸುತ್ತವೆ, ಮತ್ತು ನಿಮ್ಮ ಮನಸ್ಸಿನ ಭಾವನೆಗಳು ಸಂಪೂರ್ಣವಾಗಿ ಸಹಜ.\n\nನೀವು ಎಲ್ಲವನ್ನೂ ಒಬ್ಬರೇ ಅನುಭವಿಸಬೇಕಾಗಿಲ್ಲ. ಏನಾಯಿತು ಎಂದು ನೀವು ಹಂಚಿಕೊಳ್ಳಲು ಬಯಸಿದರೆ, ನಿಮ್ಮ ಮಾತನ್ನು ಶಾಂತವಾಗಿ ಕೇಳಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಬೆಂಬಲ ನೀಡಲಿ?`;
    }
    if (lang === 'fr') {
      return `Je suis sincèrement désolé(e) d'apprendre que vous vous sentez contrarié(e) ou triste aujourd'hui. Il y a des journées particulièrement lourdes à porter, et ce que vous ressentez est tout à fait légitime.\n\nVous n'avez pas à traverser cela seul(e). Si vous souhaitez vider votre sac ou me raconter ce qui s'est passé, je suis là pour vous écouter avec bienveillance. Comment puis-je vous soutenir au mieux aujourd'hui ?`;
    }
    return `I'm really sorry to hear that you're feeling upset today. It can be really tough when a day feels heavy or difficult, and your feelings are completely valid.\n\nYou don't have to carry it all by yourself. If you'd like to talk about what happened or get things off your chest, I'm right here to listen with an open, non-judgmental ear. Or if you just need a quiet, gentle space to rest, please take all the time you need. How can I best support you right now?`;
  }

  // General sadness / loneliness / distress
  if (wantsAdvice) {
    if (lang === 'hi') {
      return `इस समय मन भारी होना स्वाभाविक है। सबसे पहले एक गिलास पानी पिएं, गहरी साँस लें और यदि संभव हो तो किसी अपने से बात करें। आपको सब कुछ अकेले सहने की जरूरत नहीं है।`;
    }
    return `When you're feeling down or overwhelmed, start with small, gentle steps: take a slow deep breath, drink a glass of water, and reach out to someone who cares about you. You don't have to carry this alone.`;
  }

  if (lang === 'hi') {
    return `मैं समझ सकता हूँ कि आप इस समय बहुत कठिन और भावुक दौर से गुजर रहे हैं। अकेलापन या उदासी महसूस होना स्वाभाविक है।\n\nकृपया याद रखें कि आप अकेले नहीं हैं। अपनी भावनाओं को व्यक्त करना कमजोरी नहीं बल्कि उपचार की शुरुआत है। मैं यहाँ आपको सुनने और समर्थन देने के लिए मौजूद हूँ।`;
  }
  if (lang === 'kn') {
    return `ನೀವು ಈ ಸಮಯದಲ್ಲಿ ತುಂಬಾ ಕಷ್ಟದ ಹಂತದಲ್ಲಿದ್ದೀರಿ ಎಂದು ನಾನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಬಲ್ಲೆ. ದುಃಖ ಅಥವಾ ಒಂಟಿತನ ಕಾಡಿದಾಗ ಅದು ತುಂಬಾ ಭಾರವಾಗಿರುತ್ತದೆ.\n\nದಯವಿಟ್ಟು ನೆನಪಿಡಿ, ನೀವು ಒಬ್ಬಂಟಿಗರಲ್ಲ. ನಿಮ್ಮ ಮನಸ್ಸಿನ ಮಾತನ್ನು ಹೇಳಲು ನಾನು ಯಾವಾಗಲೂ ಇಲ್ಲಿದ್ದೇನೆ.`;
  }
  if (lang === 'fr') {
    return `Je comprends combien ce moment est difficile et éprouvant pour vous. La tristesse ou le sentiment de solitude peuvent peser très lourdement.\n\nSachez que vous n'êtes pas seul(e). Prenez un instant pour respirer doucement et être bienveillant(e) avec vous-même. Je suis là pour vous écouter.`;
  }
  return `I can hear how much pain and heaviness you are carrying right now, and I want to validate that it is completely okay to feel sad, overwhelmed, or lonely.\n\nYou don't have to carry everything by yourself. Take a gentle breath, be kind to yourself in this moment, and know that I am right here with you if you want to talk or just need a listening ear.`;
}

/**
 * 2. Response Adaptation Logic & Escalation Rules
 */
export function determineAdaptationStrategy(
  sentiment: SentimentResult,
  text: string,
  history: SentimentResult[],
  context?: EmotionalCrisisContext
): AdaptationStrategy {
  const lowerText = text.toLowerCase();
  
  // Check for personal emotional crises FIRST (Breakup, Grief, Sadness, Loneliness) - either direct or multi-turn
  const personalCrisis = detectEmotionalCrisis(text, context);
  if (personalCrisis.isPersonalCrisis) {
    const isFollowUp = personalCrisis.isFollowUpAdvice;
    return {
      tone: 'Deeply Empathetic & Comforting',
      shouldEscalate: false,
      escalationLevel: 'None',
      escalationReason: null,
      actionRecommendation: isFollowUp
        ? 'Provide gentle, step-by-step Day-1 emotional first aid, validation, and compassionate grounding. Do NOT treat as a generic task.'
        : 'Respond with heartfelt emotional support, compassion, and active listening. Do not treat as a technical issue.',
      systemPromptModifier: `[SENTIMENT ADAPTATION: ACTIVE PERSONAL EMOTIONAL CRISIS (${personalCrisis.crisisType?.toUpperCase()}${isFollowUp ? ' - FOLLOW-UP ADVICE' : ''})]
- Tone Directive: Adopt a gentle, compassionate, and deeply comforting tone.
- The user is in the middle of a painful personal experience (${personalCrisis.crisisType}).
- The user's query: "${text}".
- Continue offering heartfelt empathy, validation, and gentle, practical Day-1 grounding steps (e.g. self-care, no-contact rule, breathing, leaning on loved ones).
- Strictly DO NOT provide software troubleshooting, customer service ticket escalation, or technical/academic citations.
- Strictly DO NOT respond with generic assistant phrases like "What specific details would you like to explore?".
- Offer comfort, reassurance, and a safe listening presence without judgment.`
    };
  }

  // Check for explicit escalation keywords
  const hasEscalationTrigger = ESCALATION_TRIGGERS.some(trigger => lowerText.includes(trigger));
  
  // Multi-turn frustration check: If past 2 turns were negative, trigger high escalation
  const recentNegatives = history.slice(-2).filter(h => h.label === 'Negative').length;
  const isEscalatingFrustration = (sentiment.label === 'Negative' && recentNegatives >= 1);

  let shouldEscalate = false;
  let escalationLevel: EscalationLevel = 'None';
  let escalationReason: string | null = null;
  let actionRecommendation = 'Deliver standard automated response.';

  if (hasEscalationTrigger) {
    shouldEscalate = true;
    escalationLevel = 'High';
    escalationReason = 'Explicit escalation trigger phrase detected in user query.';
    actionRecommendation = 'Immediately offer transfer to a human support agent and provide direct priority assistance contact.';
  } else if (isEscalatingFrustration || (sentiment.label === 'Negative' && sentiment.confidenceScore >= 0.85 && sentiment.polarityScore <= -0.5)) {
    shouldEscalate = true;
    escalationLevel = recentNegatives >= 2 ? 'High' : 'Medium';
    escalationReason = isEscalatingFrustration 
      ? 'Multi-turn negative sentiment detected (escalating user frustration).'
      : 'High-severity negative sentiment detected.';
    actionRecommendation = 'Acknowledge frustration with deep empathy, propose immediate solution/workaround, and offer live human assistance options.';
  }

  let tone: AdaptationStrategy['tone'] = 'Objective & Informative';
  let systemPromptModifier = '';

  if (sentiment.label === 'Negative') {
    tone = 'Empathetic & Solution-Focused';
    systemPromptModifier = `[SENTIMENT ADAPTATION: NEGATIVE DETECTED (Polarity: ${sentiment.polarityScore}, Frustration: ${sentiment.emotionDistribution.frustration}%)]
- Tone Directive: Adopt an empathetic, calm, and reassuring tone.
- Acknowledge the user's difficulty or frustration upfront without being defensive.
- Provide direct, actionable solutions or step-by-step troubleshooting immediately.
${shouldEscalate ? '- Note: Offer a clear escalation path to human support or support ticket creation.' : ''}`;
  } else if (sentiment.label === 'Positive') {
    tone = 'Enthusiastic & Appreciative';
    actionRecommendation = 'Reinforce user satisfaction, celebrate milestones, and encourage next-level workflow discovery.';
    systemPromptModifier = `[SENTIMENT ADAPTATION: POSITIVE DETECTED (Polarity: ${sentiment.polarityScore}, Satisfaction: ${sentiment.emotionDistribution.satisfaction}%)]
- Tone Directive: Adopt an enthusiastic, helpful, and appreciative tone.
- Reinforce satisfaction and offer complementary next steps or advanced tips.`;
  } else {
    tone = 'Objective & Informative';
    systemPromptModifier = `[SENTIMENT ADAPTATION: NEUTRAL DETECTED]
- Tone Directive: Maintain a professional, concise, and structured tone focusing on clarity and factual precision.`;
  }

  return {
    tone,
    shouldEscalate,
    escalationLevel,
    escalationReason,
    actionRecommendation,
    systemPromptModifier
  };
}

// In-memory session tracking for multi-turn emotional crisis continuity
const sessionCrisisMap = new Map<string, { crisisType: EmotionalCrisisType; detectedEmotion: string; initialMessage: string; turnsCount: number; updatedAt: number }>();

export function getActiveSessionCrisis(sessionId: string) {
  return sessionCrisisMap.get(sessionId) || null;
}

export function clearActiveSessionCrisis(sessionId: string) {
  sessionCrisisMap.delete(sessionId);
}

/**
 * 3. Conversation Context & Multi-turn Trajectory Tracking
 */
export function processConversationSentiment(
  text: string,
  sessionId?: string,
  historySentiments: SentimentResult[] = [],
  crisisContext?: EmotionalCrisisContext
): SentimentAnalysisResponse {
  const currentSentiment = detectSentiment(text);
  
  // Use session history if provided or fallback to passed history
  const activeSessionId = sessionId || 'default_session';
  const storedHistory = sessionHistories.get(activeSessionId) || historySentiments;
  
  const updatedHistory = [...storedHistory, currentSentiment];
  sessionHistories.set(activeSessionId, updatedHistory);

  // Combine passed crisisContext with persisted sessionCrisisMap
  const activeCrisis = crisisContext?.activeCrisis || sessionCrisisMap.get(activeSessionId) || null;
  const mergedCrisisContext: EmotionalCrisisContext = {
    messages: crisisContext?.messages,
    activeCrisis
  };

  const detectedCrisis = detectEmotionalCrisis(text, mergedCrisisContext);
  if (detectedCrisis.isPersonalCrisis && detectedCrisis.crisisType) {
    const existing = sessionCrisisMap.get(activeSessionId);
    sessionCrisisMap.set(activeSessionId, {
      crisisType: detectedCrisis.crisisType,
      detectedEmotion: detectedCrisis.detectedEmotion,
      initialMessage: existing?.initialMessage || text,
      turnsCount: (existing?.turnsCount || 0) + 1,
      updatedAt: Date.now()
    });
  }

  const strategy = determineAdaptationStrategy(currentSentiment, text, storedHistory, mergedCrisisContext);

  // Compute trend metrics
  let trend: SentimentTrend = 'Initial';
  let sentimentDelta = 0;

  if (storedHistory.length > 0) {
    const firstPolarity = storedHistory[0].polarityScore;
    sentimentDelta = Number((currentSentiment.polarityScore - firstPolarity).toFixed(3));
    
    if (sentimentDelta >= 0.2) {
      trend = 'Improving';
    } else if (sentimentDelta <= -0.2) {
      trend = 'Declining';
    } else {
      trend = 'Stable';
    }
  }

  const totalPolarity = updatedHistory.reduce((acc, curr) => acc + curr.polarityScore, 0);
  const averagePolarity = Number((totalPolarity / updatedHistory.length).toFixed(3));

  // Log evaluation record
  sentimentLogs.push({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    text: text.slice(0, 120),
    predicted: currentSentiment.label,
    confidence: currentSentiment.confidenceScore,
    escalated: strategy.shouldEscalate,
    adaptedTone: strategy.tone
  });

  return {
    sentiment: currentSentiment,
    strategy,
    context: {
      sessionId: activeSessionId,
      turnIndex: updatedHistory.length,
      currentSentiment,
      history: updatedHistory,
      trend,
      averagePolarity,
      escalationTriggered: strategy.shouldEscalate,
      sentimentDelta
    }
  };
}

/**
 * 4. Ground-Truth Evaluation Matrix Calculation (Accuracy, Precision, Recall, F1)
 */
export interface EvaluationMetricReport {
  totalEvaluated: number;
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  byClass: {
    Positive: { precision: number; recall: number; f1: number; count: number };
    Negative: { precision: number; recall: number; f1: number; count: number };
    Neutral: { precision: number; recall: number; f1: number; count: number };
  };
  confusionMatrix: {
    actualPositive: { predPositive: number; predNegative: number; predNeutral: number };
    actualNegative: { predPositive: number; predNegative: number; predNeutral: number };
    actualNeutral: { predPositive: number; predNegative: number; predNeutral: number };
  };
}

export function evaluateAgainstGroundTruth(
  testData: Array<{ text: string; label: SentimentLabel }>
): EvaluationMetricReport {
  let correct = 0;

  const matrix = {
    actualPositive: { predPositive: 0, predNegative: 0, predNeutral: 0 },
    actualNegative: { predPositive: 0, predNegative: 0, predNeutral: 0 },
    actualNeutral: { predPositive: 0, predNegative: 0, predNeutral: 0 }
  };

  testData.forEach(item => {
    const pred = detectSentiment(item.text).label;
    if (pred === item.label) correct++;

    if (item.label === 'Positive') {
      if (pred === 'Positive') matrix.actualPositive.predPositive++;
      else if (pred === 'Negative') matrix.actualPositive.predNegative++;
      else matrix.actualPositive.predNeutral++;
    } else if (item.label === 'Negative') {
      if (pred === 'Positive') matrix.actualNegative.predPositive++;
      else if (pred === 'Negative') matrix.actualNegative.predNegative++;
      else matrix.actualNegative.predNeutral++;
    } else {
      if (pred === 'Positive') matrix.actualNeutral.predPositive++;
      else if (pred === 'Negative') matrix.actualNeutral.predNegative++;
      else matrix.actualNeutral.predNeutral++;
    }
  });

  const total = testData.length || 1;
  const accuracy = Number((correct / total).toFixed(4));

  // Positive Metrics
  const tpPos = matrix.actualPositive.predPositive;
  const fpPos = matrix.actualNegative.predPositive + matrix.actualNeutral.predPositive;
  const fnPos = matrix.actualPositive.predNegative + matrix.actualPositive.predNeutral;
  const precPos = (tpPos + fpPos) > 0 ? tpPos / (tpPos + fpPos) : 0;
  const recPos = (tpPos + fnPos) > 0 ? tpPos / (tpPos + fnPos) : 0;
  const f1Pos = (precPos + recPos) > 0 ? (2 * precPos * recPos) / (precPos + recPos) : 0;

  // Negative Metrics
  const tpNeg = matrix.actualNegative.predNegative;
  const fpNeg = matrix.actualPositive.predNegative + matrix.actualNeutral.predNegative;
  const fnNeg = matrix.actualNegative.predPositive + matrix.actualNegative.predNeutral;
  const precNeg = (tpNeg + fpNeg) > 0 ? tpNeg / (tpNeg + fpNeg) : 0;
  const recNeg = (tpNeg + fnNeg) > 0 ? tpNeg / (tpNeg + fnNeg) : 0;
  const f1Neg = (precNeg + recNeg) > 0 ? (2 * precNeg * recNeg) / (precNeg + recNeg) : 0;

  // Neutral Metrics
  const tpNeu = matrix.actualNeutral.predNeutral;
  const fpNeu = matrix.actualPositive.predNeutral + matrix.actualNegative.predNeutral;
  const fnNeu = matrix.actualNeutral.predPositive + matrix.actualNeutral.predNegative;
  const precNeu = (tpNeu + fpNeu) > 0 ? tpNeu / (tpNeu + fpNeu) : 0;
  const recNeu = (tpNeu + fnNeu) > 0 ? tpNeu / (tpNeu + fnNeu) : 0;
  const f1Neu = (precNeu + recNeu) > 0 ? (2 * precNeu * recNeu) / (precNeu + recNeu) : 0;

  const macroPrecision = Number(((precPos + precNeg + precNeu) / 3).toFixed(4));
  const macroRecall = Number(((recPos + recNeg + recNeu) / 3).toFixed(4));
  const macroF1 = Number(((f1Pos + f1Neg + f1Neu) / 3).toFixed(4));

  return {
    totalEvaluated: testData.length,
    accuracy,
    macroPrecision,
    macroRecall,
    macroF1,
    byClass: {
      Positive: { precision: Number(precPos.toFixed(4)), recall: Number(recPos.toFixed(4)), f1: Number(f1Pos.toFixed(4)), count: tpPos + fnPos },
      Negative: { precision: Number(precNeg.toFixed(4)), recall: Number(recNeg.toFixed(4)), f1: Number(f1Neg.toFixed(4)), count: tpNeg + fnNeg },
      Neutral: { precision: Number(precNeu.toFixed(4)), recall: Number(recNeu.toFixed(4)), f1: Number(f1Neu.toFixed(4)), count: tpNeu + fnNeu }
    },
    confusionMatrix: matrix
  };
}

/**
 * 5. Telemetry & Customer Satisfaction (CSAT) Proxy Metrics
 */
export function getSentimentTelemetrySummary() {
  const total = sentimentLogs.length;
  if (total === 0) {
    return {
      totalQueriesLogged: 0,
      sentimentBreakdown: { Positive: 0, Negative: 0, Neutral: 0 },
      escalationRate: 0,
      csatProxyScore: 85.0,
      recentLogs: []
    };
  }

  const positiveCount = sentimentLogs.filter(l => l.predicted === 'Positive').length;
  const negativeCount = sentimentLogs.filter(l => l.predicted === 'Negative').length;
  const neutralCount = sentimentLogs.filter(l => l.predicted === 'Neutral').length;
  const escalatedCount = sentimentLogs.filter(l => l.escalated).length;

  const escalationRate = Number(((escalatedCount / total) * 100).toFixed(1));
  const positiveRatio = positiveCount / total;
  const negativeRatio = negativeCount / total;
  // CSAT proxy formula: Base 70 + (posRatio * 30) - (negRatio * 25)
  const csatProxyScore = Number(Math.max(40, Math.min(100, 70 + (positiveRatio * 30) - (negativeRatio * 25))).toFixed(1));

  return {
    totalQueriesLogged: total,
    sentimentBreakdown: {
      Positive: positiveCount,
      Negative: negativeCount,
      Neutral: neutralCount
    },
    escalationRate,
    csatProxyScore,
    recentLogs: sentimentLogs.slice(-20).reverse()
  };
}
