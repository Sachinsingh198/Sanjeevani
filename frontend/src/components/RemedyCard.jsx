import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Leaf, Volume2, Square, Clock, AlertCircle, Sparkles
} from 'lucide-react';
import { speakText, stopAllVoiceAudio } from '../api/voiceClient';
import { useLanguage } from '../context/LanguageContext';

/**
 * Universal Botanical and Kitchen Ingredient Dictionary
 * Provides clean pictograms and names for common household remedies.
 */
const INGREDIENT_LOOKUP = [
  { keys: ['tulsi', 'holy basil'], nameHi: 'तुलसी', icon: '🌿', amount: '5-7 ताज़ा पत्ते' },
  { keys: ['mulethi', 'licorice', 'yashtimadhu'], nameHi: 'मुलेठी', icon: '🪵', amount: '1/2 छोटा चम्मच' },
  { keys: ['adrak', 'ginger', 'sunthi', 'saunth'], nameHi: 'अदरक / सोंठ', icon: '🫚', amount: 'छोटा कुचला टुकड़ा' },
  { keys: ['jeera', 'cumin'], nameHi: 'जीरा', icon: '🌾', amount: '1 छोटा चम्मच' },
  { keys: ['ajwain', 'carom'], nameHi: 'अजवाइन', icon: '🌾', amount: '1/2 छोटा चम्मच' },
  { keys: ['haldi', 'turmeric'], nameHi: 'हल्दी', icon: '🟡', amount: '1/4 छोटा चम्मच' },
  { keys: ['shahad', 'honey', 'madhu'], nameHi: 'शहद', icon: '🍯', amount: '1 चम्मच' },
  { keys: ['ghee', 'ghrita'], nameHi: 'देसी घी', icon: '🧈', amount: '1/2 चम्मच' },
  { keys: ['namak', 'salt', 'saindhava', 'kala namak'], nameHi: 'सेंधा नमक', icon: '🧂', amount: 'एक चुटकी' },
  { keys: ['water', 'paani', 'kwath'], nameHi: 'गुनगुना पानी', icon: '💧', amount: '1-2 कप' },
  { keys: ['nimbu', 'lemon'], nameHi: 'नींबू', icon: '🍋', amount: '3-4 बूंदें' },
  { keys: ['amla', 'amalaki'], nameHi: 'आंवला', icon: '🍈', amount: '1 फल या 1 चम्मच रस' },
  { keys: ['chaach', 'buttermilk', 'takra'], nameHi: 'छाछ', icon: '🥛', amount: '1 गिलास' },
  { keys: ['laung', 'clove', 'lavanga'], nameHi: 'लौंग', icon: '🤎', amount: '1-2 लौंग' },
  { keys: ['dalchini', 'cinnamon'], nameHi: 'दालचीनी', icon: '🪵', amount: 'छोटा टुकड़ा' },
  { keys: ['elaichi', 'cardamom'], nameHi: 'हरी इलायची', icon: '🟢', amount: '1-2 कुचली हुई' },
  { keys: ['kali mirch', 'black pepper', 'maricha'], nameHi: 'काली मिर्च', icon: '⚫', amount: '2-3 दाने कुचले हुए' },
  { keys: ['pudina', 'mint'], nameHi: 'पुदीना पत्ते', icon: '🌱', amount: '6-8 ताज़ा पत्ते' },
  { keys: ['saunf', 'fennel'], nameHi: 'सौंफ', icon: '🌿', amount: '1 छोटा चम्मच' },
  { keys: ['draksha', 'munakka', 'raisin'], nameHi: 'मुनक्का / किशमिश', icon: '🍇', amount: '5-6 दाने' },
  { keys: ['triphala'], nameHi: 'त्रिफला चूर्ण', icon: '🥣', amount: '1/2 छोटा चम्मच' },
  { keys: ['ashwagandha'], nameHi: 'अश्वगंधा', icon: '🪴', amount: '1/2 छोटा चम्मच' },
  { keys: ['til taila', 'sesame oil', 'sarson'], nameHi: 'तिल / सरसों का तेल', icon: '🫒', amount: 'हल्का गुनगुना मालिश हेतु' }
];

