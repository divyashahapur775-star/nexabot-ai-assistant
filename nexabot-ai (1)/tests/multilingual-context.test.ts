import {
  processMultilingualTurn,
  resetSessionContext,
  getSessionContext,
  SupportedLanguage
} from '../server/multilingualContext';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failure: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log(`\n===============================================================`);
console.log(`🧪 RUNNING MULTILINGUAL CONVERSATION & CONTEXT REGRESSION TESTS`);
console.log(`===============================================================\n`);

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  console.log(`\n[TEST ${totalTests}] ${name}`);
  try {
    fn();
    passedTests++;
    console.log(`✅ PASSED: ${name}`);
  } catch (err: any) {
    console.error(`💥 TEST FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ============================================================================
// TEST 1: Multi-turn Hindi Session (Fix for Error 1: Hindi Context Loss)
// ============================================================================
runTest('Error 1 Regression: Multi-turn Hindi Flight Booking preserves context without reverting to generic greeting', () => {
  const sessionId = 'test_hindi_multiturn_' + Date.now();
  resetSessionContext(sessionId, 'hi');

  // Turn 1: User specifies route and intent in Hindi
  console.log('\n--- Turn 1 (Hindi: Intent & Route) ---');
  const turn1 = processMultilingualTurn(sessionId, 'मुझे मुंबई से पेरिस की फ्लाइट बुक करनी है', 'hi');
  assert(turn1.intent === 'flight_booking', 'Intent identified as flight_booking');
  assert(turn1.session.flightBooking?.origin === 'Mumbai', 'Slot origin extracted as Mumbai');
  assert(turn1.session.flightBooking?.destination === 'Paris', 'Slot destination extracted as Paris');
  assert(turn1.session.flightBooking?.status === 'collecting', 'Status is collecting remaining slots');
  assert(!turn1.reply.includes('मैं हिंदी में आपकी क्या सहायता कर सकता हूँ?'), 'Did not output generic greeting');
  assert(turn1.reply.includes('मुंबई') && turn1.reply.includes('पेरिस'), 'Response acknowledges Mumbai and Paris in Hindi');

  // Turn 2: User provides date and passengers in Hindi
  console.log('\n--- Turn 2 (Hindi: Date & Passengers) ---');
  const turn2 = processMultilingualTurn(sessionId, '15 सितंबर, 2 यात्री', 'hi');
  assert(turn2.intent === 'flight_booking', 'Intent remains flight_booking');
  assert(turn2.session.flightBooking?.origin === 'Mumbai', 'Retained origin Mumbai across turns');
  assert(turn2.session.flightBooking?.destination === 'Paris', 'Retained destination Paris across turns');
  assert(turn2.session.flightBooking?.date === '15 September', 'Slot date extracted as 15 September');
  assert(turn2.session.flightBooking?.passengers === 2, 'Slot passengers extracted as 2');
  assert(turn2.session.flightBooking?.status === 'awaiting_confirmation', 'Status transitioned to awaiting_confirmation');
  assert(!turn2.reply.includes('नमस्ते! मैं हिंदी में आपकी क्या सहायता कर सकता हूँ?'), 'CRITICAL FIX: Turn 2 DID NOT revert to generic greeting');
  assert(turn2.reply.includes('15 सितंबर') && turn2.reply.includes('2 यात्री'), 'Response summarizes date and passengers in Hindi');

  // Turn 3: Short ambiguous affirmative reply in Hindi
  console.log('\n--- Turn 3 (Hindi: Affirmative confirmation "हाँ") ---');
  const turn3 = processMultilingualTurn(sessionId, 'हाँ', 'hi');
  assert(turn3.resolvedIntent === 'confirm_booking', 'Bare "हाँ" resolved to contextual intent confirm_booking');
  assert(turn3.session.flightBooking?.status === 'confirmed', 'Flight booking status updated to confirmed');
  assert(!!turn3.session.flightBooking?.bookingReference, 'Booking reference PNR generated');
  assert(turn3.reply.includes('सफलतापूर्वक बुक हो गई है') || turn3.reply.includes('पुष्टि'), 'Confirmation reply delivered in Hindi');
});

// ============================================================================
// TEST 2: Cross-Language Session Continuity (Kannada -> Hindi -> French)
// ============================================================================
runTest('Error 2 Regression: Cross-Language Session retains slots across Kannada, Hindi, and French switches', () => {
  const sessionId = 'test_cross_lang_' + Date.now();
  resetSessionContext(sessionId, 'kn');

  // Turn 1 (Kannada): Intent & Route
  console.log('\n--- Turn 1 (Kannada: Intent & Route) ---');
  const turn1 = processMultilingualTurn(sessionId, 'ನನಗೆ ಮುಂಬೈನಿಂದ ಪ್ಯಾರಿಸ್‌ಗೆ ವಿಮಾನ ಬುಕ್ ಮಾಡಬೇಕು', 'kn');
  assert(turn1.session.flightBooking?.origin === 'Mumbai', 'Kannada turn extracted origin Mumbai');
  assert(turn1.session.flightBooking?.destination === 'Paris', 'Kannada turn extracted destination Paris');
  assert(turn1.session.flightBooking?.status === 'collecting', 'Kannada turn status is collecting');
  assert(turn1.reply.includes('ಮುಂಬೈ') && turn1.reply.includes('ಪ್ಯಾರಿಸ್'), 'Reply in Kannada references route');

  // Turn 2 (Hindi): Mid-conversation switch to Hindi with Date & Passengers
  console.log('\n--- Turn 2 (Mid-conversation switch to Hindi: Date & Passengers) ---');
  const turn2 = processMultilingualTurn(sessionId, '15 सितंबर, 2 यात्री', 'hi');
  assert(turn2.session.flightBooking?.origin === 'Mumbai', 'Origin Mumbai preserved after switching to Hindi');
  assert(turn2.session.flightBooking?.destination === 'Paris', 'Destination Paris preserved after switching to Hindi');
  assert(turn2.session.flightBooking?.date === '15 September', 'Hindi turn extracted date 15 September');
  assert(turn2.session.flightBooking?.passengers === 2, 'Hindi turn extracted 2 passengers');
  assert(turn2.session.flightBooking?.status === 'awaiting_confirmation', 'Status transitioned to awaiting_confirmation');
  assert(turn2.reply.includes('मुंबई') && turn2.reply.includes('पेरिस') && turn2.reply.includes('15 सितंबर'), 'Reply in Hindi includes complete retained context');

  // Turn 3 (French): Mid-conversation switch to French with ambiguous short reply "Oui"
  console.log('\n--- Turn 3 (Mid-conversation switch to French: Ambiguous reply "Oui") ---');
  const turn3 = processMultilingualTurn(sessionId, 'Oui', 'fr');
  assert(turn3.resolvedIntent === 'confirm_booking', 'French "Oui" resolved to confirm_booking');
  assert(turn3.session.flightBooking?.status === 'confirmed', 'Status updated to confirmed');
  assert(turn3.reply.includes('confirmé avec succès') && turn3.reply.includes('Paris'), 'Reply in French confirms booking with preserved itinerary');
});

// ============================================================================
// TEST 3: Ambiguous Short-Reply Handling Across All Supported Languages
// ============================================================================
runTest('Error 3 Regression: Ambiguous affirmative replies in Kannada, Hindi, French, and English resolve to confirm_booking', () => {
  const affirmativeCases: Array<{ lang: SupportedLanguage; reply: string }> = [
    { lang: 'kn', reply: 'ಹೌದು' },
    { lang: 'kn', reply: 'ಖಂಡಿತ' },
    { lang: 'hi', reply: 'हाँ' },
    { lang: 'hi', reply: 'हाँजी' },
    { lang: 'hi', reply: 'सही है' },
    { lang: 'fr', reply: 'oui' },
    { lang: 'fr', reply: "d'accord" },
    { lang: 'fr', reply: "c'est bon" },
    { lang: 'en', reply: 'yes' },
    { lang: 'en', reply: 'sure' }
  ];

  for (const { lang, reply } of affirmativeCases) {
    const sId = `test_affirm_${lang}_${reply}_${Date.now()}`;
    const s = resetSessionContext(sId, lang);
    s.flightBooking = {
      origin: 'Mumbai',
      destination: 'Paris',
      date: '15 September',
      passengers: 2,
      status: 'awaiting_confirmation'
    };
    s.lastBotQuestion = 'confirm_booking';

    const res = processMultilingualTurn(sId, reply, lang);
    assert(res.resolvedIntent === 'confirm_booking', `Affirmative reply "${reply}" in ${lang} resolved to confirm_booking`);
    assert(res.session.flightBooking?.status === 'confirmed', `Session booking status marked confirmed for "${reply}"`);
  }
});

runTest('Error 3 Regression: Ambiguous negative replies in Kannada, Hindi, French, and English resolve to cancel_booking', () => {
  const negativeCases: Array<{ lang: SupportedLanguage; reply: string }> = [
    { lang: 'kn', reply: 'ಇಲ್ಲ' },
    { lang: 'kn', reply: 'ಬೇಡ' },
    { lang: 'hi', reply: 'नहीं' },
    { lang: 'hi', reply: 'रद्द करें' },
    { lang: 'fr', reply: 'non' },
    { lang: 'fr', reply: 'annuler' },
    { lang: 'en', reply: 'no' },
    { lang: 'en', reply: 'cancel' }
  ];

  for (const { lang, reply } of negativeCases) {
    const sId = `test_neg_${lang}_${reply}_${Date.now()}`;
    const s = resetSessionContext(sId, lang);
    s.flightBooking = {
      origin: 'Mumbai',
      destination: 'Paris',
      date: '15 September',
      passengers: 2,
      status: 'awaiting_confirmation'
    };
    s.lastBotQuestion = 'confirm_booking';

    const res = processMultilingualTurn(sId, reply, lang);
    assert(res.resolvedIntent === 'cancel_booking', `Negative reply "${reply}" in ${lang} resolved to cancel_booking`);
    assert(res.session.flightBooking?.status === 'cancelled', `Session booking status marked cancelled for "${reply}"`);
  }
});

console.log(`\n===============================================================`);
console.log(`🎉 ALL ${passedTests}/${totalTests} REGRESSION TEST SUITES PASSED SUCCESSFULLY!`);
console.log(`===============================================================\n`);
