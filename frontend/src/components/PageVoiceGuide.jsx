import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, Sparkles, ChevronDown, ChevronUp, Minimize2, Maximize2 } from 'lucide-react';
import { speakCue, stopCue } from '../lib/audioSynthesizer';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_PAGE_GUIDES = {
  home: {
    title: 'संजीवनी परिचय निर्देश • Home Voice Guide',
    hi: 'नमस्ते। संजीवनी में आपका स्वागत है। यह उत्तराखंड के दूरदराज पहाड़ी क्षेत्रों के लिए विशेष रूप से बना स्वास्थ्य मंच है। यहाँ आप सीधे बोलकर डॉक्टर से परामर्श ले सकते हैं, अपने लक्षणों की प्राथमिक जांच कर सकते हैं, या निकटतम प्राथमिक स्वास्थ्य केंद्र खोज सकते हैं। नीचे दिए गए बोलकर बताएं बटन को दबाकर अपनी भाषा में बात शुरू करें।',
    en: 'Welcome to Sanjeevani, an AI healthcare and triage platform built for Himalayan communities in Uttarakhand. You can speak directly in Hindi or English to consult with Dr. Sanjeevani, perform non-invasive symptom triage, or locate nearby hospitals.',
    garhwali: 'नमस्कार। संजीवनी मा आपका स्वागत च। यां आप डॉक्टर से अपनी बोली मा बात करी सकदा, अपणा लक्षण जांच सकदा, या नजीक का अस्पताल खोज सकदा।',
  },
  asha: {
    title: 'आशा साथी कार्य निर्देश • ASHA Guide',
    hi: 'नमस्ते आशा दीदी। संजीवनी आशा साथी में आपका स्वागत है। यहाँ आप अपने गाँव के पंजीकृत मरीजों की सूची देख सकती हैं, नए मरीज का स्वास्थ्य फॉर्म भर सकती हैं, आपातकालीन स्थिति में तुरंत 108 एम्बुलेंस सहायता भेज सकती हैं, और बिना इंटरनेट के भी मरीजों की जांच दर्ज कर सकती हैं। डेटा इंटरनेट आने पर अपने आप सुरक्षित सिंक हो जाएगा।',
    en: 'Welcome ASHA worker. From this dashboard, you can view your village patient registry, register new patients, trigger emergency 108 SOS escalation with live GPS coordinates, and operate fully offline in remote terrain.',
    garhwali: 'नमस्ते आशा दीदी। यां आप अपणा गांव का मरीजों की सूची देखी सकदा, नया मरीज जोड़ी सकदा, और आपातकाल मा 108 एम्बुलेंस बुलाई सकदा।',
  },
  admin: {
    title: 'जिला प्रशासन निगरानी निर्देश • Admin Guide',
    hi: 'नमस्ते। यह संजीवनी जिला प्रशासन डैशबोर्ड है। यहाँ आप चमोली और उत्तराखंड के सभी प्राथमिक स्वास्थ्य केंद्रों की स्थिति, आज के कुल परामर्श, रेड अलर्ट आपातकालीन मरीज, और मौसमी स्वास्थ्य चेतावनी जारी करने की सुविधा देख सकते हैं। किसी भी समय नई एडवाइजरी जारी करने के लिए ऊपर दिए गए फॉर्म का उपयोग करें।',
    en: 'Welcome to the Sanjeevani District Administration Dashboard. Here CMO officials can monitor real-time primary health center readiness, triage caseload distributions, broadcast seasonal health alerts, and review clinical audit logs.',
    garhwali: 'नमस्ते। यो संजीवनी जिला प्रशासन डैशबोर्ड च। यां आप उत्तराखंड का स्वास्थ्य केंद्रों की स्थिति और आज का कुल मरीजों की रिपोर्ट देखी सकदा।',
  },
  screening: {
    title: 'आयुर्-विज़न नेत्र जांच निर्देश • Screening Guide',
    hi: 'नमस्ते। यह आयुर्-विज़न गैर-आक्रामक नेत्र स्क्रीनिंग है। अपनी आँख की निचली पलक को हल्के से नीचे खींचकर कैमरे के सामने रखें ताकि खून की कमी या एनीमिया की जांच हो सके। या आँख के सफेद भाग को दिखाएं जिससे पीलिया के लक्षणों का पता लगाया जा सके। कृपया अच्छा प्रकाश रखें और कैमरा स्थिर रखें।',
    en: 'Welcome to Ayur-Vision non-invasive screening. Gently pull down your lower eyelid to show the conjunctiva for anemia screening, or frame the sclera for jaundice risk analysis under even lighting.',
    garhwali: 'नमस्ते। यां आप अपणी आंख की फोटो से एनीमिया और पीलिया की जांच करी सकदा। कैमरा सीधा और साफ़ रोशनी मा रख्यां।',
  },
  wellness: {
    title: 'आरोग्य वेलनेस स्टूडियो निर्देश • Wellness Guide',
    hi: 'नमस्ते। संजीवनी वेलनेस स्टूडियो में आपका स्वागत है। यहाँ आप नाड़ी शोधन और भ्रामरी प्राणायाम श्वास अभ्यास कर सकते हैं, अपनी प्रकृति वात, पित्त और कफ दोष की पहचान कर सकते हैं, मर्म बिंदु एक्यूप्रेशर निर्देश देख सकते हैं, और पारंपरिक पहाड़ी काढ़ा बनाने की विधि सीख सकते हैं। आराम से बैठें और गहरी सांस लें।',
    en: 'Welcome to the Sanjeevani Wellness Studio. Practice guided Himalayan Pranayama breathing, identify your Ayurvedic dosha constitution, explore therapeutic marma acupressure points, and discover healing herbal remedies.',
    garhwali: 'नमस्ते। संजीवनी वेलनेस स्टूडियो मा आपका स्वागत च। यां आप प्राणायाम, वात पित्त कफ दोष की पहचान, और जड़ी-बूटी का काढ़ा की विधि सीखी सकदा।',
  },
  companion: {
    title: 'संजीवनी साथी मार्गदर्शन • Saathi Guide',
    hi: 'नमस्ते। यह आपका संजीवनी साथी है। जब भी आप उदास, अकेला या तनाव महसूस करें, यहाँ खुलकर बात करें। आप पहाड़ी लोक कथाएँ, मन को शांति देने वाले भजन, और दैनिक प्रेरक विचार भी सुन सकते हैं। आपकी हर बात पूरी तरह सुरक्षित और गोपनीय है।',
    en: 'Welcome to Sanjeevani Saathi. A caring mental wellness companion where you can express feelings, listen to Himalayan folklore, peaceful chants, and access 24/7 tele-MANAS crisis helplines.',
    garhwali: 'नमस्ते। यो आपका संजीवनी साथी च। जब भी मन उदास ह्वै, यां बात करा, पहाड़ी किस्सा सुणा, और शांति का भजन सुणा।',
  },
  mitra: {
    title: 'रोगी स्वास्थ्य केंद्र निर्देश • Patient Hub Guide',
    hi: 'नमस्ते। यह आपका संजीवनी स्वास्थ्य केंद्र है। यहाँ आप सीधे बोलकर डॉक्टर से परामर्श ले सकते हैं, अपना पुराना पर्चा देख सकते हैं, घरेलू नुस्खों का समय संभाल सकते हैं, और आपातकालीन प्राथमिक उपचार निर्देश सुन सकते हैं।',
    en: 'Welcome to your Patient Health Hub. Start voice consultations, review previous clinical prescriptions, manage daily herbal remedies, and view emergency mountain first-aid guides.',
    garhwali: 'नमस्ते। यो आपका स्वास्थ्य केंद्र च। यां आप डॉक्टर से परामर्श ले सकदा, अपणा पुराना पर्चा देखी सकदा, और दवाई का समय देख सकदा।',
  },
};

