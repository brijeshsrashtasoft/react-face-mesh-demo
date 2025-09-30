import { useRef, useCallback, useEffect } from 'react';
import { mediaPipeService } from '../services/mediapipe.service';
import { FaceMeshResults, FaceLandmark } from '../types';
import { calculateEAR } from '../utils/faceAnalysis';
import { useAppContext } from '../context/AppContext';

interface UseFaceDetectionProps {
  onFaceDetected?: (landmarks: FaceLandmark[]) => void;
  onBlinkDetected?: () => void;
}

export const useFaceDetection = ({ onFaceDetected, onBlinkDetected }: UseFaceDetectionProps = {}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDetecting, setIsDetecting, incrementBlinkCount } = useAppContext();
  
  // Blink detection state
  const isBlinkingRef = useRef(false);
  const consecutiveFramesRef = useRef(0);
  const earThreshold = 0.22; // Slightly more sensitive
  const blinkFrameThreshold = 2; // Reduce required frames for better detection
  const minBlinkDuration = 100; // Minimum time between blinks (ms)
  const lastBlinkTimeRef = useRef(0);

  const detectBlink = useCallback((landmarks: FaceLandmark[]) => {
    const earData = calculateEAR(landmarks);
    const ear = earData.average;

    if (ear < earThreshold) {
      consecutiveFramesRef.current++;

      if (consecutiveFramesRef.current >= blinkFrameThreshold && !isBlinkingRef.current) {
        const currentTime = Date.now();
        // Ensure minimum time between blinks to avoid false positives
        if (currentTime - lastBlinkTimeRef.current > minBlinkDuration) {
          isBlinkingRef.current = true;
          lastBlinkTimeRef.current = currentTime;
          incrementBlinkCount();
          onBlinkDetected?.();
        }
      }
    } else {
      if (consecutiveFramesRef.current >= blinkFrameThreshold && isBlinkingRef.current) {
        isBlinkingRef.current = false;
      }
      consecutiveFramesRef.current = 0;
    }

    return earData;
  }, [incrementBlinkCount, onBlinkDetected]);

  const onResults = useCallback((results: FaceMeshResults) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    // Save canvas settings
    canvasCtx.save();

    // Clear canvas and draw video frame
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Draw face mesh if faces are detected
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      for (const landmarks of results.multiFaceLandmarks) {
        // Detect blinks
        detectBlink(landmarks);

        // Draw the face mesh
        mediaPipeService.drawResults(canvasCtx, results, landmarks);

        // Notify parent component
        onFaceDetected?.(landmarks);
      }
    }

    // Restore canvas settings
    canvasCtx.restore();
  }, [detectBlink, onFaceDetected]);

  const startDetection = useCallback(async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas ref not ready');
      }

      setIsDetecting(true);

      // Initialize MediaPipe
      await mediaPipeService.initialize(onResults);

      // Start camera
      await mediaPipeService.startCamera(videoRef.current, async () => {
        if (videoRef.current) {
          await mediaPipeService.processFaceData(videoRef.current);
        }
      });

      // Set canvas size to match video
      videoRef.current.addEventListener('loadedmetadata', () => {
        if (videoRef.current && canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      });
    } catch (error) {
      console.error('Error starting face detection:', error);
      setIsDetecting(false);
      throw error;
    }
  }, [onResults, setIsDetecting]);

  const stopDetection = useCallback(() => {
    mediaPipeService.stopCamera();
    setIsDetecting(false);
    
    // Clear canvas
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      const canvasCtx = canvasElement.getContext('2d');
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
    }
  }, [setIsDetecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isDetecting) {
        stopDetection();
      }
    };
  }, [isDetecting, stopDetection]);

  return {
    videoRef,
    canvasRef,
    isDetecting,
    startDetection,
    stopDetection
  };
};