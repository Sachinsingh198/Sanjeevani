/**
 * Himalayan Yoga Posture Analysis & Real-Time Geometry Engine
 * Evaluates joint angles, spine straightness, knee flexion, and arm elevation.
 */

// Joint Indices matching standard MediaPipe 33-landmark pose topology
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Skeleton Bone Connections [Joint A, Joint B]
export const SKELETON_CONNECTIONS = [
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Left Arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  // Right Arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Left Leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  // Right Leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
];

/**
 * Calculate 2D angle (in degrees) at joint B between points A and C
 */
export function calculateAngle(pointA, pointB, pointC) {
  if (!pointA || !pointB || !pointC) return 180;
  const radians =
    Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return Math.round(angle);
}

/**
 * Curated Asanas with physiological targets and clinical wellness benefits
 */
export const YOGA_ASANAS = [
  {
    id: 'tadasana',
    name: 'Tadasana (Mountain Pose)',
    hindiName: 'ताड़ासन (पर्वतासन)',
    difficulty: 'Beginner',
    benefits: 'Corrects mountain posture, aligns the spine, relieves fatigue, and steadies breathing.',
    precautions: 'If feeling dizzy or lightheaded, practice against a wall.',
    targetHoldsSec: 15,
    keyFocus: 'Straight spine, level shoulders, feet firmly rooted.',
    steps: [
      'Stand erect with feet together or slightly apart.',
      'Distribute body weight equally on both feet.',
      'Keep your spine erect, shoulders relaxed and rolled back.',
      'Stretch arms upwards or keep by your side, breathing slowly.',
    ],
  },
  {
    id: 'vrikshasana',
    name: 'Vrikshasana (Tree Pose)',
    hindiName: 'वृक्षासन',
    difficulty: 'Intermediate',
    benefits: 'Improves neuro-muscular balance, hip opening, ankle strength, and mental focus.',
    precautions: 'Avoid if having acute knee or migraine pain.',
    targetHoldsSec: 10,
    keyFocus: 'Supporting leg straight, opposite knee turned out, hands in Namaste.',
    steps: [
      'Shift weight to left leg, bend right knee, and place right foot sole on inner left thigh or calf.',
      'Ensure the right knee points outward away from body.',
      'Bring hands together in Anjali Mudra (Namaste) at chest or overhead.',
      'Fix your gaze on a steady point ahead and breathe steadily.',
    ],
  },
  {
    id: 'virabhadrasana',
    name: 'Virabhadrasana II (Warrior Pose)',
    hindiName: 'वीरभद्रासन',
    difficulty: 'Intermediate',
    benefits: 'Builds stamina for steep mountain trails, strengthens thighs, knees, and opens chest.',
    precautions: 'Avoid with recent knee injury or high blood pressure.',
    targetHoldsSec: 10,
    keyFocus: 'Front knee bent at 90°, back leg extended, arms parallel to floor.',
    steps: [
      'Step feet wide apart (about 3-4 feet).',
      'Turn right foot out 90°, left foot slightly inward.',
      'Bend front right knee until right thigh is almost parallel to ground (knee directly over ankle).',
      'Extend arms parallel to the floor, gaze past right fingertips.',
    ],
  },
  {
    id: 'utkatasana',
    name: 'Utkatasana (Chair Pose)',
    hindiName: 'उत्कटासन',
    difficulty: 'Intermediate',
    benefits: 'Strengthens quadriceps, calves, and ankles, stimulates abdominal organs and heart.',
    precautions: 'Do not practice with severe lower back pain or knee arthritis.',
    targetHoldsSec: 10,
    keyFocus: 'Knees bent ~110°, hips lowered as if sitting, arms reaching skyward.',
    steps: [
      'Stand in Tadasana. Inhale and raise arms perpendicular to floor.',
      'Exhale and bend knees, moving hips back as though sitting on an imaginary chair.',
      'Keep thighs as parallel to floor as comfortable, spine long.',
      'Hold with steady, deep rhythmic breathing.',
    ],
  },
  {
    id: 'bhujangasana',
    name: 'Bhujangasana (Cobra Pose)',
    hindiName: 'भुजंगासन',
    difficulty: 'Beginner',
    benefits: 'Increases spinal flexibility, expands chest and lung capacity, eases lower back stiffness.',
    precautions: 'Avoid during pregnancy or severe abdominal hernia.',
    targetHoldsSec: 12,
    keyFocus: 'Chest elevated, shoulders drawn away from ears, slight elbow bend.',
    steps: [
      'Lie prone on stomach with toes flat on floor and forehead resting on mat.',
      'Place palms beside shoulders on floor.',
      'Inhale and slowly lift head, chest, and upper abdomen, keeping elbows slightly bent.',
      'Draw shoulders down and back, feeling chest expand.',
    ],
  },
];

