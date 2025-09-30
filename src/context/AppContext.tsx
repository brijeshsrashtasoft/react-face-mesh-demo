import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppState, ChallengeResult, FaceVerificationResult } from '../types';

interface AppContextType extends AppState {
  setIsDetecting: (value: boolean) => void;
  setIsLivenessActive: (value: boolean) => void;
  setReferenceImageLoaded: (value: boolean) => void;
  setBlinkCount: (value: number) => void;
  incrementBlinkCount: () => void;
  setVerificationStatus: (value: FaceVerificationResult | null) => void;
  setCurrentChallenge: (value: number) => void;
  setChallengeResults: (value: ChallengeResult[]) => void;
  addChallengeResult: (result: ChallengeResult) => void;
  resetLivenessState: () => void;
  referenceDescriptor: Float32Array | null;
  setReferenceDescriptor: (descriptor: Float32Array | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    isDetecting: false,
    isLivenessActive: false,
    referenceImageLoaded: false,
    blinkCount: 0,
    verificationStatus: null,
    currentChallenge: 0,
    challengeResults: []
  });

  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null);

  const setIsDetecting = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isDetecting: value }));
  }, []);

  const setIsLivenessActive = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isLivenessActive: value }));
  }, []);

  const setReferenceImageLoaded = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, referenceImageLoaded: value }));
  }, []);

  const setBlinkCount = useCallback((value: number) => {
    setState(prev => ({ ...prev, blinkCount: value }));
  }, []);

  const incrementBlinkCount = useCallback(() => {
    setState(prev => ({ ...prev, blinkCount: prev.blinkCount + 1 }));
  }, []);

  const setVerificationStatus = useCallback((value: FaceVerificationResult | null) => {
    setState(prev => ({ ...prev, verificationStatus: value }));
  }, []);

  const setCurrentChallenge = useCallback((value: number) => {
    setState(prev => ({ ...prev, currentChallenge: value }));
  }, []);

  const setChallengeResults = useCallback((value: ChallengeResult[]) => {
    setState(prev => ({ ...prev, challengeResults: value }));
  }, []);

  const addChallengeResult = useCallback((result: ChallengeResult) => {
    setState(prev => ({ ...prev, challengeResults: [...prev.challengeResults, result] }));
  }, []);

  const resetLivenessState = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLivenessActive: false,
      currentChallenge: 0,
      challengeResults: [],
      blinkCount: 0
    }));
  }, []);

  const value: AppContextType = {
    ...state,
    setIsDetecting,
    setIsLivenessActive,
    setReferenceImageLoaded,
    setBlinkCount,
    incrementBlinkCount,
    setVerificationStatus,
    setCurrentChallenge,
    setChallengeResults,
    addChallengeResult,
    resetLivenessState,
    referenceDescriptor,
    setReferenceDescriptor
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};