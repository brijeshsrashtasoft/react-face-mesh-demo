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
  const noseTip = landmarks[1];
  const chin = landmarks[152];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const foreheadCenter = landmarks[9];
  
  // Calculate yaw (left-right rotation)
  const eyeDistance = rightEye.x - leftEye.x;
  const noseCenterX = (leftEye.x + rightEye.x) / 2;
  const noseOffset = noseTip.x - noseCenterX;
  const yaw = (noseOffset / eyeDistance) * 100; // Normalize to percentage
  
  // Calculate pitch (up-down rotation)
  const faceHeight = chin.y - foreheadCenter.y;
  const noseVerticalOffset = noseTip.y - ((chin.y + foreheadCenter.y) / 2);
  const pitch = (noseVerticalOffset / faceHeight) * 100;
  
  // Calculate roll (head tilt)
  const eyeVerticalDiff = rightEye.y - leftEye.y;
  const roll = Math.atan2(eyeVerticalDiff, eyeDistance) * (180 / Math.PI);
  
  return { yaw, pitch, roll };
}

// Calculate Eye Aspect Ratio (EAR)
export function calculateEAR(landmarks: FaceLandmark[]): EyeAspectRatio {
  // Eye landmarks for MediaPipe Face Mesh
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