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
  const [status, setStatus] = useState('');

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

  const handleStartLiveness = async () => {
    if (!referenceImageLoaded) {
      alert('Please upload a reference photo before starting the liveness test!');
      return;
    }

    try {
      // Start camera if not already detecting
      if (!isDetecting) {
        setStatus('Starting camera...');
        setBlinkCount(0);
        await startDetection();
        setStatus('Camera ready - Starting liveness test');
      }
      
      // Start liveness test immediately
      resetLivenessState();
      setBlinkCount(0);
      setIsLivenessActive(true);
    } catch (error) {
      setStatus('Error: ' + (error as Error).message);
    }
  };

  const handleLivenessComplete = (reset: boolean = false) => {
    // Liveness test completed - stop camera
    console.log('Liveness test completed, reset:', reset);
    stopDetection();
    
    if (reset) {
      // User clicked "Try Again" - reset everything
      setIsLivenessActive(false);
      setStatus('Ready to start new liveness test');
      setBlinkCount(0);
      resetLivenessState();
    } else {
      // Test just completed - keep results visible
      setStatus('Liveness test completed - Results shown above');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Face Detection System</h1>

      <PhotoUpload />

      <FaceMeshCanvas
        videoRef={videoRef}
        canvasRef={canvasRef}
        verificationStatus={verificationStatus}
      />

      {referenceImageLoaded && !isLivenessActive && (
        <div className={styles.controls}>
          <button
            onClick={handleStartLiveness}
            className={styles.button}
            style={{ 
              backgroundColor: '#4CAF50',
              fontSize: '18px',
              padding: '15px 40px'
            }}
          >
            Start Liveness Test
          </button>
        </div>
      )}

      {status && (
        <div className={styles.status}>
          {status}
        </div>
      )}

      {/* Remove BlinkCounter to keep UI clean during liveness test */}

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