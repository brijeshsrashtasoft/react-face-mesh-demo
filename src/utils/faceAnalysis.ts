import { FaceLandmark, HeadPose, EyeAspectRatio, EyeGaze } from '../types';

// Calculate distance between two points
export function calculateDistance(point1: FaceLandmark, point2: FaceLandmark): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = (point1.z || 0) - (point2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Calculate head pose angles
export function calculateHeadPose(landmarks: FaceLandmark[]): HeadPose {
  // Key landmarks for head pose estimation
  const noseTip = landmarks[1];     // Nose tip
  const noseBridge = landmarks[6];  // Nose bridge
  const chin = landmarks[152];      // Chin
  const leftEye = landmarks[33];    // Left eye inner corner
  const rightEye = landmarks[263];  // Right eye inner corner
  const leftEar = landmarks[234];   // Left ear tragion
  const rightEar = landmarks[454];  // Right ear tragion
  const foreheadCenter = landmarks[9]; // Forehead center
  
  // Calculate yaw (left-right rotation) using nose and ear positions
  const faceCenterX = (leftEye.x + rightEye.x) / 2;
  const faceWidth = Math.abs(rightEar.x - leftEar.x);
  
  // Use nose tip offset from face center for yaw
  // NOTE: In camera view, turning head left moves nose to the right (positive x)
  // So we need to negate to get intuitive directions
  const noseOffsetX = noseTip.x - faceCenterX;
  // Convert to degrees - typical range is -60 to +60 degrees
  // Negative value = turned left, Positive value = turned right
  const yaw = -(noseOffsetX / faceWidth) * 120;
  
  // Calculate pitch (up-down rotation) using nose bridge and chin
  const faceHeight = Math.abs(chin.y - foreheadCenter.y);
  const noseLength = Math.abs(noseTip.y - noseBridge.y);
  const expectedNoseLength = faceHeight * 0.15; // Expected nose length as proportion of face
  
  // When looking up, nose appears shorter; when looking down, it appears longer
  const noseLengthRatio = noseLength / expectedNoseLength;
  // Convert to degrees - typical range is -45 to +45 degrees
  const pitch = (noseLengthRatio - 1) * 45;
  
  // Calculate roll (head tilt)
  const eyeVerticalDiff = rightEye.y - leftEye.y;
  const eyeDistance = Math.abs(rightEye.x - leftEye.x);
  const roll = Math.atan2(eyeVerticalDiff, eyeDistance) * (180 / Math.PI);
  
  return { yaw, pitch, roll };
}

// Calculate Eye Aspect Ratio (EAR)
export function calculateEAR(landmarks: FaceLandmark[]): EyeAspectRatio {
  // Eye landmarks indices
  const leftEye = {
    p1: landmarks[33],   // Left corner
    p2: landmarks[133],  // Right corner
    p3: landmarks[159],  // Top left
    p4: landmarks[145],  // Top right
    p5: landmarks[158],  // Bottom left
    p6: landmarks[153]   // Bottom right
  };
  
  const rightEye = {
    p1: landmarks[362],  // Left corner
    p2: landmarks[263],  // Right corner
    p3: landmarks[386],  // Top left
    p4: landmarks[374],  // Top right
    p5: landmarks[385],  // Bottom left
    p6: landmarks[380]   // Bottom right
  };
  
  // EAR = (||p3-p6|| + ||p4-p5||) / (2 * ||p1-p2||)
  function computeEAR(eye: any): number {
    const verticalDist1 = calculateDistance(eye.p3, eye.p6);
    const verticalDist2 = calculateDistance(eye.p4, eye.p5);
    const horizontalDist = calculateDistance(eye.p1, eye.p2);
    
    if (horizontalDist === 0) return 0;
    
    return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
  }
  
  const leftEAR = computeEAR(leftEye);
  const rightEAR = computeEAR(rightEye);
  
  return { 
    left: leftEAR, 
    right: rightEAR, 
    average: (leftEAR + rightEAR) / 2.0 
  };
}

// Calculate eye gaze direction
export function calculateEyeGaze(landmarks: FaceLandmark[]): EyeGaze {
  // Left eye
  const leftEyeInner = landmarks[33];
  const leftEyeOuter = landmarks[133];
  const leftEyeTop = landmarks[159];
  const leftEyeBottom = landmarks[145];
  const leftPupilApprox = {
    x: (leftEyeInner.x + leftEyeOuter.x) / 2,
    y: (leftEyeTop.y + leftEyeBottom.y) / 2
  };
  
  // Right eye
  const rightEyeInner = landmarks[362];
  const rightEyeOuter = landmarks[263];
  const rightEyeTop = landmarks[386];
  const rightEyeBottom = landmarks[374];
  const rightPupilApprox = {
    x: (rightEyeInner.x + rightEyeOuter.x) / 2,
    y: (rightEyeTop.y + rightEyeBottom.y) / 2
  };
  
  // Calculate gaze direction based on pupil position relative to eye center
  const leftGazeX = ((leftPupilApprox.x - leftEyeInner.x) / (leftEyeOuter.x - leftEyeInner.x)) - 0.5;
  const rightGazeX = ((rightPupilApprox.x - rightEyeInner.x) / (rightEyeOuter.x - rightEyeInner.x)) - 0.5;
  const gazeX = (leftGazeX + rightGazeX) / 2;
  
  const leftGazeY = ((leftPupilApprox.y - leftEyeTop.y) / (leftEyeBottom.y - leftEyeTop.y)) - 0.5;
  const rightGazeY = ((rightPupilApprox.y - rightEyeTop.y) / (rightEyeBottom.y - rightEyeTop.y)) - 0.5;
  const gazeY = (leftGazeY + rightGazeY) / 2;
  
  return { gazeX, gazeY };
}