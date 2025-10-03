// Face Detection Types
export interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface FaceMeshResults {
  image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
  multiFaceLandmarks?: FaceLandmark[][];
}

// Liveness Detection Types
export interface LivenessChallenge {
  type: 'blink' | 'head';
  icon: string;
  text: string;
  validation: 'blink' | 'headLeft' | 'headRight' | 'lookUp' | 'lookDown';
  targetCount?: number;
  timeLimit: number;
}

export interface ChallengeResult {
  challenge: string;
  success: boolean;
  reason?: string;
  time?: number;
}

export interface ChallengeState {
  blinkCount: number;
  initialHeadPose: HeadPose | null;
  initialEyeState: EyeAspectRatio | null;
  validationFrames: number;
  successFrames: number;
}

// Face Analysis Types
export interface HeadPose {
  yaw: number;   // left-right rotation
  pitch: number; // up-down rotation
  roll: number;  // head tilt
}

export interface EyeAspectRatio {
  left: number;
  right: number;
  average: number;
}

export interface EyeGaze {
  gazeX: number;
  gazeY: number;
}

// Face Verification Types
export interface FaceVerificationResult {
  match: boolean;
  distance: number;
  similarity: number;
}

// App State Types
export interface AppState {
  isDetecting: boolean;
  isLivenessActive: boolean;
  referenceImageLoaded: boolean;
  blinkCount: number;
  verificationStatus: FaceVerificationResult | null;
  currentChallenge: number;
  challengeResults: ChallengeResult[];
}