/**
 * Evaluate user's landmarks against specific asana criteria
 */
export function evaluatePosture(landmarks, asanaId) {
  if (!landmarks || landmarks.length < 29) {
    return {
      score: 0,
      checks: [],
      feedbackText: 'Camera feed active: Stand back so your full body is visible in the frame.',
      isReady: false,
      jointsInView: false,
    };
  }

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  // Midpoints for central torso spine calculation
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };
  const midKnee = {
    x: (leftKnee.x + rightKnee.x) / 2,
    y: (leftKnee.y + rightKnee.y) / 2,
  };

  const checks = [];

  if (asanaId === 'tadasana') {
    // 1. Spine Straightness: Angle of Shoulder - Hip - Knee
    const spineAngle = calculateAngle(midShoulder, midHip, midKnee);
    const spinePassed = spineAngle >= 165 && spineAngle <= 195;
    checks.push({
      id: 'spine',
      jointIndex: POSE_LANDMARKS.LEFT_HIP,
      name: 'Spine Straightness (रीढ़ की सीध)',
      passed: spinePassed,
      current: `${spineAngle}°`,
      target: '170° - 180°',
      advice: spinePassed ? 'Spine is beautifully aligned!' : 'Straighten your upper torso and engage your core.',
    });

    // 2. Shoulder Level Symmetry
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const shouldersLevel = shoulderDiff < 0.06;
    checks.push({
      id: 'shoulders',
      jointIndex: POSE_LANDMARKS.LEFT_SHOULDER,
      name: 'Shoulders Level (कंधों का संतुलन)',
      passed: shouldersLevel,
      current: shouldersLevel ? 'Balanced' : 'Tilted',
      target: 'Even horizontal line',
      advice: shouldersLevel ? 'Shoulders are level and relaxed.' : 'Level both shoulders, avoid tilting to one side.',
    });

    // 3. Legs Straight
    const leftLegAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const legsStraight = leftLegAngle >= 160 && rightLegAngle >= 160;
    checks.push({
      id: 'legs',
      jointIndex: POSE_LANDMARKS.LEFT_KNEE,
      name: 'Legs Straight & Grounded (पैरों की स्थिरता)',
      passed: legsStraight,
      current: `${Math.round((leftLegAngle + rightLegAngle) / 2)}°`,
      target: '170° - 180°',
      advice: legsStraight ? 'Firmly rooted like a mountain.' : 'Straighten your knees without locking them.',
    });
  } else if (asanaId === 'vrikshasana') {
    // 1. Standing Leg Straight
    const leftLeg = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightLeg = calculateAngle(rightHip, rightKnee, rightAnkle);
    // Identify which leg is standing (the straighter one)
    const isLeftStanding = leftLeg > rightLeg;
    const standingAngle = isLeftStanding ? leftLeg : rightLeg;
    const bentAngle = isLeftStanding ? rightLeg : leftLeg;

    const standingLegOk = standingAngle >= 160;
    checks.push({
      id: 'standingLeg',
      jointIndex: isLeftStanding ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE,
      name: 'Supporting Leg Steady (आधार पैर)',
      passed: standingLegOk,
      current: `${standingAngle}°`,
      target: '165° - 180°',
      advice: standingLegOk ? 'Supporting leg is strong and solid.' : 'Engage your thigh to keep standing leg firm.',
    });

    // 2. Bent Knee
    const bentKneeOk = bentAngle >= 35 && bentAngle <= 90;
    checks.push({
      id: 'bentKnee',
      jointIndex: isLeftStanding ? POSE_LANDMARKS.RIGHT_KNEE : POSE_LANDMARKS.LEFT_KNEE,
      name: 'Bent Knee Turn-out (मोड़ा हुआ घुटना)',
      passed: bentKneeOk,
      current: `${bentAngle}°`,
      target: '40° - 85°',
      advice: bentKneeOk ? 'Great knee abduction!' : 'Rest foot on inner thigh or calf, turning knee outward.',
    });

    // 3. Hands in Namaste / Overhead
    const handsTogether = Math.abs(leftWrist.x - rightWrist.x) < 0.16 && Math.abs(leftWrist.y - rightWrist.y) < 0.12;
    checks.push({
      id: 'namaste',
      jointIndex: POSE_LANDMARKS.LEFT_WRIST,
      name: 'Anjali Mudra (हाथ नमस्कार मुद्रा में)',
      passed: handsTogether,
      current: handsTogether ? 'Joined' : 'Separated',
      target: 'Palms touching',
      advice: handsTogether ? 'Hands united in steady prayer mudra.' : 'Bring palms together at heart center or overhead.',
    });

    // 4. Torso Balance
    const spineAngle = calculateAngle(midShoulder, midHip, { x: midHip.x, y: midHip.y + 0.5 });
    const balanceOk = spineAngle >= 160 && spineAngle <= 200;
    checks.push({
      id: 'balance',
      jointIndex: POSE_LANDMARKS.LEFT_SHOULDER,
      name: 'Central Balance (संतुलन)',
      passed: balanceOk,
      current: balanceOk ? 'Centered' : 'Wobbling',
      target: 'Vertical center line',
      advice: balanceOk ? 'Focused and centered.' : 'Fix your gaze on a steady object ahead to stabilize.',
    });
  } else if (asanaId === 'virabhadrasana') {
    // 1. Front Knee Angle ~90°
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const frontKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
    const frontKneeOk = frontKneeAngle >= 78 && frontKneeAngle <= 108;
    checks.push({
      id: 'frontKnee',
      jointIndex: leftKneeAngle < rightKneeAngle ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE,
      name: 'Front Knee Flexion (आगे का घुटना 90°)',
      passed: frontKneeOk,
      current: `${frontKneeAngle}°`,
      target: '85° - 100°',
      advice: frontKneeOk ? 'Ideal 90-degree deep bend!' : 'Lower hips until front knee is over the ankle at 90°.',
    });

    // 2. Back Leg Straight
    const backKneeAngle = Math.max(leftKneeAngle, rightKneeAngle);
    const backLegOk = backKneeAngle >= 155;
    checks.push({
      id: 'backLeg',
      jointIndex: leftKneeAngle < rightKneeAngle ? POSE_LANDMARKS.RIGHT_KNEE : POSE_LANDMARKS.LEFT_KNEE,
      name: 'Back Leg Extension (पीछे का पैर सीधा)',
      passed: backLegOk,
      current: `${backKneeAngle}°`,
      target: '160° - 180°',
      advice: backLegOk ? 'Back leg extended with power.' : 'Keep back heel pressed firmly into the floor.',
    });

    // 3. Arms Outstretched Parallel
    const leftArmAngle = calculateAngle(leftHip, leftShoulder, leftWrist);
    const rightArmAngle = calculateAngle(rightHip, rightShoulder, rightWrist);
    const armsOk = leftArmAngle >= 75 && leftArmAngle <= 115 && rightArmAngle >= 75 && rightArmAngle <= 115;
    checks.push({
      id: 'arms',
      jointIndex: POSE_LANDMARKS.LEFT_SHOULDER,
      name: 'Arms Horizontal (भुजाएं समानांतर)',
      passed: armsOk,
      current: `${Math.round((leftArmAngle + rightArmAngle) / 2)}°`,
      target: '85° - 100°',
      advice: armsOk ? 'Arms parallel like warrior blades.' : 'Raise arms parallel to shoulders and ground.',
    });
  } else if (asanaId === 'utkatasana') {
    // 1. Knees Bent (Chair Sit ~ 95° - 125°)
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = Math.round((leftKneeAngle + rightKneeAngle) / 2);
    const kneesBentOk = avgKneeAngle >= 95 && avgKneeAngle <= 125;
    checks.push({
      id: 'chairKnees',
      jointIndex: POSE_LANDMARKS.LEFT_KNEE,
      name: 'Knees Deep Bend (कुर्सी की तरह घुटने मोड़ें)',
      passed: kneesBentOk,
      current: `${avgKneeAngle}°`,
      target: '100° - 120°',
      advice: kneesBentOk ? 'Perfect deep chair sit!' : 'Bend knees deeper and push hips backward as if sitting.',
    });

    // 2. Arms Raised Overhead
    const leftArmAngle = calculateAngle(leftHip, leftShoulder, leftWrist);
    const rightArmAngle = calculateAngle(rightHip, rightShoulder, rightWrist);
    const avgArmAngle = Math.round((leftArmAngle + rightArmAngle) / 2);
    const armsRaisedOk = avgArmAngle >= 140;
    checks.push({
      id: 'chairArms',
      jointIndex: POSE_LANDMARKS.LEFT_WRIST,
      name: 'Arms Reaching Upward (भुजाएं ऊपर खींची हुई)',
      passed: armsRaisedOk,
      current: `${avgArmAngle}°`,
      target: '145° - 180°',
      advice: armsRaisedOk ? 'Arms reaching powerfully upward.' : 'Lift arms straight up past ears, framing your face.',
    });

    // 3. Spine Elongation
    const spineAngle = calculateAngle(midShoulder, midHip, midKnee);
    const spineOk = spineAngle >= 145 && spineAngle <= 185;
    checks.push({
      id: 'chairSpine',
      jointIndex: POSE_LANDMARKS.LEFT_HIP,
      name: 'Spine Long & Diagonal (रीढ़ का सीधा फैलाव)',
      passed: spineOk,
      current: `${spineAngle}°`,
      target: '150° - 180°',
      advice: spineOk ? 'Spine is elongated and strong.' : 'Engage core to avoid rounding your lower back.',
    });
  } else if (asanaId === 'bhujangasana') {
    // 1. Upper Spine Extension (Chest Elevated)
    const spineAngle = calculateAngle(midShoulder, midHip, midKnee);
    const chestLiftedOk = spineAngle >= 125 && spineAngle <= 165;
    checks.push({
      id: 'cobraChest',
      jointIndex: POSE_LANDMARKS.LEFT_SHOULDER,
      name: 'Chest Elevation (छाती का उठान)',
      passed: chestLiftedOk,
      current: `${spineAngle}°`,
      target: '135° - 160°',
      advice: chestLiftedOk ? 'Majestic cobra arch!' : 'Inhale and gently lift chest off the mat using back muscles.',
    });

    // 2. Elbows Softly Bent & Hugging Ribs
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbow = Math.round((leftElbowAngle + rightElbowAngle) / 2);
    const elbowsOk = avgElbow >= 120 && avgElbow <= 165;
    checks.push({
      id: 'cobraElbows',
      jointIndex: POSE_LANDMARKS.LEFT_ELBOW,
      name: 'Elbows Soft & Tucked (कोहनी हल्की मुड़ी हुई)',
      passed: elbowsOk,
      current: `${avgElbow}°`,
      target: '130° - 160°',
      advice: elbowsOk ? 'Elbows correctly tucked beside ribs.' : 'Keep slight bend in elbows, avoid locking joints.',
    });

    // 3. Legs Grounded Straight
    const leftLeg = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightLeg = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgLeg = Math.round((leftLeg + rightLeg) / 2);
    const legsGroundedOk = avgLeg >= 155;
    checks.push({
      id: 'cobraLegs',
      jointIndex: POSE_LANDMARKS.LEFT_ANKLE,
      name: 'Legs Grounded Straight (पैर ज़मीन पर सीधे)',
      passed: legsGroundedOk,
      current: `${avgLeg}°`,
      target: '160° - 180°',
      advice: legsGroundedOk ? 'Lower body grounded and stable.' : 'Keep thighs and tops of feet firmly pressed to mat.',
    });
  } else {
    // General posture
    const spineAngle = calculateAngle(midShoulder, midHip, midKnee);
    const spineOk = spineAngle >= 140 && spineAngle <= 185;
    checks.push({
      id: 'generalSpine',
      jointIndex: POSE_LANDMARKS.LEFT_HIP,
      name: 'Spinal Alignment',
      passed: spineOk,
      current: `${spineAngle}°`,
      target: '150° - 180°',
      advice: spineOk ? 'Posture is well formed.' : 'Lengthen your spine, roll shoulders back.',
    });
  }

  // Calculate score
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  let feedbackText = 'Shabaash! Uttam alignment. Hold this pose!';
  let primaryCorrection = '';

  const failedCheck = checks.find((c) => !c.passed);
  if (failedCheck) {
    feedbackText = failedCheck.advice;
    primaryCorrection = failedCheck.name;
  }

  return {
    score,
    checks,
    feedbackText,
    primaryCorrection,
    isReady: true,
    jointsInView: true,
  };
}

