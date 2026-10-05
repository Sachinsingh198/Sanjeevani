import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, ArrowLeftRight, Check, Sparkles, RefreshCw, User, Play, Square, Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { getVoiceProviderConfig, setVoiceProviderConfig, previewVoiceAudio, stopAllVoiceAudio, getCachedVoiceConfig } from '../api/voiceClient';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const DEFAULT_SARVAM_MODELS = [
  {
    id: 'bulbul:v3',
    nameHi: 'बुलबुल v3 (अल्ट्रा HD न्यूरल)',
    nameEn: 'Bulbul v3 (Ultra HD Neural)',
    name: 'Bulbul v3',
    descHi: 'नवीनतम हाई-डेफिनिशन न्यूरल वाणी मॉडल — प्राकृतिक व स्पष्ट उच्चारण',
    descEn: 'Latest high-definition neural voice model — natural and crisp pronunciation',
  },
];

const DEFAULT_SARVAM_SPEAKERS = [
  { id: 'meera', nameHi: 'मीरा', nameEn: 'Meera', name: 'Meera', gender: 'female', sampleHi: 'नमस्ते, मैं मीरा हूँ। संजीवनी स्वास्थ्य परामर्श में आपका स्वागत है।', sampleEn: 'Hello, I am Meera. Welcome to Sanjeevani health consultation.' },
  { id: 'ananya', nameHi: 'अनन्या', nameEn: 'Ananya', name: 'Ananya', gender: 'female', sampleHi: 'नमस्कार, मैं अनन्या हूँ। आपके स्वास्थ्य से जुड़ी किसी भी समस्या के लिए मैं यहाँ हूँ।', sampleEn: 'Hello, I am Ananya. I am here for all your health queries.' },
  { id: 'ritu', nameHi: 'रितु', nameEn: 'Ritu', name: 'Ritu', gender: 'female', sampleHi: 'नमस्ते जी, मैं रितु हूँ। शांत मन और स्वस्थ जीवन के लिए परामर्श शुरू करें।', sampleEn: 'Hello, I am Ritu. Let us begin consultation for a calm mind and healthy life.' },
  { id: 'priya', nameHi: 'प्रिया', nameEn: 'Priya', name: 'Priya', gender: 'female', sampleHi: 'प्रणाम, मैं प्रिया हूँ। संजीवनी एआई परामर्श सेवा में आपका स्वागत है।', sampleEn: 'Greetings, I am Priya. Welcome to Sanjeevani AI consultation service.' },
  { id: 'kavya', nameHi: 'काव्या', nameEn: 'Kavya', name: 'Kavya', gender: 'female', sampleHi: 'नमस्कार, मैं काव्या हूँ। संजीवनी सेवा में आपका हार्दिक स्वागत है।', sampleEn: 'Greetings, I am Kavya. A warm welcome to Sanjeevani service.' },
  { id: 'shreya', nameHi: 'श्रेया', nameEn: 'Shreya', name: 'Shreya', gender: 'female', sampleHi: 'नमस्ते, मैं डॉ. श्रेया हूँ। स्वास्थ्य जांच में मैं आपकी सहायता करूँगी।', sampleEn: 'Hello, I am Dr. Shreya. I will assist you with your health assessment.' },
  { id: 'shubh', nameHi: 'शुभ', nameEn: 'Shubh', name: 'Shubh', gender: 'male', sampleHi: 'नमस्कार, मैं शुभ हूँ। अपनी स्वास्थ्य समस्या मुझे विस्तार से बताएं।', sampleEn: 'Greetings, I am Shubh. Please share your health symptoms in detail.' },
  { id: 'arjun', nameHi: 'अर्जुन', nameEn: 'Arjun', name: 'Arjun', gender: 'male', sampleHi: 'प्रणाम, मैं अर्जुन हूँ। पहाड़ों के मौसम और सेहत के लिए परामर्श लें।', sampleEn: 'Greetings, I am Arjun. Feel free to seek consultation for health in mountain weather.' },
  { id: 'rahul', nameHi: 'राहुल', nameEn: 'Rahul', name: 'Rahul', gender: 'male', sampleHi: 'नमस्कार, मैं राहुल हूँ। आज आपका स्वास्थ्य कैसा है?', sampleEn: 'Hello, I am Rahul. How are you feeling today?' },
  { id: 'aditya', nameHi: 'आदित्य', nameEn: 'Aditya', name: 'Aditya', gender: 'male', sampleHi: 'नमस्ते, मैं डॉ. आदित्य हूँ। संजीवनी में आपका स्वागत है।', sampleEn: 'Hello, I am Dr. Aditya. Welcome to Sanjeevani.' },
  { id: 'amit', nameHi: 'अमित', nameEn: 'Amit', name: 'Amit', gender: 'male', sampleHi: 'नमस्कार, मैं डॉ. अमित हूँ। आज आपकी सेहत कैसी है?', sampleEn: 'Greetings, I am Dr. Amit. How is your health today?' },
  { id: 'dev', nameHi: 'देव', nameEn: 'Dev', name: 'Dev', gender: 'male', sampleHi: 'प्रणाम, मैं देव हूँ। संजीवनी स्वास्थ्य परामर्श में आपका स्वागत है।', sampleEn: 'Greetings, I am Dev. Welcome to Sanjeevani health consultation.' },
];

