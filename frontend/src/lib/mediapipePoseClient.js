import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * MediaPipe Pose Landmarker Singleton Client
 *
 * Self-hosted under frontend/public/models/ and frontend/public/wasm/ to satisfy
 * strict offline rural health camp deployments, low-bandwidth mobile connections,
 * and prevent external CDN/CSP blocks. Falls back to jsDelivr / Google Storage CDN
 * if local assets are unavailable.
 */

let landmarkerInstance = null;
let initPromise = null;

const LOCAL_WASM_PATH = '/wasm';
const CDN_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

const LOCAL_MODEL_PATH = '/models/pose_landmarker_lite.task';
const CDN_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export async function initPoseLandmarker() {
  if (landmarkerInstance) {
    return landmarkerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let vision = null;

    // 1. Resolve WASM binaries (try local self-hosted first, fallback to CDN)
    try {
      vision = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);
    } catch (localErr) {
      console.warn('Local WASM fileset failed, falling back to CDN:', localErr);
      vision = await FilesetResolver.forVisionTasks(CDN_WASM_PATH);
    }

    // 2. Initialize PoseLandmarker with lite model (optimized for mobile/low-end Android)
    const createOptions = (modelPath, delegate = 'GPU') => ({
      baseOptions: {
        modelAssetPath: modelPath,
        delegate,
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    try {
      // Attempt 1: Local model with GPU acceleration
      landmarkerInstance = await PoseLandmarker.createFromOptions(vision, createOptions(LOCAL_MODEL_PATH, 'GPU'));
    } catch (err1) {
      console.warn('GPU/local model init failed, attempting CPU fallback:', err1);
      try {
        // Attempt 2: Local model with CPU fallback
        landmarkerInstance = await PoseLandmarker.createFromOptions(vision, createOptions(LOCAL_MODEL_PATH, 'CPU'));
      } catch (err2) {
        console.warn('Local model failed, falling back to Google CDN model:', err2);
        // Attempt 3: CDN model
        landmarkerInstance = await PoseLandmarker.createFromOptions(vision, createOptions(CDN_MODEL_PATH, 'CPU'));
      }
    }

    return landmarkerInstance;
  })();

  return initPromise;
}

export function getPoseLandmarker() {
  return landmarkerInstance;
}

export function isPoseLandmarkerReady() {
  return !!landmarkerInstance;
}
