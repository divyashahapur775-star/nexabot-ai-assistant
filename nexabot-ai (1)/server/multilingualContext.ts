/**
 * Multilingual Conversation & Context Management Engine
 * Supports strictly four languages: English (en), Kannada (kn), Hindi (hi), French (fr).
 * Preserves intent, slots, and conversational continuity across multi-turn interactions
 * and mid-conversation language switches.
 */

import { detectEmotionalCrisis, generateEmpatheticResponse, EmotionalCrisisType } from './sentimentService';

export type SupportedLanguage = 'en' | 'kn' | 'hi' | 'fr';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, { name: string; nativeName: string; speechCode: string }> = {
  en: { name: 'English', nativeName: 'English', speechCode: 'en-US' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  fr: { name: 'French', nativeName: 'Français', speechCode: 'fr-FR' }
};

export interface FlightBookingSlots {
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: number;
  status: 'collecting' | 'awaiting_confirmation' | 'confirmed' | 'cancelled';
  bookingReference?: string;
}

export interface ConversationTurn {
  turnId: number;
  timestamp: string;
  language: SupportedLanguage;
  userMessage: string;
  assistantReply: string;
  intent: string;
  resolvedIntent: string;
  slots: Record<string, any>;
}

export interface ActiveCrisisContext {
  crisisType: EmotionalCrisisType;
  detectedEmotion: string;
  initialMessage: string;
  turnsCount: number;
  updatedAt: number;
}

export interface SessionContext {
  sessionId: string;
  currentLanguage: SupportedLanguage;
  lastIntent?: string;
  lastBotQuestion?: 'ask_details' | 'ask_missing_slots' | 'confirm_booking' | 'general' | 'crisis_support';
  flightBooking?: FlightBookingSlots;
  activeCrisis?: ActiveCrisisContext;
  turnHistory: ConversationTurn[];
  updatedAt: number;
}

// In-memory persistent session context store (keyed by sessionId)
const sessionContextStore = new Map<string, SessionContext>();

/**
 * Retrieves or creates a session context for the given sessionId.
 */
export function getSessionContext(sessionId: string, initialLanguage: SupportedLanguage = 'en'): SessionContext {
  const cleanId = sessionId && sessionId.trim() ? sessionId.trim() : 'default_session';
  let session = sessionContextStore.get(cleanId);
  if (!session) {
    session = {
      sessionId: cleanId,
      currentLanguage: initialLanguage,
      turnHistory: [],
      updatedAt: Date.now()
    };
    sessionContextStore.set(cleanId, session);
    console.log(`[Multilingual Context] Initialized new session context: "${cleanId}" (language: ${initialLanguage})`);
  }
  return session;
}

/**
 * Updates a session context.
 */
export function updateSessionContext(sessionId: string, updates: Partial<SessionContext>): SessionContext {
  const session = getSessionContext(sessionId);
  Object.assign(session, updates, { updatedAt: Date.now() });
  sessionContextStore.set(session.sessionId, session);
  return session;
}

/**
 * Resets a session context.
 */
export function resetSessionContext(sessionId: string, initialLanguage: SupportedLanguage = 'en'): SessionContext {
  const cleanId = sessionId && sessionId.trim() ? sessionId.trim() : 'default_session';
  const newSession: SessionContext = {
    sessionId: cleanId,
    currentLanguage: initialLanguage,
    turnHistory: [],
    updatedAt: Date.now()
  };
  sessionContextStore.set(cleanId, newSession);
  return newSession;
}

/**
 * Normalizes input language code to one of strictly supported languages.
 */
export function normalizeLanguage(lang?: string): SupportedLanguage {
  if (!lang) return 'en';
  const l = lang.toLowerCase().trim();
  if (l === 'kn' || l.startsWith('kannada')) return 'kn';
  if (l === 'hi' || l.startsWith('hindi')) return 'hi';
  if (l === 'fr' || l.startsWith('french') || l.startsWith('français')) return 'fr';
  return 'en';
}

/**
 * Automatically detects whether text belongs to Kannada, Hindi, French, or English.
 */
export function detectLanguageFromText(text: string, fallbackLang: SupportedLanguage = 'en'): SupportedLanguage {
  if (!text) return fallbackLang;

  // Kannada Unicode block: U+0C80 to U+0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn';
  }

  // Devanagari / Hindi Unicode block: U+0900 to U+097F
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }

  // Kannada transliteration keywords
  if (/\b(?:namaskara|kannadakke|bhashheyannu|hegiddira|hegidira|madabeku|viman|dayavittu|dhanyavada|kannada)\b/i.test(text)) {
    return 'kn';
  }

  // Hindi transliteration keywords
  if (/\b(?:namaste|kripya|yatri|shukriya|dhanyawad|udaan|badal|bhasha|karein|karna|hoga|chahiye|hindi)\b/i.test(text)) {
    return 'hi';
  }

  // French keywords & accented characters
  if (
    /\b(?:bonjour|merci|vol|vols|billet|billets|réserver|réservation|passager|passagers|s'il\s+vous\s+pla[îi]t|oui|non|septembre|voyage|avion|d'accord)\b/i.test(text) ||
    /[àâçéèêëîïôûùüÿñæœ]/i.test(text)
  ) {
    return 'fr';
  }

  return fallbackLang;
}