const DEFAULT_SARVAM_SPEAKERS_BY_MODEL = {
  'bulbul:v3': DEFAULT_SARVAM_SPEAKERS,
  'bulbul:v2': DEFAULT_SARVAM_SPEAKERS,
};

const DEFAULT_BHASHINI_MODELS = [
  {
    id: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
    nameHi: 'कोकी इंडो-आर्यन',
    nameEn: 'Coqui Indo-Aryan',
    name: 'Coqui Indo-Aryan',
    descHi: 'AI4Bharat राष्ट्रीय वाणी मॉडल — हिंदी, पहाड़ी (गढ़वाली/कुमाऊँनी) व उत्तर भारतीय भाषाएँ',
    descEn: 'AI4Bharat National Voice Model — Hindi, Pahari (Garhwali/Kumaoni) and North Indian languages',
  },
  {
    id: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4',
    nameHi: 'कोकी द्रविड़ियन',
    nameEn: 'Coqui Dravidian',
    name: 'Coqui Dravidian',
    descHi: 'AI4Bharat राष्ट्रीय वाणी मॉडल — दक्षिण भारतीय भाषाएँ (तमिल, तेलुगु, कन्नड़, मलयालम)',
    descEn: 'AI4Bharat National Voice Model — South Indian languages (Tamil, Telugu, Kannada, Malayalam)',
  },
];

const DEFAULT_BHASHINI_GENDERS = [
  { id: 'female', nameHi: 'महिला स्वर', nameEn: 'Female Voice', name: 'Female Voice', sampleHi: 'नमस्ते! यह भाषिणी राष्ट्रीय महिला वाणी मॉडल का पूर्वावलोकन है।', sampleEn: 'Hello! This is a preview of the Bhashini national female voice model.' },
  { id: 'male', nameHi: 'पुरुष स्वर', nameEn: 'Male Voice', name: 'Male Voice', sampleHi: 'नमस्कार! यह भाषिणी राष्ट्रीय पुरुष वाणी मॉडल का पूर्वावलोकन है।', sampleEn: 'Hello! This is a preview of the Bhashini national male voice model.' },
];

const getSpeakerName = (spk, isHindi) => {
  if (!spk) return '';
  if (spk.nameHi && spk.nameEn) {
    return isHindi ? spk.nameHi : spk.nameEn;
  }
  if (!spk.name) return spk.id || '';
  const match = spk.name.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    const part1 = match[1].trim();
    const part2 = match[2].trim();
    const isPart1Dev = /[\u0900-\u097F]/.test(part1);
    if (isPart1Dev) {
      return isHindi ? part1 : part2;
    } else {
      return isHindi ? part2 : part1;
    }
  }
  return spk.name;
};

const getModelLabel = (model, isHindi) => {
  if (!model) return '';
  if (model.nameHi && model.nameEn) {
    return isHindi ? model.nameHi : model.nameEn;
  }
  if (!model.name) return model.id || '';
  const match = model.name.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    const part1 = match[1].trim();
    const part2 = match[2].trim();
    const isPart1Dev = /[\u0900-\u097F]/.test(part1);
    if (isPart1Dev) {
      return isHindi ? part1 : part2;
    } else {
      return isHindi ? part2 : part1;
    }
  }
  return model.name;
};

const getModelDesc = (model, isHindi) => {
  if (!model) return '';
  if (model.descHi && model.descEn) {
    return isHindi ? model.descHi : model.descEn;
  }
  return model.desc || '';
};

const getGenderLabel = (g, isHindi) => {
  if (!g) return '';
  if (g.nameHi && g.nameEn) {
    return isHindi ? g.nameHi : g.nameEn;
  }
  if (g.id === 'female' || g === 'female') return isHindi ? 'महिला स्वर' : 'Female Voice';
  if (g.id === 'male' || g === 'male') return isHindi ? 'पुरुष स्वर' : 'Male Voice';
  return g.name || g;
};

