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
      advice: bentKneeOk ? 'Great knee abduction!' : 'Rest foot on inner thigh or calf, avoiding knee joint directly.',
    });

    // 3. Torso Balance
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
    // The bent knee is front leg
    const frontKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
    const frontKneeOk = frontKneeAngle >= 75 && frontKneeAngle <= 115;
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
  } else {
    // General posture (Utkatasana / Bhujangasana fallback)
    const spineAngle = calculateAngle(midShoulder, midHip, midKnee);
    const spineOk = spineAngle >= 130 && spineAngle <= 190;
    checks.push({
      id: 'generalSpine',
      jointIndex: POSE_LANDMARKS.LEFT_HIP,
      name: 'Spinal Alignment',
      passed: spineOk,
      current: `${spineAngle}°`,
      target: 'Good form',
      advice: spineOk ? 'Posture is well formed.' : 'Lengthen your spine, roll shoulders back.',
    });
  }

  // Calculate score
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  let feedbackText = 'Shabaash! Excellent alignment. Hold this pose!';
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
 * Draw interactive color-coded skeleton on canvas over video feed
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

    // Check if either joint has an active alignment issue
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

    // Outer glow for failed joints to draw attention
    if (isFailed) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fill();
    }

    // Core joint dot
    ctx.beginPath();
    ctx.arc(x, y, isFailed ? 8 : 6, 0, 2 * Math.PI);
    ctx.fillStyle = isFailed ? '#EF4444' : isPassed ? '#10B981' : '#F59E0B';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  });
}