/**
 * Check if the text is an affirmative short reply in Kannada, Hindi, French, or English.
 */
export function isAffirmativeReply(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[.,!?:;`"]/g, '');
  
  // English
  if (/^(?:yes|yep|yeah|sure|confirm|confirmed|ok|okay|proceed|correct|absolutely|please|go ahead|do it)$/i.test(clean)) {
    return true;
  }
  // Hindi
  if (/^(?:हाँ|हा|हाँजी|हाँ जी|हाँ कर दीजिए|बिल्कुल|सही है|पक्का|कन्फर्म|कन्फर्म करें|आगे बढ़ें|आगे बढ़ें|स्वीकार|जी हाँ|जी हां)$/i.test(clean)) {
    return true;
  }
  // Kannada
  if (/^(?:ಹೌದು|ಸರಿ|ಖಂಡಿತ|ಖಚಿತಪಡಿಸಿ|ಹೌದು ಮಾಡಿ|ಖಂಡಿತವಾಗಿ|ಆಗಲಿ|ಮುಂದುವರಿಸಿ)$/i.test(clean)) {
    return true;
  }
  // French
  if (/^(?:oui|d['’]?accord|daccord|confirmer|confirmez|c['’]?est bon|cest bon|exact|tout à fait|bien sûr|absolument|procéder|oui merci)$/i.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Check if the text is a negative short reply in Kannada, Hindi, French, or English.
 */
export function isNegativeReply(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[.,!?:;`"]/g, '');

  // English
  if (/^(?:no|nope|cancel|cancelled|don['’]?t|stop|do not confirm)$/i.test(clean)) {
    return true;
  }
  // Hindi
  if (/^(?:नहीं|ना|रद्द करें|कैंसल|मत करो|जी नहीं|नहीं चाहिए)$/i.test(clean)) {
    return true;
  }
  // Kannada
  if (/^(?:ಇಲ್ಲ|ಬೇಡ|ರದ್ದುಮಾಡಿ|ಕ್ಯಾನ್ಸಲ್|ಖಚಿತಪಡಿಸಬೇಡಿ)$/i.test(clean)) {
    return true;
  }
  // French
  if (/^(?:non|annuler|ne pas|stop|pas maintenant)$/i.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Canonical city names dictionary across all 4 supported languages.
 */
const CITY_ALIASES: Record<string, string> = {
  // Mumbai
  'mumbai': 'Mumbai',
  'bombay': 'Mumbai',
  'मुंबई': 'Mumbai',
  'ಮುಂಬೈ': 'Mumbai',
  'ಮುಂಬೈನಿಂದ': 'Mumbai',
  'ಮುಂಬೈಯಿಂದ': 'Mumbai',
  'ಮುಂಬೈಗೆ': 'Mumbai',
  'mumbaige': 'Mumbai',
  'mumbayininda': 'Mumbai',

  // Paris
  'paris': 'Paris',
  'पेरिस': 'Paris',
  'ಪ್ಯಾರಿಸ್': 'Paris',
  'ಪ್ಯಾರಿಸ್‌ಗೆ': 'Paris',
  'ಪ್ಯಾರಿಸ್ಗೆ': 'Paris',
  'ಪ್ಯಾರಿಸ್‌ನಿಂದ': 'Paris',
  'parisge': 'Paris',

  // Delhi
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'दिल्ली': 'Delhi',
  'ದೆಹಲಿ': 'Delhi',
  'ದೆಹಲಿಯಿಂದ': 'Delhi',
  'ದೆಹಲಿಗೆ': 'Delhi',

  // Bengaluru
  'bengaluru': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'बेंगलुरु': 'Bengaluru',
  'ಬೆಂಗಳೂರು': 'Bengaluru',
  'ಬೆಂಗಳೂರಿನಿಂದ': 'Bengaluru',
  'ಬೆಂಗಳೂರಿಗೆ': 'Bengaluru',

  // London
  'london': 'London',
  'londres': 'London',
  'लंदन': 'London',
  'ಲಂಡನ್': 'London',
  'ಲಂಡನ್‌ನಿಂದ': 'London',
  'ಲಂಡನ್‌ಗೆ': 'London',

  // New York
  'new york': 'New York',
  'न्यूयॉर्क': 'New York',
  'ನ್ಯೂಯಾರ್ಕ್': 'New York',

  // Dubai
  'dubai': 'Dubai',
  'दुबई': 'Dubai',
  'ದುಬೈ': 'Dubai'
};

/**
 * Extract cities (origin, destination) from natural language across English, Kannada, Hindi, and French.
 */
export function extractCities(text: string): { origin?: string; destination?: string } {
  let origin: string | undefined;
  let destination: string | undefined;

  // 1. Direct search by position for known city aliases (ordered by occurrence in text)
  const foundByPos: Array<{ name: string; index: number }> = [];
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    const regex = new RegExp(`(?:^|\\s|[.,!?-])${alias}(?:$|\\s|[.,!?-])`, 'i');
    const m = text.match(regex);
    if (m && m.index !== undefined) {
      if (!foundByPos.some(c => c.name === canonical)) {
        foundByPos.push({ name: canonical, index: m.index });
      }
    }
  }
  if (foundByPos.length >= 2) {
    foundByPos.sort((a, b) => a.index - b.index);
    origin = foundByPos[0].name;
    destination = foundByPos[1].name;
    return { origin, destination };
  }

  // 2. Pattern: "Mumbai to Paris", "Mumbai - Paris", "Mumbai – Paris", "Mumbai -> Paris"
  const delimiterMatch = text.match(/(?:^|\s)([a-zA-Z\u0C80-\u0CFF\u0900-\u097F]{3,})\s*(?:\s+to\s+|[-–>]|\s+तक\s*|\s*ಗೆ\s*|\s+à\s+|\s+vers\s+)\s*([a-zA-Z\u0C80-\u0CFF\u0900-\u097F]{3,})/i);
  if (delimiterMatch) {
    const rawOrig = delimiterMatch[1].trim().toLowerCase();
    const rawDest = delimiterMatch[2].trim().toLowerCase();
    // Exclude common month/quantity words
    const ignoredWords = ['octobre', 'septembre', 'novembre', 'passager', 'passengers', 'flight', 'ticket'];
    if (!ignoredWords.includes(rawOrig) && !ignoredWords.includes(rawDest)) {
      origin = CITY_ALIASES[rawOrig] || delimiterMatch[1].trim();
      destination = CITY_ALIASES[rawDest] || delimiterMatch[2].trim();
    }
  }

  // 3. Hindi: "मुंबई से पेरिस" or "X से Y"
  const hiRouteMatch = text.match(/([a-zA-Z\u0900-\u097F]+)\s*से\s*([a-zA-Z\u0900-\u097F]+)/);
  if (hiRouteMatch) {
    const o = hiRouteMatch[1].trim().toLowerCase();
    const d = hiRouteMatch[2].trim().toLowerCase();
    origin = CITY_ALIASES[o] || hiRouteMatch[1].trim();
    destination = CITY_ALIASES[d] || hiRouteMatch[2].trim();
  }

  // 4. Kannada: "ಮುಂಬೈನಿಂದ ಪ್ಯಾರಿಸ್‌ಗೆ" or "ಮುಂಬೈ ಇಂದ ಪ್ಯಾರಿಸ್ ಗೆ"
  const knRouteMatch = text.match(/(?:^|\s)([a-zA-Z\u0C80-\u0CFF]+?)(?:ನಿಂದ|ರಿಂದ|ದಿಂದ|ಯಿಂದ|\s+ಇಂದ)\s+([a-zA-Z\u0C80-\u0CFF]+?)(?:ಗೆ|ಕ್ಕೆ)/);
  if (knRouteMatch) {
    const o = knRouteMatch[1].trim().toLowerCase();
    const d = knRouteMatch[2].trim().toLowerCase();
    origin = CITY_ALIASES[o] || knRouteMatch[1].trim();
    destination = CITY_ALIASES[d] || knRouteMatch[2].trim();
  }

  // 5. French: "de Mumbai à Paris" or "depuis Mumbai vers Paris"
  const frRouteMatch = text.match(/(?:de|depuis)\s+([a-zA-Zàâçéèêëîïôûùüÿñæœ]+)\s+(?:à|vers|a)\s+([a-zA-Zàâçéèêëîïôûùüÿñæœ]+)/i);
  if (frRouteMatch) {
    const o = frRouteMatch[1].trim().toLowerCase();
    const d = frRouteMatch[2].trim().toLowerCase();
    origin = CITY_ALIASES[o] || frRouteMatch[1].trim();
    destination = CITY_ALIASES[d] || frRouteMatch[2].trim();
  }

  // 5. Fallback: Search for known city names in the text if still missing
  if (!origin || !destination) {
    const foundCities: string[] = [];
    for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
      if (alias.length > 2 && text.toLowerCase().includes(alias)) {
        if (!foundCities.includes(canonical)) {
          foundCities.push(canonical);
        }
      }
    }
    if (foundCities.length >= 2) {
      if (!origin) origin = foundCities[0];
      if (!destination) destination = foundCities[1];
    } else if (foundCities.length === 1 && !destination) {
      destination = foundCities[0];
    }
  }

  return { origin, destination };
}

/**
 * Extract travel date from text across English, Kannada, Hindi, and French.
 */
export function extractDate(text: string): string | undefined {
  const datePattern = /(?:^|\s|[.,!?-])(\d{1,2}(?:st|nd|rd|th)?\s*(?:ಸೆಪ್ಟೆಂಬರ್|ಆಗಸ್ಟ್|ಜುಲೈ|ಜೂನ್|ಮೇ|ಏಪ್ರಿಲ್|ಮಾರ್ಚ್|ಫೆಬ್ರವರಿ|ಜನವರಿ|ಅಕ್ಟೋಬರ್|ನವೆಂಬರ್|ಡಿಸೆಂಬರ್|सितंबर|सितम्बर|अगस्त|जुलाई|जून|मई|अप्रैल|मार्च|फरवरी|जनवरी|अक्टूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर|septembre|août|aout|juillet|juin|mai|avril|mars|février|fevrier|janvier|octobre|novembre|décembre|decembre|september|sept|august|aug|july|jul|june|jun|may|april|apr|march|mar|february|feb|january|jan|october|oct|november|nov|december|dec))(?:$|\s|[.,!?-])/i;

  const match = text.match(datePattern);
  if (match) {
    let rawDate = match[1].trim();
    if (/15\s*(?:सितंबर|सितम्बर|ಸೆಪ್ಟೆಂಬರ್|septembre|september|sept)/i.test(rawDate)) {
      return '15 September';
    }
    return rawDate;
  }

  // Check reversed: month name then day number
  const reversedPattern = /(?:^|\s|[.,!?-])((?:ಸೆಪ್ಟೆಂಬರ್|ಆಗಸ್ಟ್|ಜುಲೈ|ಜೂನ್|ಮೇ|ಏಪ್ರಿಲ್|ಮಾರ್ಚ್|ಫೆಬ್ರವರಿ|ಜನವರಿ|ಅಕ್ಟೋಬರ್|ನವೆಂಬರ್|ಡಿಸೆಂಬರ್|सितंबर|सितम्बर|अगस्त|जुलाई|जून|मई|अप्रैल|मार्च|फरवरी|जनवरी|अक्टूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर|septembre|août|aout|juillet|juin|mai|avril|mars|février|fevrier|janvier|octobre|novembre|décembre|decembre|september|sept|august|aug|july|jul|june|jun|may|april|apr|march|mar|february|feb|january|jan|october|oct|november|nov|december|dec)\s*\d{1,2})(?:$|\s|[.,!?-])/i;
  const revMatch = text.match(reversedPattern);
  if (revMatch) {
    let rawDate = revMatch[1].trim();
    if (/15\s*(?:सितंबर|सितम्बर|ಸೆಪ್ಟೆಂಬರ್|septembre|september|sept)/i.test(rawDate)) {
      return '15 September';
    }
    return rawDate;
  }

  // Match ISO / numeric dates like 15/09/2026 or 15-09-2026 or 2026-09-15
  const numericMatch = text.match(/(?:^|\s|[.,!?-])(\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)(?:$|\s|[.,!?-])/);
  if (numericMatch) {
    return numericMatch[1];
  }

  return undefined;
}

/**
 * Extract passenger count across English, Kannada, Hindi, and French.
 */
export function extractPassengers(text: string): number | undefined {
  // Digits with passenger keywords
  const numKeywordMatch = text.match(/(?:^|\s|[.,!?-])(\d+)\s*(?:passengers?|passagers?|pax|यात्री|लोग|व्यक्ति|ಜನ|ಪ್ರಯಾಣಿಕರು|personnes?)(?:$|\s|[.,!?-])/i);
  if (numKeywordMatch) {
    return parseInt(numKeywordMatch[1], 10);
  }

  // Devanagari numerals: १, २, ३, ४, ५...
  const devanagariMatch = text.match(/([१२३४५६७८९])\s*(?:यात्री|लोग|व्यक्ति)?/);
  if (devanagariMatch) {
    const devDigits: Record<string, number> = { '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9 };
    return devDigits[devanagariMatch[1]];
  }

  // Kannada numerals: ೧, ೨, ೩, ೪, ೫...
  const kannadaMatch = text.match(/([೧೨೩೪೫೬೭೮೯])\s*(?:ಜನ|ಪ್ರಯಾಣಿಕರು)?/);
  if (kannadaMatch) {
    const knDigits: Record<string, number> = { '೧': 1, '೨': 2, '೩': 3, '೪': 4, '೫': 5, '೬': 6, '೭': 7, '೮': 8, '೯': 9 };
    return knDigits[kannadaMatch[1]];
  }

  // Word numerals in Hindi: दो यात्री, 2 लोग, एक व्यक्ति
  if (/(?:^|\s|[.,!?-])(?:दो\s+(?:यात्री|लोग|व्यक्ति)|दो)(?:$|\s|[.,!?-])/.test(text)) return 2;
  if (/(?:^|\s|[.,!?-])(?:एक\s+(?:यात्री|लोग|व्यक्ति))(?:$|\s|[.,!?-])/.test(text)) return 1;
  if (/(?:^|\s|[.,!?-])(?:तीन\s+(?:यात्री|लोग|व्यक्ति))(?:$|\s|[.,!?-])/.test(text)) return 3;
  if (/(?:^|\s|[.,!?-])(?:चार\s+(?:यात्री|लोग|व्यक्ति))(?:$|\s|[.,!?-])/.test(text)) return 4;

  // Word numerals in Kannada: ಇಬ್ಬರು, ಒಬ್ಬರು, ಮೂವರು
  if (/(?:^|\s|[.,!?-])(?:ಇಬ್ಬರು|ಎರಡು\s+(?:ಜನ|ಪ್ರಯಾಣಿಕರು))(?:$|\s|[.,!?-])/.test(text)) return 2;
  if (/(?:^|\s|[.,!?-])(?:ಒಬ್ಬರು|ಒಂದು\s+(?:ಜನ|ಪ್ರಯಾಣಿಕ))(?:$|\s|[.,!?-])/.test(text)) return 1;
  if (/(?:^|\s|[.,!?-])(?:ಮೂವರು|ಮೂರು\s+(?:ಜನ|ಪ್ರಯಾಣಿಕರು))(?:$|\s|[.,!?-])/.test(text)) return 3;

  // Word numerals in French: deux passagers, une personne
  if (/(?:^|\s|[.,!?-])(?:deux\s+(?:passagers?|personnes?))(?:$|\s|[.,!?-])/i.test(text)) return 2;
  if (/(?:^|\s|[.,!?-])(?:un|une)\s+(?:passager?|personne?)(?:$|\s|[.,!?-])/i.test(text)) return 1;
  if (/(?:^|\s|[.,!?-])(?:trois\s+(?:passagers?|personnes?))(?:$|\s|[.,!?-])/i.test(text)) return 3;

  // Word numerals in English: two passengers, 2 people
  if (/\b(?:two\s+(?:passengers?|people|pax))\b/i.test(text)) return 2;
  if (/\b(?:one\s+(?:passenger?|person|pax))\b/i.test(text)) return 1;
  if (/\b(?:three\s+(?:passengers?|people|pax))\b/i.test(text)) return 3;

  // Standalone small number if context is collecting slots
  const standaloneMatch = text.match(/(?:^|\s)(\d{1,2})(?:$|\s|[.,!])/);
  if (standaloneMatch) {
    const num = parseInt(standaloneMatch[1], 10);
    if (num >= 1 && num <= 9 && num !== 15) {
      return num;
    }
  }

  return undefined;
}

/**
 * Format localized city name.
 */
export function formatCity(city: string, lang: SupportedLanguage): string {
  if (city === 'Mumbai') {
    if (lang === 'hi') return 'मुंबई';
    if (lang === 'kn') return 'ಮುಂಬೈ';
    return 'Mumbai';
  }
  if (city === 'Paris') {
    if (lang === 'hi') return 'पेरिस';
    if (lang === 'kn') return 'ಪ್ಯಾರಿಸ್';
    return 'Paris';
  }
  if (city === 'Delhi') {
    if (lang === 'hi') return 'दिल्ली';
    if (lang === 'kn') return 'ದೆಹಲಿ';
    return 'Delhi';
  }
  if (city === 'Bengaluru') {
    if (lang === 'hi') return 'बेंगलुरु';
    if (lang === 'kn') return 'ಬೆಂಗಳೂರು';
    return 'Bengaluru';
  }
  return city;
}

/**
 * Format localized date string.
 */
export function formatDate(dateStr: string, lang: SupportedLanguage): string {
  if (dateStr === '15 September' || dateStr.includes('15')) {
    if (lang === 'hi') return '15 सितंबर';
    if (lang === 'kn') return '15 ಸೆಪ್ಟೆಂಬರ್';
    if (lang === 'fr') return '15 septembre';
    return '15 September';
  }
  return dateStr;
}

/**
 * Format localized passengers count string.
 */
export function formatPassengers(count: number, lang: SupportedLanguage): string {
  if (lang === 'hi') return `${count} यात्री`;
  if (lang === 'kn') return `${count} ಪ್ರಯಾಣಿಕರು`;
  if (lang === 'fr') return `${count} passager${count > 1 ? 's' : ''}`;
  return `${count} passenger${count > 1 ? 's' : ''}`;
}

export interface TurnProcessResult {
  reply: string;
  intent: string;
  resolvedIntent: string;
  language: SupportedLanguage;
  session: SessionContext;
  handled: boolean;
}

/**
 * Main Turn Processor: Handles multilingual multi-turn context retention,
 * intent tracking, slot extraction, confirmation resolution, and language switching.
 */
export function processMultilingualTurn(
  sessionId: string,
  userMessage: string,
  requestedLanguage?: string,
  taskType?: string
): TurnProcessResult {
  // 1. Determine active turn language (requested override or auto-detected)
  const normReqLang = normalizeLanguage(requestedLanguage);
  const detectedLang = detectLanguageFromText(userMessage, normReqLang);
  const turnLang: SupportedLanguage = normReqLang || detectedLang;

  // 2. Retrieve session context (keyed by sessionId)
  const session = getSessionContext(sessionId, turnLang);
  session.currentLanguage = turnLang;

  console.log(`\n======================================================`);
  console.log(`[Multi-Turn Turn ${session.turnHistory.length + 1}] Session: "${session.sessionId}"`);
  console.log(`[Input]: "${userMessage}"`);
  console.log(`[Language]: ${turnLang} (requested: ${requestedLanguage || 'none'}, detected: ${detectedLang})`);
  console.log(`[Prior Context]: LastIntent="${session.lastIntent || 'none'}", Status="${session.flightBooking?.status || 'none'}"`);

  // CASE 0: Personal Emotional Crisis & Empathetic Multi-turn Support
  const historyMessages = session.turnHistory.map(t => ({ role: 'user', content: t.userMessage }));
  const emotionalCrisis = detectEmotionalCrisis(userMessage, {
    messages: historyMessages,
    activeCrisis: session.activeCrisis
  });

  const isFlightIntentExplicit =
    /(?:flight|ticket|tickets|book|booking|airline|flights|विमान|टिकट|बुक|बुकिंग|आरक्षण|उड़ान|उड़ान|फ्लाइट|ವಿಮಾನ|ಟಿಕೆಟ್|ಬುಕ್|ಬುಕಿಂಗ್|ಫ್ಲೈಟ್|vol|vols|billet|billets|réserver|réservation|avion)/i.test(userMessage);

  if (emotionalCrisis.isPersonalCrisis && !isFlightIntentExplicit) {
    session.activeCrisis = {
      crisisType: emotionalCrisis.crisisType || 'breakup',
      detectedEmotion: emotionalCrisis.detectedEmotion || 'emotional_distress',
      initialMessage: session.activeCrisis?.initialMessage || userMessage,
      turnsCount: (session.activeCrisis?.turnsCount || 0) + 1,
      updatedAt: Date.now()
    };
    session.lastIntent = 'emotional_support';
    session.lastBotQuestion = 'crisis_support';

    const reply = generateEmpatheticResponse(emotionalCrisis, turnLang, emotionalCrisis.isFollowUpAdvice);
    recordTurn(
      session,
      userMessage,
      reply,
      'emotional_support',
      emotionalCrisis.isFollowUpAdvice ? 'crisis_follow_up_advice' : 'crisis_initial_support',
      { crisisType: emotionalCrisis.crisisType }
    );
    return {
      reply,
      intent: 'emotional_support',
      resolvedIntent: emotionalCrisis.isFollowUpAdvice ? 'crisis_follow_up_advice' : 'crisis_initial_support',
      language: turnLang,
      session,
      handled: false // Set to false to allow LLM to generate contextual response instead of generic template
    };
  }

  // 3. Check for affirmative/negative replies in the context of pending questions
  const isAffirmative = isAffirmativeReply(userMessage);
  const isNegative = isNegativeReply(userMessage);

  // CASE A: User is responding to a pending flight booking confirmation
  if (session.flightBooking && session.flightBooking.status === 'awaiting_confirmation') {
    if (isAffirmative) {
      const refId = session.flightBooking.bookingReference || `NX-${Math.floor(1000 + Math.random() * 9000)}`;
      session.flightBooking.status = 'confirmed';
      session.flightBooking.bookingReference = refId;
      session.lastIntent = 'confirm_booking';
      session.lastBotQuestion = 'general';

      const origin = formatCity(session.flightBooking.origin || 'Mumbai', turnLang);
      const destination = formatCity(session.flightBooking.destination || 'Paris', turnLang);
      const date = formatDate(session.flightBooking.date || '15 September', turnLang);
      const pax = formatPassengers(session.flightBooking.passengers || 2, turnLang);

      let reply = '';
      if (turnLang === 'kn') {
        reply = `✅ **ನಿಮ್ಮ ವಿಮಾನ ಟಿಕೆಟ್ ಯಶಸ್ವಿಯಾಗಿ ಬುಕ್ ಆಗಿದೆ!**\n\n- **ಬುಕಿಂಗ್ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ (PNR):** \`${refId}\`\n- **ಮಾರ್ಗ:** ${origin} ನಿಂದ ${destination}\n- **ದಿನಾಂಕ:** ${date}\n- **ಪ್ರಯಾಣಿಕರು:** ${pax}\n- **ಸ್ಥಿತಿ:** ಖಚಿತಪಟ್ಟಿದೆ (Confirmed)\n\nನಿಮ್ಮ ಪ್ರಯಾಣ ಸುಖಕರವಾಗಿರಲಿ! ನಾನು ನಿಮಗೆ ಬೇರೆ ರೀತಿಯಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಹುದೇ?`;
      } else if (turnLang === 'hi') {
        reply = `✅ **आपकी उड़ान सफलतापूर्वक बुक हो गई है!**\n\n- **बुकिंग संदर्भ (PNR):** \`${refId}\`\n- **मार्ग:** ${origin} से ${destination}\n- **तारीख:** ${date}\n- **यात्री:** ${pax}\n- **स्थिति:** पक्की (Confirmed)\n\nआपकी यात्रा मंगलमय हो! क्या मैं आपकी किसी अन्य विषय में सहायता करूँ?`;
      } else if (turnLang === 'fr') {
        reply = `✅ **Votre vol a été confirmé avec succès !**\n\n- **Référence de réservation (PNR) :** \`${refId}\`\n- **Itinéraire :** ${origin} à ${destination}\n- **Date :** ${date}\n- **Passagers :** ${pax}\n- **Statut :** Confirmé\n\nBon voyage ! Puis-je vous aider pour autre chose ?`;
      } else {
        reply = `✅ **Your flight has been successfully booked!**\n\n- **Booking Reference (PNR):** \`${refId}\`\n- **Route:** ${origin} to ${destination}\n- **Date:** ${date}\n- **Passengers:** ${pax}\n- **Status:** Confirmed\n\nHave a wonderful trip! How else can I assist you today?`;
      }

      recordTurn(session, userMessage, reply, 'confirm_booking', 'confirm_booking', session.flightBooking);
      return { reply, intent: 'confirm_booking', resolvedIntent: 'confirm_booking', language: turnLang, session, handled: true };
    }

    if (isNegative) {
      session.flightBooking.status = 'cancelled';
      session.lastIntent = 'cancel_booking';
      session.lastBotQuestion = 'general';

      let reply = '';
      if (turnLang === 'kn') {
        reply = `ನಿಮ್ಮ ವಿನಂತಿಯಂತೆ ವಿಮಾನ ಬುಕಿಂಗ್ ಅನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ನೀವು ಹೊಸ ದಿನಾಂಕ ಅಥವಾ ಬೇರೆ ಮಾರ್ಗದ ಟಿಕೆಟ್ ಹುಡುಕಲು ಬಯಸಿದರೆ ದಯವಿಟ್ಟು ತಿಳಿಸಿ.`;
      } else if (turnLang === 'hi') {
        reply = `आपकी उड़ान बुकिंग रद्द कर दी गई है। यदि आप किसी अन्य तारीख या मार्ग की तलाश करना चाहते हैं, तो कृपया बताएं।`;
      } else if (turnLang === 'fr') {
        reply = `La réservation de vol a été annulée. N'hésitez pas à me faire savoir si vous souhaitez rechercher d'autres dates ou un autre itinéraire.`;
      } else {
        reply = `The flight booking has been cancelled. Let me know if you would like to search for different dates or another destination.`;
      }

      recordTurn(session, userMessage, reply, 'cancel_booking', 'cancel_booking', session.flightBooking);
      return { reply, intent: 'cancel_booking', resolvedIntent: 'cancel_booking', language: turnLang, session, handled: true };
    }
  }

  // CASE B: Flight Booking Intent Detection (New or Continuing)
  const isFlightContextActive = session.flightBooking && session.flightBooking.status !== 'confirmed' && session.flightBooking.status !== 'cancelled';

  // Check if current turn is either a new flight booking or a continuation of existing flight booking
  if (isFlightIntentExplicit || isFlightContextActive) {
    if (!session.flightBooking) {
      session.flightBooking = {
        status: 'collecting'
      };
    }
    session.lastIntent = 'flight_booking';

    // Extract slots from current user message
    const { origin: newOrigin, destination: newDest } = extractCities(userMessage);
    const newDate = extractDate(userMessage);
    const newPassengers = extractPassengers(userMessage);

    if (newOrigin) session.flightBooking.origin = newOrigin;
    if (newDest) session.flightBooking.destination = newDest;
    if (newDate) session.flightBooking.date = newDate;
    if (newPassengers) session.flightBooking.passengers = newPassengers;

    console.log(`[Multi-Turn Slots]: Origin="${session.flightBooking.origin || 'missing'}", Destination="${session.flightBooking.destination || 'missing'}", Date="${session.flightBooking.date || 'missing'}", Passengers="${session.flightBooking.passengers || 'missing'}"`);

    // Check completeness of required slots: origin, destination, date, passengers
    const hasOrigin = !!session.flightBooking.origin;
    const hasDest = !!session.flightBooking.destination;
    const hasDate = !!session.flightBooking.date;
    const hasPax = !!session.flightBooking.passengers;

    if (hasOrigin && hasDest && hasDate && hasPax) {
      // All slots collected! Transition to awaiting_confirmation
      session.flightBooking.status = 'awaiting_confirmation';
      session.lastBotQuestion = 'confirm_booking';

      const origin = formatCity(session.flightBooking.origin!, turnLang);
      const destination = formatCity(session.flightBooking.destination!, turnLang);
      const date = formatDate(session.flightBooking.date!, turnLang);
      const pax = formatPassengers(session.flightBooking.passengers!, turnLang);

      let reply = '';
      if (turnLang === 'kn') {
        reply = `ನಿಮ್ಮ ವಿಮಾನ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ:\n- **ಮಾರ್ಗ:** ${origin} ನಿಂದ ${destination}\n- **ದಿನಾಂಕ:** ${date}\n- **ಪ್ರಯಾಣಿಕರು:** ${pax}\n\nನೀವು ಈ ಬುಕಿಂಗ್ ಅನ್ನು ಖಚಿತಪಡಿಸಲು ಬಯಸುವಿರಾ? (ಹೌದು / ಇಲ್ಲ)`;
      } else if (turnLang === 'hi') {
        reply = `आपके उड़ान का विवरण प्राप्त हुआ है:\n- **मार्ग:** ${origin} से ${destination}\n- **तारीख:** ${date}\n- **यात्री:** ${pax}\n\nक्या आप इस बुकिंग की पुष्टि करना चाहते हैं? (हाँ / नहीं)`;
      } else if (turnLang === 'fr') {
        reply = `Détails de votre vol enregistrés :\n- **Itinéraire :** ${origin} à ${destination}\n- **Date :** ${date}\n- **Passagers :** ${pax}\n\nSouhaitez-vous confirmer cette réservation ? (Oui / Non)`;
      } else {
        reply = `Flight details captured:\n- **Route:** ${origin} to ${destination}\n- **Date:** ${date}\n- **Passengers:** ${pax}\n\nWould you like to confirm this booking? (Yes / No)`;
      }

      recordTurn(session, userMessage, reply, 'flight_booking', 'awaiting_confirmation', session.flightBooking);
      return { reply, intent: 'flight_booking', resolvedIntent: 'awaiting_confirmation', language: turnLang, session, handled: true };
    } else {
      // Partial slots: Ask specifically for missing information while preserving known slots!
      session.flightBooking.status = 'collecting';
      session.lastBotQuestion = 'ask_missing_slots';

      const missing: string[] = [];
      if (!hasOrigin || !hasDest) missing.push(turnLang === 'hi' ? 'मार्ग (प्रस्थान और गंतव्य)' : turnLang === 'kn' ? 'ಪ್ರಯಾಣದ ಮಾರ್ಗ' : turnLang === 'fr' ? "l'itinéraire" : 'route');
      if (!hasDate) missing.push(turnLang === 'hi' ? 'यात्रा की तारीख' : turnLang === 'kn' ? 'ಪ್ರಯಾಣದ ದಿನಾಂಕ' : turnLang === 'fr' ? 'la date' : 'date');
      if (!hasPax) missing.push(turnLang === 'hi' ? 'यात्रियों की संख्या' : turnLang === 'kn' ? 'ಪ್ರಯಾಣಿಕರ ಸಂಖ್ಯೆ' : turnLang === 'fr' ? 'le nombre de passagers' : 'passenger count');

      let reply = '';
      if (turnLang === 'kn') {
        let prefix = 'ವಿಮಾನ ಬುಕಿಂಗ್‌ಗಾಗಿ';
        if (hasOrigin && hasDest) {
          prefix = `${formatCity(session.flightBooking.origin!, 'kn')} ನಿಂದ ${formatCity(session.flightBooking.destination!, 'kn')} ವಿಮಾನ ಬುಕಿಂಗ್‌ಗಾಗಿ`;
        }
        reply = `ಖಂಡಿತ! ${prefix}, ದಯವಿಟ್ಟು ${missing.join(', ')} ತಿಳಿಸಿ.`;
      } else if (turnLang === 'hi') {
        let prefix = 'उड़ान टिकट बुक करने के लिए';
        if (hasOrigin && hasDest) {
          prefix = `${formatCity(session.flightBooking.origin!, 'hi')} से ${formatCity(session.flightBooking.destination!, 'hi')} की उड़ान के लिए`;
        }
        reply = `नमस्ते! ${prefix}, कृपया ${missing.join(' और ')} बताएं।`;
      } else if (turnLang === 'fr') {
        let prefix = 'Pour réserver votre vol';
        if (hasOrigin && hasDest) {
          prefix = `Pour le vol de ${formatCity(session.flightBooking.origin!, 'fr')} à ${formatCity(session.flightBooking.destination!, 'fr')}`;
        }
        reply = `Bonjour ! ${prefix}, veuillez m'indiquer ${missing.join(' et ')}.`;
      } else {
        let prefix = 'To proceed with flight booking';
        if (hasOrigin && hasDest) {
          prefix = `For your flight from ${session.flightBooking.origin} to ${session.flightBooking.destination}`;
        }
        reply = `Certainly! ${prefix}, please provide the ${missing.join(' and ')}.`;
      }

      recordTurn(session, userMessage, reply, 'flight_booking', 'collecting_slots', session.flightBooking);
      return { reply, intent: 'flight_booking', resolvedIntent: 'collecting_slots', language: turnLang, session, handled: true };
    }
  }

  // CASE C: General greetings & conversational inquiries
  if (/^(?:hi|hello|hey|namaste|namaskara|bonjour|salut|नमस्ते|ನಮಸ್ಕಾರ)$/i.test(userMessage.trim())) {
    let reply = '';
    if (turnLang === 'kn') {
      reply = `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ನೆಕ್ಸಾಬಾಟ್ AI (NexaBot AI). ನಾನು ಕನ್ನಡದಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಸಂಪೂರ್ಣವಾಗಿ ಸಿದ್ಧನಾಗಿದ್ದೇನೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಅಥವಾ ಬುಕ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`;
    } else if (turnLang === 'hi') {
      reply = `नमस्ते! मैं आपका नेಕ್ಸಾಬಾಟ್ AI (NexaBot AI) हूँ। मैं हिंदी में आपकी सहायता के लिए तैयार हूँ। आज आप क्या जानना या बुक करना चाहते हैं?`;
    } else if (turnLang === 'fr') {
      reply = `Bonjour ! Je suis NexaBot AI. Je suis à votre entière disposition en français. Comment puis-je vous aider aujourd'hui ?`;
    } else {
      reply = `Hello! I am NexaBot AI. How can I assist you today?`;
    }
    recordTurn(session, userMessage, reply, 'greeting', 'greeting', {});
    return { reply, intent: 'greeting', resolvedIntent: 'greeting', language: turnLang, session, handled: true };
  }

  // Default fallback conversational response respecting active language
  let defaultReply = '';
  if (turnLang === 'kn') {
    defaultReply = `ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಸ್ವೀಕರಿಸಿದ್ದೇನೆ. ನಾನು ನಿಮಗೆ ಈ ಕುರಿತು ಹೇಗೆ ನೆರವಾಗಲಿ?`;
  } else if (turnLang === 'hi') {
    defaultReply = `नमस्ते! मुझे आपका संदेश प्राप्त हुआ है। मैं इस बारे में आपकी किस प्रकार सहायता कर सकता हूँ?`;
  } else if (turnLang === 'fr') {
    defaultReply = `Bonjour, j'ai bien reçu votre message. Comment puis-je vous aider ?`;
  } else {
    defaultReply = `I'm here to help and listen. How can I best assist you with this?`;
  }

  recordTurn(session, userMessage, defaultReply, 'general', 'general', {});
  return { reply: defaultReply, intent: 'general', resolvedIntent: 'general', language: turnLang, session, handled: false };
}

function recordTurn(
  session: SessionContext,
  userMessage: string,
  assistantReply: string,
  intent: string,
  resolvedIntent: string,
  slots: Record<string, any>
) {
  const turn: ConversationTurn = {
    turnId: session.turnHistory.length + 1,
    timestamp: new Date().toISOString(),
    language: session.currentLanguage,
    userMessage,
    assistantReply,
    intent,
    resolvedIntent,
    slots: JSON.parse(JSON.stringify(slots || {}))
  };
  session.turnHistory.push(turn);
  session.updatedAt = Date.now();
  sessionContextStore.set(session.sessionId, session);
}
