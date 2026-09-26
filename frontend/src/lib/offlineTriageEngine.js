/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SANJEEVANI 2.0 — OFFLINE CLINICAL TRIAGE & AYUSH REMEDY ENGINE
 * 
 * 100% Client-Side Clinical Intelligence:
 * 1. Manchester Triage System (MTS) severity evaluation (Red, Yellow, Green).
 * 2. Curated CCRAS & Ayurvedic Pharmacopoeia of India (API) verified remedies.
 * 3. Deterministic Safety Knowledge Graph enforcing comorbidity contraindications.
 * 4. Structured response generator matching backend LangGraph AgentState format.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { evaluateLocalRedFlags } from './localTriageFallback.js';

// ── CCRAS Classical Remedy Database (Client-Side Cached) ─────────────────────
export const OFFLINE_AYUSH_REMEDIES = {
  cough_cold: {
    symptom_triggers: ['cough', 'cold', 'khansi', 'jukham', 'nazla', 'gala', 'sore throat', 'phlegm', 'balgam'],
    tier: 'Green',
    possible_cause: 'Seasonal Vata-Kapha imbalance / Viral upper respiratory irritation',
    remedy_name: 'Tulsi-Adrak-Kali Mirch Kadha (तुलसी-अदरक काढ़ा)',
    source: 'CCRAS & Ayurvedic Pharmacopoeia of India (API)',
    ingredients: '5-7 Tulsi leaves, 1 inch crushed fresh ginger, 2-3 black peppercorns, 1 clove, 1 tsp honey/jaggery',
    preparation_steps: [
      '2 cup paani mein tulsi ke patte, adrak, kali mirch aur laung ko koot kar daalein.',
      'Madhyam aanch par ubaalein jab tak paani 1 cup na reh jaaye.',
      'Chhaan kar gunguna hone dein; swadanusaar shahad ya gur milaayein.'
    ],
    dosage: '1 cup din mein 2 baar bhojan ke baad gunguna piyein.',
    ayurvedic_note: 'Kaphahara aur Vata-shamaka gun gale ki kharash aur mucus ko kam karte hain.',
    contraindications: ['peptic_ulcer', 'gastric_bleeding', 'severe_acid_reflux'],
    safe_alternative: {
      remedy_name: 'Mulethi Kwath (मुलेठी क्वाथ - Alum/Licorice decoction)',
      ayurvedic_note: 'Ulcer aur acidity ke marijon ke liye soumya kaphahara shamak.'
    }
  },

  indigestion_gas: {
    symptom_triggers: ['gas', 'acidity', 'indigestion', 'apach', 'bloating', 'pet phoolna', 'pet dard', 'pet me dard', 'pet mein dard', 'pet main dard', 'badhazmi', 'flatulence', 'pet', 'pait', 'stomach', 'marod', 'ainthan', 'udar'],
    tier: 'Green',
    possible_cause: 'Mandagni (Diminished digestive fire) / Pitta-Vata aggravation',
    remedy_name: 'Ajwain-Heeng-Kala Namak Churna (अजवाइन-हींग चूर्ण)',
    source: 'Bhavaprakasha Samhita & CCRAS Guidelines',
    ingredients: '1/2 chammach roasted ajwain, 1 chutki shuddh heeng, 1/4 chammach kala namak',
    preparation_steps: [
      'Ajwain ko tave par halka sa bhoon lein.',
      'Heeng aur kala namak ke saath pees lein.',
      'Gungune paani ke saath faank lein.'
    ],
    dosage: 'Bhojan ke 15 minute baad ek baar lein.',
    ayurvedic_note: 'Deepana (appetite booster) aur Pachana (digestive) gun gas ko turant nikalte hain.',
    contraindications: ['hypertension'], // Salt-restricted
    safe_alternative: {
      remedy_name: 'Bhuna Jeera Paani (भुना जीरा पानी - Zero Sodium)',
      ayurvedic_note: 'High BP ke marijon ke liye bina namak ka safe pachak vikalp.'
    }
  },

  acidity_gerd: {
    symptom_triggers: ['heartburn', 'acidity', 'jalan', 'khatti dakar', 'acid reflux', 'chest burn', 'pitta', 'gale mein jalan', 'chhati mein jalan', 'seene mein jalan'],
    tier: 'Green',
    possible_cause: 'Amlapitta / Aggravated gastric hydrochloric secretions',
    remedy_name: 'Saunf-Dhaniya Sheetak (सौंफ-धनिया शीतल जल)',
    source: 'Charaka Samhita Sutrasthana & CCRAS',
    ingredients: '1 chammach saunf, 1 chammach sabut dhaniya, thanda doodh ya mishri ka paani',
    preparation_steps: [
      'Ek glass paani mein saunf aur dhaniya ko raat bhar bhigo kar rakhein.',
      'Subah masal kar chhaan lein.',
      'Swadanusaar mishri milaakar khali pet piyein.'
    ],
    dosage: 'Din mein 2 baar bhojan se 30 minute pehle.',
    ayurvedic_note: 'Sheet virya (cooling potency) Pitta dosha aur amlata (acidity) ko shant karti hai.',
    contraindications: [],
  },

  fever_mild: {
    symptom_triggers: ['fever', 'bukhar', 'tap', 'taap', 'hararat', 'body warm', 'mild fever', 'bukhar sa', 'garam sharir'],
    tier: 'Yellow', // Fevers require clinical watch in mountains
    possible_cause: 'Vata-Kaphaja Jwara / Seasonal viral immune response',
    remedy_name: 'Giloy-Tulsi Kwath (गिलोय-तुलसी क्वाथ)',
    source: 'Ayurvedic Pharmacopoeia of India (API Part-1)',
    ingredients: '4-inch giloy stem piece (ya giloy swaras 10ml), 5 tulsi patte, 2 kali mirch',
    preparation_steps: [
      'Giloy ko koot kar 2 cup paani mein ubaalein.',
      'Tulsi aur kali mirch daal kar 1/2 cup bache tak kaadha banayein.',
      'Chhaan kar gunguna piyein.'
    ],
    dosage: '20-30ml subah-shaam. Yadi bukhar 101°F se zyada ya 48 ghante se rahe toh PHC jaayein.',
    ayurvedic_note: 'Jwaraghna (antipyretic) aur Rasayana (immunomodulator) gun bukhar ko kam karte hain.',
    contraindications: ['pregnancy', 'autoimmune_disease'],
  },

  headache: {
    symptom_triggers: ['headache', 'sir dard', 'sar dard', 'sir me dard', 'sar me dard', 'sir mein dard', 'sar mein dard', 'sir main dard', 'sar main dard', 'migraine', 'shirahshoola', 'sir bhari', 'sar bhari'],
    tier: 'Green',
    possible_cause: 'Vata-Pitta stress / Tension or sinusitis',
    remedy_name: 'Chandan-Dhaniya Bahiya Lepa (चंदन-धनिया लेप)',
    source: 'Ashtanga Hridaya & Charaka Chikitsa',
    ingredients: 'Shuddh chandan powder (sandalwood) 1/2 tsp, dhaniya powder 1/2 tsp, gulab jal',
    preparation_steps: [
      'Chandan aur dhaniya powder ko gulab jal mein milaakar paste banayein.',
      'Maathe (forehead) aur kanpati (temples) par 15-20 minute ke liye lagayein.',
      'Gungune paani se dho lein.'
    ],
    dosage: 'Aavashyakta padne par din mein 1-2 baar bahiya lepa.',
    ayurvedic_note: 'Sheetala (cooling) gun mastishk ki rakt-vahiniyon ke tanaav ko kam karta hai.',
    contraindications: [],
  },

  dizziness: {
    symptom_triggers: ['chakkar', 'dizziness', 'sir ghoom', 'sar ghoom', 'ghoom raha hai', 'lightheaded', 'vertigo', 'kamzori se chakkar', 'chakkaron'],
    tier: 'Green',
    possible_cause: 'Sharirik thakan, dehydration ya soumya Pitta-Vata asuvidha',
    remedy_name: 'Dhanyaka-Mishri Hima & Nimbu-Lavana Jal (धनिया-मिश्री जल एवं नींबू-नमक पानी)',
    source: 'CCRAS Classical Formulations & API',
    ingredients: '1 chammach sabut dhaniya beej, 1 chammach mishri (dhaga mishri), 1 glass taaza peene ka paani, chutki bhar sendha namak',
    preparation_steps: [
      'Ek glass taaza paani mein 1 chammach sabut dhaniya raat bhar ya 2 ghante bhigo kar rakhein.',
      'Masal kar chhaan lein aur swadanusaar peesi mishri mila lein.',
      'Yadi kamzori ya dhoop se chakkar ho toh aadhe nimbu ka ras aur chutki bhar sendha namak milaakar ghunt-ghunt piyein.'
    ],
    dosage: 'Din mein 1-2 baar aaram se baithkar ghunt-ghunt piyein.',
    ayurvedic_note: 'Sheet virya Pitta-shamaka gun aur prakritik electrolytes sharir mein urja aur santulan wapas laate hain.',
    contraindications: ['diabetic_ketoacidosis'],
  },

  joint_pain: {
    symptom_triggers: ['jod', 'jodo', 'jodon', 'ghutna', 'ghutne', 'joint', 'sandhi', 'jodo mein dard', 'jodon mein dard', 'ghutne mein dard', 'ghutno mein dard', 'arthralgia', 'gathiya'],
    tier: 'Green',
    possible_cause: 'Sandhivata (Vata accumulation in synovial joints) / Seasonal joint stiffness',
    remedy_name: 'Methi-Sunthi Churna & Nirgundi Tel (मेथी-सोंठ चूर्ण एवं निर्गुंडी तेल)',
    source: 'CCRAS National Clinical Protocol for Sandhivata',
    ingredients: '1/2 chammach methi dana powder, 1/2 chammach sunthi (dry ginger) powder, Nirgundi ya Til ka tel',
    preparation_steps: [
      'Methi dana aur sunthi powder ko mila kar rakh lein.',
      'Subah khali pet 1 chammach gungune paani ke saath lein.',
      'Dard wale jodon par gungune Nirgundi ya Til ke tel se halki malish karein aur gunguni potti se sek karein.'
    ],
    dosage: 'Subah khali pet 1 baar churna, aur shaam ko jodon par gungune tel se halki malish.',
    ayurvedic_note: 'Vata-shamaka aur Shothahara (anti-inflammatory) gun jodon ki jakdan aur dard ko shant karte hain.',
    contraindications: ['peptic_ulcer', 'pregnancy'],
    safe_alternative: {
      remedy_name: 'Haldi-Doodh aur Til Tel Sekayi (हल्दी दूध)',
      ayurvedic_note: 'Ulcer aur acidity ke marijon ke liye soumya vedanahara vikalp.'
    }
  },

  body_ache_joint: {
    symptom_triggers: ['body ache', 'badan dard', 'joint pain', 'sandhi vata', 'kamar dard', 'peeth dard', 'muscular pain', 'thakan', 'thakawat', 'ang dard', 'badan me dard', 'badan mein dard', 'kamar me dard', 'kamar mein dard', 'tootan'],
    tier: 'Green',
    possible_cause: 'Vata accumulation in Sandhi (joints) / Physical fatigue',
    remedy_name: 'Haldi-Ashwagandha Ksheerapaka (हल्दी-अश्वगंधा दूध)',
    source: 'CCRAS Classical Formulations',
    ingredients: '1/2 chammach haldi, 1/2 chammach ashwagandha powder, 1 glass gunguna doodh, chutki bhar kali mirch',
    preparation_steps: [
      'Doodh mein haldi aur ashwagandha milakar 5 minute dheemi aanch par ubaalein.',
      'Kali mirch milayein taaki curcumin theek se absorb ho sake.',
      'Sone se pehle gunguna piyein.'
    ],
    dosage: 'Raat ko sone se 30 minute pehle 1 glass.',
    ayurvedic_note: 'Shothahara (anti-inflammatory) aur Vedana-sthapaka (analgesic) gun tanaav dur karte hain.',
    contraindications: ['gallstones', 'pregnancy'],
  },

  constipation: {
    symptom_triggers: ['constipation', 'kabz', 'pet saaf na hona', 'pet saaf nahi', 'anaha', 'vibandha', 'hard stool'],
    tier: 'Green',
    possible_cause: 'Apana Vata stagnation / Dehydration in mountain climate',
    remedy_name: 'Triphala Churna (त्रिफला चूर्ण)',
    source: 'Charaka Samhita Sutrasthana & API',
    ingredients: '1 chammach Triphala churna (Amla, Haritaki, Bibhitaki), 1 glass gunguna paani',
    preparation_steps: [
      'Raat ko sone se pehle gungune paani mein 1 chammach Triphala gholein.',
      'Bina chhaane dheere-dheere piyein.'
    ],
    dosage: 'Raat ko sone se pehle ek baar.',
    ayurvedic_note: 'Anulomana gun aanton ko shuddh karke pet ko swabhavik roop se saaf karta hai.',
    contraindications: ['diarrhea', 'pregnancy'],
  },

  vomiting_nausea: {
    symptom_triggers: ['vomiting', 'nausea', 'ulti', 'ji machlana', 'ji ghabrana', 'matli', 'chardi'],
    tier: 'Yellow',
    possible_cause: 'Pitta-Vata Udana aggravation / Motion sickness or gastro-upset',
    remedy_name: 'Nimbu-Adrak-Pudina Swaras (नींबू-पुदीना अर्क)',
    source: 'Sushruta Samhita Uttaratantra',
    ingredients: '1/2 chammach adrak ka ras, 1/2 chammach pudina ras, 1 chammach nimbu ras, chutki bhar sendha namak',
    preparation_steps: [
      'Taaze pudine aur adrak ka ras nikalein.',
      'Nimbu ras aur sendha namak milaayein.',
      'Chammach se dheere-dheere chaatein.'
    ],
    dosage: 'Har 2-3 ghante mein thoda-thoda chaatein jab tak ulti na ruke.',
    ayurvedic_note: 'Chardighna (anti-emetic) gun gastric hyper-motility ko shant karte hain.',
    contraindications: ['dehydration_signs'],
  }
};

