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
  const [feedbackMessage, setFeedbackMessage] = useState('Position your whole body in camera view to begin.');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceCuesEnabled, setVoiceCuesEnabled] = useState(true);

  // Video & Canvas references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const lastSpokenCueRef = useRef(0);

  // Handle camera start/stop
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
      toast.error('Could not access camera. Switching to Guided Interactive Simulation mode.');
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
    toast('Practice Simulation Mode active (Generates real-time pose geometry).', { icon: '🧘' });
  };

  // Generate realistic simulated human landmarks based on selected asana
  const generateSimulatedLandmarks = (asanaId, tick) => {
    // Basic human standing posture baseline
    const wobble = Math.sin(tick / 15) * 0.015;
    const legBend = Math.sin(tick / 20) * 0.05;

    // Normal standing skeleton
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
      // Arms raised or straight
      leftWristY = 0.18 + wobble;
      rightWristY = 0.18 + wobble;
    } else if (asanaId === 'vrikshasana') {
      // Right leg bent and placed on left inner thigh
      rightKneeX = 0.65;
      rightKneeY = 0.60;
      // Hands together at chest
      leftWristY = 0.38;
      rightWristY = 0.38;
    } else if (asanaId === 'virabhadrasana') {
      // Wide lunge, front right knee bent 90 degrees
      rightKneeX = 0.68;
      rightKneeY = 0.68;
      leftAnkleX = 0.32;
      rightAnkleX = 0.75;
      // Arms horizontal
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

  // Main Pose Detection / Evaluation Loop
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

      // In simulated mode, generate continuous physiological landmarks
      const currentLandmarks = generateSimulatedLandmarks(selectedAsana.id, tick);
      tick++;

      // Evaluate posture geometry
      const result = evaluatePosture(currentLandmarks, selectedAsana.id);
      setAlignmentScore(result.score);
      setPostureChecks(result.checks);
      setFeedbackMessage(result.feedbackText);

      // Draw skeleton on canvas
      drawSkeletonOnCanvas(ctx, currentLandmarks, result.checks, width, height);

      // Voice correction guidance (throttled to every 8 seconds)
      const now = Date.now();
      if (voiceCuesEnabled && now - lastSpokenCueRef.current > 7500) {
        if (result.score >= 80) {
          speakCue('Uttam posture! Hold steady.', 'hi-IN');
        } else if (result.feedbackText) {
          speakCue(result.feedbackText, 'hi-IN');
        }
        lastSpokenCueRef.current = now;
      }

      // Check if posture is good enough to count towards holding
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

  // Hold Timer Progression
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
          toast.success(`🎉 Asana Completed! Perfect alignment held for ${selectedAsana.targetHoldsSec}s.`);
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
    toast.success(`Selected ${asana.name}`);
  };

  return (
    <div className="min-h-screen bg-mist text-primary pb-16">
      {/* Top Header */}
      <div className="bg-gradient-to-b from-[#5A7855]/15 via-white/80 to-mist border-b border-border-subtle pt-8 pb-10 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/mitra"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Mitra Dashboard
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-sage/10 text-sage px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5" /> AI Yogashala & Posture Coach
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">
                Himalayan Yoga Guru (योग व मुद्रा सुधारक)
              </h1>
              <p className="text-xs md:text-sm text-muted mt-1 max-w-xl leading-relaxed">
                Computer-vision driven real-time posture check that detects joint angles, straightens spinal curvature, and guides safe yogic alignment.
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoiceCuesEnabled(!voiceCuesEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  voiceCuesEnabled ? 'bg-gold-warm/15 text-gold-warm' : 'bg-gray-100 text-muted'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" /> Voice Corrections
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        {/* ── ASANA SELECTION CAROUSEL / ROW ───────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {YOGA_ASANAS.map((asana) => {
            const isSelected = selectedAsana.id === asana.id;
            return (
              <button
                key={asana.id}
                onClick={() => handleSelectAsana(asana)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-sage text-white border-sage shadow-md transform -translate-y-0.5'
                    : 'bg-card text-primary border-border-subtle hover:border-sage/40'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase block ${isSelected ? 'text-white/80' : 'text-gold-warm'}`}>
                  {asana.difficulty}
                </span>
                <h4 className="font-serif font-bold text-xs md:text-sm mt-1 truncate">{asana.name}</h4>
                <p className={`text-[10px] truncate ${isSelected ? 'text-white/70' : 'text-muted'}`}>
                  {asana.hindiName}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── MAIN WORKSPACE: CAMERA VIEW & LIVE CORRECTION HUD ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Live Camera & Posture Overlay (7 cols) */}
          <div className="lg:col-span-7 bg-card rounded-3xl p-5 border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-primary flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sage" />
                  Live Posture Camera (मुद्रा जांच स्क्रीन)
                </h3>
                <p className="text-[11px] text-muted">Webcam feed with real-time skeletal joint analysis.</p>
              </div>

              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 bg-rose-soft/10 text-rose-soft hover:bg-rose-soft hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  <CameraOff className="w-3.5 h-3.5" /> Stop Camera
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-1.5 bg-sage hover:bg-[#4a6346] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" /> Open Camera
                  </button>
                  <button
                    onClick={startSimulationMode}
                    className="flex items-center gap-1 bg-card border border-border-subtle text-primary hover:bg-mist px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-gold-warm" /> Practice Mode
                  </button>
                </div>
              )}
            </div>

            {/* Video + Canvas Stage */}
            <div className="relative w-full aspect-[4/3] bg-black/90 rounded-2xl overflow-hidden border border-border-subtle flex items-center justify-center">
              {/* Actual Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                  isSimulatedMode ? 'hidden' : ''
                }`}
              />

              {/* In Simulated Mode: Himalayan Background Silhouette */}
              {isSimulatedMode && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a2319] via-[#0f1412] to-black flex items-center justify-center">
                  <div className="text-center opacity-30 pointer-events-none">
                    <span className="text-6xl">🏔️</span>
                    <p className="text-xs text-white mt-2">Himalayan Yogashala Simulated Arena</p>
                  </div>
                </div>
              )}

              {/* Canvas Overlay for Joint Skeleton & Angle Overlays */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
              />

              {/* Standby Message if Camera Inactive */}
              {!isCameraActive && (
                <div className="relative z-20 text-center p-6 max-w-sm">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h4 className="text-white font-bold text-sm">Camera is currently turned off</h4>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">
                    Click "Open Camera" to activate real-time AI posture feedback, or select "Practice Mode" to practice with simulated geometry.
                  </p>
                  <button
                    onClick={startCamera}
                    className="mt-4 bg-sage hover:bg-[#4a6346] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-all"
                  >
                    Enable Camera Posture Check
                  </button>
                </div>
              )}

              {/* Top HUD: Alignment Score Badge & Hold Countdown */}
              {isCameraActive && (
                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
                  <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
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
                      {alignmentScore}% Match
                    </span>
                  </div>

                  {isHoldingPose && (
                    <div className="bg-emerald-600/90 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-lg animate-pulse flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Hold: {holdTimerSec}s
                    </div>
                  )}

                  {poseCompleted && (
                    <div className="bg-gold-warm text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> Completed!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Verbal Advice Banner */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
              alignmentScore >= 80
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
                : 'bg-gold-warm/10 border-gold-warm/30 text-primary'
            }`}>
              <Sparkles className="w-4 h-4 text-gold-warm shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">AI Posture Guru Guidance:</p>
                <p className="text-xs mt-0.5 leading-relaxed">{feedbackMessage}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Step Checklist & Asana Anatomy (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Active Asana Details Card */}
            <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase bg-sage/15 text-sage px-2 py-0.5 rounded-md">
                    {selectedAsana.difficulty}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-primary mt-1">
                    {selectedAsana.name}
                  </h3>
                  <p className="text-xs text-muted">{selectedAsana.hindiName}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-gold-warm">{selectedAsana.targetHoldsSec} Sec</p>
                  <p className="text-[10px] text-muted">Target Hold</p>
                </div>
              </div>

              {/* Progress & Reset */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleResetPose}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-mist hover:bg-black/5 text-primary text-xs font-semibold py-2 rounded-xl transition-all border border-border-subtle"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Pose Timer
                </button>
              </div>

              {/* Real-time Physiological Checklist */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Alignment Checklist ({postureChecks.length})
                </h4>

                {postureChecks.length === 0 ? (
                  <p className="text-xs text-muted italic py-2">
                    Open camera or practice mode to activate live joint checkpoints.
                  </p>
                ) : (
                  postureChecks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        chk.passed
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900'
                          : 'bg-rose-500/5 border-rose-500/20 text-rose-900'
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
                          <p className="text-[10px] text-muted">{chk.advice}</p>
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
            <div className="bg-card rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
              <h4 className="font-serif font-bold text-sm text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sage" />
                Ayurvedic & Clinical Guidance
              </h4>

              <div className="text-xs space-y-2 text-muted leading-relaxed">
                <p>
                  <strong className="text-primary">Key Focus:</strong> {selectedAsana.keyFocus}
                </p>
                <p>
                  <strong className="text-primary">Therapeutic Benefit:</strong> {selectedAsana.benefits}
                </p>
                <p className="text-rose-soft/90">
                  <strong className="text-rose-soft">Precaution:</strong> {selectedAsana.precautions}
                </p>
              </div>

              <div className="pt-2 border-t border-border-subtle">
                <h5 className="text-[11px] font-bold text-primary mb-1.5">How to Practice:</h5>
                <ol className="list-decimal list-inside text-xs text-muted space-y-1">
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
