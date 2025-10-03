import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { FaceLandmark, EyeAspectRatio } from '../../types';
import { calculateHeadPose } from '../../utils/faceAnalysis';
import styles from './LivenessDetection.module.css';

// Test configuration
const IDENTITY_THRESHOLD = 50; // Minimum similarity percentage for identity match
const OVERALL_TEST_TIMEOUT = 45000; // 45 seconds for entire test
const IDENTITY_CHECK_INTERVAL = 500; // Check identity every 500ms

// Test sequence configuration
interface TestStep {
  id: string;
  type: 'head' | 'blink';
  instruction: string;
  icon: string;
  validation: {
    type: 'headLeft' | 'headRight' | 'headUp' | 'headDown' | 'blink';
    targetValue?: number;
    targetCount?: number;
    requiredFrames: number;
  };
  timeLimit: number;
}

const TEST_STEPS: TestStep[] = [
  {
    id: 'head-left',
    type: 'head',
    instruction: 'Turn your head left',
    icon: '⬅️',
    validation: {
      type: 'headLeft',
      targetValue: -30,
      requiredFrames: 10
    },
    timeLimit: 5000
  },
  {
    id: 'head-right',
    type: 'head',
    instruction: 'Turn your head right',
    icon: '➡️',
    validation: {
      type: 'headRight',
      targetValue: 30,
      requiredFrames: 10
    },
    timeLimit: 5000
  },
  {
    id: 'head-up',
    type: 'head',
    instruction: 'Look up',
    icon: '⬆️',
    validation: {
      type: 'headUp',
      targetValue: 5,
      requiredFrames: 10
    },
    timeLimit: 5000
  },
  {
    id: 'head-down',
    type: 'head',
    instruction: 'Look down',
    icon: '⬇️',
    validation: {
      type: 'headDown',
      targetValue: -50,
      requiredFrames: 10
    },
    timeLimit: 5000
  },
  {
    id: 'blink-twice',
    type: 'blink',
    instruction: 'Please blink twice continuously',
    icon: '😊',
    validation: {
      type: 'blink',
      targetCount: 2,
      requiredFrames: 0
    },
    timeLimit: 6000
  }
];

interface TestResult {
  stepId: string;
  success: boolean;
  reason?: string;
  duration?: number;
}

interface IdentityCheckResult {
  timestamp: number;
  similarity: number;
  matched: boolean;
}

interface LivenessDetectionProps {
  currentLandmarks?: FaceLandmark[] | null;
  earData?: EyeAspectRatio | null;
  isActive: boolean;
  onComplete: (reset?: boolean) => void;
}