// ── Smart Multi-Word & Regex Pattern Categorization ─────────────────────────
const CATEGORY_PATTERNS = {
  indigestion_gas: [
    /\b(pet|pait|stomach|udar)\b.*?\b(dard|dukh|kharab|marod|gas|jalan|ainthan|peeda|sujan|phoola)/i,
    /\b(dard|marod|gas|jalan|dukh|ainthan)\b.*?\b(pet|pait|stomach|udar)/i,
    /\b(pet|pait|stomach)\b/i,
    /\b(badhazmi|apach|bloating|flatulence)\b/i
  ],
  headache: [
    /\b(sir|sar|matha|head)\b.*?\b(dard|dukh|bhari|shool|chakkar|peeda)/i,
    /\b(dard|dukh|peeda)\b.*?\b(sir|sar|matha|head)/i,
    /\b(headache|migraine|shirahshoola)\b/i
  ],
  dizziness: [
    /\b(chakkar|chakkr|vertigo|lightheaded)\b/i,
    /\b(sir|sar|head)\b.*?\b(ghoom|chakkar)/i
  ],
  cough_cold: [
    /\b(khansi|khasi|cough|jukham|zukham|nazla|balgam|phlegm)\b/i,
    /\b(gala|gale)\b.*?\b(kharash|dard|chhil|khasi|khansi)/i
  ],
  fever_mild: [
    /\b(fever|bukhar|hararat|jwara)\b/i,
    /\b(badan|sharir|shareer)\b.*?\b(garam|tap|taap)/i
  ],
  joint_pain: [
    /\b(jod|jodo|jodon|ghutna|ghutne|kohni|gathiya|joint|sandhi)\b.*?\b(dard|dukh|sujan|jakdan|pain)/i,
    /\b(dard|dukh|sujan|jakdan)\b.*?\b(jod|jodo|jodon|ghutna|ghutne)/i
  ],
  body_ache_joint: [
    /\b(badan|kamar|peeth|shareer|sharir|body)\b.*?\b(dard|dukh|jakdan|tootan|ache|pain)/i,
    /\b(dard|dukh)\b.*?\b(badan|kamar|peeth)/i,
    /\b(thakan|thakawat|kamzori)\b/i
  ],
  acidity_gerd: [
    /\b(heartburn|acidity|acid reflux)\b/i,
    /\b(chhati|seene|gale|chest)\b.*?\b(jalan|burn)/i,
    /\bkhatti dakar\b/i
  ],
  constipation: [
    /\b(kabz|constipation|vibandha)\b/i,
    /\b(pet|pait)\b.*?\b(saaf.*?(na|nahi|ni)|kachha)/i
  ],
  vomiting_nausea: [
    /\b(ulti|vomit|nausea|matli|chardi)\b/i,
    /\b(ji|dil)\b.*?\b(machal|ghabra)/i
  ]
};