function extractIngredients(remedyText, remedyName) {
  const combined = `${remedyName || ''} ${remedyText || ''}`.toLowerCase();
  const matched = [];
  const matchedKeys = new Set();

  for (const item of INGREDIENT_LOOKUP) {
    for (const key of item.keys) {
      if (combined.includes(key) && !matchedKeys.has(item.nameHi)) {
        matched.push(item);
        matchedKeys.add(item.nameHi);
        break;
      }
    }
  }

  if (matched.length === 0) {
    matched.push(
      { nameHi: 'औषधीय जड़ी-बूटी', icon: '🌿', amount: 'निर्दिष्ट मात्रा अनुसार' },
      { nameHi: 'गुनगुना पानी', icon: '💧', amount: '1 कप' }
    );
  }

  return matched.slice(0, 4);
}

function parseSteps(remedyText) {
  if (!remedyText) return [];
  const text = remedyText.trim();
  
  // Try matching numbered or bullet points
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const steps = [];
  
  for (const line of lines) {
    const cleaned = line.replace(/^(?:\d+[\.\)]|\-|\*|•)\s*/, '').trim();
    if (cleaned.length > 10 && !cleaned.toLowerCase().startsWith('dhyan') && !cleaned.toLowerCase().startsWith('savdhani')) {
      steps.push(cleaned);
    }
  }

  if (steps.length >= 2) return steps.slice(0, 3);

  // If text is a paragraph, split by full stops or Hindi danda
  const sentences = text.split(/(?:।|\.)\s+/).map(s => s.trim()).filter(s => s.length > 12);
  if (sentences.length >= 2) return sentences.slice(0, 3);

  return [text];
}