export default function PageVoiceGuide({
  pageKey = 'home',
  customTitle,
  customText,
  compact = false,
  className = '',
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('sanjeevani_voice_guide_minimized') === 'true';
  });

  const langCtx = useLanguage();
  const currentLang = langCtx?.lang || 'hi';
  const guideData = DEFAULT_PAGE_GUIDES[pageKey] || DEFAULT_PAGE_GUIDES.home;

  const title = customTitle || guideData.title;
  const guideText =
    customText ||
    (currentLang === 'en'
      ? guideData.en
      : currentLang === 'garhwali'
      ? guideData.garhwali || guideData.hi
      : guideData.hi);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        stopCue();
      }
    };
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopCue();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakCue(guideText, currentLang === 'en' ? 'en-IN' : 'hi-IN', {
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
      });
    }
  };

  const handleToggleMinimize = (e) => {
    e?.stopPropagation();
    const next = !isMinimized;
    setIsMinimized(next);
    localStorage.setItem('sanjeevani_voice_guide_minimized', String(next));
  };

  // ── Render 1: Compact inline prop variant ──
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
            isPlaying
              ? 'bg-rose-soft text-white animate-pulse'
              : 'bg-sage/15 dark:bg-sage/25 hover:bg-sage/25 text-sage dark:text-booti-glow border border-sage/30'
          }`}
          title={isPlaying ? 'आवाज़ रोकें / Stop Voice Guide' : 'पेज के निर्देश सुनें / Listen Page Guide'}
        >
          {isPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>रोकें (Stop)</span>
              <div className="flex items-center gap-0.5 ml-1">
                <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-2.5 bg-white rounded-full animate-bounce" />
              </div>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>आवाज़ से समझें</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Render 2: Minimized ultra-low space pill ──
  if (isMinimized) {
    return (
      <div className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition-all ${
        isPlaying
          ? 'bg-gradient-to-r from-rose-soft/10 via-sage/15 to-rose-soft/10 border-rose-soft/40 shadow-xs'
          : 'bg-white/80 dark:bg-card/80 backdrop-blur-xs border-sage/20 dark:border-gray-800 shadow-2xs hover:border-sage/40'
      } ${className}`}>
        <button
          type="button"
          onClick={handleTogglePlay}
          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
          title={isPlaying ? 'आवाज़ रोकें' : 'स्वर निर्देश सुनें'}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
            isPlaying ? 'bg-rose-soft text-white animate-pulse' : 'bg-sage/20 text-sage dark:text-booti-glow'
          }`}>
            {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-primary truncate block">
              {isPlaying ? 'वाचन चालू है... (रोकने हेतु टैप करें)' : 'स्वर निर्देश (Voice Guide)'}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-rose-soft text-white'
                : 'bg-sage text-white hover:bg-sage/90'
            }`}
          >
            {isPlaying ? 'रोकें' : 'सुनें'}
          </button>
          <button
            type="button"
            onClick={handleToggleMinimize}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-primary transition-colors cursor-pointer"
            title="विस्तार करें (Expand Guide)"
            aria-label="Expand Guide"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Render 3: Standard Responsive View (Streamlined to consume minimal space) ──
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        isPlaying
          ? 'bg-gradient-to-r from-sage/15 via-gold-warm/10 to-sage/10 border-sage/40 shadow-sm ring-1 ring-sage/30'
          : 'bg-white/90 dark:bg-card/90 backdrop-blur-md border-sage/20 dark:border-gray-800 shadow-2xs hover:border-sage/40'
      } p-2.5 sm:p-3.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        {/* Left: Compact Icon & Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`touch-target w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-2xs ${
              isPlaying
                ? 'bg-rose-soft text-white hover:bg-rose-soft/90 shadow-rose-soft/30'
                : 'bg-gradient-to-br from-sage to-[#4a6346] text-white hover:scale-105 shadow-sage/30'
            }`}
            aria-label={isPlaying ? 'Stop Voice Guide' : 'Play Voice Guide'}
          >
            {isPlaying ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-sage/15 text-sage dark:text-booti-glow">
                <Sparkles className="w-2.5 h-2.5 text-gold-warm" />
                <span>Voice Guide</span>
              </span>
              {isPlaying && (
                <span className="text-[10px] font-bold text-rose-soft animate-pulse">
                  ● वाचन चालू
                </span>
              )}
            </div>
            <h3 className="font-serif font-bold text-xs sm:text-sm text-primary truncate mt-0.5">
              {title}
            </h3>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`touch-target inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              isPlaying
                ? 'bg-rose-soft hover:bg-rose-soft/90 text-white'
                : 'bg-sage hover:bg-sage/90 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>रोकें</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>सुनें</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="touch-target p-1.5 rounded-xl bg-mist dark:bg-gray-800 text-muted hover:text-primary transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
            title="निर्देश पढ़ें / Toggle Transcript"
            aria-expanded={showTranscript}
          >
            {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleToggleMinimize}
            className="touch-target p-1.5 rounded-xl bg-mist dark:bg-gray-800 text-muted hover:text-primary transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
            title="कम जगह करें (Minimize)"
            aria-label="Minimize Guide"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Spoken Transcript / Text Drawer */}
      {(showTranscript || (isPlaying && showTranscript)) && (
        <div className="mt-2 pt-2 border-t border-sage/15 dark:border-gray-800 animate-fadeIn">
          <div className="p-2 sm:p-2.5 rounded-xl bg-mist/60 dark:bg-card border border-sage/15 text-xs text-primary leading-relaxed flex items-start gap-2">
            <Volume2 className="w-3.5 h-3.5 text-sage shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-muted text-[10px] block uppercase tracking-wider mb-0.5">
                Spoken Guidance (बोले जा रहे शब्द):
              </span>
              <p className="font-medium text-xs text-primary leading-relaxed">
                {guideText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
