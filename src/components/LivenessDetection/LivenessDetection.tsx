import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { LivenessChallenge, ChallengeState, FaceLandmark, EyeAspectRatio } from '../../types';
import { calculateHeadPose } from '../../utils/faceAnalysis';
import styles from './LivenessDetection.module.css';

const LIVENESS_CHALLENGES: LivenessChallenge[] = [
  { type: 'blink', icon: '😊', text: 'Please blink twice', validation: 'blink', targetCount: 2, timeLimit: 5000 },
  { type: 'head', icon: '⬅️', text: 'Turn your head left', validation: 'headLeft', timeLimit: 3000 },
  { type: 'head', icon: '➡️', text: 'Turn your head right', validation: 'headRight', timeLimit: 3000 },
  { type: 'head', icon: '⬆️', text: 'Look up', validation: 'lookUp', timeLimit: 3000 },
  { type: 'head', icon: '⬇️', text: 'Look down', validation: 'lookDown', timeLimit: 3000 }
];

interface LivenessDetectionProps {
  currentLandmarks?: FaceLandmark[] | null;
  earData?: EyeAspectRatio | null;
  isActive: boolean;
  onComplete: () => void;
}

export const LivenessDetection: React.FC<LivenessDetectionProps> = ({
  currentLandmarks,
  earData,
  isActive,
  onComplete
}) => {
  const {
    currentChallenge,
    setCurrentChallenge,
    challengeResults,
    addChallengeResult,
    verificationStatus,
    blinkCount,
    resetLivenessState
  } = useAppContext();

  const [challengeState, setChallengeState] = useState<ChallengeState>({
    blinkCount: 0,
    initialHeadPose: null,
    initialEyeState: null,
    validationFrames: 0,
    successFrames: 0
  });
  
  // Track if challenge is already completed to prevent multiple completions
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [blinkProgress, setBlinkProgress] = useState(0);
  const [headPoseAngle, setHeadPoseAngle] = useState(0);
  const [headPoseTarget, setHeadPoseTarget] = useState('');

  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const challengeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const challengeStartTimeRef = useRef<number>(0);
  const blinkCountAtStartRef = useRef<number>(0);
  const challengeCompletedRef = useRef<boolean>(false);

  const startNextChallenge = useCallback(() => {
    if (currentChallenge >= LIVENESS_CHALLENGES.length) {
      setShowResults(true);
      onComplete();
      return;
    }

    const challenge = LIVENESS_CHALLENGES[currentChallenge];

    // Reset challenge state
    setChallengeState({
      blinkCount: 0,
      initialHeadPose: null,
      initialEyeState: null,
      validationFrames: 0,
      successFrames: 0
    });
    
    // Reset completion flag
    setChallengeCompleted(false);
    challengeCompletedRef.current = false;
    setBlinkProgress(0);
    setHeadPoseAngle(0);
    setHeadPoseTarget('');

    // Reset blink count for blink challenges
    if (challenge.validation === 'blink') {
      blinkCountAtStartRef.current = blinkCount;
    }

    // Start challenge timer
    challengeStartTimeRef.current = Date.now();
    setProgress(0);

    challengeTimerRef.current = setTimeout(() => {
      // Challenge timed out - only process if not already completed
      if (!challengeCompletedRef.current) {
        addChallengeResult({
          challenge: challenge.text,
          success: false,
          reason: 'Timeout'
        });
        setCurrentChallenge(currentChallenge + 1);
        // Move to next challenge after timeout
        setTimeout(() => {
          startNextChallenge();
        }, 1000);
      }
    }, challenge.timeLimit);
  }, [currentChallenge, addChallengeResult, setCurrentChallenge, blinkCount, onComplete, challengeCompleted]);

  const validateChallenge = useCallback((landmarks: FaceLandmark[]) => {
    const challenge = LIVENESS_CHALLENGES[currentChallenge];
    if (!challenge || !isActive || challengeCompleted) return;

    // First verify that the face matches the reference
    if (!verificationStatus || verificationStatus.similarity < 70) {
      // Face doesn't match reference - don't count any actions
      return;
    }

    let success = false;

    switch (challenge.validation) {
      case 'blink':
        // Check if required number of blinks achieved
        const blinksCompleted = blinkCount - blinkCountAtStartRef.current;
        setBlinkProgress(Math.min(blinksCompleted, challenge.targetCount || 2));
        if (blinksCompleted >= (challenge.targetCount || 2)) {
          success = true;
        }
        break;

      case 'headLeft':
        const headPoseLeft = calculateHeadPose(landmarks);
        setHeadPoseAngle(Math.round(headPoseLeft.yaw));
        setHeadPoseTarget('Turn left: ' + Math.round(headPoseLeft.yaw) + '° (target: -20°)');
        if (headPoseLeft.yaw < -20) {
          setChallengeState(prev => ({
            ...prev,
            successFrames: prev.successFrames + 1
          }));
          if (challengeState.successFrames > 10) {
            success = true;
          }
        } else {
          setChallengeState(prev => ({
            ...prev,
            successFrames: 0
          }));
        }
        break;

      case 'headRight':
        const headPoseRight = calculateHeadPose(landmarks);
        setHeadPoseAngle(Math.round(headPoseRight.yaw));
        setHeadPoseTarget('Turn right: ' + Math.round(headPoseRight.yaw) + '° (target: 20°)');
        if (headPoseRight.yaw > 20) {
          setChallengeState(prev => ({
            ...prev,
            successFrames: prev.successFrames + 1
          }));
          if (challengeState.successFrames > 10) {
            success = true;
          }
        } else {
          setChallengeState(prev => ({
            ...prev,
            successFrames: 0
          }));
        }
        break;

      case 'lookUp':
        const headPoseUp = calculateHeadPose(landmarks);
        setHeadPoseAngle(Math.round(headPoseUp.pitch));
        setHeadPoseTarget('Look up: ' + Math.round(headPoseUp.pitch) + '° (target: -15°)');
        if (headPoseUp.pitch < -15) {
          setChallengeState(prev => ({
            ...prev,
            successFrames: prev.successFrames + 1
          }));
          if (challengeState.successFrames > 10) {
            success = true;
          }
        } else {
          setChallengeState(prev => ({
            ...prev,
            successFrames: 0
          }));
        }
        break;

      case 'lookDown':
        const headPoseDown = calculateHeadPose(landmarks);
        setHeadPoseAngle(Math.round(headPoseDown.pitch));
        setHeadPoseTarget('Look down: ' + Math.round(headPoseDown.pitch) + '° (target: 15°)');
        if (headPoseDown.pitch > 15) {
          setChallengeState(prev => ({
            ...prev,
            successFrames: prev.successFrames + 1
          }));
          if (challengeState.successFrames > 10) {
            success = true;
          }
        } else {
          setChallengeState(prev => ({
            ...prev,
            successFrames: 0
          }));
        }
        break;
    }

    // Update progress bar
    const elapsed = Date.now() - challengeStartTimeRef.current;
    const progressPercent = Math.min((elapsed / challenge.timeLimit) * 100, 100);
    setProgress(progressPercent);

    // If challenge completed successfully
    if (success && !challengeCompleted) {
      setChallengeCompleted(true);
      challengeCompletedRef.current = true;
      
      if (challengeTimerRef.current) {
        clearTimeout(challengeTimerRef.current);
        challengeTimerRef.current = null;
      }

      addChallengeResult({
        challenge: challenge.text,
        success: true,
        time: elapsed
      });

      // Move to next challenge
      setCurrentChallenge(currentChallenge + 1);
      setTimeout(() => {
        startNextChallenge();
      }, 1500);
    }
  }, [currentChallenge, isActive, blinkCount, challengeState.successFrames, addChallengeResult, setCurrentChallenge, startNextChallenge, verificationStatus, challengeCompleted]);

  // Start first challenge when activated
  useEffect(() => {
    if (isActive && currentChallenge === 0 && challengeResults.length === 0) {
      startNextChallenge();
    }
  }, [isActive, currentChallenge, challengeResults.length, startNextChallenge]);

  // Validate challenge when landmarks update
  useEffect(() => {
    if (currentLandmarks && isActive && !showResults) {
      validateChallenge(currentLandmarks);
    }
  }, [currentLandmarks, isActive, showResults, validateChallenge]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (challengeTimerRef.current) {
        clearTimeout(challengeTimerRef.current);
      }
    };
  }, []);

  const handleRetry = () => {
    resetLivenessState();
    setShowResults(false);
    setProgress(0);
    startNextChallenge();
  };

  if (!isActive) {
    return null;
  }

  const currentChallengeData = LIVENESS_CHALLENGES[currentChallenge];
  const successCount = challengeResults.filter(r => r.success).length;
  const score = Math.round((successCount / LIVENESS_CHALLENGES.length) * 100);
  const faceMatched = verificationStatus?.match ?? true;

  if (showResults) {
    return (
      <div className={styles.livenessChallenge}>
        <h2>Liveness Detection</h2>
        <div className={styles.challengeResult}>
          <h3 className={score >= 80 && faceMatched ? '' : styles.failed}>
            {score >= 80 && faceMatched
              ? 'Liveness & Identity Verified! ✅'
              : score >= 80 && !faceMatched
              ? 'Liveness Passed but Identity Mismatch! ⚠️'
              : 'Liveness Check Failed ❌'}
          </h3>
          <p>
            Score: <span className={styles.scoreText}>
              {score}% {faceMatched ? '(Identity Verified)' : '(Identity Not Verified)'}
            </span>
          </p>
          <button onClick={handleRetry} className={styles.retryBtn}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.livenessChallenge}>
      <h2>Liveness Detection</h2>
      
      {verificationStatus && (
        <div className={styles.identityCheck}>
          <p>
            <strong>Identity Verification:</strong>{' '}
            <span className={verificationStatus.match ? styles.verified : styles.notVerified}>
              {verificationStatus.match
                ? `✅ Matched (${verificationStatus.similarity}%)`
                : `❌ NOT MATCHED (${verificationStatus.similarity}%)`}
            </span>
          </p>
        </div>
      )}

      <div className={styles.challengeInstruction}>
        <span className={styles.challengeIcon}>{currentChallengeData?.icon}</span>
        <p className={styles.challengeText}>{currentChallengeData?.text}</p>
        {currentChallengeData?.validation === 'blink' && (
          <p className={styles.blinkProgress}>
            Blinks detected: {blinkProgress} / {currentChallengeData.targetCount || 2}
          </p>
        )}
        {(currentChallengeData?.validation === 'headLeft' || 
          currentChallengeData?.validation === 'headRight' || 
          currentChallengeData?.validation === 'lookUp' || 
          currentChallengeData?.validation === 'lookDown') && (
          <p className={styles.headPoseFeedback}>
            {headPoseTarget}
          </p>
        )}
      </div>

      <div className={styles.challengeProgress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ 
              width: `${progress}%`,
              backgroundColor: challengeCompleted ? '#4CAF50' : '#2196F3'
            }}
          />
        </div>
        <p>
          Challenge <span>{currentChallenge + 1}</span> of{' '}
          <span>{LIVENESS_CHALLENGES.length}</span>
        </p>
      </div>
    </div>
  );
};