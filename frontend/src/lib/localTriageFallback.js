// ─────────────────────────────────────────────────────────────────────────────
// Client-side Red-Tier Triage Fail-Safe for Sanjeevani
// Deliberately conservative fail-safe to prevent emergency downgrade during offline/network drops; not a full triage replacement.
// ─────────────────────────────────────────────────────────────────────────────

export const NEGATION_CUES = new Set([
  'no', 'not', 'without', 'denies', 'never',
  'nahi', 'nahin', 'na', 'bina', 'mat'
]);

export const MULTI_WORD_NEGATION_CUES = [
  'free of', 'koi nahi', 'koi nahin'
];

export const RED_PATTERNS = {
  cardiac_chest_pain: [
    /\bchest\s+(?:tightness|pressure|pain|discomfort)\b/i,
    /\b(?:pressure|pain|tightness|heaviness)\s+(?:in\s+(?:the\s+|my\s+)?)?chest\b/i,
    /\b(?:seene|chhati|dil)\s+(?:me\s+)?(?:\w+\s+){0,3}dard\b/i,
    /\bleft\s+arm\s+pain\b/i,
    /\bheart\s+pain\b/i
  ],
  acute_respiratory_distress: [
    /\b(?:shortness\s+of\s+breath|difficulty\s+breathing|cannot\s+breathe|gasping)\b/i,
    /\bsaans\s+(?:lene\s+me\s+)?(?:\w+\s+){0,2}(?:takleef|dikkat|phoolna)\b/i,
    /\bdum\s+ghutna\b/i,
    /\bghutan\s+ho\s+rahi\b/i
  ],
  altered_mental_status: [
    /\b(?:unconscious|unresponsive|fainted|passed\s+out|seizure|convulsion)\b/i,
    /\b(?:behosh|daura|chakkar\s+khakar\s+girna)\b/i
  ],
  severe_hemorrhage: [
    /\b(?:heavy\s+bleeding|coughing\s+blood|vomiting\s+blood|bleeding\s+profusely)\b/i,
    /\bkhoon\s+ki\s+(?:ulti|khasi)\b/i,
    /\bzyada\s+khoon\s+behna\b/i
  ],
  infant_high_fever: [
    /\b(?:infant|baby|newborn)\s+high\s+fever\b/i,
    /\b(?:navjaat|chote\s+bachhe)\s+(?:ko\s+)?(?:\w+\s+){0,2}tezz\s+bukhar\b/i
  ],
  anaphylaxis_stroke: [
    /\b(?:face\s+drooping|slurred\s+speech|throat\s+closing|lips\s+blue)\b/i,
    /\b(?:chehra\s+tedha|gala\s+band\s+hona|muh\s+tedha)\b/i
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