export default function RemedyCard({ remedy, remedies, index = 0 }) {
  const { language } = useLanguage();
  const l = (hi, en) => (language === 'english' ? en : hi);

  // Support single remedy or multi-remedy list
  const list = remedies && remedies.length > 0 ? remedies : (remedy ? [remedy] : []);
  const [activeTab, setActiveTab] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      stopAllVoiceAudio();
    };
  }, []);

  if (list.length === 0) return null;

  const currentRemedy = list[activeTab] || list[0] || {};
  const remedyName = currentRemedy.remedy_name || l('घरेलू आयुर्वेदिक नुस्खा', 'Ayurvedic Home Remedy');
  const remedyText = currentRemedy.remedy_text || '';
  const ingredients = extractIngredients(remedyText, remedyName);
  const steps = parseSteps(remedyText);

  // Dosage resolution
  let dosageText = l('दिन में 1-2 बार, भोजन के बाद गुनगुने पानी के साथ लें।', 'Take 1-2 times daily after meals with lukewarm water.');
  if (currentRemedy.dosage) {
    if (typeof currentRemedy.dosage === 'string') {
      dosageText = currentRemedy.dosage;
    } else if (typeof currentRemedy.dosage === 'object') {
      dosageText = currentRemedy.dosage.adult || currentRemedy.dosage.hindi || dosageText;
    }
  }

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      stopAllVoiceAudio();
      setIsSpeaking(false);
    } else {
      const speechParts = [
        `नुस्खे का नाम: ${remedyName}।`,
        `सामग्री: ${ingredients.map(i => `${i.nameHi} ${i.amount}`).join(', ')}।`,
        `बनाने का तरीका: ${steps.join('। ')}।`,
        `खुराक: ${dosageText}।`,
        'दो से तीन दिन में आराम न आए तो एक सौ चार पर कॉल करें।'
      ];
      setIsSpeaking(true);
      speakText(speechParts.join(' '), {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#131E2B] rounded-2xl border border-sage/20 dark:border-gray-700 shadow-sm overflow-hidden transition-all my-2.5">
      {/* ── MULTI-REMEDY TABS (If more than 1 remedy) ── */}
      {list.length > 1 && (
        <div className="flex border-b border-sage/15 dark:border-gray-800 bg-mist/50 dark:bg-[#0F1722] p-1.5 gap-1.5">
          {list.map((r, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveTab(idx);
                stopAllVoiceAudio();
                setIsSpeaking(false);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === idx
                  ? 'bg-white dark:bg-gray-800 text-sage dark:text-booti-glow shadow-xs border border-sage/20 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span>{idx === 0 ? '🌿' : '✨'}</span>
              <span>{idx === 0 ? l('मुख्य नुस्खा', 'Primary Remedy') : l('वैकल्पिक नुस्खा', 'Alternative')}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── CARD HEADER ── */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-sage/10 via-emerald-50/50 to-transparent dark:from-sage/20 dark:via-[#162330] dark:to-transparent border-b border-sage/15 dark:border-gray-800/80 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sage/20 dark:bg-sage/30 flex items-center justify-center text-sage dark:text-booti-glow shrink-0 shadow-xs mt-0.5">
            <Leaf className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-base sm:text-lg font-bold text-primary dark:text-[#F4F6F0] leading-snug">
                {remedyName}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300/50">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{l('आयुष प्रमाणित', 'AYUSH Verified')}</span>
              </span>
            </div>
            {currentRemedy.source && (
              <p className="text-[11px] text-muted dark:text-gray-400 mt-0.5 font-medium truncate">
                {currentRemedy.source}
              </p>
            )}
          </div>
        </div>

        {/* Compact Voice Speaker Button */}
        <button
          type="button"
          onClick={handleVoiceToggle}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isSpeaking
              ? 'bg-rose-500 text-white border-rose-600 shadow-sm animate-pulse'
              : 'bg-white dark:bg-gray-800 text-sage dark:text-booti-glow hover:bg-sage/10 border-sage/25 dark:border-gray-700 shadow-xs'
          }`}
          title={isSpeaking ? l('आवाज़ रोकें', 'Stop Audio') : l('नुस्खा बोलकर सुनें', 'Listen Aloud')}
        >
          {isSpeaking ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{l('रोकें', 'Stop')}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>{l('सुनें', 'Listen')}</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* ── 1. INGREDIENTS SHELF ── */}
        <div>
          <div className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🌿</span> {l('ज़रूरी सामग्री:', 'Key Ingredients:')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ingredients.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-mist/60 dark:bg-gray-800/50 border border-sage/15 dark:border-gray-700/60 flex items-center gap-2"
              >
                <span className="text-xl shrink-0" role="img" aria-label={item.nameHi}>
                  {item.icon}
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="font-bold text-xs text-primary dark:text-[#EAEFEA] truncate">
                    {item.nameHi}
                  </div>
                  <div className="text-[10px] text-muted dark:text-gray-400 font-medium truncate">
                    {item.amount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. PREPARATION METHOD (Numbered Steps) ── */}
        <div>
          <div className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🥣</span> {l('बनाने की सरल विधि:', 'Simple Preparation Method:')}
          </div>
          <div className="space-y-1.5">
            {steps.map((st, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-mist/40 dark:bg-gray-800/30 border border-sage/10 dark:border-gray-700/40 text-xs text-primary dark:text-gray-200"
              >
                <span className="w-5 h-5 rounded-full bg-sage/15 dark:bg-sage/30 text-sage dark:text-booti-glow font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="leading-relaxed font-medium">
                  {st}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. DOSAGE & CONSUMPTION BANNER ── */}
        <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-xs">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-300">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-emerald-800 dark:text-emerald-300 mr-1.5">
              {l('सेवन का समय व खुराक:', 'When & How to Take:')}
            </span>
            <span className="text-emerald-900 dark:text-emerald-100 font-medium">
              {dosageText}
            </span>
          </div>
        </div>

        {/* ── 4. SAFETY ADVISORY FOOTER ── */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[11px] leading-tight">
            <span className="font-bold">{l('ज़रूरी सलाह: ', 'Important Advisory: ')}</span>
            {l(
              '2 से 3 दिन में राहत न मिलने या तकलीफ़ बढ़ने पर 104 पर कॉल करें या नजदीकी PHC चिकित्सक से संपर्क करें।',
              'If symptoms persist beyond 2-3 days, call 104 or visit the nearest PHC immediately.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