/**
 * VoiceProviderSwitcher
 *
 * Allows 1-click runtime switching between Bhashini AI (Government of India Indic Engine)
 * and Sarvam AI (Bulbul:v3/v2 Neural Indic Voice), plus model and speaker customization
 * with interactive audio preview before selection.
 */
export default function VoiceProviderSwitcher({
  compact = false,
  mode = 'dropdown', // 'dropdown' | 'compact' | 'settings-card'
  className = '',
}) {
  const { l, isHindi } = useLanguage();
  const [config, setConfig] = useState(() => {
    const cached = getCachedVoiceConfig();
    const currentModel = cached?.sarvam_model || 'bulbul:v3';
    const speakersByModel = cached?.available_sarvam_speakers_by_model || DEFAULT_SARVAM_SPEAKERS_BY_MODEL;
    return {
      primary: cached?.primary || cached?.provider || 'bhashini',
      fallback: cached?.fallback || 'sarvam',
      offline_fallback: 'neural_indic',
      sarvam_model: currentModel,
      sarvam_speaker: cached?.sarvam_speaker || 'meera',
      bhashini_model: cached?.bhashini_model || 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
      bhashini_gender: cached?.bhashini_gender || 'female',
      tts_speed: cached?.tts_speed || 1.0,
      available_sarvam_models: cached?.available_sarvam_models?.length ? cached.available_sarvam_models : DEFAULT_SARVAM_MODELS,
      available_sarvam_speakers: speakersByModel[currentModel] || DEFAULT_SARVAM_SPEAKERS,
      available_sarvam_speakers_by_model: speakersByModel,
      available_bhashini_models: cached?.available_bhashini_models?.length ? cached.available_bhashini_models : DEFAULT_BHASHINI_MODELS,
      available_bhashini_genders: cached?.available_bhashini_genders?.length ? cached.available_bhashini_genders : DEFAULT_BHASHINI_GENDERS,
    };
  });

  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState(null); // id of voice currently playing
  const [expandedDetails, setExpandedDetails] = useState(true); // for settings-card
  const cancelPreviewRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getVoiceProviderConfig()
      .then((cfg) => {
        if (mounted && cfg) {
          const speakersByModel = cfg.available_sarvam_speakers_by_model || DEFAULT_SARVAM_SPEAKERS_BY_MODEL;
          const currentModel = cfg.sarvam_model || 'bulbul:v3';
          const modelSpeakers = speakersByModel[currentModel] || speakersByModel['bulbul:v3'] || DEFAULT_SARVAM_SPEAKERS;

          setConfig((prev) => ({
            ...prev,
            ...cfg,
            available_sarvam_models: cfg.available_sarvam_models?.length ? cfg.available_sarvam_models : DEFAULT_SARVAM_MODELS,
            available_sarvam_speakers: modelSpeakers,
            available_sarvam_speakers_by_model: speakersByModel,
            available_bhashini_models: cfg.available_bhashini_models?.length ? cfg.available_bhashini_models : DEFAULT_BHASHINI_MODELS,
            available_bhashini_genders: cfg.available_bhashini_genders?.length ? cfg.available_bhashini_genders : DEFAULT_BHASHINI_GENDERS,
          }));
        }
      })
      .catch((err) => console.warn('Could not load voice provider config:', err));

    return () => {
      mounted = false;
      stopAllVoiceAudio();
      cancelPreviewRef.current?.();
    };
  }, []);

  const handleUpdateConfig = async (patch) => {
    setLoading(true);
    try {
      const updated = {
        provider: patch.provider ?? config.primary,
        sarvam_model: patch.sarvam_model ?? config.sarvam_model,
        sarvam_speaker: patch.sarvam_speaker ?? config.sarvam_speaker,
        bhashini_model: patch.bhashini_model ?? config.bhashini_model,
        bhashini_gender: patch.bhashini_gender ?? config.bhashini_gender,
        tts_speed: patch.tts_speed ?? config.tts_speed,
        clear_cache: true,
      };
      const res = await setVoiceProviderConfig(updated);
      setConfig((prev) => {
        const nextCfg = { ...prev, ...res };
        const speakersByModel = nextCfg.available_sarvam_speakers_by_model || prev.available_sarvam_speakers_by_model || DEFAULT_SARVAM_SPEAKERS_BY_MODEL;
        const currentModel = nextCfg.sarvam_model || 'bulbul:v3';
        nextCfg.available_sarvam_speakers = speakersByModel[currentModel] || speakersByModel['bulbul:v3'] || DEFAULT_SARVAM_SPEAKERS;
        return nextCfg;
      });
      if (patch.provider) {
        const primaryName = patch.provider === 'bhashini' ? (isHindi ? 'भाषिणी AI' : 'Bhashini AI') : (isHindi ? 'सर्वम AI' : 'Sarvam AI');
        const fallbackName = patch.provider === 'bhashini' ? (isHindi ? 'सर्वम AI' : 'Sarvam AI') : (isHindi ? 'भाषिणी AI' : 'Bhashini AI');
        toast.success(l(`🎙️ प्राथमिक: ${primaryName} • बैकअप: ${fallbackName}`, `🎙️ Primary: ${primaryName} • Fallback: ${fallbackName}`), { duration: 3500 });
      } else {
        toast.success(l('वाणी मॉडल व आवाज़ सेटिंग सुरक्षित की गई', 'Voice model & speaker settings saved'), { duration: 2500 });
      }
    } catch (err) {
      console.error('Failed to update voice config:', err);
      toast.error(l('वॉइस सेटिंग अपडेट करने में त्रुटि आई', 'Failed to update voice settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSarvamModel = (targetModel) => {
    if (loading) return;
    const speakersByModel = config.available_sarvam_speakers_by_model || DEFAULT_SARVAM_SPEAKERS_BY_MODEL;
    const validSpeakers = speakersByModel[targetModel] || speakersByModel['bulbul:v3'] || [];
    const isCurrentSpeakerValid = validSpeakers.some((s) => s.id === config.sarvam_speaker);
    const nextSpeaker = isCurrentSpeakerValid ? config.sarvam_speaker : (validSpeakers[0]?.id || 'meera');

    handleUpdateConfig({
      sarvam_model: targetModel,
      sarvam_speaker: nextSpeaker,
    });
  };

  const handleSwitchProvider = (targetProvider) => {
    if (loading || targetProvider === config.primary) return;
    handleUpdateConfig({ provider: targetProvider });
  };

  const togglePrimary = () => {
    const next = config.primary === 'bhashini' ? 'sarvam' : 'bhashini';
    handleSwitchProvider(next);
  };

  const isBhashini = config.primary === 'bhashini';

  const previewReqIdRef = useRef(0);

  const stopActivePreview = () => {
    previewReqIdRef.current++;
    stopAllVoiceAudio();
    if (cancelPreviewRef.current) {
      cancelPreviewRef.current();
      cancelPreviewRef.current = null;
    }
    setActivePreviewId(null);
  };

  const playPreview = async (previewId, { text, provider, model, speaker, gender }) => {
    if (activePreviewId === previewId) {
      stopActivePreview();
      return;
    }
    stopActivePreview();
    const myReqId = previewReqIdRef.current;
    setActivePreviewId(previewId);

    try {
      const cleanup = await previewVoiceAudio({
        text,
        language: 'hi',
        gender: gender || 'female',
        provider: provider || config.primary,
        model,
        speaker,
        onStart: () => {},
        onEnd: () => {
          if (previewReqIdRef.current === myReqId) {
            setActivePreviewId(null);
          }
        },
      });

      if (previewReqIdRef.current !== myReqId) {
        cleanup?.();
        return;
      }
      cancelPreviewRef.current = cleanup;
    } catch {
      if (previewReqIdRef.current === myReqId) {
        setActivePreviewId(null);
      }
    }
  };

  // ── COMPACT BADGE MODE ──────────────────────────────────────────────────────
  if (compact || mode === 'compact') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <button
          type="button"
          onClick={togglePrimary}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sage/15 dark:bg-sage/25 hover:bg-sage/25 dark:hover:bg-sage/35 text-primary border border-sage/30 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          title={l(
            `प्राथमिक आवाज़ बदलने के लिए क्लिक करें (वर्तमान: ${isBhashini ? 'भाषिणी' : 'सर्वम'})`,
            `Click to switch primary voice (Current: ${isBhashini ? 'Bhashini' : 'Sarvam'})`
          )}
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 animate-spin text-sage" />
          ) : (
            <Volume2 className="w-3 h-3 text-sage dark:text-booti-glow" />
          )}
          <span className="font-semibold">
            {isBhashini ? (isHindi ? 'भाषिणी AI' : 'Bhashini AI') : (isHindi ? 'सर्वम AI' : 'Sarvam AI')}
          </span>
          <ArrowLeftRight className="w-2.5 h-2.5 opacity-60 ml-0.5" />
        </button>
      </div>
    );
  }

  // ── SETTINGS CARD MODE (Mounted in Profile / Settings) ───────────────────────
  if (mode === 'settings-card') {
    const sarvamModels = config.available_sarvam_models || DEFAULT_SARVAM_MODELS;
    const sarvamSpeakersByModel = config.available_sarvam_speakers_by_model || DEFAULT_SARVAM_SPEAKERS_BY_MODEL;
    const sarvamSpeakers = sarvamSpeakersByModel[config.sarvam_model] || sarvamSpeakersByModel['bulbul:v3'] || DEFAULT_SARVAM_SPEAKERS;
    const bhashiniModels = config.available_bhashini_models || DEFAULT_BHASHINI_MODELS;
    const bhashiniGenders = config.available_bhashini_genders || DEFAULT_BHASHINI_GENDERS;

    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-serif font-bold text-primary flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sage dark:text-booti-glow" />
              <span>{l('वाणी प्रदाता व मॉडल चयन', 'Voice Provider & Audio Model')}</span>
            </h3>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              {l(
                'अपनी पसंद का प्राथमिक वॉइस AI इंजन, मॉडल व आवाज़ चुनें और परीक्षण करें।',
                'Select your preferred primary voice AI engine, model, and speaker with live audio preview.'
              )}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage/10 text-sage dark:text-booti-glow text-[11px] font-bold self-start sm:self-center">
            <span>{l('सक्रिय: ', 'Active: ') + (isBhashini ? (isHindi ? 'भाषिणी AI' : 'Bhashini AI') : (isHindi ? 'सर्वम AI' : 'Sarvam AI'))}</span>
          </div>
        </div>

        {/* 2-Column Responsive Card Grid for Primary Switch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: Bhashini */}
          <div
            onClick={() => handleSwitchProvider('bhashini')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              isBhashini
                ? 'bg-sage/10 dark:bg-sage/20 border-sage ring-2 ring-sage/30 shadow-xs'
                : 'bg-white dark:bg-card border-gray-200 dark:border-gray-700/80 hover:border-sage/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    isBhashini ? 'bg-sage text-white' : 'border-2 border-gray-300 dark:border-gray-600'
                  }`}>
                    {isBhashini && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-sm font-bold text-primary">{isHindi ? 'भाषिणी AI' : 'Bhashini AI'}</span>
                </div>
                <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-bold px-2 py-0.5 rounded-full">
                  Digital India
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed mb-3">
                {l(
                  'भारत सरकार का MeitY राष्ट्रीय इंडिक AI। यदि सर्वर व्यस्त हो तो स्वतः सर्वम AI पर स्विच होगा।',
                  'Government of India MeitY Indic AI. Automatic failover to Sarvam AI if server is busy.'
                )}
              </p>
            </div>

            <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
              <span className={`text-[11px] font-bold ${isBhashini ? 'text-sage dark:text-booti-glow' : 'text-muted'}`}>
                {isBhashini ? l('✓ प्राथमिक सक्रिय', '✓ Primary Active') : l('क्लिक करके चुनें', 'Click to Select')}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playPreview('bhashini-main-preview', {
                    text: isHindi
                      ? 'नमस्ते! यह भाषिणी वाणी मॉडल का परीक्षण संदेश है। हम आपकी स्वास्थ्य सहायता के लिए तत्पर हैं।'
                      : 'Hello! This is a test message from Bhashini voice model. We are ready to assist with your healthcare.',
                    provider: 'bhashini',
                    model: config.bhashini_model,
                    gender: config.bhashini_gender,
                  });
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activePreviewId === 'bhashini-main-preview'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-primary'
                }`}
              >
                {activePreviewId === 'bhashini-main-preview' ? (
                  <><Square className="w-3 h-3" /> <span>{l('रोकें', 'Stop')}</span></>
                ) : (
                  <><Volume2 className="w-3 h-3" /> <span>{l('आवाज़ सुनें', 'Preview Voice')}</span></>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Sarvam */}
          <div
            onClick={() => handleSwitchProvider('sarvam')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              !isBhashini
                ? 'bg-sage/10 dark:bg-sage/20 border-sage ring-2 ring-sage/30 shadow-xs'
                : 'bg-white dark:bg-card border-gray-200 dark:border-gray-700/80 hover:border-sage/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    !isBhashini ? 'bg-sage text-white' : 'border-2 border-gray-300 dark:border-gray-600'
                  }`}>
                    {!isBhashini && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-sm font-bold text-primary">{isHindi ? 'सर्वम AI' : 'Sarvam AI'}</span>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                  Bulbul:v3
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed mb-3">
                {l(
                  'अल्ट्रा-फास्ट भारतीय न्यूरल स्पीच मॉडल। यदि सीमा या त्रुटि आए तो स्वतः भाषिणी AI पर ट्रांसफर होगा।',
                  'Ultra-low latency Neural Indic Voice model. Automatic failover to Bhashini AI if busy.'
                )}
              </p>
            </div>

            <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
              <span className={`text-[11px] font-bold ${!isBhashini ? 'text-sage dark:text-booti-glow' : 'text-muted'}`}>
                {!isBhashini ? l('✓ प्राथमिक सक्रिय', '✓ Primary Active') : l('क्लिक करके चुनें', 'Click to Select')}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playPreview('sarvam-main-preview', {
                    text: isHindi
                      ? 'नमस्ते! यह सर्वम बुलबुल न्यूरल वाणी मॉडल का परीक्षण संदेश है। उत्तराखंड के पहाड़ी क्षेत्रों में आपका स्वागत है।'
                      : 'Hello! This is a test message from Sarvam Bulbul neural voice model. Welcome to Uttarakhand health consultation.',
                    provider: 'sarvam',
                    model: config.sarvam_model,
                    speaker: config.sarvam_speaker,
                  });
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activePreviewId === 'sarvam-main-preview'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-primary'
                }`}
              >
                {activePreviewId === 'sarvam-main-preview' ? (
                  <><Square className="w-3 h-3" /> <span>{l('रोकें', 'Stop')}</span></>
                ) : (
                  <><Volume2 className="w-3 h-3" /> <span>{l('आवाज़ सुनें', 'Preview Voice')}</span></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── EXPANDABLE DETAILED MODEL & SPEAKER CUSTOMIZATION ── */}
        <div className="bg-white dark:bg-card border border-sage/20 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-warm" />
              <h4 className="font-serif font-bold text-sm text-primary">
                {l('मॉडल व आवाज़ अनुकूलन', 'Model & Speaker Customization')}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setExpandedDetails(!expandedDetails)}
              className="text-xs text-muted hover:text-primary flex items-center gap-1 cursor-pointer"
            >
              <span>{expandedDetails ? l('संक्षिप्त करें', 'Collapse') : l('विस्तार देखें', 'Expand Details')}</span>
              {expandedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {expandedDetails && (
            <div className="space-y-6 animate-fadeIn">
              {/* SECTION A: SARVAM AI MODELS & SPEAKERS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-xs font-bold text-primary">{l('सर्वम AI — मॉडल व आवाज़ चयन', 'Sarvam AI — Model & Speaker Selection')}</span>
                  </div>
                  <span className="text-[10px] text-muted">
                    {l('सक्रिय मॉडल: ', 'Active Model: ')}<strong>{config.sarvam_model}</strong> • {l('आवाज़: ', 'Speaker: ')}<strong>{getSpeakerName(sarvamSpeakers.find((s) => s.id === config.sarvam_speaker), isHindi) || config.sarvam_speaker}</strong>
                  </span>
                </div>

                {/* Sarvam Model Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sarvamModels.map((m) => {
                    const isSelected = config.sarvam_model === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectSarvamModel(m.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-400 text-purple-900 dark:text-purple-200'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold">{getModelLabel(m, isHindi)}</span>
                            {isSelected && <span className="text-[9px] bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-white px-1.5 py-0.2 rounded font-bold">{l('चयनित', 'Selected')}</span>}
                          </div>
                          <p className="text-[11px] text-muted mt-0.5">{getModelDesc(m, isHindi)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sarvam Speakers Grid with Preview Buttons */}
                <div>
                  <p className="text-[11px] font-semibold text-muted mb-2">
                    {l('उपलब्ध आवाज़ें — चुनने से पहले आवाज़ सुनकर परखें:', 'Available Speakers — click to preview before selecting:')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sarvamSpeakers.map((spk) => {
                      const isSelected = config.sarvam_speaker === spk.id;
                      const isPlaying = activePreviewId === `sarvam-spk-${spk.id}`;
                      const displayName = getSpeakerName(spk, isHindi);
                      const sampleText = (isHindi ? spk.sampleHi : spk.sampleEn) || spk.sample || (isHindi ? `नमस्ते, मैं ${displayName} हूँ।` : `Hello, I am ${displayName}.`);
                      return (
                        <div
                          key={spk.id}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/30'
                              : 'bg-mist/30 dark:bg-card/40 border-gray-200 dark:border-gray-700/80 hover:border-gray-400'
                          }`}
                        >
                          <div
                            onClick={() => handleUpdateConfig({ sarvam_speaker: spk.id })}
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                              isSelected ? 'bg-purple-600 text-white font-bold' : 'border border-gray-400'
                            }`}>
                              {isSelected && '✓'}
                            </div>
                            <div className="min-w-0 truncate">
                              <p className="text-xs font-bold text-primary truncate">{displayName}</p>
                              <p className="text-[10px] text-muted truncate">{getGenderLabel(spk.gender, isHindi)}</p>
                            </div>
                          </div>

                          {/* Listen Preview Button */}
                          <button
                            type="button"
                            onClick={() => playPreview(`sarvam-spk-${spk.id}`, {
                              text: sampleText,
                              provider: 'sarvam',
                              model: config.sarvam_model,
                              speaker: spk.id,
                            })}
                            className={`p-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                              isPlaying
                                ? 'bg-rose-500 text-white animate-pulse'
                                : 'bg-white dark:bg-gray-800 text-primary border border-gray-200 dark:border-gray-700 hover:bg-purple-50'
                            }`}
                            title={l('इस आवाज़ का नमूना सुनें', 'Listen to voice sample')}
                          >
                            {isPlaying ? (
                              <><Square className="w-2.5 h-2.5" /> <span>{l('रोकें', 'Stop')}</span></>
                            ) : (
                              <><Play className="w-2.5 h-2.5" /> <span>{l('सुनें', 'Listen')}</span></>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION B: BHASHINI AI MODELS & GENDERS */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-primary">{l('भाषिणी AI — मॉडल व स्वर चयन', 'Bhashini AI — Model & Voice Selection')}</span>
                  </div>
                  <span className="text-[10px] text-muted">
                    {l('सक्रिय: ', 'Active: ')}<strong>{getGenderLabel(config.bhashini_gender, isHindi)}</strong>
                  </span>
                </div>

                {/* Bhashini Model Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {bhashiniModels.map((bm) => {
                    const isSelected = config.bhashini_model === bm.id;
                    return (
                      <div
                        key={bm.id}
                        onClick={() => handleUpdateConfig({ bhashini_model: bm.id })}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold">{getModelLabel(bm, isHindi)}</span>
                          {isSelected && <span className="text-[9px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-white px-1.5 py-0.2 rounded font-bold">{l('चयनित', 'Selected')}</span>}
                        </div>
                        <p className="text-[10px] text-muted">{getModelDesc(bm, isHindi)}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Bhashini Gender / Voice Selectors with Preview */}
                <div>
                  <p className="text-[11px] font-semibold text-muted mb-2">
                    {l('भाषिणी स्वर प्रकार:', 'Bhashini Voice Pitch:')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bhashiniGenders.map((bg) => {
                      const isSelected = config.bhashini_gender === bg.id;
                      const isPlaying = activePreviewId === `bhashini-gender-${bg.id}`;
                      const genderLabel = getGenderLabel(bg, isHindi);
                      const sampleText = (isHindi ? bg.sampleHi : bg.sampleEn) || bg.sample || (isHindi ? `नमस्ते, यह भाषिणी ${genderLabel} का परीक्षण है।` : `Hello, this is a test of Bhashini ${genderLabel}.`);
                      return (
                        <div
                          key={bg.id}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30'
                              : 'bg-mist/30 dark:bg-card/40 border-gray-200 dark:border-gray-700/80 hover:border-gray-400'
                          }`}
                        >
                          <div
                            onClick={() => handleUpdateConfig({ bhashini_gender: bg.id })}
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                              isSelected ? 'bg-emerald-600 text-white font-bold' : 'border border-gray-400'
                            }`}>
                              {isSelected && '✓'}
                            </div>
                            <span className="text-xs font-bold text-primary">{genderLabel}</span>
                          </div>

                          {/* Listen Preview Button */}
                          <button
                            type="button"
                            onClick={() => playPreview(`bhashini-gender-${bg.id}`, {
                              text: sampleText,
                              provider: 'bhashini',
                              model: config.bhashini_model,
                              gender: bg.id,
                            })}
                            className={`p-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                              isPlaying
                                ? 'bg-rose-500 text-white animate-pulse'
                                : 'bg-white dark:bg-gray-800 text-primary border border-gray-200 dark:border-gray-700 hover:bg-emerald-50'
                            }`}
                            title={l('इस स्वर का नमूना सुनें', 'Listen to voice sample')}
                          >
                            {isPlaying ? (
                              <><Square className="w-2.5 h-2.5" /> <span>{l('रोकें', 'Stop')}</span></>
                            ) : (
                              <><Play className="w-2.5 h-2.5" /> <span>{l('सुनें', 'Listen')}</span></>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fallback Information Callout */}
        <div className="p-3 rounded-xl bg-mist/60 dark:bg-card/60 border border-sage/15 flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
          <span>
            <strong>{l('द्वि-स्तरीय बैकअप सक्रिय:', 'Dual-tier fallback active:')}</strong> {l('प्राथमिक ', 'Primary ')}{isBhashini ? (isHindi ? 'भाषिणी AI' : 'Bhashini AI') : (isHindi ? 'सर्वम AI' : 'Sarvam AI')} → {l('प्रथम बैकअप ', 'First fallback ')}{isBhashini ? (isHindi ? 'सर्वम AI' : 'Sarvam AI') : (isHindi ? 'भाषिणी AI' : 'Bhashini AI')} → {l('द्वितीय ऑफ़लाइन बैकअप Microsoft Swara Neural', 'Second offline fallback Microsoft Swara Neural')}
          </span>
        </div>
      </div>
    );
  }

  // ── DROPDOWN MODE (For headers / floating menus) ─────────────────────────────
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-card hover:bg-mist dark:hover:bg-gray-800 text-primary border border-sage/30 dark:border-gray-700 transition-all cursor-pointer shadow-xs"
        aria-expanded={showDropdown}
      >
        {loading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sage" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-gold-warm" />
        )}
        <div className="text-left leading-tight">
          <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">
            {l('वॉइस मॉडल', 'Voice Model')}
          </span>
          <span className="text-xs font-bold text-sage dark:text-booti-glow">
            {isBhashini ? (isHindi ? 'भाषिणी' : 'Bhashini') : (isHindi ? 'सर्वम' : 'Sarvam')} <span className="text-muted font-normal">→ {isBhashini ? (isHindi ? 'सर्वम' : 'Sarvam') : (isHindi ? 'भाषिणी' : 'Bhashini')}</span>
          </span>
        </div>
        <ArrowLeftRight className="w-3 h-3 text-muted ml-1" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-card border border-sage/20 dark:border-gray-700 shadow-xl p-3.5 z-50 animate-fadeIn space-y-2 text-left">
            <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-primary">{l('प्राथमिक वॉइस प्रदाता', 'Primary Voice Provider')}</p>
              <p className="text-[11px] text-muted leading-tight mt-0.5">
                {l('प्राथमिक वॉइस AI मॉडल चुनें। दूसरा मॉडल स्वचालित बैकअप रहेगा।', 'Choose which voice AI speaks first. The other engine serves as automatic fallback.')}
              </p>
            </div>

            {/* Option 1: Bhashini */}
            <button
              type="button"
              onClick={() => {
                handleSwitchProvider('bhashini');
                setShowDropdown(false);
              }}
              className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                isBhashini
                  ? 'bg-sage/10 dark:bg-sage/20 border-sage text-primary font-bold shadow-xs'
                  : 'bg-transparent border-gray-200 dark:border-gray-700 hover:bg-mist dark:hover:bg-gray-800 text-primary'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                isBhashini ? 'bg-sage text-white' : 'border border-gray-300 dark:border-gray-600'
              }`}>
                {isBhashini && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">{isHindi ? 'भाषिणी AI' : 'Bhashini AI'}</span>
                  <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.2 rounded font-bold">
                    MeitY
                  </span>
                </div>
                <p className="text-[10px] text-muted leading-tight mt-0.5">
                  {l('भारत सरकार का बहुभाषी इंडिक AI। सर्वर व्यस्त होने पर सर्वम AI स्वतः सक्रिय।', 'Government of India Indic AI. Automatic failover to Sarvam AI if busy.')}
                </p>
              </div>
            </button>

            {/* Option 2: Sarvam */}
            <button
              type="button"
              onClick={() => {
                handleSwitchProvider('sarvam');
                setShowDropdown(false);
              }}
              className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                !isBhashini
                  ? 'bg-sage/10 dark:bg-sage/20 border-sage text-primary font-bold shadow-xs'
                  : 'bg-transparent border-gray-200 dark:border-gray-700 hover:bg-mist dark:hover:bg-gray-800 text-primary'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                !isBhashini ? 'bg-sage text-white' : 'border border-gray-300 dark:border-gray-600'
              }`}>
                {!isBhashini && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">{isHindi ? 'सर्वम AI' : 'Sarvam AI'}</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.2 rounded font-bold">
                    Bulbul
                  </span>
                </div>
                <p className="text-[10px] text-muted leading-tight mt-0.5">
                  {l('अल्ट्रा-फास्ट भारतीय न्यूरल स्पीच मॉडल। व्यस्त होने पर भाषिणी AI स्वतः बैकअप।', 'Ultra-low latency Neural Indic Voice. Automatic failover to Bhashini.')}
                </p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
