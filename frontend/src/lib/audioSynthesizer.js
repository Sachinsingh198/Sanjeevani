/**
 * Web Audio API Synthesizer for Himalayan Soundscapes, Tibetan Singing Bowls,
 * Meditation Chimes, and Ambient Nature Drones.
 * 100% client-side, zero external MP3 dependencies, works completely offline.
 */

import { speakText } from '../api/voiceClient';

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a resonant Tibetan Singing Bowl sound
 * @param {number} freq - fundamental frequency (default 216Hz - Himalayan heart frequency)
 * @param {number} duration - duration in seconds
 */
export function playSingingBowl(freq = 216, duration = 4.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.28, now + 0.15);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(ctx.destination);

    // Fundamental + 2 harmonic overtones (Tibetan bowl acoustic profile)
    const overtones = [
      { f: freq, gain: 0.7 },
      { f: freq * 2.76, gain: 0.35 },
      { f: freq * 5.4, gain: 0.18 },
    ];

    overtones.forEach(({ f, gain }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      // Add gentle acoustic vibrato / beating
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(1.8, now); // 1.8 Hz subtle wave
      lfoGain.gain.setValueAtTime(1.5, now);
      lfo.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);

      oscGain.gain.setValueAtTime(gain, now);
      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });
  } catch (err) {
    console.warn('Singing bowl audio error:', err);
  }
}

/**
 * Play a peaceful Meditation Chime (Ding-sha bell)
 */
export function playMeditationChime(type = 'start') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    masterGain.connect(ctx.destination);

    const freq = type === 'inhale' ? 528 : type === 'exhale' ? 396 : type === 'hold' ? 432 : 639;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(masterGain);

    osc.start(now);
    osc.stop(now + 3.2);
  } catch (err) {
    console.warn('Chime audio error:', err);
  }
}

/**
 * Ambient Himalayan Nature Stream & Flute Generator
 */
class AmbientSoundscapeEngine {
  constructor() {
    this.activeTrack = null;
    this.nodes = [];
    this.isPlaying = false;
  }

  start(trackName = 'river') {
    this.stop();
    const ctx = getAudioContext();
    if (!ctx) return;

    this.isPlaying = true;
    this.activeTrack = trackName;

    if (trackName === 'river') {
      this._startRiver(ctx);
    } else if (trackName === 'om') {
      this._startOmDrone(ctx);
    } else if (trackName === 'bowls') {
      this._startSingingBowlLoop(ctx);
    }
  }

  _startRiver(ctx) {
    // Pink noise buffer with gentle filtering for mountain stream sound
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;

    const gain = ctx.createGain();
    gain.gain.value = 0.18;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    this.nodes.push(noise, gain);
  }

  _startOmDrone(ctx) {
    // 136.1 Hz (Cosmic Om frequency) with subharmonic warmth
    const baseFreq = 136.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 1.5);
    gain.connect(ctx.destination);

    [1, 2, 3].forEach((mult) => {
      const osc = ctx.createOscillator();
      osc.type = mult === 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * mult, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      this.nodes.push(osc);
    });

    this.nodes.push(gain);
  }

  _startSingingBowlLoop(ctx) {
    // Plays periodic singing bowls
    this.bowlInterval = setInterval(() => {
      if (this.isPlaying) {
        const freqs = [192, 216, 256, 288];
        const randomFreq = freqs[Math.floor(Math.random() * freqs.length)];
        playSingingBowl(randomFreq, 6.0);
      }
    }, 5500);

    playSingingBowl(216, 6.0);
  }

  stop() {
    this.isPlaying = false;
    this.activeTrack = null;
    if (this.bowlInterval) {
      clearInterval(this.bowlInterval);
      this.bowlInterval = null;
    }
    this.nodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {
        // ignore
      }
    });
    this.nodes = [];
  }
}

export const ambientSoundscape = new AmbientSoundscapeEngine();

let currentCueStop = null;

/**
 * Speech synthesis helper in Hindi or English using authentic Indian Neural voice
 */
export function speakCue(text, lang = 'hi-IN') {
  if (!text) return;
  if (currentCueStop) {
    try { currentCueStop(); } catch {}
    currentCueStop = null;
  }
  const clean = text.replace(/[*_#`~>\[\]]/g, '').trim();
  if (!clean) return;

  const isHindi = lang.startsWith('hi') || lang.includes('hi') || lang === 'garhwali';
  currentCueStop = speakText(clean, {
    language: isHindi ? 'hi' : 'en',
    gender: 'female',
    onEnd: () => {
      currentCueStop = null;
    },
  });
}
