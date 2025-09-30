import { useRef, useCallback, useEffect } from 'react';
import { faceApiService } from '../services/faceApi.service';
import { useAppContext } from '../context/AppContext';

interface UseFaceVerificationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isEnabled: boolean;
  verificationInterval?: number;
}

export const useFaceVerification = ({
  videoRef,
  isEnabled,
  verificationInterval = 2000
}: UseFaceVerificationProps) => {
  const { referenceDescriptor, setVerificationStatus } = useAppContext();
  const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const verifyFace = useCallback(async () => {
    if (!referenceDescriptor || !videoRef.current) {
      return;
    }

    try {
      const currentDescriptor = await faceApiService.extractFaceFromVideo(videoRef.current);
      
      if (!currentDescriptor) {
        // No face detected in current frame
        return;
      }

      const result = faceApiService.compareFaces(referenceDescriptor, currentDescriptor);
      setVerificationStatus(result);
    } catch (error) {
      if (!error || !(error as Error).message?.includes('No face detected')) {
        console.error('Error during face verification:', error);
      }
    }
  }, [referenceDescriptor, videoRef, setVerificationStatus]);

  const startVerification = useCallback(() => {
    if (!referenceDescriptor || !isEnabled) {
      return;
    }

    // Clear any existing interval
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
    }

    // Initial verification
    verifyFace();

    // Set up continuous verification
    verificationIntervalRef.current = setInterval(verifyFace, verificationInterval);
  }, [referenceDescriptor, isEnabled, verifyFace, verificationInterval]);

  const stopVerification = useCallback(() => {
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
      verificationIntervalRef.current = null;
    }
    setVerificationStatus(null);
  }, [setVerificationStatus]);

  // Start/stop verification based on enabled state
  useEffect(() => {
    if (isEnabled && referenceDescriptor) {
      startVerification();
    } else {
      stopVerification();
    }

    return () => {
      stopVerification();
    };
  }, [isEnabled, referenceDescriptor, startVerification, stopVerification]);

  return {
    verifyFace,
    startVerification,
    stopVerification
  };
};