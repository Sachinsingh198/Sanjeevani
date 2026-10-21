// ─────────────────────────────────────────────────────────────────────────────
// Client-side Red-Tier Triage Fail-Safe for Sanjeevani
// Deliberately conservative fail-safe to prevent emergency downgrade during offline/network drops; not a full triage replacement.
// ─────────────────────────────────────────────────────────────────────────────

export const NEGATION_CUES = new Set([
  'no', 'not', 'without', 'denies', 'never',
  'nahi', 'nahin', 'na', 'bina', 'mat', 'ni'
]);

export const MULTI_WORD_NEGATION_CUES = [
  'free of', 'koi nahi', 'koi nahin', 'ni cha', 'ni chha'
];

export const RED_PATTERNS = {
  cardiac_chest_pain: [
    /\bchest\s+(?:tightness|pressure|pain|discomfort)\b/i,
    /\b(?:pressure|pain|tightness|heaviness|crushing\s+pain)\s+(?:in\s+(?:the\s+|my\s+)?)?chest\b/i,
    /\bcrushing\s+(?:chest\s+)?pain\b/i,
    /\b(?:seene|chhati|dil)\s+(?:me\s+)?(?:\w+\s+){0,3}(?:dard|dabav|jalan)\b/i,
    /\bchhati\s+ma\s+(?:bhari\s+)?(?:peed|peer)\b/i,
    /(?:सीने|छाती|दिल)\s+(?:में|मा\s+)?(?:\S+\s+){0,3}(?:दर्द|दबाव|जकड़न|जलन)/i,
    /\bleft\s+arm\s+pain\b/i,
    /\bheart\s+(?:pain|attack)\b/i
  ],
  acute_respiratory_distress: [
    /\b(?:shortness\s+of\s+breath|difficulty\s+breathing|cannot\s+breathe|hardly\s+breathe|unable\s+to\s+breathe|gasping)\b/i,
    /\bsaans\s+(?:lene\s+me\s+)?(?:\w+\s+){0,2}(?:takleef|dikkat|phoolna|phool\s+rahi)\b/i,
    /\bsaans\s+(?:ni\s+aani|lene\s+ma\s+khati\s+takleef)\b/i,
    /(?:सांस|साँस)\s+(?:लेने\s+में|मा\s+)?(?:\S+\s+){0,2}(?:तकलीफ|दिक्कत|फूलना)/i,
    /दम\s+घुट/i,
    /\bdum\s+ghutna\b/i,
    /\bghutan\s+ho\s+rahi\b/i,
    /\b(?:hont|lips)\s+(?:neele|blue)\b/i,
    /\b(?:turning\s+blue|cyanosis)\b/i,
    /\b(?:stridor|squeaking\s+noise\s+when\s+breathing|wheezing\s+severely)\b/i,
    /\bthroat\s+(?:is\s+)?swelling\b/i
  ],
  altered_mental_status: [
    /\b(?:unconscious|unresponsive|fainted|passed\s+out|seizures?|convulsions?|fits?)\b/i,
    /\b(?:behosh|daura|chakkar\s+khakar\s+girna|jhatke\s+aa\s+rahe|hosh\s+me\s+nahi|gir\s+pada)\b/i,
    /(?:बेहोश|दौरा|चक्कर\s+खाकर\s+गिर|झटके)/i
  ],
  severe_hemorrhage: [
    /\b(?:heavy\s+bleeding|coughing\s+blood|vomiting\s+blood|bleeding\s+profusely)\b/i,
    /\bkhoon\s+ki\s+(?:ulti|khasi)\b/i,
    /\b(?:taaza|fresh|deep\s+red)\s+khoon\b/i,
    /\b(?:khoon\s+nikal|khoon\s+beh)\s+raha\b/i,
    /खून\s+की\s+(?:उल्टी|खांसी|खाँसी)/i,
    /(?:ज्यादा\s+खून|ताज़ा\s+खून|गहरा\s+लाल\s+खून)\s+बह/i,
    /\bzyada\s+khoon\s+behna\b/i,
    /\b(?:pathar\s+jaisa\s+sakht|board-like\s+rigidity|sakht\s+pet)\b/i
  ],
  infant_high_fever: [
    /\b(?:infant|baby|newborn)\s+high\s+fever\b/i,
    /\b(?:navjaat|chote\s+bachhe|bachhe)\s+(?:ko\s+)?(?:\w+\s+){0,3}(?:tezz\s+bukhar|10[3-6]\s*degree)\b/i,
    /(?:नवजात|छोटे\s+बच्चे)\s+(?:को\s+)?(?:\S+\s+){0,2}तेज\s+बुखार/i,
    /\b10[3-6]\s*(?:degree|°|f)\b/i
  ],
  anaphylaxis_stroke: [
    /\b(?:face\s+drooping|facial\s+droop|slurred\s+speech|throat\s+closing|lips\s+blue|throat\s+swelling)\b/i,
    /\b(?:chehra\s+tedha|gala\s+band\s+hona|muh\s+tedha|chehra\s+dhalak|jaban\s+ladkhada)\b/i,
    /\b(?:arm|haath|shareer)\s+(?:has\s+)?gone\s+(?:completely\s+)?numb\b/i,
    /\b(?:hath|haath)\s+sunn\b/i,
    /(?:चेहरा\s+टेढ़ा|गला\s+बंद|मुंह\s+टेढ़ा|चेहरे\s+का\s+एक\s+तरफ\s+ढलक|जबान\s+लड़खड़ा)/i,
    /\bthroat\s+(?:is\s+)?swelling\s+shut\b/i
  ]
};

const NEGATION_WINDOW = 35;

export function isNegated(text, matchStart, matchEnd) {
  const preStart = Math.max(0, matchStart - NEGATION_WINDOW);
  const precedingText = text.slice(preStart, matchStart).toLowerCase();
  for (const phrase of MULTI_WORD_NEGATION_CUES) {
    if (precedingText.includes(phrase)) return true;
  }
  const preTokens = precedingText.match(/\b\w+\b/g) || [];
  if (preTokens.some(cue => NEGATION_CUES.has(cue))) {
    return true;
  }

  const postEnd = Math.min(text.length, matchEnd + NEGATION_WINDOW);
  const succeedingText = text.slice(matchEnd, postEnd).toLowerCase();
  for (const phrase of MULTI_WORD_NEGATION_CUES) {
    if (succeedingText.includes(phrase)) return true;
  }
  const postTokens = succeedingText.match(/\b\w+\b/g) || [];
  if (postTokens.some(cue => NEGATION_CUES.has(cue))) {
    return true;
  }

  return false;
}

/**
 * Evaluates raw text for emergency red-flag symptoms with bi-directional negation detection.
 * @param {string} text Raw patient input
 * @returns {{ isRed: boolean, flag?: string }}
 */
export function evaluateLocalRedFlags(text) {
  if (!text || typeof text !== 'string') return { isRed: false };
  const normalized = text.toLowerCase();

  for (const [category, patterns] of Object.entries(RED_PATTERNS)) {
    for (const pattern of patterns) {
      // Use exec in a loop with global flag regex or find matches
      const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      let match;
      while ((match = regex.exec(normalized)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        if (!isNegated(normalized, matchStart, matchEnd)) {
          return {
            isRed: true,
            flag: `CLIENT_FALLBACK_FLAG: possible emergency (${category}: '${match[0]}') — network unavailable, please call 108`
          };
        }
      }
    }
  }

  return { isRed: false };
}
