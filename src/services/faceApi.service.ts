import * as faceapi from 'face-api.js';
import { FaceVerificationResult } from '../types';

class FaceApiService {
  private isModelsLoaded = false;
  private readonly SIMILARITY_THRESHOLD = 0.6; // Lower is more similar

  async loadModels(): Promise<void> {
    if (this.isModelsLoaded) {
      return;
    }

    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.isModelsLoaded = true;
      console.log('Face-api.js models loaded successfully');
    } catch (error) {
      console.error('Error loading face-api models:', error);
      throw error;
    }
  }

  async extractFaceDescriptor(input: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array | null> {
    if (!this.isModelsLoaded) {
      await this.loadModels();
    }

    try {
      // Check if input is valid
      if (!input || input.width === 0 || input.height === 0) {
        console.log('Invalid input dimensions for face extraction');
        return null;
      }

      // Detect face and extract descriptor
      const detection = await faceapi
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        // No face detected
        return null;
      }

      return detection.descriptor;
    } catch (error) {
      console.error('Error extracting face descriptor:', error);
      return null;
    }
  }

  compareFaces(descriptor1: Float32Array | null, descriptor2: Float32Array | null): FaceVerificationResult {
    if (!descriptor1 || !descriptor2) {
      return { match: false, distance: 1, similarity: '0' };
    }

    // Calculate Euclidean distance
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    const match = distance < this.SIMILARITY_THRESHOLD;
    const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));

    return {
      match,
      distance,
      similarity: similarity.toFixed(1)
    };
  }

  async extractFaceFromVideo(videoElement: HTMLVideoElement): Promise<Float32Array | null> {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }

    // Create canvas from video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return null;
    }

    ctx.drawImage(videoElement, 0, 0);
    
    // Extract face descriptor from canvas
    return this.extractFaceDescriptor(canvas);
  }

  async processImageFile(file: File): Promise<{ descriptor: Float32Array | null; imageUrl: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const img = new Image();
          
          img.onload = async () => {
            const descriptor = await this.extractFaceDescriptor(img);
            resolve({
              descriptor,
              imageUrl: img.src
            });
          };
          
          img.onerror = reject;
          img.src = e.target?.result as string;
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const faceApiService = new FaceApiService();