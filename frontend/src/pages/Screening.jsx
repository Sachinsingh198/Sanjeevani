import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Eye, CheckCircle2, ShieldCheck, RefreshCw, FlaskConical,
  AlertCircle, Info, Sparkles, ArrowRight, Upload, Volume2, Stethoscope,
  PhoneCall, Download, Printer, X, FileText, Activity, Layers, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { speakText } from '../api/voiceClient';
import { runEdgeDiagnosticScreening, downloadAbdmFhirBundle } from '../api/screeningClient';

export default function Screening() {
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
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Screening modalities metadata
  const modalities = {
    ANEMIA: {
      title: 'Khoon Ki Kami (Anemia)',
      subtitle: 'Palpebral Conjunctiva Pallor • CIELAB Erythema Index',
      icon: Eye,
      color: 'var(--rose-soft)',
      guideText: 'Aankh ki neeche wali palak ko halke se neeche kheenchiye taaki laal/gulabi hissa saaf dikhe. Daylight mein bina flash ke photo kheinchein.',
      placeholderSample: 'anemia'
    },
    JAUNDICE: {
      title: 'Peeliya (Jaundice)',
      subtitle: 'Scleral Icterus • HSV Yellow-Shift & Bilirubin Estimation',
      icon: Activity,
      color: 'var(--gold-warm)',
      guideText: 'Aankh ke safed bhaag (sclera) ki saaf tasveer lein. Suraj ki prakritik roshni mein camera ke samne seedhe dekhein.',
      placeholderSample: 'jaundice'
    },
    ORAL: {
      title: 'Mukh Rog (Oral Lesions)',
      subtitle: 'Leukoplakia White Patches & Tobacco Mucosa Screening',
      icon: FlaskConical,
      color: 'var(--gold-warm)',
      guideText: 'Munh khol kar gaal ke andar ki deewar (buccal mucosa) ya jeebh par bane safed dhabbe par camera focus karein.',
      placeholderSample: 'oral'
    },
    SKIN: {
      title: 'Twacha Rog (Skin Lesions)',
      subtitle: 'Cutaneous Erythema & Fungal Ringworm (Tinea) Screening',
      icon: Layers,
      color: 'var(--sage)',
      guideText: 'Prabhavit twacha ke kshetra ko saaf roshni mein rakhein. Kharash ya daad ke ghere ko kendrit karein.',
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
      toast.success('Camera sakriya hua');
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Camera permission nahi mili. Kripya browser settings mein camera allow karein.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('Koi camera device nahi mila. Kripya tasveer upload karein.');
      } else {
        toast.error(`Camera shuru nahi ho saka (${err.message || 'Error'}). Kripya tasveer upload karein.`);
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
        toast.success('Tasveer capture kar li gayi');
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
      toast.success('Tasveer safalta-purvak chuni gayi');
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
        toast.success(`Namuna tasveer (${modalities[screeningType].title}) load hui`);
      }
    }, 'image/jpeg', 0.9);
  };

  const handlePlayInstructions = () => {
    const text = modalities[screeningType].guideText;
    speakText(text, { language: 'hi', gender: 'female' });
  };

  const handlePlayResult = () => {
    if (!result) return;
    const text = `${result.type}. ${result.estimated_metric || ''}. ${result.clinical_recommendation}`;
    speakText(text, { language: 'hi', gender: 'female' });
  };

  const handleRunScreening = async () => {
    if (!selectedFile && !selectedImage) {
      toast.error('Kripya pehle tasveer chunein ya camera se photo lein.');
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

      // Enforce client-side timeout (~20s) distinct from generic axios timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT: OpenCV Biomarker Jaanch mein 20 second se zyada samay laga. Server ya network slow ho sakta hai.'));
        }, 20000);
      });

      const data = await Promise.race([
        runEdgeDiagnosticScreening(screeningType, fileToSend),
        timeoutPromise
      ]);

      setResult({
        type: data.screening_type === 'ANEMIA'
          ? 'Khoon Ki Kami (Anemia Screening)'
          : data.screening_type === 'JAUNDICE'
          ? 'Peeliya (Jaundice Screening)'
          : data.screening_type === 'ORAL_MUCOSA'
          ? 'Mukh Rog (Oral Leukoplakia Screening)'
          : 'Twacha Rog (Skin Lesion Screening)',
        biomarker: data.biomarker,
        score: data.calculated_index,
        threshold: data.cutoff_threshold,
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
        source: 'backend_cv',
      });

      setShowAnnotated(true);
      setActiveStep(3);
      toast.success('OpenCV AI Jaanch safalta-purvak poori hui');
    } catch (err) {
      console.error('Screening execution error:', err);
      const isTimeout = err?.message?.includes('TIMEOUT');
      const errorMsg = isTimeout
        ? 'AI Jaanch timeout (20s) ho gayi. Kripya punah prayas karein.'
        : (err?.response?.data?.detail || err?.message || 'Jaanch mein samasya aayi. Kripya tasveer dobara check karein.');
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
  };

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-primary">
      
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 bg-sage/10 dark:bg-sage/20 text-sage dark:text-booti-glow px-4 py-1.5 rounded-full text-xs font-bold mb-3 border border-sage/20">
          <Eye className="w-4 h-4 text-gold-warm" />
          <span>Netra & Mukh Edge Jaanch • Non-Invasive Diagnostics</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-primary leading-tight">
          Pahadi Kshetra Digital Swasthya Jaanch
        </h1>
        <p className="text-xs sm:text-sm text-muted dark:text-muted mt-2 leading-relaxed">
          Bina suee chubhaaye, camera photo se Khoon Ki Kami (Anemia), Peeliya (Jaundice), Mukh Rog (Leukoplakia) aur Twacha ke lakshan pehchanein.
        </p>
      </div>

      {/* ── 4-Modality Tab Bar ──────────────────────────────────── */}
      <div className="max-w-4xl mx-auto mb-6 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {Object.entries(modalities).map(([key, item]) => {
          const Icon = item.icon;
          const isSelected = screeningType === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setScreeningType(key);
                setResult(null);
                setActiveStep(1);
              }}
              className={`touch-target p-3 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-sage text-white border-sage shadow-md shadow-sage/20 ring-2 ring-sage/30'
                  : 'bg-white dark:bg-warm-indigo text-muted dark:text-muted border-gray-200 dark:border-gray-800 hover:border-sage/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : 'bg-sage/10 text-sage dark:text-booti-glow'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm leading-snug">{item.title}</div>
                <div className="text-[10px] opacity-75 truncate mt-0.5">{item.subtitle.split('•')[0]}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 4-Stage Pipeline Progress ────────────────────────────── */}
      <div className="max-w-4xl mx-auto mb-6 bg-white dark:bg-warm-indigo rounded-2xl p-2.5 sm:p-3 border border-sage/20 shadow-xs">
        <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-[11px] sm:text-xs font-bold">
          {[
            { num: 1, label: '1. SCAN', desc: 'Tasveer Lein' },
            { num: 2, label: '2. PROCESS', desc: 'Biomarker Scan' },
            { num: 3, label: '3. RESULT', desc: 'Clinical Report' },
            { num: 4, label: '4. REFERRAL', desc: 'PHC Parcha' },
          ].map((stage) => {
            const isCompleted = activeStep > stage.num || (activeStep === 3 && stage.num <= 3);
            const isCurrent = activeStep === stage.num;
            return (
              <div
                key={stage.num}
                className={`py-2 px-1 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-sage text-white shadow-xs'
                    : isCompleted
                    ? 'bg-sage/15 text-sage dark:text-booti-glow'
                    : 'text-gray-400 dark:text-gray-400'
                }`}
              >
                <div className="font-bold leading-tight">{stage.label}</div>
                <div className="text-[10px] opacity-80 truncate hidden sm:block">{stage.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2-Column Work Area ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Image Capture & Controls (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-warm-indigo p-5 sm:p-7 rounded-3xl shadow-sm border border-sage/20 dark:border-gray-800 space-y-5">
          
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
                  <label className="touch-target cursor-pointer px-4 py-2.5 bg-sage hover:bg-sage/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all">
                    <Upload className="w-4 h-4" />
                    <span>Gallery Se Chunein</span>
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
                    className="touch-target px-4 py-2.5 bg-white dark:bg-card border border-sage/30 text-sage dark:text-booti-glow rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-sage/10 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Live Camera Kholein</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDemoSample}
                    className="touch-target px-3.5 py-2.5 bg-gold-warm/15 border border-gold-warm/30 text-gold-warm dark:text-gold-warm rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-gold-warm/25 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Demo Photo Load Karein</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clinical Photography Instructions */}
          <div className="bg-mist dark:bg-card p-4 rounded-2xl border border-sage/15 dark:border-gray-800 text-xs space-y-1.5 text-muted dark:text-muted">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <Info className="w-4 h-4 text-sage" />
              <span>Sahi Tasveer Lene Ke Niyam ({modalities[screeningType].title}):</span>
            </div>
            <p>• {modalities[screeningType].guideText}</p>
            <p>• Camera flash off rakhein taaki natural tissue color reflect ho.</p>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleRunScreening}
            disabled={(!selectedImage && !selectedFile) || loading}
            className="touch-target w-full bg-sage hover:bg-sage/90 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-md shadow-sage/20 transition-all"
          >
            {loading ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> Biomarker Scan Ho Raha Hai…</>
            ) : (
              <><CheckCircle2 className="w-5 h-5" /> AI Biomarker Jaanch Shuru Karein</>
            )}
          </button>
        </div>

        {/* Right Column: Results & Clinical Actions (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-warm-indigo p-5 sm:p-7 rounded-3xl shadow-sm border border-sage/20 dark:border-gray-800 space-y-5">
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
                  <span>PHC Doctor Ke Liye Referral Parcha Kholein</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  to="/mitra/chat"
                  className="touch-target w-full bg-white dark:bg-card border border-sage/30 hover:bg-sage/10 text-sage dark:text-booti-glow font-bold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Dr. Sanjeevani Se Paramarsh Karein</span>
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
                  AI Jaanch Asafal Rahi (Screening Failed)
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
                  <span>Try Again (पुनः प्रयास करें)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted dark:text-muted py-16 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-sage/10 dark:bg-gray-800 flex items-center justify-center mx-auto text-sage mb-2">
                <Eye className="w-8 h-8 opacity-70" />
              </div>
              <p className="text-sm font-bold text-primary">
                Tasveer chuniye aur jaanch shuru kijiye
              </p>
              <p className="text-xs text-muted dark:text-muted max-w-xs mx-auto leading-relaxed">
                OpenCV colorimetric index, anumaanit clinical metric aur doctor recommendation yahan nishkarsh ke roop mein dikhega.
              </p>
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
                    ABDM Diagnostic Referral Parcha
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
                <span className="text-muted dark:text-muted">Report ID:</span>
                <span className="font-bold text-primary">{result.fhir_report?.id || 'SANJ-REF-001'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Date / Time:</span>
                <span>{new Date().toLocaleDateString('hi-IN')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Screening Test:</span>
                <span className="font-bold">{result.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Calculated Score:</span>
                <span className="font-bold">{result.score} (Cutoff: {result.threshold})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Estimated Metric:</span>
                <span className="font-bold text-rose-soft dark:text-rose-soft">{result.estimated_metric || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted dark:text-muted">Risk Grade:</span>
                <span className="font-bold">{result.risk}</span>
              </div>
            </div>

            {/* Referral Note */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs leading-relaxed">
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                Prathmik Swasthya Kendra (PHC) Chikitsak Hetu:
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
                      toast.success('ABDM FHIR DiagnosticReport JSON download hua');
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
                  <span>Parcha Print Karein</span>
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
