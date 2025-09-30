import React, { useState, useRef, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { faceApiService } from '../../services/faceApi.service';
import styles from './PhotoUpload.module.css';

interface PhotoUploadProps {
  onPhotoUploaded?: () => void;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ onPhotoUploaded }) => {
  const { referenceImageLoaded, setReferenceImageLoaded, setReferenceDescriptor } = useAppContext();
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureVideoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadStatus('Processing image...');
    
    try {
      const { descriptor, imageUrl } = await faceApiService.processImageFile(file);
      
      if (!descriptor) {
        setUploadStatus('❌ No face detected in image');
        return;
      }

      setReferenceDescriptor(descriptor);
      setReferenceImageUrl(imageUrl);
      setReferenceImageLoaded(true);
      setUploadStatus('✅ Reference face loaded successfully');
      onPhotoUploaded?.();
    } catch (error) {
      console.error('Error processing image:', error);
      setUploadStatus('❌ Error processing image');
    }
  }, [setReferenceDescriptor, setReferenceImageLoaded, onPhotoUploaded]);

  const startCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      captureStreamRef.current = stream;
      if (captureVideoRef.current) {
        captureVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!captureVideoRef.current || !captureCanvasRef.current) return;

    const video = captureVideoRef.current;
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        
        // Stop camera stream
        if (captureStreamRef.current) {
          captureStreamRef.current.getTracks().forEach(track => track.stop());
          captureStreamRef.current = null;
        }
        
        setIsCapturing(false);
        await handleFileUpload(file);
      }
    }, 'image/jpeg', 0.95);
  }, [handleFileUpload]);

  const cancelCapture = useCallback(() => {
    if (captureStreamRef.current) {
      captureStreamRef.current.getTracks().forEach(track => track.stop());
      captureStreamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const changePhoto = useCallback(() => {
    setReferenceImageLoaded(false);
    setReferenceImageUrl(null);
    setReferenceDescriptor(null);
    setUploadStatus('');
  }, [setReferenceImageLoaded, setReferenceDescriptor]);

  if (referenceImageLoaded && referenceImageUrl) {
    return (
      <div className={styles.uploadSection}>
        <h2>Reference Photo</h2>
        <div className={styles.uploadedImage}>
          <img src={referenceImageUrl} alt="Reference" className={styles.referenceImage} />
          <p className={styles.uploadStatus}>{uploadStatus}</p>
          <button onClick={changePhoto} className={styles.changeBtn}>
            Change Photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.uploadSection}>
      <h2>Step 1: Provide Reference Photo</h2>
      <p>Take or upload a photo of yourself for identity verification</p>

      {!isCapturing ? (
        <div className={styles.photoOptions}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            style={{ display: 'none' }}
          />
          <button onClick={startCapture} className={styles.uploadBtn}>
            📸 Take Picture
          </button>
          <button onClick={() => fileInputRef.current?.click()} className={styles.uploadBtn}>
            📁 Choose File
          </button>
        </div>
      ) : (
        <div className={styles.cameraCapture}>
          <video
            ref={captureVideoRef}
            autoPlay
            playsInline
            className={styles.captureVideo}
          />
          <canvas
            ref={captureCanvasRef}
            style={{ display: 'none' }}
          />
          <div className={styles.captureControls}>
            <button onClick={capturePhoto} className={styles.captureBtn}>
              📷 Capture
            </button>
            <button onClick={cancelCapture} className={styles.cancelBtn}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {uploadStatus && (
        <p className={styles.uploadStatus}>{uploadStatus}</p>
      )}
    </div>
  );
};