export const LivenessDetection: React.FC<LivenessDetectionProps> = ({
  currentLandmarks,
  isActive,
  onComplete
}) => {
  const {
    verificationStatus,
    blinkCount,
    resetLivenessState
  } = useAppContext();

  // Test state management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testPhase, setTestPhase] = useState<'idle' | 'preparing' | 'testing' | 'completed'>('idle');
  
  // Identity tracking
  const [identityChecks, setIdentityChecks] = useState<IdentityCheckResult[]>([]);
  const [continuousIdentityFailed, setContinuousIdentityFailed] = useState(false);
  
  // UI state
  const [stepProgress, setStepProgress] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [blinkProgress, setBlinkProgress] = useState(0);
  
  // Timing references
  const testStartTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);
  const overallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const identityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const preparationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Validation tracking
  const successFramesRef = useRef(0);
  const blinkStartCountRef = useRef(0);
  const stepCompletedRef = useRef(false);
  const testCompletedRef = useRef(false);
  
  // Get current test step
  const currentStep = TEST_STEPS[currentStepIndex] || null;

  // Forward declaration for circular dependencies
  const startStepRef = useRef<(stepIndex: number) => void>();
  const completeStepRef = useRef<(success: boolean, reason?: string) => void>();

  // Complete entire test
  const completeTest = useCallback((reason: 'success' | 'timeout' | 'identity-failed' | 'failed') => {
    // Prevent duplicate completions
    if (testCompletedRef.current) return;
    testCompletedRef.current = true;
    
    setTestPhase('completed');
    
    // Clear all timers
    if (overallTimeoutRef.current) {
      clearTimeout(overallTimeoutRef.current);
      overallTimeoutRef.current = null;
    }
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
    if (identityCheckIntervalRef.current) {
      clearInterval(identityCheckIntervalRef.current);
      identityCheckIntervalRef.current = null;
    }
    
    // Call onComplete immediately to stop camera
    // Don't pass reset=true here, keep results visible
    onComplete(false);
  }, [onComplete]);

  // Complete current step
  const completeStep = useCallback((success: boolean, reason?: string) => {
    // Prevent duplicate completions
    if (stepCompletedRef.current || testCompletedRef.current) return;
    stepCompletedRef.current = true;
    
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
    
    const duration = Date.now() - stepStartTimeRef.current;
    const result: TestResult = {
      stepId: currentStep?.id || '',
      success,
      reason,
      duration
    };
    
    setTestResults(prev => {
      // Prevent duplicate results
      if (prev.some(r => r.stepId === result.stepId)) {
        return prev;
      }
      return [...prev, result];
    });
    
    if (!success) {
      // If test failed, show option to retry
      setTimeout(() => {
        completeTest('failed');
      }, 500);
    } else {
      // Move to next step after a short delay
      setTimeout(() => {
        if (startStepRef.current) {
          startStepRef.current(currentStepIndex + 1);
        }
      }, 1000);
    }
  }, [currentStep, currentStepIndex, completeTest]);

  // Start a specific test step
  const startStep = useCallback((stepIndex: number) => {
    if (stepIndex >= TEST_STEPS.length) {
      if (!testCompletedRef.current) {
        completeTest('success');
      }
      return;
    }
    
    const step = TEST_STEPS[stepIndex];
    setCurrentStepIndex(stepIndex);
    setStepProgress(0);
    setFeedback('');
    successFramesRef.current = 0;
    stepCompletedRef.current = false;
    stepStartTimeRef.current = Date.now();
    
    if (step.validation.type === 'blink') {
      blinkStartCountRef.current = blinkCount;
      setBlinkProgress(0);
    }
    
    // Set step timeout
    stepTimeoutRef.current = setTimeout(() => {
      if (completeStepRef.current) {
        completeStepRef.current(false, 'timeout');
      }
    }, step.timeLimit);
  }, [blinkCount, completeTest]);

  // Update refs
  useEffect(() => {
    startStepRef.current = startStep;
    completeStepRef.current = completeStep;
  }, [startStep, completeStep]);

  // Start the liveness test
  const startTest = useCallback(() => {
    if (!isActive) return;
    
    resetLivenessState();
    setTestPhase('testing');
    setCurrentStepIndex(0);
    setTestResults([]);
    setIdentityChecks([]);
    setContinuousIdentityFailed(false);
    testStartTimeRef.current = Date.now();
    testCompletedRef.current = false;
    
    // Set overall test timeout
    overallTimeoutRef.current = setTimeout(() => {
      completeTest('timeout');
    }, OVERALL_TEST_TIMEOUT);
    
    // Start continuous identity checking
    if (identityCheckIntervalRef.current) {
      clearInterval(identityCheckIntervalRef.current);
    }
    identityCheckIntervalRef.current = setInterval(() => {
      if (verificationStatus) {
        const check: IdentityCheckResult = {
          timestamp: Date.now(),
          similarity: verificationStatus.similarity,
          matched: verificationStatus.similarity >= IDENTITY_THRESHOLD
        };
        
        setIdentityChecks(prev => {
          const newChecks = [...prev, check];
          
          // Check for continuous identity failure using the updated array
          const recentChecks = newChecks.slice(-6); // Last 3 seconds
          if (recentChecks.length >= 6 && recentChecks.every(c => !c.matched)) {
            setContinuousIdentityFailed(true);
            completeTest('identity-failed');
          }
          
          return newChecks;
        });
      }
    }, IDENTITY_CHECK_INTERVAL);
    
    if (startStepRef.current) {
      startStepRef.current(0);
    }
  }, [isActive, resetLivenessState, verificationStatus, completeTest]);

  // Validate current step
  const validateStep = useCallback((landmarks: FaceLandmark[]) => {
    if (!currentStep || testPhase !== 'testing' || !verificationStatus) return;
    
    // Check identity match
    if (verificationStatus.similarity < IDENTITY_THRESHOLD) {
      setFeedback('⚠️ Face does not match reference image');
      return;
    }
    
    const { validation } = currentStep;
    let isValid = false;
    
    switch (validation.type) {
      case 'headLeft':
        const headPoseLeft = calculateHeadPose(landmarks);
        setFeedback(`Angle: ${Math.round(headPoseLeft.yaw)}° (target: < ${validation.targetValue}°)`);
        isValid = headPoseLeft.yaw < validation.targetValue!;
        break;
        
      case 'headRight':
        const headPoseRight = calculateHeadPose(landmarks);
        setFeedback(`Angle: ${Math.round(headPoseRight.yaw)}° (target: > ${validation.targetValue}°)`);
        isValid = headPoseRight.yaw > validation.targetValue!;
        break;
        
      case 'headUp':
        const headPoseUp = calculateHeadPose(landmarks);
        setFeedback(`Angle: ${Math.round(headPoseUp.pitch)}° (target: > ${validation.targetValue}°)`);
        isValid = headPoseUp.pitch > validation.targetValue!;
        break;
        
      case 'headDown':
        const headPoseDown = calculateHeadPose(landmarks);
        setFeedback(`Angle: ${Math.round(headPoseDown.pitch)}° (target: < ${validation.targetValue}°)`);
        isValid = headPoseDown.pitch > validation.targetValue!;
        break;
        
      case 'blink':
        const blinksDetected = blinkCount - blinkStartCountRef.current;
        setBlinkProgress(Math.min(blinksDetected, validation.targetCount!));
        setFeedback(`Blinks detected: ${blinksDetected} / ${validation.targetCount}`);
        if (blinksDetected >= validation.targetCount! && !stepCompletedRef.current) {
          completeStep(true);
          return;
        }
        break;
    }
    
    // Track valid frames for head movements
    if (validation.type !== 'blink') {
      if (isValid) {
        successFramesRef.current++;
        if (successFramesRef.current >= validation.requiredFrames && !stepCompletedRef.current) {
          completeStep(true);
        }
      } else {
        successFramesRef.current = 0;
      }
    }
    
    // Update progress
    const elapsed = Date.now() - stepStartTimeRef.current;
    const progress = Math.min((elapsed / currentStep.timeLimit) * 100, 100);
    setStepProgress(progress);
  }, [currentStep, testPhase, verificationStatus, blinkCount, completeStep]);

  // Effect to validate on landmark updates
  useEffect(() => {
    if (currentLandmarks && testPhase === 'testing') {
      validateStep(currentLandmarks);
    }
  }, [currentLandmarks, testPhase, validateStep]);

  // Effect to handle initial setup when component becomes active
  useEffect(() => {
    if (isActive && testPhase === 'idle') {
      console.log('Component activated, moving to preparing phase...');
      // Reset refs when component becomes active
      testCompletedRef.current = false;
      stepCompletedRef.current = false;
      
      // Start with preparing phase
      setTestPhase('preparing');
      setCurrentStepIndex(0);
      setTestResults([]);
      setIdentityChecks([]);
      setContinuousIdentityFailed(false);
    }
  }, [isActive]); // Only depend on isActive to avoid re-triggers

  // Separate effect for auto-start after preparation
  useEffect(() => {
    if (isActive && testPhase === 'preparing') {
      console.log('In preparing phase, setting up auto-start...');
      
      // Clear any existing timeout
      if (preparationTimeoutRef.current) {
        clearTimeout(preparationTimeoutRef.current);
      }
      
      // 3-second delay for user to see "Get Ready" message
      preparationTimeoutRef.current = setTimeout(() => {
        console.log('Auto-starting test after preparation...');
        startTest();
      }, 3000);
      
      return () => {
        if (preparationTimeoutRef.current) {
          clearTimeout(preparationTimeoutRef.current);
        }
      };
    }
  }, [testPhase, startTest]); // Only re-run when testPhase changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overallTimeoutRef.current) clearTimeout(overallTimeoutRef.current);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      if (identityCheckIntervalRef.current) clearInterval(identityCheckIntervalRef.current);
      if (preparationTimeoutRef.current) clearTimeout(preparationTimeoutRef.current);
    };
  }, []);

  // Render test results
  const renderResults = () => {
    const successfulTests = testResults.filter(r => r.success).length;
    const livenessScore = Math.round((successfulTests / TEST_STEPS.length) * 100);
    const livenessPass = livenessScore >= 80; // 4 out of 5 tests
    
    const avgIdentitySimilarity = identityChecks.length > 0
      ? Math.round(identityChecks.reduce((sum, check) => sum + check.similarity, 0) / identityChecks.length)
      : 0;
    const identityPass = avgIdentitySimilarity >= IDENTITY_THRESHOLD && !continuousIdentityFailed;
    
    let resultMessage = '';
    let resultClass = '';
    
    if (livenessPass && identityPass) {
      resultMessage = 'Liveness detection is done and identity is verified';
      resultClass = styles.success;
    } else if (livenessPass && !identityPass) {
      resultMessage = 'Liveness passed and identity failed';
      resultClass = styles.warning;
    } else if (!livenessPass && identityPass) {
      resultMessage = 'Liveness failed but identity matched';
      resultClass = styles.warning;
    } else {
      resultMessage = 'Both liveness and identity failed';
      resultClass = styles.failed;
    }
    
    return (
      <div className={styles.resultsContainer}>
        <h3 className={resultClass}>{resultMessage}</h3>
        
        <div className={styles.resultsDetails}>
          <div className={styles.resultRow}>
            <span>Liveness Test:</span>
            <span className={livenessPass ? styles.pass : styles.fail}>
              {livenessPass ? 'Pass' : 'Fail'} ({successfulTests}/{TEST_STEPS.length} tests)
            </span>
          </div>
          
          <div className={styles.resultRow}>
            <span>Identity Match:</span>
            <span className={identityPass ? styles.pass : styles.fail}>
              {identityPass ? 'Pass' : 'Fail'}
              {continuousIdentityFailed && ' (Failed during test)'}
            </span>
          </div>
          
          {testStartTimeRef.current > 0 && (
            <div className={styles.resultRow}>
              <span>Test Duration:</span>
              <span>{Math.round((Date.now() - testStartTimeRef.current) / 1000)}s</span>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => {
            // Reset the liveness test
            setTestPhase('idle');
            setCurrentStepIndex(0);
            setTestResults([]);
            setIdentityChecks([]);
            setContinuousIdentityFailed(false);
            testCompletedRef.current = false;
            stepCompletedRef.current = false;
            // Tell parent to reset and show start button again
            onComplete(true);
          }} 
          className={styles.retryButton}
        >
          Try Again
        </button>
      </div>
    );
  };

  // Log for debugging
  console.log('LivenessDetection render:', { isActive, testPhase, currentStep });
  
  // Don't render if not active
  if (!isActive) return null;

  return (
    <div className={styles.container}>
      <h2>Liveness Detection</h2>
      
      {testPhase === 'completed' ? (
        renderResults()
      ) : testPhase === 'testing' && currentStep ? (
        <>
          {/* Identity status */}
          {verificationStatus && (
            <div className={styles.identityStatus}>
              <span>Identity Check:</span>
              <span className={verificationStatus.similarity >= IDENTITY_THRESHOLD ? styles.verified : styles.notVerified}>
                {verificationStatus.similarity >= IDENTITY_THRESHOLD ? '✅ Pass' : '❌ Fail'}
              </span>
            </div>
          )}
          
          {/* Current test instruction */}
          <div className={styles.instruction}>
            <span className={styles.icon}>{currentStep.icon}</span>
            <p>{currentStep.instruction}</p>
            <div className={styles.feedback}>
              {currentStep.type === 'blink' ? (
                <div className={styles.blinkIndicator}>
                  <span>Blinks: {blinkProgress}/{currentStep.validation.targetCount}</span>
                </div>
              ) : (
                <span>{feedback}</span>
              )}
            </div>
          </div>
          
          {/* Progress */}
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${stepProgress}%` }}
              />
            </div>
            <span className={styles.stepCounter}>
              Step {currentStepIndex + 1} of {TEST_STEPS.length}
            </span>
          </div>
        </>
      ) : testPhase === 'preparing' ? (
        <div className={styles.idle}>
          <div className={styles.preparingContainer}>
            <h3>Get Ready!</h3>
            <p>Liveness test will begin in a moment...</p>
            <p className={styles.instruction}>Please position your face in the camera view</p>
            <button 
              onClick={() => {
                console.log('Manual start button clicked');
                if (preparationTimeoutRef.current) {
                  clearTimeout(preparationTimeoutRef.current);
                }
                startTest();
              }}
              className={styles.button}
              style={{ marginTop: '20px' }}
            >
              Start Now
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.idle}>
          <p>Initializing...</p>
        </div>
      )}
    </div>
  );
};