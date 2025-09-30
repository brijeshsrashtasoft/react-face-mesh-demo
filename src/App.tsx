import React, { useState, useCallback } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { PhotoUpload } from './components/PhotoUpload/PhotoUpload';
import { FaceMeshCanvas } from './components/FaceMeshCanvas/FaceMeshCanvas';
import { BlinkCounter } from './components/BlinkCounter/BlinkCounter';
import { LivenessDetection } from './components/LivenessDetection/LivenessDetection';
import { useFaceDetection } from './hooks/useFaceDetection';
import { useFaceVerification } from './hooks/useFaceVerification';
import { FaceLandmark } from './types';
import { calculateEAR } from './utils/faceAnalysis';
import styles from './App.module.css';

const AppContent: React.FC = () => {
  const {
    isDetecting,
    isLivenessActive,
    setIsLivenessActive,
    referenceImageLoaded,
    verificationStatus,
    setBlinkCount,
    resetLivenessState
  } = useAppContext();

  const [currentLandmarks, setCurrentLandmarks] = useState<FaceLandmark[] | null>(null);
  const [earValue, setEarValue] = useState(0);
  const [status, setStatus] = useState('Ready to start - Click "Start Detection"');

  const handleFaceDetected = useCallback((landmarks: FaceLandmark[]) => {
    setCurrentLandmarks(landmarks);
    const ear = calculateEAR(landmarks);
    setEarValue(ear.average);
  }, []);

  const { videoRef, canvasRef, startDetection, stopDetection } = useFaceDetection({
    onFaceDetected: handleFaceDetected
  });

  // Use face verification hook
  useFaceVerification({
    videoRef,
    isEnabled: isDetecting && referenceImageLoaded
  });

  const handleStartDetection = async () => {
    try {
      setStatus('Starting camera...');
      setBlinkCount(0);
      await startDetection();
      setStatus('Camera ready - Detecting faces');
    } catch (error) {
      setStatus('Error: ' + (error as Error).message);
    }
  };

  const handleStopDetection = () => {
    stopDetection();
    setStatus('Detection stopped');
  };

  const handleStartLiveness = () => {
    if (!isDetecting) {
      alert('Please start face detection first!');
      return;
    }

    if (!referenceImageLoaded) {
      alert('Please upload a reference photo before starting the liveness test!');
      return;
    }

    // Reset all state before starting liveness test
    resetLivenessState();
    setBlinkCount(0);
    setIsLivenessActive(true);
  };

  const handleLivenessComplete = () => {
    // Liveness test completed
    console.log('Liveness test completed');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MediaPipe Face Mesh Demo</h1>

      <PhotoUpload />

      <FaceMeshCanvas
        videoRef={videoRef}
        canvasRef={canvasRef}
        verificationStatus={verificationStatus}
      />

      <div className={styles.controls}>
        <button
          onClick={handleStartDetection}
          disabled={isDetecting}
          className={styles.button}
        >
          Start Detection
        </button>
        <button
          onClick={handleStopDetection}
          disabled={!isDetecting}
          className={styles.button}
        >
          Stop Detection
        </button>
        <button
          onClick={handleStartLiveness}
          disabled={isLivenessActive || !referenceImageLoaded}
          className={styles.button}
        >
          Start Liveness Test
        </button>
      </div>

      <div className={styles.status}>
        {status}
      </div>

      {isDetecting && !isLivenessActive && (
        <BlinkCounter earValue={earValue} />
      )}

      <LivenessDetection
        currentLandmarks={currentLandmarks}
        earData={{ left: 0, right: 0, average: earValue }}
        isActive={isLivenessActive}
        onComplete={handleLivenessComplete}
      />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;