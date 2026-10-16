import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Eye, CheckCircle2, ShieldCheck, RefreshCw, FlaskConical,
  AlertCircle, Info, Sparkles, ArrowRight, Upload, Volume2, Stethoscope,
  PhoneCall, Download, Printer, X, FileText, Activity, Layers, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { speakText } from '../api/voiceClient';
import { runEdgeDiagnosticScreening, downloadAbdmFhirBundle } from '../api/screeningClient';
import { runVisionScreening } from '../api/client';
import { runClientDiagnosticScreening } from '../lib/offlineScreeningEngine';
import { queueOfflineScreening } from '../lib/offlineSyncManager';
import PageVoiceGuide from '../components/PageVoiceGuide';
import BackButton from '../components/BackButton';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Screening() {
  const { user } = useAuth();
  const { l, isHindi, isEnglish, toEnglishDigits } = useLanguage();
  const [screeningType, setScreeningType] = useState('ANEMIA');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [isDemoSample, setIsDemoSample] = useState(false);
  const [screeningError, setScreeningError] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Screening modalities metadata
  const modalities = {
    ANEMIA: {
      title: l('खून की कमी', 'Anemia Screening'),
      subtitle: l('कंजंक्टिवा पेलोर • एरिथेमा इंडेक्स', 'Palpebral Conjunctiva Pallor • CIELAB Erythema Index'),
      icon: Eye,
      color: 'var(--rose-soft)',
      guideText: l('आंख की नीचे वाली पलक को हल्के से नीचे खींचिए ताकि गुलाबी हिस्सा साफ दिखे। प्राकृतिक रोशनी में बिना फ्लैश के फोटो लें।', 'Gently pull down lower eyelid to expose the pink conjunctiva. Capture in natural daylight without flash.'),
      placeholderSample: 'anemia'
    },
    JAUNDICE: {
      title: l('पीलिया जांच', 'Jaundice Screening'),
      subtitle: l('स्क्लेरल इक्टेरस • बिलिरूबिन अनुमान', 'Scleral Icterus • Bilirubin Estimation'),
      icon: Activity,
      color: 'var(--gold-warm)',
      guideText: l('आंख के सफेद भाग की साफ तस्वीर लें। सूरज की प्राकृतिक रोशनी में कैमरे के सामने सीधे देखें।', 'Capture a clear image of the white of the eye. Look straight at the camera in natural daylight.'),
      placeholderSample: 'jaundice'
    },
    ORAL: {
      title: l('मुख रोग', 'Oral Lesions Screening'),
      subtitle: l('ल्यूकोप्लाकिया सफेद चकत्ते • म्यूकोसा जांच', 'Leukoplakia White Patches • Tobacco Mucosa Screening'),
      icon: FlaskConical,
      color: 'var(--gold-warm)',
      guideText: l('मुंह खोल कर गाल के अंदर की दीवार या जीभ पर बने सफेद धब्बे पर कैमरा फोकस करें।', 'Open mouth and focus camera clearly on inner cheek or tongue lesion.'),
      placeholderSample: 'oral'
    },
    SKIN: {
      title: l('त्वचा रोग', 'Skin Lesions Screening'),
      subtitle: l('एरिथेमा व फंगल इन्फेक्शन जांच', 'Cutaneous Erythema & Fungal Ringworm Screening'),
      icon: Layers,
      color: 'var(--sage)',
      guideText: l('प्रभावित त्वचा के क्षेत्र को साफ रोशनी में रखें। दाद या चकत्ते के घेरे को केंद्रित करें।', 'Keep the affected skin area in bright light. Center the lesion in frame.'),
      placeholderSample: 'skin'
    }
  };

  // Stop webcam stream when unmounting or toggling off
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Ensure stream is attached to video element as soon as isCameraActive mounts the video
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-play warning:', err);
      });
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setSelectedImage(null);
      setSelectedFile(null);
      setResult(null);
      setActiveStep(1);
      toast.success(l('कैमरा सक्रिय हुआ', 'Camera activated', 'Camera sakriya hua'));
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error(l('कैमरा अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में कैमरा अनुमति दें।', 'Camera permission denied. Please allow camera in browser settings.', 'Camera permission nahi mili. Kripya browser settings mein camera allow karein.'));
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error(l('कोई कैमरा डिवाइस नहीं मिला। कृपया तस्वीर अपलोड करें।', 'No camera device found. Please upload an image.', 'Koi camera device nahi mila. Kripya tasveer upload karein.'));
      } else {
        toast.error(l(`कैमरा शुरू नहीं हो सका (${err.message || 'Error'})। कृपया तस्वीर अपलोड करें।`, `Could not start camera (${err.message || 'Error'}). Please upload an image.`, `Camera shuru nahi ho saka (${err.message || 'Error'}). Kripya tasveer upload karein.`));
      }
      setIsCameraActive(false);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const width = v.videoWidth || 640;
    const height = v.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(v, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (blob) {
        setSelectedFile(blob);
        setSelectedImage(URL.createObjectURL(blob));
        setIsDemoSample(false);
        setResult(null);
        setActiveStep(2);
        stopCamera();
        toast.success(l('तस्वीर ले ली गई', 'Photo captured', 'Tasveer capture kar li gayi'));
      }
    }, 'image/jpeg', 0.9);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera();
      setSelectedFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setIsDemoSample(false);
      setResult(null);
      setActiveStep(2);
      toast.success(l('तस्वीर सफलतापूर्वक चुनी गई', 'Image selected successfully', 'Tasveer safalta-purvak chuni gayi'));
    }
  };

  // Pre-load synthetic clinical demonstration sample for instant 1-click test
  const handleLoadDemoSample = () => {
    stopCamera();
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    if (screeningType === 'ANEMIA') {
      // Simulate lower eyelid conjunctiva with pallor/redness
      ctx.fillStyle = 'rgb(200, 150, 128)'; // skin
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'rgb(232, 235, 239)'; // sclera
      ctx.beginPath();
      ctx.ellipse(160, 100, 80, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(62, 42, 29)'; // iris
      ctx.beginPath();
      ctx.arc(160, 100, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(156, 78, 78)'; // palpebral mucosa
      ctx.beginPath();
      ctx.ellipse(160, 155, 60, 18, 0, 0, Math.PI);
      ctx.fill();
    } else if (screeningType === 'JAUNDICE') {
      // Simulate eye with yellow-tinted icteric sclera
      ctx.fillStyle = 'rgb(200, 150, 128)'; // skin
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'rgb(214, 206, 101)'; // yellow sclera
      ctx.beginPath();
      ctx.ellipse(160, 120, 85, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(42, 31, 24)'; // iris
      ctx.beginPath();
      ctx.arc(160, 120, 26, 0, Math.PI * 2);
      ctx.fill();
    } else if (screeningType === 'ORAL') {
      // Simulate oral buccal mucosa with white leukoplakia patch
      ctx.fillStyle = 'rgb(179, 74, 91)'; // mucosal background
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'rgb(237, 232, 238)'; // leukoplakia patch
      ctx.beginPath();
      ctx.ellipse(160, 120, 50, 35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Simulate erythematous cutaneous lesion
      ctx.fillStyle = 'rgb(212, 165, 135)'; // skin
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'rgb(194, 59, 56)'; // inflamed lesion
      ctx.beginPath();
      ctx.ellipse(160, 120, 55, 45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (blob) {
        setSelectedFile(blob);
        setSelectedImage(URL.createObjectURL(blob));
        setIsDemoSample(true);
        setResult(null);
        setActiveStep(2);
        toast.success(l(`नमूना तस्वीर (${modalities[screeningType].title}) लोड हुई`, `Sample image (${modalities[screeningType].title}) loaded`, `Namuna tasveer (${modalities[screeningType].title}) load hui`));
      }
    }, 'image/jpeg', 0.9);
  };

  const handlePlayInstructions = () => {
    const text = modalities[screeningType].guideText;
    speakText(text, { language: isEnglish ? 'en' : 'hi', gender: 'female' });
  };

  const handlePlayResult = () => {
    if (!result) return;
    const text = `${result.type}. ${result.estimated_metric || ''}. ${result.clinical_recommendation}`;
    speakText(text, { language: isEnglish ? 'en' : 'hi', gender: 'female' });
  };

  const handleRunScreening = useCallback(async () => {
    if (!selectedFile && !selectedImage) {
      toast.error(l('कृपया पहले तस्वीर चुनें या कैमरे से फोटो लें।', 'Please select or capture an image first.', 'Kripya pehle tasveer chunein ya camera se photo lein.'));
      return;
    }

    setLoading(true);
    setScreeningError(null);
    setActiveStep(2);

    try {
      let fileToSend = selectedFile;
      if (!fileToSend && selectedImage) {
        const res = await fetch(selectedImage);
        fileToSend = await res.blob();
      }

      let data = null;

      if (screeningType === 'ANEMIA' || screeningType === 'JAUNDICE') {
        data = await runVisionScreening(screeningType, fileToSend);
      } else {
        // Fallback or on-device for oral / skin
        try {
          data = await runEdgeDiagnosticScreening(screeningType, fileToSend);
        } catch {
          data = await runClientDiagnosticScreening(screeningType, fileToSend || selectedImage);
        }
      }

      const calculatedScore = typeof data.calculated_index === 'number'
        ? data.calculated_index
        : parseFloat(data.calculated_index || 0);

      const cutoffThreshold = typeof data.cutoff_threshold === 'number'
        ? data.cutoff_threshold
        : parseFloat(data.cutoff_threshold || 0);

      const now = new Date();
      const timestampIso = now.toISOString();
      const dateFormatted = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      setResult({
        type: data.screening_type === 'ANEMIA'
          ? l('खून की कमी जांच', 'Anemia Screening')
          : data.screening_type === 'JAUNDICE'
          ? l('पीलिया जांच', 'Jaundice Screening')
          : data.screening_type === 'ORAL_MUCOSA'
          ? l('मुख रोग जांच', 'Oral Leukoplakia Screening')
          : l('त्वचा रोग जांच', 'Skin Lesion Screening'),
        biomarker: data.biomarker,
        score: calculatedScore,
        threshold: cutoffThreshold,
        estimated_metric: data.estimated_metric,
        risk: data.risk_level,
        confidence: data.confidence_score,
        quality: data.quality_assessment,
        recommendation: data.clinical_recommendation,
        ayurveda: data.ayurvedic_recommendation,
        annotated_image: data.annotated_image_base64,
        fhir_report: data.abdm_fhir_report,
        roi_localization_method: data.roi_localization_method || 'estimated',
        is_demo: isDemoSample,
        source: data.source || (data.is_offline_fallback ? 'offline_fallback' : 'backend_cv'),
        timestamp: timestampIso,
        dateFormatted,
        timeFormatted,
      });

      // Save scan to localStorage under 'sanjeevani_screenings'
      try {
        const existing = JSON.parse(localStorage.getItem('sanjeevani_screenings') || '[]');
        const newEntry = {
          id: existing.length > 0 ? (Number(existing[0].id) + 1) : 1,
          date: dateFormatted,
          type: screeningType === 'ANEMIA' ? 'Anemia Scan (Hb)' : 'Jaundice Scan (Sclera)',
          biomarker: data.biomarker,
          calculated_index: calculatedScore,
          cutoff_threshold: cutoffThreshold,
          risk: data.risk_level,
          estimated_metric: data.estimated_metric,
          clinical_recommendation: data.clinical_recommendation,
        };
        localStorage.setItem('sanjeevani_screenings', JSON.stringify([newEntry, ...existing.slice(0, 19)]));
      } catch (saveErr) {
        console.warn('Failed to persist screening to localStorage:', saveErr);
      }

      setShowAnnotated(true);
      setActiveStep(3);
      toast.success(l('एआई जांच सफलतापूर्वक पूर्ण हुई', 'AI Screening completed successfully', 'AI Jaanch safalta-purvak poori hui'));
    } catch (err) {
      console.error('Screening execution error:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || l('जांच में समस्या आई। कृपया तस्वीर दोबारा जांचें।', 'Screening error encountered. Please check image and retry.', 'Jaanch mein samasya aayi. Kripya tasveer dobara check karein.');
      setScreeningError(errorMsg);

      toast.error(
        (t) => (
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="line-clamp-2">{errorMsg}</span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                handleRunScreening();
              }}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shrink-0 cursor-pointer shadow-xs"
            >
              Try Again
            </button>
          </div>
        ),
        { duration: 8000 }
      );
    } finally {
      setLoading(false);
    }
  }, [selectedFile, selectedImage, screeningType, isDemoSample, l]);

  const handleReset = () => {
    stopCamera();
    setSelectedFile(null);
    setSelectedImage(null);
    setIsDemoSample(false);
    setResult(null);
    setScreeningError(null);
    setActiveStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6 text-primary pb-20 safe-bottom-nav">
      
      {/* ── Universal Back Button for Mobile & Desktop ─────────────────── */}
      <div className="flex items-center justify-between pb-1">
        <BackButton fallback="/mitra" label={l('वापस जाएं', 'Back')} />
        <span className="text-xs text-muted font-medium hidden sm:inline">{l('डिजिटल स्वास्थ्य जांच', 'Digital AI Screening')}</span>
      </div>

      {/* ── Compact Header & Mode Switcher Bar ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-5 rounded-3xl border border-border-subtle shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-sage/10 text-sage px-3 py-0.5 rounded-full text-xs font-bold mb-1">
            <Eye className="w-3.5 h-3.5 text-gold-warm" />
            <span>{l('नेत्र बायोमार्कर डायग्नोस्टिक सुइट', 'Non-Invasive Ocular Diagnostic Suite')}</span>
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-primary">
            {l('नेत्र व रक्त बायोमार्कर जांच', 'Non-Invasive Ocular Diagnostic Suite')}
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {l('चमोली व उत्तराखंड के लिए एज कंप्यूटर विज़न • बिना सुई चुभाए एनीमिया व पीलिया की जांच', 'Edge Computer Vision for rural Uttarakhand • Point-of-Care Anemia & Jaundice Screen')}
          </p>
        </div>

        {/* Segmented Mode Toggle Pill */}
        <div className="bg-surface p-1 rounded-2xl border border-border-subtle flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setScreeningType('ANEMIA');
              setResult(null);
              setActiveStep(1);
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              screeningType === 'ANEMIA'
                ? 'bg-sage text-white shadow-xs'
                : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Eye className="w-4 h-4" />
            <div className="text-left leading-tight">
              <span className="block">{l('खून की कमी (Anemia)', 'Anemia Screen')}</span>
              <span className={`text-[10px] block ${screeningType === 'ANEMIA' ? 'text-white/80' : 'opacity-70'}`}>
                Lower Eyelid Pallor
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setScreeningType('JAUNDICE');
              setResult(null);
              setActiveStep(1);
            }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              screeningType === 'JAUNDICE'
                ? 'bg-sage text-white shadow-xs'
                : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <div className="text-left leading-tight">
              <span className="block">{l('पीलिया (Jaundice)', 'Jaundice Screen')}</span>
              <span className={`text-[10px] block ${screeningType === 'JAUNDICE' ? 'text-white/80' : 'opacity-70'}`}>
                Eye White Icterus
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Page Voice Guide Banner ───────────────────────────────── */}
      <PageVoiceGuide pageKey="screening" />

      {/* ── 12-Column Split Diagnostic Workbench ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Image Capture & Controls (6 cols) */}
        <div className="lg:col-span-6 bg-card p-5 sm:p-6 rounded-3xl shadow-sm border border-border-subtle space-y-4">
          
          {/* Section Heading & Audio Guide */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-primary">
                {modalities[screeningType].title}
              </h2>
              <p className="text-xs text-muted dark:text-muted">
                {modalities[screeningType].subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={handlePlayInstructions}
              className="touch-target inline-flex items-center gap-1.5 text-xs font-bold text-sage dark:text-booti-glow hover:underline"
            >
              <Volume2 className="w-3.5 h-3.5" /> Sunein (Voice)
            </button>
          </div>

          {/* Interactive Capture Frame / Dropzone */}
          <div className="border-2 border-dashed border-sage/30 dark:border-gray-700 rounded-3xl p-4 text-center relative bg-mist/40 dark:bg-warm-indigo/40 overflow-hidden min-h-[260px] flex flex-col items-center justify-center">
            
            {/* Live Camera View */}
            {isCameraActive ? (
              <div className="w-full space-y-3 relative">
                <div className="relative rounded-2xl overflow-hidden bg-black max-w-sm mx-auto shadow-md">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch((e) => console.warn('Play error:', e));
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      e.target.play().catch((err) => console.warn('Play error on metadata:', err));
                    }}
                    className="w-full h-56 object-cover"
                  />
                  {/* Viewfinder Target Guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-32 border-2 border-white/60 border-dashed rounded-3xl" />
                    <div className="absolute text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full bottom-3">
                      Lakshya ke andar rakhein
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={capturePhotoFromCamera}
                    className="touch-target px-5 py-2.5 rounded-xl bg-sage text-white font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-sage/90"
                  >
                    <Camera className="w-4 h-4" /> Photo Kheinchein (Snap)
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="touch-target px-3 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-300"
                  >
                    Band Karein
                  </button>
                </div>
              </div>
            ) : selectedImage ? (
              /* Image Preview with Original vs AI Overlay Toggle */
              <div className="space-y-3 w-full">
                <div className="relative inline-block max-w-full">
                  <img
                    src={result && showAnnotated && result.annotated_image ? result.annotated_image : selectedImage}
                    alt="Screening Preview"
                    className="max-h-64 rounded-2xl object-contain mx-auto shadow-md border border-gray-200 dark:border-gray-700"
                  />

                  {/* Visual ROI Alignment Guide Overlay */}
                  {(!result || !showAnnotated || !result.annotated_image) && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[62%] h-[50%] border-2 border-dashed border-gold-warm bg-gold-warm/15 rounded-[50%] flex items-center justify-center shadow-lg">
                        <span className="text-[10px] font-bold text-white bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs text-center max-w-[90%] shadow-xs">
                          {screeningType === 'ANEMIA'
                            ? l('Center Lower Eyelid Here (60% ROI)', 'Center Lower Eyelid Here (60% ROI)', 'Neechli Palk Yahan Kendrit Karein (60% ROI)')
                            : screeningType === 'JAUNDICE'
                            ? l('Center Eye White (Sclera) Here', 'Center Eye White (Sclera) Here', 'Aankh Ka Safed Bhaag Yahan Kendrit Karein')
                            : l('Center Target Region Here', 'Center Target Region Here')}
                        </span>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="absolute inset-0 bg-sage/50 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4">
                      <RefreshCw className="w-9 h-9 animate-spin mb-2" />
                      <span className="text-xs font-bold tracking-wider">OpenCV Colorimetric Model Scan Ho Raha Hai…</span>
                    </div>
                  )}
                </div>

                {/* Overlay Toggle Bar if Result is available */}
                {result && result.annotated_image && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAnnotated(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        showAnnotated
                          ? 'bg-sage text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-muted dark:text-muted'
                      }`}
                    >
                      AI Biomarker Overlay
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnnotated(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        !showAnnotated
                          ? 'bg-sage text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-muted dark:text-muted'
                      }`}
                    >
                      Mool Tasveer (Original)
                    </button>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="touch-target text-xs text-rose-soft dark:text-rose-soft font-bold hover:underline"
                  >
                    Tasveer Badlein (Upload Another)
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone Placeholder */
              <div className="py-6 sm:py-8 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-sage/15 dark:bg-sage/25 text-sage dark:text-booti-glow flex items-center justify-center mx-auto shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold text-primary block">
                    Tasveer Upload Karein Ya Camera Se Kheinchein
                  </span>
                  <span className="text-xs text-muted dark:text-muted mt-1 block max-w-sm mx-auto">
                    Mobile gallery se photo chunein ya live camera se seedhe lein
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="touch-target px-4 py-2.5 bg-sage hover:bg-sage/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{l('Take Eye Photo', 'Take Eye Photo', 'Photo Kheinchein')}</span>
                  </button>

                  <label className="touch-target cursor-pointer px-4 py-2.5 bg-white dark:bg-card border border-sage/30 text-sage dark:text-booti-glow rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-sage/10 transition-all">
                    <Upload className="w-4 h-4" />
                    <span>{l('Upload Existing Photo', 'Upload Existing Photo', 'Photo Upload Karein')}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="touch-target px-3.5 py-2.5 bg-white dark:bg-card border border-gray-300 dark:border-gray-700 text-muted hover:text-primary rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-sage/10 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{l('लाइव वेबकैम', 'Live Webcam')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDemoSample}
                    className="touch-target px-3.5 py-2.5 bg-gold-warm/15 border border-gold-warm/30 text-gold-warm dark:text-gold-warm rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-gold-warm/25 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Demo Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3-Step Photography Checklist Strip */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border-subtle">
            <div className="p-2.5 rounded-2xl bg-surface border border-border-subtle">
              <span className="block text-[11px] font-bold text-primary">1. Natural Daylight</span>
              <span className="block text-[10px] text-muted truncate mt-0.5">{l('फ्लैश बंद रखें', 'Avoid harsh flash')}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-surface border border-border-subtle">
              <span className="block text-[11px] font-bold text-primary">2. Expose Target</span>
              <span className="block text-[10px] text-muted truncate mt-0.5">{screeningType === 'ANEMIA' ? l('पलक नीचे खींचें', 'Pull lower lid') : l('स्क्लेरा पर फोकस', 'Focus sclera')}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-surface border border-border-subtle">
              <span className="block text-[11px] font-bold text-primary">3. Center in Oval</span>
              <span className="block text-[10px] text-muted truncate mt-0.5">{l('60% ROI भरें', 'Fill 60% ROI')}</span>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleRunScreening}
            disabled={(!selectedImage && !selectedFile) || loading}
            className="touch-target w-full min-h-[44px] bg-sage hover:bg-sage/90 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-md shadow-sage/20 transition-all cursor-pointer"
          >
            {loading ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> {l('बायोमार्कर स्कैन जारी है...', 'Scanning Biomarkers...')}</>
            ) : (
              <><CheckCircle2 className="w-5 h-5" /> {l('व्हाइट-बैलेंस्ड बायोमार्कर स्कैन शुरू करें', 'Run White-Balanced Biomarker Scan')}</>
            )}
          </button>
        </div>

        {/* Right Column: Results & Clinical Actions (6 cols) */}
        <div className="lg:col-span-6 bg-card p-5 sm:p-6 rounded-3xl shadow-sm border border-border-subtle space-y-5">
          {result ? (
            <div className="space-y-5 animate-fadeIn">

              {/* Prominent Simulated Demo Data Warning */}
              {result.is_demo && (
                <div className="p-3.5 rounded-2xl bg-red-600/15 border-2 border-red-500 text-red-800 dark:text-red-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm animate-pulse">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span>DEMO / SIMULATED DATA — not a real screening</span>
                </div>
              )}

              {/* Prominent Warning Banner for Estimated ROI */}
              {result.roi_localization_method === 'estimated' && (
                <div className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-950 dark:text-amber-100 text-xs leading-relaxed flex items-start gap-3 shadow-md">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm font-bold block mb-1 text-amber-900 dark:text-amber-200">
                      ⚠️ Anumanit Kshetra Chetwani (Estimated ROI — Lower Clinical Reliability)
                    </strong>
                    <span>
                      Tasveer mein aankh, mooh ya twacha ka lakshya kshetra MediaPipe model dwara vishwasniya roop se nahi mila. Yeh parinam anumanit fallback crop par aadharit hai aur results kam bharosemand hain. Kripya behtar roshni mein dobara tasveer lein.
                    </span>
                  </div>
                </div>
              )}
              
              {/* Persistent Medical Disclaimer */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="block font-semibold">
                    यह प्रारंभिक AI जांच है, अंतिम चिकित्सा निदान नहीं। किसी भी चिंता के लिए डॉक्टर से मिलें।
                  </strong>
                  <span className="text-[11px] opacity-90 block mt-0.5">
                    (Preliminary AI screening — not a final medical diagnosis.)
                  </span>
                </div>
              </div>

              {/* Header result badge */}
              <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-muted dark:text-muted">
                    Nishkarsh Report
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    result.risk?.includes('HIGH') || result.risk?.includes('SUSPECTED') || result.risk?.includes('ACTIVE')
                      ? 'bg-rose-soft text-white'
                      : result.risk?.includes('MILD') || result.risk?.includes('BORDERLINE')
                      ? 'bg-gold-warm text-primary'
                      : 'bg-sage text-white'
                  }`}>
                    {result.risk === 'HIGH_ANEMIA_RISK'
                      ? 'Khoon Ki Kami Ka Sanket'
                      : result.risk === 'JAUNDICE_RISK'
                      ? 'Peeliya (Icterus) Sanket'
                      : result.risk === 'ORAL_LESION_SUSPECTED'
                      ? 'Mukh Rog (Lesion) Sanket'
                      : result.risk === 'ACTIVE_INFLAMMATION_RISK'
                      ? 'Twacha Sankraman Sanket'
                      : result.risk === 'NORMAL'
                      ? 'Samanya (Normal)'
                      : result.risk}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-xl text-primary">
                  {result.type}
                </h3>
              </div>

              {/* Estimated Clinical Metric Highlight Card */}
              {result.estimated_metric && (
                <div className="p-4 rounded-2xl bg-sage/10 dark:bg-sage/20 border border-sage/25 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-muted dark:text-muted block uppercase tracking-wider">
                      Anumaanit Clinical Metric:
                    </span>
                    <span className="font-serif font-bold text-base sm:text-lg text-primary">
                      {result.estimated_metric}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePlayResult}
                    title="Audio Suniye"
                    className="p-2.5 rounded-xl bg-white dark:bg-card text-sage dark:text-booti-glow hover:bg-gray-50 shadow-xs"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Biomarker Index Breakdown */}
              <div className="bg-mist dark:bg-card p-4 rounded-2xl text-xs space-y-2.5 border border-sage/15 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-muted dark:text-muted">Biomarker Model:</span>
                  <span className="font-medium text-primary text-right truncate max-w-[200px]">{result.biomarker}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted dark:text-muted">Calculated Index Score:</span>
                  <span className="font-mono font-bold text-primary text-sm">{result.score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted dark:text-muted">Clinical Cutoff Baseline:</span>
                  <span className="font-mono text-muted dark:text-muted">{result.threshold}</span>
                </div>
                {result.quality && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-muted dark:text-muted">Lighting & Quality:</span>
                    <span className="text-[11px] text-sage dark:text-booti-glow font-medium">{result.quality}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-muted dark:text-muted">ROI Localization:</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    result.roi_localization_method === 'detected'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                  }`}>
                    {result.roi_localization_method === 'detected' ? '🎯 Detected (MediaPipe)' : '📐 Estimated (Fallback)'}
                  </span>
                </div>
              </div>

              {/* Visual Biomarker Spectrum Bar */}
              {typeof result.score === 'number' && typeof result.threshold === 'number' && (
                <div className="p-4 rounded-2xl bg-surface border border-sage/20 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-sage" />
                      <span>{l('बायोमार्कर स्पेक्ट्रम विश्लेषण', 'Biomarker Spectrum Analysis', 'Biomarker Spectrum Jaanch')}</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-muted">
                      Score: {result.score.toFixed(3)} | Cutoff: {result.threshold.toFixed(2)}
                    </span>
                  </div>

                  {(() => {
                    let scorePct = 50;
                    let cutoffPct = 50;
                    if (screeningType === 'ANEMIA') {
                      scorePct = Math.max(5, Math.min(95, ((result.score - 0.05) / (0.45 - 0.05)) * 100));
                      cutoffPct = Math.max(5, Math.min(95, ((result.threshold - 0.05) / (0.45 - 0.05)) * 100));
                    } else if (screeningType === 'JAUNDICE') {
                      scorePct = Math.max(5, Math.min(95, ((result.score - 0) / (0.35 - 0)) * 100));
                      cutoffPct = Math.max(5, Math.min(95, ((result.threshold - 0) / (0.35 - 0)) * 100));
                    }
                    return (
                      <div className="relative pt-6 pb-4">
                        {/* Marker Pin for Calculated Score */}
                        <div
                          className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-500 z-10"
                          style={{ left: `${scorePct}%` }}
                        >
                          <span className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[9px] font-mono font-bold shadow-xs whitespace-nowrap">
                            Index: {result.score.toFixed(3)}
                          </span>
                          <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-primary" />
                        </div>

                        {/* Color Gradient Track */}
                        <div className={`h-3.5 rounded-full overflow-hidden shadow-inner flex ${
                          screeningType === 'ANEMIA'
                            ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500'
                            : 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500'
                        }`} />

                        {/* Cutoff Threshold Marker Pin */}
                        <div
                          className="absolute top-4 transform -translate-x-1/2 flex flex-col items-center z-5"
                          style={{ left: `${cutoffPct}%` }}
                        >
                          <div className="w-0.5 h-6 bg-primary dark:bg-white border-dashed shadow-xs" />
                          <span className="text-[9px] font-bold text-muted mt-1 whitespace-nowrap">
                            Cutoff ({result.threshold.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex justify-between items-center text-[10px] text-muted font-semibold pt-1">
                    <span>{screeningType === 'ANEMIA' ? l('⚠️ High Anemia Risk (< 0.20)', '⚠️ High Risk (< 0.20)') : l('✅ Safe / Normal (< 0.15)', '✅ Safe (< 0.15)')}</span>
                    <span>{screeningType === 'ANEMIA' ? l('✅ Safe / Normal (> 0.20)', '✅ Safe (> 0.20)') : l('⚠️ High Jaundice Risk (> 0.15)', '⚠️ High Risk (> 0.15)')}</span>
                  </div>
                </div>
              )}

              {/* ROI Localization Confidence Warning / Notice */}
              {result.roi_localization_method === 'estimated' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs leading-relaxed text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Anumanit Kshetra (Estimated ROI):</span>
                    Tasveer mein aankh/mooh clearly nahi mila — anumanit kshetra ka upyog kiya gaya. Behtar tasveer ke liye dobara try karein.
                  </div>
                </div>
              )}

              {/* Clinical Advice */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs leading-relaxed text-primary">
                <span className="font-bold block text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" /> Doctor Ki Prathmik Salah:
                </span>
                {result.recommendation}
              </div>

              {/* CCRAS Ayurvedic Care */}
              {result.ayurveda && (
                <div className="p-4 rounded-2xl bg-sage/10 dark:bg-sage/15 border border-sage/20 text-xs leading-relaxed text-primary">
                  <span className="font-bold block text-sage dark:text-booti-glow mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> CCRAS Ayurvedic Poshan & Upchar:
                  </span>
                  {result.ayurveda}
                </div>
              )}

              {/* Referral Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(true)}
                  className="touch-target w-full bg-gold-warm hover:bg-gold-warm/90 text-primary font-bold py-3.5 px-4 rounded-2xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>{l('पीएचसी डॉक्टर के लिए रेफरल पर्चा खोलें', 'Open Referral Slip for PHC Doctor', 'PHC Doctor Ke Liye Referral Parcha Kholein')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  to="/mitra/chat"
                  className="touch-target w-full bg-white dark:bg-card border border-sage/30 hover:bg-sage/10 text-sage dark:text-booti-glow font-bold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>{l('डॉ. संजीवनी से परामर्श करें', 'Consult Dr. Sanjeevani', 'Dr. Sanjeevani Se Paramarsh Karein')}</span>
                </Link>
              </div>

            </div>
          ) : screeningError ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-red-700 dark:text-red-300">
                  {l('एआई जांच असफल रही (Screening Failed)', 'AI Screening Failed', 'AI Jaanch Asafal Rahi')}
                </h4>
                <p className="text-xs text-muted dark:text-muted max-w-sm mx-auto">
                  {screeningError}
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleRunScreening}
                  className="px-4 py-2.5 bg-sage hover:bg-sage/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{l('पुनः प्रयास करें', 'Try Again', 'Dobara Koshish Karein')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Biomarker Reference & Calibration Guide (Pre-Scan Idle State) */
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
                <div className="w-8 h-8 rounded-xl bg-sage/15 text-sage flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-primary">
                    {l('बायोमार्कर संदर्भ एवं कैलिब्रेशन गाइड', 'Biomarker Reference & Calibration Guide')}
                  </h3>
                  <p className="text-[11px] text-muted">
                    {l('OpenCV व कलरिमेट्रिक एज डायग्नोस्टिक मानक', 'OpenCV Colorimetric Edge Standards')}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-surface/70 border border-border-subtle space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gold-warm" />
                      Gray-World & CLAHE Normalization
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage/15 text-sage">
                      Preprocessing
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {l('पहाड़ी इलाकों में धूप-छांव और असमान रोशनी को स्वचालित रूप से संतुलित करता है ताकि ऊतक का वास्तविक रंग स्पष्ट रहे।', 'Corrects ambient mountain lighting conditions and enhances mucosal contrast before colorimetric indexing.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface/70 border border-border-subtle space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-rose-soft" />
                      CIELAB a*/L* Erythema Index
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-soft/15 text-rose-soft">
                      Cutoff: 0.20
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {l('कंजंक्टिवा के हीमोग्लोबिन लालिमा को मापता है। 0.20 से कम मान एनीमिया (रक्त की कमी) के उच्च जोखिम का संकेत देता है।', 'Measures palpebral conjunctiva redness; indices < 0.20 indicate high risk of microcytic or nutritional anemia.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface/70 border border-border-subtle space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-gold-warm" />
                      HSV Scleral Icterus Ratio
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gold-warm/20 text-yellow-700 dark:text-gold-warm">
                      Cutoff: 0.35
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {l('आंख की पुतली के सफेद भाग (स्क्लेरा) में पीले रंग के फैलाव का विश्लेषण करता है, जिससे पीलिया का प्रारंभिक संकेत मिलता है।', 'Quantifies yellow pigment distribution on the sclera for early jaundice and elevated bilirubin detection.')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface/70 border border-border-subtle space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-sage" />
                      ABDM FHIR Diagnostic Report
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage/15 text-sage">
                      Compliance
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {l('जांच रिपोर्ट स्वतः आयुष्मान भारत डिजिटल मिशन (ABDM) प्रारूप में तैयार होती है जिसे पीएचसी डॉक्टर को दिखाया जा सकता है।', 'Generates a standardized FHIR R4 diagnostic slip for referral to local Primary Health Centers.')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-sage/10 text-center text-xs text-sage font-medium">
                {l('👈 बाईं ओर तस्वीर चुनें या कैमरा चालू करके स्कैन करें', '👈 Select an image on the left or use camera to start scan')}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── ABDM FHIR Referral Modal ────────────────────────────── */}
      {showReferralModal && result && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-warm-indigo rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sage/15 text-sage dark:text-booti-glow flex items-center justify-center font-bold">
                  सं
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-primary">
                    {l('एबीडीएम डायग्नोस्टिक रेफरल पर्चा', 'ABDM Diagnostic Referral Slip', 'ABDM Diagnostic Referral Parcha')}
                  </h3>
                  <p className="text-[10px] text-muted dark:text-muted">
                    Ayushman Bharat Digital Mission • FHIR R4 DiagnosticReport
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReferralModal(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Demo Notice inside Modal */}
            {result.is_demo && (
              <div className="p-3 rounded-2xl bg-red-600/20 border-2 border-red-500 text-red-800 dark:text-red-200 text-xs font-black text-center uppercase tracking-wide">
                ⚠️ DEMO / SIMULATED DATA — not a real screening (Do not use for medical referral)
              </div>
            )}

            {/* Parcha Body */}
            <div className="bg-mist dark:bg-card p-4 rounded-2xl text-xs space-y-2.5 border border-sage/15 font-mono">
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Patient Name:</span>
                <span className="font-bold text-primary">{user?.name || 'Aapka Naam (Self)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Report ID:</span>
                <span className="font-bold text-primary">{result.fhir_report?.id || 'SANJ-REF-001'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Date / Time:</span>
                <span>{result.dateFormatted || (result.timestamp ? formatDate(result.timestamp) : 'N/A')} {result.timeFormatted || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Screening Test:</span>
                <span className="font-bold">{result.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Biomarker Model:</span>
                <span className="font-bold text-primary">{result.biomarker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Calculated Score:</span>
                <span className="font-bold">{toEnglishDigits(result.score)} (Cutoff: {toEnglishDigits(result.threshold)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Estimated Metric:</span>
                <span className="font-bold text-rose-soft dark:text-rose-soft">{toEnglishDigits(result.estimated_metric || 'N/A')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Risk Grade:</span>
                <span className="font-bold">{result.risk}</span>
              </div>
            </div>

            {/* Referral Note */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs leading-relaxed">
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                {l('प्राथमिक स्वास्थ्य केंद्र (PHC) चिकित्सक हेतु:', 'For Primary Health Centre (PHC) Physician:', 'Prathmik Swasthya Kendra (PHC) Chikitsak Hetu:')}
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                {result.recommendation}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (result.fhir_report) {
                      downloadAbdmFhirBundle(result.fhir_report);
                      toast.success(l('एबीडीएम एफएचआईआर डायग्नोस्टिक रिपोर्ट JSON डाउनलोड हुआ', 'ABDM FHIR DiagnosticReport JSON downloaded', 'ABDM FHIR DiagnosticReport JSON download hua'));
                    }
                  }}
                  className="touch-target flex-1 py-3 px-4 rounded-xl bg-sage text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-sage/90"
                >
                  <Download className="w-4 h-4" />
                  <span>Download FHIR JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="touch-target flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Printer className="w-4 h-4" />
                  <span>{l('पर्चा प्रिंट करें', 'Print Referral Slip', 'Parcha Print Karein')}</span>
                </button>
              </div>

              {result.is_demo && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-extrabold text-center uppercase tracking-wide">
                  ⚠️ DEMO / SIMULATED DATA — not a real screening
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Safety Footer */}
      <div className="max-w-4xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted dark:text-muted text-center sm:text-left bg-white dark:bg-warm-indigo p-4 rounded-2xl border border-sage/15">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sage shrink-0" />
          <span>Yeh suvidha keval prathmik computer-vision edge simulation hetu hai aur antim clinical nidaan nahi hai. Kisi bhi aapaat sthiti mein turant doctor ya CHC se sampark karein.</span>
        </div>
        <a
          href="tel:108"
          className="shrink-0 inline-flex items-center gap-1 font-bold text-rose-soft dark:text-rose-soft hover:underline"
        >
          <PhoneCall className="w-3.5 h-3.5" /> Aapaatkaal: 108
        </a>
      </div>

    </div>
  );
}