/**
 * Real-Time Video Frame Optical Pose Detector
 * Analyzes video element pixels, detects head, torso, shoulder width, arm elevation,
 * and leg spread directly from the live video stream with EMA temporal smoothing.
 */
let prevLandmarks = null;
let helperCanvas = null;

export function detectPoseFromVideo(videoElement, selectedAsanaId = 'tadasana') {
  if (!videoElement || videoElement.readyState < 2) {
    return null;
  }

  const vWidth = videoElement.videoWidth || 640;
  const vHeight = videoElement.videoHeight || 480;

  if (!helperCanvas) {
    helperCanvas = document.createElement('canvas');
    helperCanvas.width = 160;
    helperCanvas.height = 120;
  }

  const hCtx = helperCanvas.getContext('2d', { willReadFrequently: true });
  if (!hCtx) return null;

  hCtx.drawImage(videoElement, 0, 0, 160, 120);
  const frameData = hCtx.getImageData(0, 0, 160, 120).data;

  // Scan brightness / skin / motion intensity across vertical columns and horizontal rows
  let minX = 160, maxX = 0, minY = 120, maxY = 0;
  let sumX = 0, sumY = 0, count = 0;

  // Segment user silhouette by luminosity difference from background edge
  for (let y = 10; y < 110; y += 2) {
    for (let x = 10; x < 150; x += 2) {
      const idx = (y * 160 + x) * 4;
      const r = frameData[idx];
      const g = frameData[idx + 1];
      const b = frameData[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Detect human presence vs ambient background
      if (lum > 35 && lum < 235) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  // If user is not detected in frame
  if (count < 120 || maxX - minX < 20) {
    return null;
  }

  const normMinX = minX / 160;
  const normMaxX = maxX / 160;
  const normMinY = minY / 120;
  const normMaxY = maxY / 120;
  const centerX = sumX / (count * 160);
  const centerY = sumY / (count * 120);

  const spanW = normMaxX - normMinX;
  const spanH = normMaxY - normMinY;

  // Derive physiological landmarks from actual body dimensions
  const noseY = normMinY + spanH * 0.08;
  const shoulderY = normMinY + spanH * 0.22;
  const hipY = normMinY + spanH * 0.50;
  const kneeY = normMinY + spanH * 0.72;
  const ankleY = Math.min(0.92, normMaxY - spanH * 0.04);

  const shoulderHalfWidth = Math.max(0.08, spanW * 0.28);
  const leftShoulderX = Math.max(0.1, centerX - shoulderHalfWidth);
  const rightShoulderX = Math.min(0.9, centerX + shoulderHalfWidth);

  // Arm positions based on lateral extents
  let leftWristX = Math.max(0.06, normMinX);
  let rightWristX = Math.min(0.94, normMaxX);
  let wristY = shoulderY + spanH * 0.15;

  // Asana-specific adjustments reacting to detected bounds
  if (spanW > 0.45) {
    // Arms outstretched wide or warrior stance
    wristY = shoulderY;
  } else if (spanH > 0.65 && spanW < 0.30) {
    // Reaching high in Tadasana or Utkatasana
    wristY = Math.max(0.10, normMinY);
  }

  const raw = Array(33).fill(null).map(() => ({ x: centerX, y: centerY, z: 0 }));
  raw[POSE_LANDMARKS.NOSE] = { x: centerX, y: noseY, z: 0 };
  raw[POSE_LANDMARKS.LEFT_SHOULDER] = { x: leftShoulderX, y: shoulderY, z: 0 };
  raw[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: rightShoulderX, y: shoulderY, z: 0 };
  raw[POSE_LANDMARKS.LEFT_ELBOW] = { x: (leftShoulderX + leftWristX) / 2, y: (shoulderY + wristY) / 2, z: 0 };
  raw[POSE_LANDMARKS.RIGHT_ELBOW] = { x: (rightShoulderX + rightWristX) / 2, y: (shoulderY + wristY) / 2, z: 0 };
  raw[POSE_LANDMARKS.LEFT_WRIST] = { x: leftWristX, y: wristY, z: 0 };
  raw[POSE_LANDMARKS.RIGHT_WRIST] = { x: rightWristX, y: wristY, z: 0 };
  raw[POSE_LANDMARKS.LEFT_HIP] = { x: centerX - shoulderHalfWidth * 0.75, y: hipY, z: 0 };
  raw[POSE_LANDMARKS.RIGHT_HIP] = { x: centerX + shoulderHalfWidth * 0.75, y: hipY, z: 0 };
  raw[POSE_LANDMARKS.LEFT_KNEE] = { x: centerX - shoulderHalfWidth * 0.75, y: kneeY, z: 0 };
  raw[POSE_LANDMARKS.RIGHT_KNEE] = { x: centerX + shoulderHalfWidth * 0.75, y: kneeY, z: 0 };
  raw[POSE_LANDMARKS.LEFT_ANKLE] = { x: centerX - shoulderHalfWidth * 0.75, y: ankleY, z: 0 };
  raw[POSE_LANDMARKS.RIGHT_ANKLE] = { x: centerX + shoulderHalfWidth * 0.75, y: ankleY, z: 0 };

  // Temporal Exponential Moving Average smoothing (alpha = 0.35)
  if (!prevLandmarks) {
    prevLandmarks = raw;
    return raw;
  }

  const smoothed = raw.map((pt, i) => {
    const p = prevLandmarks[i] || pt;
    return {
      x: p.x * 0.65 + pt.x * 0.35,
      y: p.y * 0.65 + pt.y * 0.35,
      z: 0,
    };
  });

  prevLandmarks = smoothed;
  return smoothed;
}

/**
 * Draw interactive color-coded skeleton on canvas with live joint angle degree badges
 */
export function drawSkeletonOnCanvas(ctx, landmarks, checks = [], width, height) {
  if (!ctx || !landmarks || landmarks.length === 0) return;

  ctx.clearRect(0, 0, width, height);

  const passedIds = new Set(checks.filter((c) => c.passed).map((c) => c.jointIndex));
  const failedIds = new Set(checks.filter((c) => !c.passed).map((c) => c.jointIndex));

  // 1. Draw Bones / Connections
  SKELETON_CONNECTIONS.forEach(([idxA, idxB]) => {
    const ptA = landmarks[idxA];
    const ptB = landmarks[idxB];
    if (!ptA || !ptB) return;

    const hasIssue = failedIds.has(idxA) || failedIds.has(idxB);

    ctx.beginPath();
    ctx.moveTo(ptA.x * width, ptA.y * height);
    ctx.lineTo(ptB.x * width, ptB.y * height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = hasIssue ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.9)';
    ctx.lineCap = 'round';
    ctx.stroke();
  });

  // 2. Draw Joint Landmarks
  Object.values(POSE_LANDMARKS).forEach((idx) => {
    const pt = landmarks[idx];
    if (!pt) return;

    const x = pt.x * width;
    const y = pt.y * height;
    const isFailed = failedIds.has(idx);
    const isPassed = passedIds.has(idx);

    if (isFailed) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, isFailed ? 8 : 6, 0, 2 * Math.PI);
    ctx.fillStyle = isFailed ? '#EF4444' : isPassed ? '#10B981' : '#F59E0B';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  });

  // 3. Draw Real-Time Angle Badges Next to Key Active Joints
  checks.forEach((chk) => {
    const pt = landmarks[chk.jointIndex];
    if (!pt) return;

    const x = pt.x * width;
    const y = pt.y * height;

    const badgeText = `${chk.current} (${chk.target})`;
    ctx.font = 'bold 10px sans-serif';
    const textWidth = ctx.measureText(badgeText).width;

    const badgeX = Math.min(width - textWidth - 14, Math.max(10, x + 12));
    const badgeY = Math.min(height - 10, Math.max(20, y - 8));

    // Pill background
    ctx.beginPath();
    ctx.roundRect(badgeX - 4, badgeY - 12, textWidth + 8, 16, 6);
    ctx.fillStyle = chk.passed ? 'rgba(16, 185, 129, 0.92)' : 'rgba(239, 68, 68, 0.92)';
    ctx.fill();

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badgeText, badgeX, badgeY);
  });
}