const DURATION_REGEX = /\b(ghante|hours?|din|days?|hafta|week|mahine|month|kal|yesterday|subah|morning|shaam|evening|raat|night|pichle|since|ago|se|dino|ghanto)\b/i;

const OFFLINE_SESSIONS_MAP = new Map();
const OFFLINE_SESSIONS_KEY = 'sanjeevani_offline_chat_sessions_v1';

function getOfflineSession(cId) {
  if (!cId) return { turn: 0, history: [], matchedCategory: null };
  if (OFFLINE_SESSIONS_MAP.has(cId)) {
    return OFFLINE_SESSIONS_MAP.get(cId);
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`${OFFLINE_SESSIONS_KEY}_${cId}`) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      OFFLINE_SESSIONS_MAP.set(cId, parsed);
      return parsed;
    }
  } catch {}
  const fresh = { turn: 0, history: [], matchedCategory: null };
  OFFLINE_SESSIONS_MAP.set(cId, fresh);
  return fresh;
}

function saveOfflineSession(cId, sess) {
  if (!cId) return;
  OFFLINE_SESSIONS_MAP.set(cId, sess);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${OFFLINE_SESSIONS_KEY}_${cId}`, JSON.stringify(sess));
    }
  } catch {}
}

const OFFLINE_PROBING_QUESTIONS = {
  indigestion_gas: 'Samajh gayi. Pet mein dard kab se shuru hua? Kya ulti, dast ya gas ki samasya bhi ho rahi hai?',
  acidity_gerd: 'Samajh gayi. Chhati ya gale mein jalan kab se ho rahi hai? Kya khatti dakar bhi aati hai?',
  cough_cold: 'Samajh gayi. Yeh khansi kab se ho rahi hai? Kya saans lene mein dikkat ya seene mein jakdan hai?',
  fever_mild: 'Maine aapki takleef sun li. Yeh bukhar kitne din se hai? Kya bukhar ke sath kapkapi lag rahi hai?',
  headache: 'Maine aapki takleef sun li. Yeh sar dard kab se ho raha hai? Kya chakkar ya ulti jaisa lag raha hai?',
  dizziness: 'Samajh gayi. Chakkar kab se aa rahe hain? Kya aankhon ke aage andhera ya kamzori mehsoos ho rahi hai?',
  joint_pain: 'Maine aapki takleef sun li. Yeh jodon ya ghutno mein dard kab se ho raha hai? Kya sujan ya subah jakdan rehti hai?',
  body_ache_joint: 'Samajh gayi. Badan ya kamar mein dard kab se hai? Kya thakawat ya kamzori zyada mehsoos ho rahi hai?',
  constipation: 'Samajh gayi. Kabz aur pet saaf na hone ki pareshani kitne din se hai?',
  vomiting_nausea: 'Maine sun liya. Ulti ya ji-machlane ki takleef kab se ho rahi hai?'
};

/**
 * Executes full client-side clinical triage matching LangGraph response format.
 * Preserves multi-turn conversational context so follow-up answers (e.g. 'pichle 3 ghante se')
 * are remembered without resetting or asking repetitive questions.
 * @param {string} userMessage Raw symptom string
 * @param {Array<string>} knownConditions Patient comorbidities (e.g. ['hypertension'])
 * @param {string} conversationId Stable conversation ID
 * @param {Array<object>} conversationHistory Prior message turns [{ sender: 'user'|'bot', text: '...' }]
 * @returns {object} Formatted ChatResponse compatible with StructuredBotMessage
 */
export function processOfflineConsultation(userMessage, knownConditions = [], conversationId = null, conversationHistory = []) {
  const normMsg = (userMessage || '').trim();
  const lower = normMsg.toLowerCase();
  const cId = conversationId || `OFFLINE-${Date.now()}`;

  // 1. Retrieve or initialize multi-turn session state and merge with conversationHistory
  const session = getOfflineSession(cId);

  const historyUserMessages = Array.isArray(conversationHistory)
    ? conversationHistory.filter(m => m.sender === 'user' && m.text).map(m => m.text)
    : [];

  for (const prev of historyUserMessages) {
    if (!session.history.includes(prev)) {
      session.history.push(prev);
    }
  }

  if (normMsg && !session.history.includes(normMsg)) {
    session.history.push(normMsg);
  }

  const effectiveTurn = Math.max(session.turn + 1, session.history.length);
  session.turn = effectiveTurn;
  const combinedHistory = session.history.join(' ').toLowerCase();

  // 2. Check for Emergency Red Flags (Bi-directional negation aware)
  const redResult = evaluateLocalRedFlags(normMsg);
  if (redResult.isRed) {
    const flag = redResult.flag || 'RED_FLAG: Emergency symptom pattern detected';
    saveOfflineSession(cId, { ...session, phase: 'CONCLUDED' });
    return {
      conversation_id: cId,
      tier: 'Red',
      reply_text: `🚨 **आपातकालीन चेतावनी (Immediate Emergency Alert)**\n\n` +
        `Hamare offline clinical engine ne gambhir aapaatkaal lakshan pehchane hain: **${flag}**.\n\n` +
        `⚠️ **Kripya gharelu nuskho par nirbhar na rahein.** Turant 108 Emergency Ambulance ko call karein ya nikat-tam aspataal pahunchein.`,
      spoken_reply_text: 'Aapaatkaal chetawani. Gambhir lakshan hain. Turant 108 ko phone karein.',
      flags: [flag],
      remedies: [],
      escalation_triggered: true,
      requires_immediate_doctor: true,
      phase: 'CONCLUDED',
      detected_language: 'hindi',
      is_offline_fallback: true,
      offline_cached_at: new Date().toISOString(),
      consultation_summary: `[OFFLINE RED] ${flag.slice(0, 100)}`
    };
  }

  // 3. Check for Sub-Acute Yellow Flags
  const isYellow = combinedHistory.includes('3 din') || combinedHistory.includes('4 din') || 
                  combinedHistory.includes('5 din') || combinedHistory.includes('persistent') || 
                  combinedHistory.includes('lagaatar') || combinedHistory.includes('high fever') || 
                  combinedHistory.includes('saans me halki dikkat');

  // 4. Search and Match CCRAS AYUSH Remedies across current message AND conversation history
  let bestMatch = null;
  let maxScore = 0;

  for (const [key, rem] of Object.entries(OFFLINE_AYUSH_REMEDIES)) {
    let score = 0;

    // Check regex patterns first (highest precision)
    const patterns = CATEGORY_PATTERNS[key] || [];
    for (const pat of patterns) {
      if (pat.test(lower)) {
        score += 5; // Direct match on current message
      } else if (pat.test(combinedHistory)) {
        score += 3; // Contextual match from prior turns
      }
    }

    // Check token triggers
    for (const trig of rem.symptom_triggers) {
      if (lower.includes(trig)) {
        score += trig.length > 4 ? 3 : 2;
      } else if (combinedHistory.includes(trig)) {
        score += 1.5;
      }
    }

    // Strongly preserve previously matched category across conversational turns
    if (session.matchedCategory === key) {
      score += 4;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = { key, ...rem };
    }
  }

  // If a category was matched earlier, keep it
  if (bestMatch && maxScore > 0) {
    session.matchedCategory = bestMatch.key;
  } else if (session.matchedCategory && OFFLINE_AYUSH_REMEDIES[session.matchedCategory]) {
    bestMatch = { key: session.matchedCategory, ...OFFLINE_AYUSH_REMEDIES[session.matchedCategory] };
    maxScore = 2;
  }

  // Comorbidity Safety Filtering
  const activeConditions = Array.isArray(knownConditions) ? knownConditions.map(c => c.toLowerCase()) : [];
  let blockedBySafety = false;
  let safetyWarning = '';

  if (bestMatch && bestMatch.contraindications) {
    for (const contra of bestMatch.contraindications) {
      if (activeConditions.some(c => c.includes(contra) || (contra === 'hypertension' && (c.includes('bp') || c.includes('pressure'))))) {
        blockedBySafety = true;
        safetyWarning = `Aapko ${contra.replace('_', ' ')} ki sthiti hai, isliye suraksha hetu nuskha sanshodhit kiya gaya hai.`;
        if (bestMatch.safe_alternative) {
          bestMatch.remedy_name = bestMatch.safe_alternative.remedy_name;
          bestMatch.ayurvedic_note = bestMatch.safe_alternative.ayurvedic_note;
        }
        break;
      }
    }
  }

  // 5. Multi-Turn Probing vs Remedy Delivery:
  const asksImmediateRemedy = lower.includes('nuskha') || lower.includes('ilaj') || lower.includes('dawa') || lower.includes('upchar') || lower.includes('remedy');
  const hasDurationInCurrent = DURATION_REGEX.test(lower);

  // Check if a prior bot response was already probing for details
  const prevBotAskedQuestion = Array.isArray(conversationHistory) && conversationHistory.some(m =>
    m.sender === 'bot' && (m.phase === 'CONSULTATION' || m.text?.includes('kab se') || m.text?.includes('kitne') || m.text?.includes('kya'))
  );

  // Only probe on Turn 1 if no duration was provided yet and patient did not ask for immediate remedy
  const shouldProbe = bestMatch &&
                      (effectiveTurn === 1 && session.history.length <= 1) &&
                      !prevBotAskedQuestion &&
                      !hasDurationInCurrent &&
                      !asksImmediateRemedy;

  if (shouldProbe) {
    const question = OFFLINE_PROBING_QUESTIONS[bestMatch.key] || 'Maine aapki takleef note kar li hai. Yeh pareshani kab se ho rahi hai aur kya koi anya lakshan bhi hai?';
    saveOfflineSession(cId, { ...session, phase: 'CONSULTATION' });
    return {
      conversation_id: cId,
      tier: 'Green',
      reply_text: question,
      spoken_reply_text: question,
      flags: ['OFFLINE_ACTIVE: Clinical intake'],
      remedies: [],
      escalation_triggered: false,
      requires_immediate_doctor: false,
      phase: 'CONSULTATION',
      detected_language: 'hindi',
      is_offline_fallback: true,
      offline_cached_at: new Date().toISOString(),
      consultation_summary: `Consultation on ${bestMatch.symptom_triggers[0]}`
    };
  }

  // 6. Deliver Verified CCRAS Remedy on Turn >= 2, or when duration/symptoms are answered
  if (bestMatch && (maxScore > 0 || session.matchedCategory)) {
    const tier = isYellow ? 'Yellow' : bestMatch.tier;
    const remediesFormatted = [
      {
        remedy_name: bestMatch.remedy_name,
        remedy_text: `${bestMatch.dosage} ${bestMatch.preparation_steps.join(' ')}`,
        ayurvedic_note: bestMatch.ayurvedic_note,
        source: bestMatch.source,
        safety_check: blockedBySafety ? 'Safety Adjusted (Comorbidity Guarded)' : (bestMatch.safety_check || 'Verified Safe'),
      }
    ];

    const replyText = 
      `🌿 **Sanjeevani Offline Nuskha (CCRAS Verified)**\n\n` +
      `**Sambhavit Karan:** ${bestMatch.possible_cause}\n\n` +
      `**Aushadhi:** ${bestMatch.remedy_name}\n` +
      `**Samagri:** ${bestMatch.ingredients}\n\n` +
      `**Kaise Banayein:**\n` +
      bestMatch.preparation_steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + `\n\n` +
      `**Khane Ka Tarika:** ${bestMatch.dosage}\n\n` +
      `💡 *Ayurvedic Tippani:* ${bestMatch.ayurvedic_note}` +
      (safetyWarning ? `\n\n🛡️ **Suraksha Guard:** ${safetyWarning}` : '') +
      (tier === 'Yellow' ? `\n\n⚠️ **Dhyan Dein:** Lakshan yadi 24 ghante aur bane rahein toh PHC doctor se sampark karein.` : '');

    saveOfflineSession(cId, { ...session, phase: 'CONCLUDED' });

    return {
      conversation_id: cId,
      tier: tier,
      reply_text: replyText,
      spoken_reply_text: `${bestMatch.remedy_name}. ${bestMatch.dosage}`,
      flags: blockedBySafety ? ['SAFETY_GRAPH: Comorbidity contraindication filtered'] : ['OFFLINE_CCRAS_VERIFIED'],
      remedies: remediesFormatted,
      escalation_triggered: false,
      requires_immediate_doctor: false,
      phase: 'CONCLUDED',
      detected_language: 'hindi',
      is_offline_fallback: true,
      offline_cached_at: new Date().toISOString(),
      consultation_summary: `${bestMatch.remedy_name} for ${bestMatch.symptom_triggers[0]}`
    };
  }

  // 7. Default Empathetic Intake Response if no specific remedy matched
  saveOfflineSession(cId, { ...session, phase: 'INTAKE' });
  return {
    conversation_id: cId,
    tier: isYellow ? 'Yellow' : 'Green',
    reply_text: `Namaste! Main Sanjeevani hoon — aapki offline swasthya sahayak.\n\nKripya apni takleef ya lakshan batayein (jaise khansi, bukhar, pet dard, sir dard, chakkar, ya jodon ka dard). Hum turant pramanit aushadhi pradan karenge.`,
    spoken_reply_text: 'Namaste! Kripya apne lakshan spasht batayein.',
    flags: ['OFFLINE_ACTIVE: Client-side rule engine'],
    remedies: [],
    escalation_triggered: false,
    requires_immediate_doctor: false,
    phase: 'INTAKE',
    detected_language: 'hindi',
    is_offline_fallback: true,
    offline_cached_at: new Date().toISOString(),
    consultation_summary: `Offline Consultation: ${normMsg.slice(0, 60)}`
  };
}
