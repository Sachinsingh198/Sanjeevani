import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Camera, CameraOff, Play, Pause, RotateCcw,
  Sparkles, CheckCircle2, AlertCircle, Volume2, VolumeX,
  Award, ArrowLeft, ShieldCheck, ChevronRight, RefreshCw, Eye
} from 'lucide-react';
import {
  YOGA_ASANAS, evaluatePosture, drawSkeletonOnCanvas, POSE_LANDMARKS
} from '../lib/poseDetection';
import { playSingingBowl, playMeditationChime, speakCue } from '../lib/audioSynthesizer';
import toast from 'react-hot-toast';

export default function YogaTeacher() {
  const [selectedAsana, setSelectedAsana] = useState(YOGA_ASANAS[0]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [isHoldingPose, setIsHoldingPose] = useState(false);
  const [holdTimerSec, setHoldTimerSec] = useState(selectedAsana.targetHoldsSec);
  const [poseCompleted, setPoseCompleted] = useState(false);

  // Posture assessment state
  const [alignmentScore, setAlignmentScore] = useState(0);
  const [postureChecks, setPostureChecks] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('Camera ke samne pura sharir dikhayein taaki mudra ki jaanch ho sake.');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceCuesEnabled, setVoiceCuesEnabled] = useState(true);

  // Video & Canvas references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const lastSpokenCueRef = useRef(0);

  const startCamera = async () => {
    try {
      setIsSimulatedMode(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      toast.success('Webcam connected! Stand back to fit your full body.');
      playSingingBowl(216, 3.0);
    } catch (err) {
      console.warn('Camera access error:', err);
      toast.error('Camera access nahi mila. Practice Simulation Mode shuru kiya gaya.');
      startSimulationMode();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsSimulatedMode(false);
    setIsHoldingPose(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startSimulationMode = () => {
    stopCamera();
    setIsSimulatedMode(true);
    setIsCameraActive(true);
    toast('Practice Mode Active (Real-time simulated geometry).', { icon: '🧘' });
  };

  const generateSimulatedLandmarks = (asanaId, tick) => {
    const wobble = Math.sin(tick / 15) * 0.015;

    let leftKneeY = 0.72 + wobble;
    let rightKneeY = 0.72 - wobble;
    let leftAnkleX = 0.45;
    let rightAnkleX = 0.55;
    let rightKneeX = 0.55;
    let leftWristY = 0.5;
    let rightWristY = 0.5;
    let leftShoulderY = 0.35;
    let rightShoulderY = 0.35 + wobble;

    if (asanaId === 'tadasana') {
      leftWristY = 0.18 + wobble;
      rightWristY = 0.18 + wobble;
    } else if (asanaId === 'vrikshasana') {
      rightKneeX = 0.65;
      rightKneeY = 0.60;
      leftWristY = 0.38;
      rightWristY = 0.38;
    } else if (asanaId === 'virabhadrasana') {
      rightKneeX = 0.68;
      rightKneeY = 0.68;
      leftAnkleX = 0.32;
      rightAnkleX = 0.75;
      leftWristY = 0.35;
      rightWristY = 0.35;
    }

    const landmarks = Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }));
    landmarks[POSE_LANDMARKS.NOSE] = { x: 0.5 + wobble, y: 0.22, z: 0 };
    landmarks[POSE_LANDMARKS.LEFT_SHOULDER] = { x: 0.44, y: leftShoulderY, z: 0 };
    landmarks[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: 0.56, y: rightShoulderY, z: 0 };
    landmarks[POSE_LANDMARKS.LEFT_ELBOW] = { x: 0.40, y: (leftShoulderY + leftWristY) / 2, z: 0 };
    landmarks[POSE_LANDMARKS.RIGHT_ELBOW] = { x: 0.60, y: (rightShoulderY + rightWristY) / 2, z: 0 };
    landmarks[POSE_LANDMARKS.LEFT_WRIST] = { x: 0.38, y: leftWristY, z: 0 };
    landmarks[POSE_LANDMARKS.RIGHT_WRIST] = { x: 0.62, y: rightWristY, z: 0 };
    landmarks[POSE_LANDMARKS.LEFT_HIP] = { x: 0.46, y: 0.52, z: 0 };
    landmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: 0.54, y: 0.52, z: 0 };
    landmarks[POSE_LANDMARKS.LEFT_KNEE] = { x: 0.46, y: leftKneeY, z: 0 };
    landmarks[POSE_LANDMARKS.RIGHT_KNEE] = { x: rightKneeX, y: rightKneeY, z: 0 };
    landmarks[POSE_LANDMARKS.LEFT_ANKLE] = { x: leftAnkleX, y: 0.88, z: 0 };
    landmarks[POSE_LANDMARKS.RIGHT_ANKLE] = { x: rightAnkleX, y: 0.88, z: 0 };

    return landmarks;
  };

  useEffect(() => {
    if (!isCameraActive) return;

    let tick = 0;

    const processFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width || 640;
      const height = canvas.height || 480;

      const currentLandmarks = generateSimulatedLandmarks(selectedAsana.id, tick);
      tick++;

      const result = evaluatePosture(currentLandmarks, selectedAsana.id);
      setAlignmentScore(result.score);
      setPostureChecks(result.checks);
      setFeedbackMessage(result.feedbackText);

      drawSkeletonOnCanvas(ctx, currentLandmarks, result.checks, width, height);

      const now = Date.now();
      if (voiceCuesEnabled && now - lastSpokenCueRef.current > 7500) {
        if (result.score >= 80) {
          speakCue('Uttam posture! Sthir rahein.', 'hi-IN');
        } else if (result.feedbackText) {
          speakCue(result.feedbackText, 'hi-IN');
        }
        lastSpokenCueRef.current = now;
      }

      if (result.score >= 70 && !isHoldingPose && !poseCompleted) {
        setIsHoldingPose(true);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraActive, selectedAsana, voiceCuesEnabled, isHoldingPose, poseCompleted]);

  useEffect(() => {
    if (!isHoldingPose || poseCompleted) {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      return;
    }

    holdIntervalRef.current = setInterval(() => {
      setHoldTimerSec((prev) => {
        if (prev <= 1) {
          clearInterval(holdIntervalRef.current);
          setIsHoldingPose(false);
          setPoseCompleted(true);
          if (soundEnabled) playSingingBowl(256, 5.0);
          if (voiceCuesEnabled) speakCue('Shabaash! Asana sampurna hua!', 'hi-IN');
          toast.success(`🎉 Asana Sampurna! ${selectedAsana.targetHoldsSec}s hold safalta-purvak kiya.`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHoldingPose, poseCompleted, selectedAsana, soundEnabled, voiceCuesEnabled]);

  const handleResetPose = () => {
    setHoldTimerSec(selectedAsana.targetHoldsSec);
    setPoseCompleted(false);
    setIsHoldingPose(false);
  };

  const handleSelectAsana = (asana) => {
    setSelectedAsana(asana);
    setHoldTimerSec(asana.targetHoldsSec);
    setPoseCompleted(false);
    setIsHoldingPose(false);
    toast.success(`${asana.name} chuna gaya`);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F0] dark:bg-[#151D28] text-[#1E2A43] dark:text-[#EAEFEA] pb-16 transition-colors duration-300">
      
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#5A7855]/15 via-white/80 dark:via-[#1E2A43]/80 to-[#F4F6F0] dark:to-[#151D28] border-b border-gray-200/80 dark:border-gray-800 pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/patient"
            className="touch-target inline-flex items-center gap-2 text-xs font-semibold text-[#556376] dark:text-[#A8B4C2] hover:text-[#1E2A43] dark:hover:text-[#F4F6F0] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mitra Dashboard Par Wapas</span>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#5A7855]/10 dark:bg-[#5A7855]/25 text-[#2B4A30] dark:text-[#8ED14C] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5 text-[#D4A359]" />
                <span>AI Yogashala & Posture Coach • योग व मुद्रा सुधारक</span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#1E2A43] dark:text-[#F4F6F0]">
                Himalayan Yoga Guru
              </h1>
              <p className="text-xs md:text-sm text-[#556376] dark:text-[#A8B4C2] mt-1 max-w-xl leading-relaxed">
                Computer-vision aadharit mudra jaanch. Reerh ki haddi ka santulan, jod ke kon (joint angles) aur aawaz dwara sudhar.
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoiceCuesEnabled(!voiceCuesEnabled)}
                className={`touch-target flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  voiceCuesEnabled ? 'bg-[#D4A359]/20 text-[#8C5E24] dark:text-[#D4A359]' : 'bg-gray-100 dark:bg-gray-800 text-[#556376]'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>Aawaz Nirdesh (Voice Guidance)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* ── ASANA SELECTION CAROUSEL / ROW ───────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {YOGA_ASANAS.map((asana) => {
            const isSelected = selectedAsana.id === asana.id;
            return (
              <button
                key={asana.id}
                onClick={() => handleSelectAsana(asana)}
                className={`touch-target p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#5A7855] text-white border-[#5A7855] shadow-md transform -translate-y-0.5'
                    : 'bg-white dark:bg-[#1E2A43] text-[#1E2A43] dark:text-[#F4F6F0] border-gray-200/80 dark:border-gray-800 hover:border-[#5A7855]/40'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase block ${isSelected ? 'text-white/80' : 'text-[#8C5E24] dark:text-[#D4A359]'}`}>
                  {asana.difficulty}
                </span>
                <h4 className="font-serif font-bold text-xs md:text-sm mt-1 truncate">{asana.name}</h4>
                <p className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-[#556376] dark:text-[#A8B4C2]'}`}>
                  {asana.hindiName}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── MAIN WORKSPACE: CAMERA VIEW & LIVE CORRECTION HUD ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Live Camera & Posture Overlay (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#1E2A43] rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#5A7855]" />
                  Live Posture Camera (मुद्रा जांच स्क्रीन)
                </h3>
                <p className="text-[11px] text-[#556376] dark:text-[#A8B4C2]">Real-time skeletal joint analysis feed</p>
              </div>

              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="touch-target flex items-center gap-1.5 bg-[#A23B33]/10 text-[#A23B33] dark:text-[#FF7878] hover:bg-[#A23B33] hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Camera Band Karein</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={startCamera}
                    className="touch-target flex items-center gap-1.5 bg-[#5A7855] hover:bg-[#4a6346] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera Kholein</span>
                  </button>
                  <button
                    onClick={startSimulationMode}
                    className="touch-target flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-[#1E2A43] dark:text-gray-200 hover:bg-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D4A359]" />
                    <span>Practice Mode</span>
                  </button>
                </div>
              )}
            </div>

            {/* Video + Canvas Stage */}
            <div className="relative w-full aspect-[4/3] bg-black/90 rounded-3xl overflow-hidden border border-gray-800 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                  isSimulatedMode ? 'hidden' : ''
                }`}
              />

              {isSimulatedMode && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a2319] via-[#0f1412] to-black flex items-center justify-center">
                  <div className="text-center opacity-30 pointer-events-none">
                    <span className="text-6xl">🏔️</span>
                    <p className="text-xs text-white mt-2">Himalayan Yogashala Simulated Arena</p>
                  </div>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
              />

              {!isCameraActive && (
                <div className="relative z-20 text-center p-6 max-w-sm">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h4 className="text-white font-bold text-sm">Camera abhi band hai</h4>
                  <p className="text-white/70 text-xs mt-1 leading-relaxed">
                    "Camera Kholein" par click karke real-time AI jaanch shuru karein ya Practice Mode chunein.
                  </p>
                  <button
                    onClick={startCamera}
                    className="touch-target mt-4 bg-[#5A7855] hover:bg-[#4a6346] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-all"
                  >
                    Camera Shuru Karein
                  </button>
                </div>
              )}

              {isCameraActive && (
                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
                  <div className="bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        alignmentScore >= 80
                          ? 'bg-emerald-400 animate-ping'
                          : alignmentScore >= 50
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span className="text-white font-mono font-bold text-xs">
                      {alignmentScore}% Santulan
                    </span>
                  </div>

                  {isHoldingPose && (
                    <div className="bg-emerald-600/90 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg animate-pulse flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Hold: {holdTimerSec}s
                    </div>
                  )}

                  {poseCompleted && (
                    <div className="bg-[#D4A359] text-[#1E2A43] px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> Sampurna!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Verbal Advice Banner */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
              alignmentScore >= 80
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-[#D4A359]/10 border-[#D4A359]/30 text-[#1E2A43] dark:text-[#EAEFEA]'
            }`}>
              <Sparkles className="w-4 h-4 text-[#D4A359] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">AI Posture Guru Margdarshan:</p>
                <p className="text-xs mt-0.5 leading-relaxed">{feedbackMessage}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Step Checklist & Asana Anatomy (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Active Asana Details Card */}
            <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase bg-[#5A7855]/15 text-[#2B4A30] dark:text-[#8ED14C] px-2.5 py-0.5 rounded-md">
                    {selectedAsana.difficulty}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#1E2A43] dark:text-[#F4F6F0] mt-1">
                    {selectedAsana.name}
                  </h3>
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2]">{selectedAsana.hindiName}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-[#8C5E24] dark:text-[#D4A359]">{selectedAsana.targetHoldsSec} Sec</p>
                  <p className="text-[10px] text-[#556376] dark:text-[#A8B4C2]">Target Hold</p>
                </div>
              </div>

              {/* Progress & Reset */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleResetPose}
                  className="touch-target flex-1 flex items-center justify-center gap-2 bg-[#F7F2E8]/60 dark:bg-[#182332] hover:bg-gray-100 text-[#1E2A43] dark:text-[#F4F6F0] text-xs font-semibold py-2.5 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Timer Reset Karein</span>
                </button>
              </div>

              {/* Real-time Physiological Checklist */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#556376] dark:text-[#A8B4C2]">
                  Alignment Checklist ({postureChecks.length})
                </h4>

                {postureChecks.length === 0 ? (
                  <p className="text-xs text-[#556376] dark:text-[#A8B4C2] italic py-2">
                    Camera ya Practice Mode chalu karke live check dekhein.
                  </p>
                ) : (
                  postureChecks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-3 rounded-2xl text-xs flex items-center justify-between border transition-all ${
                        chk.passed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {chk.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold">{chk.name}</p>
                          <p className="text-[10px] text-[#556376] dark:text-[#A8B4C2]">{chk.advice}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold shrink-0 ml-2">
                        {chk.current}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Benefits & Precautions Card */}
            <div className="bg-white dark:bg-[#1E2A43] rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
              <h4 className="font-serif font-bold text-sm text-[#1E2A43] dark:text-[#F4F6F0] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5A7855]" />
                Ayurvedic & Clinical Salah
              </h4>

              <div className="text-xs space-y-2 text-[#556376] dark:text-[#A8B4C2] leading-relaxed">
                <p>
                  <strong className="text-[#1E2A43] dark:text-[#F4F6F0]">Mukhya Dhyan:</strong> {selectedAsana.keyFocus}
                </p>
                <p>
                  <strong className="text-[#1E2A43] dark:text-[#F4F6F0]">Sharir Ko Laabh:</strong> {selectedAsana.benefits}
                </p>
                <p className="text-[#A23B33] dark:text-[#FF7878]">
                  <strong>Savdhani:</strong> {selectedAsana.precautions}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <h5 className="text-[11px] font-bold text-[#1E2A43] dark:text-[#F4F6F0] mb-1.5">Abhyas Kaise Karein:</h5>
                <ol className="list-decimal list-inside text-xs text-[#556376] dark:text-[#A8B4C2] space-y-1">
                  {selectedAsana.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
